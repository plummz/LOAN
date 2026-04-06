import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { inventoryAPI, loansAPI } from '../../api'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import { Package, CheckCircle, Clock, XCircle, DollarSign } from 'lucide-react'

const fmt = n => '₱' + (n / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })
const fmtDate = d => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

const statusBadge = s => ({
  pending:  <span className="badge-yellow">Pending</span>,
  approved: <span className="badge-blue">Approved</span>,
  active:   <span className="badge-green">Active</span>,
  paid:     <span className="badge bg-gray-100 text-gray-600">Paid</span>,
  rejected: <span className="badge-red">Rejected</span>,
}[s] || <span className="badge-gray">{s}</span>)

export default function LoanInventory() {
  const [searchParams] = useSearchParams()
  const [data, setData] = useState({ inventory: [], stats: null, pagination: {} })
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)

  const load = () => {
    setLoading(true)
    inventoryAPI.list({ page, limit: 20, status })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, status])

  const approve = async (loanId) => {
    setActionId(loanId)
    try { await loansAPI.setStatus(loanId, 'approved'); load() }
    catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setActionId(null) }
  }

  const reject = async (loanId) => {
    if (!confirm('Reject this loan?')) return
    setActionId(loanId)
    try { await loansAPI.setStatus(loanId, 'rejected'); load() }
    catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setActionId(null) }
  }

  const { inventory, stats, pagination } = data
  const pages = Math.ceil((pagination.total || 0) / 20)

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Loan Inventory</h1>
          <p className="text-gray-500 text-sm">All loan records and portfolio summary</p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Package}      label="Total Loans"      value={stats.total_loans}              color="blue"   />
            <StatCard icon={CheckCircle}  label="Active"           value={stats.active_loans}             color="green"  />
            <StatCard icon={DollarSign}   label="Total Disbursed"  value={fmt(stats.total_disbursed||0)}  color="purple" />
            <StatCard icon={DollarSign}   label="Outstanding"      value={fmt(stats.total_outstanding||0)} color="red"   />
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {['', 'pending', 'active', 'paid', 'rejected'].map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(1) }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${status === s ? 'bg-primary-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package size={40} className="mx-auto mb-3 opacity-40" />
              <p>No loans found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="table-th">Borrower</th>
                    <th className="table-th">Purpose</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th hidden md:table-cell">Paid</th>
                    <th className="table-th hidden md:table-cell">Balance</th>
                    <th className="table-th hidden lg:table-cell">Term</th>
                    <th className="table-th hidden lg:table-cell">Overdue</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inventory.map(l => (
                    <tr key={l.id} className={`hover:bg-gray-50 ${l.overdue_count > 0 ? 'bg-red-50/30' : ''}`}>
                      <td className="table-td">
                        <div className="font-medium text-sm">{l.borrower_name}</div>
                        <div className="text-xs text-gray-400">{l.borrower_phone}</div>
                      </td>
                      <td className="table-td text-sm max-w-xs truncate">{l.purpose}</td>
                      <td className="table-td font-semibold">{fmt(l.amount)}</td>
                      <td className="table-td hidden md:table-cell text-green-600">{fmt(l.total_paid || 0)}</td>
                      <td className="table-td hidden md:table-cell text-orange-600 font-medium">{fmt(l.remaining_balance || l.amount)}</td>
                      <td className="table-td hidden lg:table-cell text-gray-500">{l.term_months}mo @ {l.interest_rate}%</td>
                      <td className="table-td hidden lg:table-cell">
                        {l.overdue_count > 0 ? <span className="badge-red">{l.overdue_count} overdue</span> : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="table-td">{statusBadge(l.status)}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-1">
                          <Link to={`/admin/loans/${l.id}`} className="text-xs text-primary-700 hover:underline font-medium">View</Link>
                          {l.status === 'pending' && (
                            <>
                              <button onClick={() => approve(l.id)} disabled={actionId === l.id}
                                className="text-xs text-green-700 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded font-medium transition">
                                Approve
                              </button>
                              <button onClick={() => reject(l.id)} disabled={actionId === l.id}
                                className="text-xs text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded font-medium transition">
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <span className="text-xs text-gray-400">Page {page} of {pages} · {pagination.total} total</span>
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
