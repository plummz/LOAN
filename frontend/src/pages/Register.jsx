import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-500 text-white text-3xl font-bold mb-3 shadow-lg">₱</div>
          <h1 className="text-3xl font-bold text-white">LoanApp PH</h1>
          <p className="text-primary-200 mt-1">Create your account</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">New Account</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Full Name <span className="text-red-500">*</span></label>
              <input name="name" className="input" placeholder="Juan dela Cruz"
                value={form.name} onChange={handle} required />
            </div>
            <div>
              <label className="label">Email Address <span className="text-red-500">*</span></label>
              <input name="email" type="email" className="input" placeholder="you@example.com"
                value={form.email} onChange={handle} required />
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
            <div>
              <label className="label">Phone Number</label>
              <input name="phone" className="input" placeholder="09XXXXXXXXX"
                value={form.phone} onChange={handle} />
            </div>
            <div>
              <label className="label">Address</label>
              <input name="address" className="input" placeholder="City, Province"
                value={form.address} onChange={handle} />
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-700 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
