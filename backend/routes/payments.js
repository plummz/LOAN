const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function generateReferenceNumber(method) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const methodCode = method.toUpperCase().replace('_', '');
  return `LOANAPP-${methodCode}-${timestamp}-${random}`;
}

// POST /api/payments - create payment
router.post('/', authenticateToken, (req, res) => {
  try {
    const { loan_id, amount, payment_method } = req.body;

    if (!loan_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'loan_id, amount, and payment_method are required' });
    }

    if (!['gcash', 'maya', 'palawan_pay', 'cash'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const db = getDb();
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loan_id);

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (req.user.role !== 'admin' && loan.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (loan.status !== 'active') {
      return res.status(400).json({ error: 'Can only make payments on active loans' });
    }

    const reference_number = generateReferenceNumber(payment_method);
    const id = uuidv4();

    db.prepare(`
      INSERT INTO payments (id, loan_id, user_id, amount, payment_method, reference_number, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(id, loan_id, req.user.id, amount, payment_method, reference_number);

    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
    res.status(201).json({ payment });
  } catch (err) {
    console.error('Create payment error:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// GET /api/payments - list payments
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 20, status = '', loan_id = '', payment_method = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT p.*, u.name as borrower_name, u.email as borrower_email,
             l.amount as loan_amount, l.purpose as loan_purpose
      FROM payments p
      JOIN users u ON u.id = p.user_id
      JOIN loans l ON l.id = p.loan_id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role !== 'admin') {
      query += ` AND p.user_id = ?`;
      params.push(req.user.id);
    }

    if (loan_id) {
      query += ` AND p.loan_id = ?`;
      params.push(loan_id);
    }

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    if (payment_method) {
      query += ` AND p.payment_method = ?`;
      params.push(payment_method);
    }

    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const payments = db.prepare(query).all(...params);

    let countQuery = `SELECT COUNT(*) as total FROM payments WHERE 1=1`;
    const countParams = [];
    if (req.user.role !== 'admin') {
      countQuery += ` AND user_id = ?`;
      countParams.push(req.user.id);
    }
    if (loan_id) {
      countQuery += ` AND loan_id = ?`;
      countParams.push(loan_id);
    }
    if (status) {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }
    if (payment_method) {
      countQuery += ` AND payment_method = ?`;
      countParams.push(payment_method);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// PATCH /api/payments/:id/verify - verify payment (admin only)
router.patch('/:id/verify', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status } = req.body;

    if (!['verified', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be verified or failed' });
    }

    const db = getDb();
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment has already been processed' });
    }

    db.prepare('UPDATE payments SET status = ? WHERE id = ?').run(status, req.params.id);

    if (status === 'verified') {
      // Update inventory remaining balance
      const totalPaid = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM payments
        WHERE loan_id = ? AND status = 'verified'
      `).get(payment.loan_id).total;

      const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(payment.loan_id);
      const newBalance = Math.max(0, loan.amount - totalPaid);

      db.prepare(`
        UPDATE inventory SET remaining_balance = ?, last_updated = datetime('now')
        WHERE loan_id = ?
      `).run(newBalance, payment.loan_id);

      // Mark loan schedule entries as paid
      const schedule = db.prepare(`
        SELECT * FROM loan_schedule WHERE loan_id = ? AND status = 'pending'
        ORDER BY due_date ASC
      `).all(payment.loan_id);

      let remainingPayment = payment.amount;
      for (const entry of schedule) {
        if (remainingPayment >= entry.amount_due) {
          db.prepare(`UPDATE loan_schedule SET status = 'paid' WHERE id = ?`).run(entry.id);
          remainingPayment -= entry.amount_due;
        } else {
          break;
        }
      }

      // Check if loan is fully paid
      if (newBalance <= 0) {
        db.prepare(`UPDATE loans SET status = 'paid' WHERE id = ?`).run(payment.loan_id);
        db.prepare(`
          UPDATE loan_schedule SET status = 'paid' WHERE loan_id = ? AND status = 'pending'
        `).run(payment.loan_id);
      }

      // Update overdue status
      const today = new Date().toISOString().split('T')[0];
      db.prepare(`
        UPDATE loan_schedule SET status = 'overdue'
        WHERE loan_id = ? AND status = 'pending' AND due_date < ?
      `).run(payment.loan_id, today);
    }

    const updated = db.prepare(`
      SELECT p.*, u.name as borrower_name, l.amount as loan_amount
      FROM payments p
      JOIN users u ON u.id = p.user_id
      JOIN loans l ON l.id = p.loan_id
      WHERE p.id = ?
    `).get(req.params.id);

    res.json({ payment: updated });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// POST /api/payments/admin-record - admin records a payment directly as verified
router.post('/admin-record', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { loan_id, amount, payment_method, notes } = req.body;
    if (!loan_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'loan_id, amount, and payment_method are required' });
    }
    if (!['gcash', 'maya', 'palawan_pay', 'cash'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }
    if (amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

    const db = getDb();
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loan_id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.status !== 'active') return res.status(400).json({ error: 'Loan is not active' });

    const ts = Date.now();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const methodCode = payment_method.toUpperCase().replace('_', '');
    const reference_number = `ADMIN-${methodCode}-${ts}-${rand}`;
    const id = require('uuid').v4();

    // Insert as already verified
    db.prepare(`
      INSERT INTO payments (id, loan_id, user_id, amount, payment_method, reference_number, status)
      VALUES (?, ?, ?, ?, ?, ?, 'verified')
    `).run(id, loan_id, loan.user_id, amount, payment_method, reference_number);

    // Update inventory remaining balance
    const totalPaid = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE loan_id = ? AND status = 'verified'
    `).get(loan_id).total;
    const newBalance = Math.max(0, loan.amount - totalPaid);

    db.prepare(`UPDATE inventory SET remaining_balance = ?, last_updated = datetime('now') WHERE loan_id = ?`)
      .run(newBalance, loan_id);

    // Mark schedule entries as paid
    const schedule = db.prepare(`
      SELECT * FROM loan_schedule WHERE loan_id = ? AND status = 'pending' ORDER BY due_date ASC
    `).all(loan_id);
    let remaining = amount;
    for (const entry of schedule) {
      if (remaining >= entry.amount_due) {
        db.prepare(`UPDATE loan_schedule SET status = 'paid' WHERE id = ?`).run(entry.id);
        remaining -= entry.amount_due;
      } else break;
    }

    // Check if fully paid
    if (newBalance <= 0) {
      db.prepare(`UPDATE loans SET status = 'paid' WHERE id = ?`).run(loan_id);
      db.prepare(`UPDATE loan_schedule SET status = 'paid' WHERE loan_id = ? AND status = 'pending'`).run(loan_id);
    }

    const today = new Date().toISOString().split('T')[0];
    db.prepare(`UPDATE loan_schedule SET status = 'overdue' WHERE loan_id = ? AND status = 'pending' AND due_date < ?`)
      .run(loan_id, today);

    const payment = db.prepare(`
      SELECT p.*, u.name as borrower_name, l.amount as loan_amount
      FROM payments p JOIN users u ON u.id = p.user_id JOIN loans l ON l.id = p.loan_id WHERE p.id = ?
    `).get(id);

    res.status(201).json({ payment });
  } catch (err) {
    console.error('Admin record payment error:', err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

module.exports = router;
