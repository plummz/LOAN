import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import LoanApplication from './pages/LoanApplication'
import MyLoans from './pages/MyLoans'
import LoanDetail from './pages/LoanDetail'
import PaymentPage from './pages/PaymentPage'

import AdminDashboard from './pages/admin/AdminDashboard'
import UsersRegistry from './pages/admin/UsersRegistry'
import LoanInventory from './pages/admin/LoanInventory'
import InterestRecords from './pages/admin/InterestRecords'
import AllPayments from './pages/admin/AllPayments'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-primary-900">
      <div className="text-center">
        <div className="text-4xl mb-4 text-gold-500 font-bold">₱</div>
        <div className="text-white text-lg animate-pulse">Loading LoanApp PH...</div>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Borrower */}
          <Route path="/dashboard"    element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/apply"        element={<PrivateRoute><LoanApplication /></PrivateRoute>} />
          <Route path="/my-loans"     element={<PrivateRoute><MyLoans /></PrivateRoute>} />
          <Route path="/loans/:id"    element={<PrivateRoute><LoanDetail /></PrivateRoute>} />
          <Route path="/pay/:loanId"  element={<PrivateRoute><PaymentPage /></PrivateRoute>} />

          {/* Admin */}
          <Route path="/admin"                element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/users"          element={<PrivateRoute adminOnly><UsersRegistry /></PrivateRoute>} />
          <Route path="/admin/inventory"      element={<PrivateRoute adminOnly><LoanInventory /></PrivateRoute>} />
          <Route path="/admin/interest"       element={<PrivateRoute adminOnly><InterestRecords /></PrivateRoute>} />
          <Route path="/admin/payments"       element={<PrivateRoute adminOnly><AllPayments /></PrivateRoute>} />
          <Route path="/admin/loans/:id"      element={<PrivateRoute adminOnly><LoanDetail /></PrivateRoute>} />

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
