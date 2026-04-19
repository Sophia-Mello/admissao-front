import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import api from '../lib/api'
import { applicationsKeys } from './useApplications'

// Query keys factory for email templates
export const emailTemplatesKeys = {
  all: ['emailTemplates'],
  lists: () => [...emailTemplatesKeys.all, 'list'],
  details: () => [...emailTemplatesKeys.all, 'detail'],
  detail: (id) => [...emailTemplatesKeys.details(), id],
}

/**
 * Hook to fetch list of email templates from Gupy
 *
 * @param {Object} options - React Query options
 * @returns {Object} React Query result with array of email templates
 */
export function useEmailTemplates(options = {}) {
  return useQuery({
    queryKey: emailTemplatesKeys.lists(),
    queryFn: async () => {
      const res = await api.get('/applications/email-templates')

      // Handle API error responses
      if (res.data?.success === false) {
        console.error('[useEmailTemplates] Failed to fetch templates:', res.data.error || res.data.message)
        throw new Error(res.data.error || 'Não foi possível carregar os templates de email da Gupy')
      }

      // Handle invalid response format
      if (!Array.isArray(res.data?.data)) {
        console.error('[useEmailTemplates] Invalid response format:', { response: res.data })
        throw new Error('Formato de resposta inválido ao carregar templates')
      }

      return res.data.data
    },
    // SSR Guard: only enable on client side
    enabled: typeof window !== 'undefined' && options.enabled !== false,
    staleTime: 10 * 60 * 1000, // 10 minutes (templates don't change often)
    gcTime: 30 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook to fetch a single email template by ID from Gupy
 *
 * @param {number|string} id - Template ID to fetch
 * @param {Object} options - React Query options
 * @returns {Object} React Query result with template data (name, subject, etc.)
 */
export function useEmailTemplate(id, options = {}) {
  return useQuery({
    queryKey: emailTemplatesKeys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/applications/email-templates/${id}`)

      // Handle API error responses
      if (res.data?.success === false) {
        console.error('[useEmailTemplate] Failed to fetch template:', { id, error: res.data.error || res.data.message })
        throw new Error(res.data.error || res.data.message || 'Erro ao carregar template de email')
      }

      // Handle missing data
      if (!res.data?.data) {
        console.error('[useEmailTemplate] Template data missing:', { id })
        throw new Error('Template de email não encontrado')
      }

      return res.data.data
    },
    // SSR Guard: only enable on client side
    enabled: typeof window !== 'undefined' && !!id && options.enabled !== false,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook to send email to multiple applications
 *
 * @returns {Object} Mutation object with mutate/mutateAsync functions
 *   - mutate/mutateAsync: Function accepting { applicationIds: number[], templateId: number }
 *   - isPending, isError, error: Standard mutation state
 *
 * Side effects:
 *   - On success, invalidates all applications queries to refresh data
 */
export function useSendEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ applicationIds, templateId, templateName }) => {
      const res = await api.post('/applications/send-email', {
        applicationIds,
        templateId,
        templateName,
      })

      // Validate API response - don't assume success on 200 status
      if (res.data?.success === false) {
        throw new Error(res.data.error || res.data.message || 'Erro ao enviar emails')
      }

      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationsKeys.all })
    },
    onError: (error) => {
      console.error('[useSendEmail] Failed to send emails:', {
        error: error.message,
        response: error.response?.data,
      })

      const status = error.response?.status
      const retryAfter = error.response?.data?.retryAfter

      // Rate limit error
      if (status === 429) {
        message.error({
          content: `Sistema sobrecarregado! Os emails NÃO foram enviados. Aguarde ${retryAfter || 60} segundos e tente novamente.`,
          duration: 10,
          key: 'email-rate-limit-error',
        })
        return
      }

      // Network error
      if (!error.response) {
        message.error({
          content: 'ERRO DE CONEXÃO: Não foi possível enviar os emails. Verifique sua internet.',
          duration: 8,
          key: 'email-network-error',
        })
        return
      }

      // Other errors
      const errorMsg = error.response?.data?.error || error.message || 'Erro ao enviar emails'
      message.error(errorMsg)
    },
  })
}
