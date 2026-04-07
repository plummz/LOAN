import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loansAPI } from '../api'
import Layout from './components/Layout'
import PaymentModal from './components/PaymentModal'
import { ArrowLeft, CreditCard, Calendar, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

const fmt = n => '₱' + (n / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })
const fmtDate = d => new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

const statusBadge = s => ({
  pending: <span className="badge-yellow">Pending</span>,
  active:  <span className="badge-green">Active</span>,
  paid:    <span className="badge bg-gray-100 text-gray-600">Paid</span>,
  rejected:<span className="badge-red">Rejected</span>,
}[s] || <span className="badge-gray">{s}</span>)

const schBadge = s => ({
  pending: <span className="badge-yellow">Upcoming</span>,
  paid:    <span className="badge-green">Paid</span>,
  overdue: <span className="badge-red">Overdue</span>,
}[s] || <span className="badge-gray">{s}</span>)

export default function LoanDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPayment, setShowPayment] = useState(false)
  const [approving, setApproving] = useState(false)

  const load = () => loansAPI.get(id).then(r => setData(r.data)).finally(() => setLoading(false))

  useEffect(() => { load() }, [id])

  const approveLoan = async () => {
    setApproving(true)
    try { await loansAPI.setStatus(id, 'approved'); load() }
    catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setApproving(false) }
  }
  const rejectLoan = async () => {
    if (!confirm('Reject this loan?')) return
    setApproving(true)
    try { await loansAPI.setStatus(id, 'rejected'); load() }
    catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setApproving(false) }
  }

  const backPath = user?.role === 'admin' ? '/admin/inventory' : '/my-loans'

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-800 rounded-full" /></div></Layout>
  if (!data) return <Layout><p className="text-center text-gray-500 py-20">Loan not found.</p></Layout>

  const { loan, schedule, payments } = data
  const remaining = loan.amount - (loan.total_paid || 0)
  const progress = loan.amount > 0 ? Math.round(((loan.total_paid || 0) / loan.amount) * 100) : 0

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(backPath)} className="text-gray-400 hover:text-gray-700"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{loan.purpose}</h1>
            <p className="text-gray-400 text-xs">Loan ID: {loan.id.slice(0, 8)}…</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {statusBadge(loan.status)}
            {loan.status === 'active' && user?.role === 'borrower' && (
              <button onClick={() => setShowPayment(true)} className="btn-gold text-sm flex items-center gap-1">
                <CreditCard size={14} /> Pay Now
              </button>
            )}
            {loan.status === 'pending' && user?.role === 'admin' && (
              <>
                <button onClick={approveLoan} disabled={approving} className="btn-primary text-sm">Approve</button>
                <button onClick={rejectLoan} disabled={approving} className="btn-danger text-sm">Reject</button>
              </>
            )}
          </div>
        </div>

        {/* Loan info + progress */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2 card">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
              <div><div className="text-gray-400 text-xs mb-0.5">Loan Amount</div><div className="font-bold text-lg text-gray-800">{fmt(loan.amount)}</div></div>
              <div><div className="text-gray-400 text-xs mb-0.5">Total Paid</div><div className="font-bold text-lg text-green-600">{fmt(loan.total_paid || 0)}</div></div>
              <div><div className="text-gray-400 text-xs mb-0.5">Remaining</div><div className="font-bold text-lg text-orange-500">{fmt(remaining)}</div></div>
              <div><div className="text-gray-400 text-xs mb-0.5">Term</div><div className="font-semibold">{loan.term_months} months</div></div>
              <div><div className="text-gray-400 text-xs mb-0.5">Interest Rate</div><div className="font-semibold">{loan.interest_rate}%/mo</div></div>
              <div><div className="text-gray-400 text-xs mb-0.5">Applied</div><div className="font-semibold">{fmtDate(loan.created_at)}</div></div>
            </div>
            {loan.status === 'active' && (
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Repayment Progress</span><span>{progress}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
          <div className="card bg-primary-50 border-primary-100 text-sm">
            <div className="font-semibold text-primary-800 mb-3">Loan Info</div>
            <div className="space-y-2">
              <div><span className="text-gray-500">Borrower</span><div className="font-medium">{loan.borrower_name}</div></div>
              {loan.approved_by_name && <div><span className="text-gray-500">Approved by</span><div className="font-medium">{loan.approved_by_name}</div></div>}
              {loan.approved_at && <div><span className="text-gray-500">Approved on</span><div className="font-medium">{fmtDate(loan.approved_at)}</div></div>}
            </div>
          </div>
        </div>

        {/* Schedule */}
        {schedule?.length > 0 && (
          <div className="card mb-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Calendar size={18} /> Payment Schedule</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="table-th">#</th>
                    <th className="table-th">Due Date</th>
                    <th className="table-th">Principal</th>
                    <th className="table-th">Interest</th>
                    <th className="table-th">Amount Due</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {schedule.map((s, i) => (
                    <tr key={s.id} className={s.status === 'overdue' ? 'bg-red-50' : s.status === 'paid' ? 'bg-green-50/50' : ''}>
                      <td className="table-td text-gray-400">{i + 1}</td>
                      <td className="table-td">{fmtDate(s.due_date)}</td>
                      <td className="table-td">{fmt(s.principal)}</td>
                      <td className="table-td text-orange-600">{fmt(s.interest)}</td>
                      <td className="table-td font-semibold">{fmt(s.amount_due)}</td>
                      <td className="table-td">{schBadge(s.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments */}
        {payments?.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><CreditCard size={18} /> Payment History</h2>
            <div className="space-y-3">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium capitalize">{p.payment_method.replace('_', ' ')}</div>
                    <div className="text-xs text-gray-400 font-mono">{p.reference_number}</div>
                    <div className="text-xs text-gray-400">{fmtDate(p.created_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{fmt(p.amount)}</div>
                    <span className={p.status === 'verified' ? 'badge-green' : p.status === 'failed' ? 'badge-red' : 'badge-yellow'}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showPayment && (
        <PaymentModal loan={loan} onClose={() => setShowPayment(false)} onSuccess={load} />
      )}
    </Layout>
  )
}
