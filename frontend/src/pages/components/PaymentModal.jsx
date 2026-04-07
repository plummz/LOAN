import { useState } from 'react'
import { X, Loader2, CheckCircle, Copy } from 'lucide-react'
import { paymentsAPI } from '../../api'

const METHODS = [
  {
    id: 'gcash',
    name: 'GCash',
    color: 'bg-blue-600',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    bgLight: 'bg-blue-50',
    logo: '💙',
    number: '0917-123-4567',
    accountName: 'LoanApp PH Official',
    instructions: [
      'Open your GCash app',
      'Tap "Send Money" → "GCash"',
      'Enter the number and amount below',
      'Use the Reference Number as your note/message',
      'Take a screenshot and keep the receipt',
    ],
  },
  {
    id: 'maya',
    name: 'Maya',
    color: 'bg-green-600',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    bgLight: 'bg-green-50',
    logo: '💚',
    number: '0998-765-4321',
    accountName: 'LoanApp PH Official',
    instructions: [
      'Open your Maya app',
      'Tap "Send Money"',
      'Enter the number and amount below',
      'Use the Reference Number in the notes field',
      'Save your transaction receipt',
    ],
  },
  {
    id: 'palawan_pay',
    name: 'Palawan Pay',
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-200',
    bgLight: 'bg-orange-50',
    logo: '🧡',
    number: 'LOANAPP-001',
    accountName: 'LoanApp PH Collections',
    instructions: [
      'Visit any Palawan Express branch near you',
      'Fill out a Palawan Pay remittance form',
      'Use the Reference Number as the control number',
      'Pay the amount plus service fee at the counter',
      'Keep your official receipt',
    ],
  },
]

export default function PaymentModal({ loan, onClose, onSuccess }) {
  const [step, setStep] = useState(1) // 1=choose method, 2=instructions, 3=confirm
  const [method, setMethod] = useState(null)
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const fmt = n => '₱' + (n / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })

  const selectMethod = m => { setMethod(m); setStep(2) }

  const generateRef = () => {
    const ts = Date.now()
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `LOANAPP-${method.id.toUpperCase().replace('_', '')}-${ts}-${rand}`
  }

  const proceedToConfirm = () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.'); return
    }
    const cents = Math.round(parseFloat(amount) * 100)
    if (cents > loan.amount - (loan.total_paid || 0)) {
      setError('Amount exceeds remaining balance.'); return
    }
    setError('')
    setReference(generateRef())
    setStep(3)
  }

  const submitPayment = async () => {
    setLoading(true)
    setError('')
    try {
      const cents = Math.round(parseFloat(amount) * 100)
      await paymentsAPI.create({
        loan_id: loan.id,
        amount: cents,
        payment_method: method.id,
      })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Payment submission failed.')
    } finally {
      setLoading(false)
    }
  }

  const copy = text => navigator.clipboard?.writeText(text)

  const remaining = loan.amount - (loan.total_paid || 0)

  if (done) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
        <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Submitted!</h2>
        <p className="text-gray-500 text-sm mb-2">Your payment is pending verification by our team. You'll be notified once it's confirmed.</p>
        <p className="text-xs text-gray-400 mb-6 font-mono">{reference}</p>
        <button onClick={() => { onSuccess?.(); onClose() }} className="btn-primary w-full">Done</button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Make a Payment</h2>
            <p className="text-xs text-gray-400">Remaining: {fmt(remaining)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6">
          {/* Step 1: Choose method */}
          {step === 1 && (
            <div>
              <p className="text-sm text-gray-500 mb-4">Select your payment method:</p>
              <div className="space-y-3">
                {METHODS.map(m => (
                  <button key={m.id} onClick={() => selectMethod(m)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:shadow-md transition-all ${m.borderColor} ${m.bgLight}`}>
                    <span className="text-2xl">{m.logo}</span>
                    <div className="text-left">
                      <div className={`font-semibold ${m.textColor}`}>{m.name}</div>
                      <div className="text-xs text-gray-400">Mobile/App Payment</div>
                    </div>
                    <div className="ml-auto text-gray-300">›</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Amount + instructions */}
          {step === 2 && method && (
            <div>
              <div className={`flex items-center gap-2 mb-4 p-3 rounded-lg ${method.bgLight}`}>
                <span className="text-xl">{method.logo}</span>
                <span className={`font-semibold ${method.textColor}`}>{method.name}</span>
              </div>

              <div className="mb-4">
                <label className="label">Payment Amount (₱)</label>
                <input type="number" className="input" placeholder="0.00"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  min="1" max={remaining / 100} step="0.01" />
                <p className="text-xs text-gray-400 mt-1">
                  Max: {fmt(remaining)} (remaining balance)
                </p>
              </div>

              <div className={`p-3 rounded-lg ${method.bgLight} border ${method.borderColor} mb-4`}>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Send to:</div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Number</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-mono font-semibold">{method.number}</span>
                    <button onClick={() => copy(method.number)} className="text-gray-400 hover:text-gray-600"><Copy size={12} /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Account Name</span>
                  <span className="text-sm font-semibold">{method.accountName}</span>
                </div>
              </div>

              {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                <button onClick={proceedToConfirm} className="btn-primary flex-1">Continue</button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm + instructions */}
          {step === 3 && method && (
            <div>
              <div className={`p-4 rounded-xl border ${method.borderColor} ${method.bgLight} mb-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{method.logo}</span>
                  <span className={`font-bold ${method.textColor}`}>{method.name}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-bold text-gray-800">{fmt(Math.round(parseFloat(amount) * 100))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Send to</span>
                    <span className="font-semibold">{method.number}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Reference #</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border">{reference}</span>
                      <button onClick={() => copy(reference)} className="text-gray-400 hover:text-gray-600"><Copy size={12} /></button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Instructions:</p>
                <ol className="space-y-1">
                  {method.instructions.map((step, i) => (
                    <li key={i} className="text-xs text-gray-600 flex gap-2">
                      <span className="font-bold text-gray-400">{i + 1}.</span> {step}
                    </li>
                  ))}
                </ol>
              </div>

              {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

              <p className="text-xs text-gray-400 mb-4">
                By clicking Submit, you confirm that you have sent the payment. An admin will verify your payment shortly.
              </p>

              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
                <button onClick={submitPayment} disabled={loading}
                  className="btn-gold flex-1 flex items-center justify-center gap-2">
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {loading ? 'Submitting…' : 'Submit Payment'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
