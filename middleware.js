import { NextResponse } from 'next/server'

// Routes that require authentication (R&S Admissao only)
const protectedPaths = ['/dashboard', '/admin', '/usuarios']

// Cache simples para tokens válidos (evita validação excessiva)
const tokenCache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

function isTokenCached(token) {
  const cached = tokenCache.get(token)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.valid
  }
  return null
}

function cacheToken(token, valid) {
  tokenCache.set(token, { valid, timestamp: Date.now() })
}

async function validateToken(token, req) {
  // Verificar cache primeiro
  const cached = isTokenCached(token)
  if (cached !== null) {
    return cached
  }

  try {
    // When middleware runs server-side (inside the frontend container) it must call the
    // backend using the internal network address. Prefer `INTERNAL_API_URL` which can be
    // injected by the Docker Compose environment. For browser requests the built frontend
    // still uses NEXT_PUBLIC_API_URL (usually http://localhost:4000).
    // Prefer an explicit INTERNAL_API_URL if provided; otherwise prefer the internal
    // docker service name (http://backend:4000) so middleware running inside the
    // frontend container can reach the backend. Only fall back to the public
    // NEXT_PUBLIC_API_URL (usually http://localhost:4000) as a last resort.
    const apiUrl =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL
    const res = await fetch(`${apiUrl}/api/v1/auth/validate`, { 
      method: 'POST', 
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      // Adicionar timeout para evitar travamento
      signal: AbortSignal.timeout(3000)
    })
    const valid = res.ok
    cacheToken(token, valid)
    return valid
  } catch (e) {
    // Em caso de erro de rede, assumir token válido se existe (evitar logout desnecessário)
    console.warn('Token validation failed, assuming valid:', e.message)
    cacheToken(token, true)
    return true
  }
}

export async function middleware(req) {
  const { pathname } = req.nextUrl
  // If a token was passed as a query param (login redirect), set a cookie so
  // subsequent server-side validations will see it.
  const tokenFromQuery = req.nextUrl.searchParams.get('token') || null
  const token = tokenFromQuery || req.cookies.get('token')?.value || null

  // raiz: se autenticado -> /dashboard, senão -> /login
  if (pathname === '/') {
    if (token) return NextResponse.redirect(new URL('/dashboard', req.url))
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // proteger paths específicos - versão simplificada
  if (protectedPaths.some(p => pathname.startsWith(p))) {
    if (!token) return NextResponse.redirect(new URL('/login', req.url))
    // Se tem token, permitir acesso (validação será feita no frontend)
    return NextResponse.next()
  }

  // If token was present in query param and we are here, set cookie and redirect
  // to the same URL without the token param so UI remains clean.
  if (tokenFromQuery) {
    // remove token param from redirect URL
    const u = new URL(req.url)
    u.searchParams.delete('token')
    const res = NextResponse.redirect(u)
    res.cookies.set('token', tokenFromQuery, { path: '/', sameSite: 'lax' })
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/admin/:path*', '/usuarios/:path*', '/exames-ocupacionais/:path*']
}
