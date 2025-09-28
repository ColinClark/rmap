import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { PlatformAdmin } from '@rmap/types'
import AuthUtils from '../utils/auth'

interface AuthContextType {
  admin: PlatformAdmin | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored token on mount and validate it
    const storedToken = AuthUtils.getValidToken()
    const storedAdmin = localStorage.getItem('adminInfo')

    if (storedToken && storedAdmin) {
      setToken(storedToken)
      try {
        setAdmin(JSON.parse(storedAdmin))
      } catch (e) {
        console.error('Failed to parse admin info:', e)
        localStorage.removeItem('adminInfo')
        // Clear auth if admin info is corrupted
        AuthUtils.clearAuth()
      }
    } else if (!storedToken && storedAdmin) {
      // Token expired or invalid, clear everything
      console.log('Token expired or invalid, clearing auth')
      AuthUtils.clearAuth()
    }

    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const response = await fetch('http://localhost:4000/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Login failed')
    }

    setToken(data.token)
    setAdmin(data.admin)

    localStorage.setItem('adminToken', data.token)
    localStorage.setItem('adminInfo', JSON.stringify(data.admin))
  }

  const logout = () => {
    setToken(null)
    setAdmin(null)
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminInfo')
  }

  return (
    <AuthContext.Provider value={{ admin, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}