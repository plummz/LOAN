import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usersAPI } from '../../api'
import Layout from '../components/Layout'
import { Search, Users, ShieldAlert, ShieldCheck } from 'lucide-react'

const fmtDate = d => new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

export default function UsersRegistry() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)

  const load = () => {
    setLoading(true)
    usersAPI.list({ page, limit: 20, search, role })
      .then(r => { setUsers(r.data.users); setTotal(r.data.pagination.total) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, role])
  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [search])

  const toggleStatus = async (u) => {
    setActionId(u.id)
    const newStatus = u.status === 'active' ? 'suspended' : 'active'
    try {
      await usersAPI.setStatus(u.id, newStatus)
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: newStatus } : x))
    } catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setActionId(null) }
  }

  const pages = Math.ceil(total / 20)

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">User Registry</h1>
          <p className="text-gray-500 text-sm">{total} registered users</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Search name, email or phone…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <div className="flex gap-2">
            {['', 'borrower', 'admin'].map(r => (
              <button key={r} onClick={() => { setRole(r); setPage(1) }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${role === r ? 'bg-primary-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {r === '' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-40" />
              <p>No users found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="table-th">Name</th>
                  <th className="table-th hidden md:table-cell">Email</th>
                  <th className="table-th hidden lg:table-cell">Phone</th>
                  <th className="table-th hidden lg:table-cell">Joined</th>
                  <th className="table-th">Loans</th>
                  <th className="table-th">Role</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">
                          {u.name.charAt(0)}
                        </div>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="table-td hidden md:table-cell text-gray-500">{u.email}</td>
                    <td className="table-td hidden lg:table-cell text-gray-500">{u.phone || '—'}</td>
                    <td className="table-td hidden lg:table-cell text-gray-400 text-xs">{fmtDate(u.created_at)}</td>
                    <td className="table-td">
                      <span className="font-medium">{u.loan_count}</span>
                      {u.active_loans > 0 && <span className="ml-1 badge-green text-xs">{u.active_loans} active</span>}
                    </td>
                    <td className="table-td">
                      <span className={u.role === 'admin' ? 'badge-purple' : 'badge-blue'}>{u.role}</span>
                    </td>
                    <td className="table-td">
                      <span className={u.status === 'active' ? 'badge-green' : 'badge-red'}>{u.status}</span>
                    </td>
                    <td className="table-td">
                      {u.role !== 'admin' && (
                        <button onClick={() => toggleStatus(u)} disabled={actionId === u.id}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded font-medium transition ${
                            u.status === 'active'
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}>
                          {u.status === 'active' ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
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
