import { useEffect, useState } from 'react'
import { paymentsAPI } from '../../api'
import Layout from '../components/Layout'
import { CreditCard, CheckCircle, XCircle } from 'lucide-react'

const fmt = n => '₱' + (n / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })
const fmtDate = d => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const methodLabel = m => ({ gcash: 'GCash', maya: 'Maya', palawan_pay: 'Palawan Pay', cash: 'Cash' }[m] || m)
const methodBadge = m => {
  const colors = { gcash: 'bg-blue-100 text-blue-700', maya: 'bg-green-100 text-green-700', palawan_pay: 'bg-orange-100 text-orange-700', cash: 'bg-gray-100 text-gray-600' }
  return <span className={`badge ${colors[m] || 'badge-gray'}`}>{methodLabel(m)}</span>
}

export default function AllPayments() {
  const [payments, setPayments] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)

  const load = () => {
    setLoading(true)
    paymentsAPI.list({ page, limit: 20, status, payment_method: method })
      .then(r => { setPayments(r.data.payments); setTotal(r.data.pagination.total) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, status, method])

  const verify = async (id, newStatus) => {
    if (newStatus === 'failed' && !confirm('Mark this payment as failed?')) return
    setActionId(id)
    try { await paymentsAPI.verify(id, newStatus); load() }
    catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setActionId(null) }
  }

  const pages = Math.ceil(total / 20)
  const pendingCount = payments.filter(p => p.status === 'pending').length

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">All Payments</h1>
            <p className="text-gray-500 text-sm">{total} payment records</p>
          </div>
          {pendingCount > 0 && (
            <div className="badge-yellow px-3 py-1.5 text-sm font-medium">
              {pendingCount} pending verification
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex gap-1">
            {['', 'pending', 'verified', 'failed'].map(s => (
              <button key={s} onClick={() => { setStatus(s); setPage(1) }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${status === s ? 'bg-primary-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                {s === '' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {['', 'gcash', 'maya', 'palawan_pay', 'cash'].map(m => (
              <button key={m} onClick={() => { setMethod(m); setPage(1) }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${method === m ? 'bg-primary-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                {m === '' ? 'All Methods' : methodLabel(m)}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <CreditCard size={40} className="mx-auto mb-3 opacity-40" />
              <p>No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="table-th">Borrower</th>
                    <th className="table-th">Method</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th hidden md:table-cell">Reference</th>
                    <th className="table-th hidden lg:table-cell">Date</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map(p => (
                    <tr key={p.id} className={`hover:bg-gray-50 ${p.status === 'pending' ? 'bg-yellow-50/40' : ''}`}>
                      <td className="table-td">
                        <div className="font-medium text-sm">{p.borrower_name}</div>
                        <div className="text-xs text-gray-400">{p.borrower_email}</div>
                      </td>
                      <td className="table-td">{methodBadge(p.payment_method)}</td>
                      <td className="table-td font-semibold">{fmt(p.amount)}</td>
                      <td className="table-td hidden md:table-cell">
                        <span className="font-mono text-xs text-gray-500">{p.reference_number}</span>
                      </td>
                      <td className="table-td hidden lg:table-cell text-xs text-gray-400">{fmtDate(p.created_at)}</td>
                      <td className="table-td">
                        <span className={p.status === 'verified' ? 'badge-green' : p.status === 'failed' ? 'badge-red' : 'badge-yellow'}>
                          {p.status}
                        </span>
                      </td>
                      <td className="table-td">
                        {p.status === 'pending' && (
                          <div className="flex gap-1">
                            <button onClick={() => verify(p.id, 'verified')} disabled={actionId === p.id}
                              className="flex items-center gap-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded font-medium transition">
                              <CheckCircle size={11} /> Verify
                            </button>
                            <button onClick={() => verify(p.id, 'failed')} disabled={actionId === p.id}
                              className="flex items-center gap-1 text-xs text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded font-medium transition">
                              <XCircle size={11} /> Fail
                            </button>
                          </div>
                        )}
                        {p.status !== 'pending' && <span className="text-gray-300 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <span className="text-xs text-gray-400">Page {page} of {pages} · {total} total</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Prev</button>
                <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
