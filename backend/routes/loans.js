const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function generateAmortizationSchedule(loanId, principal, termMonths, interestRate, startDate) {
  const db = getDb();
  const monthlyRate = interestRate / 100;
  const monthlyPayment = Math.ceil(
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1)
  );

  let balance = principal;
  const start = new Date(startDate);
  const scheduleEntries = [];
  const interestEntries = [];

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);

    const interestAmount = Math.round(balance * monthlyRate);
    const principalAmount = i === termMonths
      ? balance
      : Math.min(monthlyPayment - interestAmount, balance);
    const amountDue = principalAmount + interestAmount;

    const scheduleId = uuidv4();
    const interestRecordId = uuidv4();
    const periodStart = new Date(start);
    periodStart.setMonth(periodStart.getMonth() + i - 1);
    const periodEnd = new Date(dueDate);

    scheduleEntries.push({
      id: scheduleId,
      loan_id: loanId,
      due_date: dueDate.toISOString().split('T')[0],
      amount_due: amountDue,
      principal: principalAmount,
      interest: interestAmount,
      status: 'pending'
    });

    interestEntries.push({
      id: interestRecordId,
      loan_id: loanId,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      principal_balance: balance,
      interest_rate: interestRate,
      interest_amount: interestAmount
    });

    balance -= principalAmount;
    if (balance < 0) balance = 0;
  }

  const insertSchedule = db.prepare(`
    INSERT INTO loan_schedule (id, loan_id, due_date, amount_due, principal, interest, status)
    VALUES (@id, @loan_id, @due_date, @amount_due, @principal, @interest, @status)
  `);

  const insertInterest = db.prepare(`
    INSERT INTO interest_records (id, loan_id, period_start, period_end, principal_balance, interest_rate, interest_amount)
    VALUES (@id, @loan_id, @period_start, @period_end, @principal_balance, @interest_rate, @interest_amount)
  `);

  const insertInventory = db.prepare(`
    INSERT INTO inventory (id, loan_id, disbursed_amount, remaining_balance)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(loan_id) DO UPDATE SET
      disbursed_amount = excluded.disbursed_amount,
      remaining_balance = excluded.remaining_balance,
      last_updated = datetime('now')
  `);

  const transaction = db.transaction(() => {
    for (const entry of scheduleEntries) {
      insertSchedule.run(entry);
    }
    for (const entry of interestEntries) {
      insertInterest.run(entry);
    }
    insertInventory.run(uuidv4(), loanId, principal, principal);
  });

  transaction();
}

// POST /api/loans - apply for loan
router.post('/', authenticateToken, (req, res) => {
  try {
    const { amount, purpose, term_months, interest_rate = 3.0 } = req.body;

    if (!amount || !purpose || !term_months) {
      return res.status(400).json({ error: 'Amount, purpose, and term_months are required' });
    }

    if (amount < 100000) {
      return res.status(400).json({ error: 'Minimum loan amount is ₱1,000' });
    }

    if (amount > 50000000) {
      return res.status(400).json({ error: 'Maximum loan amount is ₱500,000' });
    }

    if (term_months < 1 || term_months > 60) {
      return res.status(400).json({ error: 'Term must be between 1 and 60 months' });
    }

    const db = getDb();

    // Check for existing pending/active loans
    const activeLoan = db.prepare(`
      SELECT id FROM loans WHERE user_id = ? AND status IN ('pending', 'approved', 'active')
    `).get(req.user.id);

    if (activeLoan) {
      return res.status(400).json({ error: 'You already have an active or pending loan application' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO loans (id, user_id, amount, purpose, term_months, interest_rate, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(id, req.user.id, amount, purpose, term_months, interest_rate);

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
    res.status(201).json({ loan });
  } catch (err) {
    console.error('Create loan error:', err);
    res.status(500).json({ error: 'Failed to create loan application' });
  }
});

// GET /api/loans - list loans
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 20, status = '', user_id = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT l.*, u.name as borrower_name, u.email as borrower_email, u.phone as borrower_phone,
             a.name as approved_by_name,
             (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE loan_id = l.id AND status = 'verified') as total_paid
      FROM loans l
      JOIN users u ON u.id = l.user_id
      LEFT JOIN users a ON a.id = l.approved_by
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role !== 'admin') {
      query += ` AND l.user_id = ?`;
      params.push(req.user.id);
    } else if (user_id) {
      query += ` AND l.user_id = ?`;
      params.push(user_id);
    }

    if (status) {
      query += ` AND l.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const loans = db.prepare(query).all(...params);

    let countQuery = `SELECT COUNT(*) as total FROM loans WHERE 1=1`;
    const countParams = [];
    if (req.user.role !== 'admin') {
      countQuery += ` AND user_id = ?`;
      countParams.push(req.user.id);
    } else if (user_id) {
      countQuery += ` AND user_id = ?`;
      countParams.push(user_id);
    }
    if (status) {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      loans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Get loans error:', err);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// GET /api/loans/:id - loan details with schedule
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const loan = db.prepare(`
      SELECT l.*, u.name as borrower_name, u.email as borrower_email, u.phone as borrower_phone,
             a.name as approved_by_name,
             (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE loan_id = l.id AND status = 'verified') as total_paid
      FROM loans l
      JOIN users u ON u.id = l.user_id
      LEFT JOIN users a ON a.id = l.approved_by
      WHERE l.id = ?
    `).get(req.params.id);

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (req.user.role !== 'admin' && loan.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const schedule = db.prepare(`
      SELECT * FROM loan_schedule WHERE loan_id = ? ORDER BY due_date ASC
    `).all(req.params.id);

    const payments = db.prepare(`
      SELECT * FROM payments WHERE loan_id = ? ORDER BY created_at DESC
    `).all(req.params.id);

    const inventory = db.prepare(`
      SELECT * FROM inventory WHERE loan_id = ?
    `).get(req.params.id);

    res.json({ loan, schedule, payments, inventory });
  } catch (err) {
    console.error('Get loan error:', err);
    res.status(500).json({ error: 'Failed to fetch loan details' });
  }
});

// PATCH /api/loans/:id/status - approve/reject (admin only)
router.patch('/:id/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected', 'active', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const db = getDb();
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status === 'paid' || loan.status === 'rejected') {
      return res.status(400).json({ error: `Cannot change status of a ${loan.status} loan` });
    }

    if (status === 'approved' && loan.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending loans can be approved' });
    }

    const updateData = {
      status,
      approved_by: req.user.id,
      approved_at: new Date().toISOString()
    };

    db.prepare(`
      UPDATE loans SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?
    `).run(status, req.user.id, updateData.approved_at, req.params.id);

    // Generate amortization schedule when approved
    if (status === 'approved') {
      const existingSchedule = db.prepare('SELECT id FROM loan_schedule WHERE loan_id = ?').get(req.params.id);
      if (!existingSchedule) {
        generateAmortizationSchedule(
          req.params.id,
          loan.amount,
          loan.term_months,
          loan.interest_rate,
          new Date().toISOString()
        );
      }

      // Set to active immediately after approval
      db.prepare(`UPDATE loans SET status = 'active' WHERE id = ?`).run(req.params.id);
    }

    const updated = db.prepare(`
      SELECT l.*, u.name as borrower_name, a.name as approved_by_name
      FROM loans l
      JOIN users u ON u.id = l.user_id
      LEFT JOIN users a ON a.id = l.approved_by
      WHERE l.id = ?
    `).get(req.params.id);

    res.json({ loan: updated });
  } catch (err) {
    console.error('Update loan status error:', err);
    res.status(500).json({ error: 'Failed to update loan status' });
  }
});

module.exports = router;
