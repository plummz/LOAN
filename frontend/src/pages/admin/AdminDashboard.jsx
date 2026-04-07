import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { inventoryAPI, loansAPI, paymentsAPI, usersAPI } from '../../api'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import { Users, FileText, CreditCard, TrendingUp, Package, Clock, CheckCircle, AlertCircle } from 'lucide-react'

const fmt = n => '₱' + (n / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })
const fmtDate = d => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

const statusBadge = s => ({
  pending:  <span className="badge-yellow">Pending</span>,
  active:   <span className="badge-green">Active</span>,
  paid:     <span className="badge bg-gray-100 text-gray-600">Paid</span>,
  rejected: <span className="badge-red">Rejected</span>,
  approved: <span className="badge-blue">Approved</span>,
}[s] || <span className="badge-gray">{s}</span>)

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recentLoans, setRecentLoans] = useState([])
  const [recentPayments, setRecentPayments] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      inventoryAPI.list({ limit: 1 }),
      loansAPI.list({ limit: 5 }),
      paymentsAPI.list({ limit: 5 }),
      loansAPI.list({ status: 'pending', limit: 1 }),
      usersAPI.list({ limit: 1 }),
    ]).then(([inv, loans, pays, pend, users]) => {
      setStats(inv.data.stats)
      setRecentLoans(loans.data.loans)
      setRecentPayments(pays.data.payments)
      setPendingCount(pend.data.pagination.total)
      setUserCount(users.data.pagination.total)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm">Overview of all loan activity</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Users}       label="Total Users"     value={userCount}                             color="blue"   />
          <StatCard icon={FileText}    label="Total Loans"     value={stats?.total_loans || 0}               color="purple" />
          <StatCard icon={Clock}       label="Pending Review"  value={pendingCount}                          color="gold"   />
          <StatCard icon={CheckCircle} label="Active Loans"    value={stats?.active_loans || 0}              color="green"  />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard icon={Package}     label="Total Disbursed" value={fmt(stats?.total_disbursed || 0)}      color="blue"   />
          <StatCard icon={CreditCard}  label="Total Collected" value={fmt(stats?.total_collected || 0)}      color="green"  />
          <StatCard icon={TrendingUp}  label="Outstanding"     value={fmt(stats?.total_outstanding || 0)}    color="red"    />
        </div>

        {/* Pending approvals CTA */}
        {pendingCount > 0 && (
          <Link to="/admin/inventory?status=pending"
            className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 transition">
            <AlertCircle size={22} className="text-yellow-600 flex-shrink-0" />
            <div>
              <div className="font-semibold text-yellow-800">{pendingCount} loan{pendingCount > 1 ? 's' : ''} awaiting approval</div>
              <div className="text-xs text-yellow-600">Click to review and approve/reject</div>
            </div>
            <div className="ml-auto text-yellow-500">›</div>
          </Link>
        )}

        {/* Loan portfolio bar */}
        {stats && stats.total_loans > 0 && (
          <div className="card mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">Loan Portfolio Breakdown</h2>
            <div className="space-y-3">
              {[
                { label: 'Active', count: stats.active_loans, total: stats.total_loans, color: 'bg-green-500' },
                { label: 'Paid', count: stats.paid_loans, total: stats.total_loans, color: 'bg-gray-400' },
                { label: 'Pending', count: stats.pending_loans, total: stats.total_loans, color: 'bg-yellow-400' },
                { label: 'Rejected', count: stats.rejected_loans, total: stats.total_loans, color: 'bg-red-400' },
              ].map(({ label, count, total, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-20 text-sm text-gray-600">{label}</div>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
                  </div>
                  <div className="w-8 text-sm font-semibold text-gray-700 text-right">{count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Loans */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Recent Loans</h2>
              <Link to="/admin/inventory" className="text-sm text-primary-700 hover:underline">View all</Link>
            </div>
            {recentLoans.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No loans yet</p>
            ) : (
              <div className="space-y-3">
                {recentLoans.map(l => (
                  <Link key={l.id} to={`/admin/loans/${l.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition">
                    <div>
                      <div className="text-sm font-medium">{l.borrower_name}</div>
                      <div className="text-xs text-gray-400">{l.purpose} · {fmt(l.amount)}</div>
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
              <Link to="/admin/payments" className="text-sm text-primary-700 hover:underline">View all</Link>
            </div>
            {recentPayments.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No payments yet</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                    <div>
                      <div className="text-sm font-medium">{p.borrower_name}</div>
                      <div className="text-xs text-gray-400 capitalize">{p.payment_method.replace('_',' ')} · {fmtDate(p.created_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{fmt(p.amount)}</div>
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
