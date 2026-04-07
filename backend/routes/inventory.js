const express = require('express');
const { getDb } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/inventory - loan inventory summary
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 20, status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT l.id, l.amount, l.purpose, l.term_months, l.interest_rate, l.status, l.created_at,
             l.approved_at, u.name as borrower_name, u.email as borrower_email,
             u.phone as borrower_phone,
             COALESCE(inv.disbursed_amount, 0) as disbursed_amount,
             COALESCE(inv.remaining_balance, l.amount) as remaining_balance,
             inv.last_updated,
             (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE loan_id = l.id AND status = 'verified') as total_paid,
             (SELECT COUNT(*) FROM loan_schedule WHERE loan_id = l.id AND status = 'overdue') as overdue_count
      FROM loans l
      JOIN users u ON u.id = l.user_id
      LEFT JOIN inventory inv ON inv.loan_id = l.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND l.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const inventory = db.prepare(query).all(...params);

    let countQuery = `SELECT COUNT(*) as total FROM loans WHERE 1=1`;
    const countParams = [];
    if (status) {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    // Summary stats
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_loans,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_loans,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_loans,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_loans,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_loans,
        SUM(amount) as total_disbursed,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'verified') as total_collected,
        (SELECT COALESCE(SUM(remaining_balance), 0) FROM inventory) as total_outstanding
      FROM loans
      WHERE status IN ('active', 'paid', 'approved')
    `).get();

    res.json({
      inventory,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// GET /api/interest-records - interest breakdown
router.get('/interest-records', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 20, loan_id = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT ir.*, l.purpose as loan_purpose, l.status as loan_status,
             u.name as borrower_name, u.email as borrower_email,
             l.amount as loan_amount
      FROM interest_records ir
      JOIN loans l ON l.id = ir.loan_id
      JOIN users u ON u.id = l.user_id
      WHERE 1=1
    `;
    const params = [];

    if (loan_id) {
      query += ` AND ir.loan_id = ?`;
      params.push(loan_id);
    }

    query += ` ORDER BY ir.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const records = db.prepare(query).all(...params);

    let countQuery = `SELECT COUNT(*) as total FROM interest_records WHERE 1=1`;
    const countParams = [];
    if (loan_id) {
      countQuery += ` AND loan_id = ?`;
      countParams.push(loan_id);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    const summary = db.prepare(`
      SELECT
        COUNT(DISTINCT loan_id) as total_loans,
        SUM(interest_amount) as total_interest,
        AVG(interest_rate) as avg_rate
      FROM interest_records
    `).get();

    res.json({
      records,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Get interest records error:', err);
    res.status(500).json({ error: 'Failed to fetch interest records' });
  }
});

module.exports = router;
