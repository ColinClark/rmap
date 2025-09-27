import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading, admin } = useAuth()

  console.log('ProtectedRoute - token:', token ? 'exists' : 'none', 'isLoading:', isLoading, 'admin:', admin)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!token) {
    console.log('No token, redirecting to login')
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}