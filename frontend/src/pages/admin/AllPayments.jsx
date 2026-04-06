import { useEffect, useState } from 'react'
import { paymentsAPI, loansAPI } from '../../api'
import Layout from '../components/Layout'
import { CreditCard, CheckCircle, XCircle, PlusCircle, X, Loader2, Search } from 'lucide-react'

const fmt = n => '₱' + (n / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })
const fmtDate = d => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const methodLabel = m => ({ gcash: 'GCash', maya: 'Maya', palawan_pay: 'Palawan Pay', cash: 'Cash' }[m] || m)
const methodBadge = m => {
  const colors = { gcash: 'bg-blue-100 text-blue-700', maya: 'bg-green-100 text-green-700', palawan_pay: 'bg-orange-100 text-orange-700', cash: 'bg-gray-100 text-gray-600' }
  return <span className={`badge ${colors[m] || 'badge-gray'}`}>{methodLabel(m)}</span>
}

function RecordPaymentModal({ onClose, onSuccess }) {
  const [loans, setLoans] = useState([])
  const [loanSearch, setLoanSearch] = useState('')
  const [form, setForm] = useState({ loan_id: '', amount: '', payment_method: 'cash' })
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  useEffect(() => {
    loansAPI.list({ status: 'active', limit: 200 })
      .then(r => setLoans(r.data.loans))
  }, [])

  const filteredLoans = loans.filter(l =>
    l.borrower_name?.toLowerCase().includes(loanSearch.toLowerCase()) ||
    l.purpose?.toLowerCase().includes(loanSearch.toLowerCase())
  )

  const handleLoanSelect = e => {
    const id = e.target.value
    setForm(f => ({ ...f, loan_id: id }))
    setSelectedLoan(loans.find(l => l.id === id) || null)
  }

  const remaining = selectedLoan ? selectedLoan.amount - (selectedLoan.total_paid || 0) : 0
  const amountCents = Math.round(parseFloat(form.amount || 0) * 100)

  const submit = async e => {
    e.preventDefault()
    if (!form.loan_id) { setError('Please select a loan.'); return }
    if (amountCents <= 0) { setError('Enter a valid amount.'); return }
    if (amountCents > remaining) { setError('Amount exceeds remaining balance.'); return }
    setError('')
    setLoading(true)
    try {
      await paymentsAPI.adminRecord({ loan_id: form.loan_id, amount: amountCents, payment_method: form.payment_method })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record payment')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-800">Record Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          {/* Loan picker */}
          <div>
            <label className="label">Loan / Borrower <span className="text-red-500">*</span></label>
            <div className="relative mb-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-8 text-sm" placeholder="Search by name or purpose…"
                value={loanSearch} onChange={e => setLoanSearch(e.target.value)} />
            </div>
            <select className="input" value={form.loan_id} onChange={handleLoanSelect} required size={4}>
              <option value="">-- Select Active Loan --</option>
              {filteredLoans.map(l => (
                <option key={l.id} value={l.id}>
                  {l.borrower_name} — {l.purpose} ({fmt(l.amount - (l.total_paid || 0))} remaining)
                </option>
              ))}
            </select>
          </div>

          {/* Selected loan info */}
          {selectedLoan && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
              <div className="font-semibold text-blue-800 mb-1">{selectedLoan.borrower_name}</div>
              <div className="flex justify-between text-gray-600">
                <span>Loan Amount</span><span className="font-medium">{fmt(selectedLoan.amount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Already Paid</span><span className="font-medium text-green-600">{fmt(selectedLoan.total_paid || 0)}</span>
              </div>
              <div className="flex justify-between text-gray-600 font-semibold">
                <span>Remaining Balance</span><span className="text-orange-600">{fmt(remaining)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="label">Payment Amount (₱) <span className="text-red-500">*</span></label>
            <input name="amount" type="number" className="input" placeholder="0.00"
              min="1" step="0.01" value={form.amount} onChange={handle} required />
            {selectedLoan && (
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setForm(f => ({ ...f, amount: (remaining / 100).toFixed(2) }))}
                  className="text-xs text-primary-700 hover:underline">Pay full balance ({fmt(remaining)})</button>
              </div>
            )}
          </div>

          <div>
            <label className="label">Payment Method <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'cash', label: 'Cash', emoji: '💵' },
                { id: 'gcash', label: 'GCash', emoji: '💙' },
                { id: 'maya', label: 'Maya', emoji: '💚' },
                { id: 'palawan_pay', label: 'Palawan Pay', emoji: '🧡' },
              ].map(m => (
                <button key={m.id} type="button"
                  onClick={() => setForm(f => ({ ...f, payment_method: m.id }))}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition ${
                    form.payment_method === m.id ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <span>{m.emoji}</span> {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700">
            ✅ This payment will be recorded as <strong>Verified</strong> immediately.
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-gold flex-1 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AllPayments() {
  const [payments, setPayments] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [showRecord, setShowRecord] = useState(false)

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
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <div className="badge-yellow px-3 py-1.5 text-sm font-medium">
                {pendingCount} pending
              </div>
            )}
            <button onClick={() => setShowRecord(true)} className="btn-primary flex items-center gap-2 text-sm">
              <PlusCircle size={16} /> Record Payment
            </button>
          </div>
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

      {showRecord && <RecordPaymentModal onClose={() => setShowRecord(false)} onSuccess={load} />}
    </Layout>
  )
}
