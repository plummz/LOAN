import { useEffect, useState } from 'react'
import { inventoryAPI } from '../../api'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import { TrendingUp, DollarSign, Percent } from 'lucide-react'

const fmt = n => '₱' + (n / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })
const fmtDate = d => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

export default function InterestRecords() {
  const [data, setData] = useState({ records: [], summary: null, pagination: {} })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    inventoryAPI.interestRecords({ page, limit: 25 })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page])

  const { records, summary, pagination } = data
  const pages = Math.ceil((pagination.total || 0) / 25)

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Interest Records</h1>
          <p className="text-gray-500 text-sm">Monthly interest breakdown per loan</p>
        </div>

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard icon={TrendingUp}  label="Loans with Interest"  value={summary.total_loans}          color="blue"  />
            <StatCard icon={DollarSign}  label="Total Interest Earned" value={fmt(summary.total_interest||0)} color="green" />
            <StatCard icon={Percent}     label="Average Rate"          value={`${(summary.avg_rate||0).toFixed(1)}%/mo`} color="gold" />
          </div>
        )}

        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <TrendingUp size={40} className="mx-auto mb-3 opacity-40" />
              <p>No interest records yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="table-th">Borrower</th>
                    <th className="table-th hidden md:table-cell">Loan Purpose</th>
                    <th className="table-th">Period</th>
                    <th className="table-th">Principal</th>
                    <th className="table-th">Rate</th>
                    <th className="table-th">Interest</th>
                    <th className="table-th hidden lg:table-cell">Loan Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="table-td font-medium">{r.borrower_name}</td>
                      <td className="table-td hidden md:table-cell text-gray-500 text-xs max-w-xs truncate">{r.loan_purpose}</td>
                      <td className="table-td text-xs text-gray-500">
                        {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
                      </td>
                      <td className="table-td">{fmt(r.principal_balance)}</td>
                      <td className="table-td"><span className="badge-blue">{r.interest_rate}%</span></td>
                      <td className="table-td font-semibold text-orange-600">{fmt(r.interest_amount)}</td>
                      <td className="table-td hidden lg:table-cell">
                        <span className={r.loan_status === 'active' ? 'badge-green' : r.loan_status === 'paid' ? 'badge bg-gray-100 text-gray-600' : 'badge-yellow'}>
                          {r.loan_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <span className="text-xs text-gray-400">Page {page} of {pages}</span>
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
