import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [reseeding, setReseeding] = useState(false)
  const [reseedMsg, setReseedMsg] = useState('')

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      navigate(user.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const reseedDb = async () => {
    setReseeding(true)
    setReseedMsg('')
    try {
      const res = await fetch('/api/admin/reseed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'jrm-reset-2026' })
      })
      const data = await res.json()
      if (res.ok) {
        setReseedMsg('✅ Done! Login with johnreymarquillero@gmail.com / rusty062498')
      } else {
        setReseedMsg('❌ ' + (data.error || 'Failed'))
      }
    } catch (e) {
      setReseedMsg('❌ Could not reach server.')
    } finally {
      setReseeding(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-500 text-white text-3xl font-bold mb-3 shadow-lg">₱</div>
          <h1 className="text-3xl font-bold text-white">LoanApp PH</h1>
          <p className="text-primary-200 mt-1">Fast. Easy. Reliable.</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Welcome back</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input name="email" type="email" className="input" placeholder="you@example.com"
                value={form.email} onChange={handle} required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input name="password" type={showPass ? 'text' : 'password'} className="input pr-10"
                  placeholder="••••••••" value={form.password} onChange={handle} required />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-700 font-medium hover:underline">Register here</Link>
          </p>
        </div>

        {/* First-time setup */}
        <div className="mt-4 p-4 bg-white/10 rounded-xl text-center">
          <p className="text-primary-200 text-xs mb-2">First time setup? Reset the database with your admin account.</p>
          {reseedMsg ? (
            <p className="text-sm font-medium text-white">{reseedMsg}</p>
          ) : (
            <button onClick={reseedDb} disabled={reseeding}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-gold-500 hover:bg-gold-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
              {reseeding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {reseeding ? 'Resetting…' : 'Reset & Setup Database'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
