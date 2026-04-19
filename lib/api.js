import axios from 'axios'
import auth from './auth'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
const BACKEND = `${API_URL}/api/v1`

const api = axios.create({
  baseURL: BACKEND,
  timeout: 30000
})

// Inject auth token in requests
api.interceptors.request.use((config) => {
  try {
    const token = auth.getToken()
    if (token) {
      config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` }
    }

    // Add ngrok bypass header if using ngrok URL
    if (API_URL.includes('ngrok')) {
      config.headers = { ...(config.headers || {}), 'ngrok-skip-browser-warning': 'true' }
    }
  } catch (e) {
    console.error('Erro ao obter token:', e);
  }
  return config
}, (err) => Promise.reject(err))

// Handle response errors globally
api.interceptors.response.use((res) => res, (err) => {
  // Handle 401 Unauthorized
  if (err?.response?.status === 401) {
    // silent: client pages already redirect to /login when token missing
    console.debug('[api] 401 response')
  } else if (err?.response) {
    // Log errors with response (4xx, 5xx)
    console.error(`[api] ${err.config?.method?.toUpperCase()} ${err.config?.url} - ${err.response.status}`, {
      status: err.response.status,
      data: err.response.data,
      url: err.config?.url,
      method: err.config?.method,
    });
  } else if (err?.request) {
    // Request was made but no response received (network error, timeout, etc)
    console.error(`[api] No response from ${err.config?.method?.toUpperCase()} ${err.config?.url}`, {
      message: err.message,
      url: err.config?.url,
      method: err.config?.method,
    });
  } else {
    // Something else happened
    console.error('[api] Axios error:', err.message);
  }

  // Handle timeout errors
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    console.error('[api] Request timeout')
    err.isTimeout = true
    err.userMessage = 'O servidor demorou muito para responder. Verifique sua conexão e tente novamente.'
  }

  // Handle network errors
  if (err.code === 'ERR_NETWORK' || !err.response) {
    console.error('[api] Network error - backend may be unreachable')
    err.isNetworkError = true
    // Only set userMessage if not already set (e.g., by timeout handler)
    if (!err.userMessage) {
      err.userMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.'
    }
  }

  return Promise.reject(err)
})

export default api
