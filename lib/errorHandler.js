/**
 * Error handling utilities for API errors
 *
 * Provides consistent error messages for timeout, network, and other API errors
 */

/**
 * Get user-friendly error message from API error
 * @param {Error} error - Axios error object
 * @returns {string} - User-friendly error message
 */
export function getErrorMessage(error) {
  // Use custom message from interceptor if available
  if (error?.userMessage) {
    return error.userMessage;
  }

  // Timeout errors
  if (error?.isTimeout || error?.code === 'ECONNABORTED') {
    return 'O servidor demorou muito para responder. Verifique sua conexão e tente novamente.';
  }

  // Network errors (backend unreachable)
  if (error?.isNetworkError || error?.code === 'ERR_NETWORK' || !error?.response) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
  }

  // HTTP error responses with custom messages
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // Generic HTTP errors
  const status = error?.response?.status;
  switch (status) {
    case 400:
      return 'Requisição inválida. Verifique os dados e tente novamente.';
    case 401:
      return 'Sessão expirada. Faça login novamente.';
    case 403:
      return 'Você não tem permissão para realizar esta ação.';
    case 404:
      return 'Recurso não encontrado.';
    case 409:
      return 'Conflito ao processar a requisição.';
    case 500:
      return 'Erro interno do servidor. Tente novamente mais tarde.';
    case 503:
      return 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.';
    default:
      return 'Ocorreu um erro inesperado. Tente novamente.';
  }
}

/**
 * Check if error is a timeout
 * @param {Error} error - Axios error object
 * @returns {boolean}
 */
export function isTimeoutError(error) {
  return error?.isTimeout || error?.code === 'ECONNABORTED' || error?.message?.includes('timeout');
}

/**
 * Check if error is a network error
 * @param {Error} error - Axios error object
 * @returns {boolean}
 */
export function isNetworkError(error) {
  return error?.isNetworkError || error?.code === 'ERR_NETWORK' || !error?.response;
}

/**
 * Get error type for analytics/logging
 * @param {Error} error - Axios error object
 * @returns {string} - Error type: 'timeout', 'network', 'http', 'unknown'
 */
export function getErrorType(error) {
  if (isTimeoutError(error)) return 'timeout';
  if (isNetworkError(error)) return 'network';
  if (error?.response?.status) return 'http';
  return 'unknown';
}
