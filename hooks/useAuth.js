import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { useMutation } from '@tanstack/react-query'
import auth from '../lib/auth'
import api from '../lib/api'

/**
 * Hook for managing authentication state
 *
 * Integrates with the existing lib/auth.js module for token management.
 *
 * Features:
 * - Reads user from JWT token (decoded client-side)
 * - Login mutation with error handling
 * - Logout with redirect
 * - Role-based permission checks (isAdmin, isRecrutamento, isCoordenador)
 *
 * @example
 * const { user, isAuthenticated, isAdmin, login, logout } = useAuth()
 *
 * // Login
 * await login.mutateAsync({ email: 'user@example.com', password: 'secret' })
 *
 * // Check permissions
 * if (isAdmin) {
 *   // show admin features
 * }
 *
 * // Logout (redirects to /login)
 * logout()
 */
export function useAuth() {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      isRecrutamento: false,
      isCoordenador: false,
      isLoading: true,
      login: { mutateAsync: async () => { throw new Error('Cannot login on server') }, isPending: false },
      logout: () => {},
      refreshUser: () => {},
    }
  }

  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Load user from token on mount
   */
  useEffect(() => {
    const currentUser = auth.getUser()
    setUser(currentUser)
    setIsLoading(false)
  }, [])

  /**
   * Refresh user data from token
   * Useful after token refresh or when suspecting stale data
   */
  const refreshUser = useCallback(() => {
    const currentUser = auth.getUser()
    setUser(currentUser)
    return currentUser
  }, [])

  /**
   * POST /api/v1/auth/login - Authenticate user
   */
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const result = await auth.login(email, password)
      if (!result?.token) {
        throw new Error('Credenciais invalidas')
      }
      return result
    },
    onSuccess: () => {
      // Refresh user data after successful login
      const currentUser = auth.getUser()
      setUser(currentUser)
    },
  })

  /**
   * Logout and redirect to login page
   * Optionally accepts a redirect path
   */
  const logout = useCallback((redirectTo = '/login') => {
    auth.logout()
    setUser(null)
    router.replace(redirectTo)
  }, [router])

  /**
   * Validate token with backend
   * Useful for checking if token is still valid
   *
   * @returns {Promise<boolean>} - True if token is valid
   */
  const validateToken = useCallback(async () => {
    try {
      const token = auth.getToken()
      if (!token) return false

      const res = await api.post('/auth/validate', { token })
      return res.data?.ok === true
    } catch (err) {
      // Token is invalid
      return false
    }
  }, [])

  // Derived state
  const isAuthenticated = !!user
  const isAdmin = user?.role === 'admin'
  const isRecrutamento = user?.role === 'recrutamento' || isAdmin
  const isCoordenador = user?.role === 'coordenador'

  return {
    // User state
    user,
    isAuthenticated,
    isLoading,

    // Role checks
    isAdmin,
    isRecrutamento, // Includes admin (admin has recrutamento permissions)
    isCoordenador,

    // Actions
    login: loginMutation,
    logout,
    refreshUser,
    validateToken,
  }
}

/**
 * Hook that redirects to login if user is not authenticated
 *
 * @example
 * // In a protected page component
 * useRequireAuth()
 * // User will be redirected to /login if not authenticated
 */
export function useRequireAuth() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, isLoading, router])

  return { isAuthenticated, isLoading }
}

/**
 * Hook that redirects if user doesn't have required role
 *
 * @param {string|string[]} requiredRole - Role(s) required to access
 * @param {string} redirectTo - Path to redirect if unauthorized
 *
 * @example
 * // Require admin role
 * useRequireRole('admin')
 *
 * // Require admin OR recrutamento
 * useRequireRole(['admin', 'recrutamento'])
 */
export function useRequireRole(requiredRole, redirectTo = '/dashboard') {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    const hasRole = roles.includes(user?.role)

    // Special case: admin has access to everything
    if (!hasRole && user?.role !== 'admin') {
      router.replace(redirectTo)
    }
  }, [user, isLoading, isAuthenticated, requiredRole, redirectTo, router])

  return { user, isLoading }
}

export default useAuth
