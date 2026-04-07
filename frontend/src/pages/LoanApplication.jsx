import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loansAPI } from '../api'
import Layout from './components/Layout'
import { Loader2, CheckCircle, Info } from 'lucide-react'

const PURPOSES = [
  'Small Business Capital', 'Home Renovation', 'Educational Expenses',
  'Medical Emergency', 'Vehicle Repair', 'Debt Consolidation',
  'Agricultural Needs', 'Personal Emergency', 'Other',
]

const fmt = n => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 })

export default function LoanApplication() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ amount: '', purpose: '', term_months: '12', interest_rate: '3' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const amountPesos = parseFloat(form.amount) || 0
  const amountCents = Math.round(amountPesos * 100)
  const months = parseInt(form.term_months) || 1
  const rate = parseFloat(form.interest_rate) || 3
  const monthlyRate = rate / 100
  const monthlyPayment = amountCents > 0
    ? Math.ceil((amountCents * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1))
    : 0
  const totalPayment = monthlyPayment * months
  const totalInterest = totalPayment - amountCents

  const submit = async e => {
    e.preventDefault()
    if (amountCents < 100000) { setError('Minimum loan amount is ₱1,000.'); return }
    if (amountCents > 50000000) { setError('Maximum loan amount is ₱500,000.'); return }
    setError('')
    setLoading(true)
    try {
      await loansAPI.apply({ amount: amountCents, purpose: form.purpose, term_months: months, interest_rate: rate })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Application failed.')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <Layout>
      <div className="max-w-lg mx-auto mt-16 text-center">
        <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Application Submitted!</h2>
        <p className="text-gray-500 mb-6">Your loan application is now under review. You'll be notified once it's processed.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/my-loans')} className="btn-primary">View My Loans</button>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary">Go to Dashboard</button>
        </div>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Apply for a Loan</h1>
          <p className="text-gray-500 text-sm mt-0.5">Fill out the form below to submit your loan application.</p>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Form */}
          <div className="md:col-span-3 card">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
            )}
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="label">Loan Amount (₱) <span className="text-red-500">*</span></label>
                <input name="amount" type="number" className="input" placeholder="e.g. 10000"
                  min="1000" max="500000" step="500" value={form.amount} onChange={handle} required />
                <p className="text-xs text-gray-400 mt-1">Min: ₱1,000 · Max: ₱500,000</p>
              </div>

              <div>
                <label className="label">Purpose <span className="text-red-500">*</span></label>
                <select name="purpose" className="input" value={form.purpose} onChange={handle} required>
                  <option value="">Select a purpose</option>
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Loan Term (months) <span className="text-red-500">*</span></label>
                <select name="term_months" className="input" value={form.term_months} onChange={handle}>
                  {[1,3,6,9,12,18,24,36,48,60].map(t => (
                    <option key={t} value={t}>{t} month{t > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Interest Rate (% per month)</label>
                <input name="interest_rate" type="number" className="input"
                  min="0.5" max="10" step="0.5" value={form.interest_rate} onChange={handle} />
                <p className="text-xs text-gray-400 mt-1">Default: 3% per month</p>
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Submitting…' : 'Submit Application'}
              </button>
            </form>
          </div>

          {/* Summary */}
          <div className="md:col-span-2 space-y-4">
            <div className="card border-primary-100 bg-primary-50">
              <div className="flex items-center gap-2 mb-3">
                <Info size={16} className="text-primary-700" />
                <h3 className="font-semibold text-primary-800 text-sm">Loan Summary</h3>
              </div>
              {amountCents > 0 ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Loan Amount</span><span className="font-semibold">{fmt(amountPesos)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Term</span><span className="font-semibold">{months} months</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Interest Rate</span><span className="font-semibold">{rate}%/mo</span></div>
                  <hr className="border-primary-200" />
                  <div className="flex justify-between"><span className="text-gray-500">Monthly Payment</span><span className="font-bold text-primary-800">{fmt(monthlyPayment / 100)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Total Interest</span><span className="font-semibold text-orange-600">{fmt(totalInterest / 100)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Total Payable</span><span className="font-bold text-gray-800">{fmt(totalPayment / 100)}</span></div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Enter an amount to see the estimate.</p>
              )}
            </div>

            <div className="card border-yellow-100 bg-yellow-50 text-sm text-yellow-800">
              <p className="font-semibold mb-1">📌 Note</p>
              <p className="text-xs text-yellow-700">Your application will be reviewed by an admin within 24-48 hours. You will be notified of the decision.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
