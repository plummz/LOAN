require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb, initializeDb } = require('./db');

async function seed() {
  initializeDb();
  const db = getDb();

  console.log('🌱 Seeding database...');

  // Clear existing data
  db.exec(`
    DELETE FROM interest_records;
    DELETE FROM inventory;
    DELETE FROM loan_schedule;
    DELETE FROM payments;
    DELETE FROM loans;
    DELETE FROM users;
  `);

  // Create users
  const adminId = uuidv4();
  const adminHash = await bcrypt.hash('admin123', 10);
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, phone, address, role, status)
    VALUES (?, ?, ?, ?, ?, ?, 'admin', 'active')
  `).run(adminId, 'Admin User', 'admin@loanapp.ph', adminHash, '09171234567', 'Quezon City, Metro Manila');

  const borrowers = [
    { name: 'Maria Santos', email: 'maria@example.com', phone: '09181234567', address: 'Cebu City, Cebu' },
    { name: 'Juan dela Cruz', email: 'juan@example.com', phone: '09191234567', address: 'Davao City, Davao del Sur' },
    { name: 'Ana Reyes', email: 'ana@example.com', phone: '09201234567', address: 'Makati City, Metro Manila' },
    { name: 'Pedro Villanueva', email: 'pedro@example.com', phone: '09211234567', address: 'Iloilo City, Iloilo' },
    { name: 'Rosa Mendoza', email: 'rosa@example.com', phone: '09221234567', address: 'Baguio City, Benguet' },
  ];

  const borrowerIds = [];
  const pass = await bcrypt.hash('password123', 10);
  for (const b of borrowers) {
    const id = uuidv4();
    borrowerIds.push(id);
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, address, role, status)
      VALUES (?, ?, ?, ?, ?, ?, 'borrower', 'active')
    `).run(id, b.name, b.email, pass, b.phone, b.address);
  }

  console.log('✅ Users created');

  // Helper: generate amortization
  function generateSchedule(loanId, principal, termMonths, interestRate, startDate) {
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
      const interestAmt = Math.round(balance * monthlyRate);
      const principalAmt = i === termMonths ? balance : Math.min(monthlyPayment - interestAmt, balance);
      const amountDue = principalAmt + interestAmt;
      const periodStart = new Date(start);
      periodStart.setMonth(periodStart.getMonth() + i - 1);

      scheduleEntries.push({
        id: uuidv4(), loan_id: loanId,
        due_date: dueDate.toISOString().split('T')[0],
        amount_due: amountDue, principal: principalAmt, interest: interestAmt, status: 'pending'
      });
      interestEntries.push({
        id: uuidv4(), loan_id: loanId,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: dueDate.toISOString().split('T')[0],
        principal_balance: balance, interest_rate: interestRate, interest_amount: interestAmt
      });
      balance -= principalAmt;
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
      ON CONFLICT(loan_id) DO UPDATE SET disbursed_amount=excluded.disbursed_amount,
        remaining_balance=excluded.remaining_balance, last_updated=datetime('now')
    `);

    db.transaction(() => {
      for (const e of scheduleEntries) insertSchedule.run(e);
      for (const e of interestEntries) insertInterest.run(e);
      insertInventory.run(uuidv4(), loanId, principal, principal);
    })();
  }

  // Create sample loans
  const loanData = [
    { userId: borrowerIds[0], amount: 5000000, purpose: 'Small Business Capital', term: 12, rate: 3.0, status: 'active', daysAgo: 60 },
    { userId: borrowerIds[1], amount: 10000000, purpose: 'Home Renovation', term: 24, rate: 3.0, status: 'active', daysAgo: 90 },
    { userId: borrowerIds[2], amount: 2500000, purpose: 'Educational Expenses', term: 6, rate: 2.5, status: 'paid', daysAgo: 180 },
    { userId: borrowerIds[3], amount: 7500000, purpose: 'Medical Emergency', term: 18, rate: 3.0, status: 'active', daysAgo: 30 },
    { userId: borrowerIds[4], amount: 3000000, purpose: 'Vehicle Repair', term: 9, rate: 2.5, status: 'pending', daysAgo: 2 },
  ];

  const loanIds = [];
  for (const l of loanData) {
    const id = uuidv4();
    loanIds.push(id);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - l.daysAgo);

    db.prepare(`
      INSERT INTO loans (id, user_id, amount, purpose, term_months, interest_rate, status, approved_by, approved_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, l.userId, l.amount, l.purpose, l.term, l.rate, l.status,
      l.status !== 'pending' ? adminId : null,
      l.status !== 'pending' ? createdAt.toISOString() : null,
      createdAt.toISOString()
    );

    if (l.status !== 'pending' && l.status !== 'rejected') {
      generateSchedule(id, l.amount, l.term, l.rate, createdAt.toISOString());
    }
  }

  console.log('✅ Loans created');

  // Create sample payments
  const paymentMethods = ['gcash', 'maya', 'palawan_pay', 'cash'];
  const samplePayments = [
    { loanIdx: 0, amount: 500000, method: 'gcash', status: 'verified', daysAgo: 55 },
    { loanIdx: 0, amount: 500000, method: 'maya', status: 'verified', daysAgo: 25 },
    { loanIdx: 1, amount: 1000000, method: 'gcash', status: 'verified', daysAgo: 85 },
    { loanIdx: 1, amount: 1000000, method: 'palawan_pay', status: 'verified', daysAgo: 55 },
    { loanIdx: 1, amount: 1000000, method: 'cash', status: 'pending', daysAgo: 1 },
    { loanIdx: 3, amount: 750000, method: 'gcash', status: 'verified', daysAgo: 28 },
    { loanIdx: 3, amount: 750000, method: 'maya', status: 'pending', daysAgo: 3 },
  ];

  for (const p of samplePayments) {
    const id = uuidv4();
    const loanId = loanIds[p.loanIdx];
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
    const ts = Date.now() - p.daysAgo * 86400000;
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const methodCode = p.method.toUpperCase().replace('_', '');
    const ref = `LOANAPP-${methodCode}-${ts}-${random}`;
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - p.daysAgo);

    db.prepare(`
      INSERT INTO payments (id, loan_id, user_id, amount, payment_method, reference_number, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, loanId, loan.user_id, p.amount, p.method, ref, p.status, createdAt.toISOString());

    // Update inventory for verified payments
    if (p.status === 'verified') {
      const inv = db.prepare('SELECT * FROM inventory WHERE loan_id = ?').get(loanId);
      if (inv) {
        const newBalance = Math.max(0, inv.remaining_balance - p.amount);
        db.prepare('UPDATE inventory SET remaining_balance = ?, last_updated = datetime(\'now\') WHERE loan_id = ?')
          .run(newBalance, loanId);
      }
    }
  }

  // Mark paid loan's schedule as paid
  db.prepare('UPDATE loan_schedule SET status = \'paid\' WHERE loan_id = ?').run(loanIds[2]);
  db.prepare('UPDATE loans SET status = \'paid\' WHERE id = ?').run(loanIds[2]);

  console.log('✅ Payments created');
  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Admin:    admin@loanapp.ph  / admin123');
  console.log('   Borrower: maria@example.com / password123');
  console.log('   Borrower: juan@example.com  / password123');
  console.log('   Borrower: ana@example.com   / password123');
  console.log('   Borrower: pedro@example.com / password123');
  console.log('   Borrower: rosa@example.com  / password123');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
