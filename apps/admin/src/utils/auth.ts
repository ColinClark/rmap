/**
 * Authentication utilities for admin portal
 */

interface TokenPayload {
  adminId: string
  email: string
  role: string
  permissions: string[]
  type: string
  iat: number
  exp: number
}

export class AuthUtils {
  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string | null): boolean {
    if (!token) return true

    try {
      // Decode token payload (base64)
      const parts = token.split('.')
      if (parts.length !== 3) return true

      const payload = JSON.parse(atob(parts[1])) as TokenPayload

      // Check expiration
      const now = Date.now() / 1000
      return payload.exp < now
    } catch (error) {
      console.error('Error checking token expiration:', error)
      return true
    }
  }

  /**
   * Get token from localStorage and validate it
   */
  static getValidToken(): string | null {
    const token = localStorage.getItem('adminToken')

    if (!token) {
      return null
    }

    if (this.isTokenExpired(token)) {
      // Clear invalid token
      this.clearAuth()
      return null
    }

    return token
  }

  /**
   * Clear authentication data and redirect to login
   */
  static clearAuth() {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')

    // Only redirect if not already on login page
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login'
    }
  }

  /**
   * Setup API interceptor for handling auth errors
   */
  static async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getValidToken()

    if (!token && !url.includes('/auth/login')) {
      // No valid token and not logging in - redirect to login
      this.clearAuth()
      throw new Error('Authentication required')
    }

    // Add auth header if we have a token
    const headers = {
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` })
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    // Handle auth errors
    if (response.status === 401 || response.status === 403) {
      // Token expired or invalid
      this.clearAuth()
      throw new Error('Session expired. Please login again.')
    }

    return response
  }

  /**
   * Decode token to get user info
   */
  static getUserFromToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null

      return JSON.parse(atob(parts[1])) as TokenPayload
    } catch (error) {
      console.error('Error decoding token:', error)
      return null
    }
  }

  /**
   * Check if user has permission
   */
  static hasPermission(permission: string): boolean {
    const token = this.getValidToken()
    if (!token) return false

    const user = this.getUserFromToken(token)
    if (!user) return false

    return user.role === 'super_admin' || user.permissions.includes(permission)
  }
}

export default AuthUtils