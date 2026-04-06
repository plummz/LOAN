import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loansAPI } from '../api'
import Layout from './components/Layout'
import PaymentModal from './components/PaymentModal'

export default function PaymentPage() {
  const { loanId } = useParams()
  const navigate = useNavigate()
  const [loan, setLoan] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loansAPI.get(loanId)
      .then(r => setLoan(r.data.loan))
      .catch(() => navigate('/my-loans'))
      .finally(() => setLoading(false))
  }, [loanId])

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-800 rounded-full" /></div></Layout>
  if (!loan) return null

  return (
    <Layout>
      <PaymentModal
        loan={loan}
        onClose={() => navigate(`/loans/${loanId}`)}
        onSuccess={() => navigate(`/loans/${loanId}`)}
      />
    </Layout>
  )
}
