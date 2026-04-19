import axios from 'axios'

// Base da API: prioriza NEXT_PUBLIC_BACKEND_URL (já incluindo /api/v1)
// Caso não exista, usa NEXT_PUBLIC_API_URL adicionando /api/v1
// Fallback local: http://localhost:4000/api/v1 (alinha com backend dev PORT=4000)
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL
  || (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1` : 'http://localhost:4000/api/v1')

export { API_BASE }

export default {
  async login(email, password) {
    // try real backend (expects { email, senha })
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, senha: password })
      const token = res.data?.token
      if (token) {
        // keep previous client-side behavior: store token and set simple cookie for middleware fallback
        localStorage.setItem('token', token)
        try { if (typeof document !== 'undefined') document.cookie = `token=${token}; Path=/; SameSite=Lax` } catch(e) { /* ignore */ }
        return { token }
      }
      return null
    } catch (err) {
      // no fallback: propagate error so login fails when backend is unreachable
      throw err
    }
  },
  logout() {
    localStorage.removeItem('token')
    try {
      if (typeof document !== 'undefined') {
        document.cookie = 'token=; Path=/; Max-Age=0'
      }
    } catch (e) { /* ignore */ }
  },
  getToken() {
    if (typeof window === 'undefined') return null
    const fromLocal = localStorage.getItem('token')
    if (fromLocal) return fromLocal
    // fallback to cookie
    try {
      const m = document.cookie.match(/(^|;)\s*token=([^;]+)/)
      return m ? m[2] : null
    } catch (e) {
      return null
    }
  }

  ,
  // Decode JWT payload client-side to expose simple user info (id_usuario, role, etc.).
  // This is a convenience for the UI; it does not replace server validation.
  getUser() {
    try {
      const token = this.getToken()
      if (!token) return null
      
      // JWT: header.payload.signature
      const parts = token.split('.')
      if (parts.length < 2) return null
      
      const payload = parts[1]
      // base64url -> base64
      const b64 = payload.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (payload.length % 4)) % 4)
      const json = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8')
      const user = JSON.parse(json)
      
      // Check if token is expired
      if (user.exp && user.exp * 1000 < Date.now()) {
        this.logout()
        return null
      }
      
      return user
    } catch (e) {
      console.debug('[auth] getUser decode failed', e && e.message)
      return null
    }
  },

  // Check if user is authenticated and token is valid
  isAuthenticated() {
    const user = this.getUser()
    return user !== null
  }
}
