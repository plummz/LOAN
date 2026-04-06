import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loansAPI } from '../api'
import Layout from './components/Layout'
import { FileText, ChevronRight } from 'lucide-react'

const fmt = n => '₱' + (n / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })

const statusBadge = s => ({
  pending:  <span className="badge-yellow">Pending</span>,
  approved: <span className="badge-blue">Approved</span>,
  active:   <span className="badge-green">Active</span>,
  paid:     <span className="badge badge bg-gray-100 text-gray-600">Paid</span>,
  rejected: <span className="badge-red">Rejected</span>,
}[s] || <span className="badge-gray">{s}</span>)

export default function MyLoans() {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  useEffect(() => {
    loansAPI.list({ status, limit: 50 })
      .then(r => setLoans(r.data.loans))
      .finally(() => setLoading(false))
  }, [status])

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Loans</h1>
            <p className="text-gray-500 text-sm mt-0.5">Track all your loan applications and status</p>
          </div>
          <Link to="/apply" className="btn-primary text-sm">+ Apply</Link>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {['', 'pending', 'active', 'paid', 'rejected'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${status === s ? 'bg-primary-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : loans.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-40" />
              <p>No loans found</p>
              <Link to="/apply" className="mt-2 inline-block text-sm text-primary-700 hover:underline">Apply for your first loan →</Link>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="table-th">Purpose</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th hidden md:table-cell">Term</th>
                  <th className="table-th hidden md:table-cell">Rate</th>
                  <th className="table-th">Balance</th>
                  <th className="table-th">Status</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loans.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{l.purpose}</td>
                    <td className="table-td">{fmt(l.amount)}</td>
                    <td className="table-td hidden md:table-cell">{l.term_months}mo</td>
                    <td className="table-td hidden md:table-cell">{l.interest_rate}%</td>
                    <td className="table-td text-orange-600 font-medium">{fmt(Math.max(0, l.amount - (l.total_paid || 0)))}</td>
                    <td className="table-td">{statusBadge(l.status)}</td>
                    <td className="table-td">
                      <Link to={`/loans/${l.id}`} className="text-primary-700 hover:text-primary-900">
                        <ChevronRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  )
}
