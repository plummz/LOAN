import { useEffect, useState } from 'react'
import { usersAPI } from '../../api'
import Layout from '../components/Layout'
import { Search, Users, ShieldAlert, ShieldCheck, UserPlus, X, Loader2, Eye, EyeOff } from 'lucide-react'

const fmtDate = d => new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

function AddUserModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '', role: 'borrower' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await usersAPI.adminCreate(form)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Add New User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="label">Full Name <span className="text-red-500">*</span></label>
            <input name="name" className="input" placeholder="Juan dela Cruz" value={form.name} onChange={handle} required />
          </div>
          <div>
            <label className="label">Email <span className="text-red-500">*</span></label>
            <input name="email" type="email" className="input" placeholder="juan@example.com" value={form.email} onChange={handle} required />
          </div>
          <div>
            <label className="label">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input name="password" type={showPass ? 'text' : 'password'} className="input pr-10"
                placeholder="At least 6 characters" value={form.password} onChange={handle} required />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input name="phone" className="input" placeholder="09XXXXXXXXX" value={form.phone} onChange={handle} />
            </div>
            <div>
              <label className="label">Role</label>
              <select name="role" className="input" value={form.role} onChange={handle}>
                <option value="borrower">Borrower</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <input name="address" className="input" placeholder="City, Province" value={form.address} onChange={handle} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UsersRegistry() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [showAddUser, setShowAddUser] = useState(false)

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">User Registry</h1>
            <p className="text-gray-500 text-sm">{total} registered users</p>
          </div>
          <button onClick={() => setShowAddUser(true)} className="btn-primary flex items-center gap-2 text-sm">
            <UserPlus size={16} /> Add User
          </button>
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
                            u.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
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

      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} onSuccess={load} />}
    </Layout>
  )
}
