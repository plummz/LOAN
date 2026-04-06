import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loansAPI, paymentsAPI } from '../api'
import Layout from './components/Layout'
import StatCard from './components/StatCard'
import { FileText, CreditCard, CheckCircle, Clock, AlertCircle, PlusCircle } from 'lucide-react'

const fmt = n => '₱' + (n / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })

const statusBadge = s => ({
  pending:  <span className="badge-yellow">Pending</span>,
  approved: <span className="badge-blue">Approved</span>,
  active:   <span className="badge-green">Active</span>,
  paid:     <span className="badge badge-gray">Paid</span>,
  rejected: <span className="badge-red">Rejected</span>,
}[s] || <span className="badge-gray">{s}</span>)

export default function Dashboard() {
  const { user } = useAuth()
  const [loans, setLoans] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([loansAPI.list({ limit: 5 }), paymentsAPI.list({ limit: 5 })])
      .then(([lr, pr]) => { setLoans(lr.data.loans); setPayments(pr.data.payments) })
      .finally(() => setLoading(false))
  }, [])

  const activeLoan = loans.find(l => l.status === 'active')
  const pendingLoan = loans.find(l => l.status === 'pending')
  const totalPaid = payments.filter(p => p.status === 'verified').reduce((s, p) => s + p.amount, 0)

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Welcome */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
            <p className="text-gray-500 text-sm mt-0.5">Here's a summary of your loan activity.</p>
          </div>
          {!activeLoan && !pendingLoan && (
            <Link to="/apply" className="btn-gold flex items-center gap-2 text-sm">
              <PlusCircle size={16} /> Apply for Loan
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={FileText}     label="Total Loans"    value={loans.length}           color="blue" />
          <StatCard icon={CheckCircle}  label="Active"         value={loans.filter(l=>l.status==='active').length}  color="green" />
          <StatCard icon={Clock}        label="Pending"        value={loans.filter(l=>l.status==='pending').length} color="gold" />
          <StatCard icon={CreditCard}   label="Total Paid"     value={fmt(totalPaid)}          color="purple" />
        </div>

        {/* Active loan highlight */}
        {activeLoan && (
          <div className="card mb-6 bg-gradient-to-r from-primary-900 to-primary-700 text-white border-0">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-primary-200 text-xs uppercase font-semibold mb-1">Active Loan</div>
                <div className="text-3xl font-bold mb-1">{fmt(activeLoan.amount)}</div>
                <div className="text-primary-200 text-sm">{activeLoan.purpose} · {activeLoan.term_months} months</div>
                <div className="text-primary-300 text-xs mt-1">
                  Paid: {fmt(activeLoan.total_paid || 0)} · Balance: {fmt(activeLoan.amount - (activeLoan.total_paid || 0))}
                </div>
              </div>
              <Link to={`/loans/${activeLoan.id}`} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                View Details
              </Link>
            </div>
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-primary-200 mb-1">
                <span>Repayment Progress</span>
                <span>{activeLoan.amount > 0 ? Math.round(((activeLoan.total_paid || 0) / activeLoan.amount) * 100) : 0}%</span>
              </div>
              <div className="h-2 bg-primary-800 rounded-full overflow-hidden">
                <div className="h-full bg-gold-500 rounded-full transition-all"
                  style={{ width: `${activeLoan.amount > 0 ? Math.round(((activeLoan.total_paid || 0) / activeLoan.amount) * 100) : 0}%` }} />
              </div>
            </div>
          </div>
        )}

        {pendingLoan && (
          <div className="card mb-6 border-yellow-200 bg-yellow-50">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-yellow-600" />
              <div>
                <div className="font-semibold text-yellow-800">Loan Under Review</div>
                <div className="text-sm text-yellow-600">{fmt(pendingLoan.amount)} for "{pendingLoan.purpose}" — waiting for admin approval.</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Loans */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Loan History</h2>
              <Link to="/my-loans" className="text-sm text-primary-700 hover:underline">View all</Link>
            </div>
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
            ) : loans.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileText size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No loans yet</p>
                <Link to="/apply" className="mt-2 inline-block text-sm text-primary-700 hover:underline">Apply now →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {loans.slice(0, 5).map(l => (
                  <Link key={l.id} to={`/loans/${l.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition border border-gray-100">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{l.purpose}</div>
                      <div className="text-xs text-gray-400">{fmt(l.amount)} · {l.term_months}mo</div>
                    </div>
                    {statusBadge(l.status)}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Payments */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Recent Payments</h2>
            </div>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CreditCard size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No payment records</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                    <div>
                      <div className="text-sm font-medium text-gray-800 capitalize">{p.payment_method.replace('_', ' ')}</div>
                      <div className="text-xs text-gray-400 font-mono">{p.reference_number.slice(0, 24)}…</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-800">{fmt(p.amount)}</div>
                      <span className={p.status === 'verified' ? 'badge-green' : p.status === 'failed' ? 'badge-red' : 'badge-yellow'}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
