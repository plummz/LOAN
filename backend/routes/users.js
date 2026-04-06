const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/users - admin creates a user directly
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, phone, address, role = 'borrower' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!['admin', 'borrower'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, address, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(id, name, email, password_hash, phone || null, address || null, role);

    const user = db.prepare('SELECT id, name, email, phone, address, role, status, created_at FROM users WHERE id = ?').get(id);
    res.status(201).json({ user });
  } catch (err) {
    console.error('Admin create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET /api/users - list all users (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 20, search = '', role = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT u.id, u.name, u.email, u.phone, u.address, u.role, u.status, u.created_at,
             COUNT(DISTINCT l.id) as loan_count,
             SUM(CASE WHEN l.status = 'active' THEN 1 ELSE 0 END) as active_loans
      FROM users u
      LEFT JOIN loans l ON l.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      query += ` AND u.role = ?`;
      params.push(role);
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const users = db.prepare(query).all(...params);

    // Count total
    let countQuery = `SELECT COUNT(*) as total FROM users WHERE 1=1`;
    const countParams = [];
    if (search) {
      countQuery += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (role) {
      countQuery += ` AND role = ?`;
      countParams.push(role);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - user details (admin only)
router.get('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare(`
      SELECT id, name, email, phone, address, role, status, created_at
      FROM users WHERE id = ?
    `).get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const loans = db.prepare(`
      SELECT * FROM loans WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.params.id);

    const payments = db.prepare(`
      SELECT p.*, l.amount as loan_amount FROM payments p
      JOIN loans l ON l.id = p.loan_id
      WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 10
    `).all(req.params.id);

    res.json({ user, loans, payments });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PATCH /api/users/:id/status - suspend/activate (admin only)
router.patch('/:id/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Status must be active or suspended' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin' && status === 'suspended') {
      return res.status(400).json({ error: 'Cannot suspend admin accounts' });
    }

    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);

    const updated = db.prepare('SELECT id, name, email, phone, address, role, status, created_at FROM users WHERE id = ?').get(req.params.id);
    res.json({ user: updated });
  } catch (err) {
    console.error('Update user status error:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

module.exports = router;
