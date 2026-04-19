import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

// Query keys factory for job steps
export const jobStepsKeys = {
  all: ['jobSteps'],
  byTemplate: (template) => [...jobStepsKeys.all, template || 'all'],
}

/**
 * Hook to fetch job steps (etapas)
 *
 * - Com template: busca etapas do job na Gupy
 * - Sem template: busca todas etapas únicas das applications existentes
 *
 * @param {string} [template] - Template name to fetch steps for (opcional)
 * @param {Object} options - React Query options
 * @returns {Object} React Query result where data contains array of step objects { id, name, type? }
 */
export function useJobSteps(template, options = {}) {
  // Note: Hook must be called unconditionally (React Rules of Hooks)
  // SSR safety is handled via the `enabled` option below
  return useQuery({
    queryKey: jobStepsKeys.byTemplate(template),
    queryFn: async () => {
      const params = template ? { template } : {}
      const res = await api.get('/applications/job-steps', { params })

      // Handle API error responses
      if (res.data?.success === false) {
        console.error('[useJobSteps] API returned error:', res.data.error || res.data.message)
        throw new Error(res.data.error || res.data.message || 'Erro ao carregar etapas')
      }

      // Handle invalid response format
      if (!Array.isArray(res.data?.data)) {
        console.error('[useJobSteps] Invalid response format:', { response: res.data })
        throw new Error('Formato de resposta inválido ao carregar etapas')
      }

      return res.data.data
    },
    // SSR Guard: disable query on server (window undefined) to prevent hydration issues
    // Agora sempre habilitado (com ou sem template)
    enabled: typeof window !== 'undefined' && options.enabled !== false,
    staleTime: 10 * 60 * 1000, // 10 minutes (steps don't change often)
    gcTime: 30 * 60 * 1000,
    ...options,
  })
}
