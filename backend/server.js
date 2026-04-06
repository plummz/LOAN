require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
initializeDb();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? true  // same origin in production (backend serves frontend)
    : (process.env.FRONTEND_URL || 'http://localhost:5173'),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const loanRoutes = require('./routes/loans');
const paymentRoutes = require('./routes/payments');
const inventoryRoutes = require('./routes/inventory');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/interest-records', (req, res, next) => {
  req.url = '/interest-records' + req.url;
  inventoryRoutes(req, res, next);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// One-time reseed endpoint (protected by secret key)
app.post('/api/admin/reseed', async (req, res) => {
  const { secret } = req.body;
  const validSecret = process.env.RESEED_SECRET || 'jrm-reset-2026';
  if (secret !== validSecret) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { getDb } = require('./db');
    const db = getDb();
    db.exec(`
      DELETE FROM interest_records;
      DELETE FROM inventory;
      DELETE FROM loan_schedule;
      DELETE FROM payments;
      DELETE FROM loans;
      DELETE FROM users;
    `);
    // Re-run seed
    delete require.cache[require.resolve('./seed')];
    await require('./seed');
    res.json({ message: 'Database reseeded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook endpoints for payment providers (mock)
app.post('/api/webhooks/gcash', (req, res) => {
  console.log('GCash webhook received:', req.body);
  res.json({ status: 'received' });
});

app.post('/api/webhooks/maya', (req, res) => {
  console.log('Maya webhook received:', req.body);
  res.json({ status: 'received' });
});

app.post('/api/webhooks/palawan', (req, res) => {
  console.log('Palawan Pay webhook received:', req.body);
  res.json({ status: 'received' });
});

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, 'public');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Loan App Backend running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
