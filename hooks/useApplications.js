import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import api from '../lib/api'

// Query keys factory for applications
export const applicationsKeys = {
  all: ['applications'],
  lists: () => [...applicationsKeys.all, 'list'],
  list: (filters) => [...applicationsKeys.lists(), filters],
  details: () => [...applicationsKeys.all, 'detail'],
  detail: (id) => [...applicationsKeys.details(), id],
  tags: () => [...applicationsKeys.all, 'tags'],
  commonSteps: (ids) => [...applicationsKeys.all, 'commonSteps', ids],
  actionStatus: (actionId) => [...applicationsKeys.all, 'action', actionId],
}

/**
 * Hook to fetch list of applications with optional filters
 *
 * @param {Object} filters - Optional filters
 * @param {string} [filters.include] - Include related data ('candidate')
 * @param {string} [filters.template] - Filter by template name
 * @param {number} [filters.subregional] - Filter by subregional ID
 * @param {string} [filters.step] - Filter by step name
 * @param {string} [filters.stepStatus] - Filter by step status
 * @param {string} [filters.statusApplication] - Filter by application status
 * @param {string} [filters.statusAulaTeste] - Filter by aula teste status ('pendente')
 * @param {string} [filters.statusProva] - Filter by prova status ('pendente', 'agendado', 'compareceu', 'faltou')
 * @param {string} [filters.search] - Search by CPF or name
 * @param {number} [filters.limit] - Max results (1-100, default: 50)
 * @param {number} [filters.offset] - Pagination offset
 * @param {Object} options - React Query options
 * @returns {Object} React Query result with applications, total, limit, offset
 */
export function useApplications(filters = {}, options = {}) {
  return useQuery({
    queryKey: applicationsKeys.list(filters),
    queryFn: async () => {
      const params = {}

      if (filters.include) params.include = filters.include
      if (filters.template) params.template = filters.template
      if (filters.subregional) params.subregional = filters.subregional
      if (filters.step) params.step = filters.step
      if (filters.stepStatus) params.stepStatus = filters.stepStatus
      if (filters.statusApplication) params.statusApplication = filters.statusApplication
      if (filters.statusAulaTeste) params.statusAulaTeste = filters.statusAulaTeste
      if (filters.statusProva) params.statusProva = filters.statusProva
      if (filters.tag) params.tag = filters.tag
      if (filters.search) params.search = filters.search
      if (filters.cvSearch) params.cvSearch = filters.cvSearch
      if (filters.limit !== undefined) params.limit = filters.limit
      if (filters.offset !== undefined) params.offset = filters.offset

      const res = await api.get('/applications', { params })

      // Handle API error responses
      if (res.data?.success === false) {
        console.error('[useApplications] API returned error:', res.data.error || res.data.message)
        throw new Error(res.data.error || res.data.message || 'Erro ao carregar candidaturas')
      }

      // Handle unexpected response format
      if (!Array.isArray(res.data?.data)) {
        console.error('[useApplications] Invalid response format:', { dataType: typeof res.data?.data })
        throw new Error('Formato de resposta inválido do servidor')
      }

      // Support both old flat format and new pagination object format
      const pagination = res.data.pagination || {}
      return {
        applications: res.data.data,
        total: pagination.total ?? res.data.total ?? res.data.data.length,
        limit: pagination.limit ?? res.data.limit ?? 50,
        offset: pagination.offset ?? res.data.offset ?? 0,
      }
    },
    // SSR Guard: only enable on client side
    enabled: typeof window !== 'undefined' && options.enabled !== false,
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter due to sync)
    gcTime: 5 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook to fetch a single application by ID
 *
 * @param {number|string} id - Application ID to fetch
 * @param {Object} options - React Query options
 * @returns {Object} React Query result with application data including candidate info
 */
export function useApplication(id, options = {}) {
  return useQuery({
    queryKey: applicationsKeys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/applications/${id}?include=candidate`)

      // Handle API error responses
      if (res.data?.success === false) {
        console.error('[useApplication] API returned error:', { id, error: res.data.error || res.data.message })
        throw new Error(res.data.error || res.data.message || 'Erro ao carregar candidatura')
      }

      // Handle missing data
      if (!res.data?.data) {
        console.error('[useApplication] Application data missing:', { id })
        throw new Error('Candidatura não encontrada')
      }

      return res.data.data
    },
    // SSR Guard: only enable on client side
    enabled: typeof window !== 'undefined' && !!id && options.enabled !== false,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook to sync applications with Gupy
 *
 * @returns {Object} React Query mutation object
 *   - mutate/mutateAsync: Function accepting optional {template, subregional} filters
 *   - isPending, isError, error: Standard mutation state
 *
 * Side effects:
 *   - On success, invalidates all applications queries to refresh data
 */
export function useSyncApplications() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (filters = {}) => {
      const params = new URLSearchParams()
      if (filters.template) params.append('template', filters.template)
      if (filters.subregional) params.append('subregional', filters.subregional)

      // Sync can take longer - use 2 minute timeout
      const res = await api.post(`/applications/sync?${params.toString()}`, null, {
        timeout: 120000, // 2 minutes for sync operations
      })

      // Validate API response - don't assume success on 200 status
      if (res.data?.success === false) {
        throw new Error(res.data.error || res.data.message || 'Erro durante sincronização')
      }

      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationsKeys.all })
    },
    onError: (error) => {
      console.error('[useSyncApplications] Sync failed:', {
        error: error.message,
        response: error.response?.data,
      })

      const status = error.response?.status
      const retryAfter = error.response?.data?.retryAfter

      // Rate limit error
      if (status === 429) {
        message.error({
          content: `Sistema sobrecarregado! A sincronização NÃO foi concluída. Aguarde ${retryAfter || 60} segundos e tente novamente.`,
          duration: 10,
          key: 'sync-rate-limit-error',
        })
        return
      }

      // Network error
      if (!error.response) {
        message.error({
          content: 'ERRO DE CONEXÃO: Não foi possível sincronizar. Verifique sua internet.',
          duration: 8,
          key: 'sync-network-error',
        })
        return
      }

      // Other errors
      const errorMsg = error.response?.data?.error || error.message || 'Erro ao sincronizar com Gupy'
      message.error(errorMsg)
    },
  })
}

/**
 * Fetch all application IDs matching filters (for "Select All" functionality)
 *
 * @param {Object} filters - Filter parameters
 * @param {string} [filters.template] - Filter by template name
 * @param {number} [filters.subregional] - Filter by subregional ID
 * @param {string} [filters.step] - Filter by step name
 * @param {string} [filters.stepStatus] - Filter by step status
 * @param {string} [filters.statusApplication] - Filter by application status
 * @param {string} [filters.statusAulaTeste] - Filter by aula teste status ('pendente')
 * @param {string} [filters.statusProva] - Filter by prova status ('pendente', 'agendado', 'compareceu', 'faltou')
 * @param {string} [filters.search] - Search by CPF or name
 * @returns {Promise<number[]>} Array of application IDs
 */
export async function fetchAllApplicationIds(filters = {}) {
  const params = {}

  if (filters.template) params.template = filters.template
  if (filters.subregional) params.subregional = filters.subregional
  if (filters.step) params.step = filters.step
  if (filters.stepStatus) params.stepStatus = filters.stepStatus
  if (filters.statusApplication) params.statusApplication = filters.statusApplication
  if (filters.statusAulaTeste) params.statusAulaTeste = filters.statusAulaTeste
  if (filters.statusProva) params.statusProva = filters.statusProva
  if (filters.tag) params.tag = filters.tag
  if (filters.search) params.search = filters.search
  if (filters.cvSearch) params.cvSearch = filters.cvSearch

  const res = await api.get('/applications/ids', { params })

  // Handle API error responses
  if (res.data?.success === false) {
    console.error('[fetchAllApplicationIds] API returned error:', res.data.error || res.data.message)
    throw new Error(res.data.error || 'Erro ao buscar IDs')
  }

  // Validate response format - don't silently return empty array
  if (!Array.isArray(res.data?.data)) {
    console.error('[fetchAllApplicationIds] Invalid response format:', {
      expectedType: 'array',
      actualType: typeof res.data?.data,
      responseData: res.data,
    })
    throw new Error('Formato de resposta inválido ao buscar IDs de candidaturas')
  }

  return res.data.data
}

/**
 * Hook to fetch available application tags for filter dropdown
 *
 * @param {Object} options - React Query options
 * @returns {Object} React Query result with tags array [{name, count}]
 */
export function useApplicationTags(options = {}) {
  return useQuery({
    queryKey: applicationsKeys.tags(),
    queryFn: async () => {
      const res = await api.get('/applications/tags')

      if (res.data?.success === false) {
        console.error('[useApplicationTags] API returned error:', res.data.error)
        throw new Error(res.data.error || 'Erro ao carregar tags')
      }

      // Validate response format - don't silently return empty array
      if (!Array.isArray(res.data?.tags)) {
        console.error('[useApplicationTags] Invalid response format:', {
          expectedType: 'array',
          actualType: typeof res.data?.tags,
        })
        throw new Error('Formato de resposta inválido ao carregar tags')
      }

      return res.data.tags
    },
    // SSR Guard: only enable on client side
    enabled: typeof window !== 'undefined' && options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes - tags don't change often
    gcTime: 10 * 60 * 1000,
    ...options,
  })
}

// ============================================================================
// BULK ACTIONS
// ============================================================================

/**
 * Hook to fetch common steps across selected applications.
 * Used by BulkMoveModal to show only valid step options.
 *
 * @param {number[]} applicationIds - Array of application IDs
 * @param {Object} options - React Query options
 * @returns {Object} React Query result with common steps [{name, count}]
 */
export function useCommonSteps(applicationIds = [], options = {}) {
  return useQuery({
    queryKey: applicationsKeys.commonSteps(applicationIds),
    queryFn: async () => {
      if (!applicationIds || applicationIds.length === 0) {
        return []
      }

      const res = await api.get('/applications/common-steps', {
        params: { applicationIds: applicationIds.join(',') },
      })

      if (res.data?.success === false) {
        console.error('[useCommonSteps] API returned error:', res.data.error)
        throw new Error(res.data.error || 'Erro ao buscar etapas comuns')
      }

      return res.data.data || []
    },
    enabled:
      typeof window !== 'undefined' &&
      applicationIds.length > 0 &&
      options.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  })
}

/**
 * Hook to poll action status for async bulk operations.
 *
 * @param {string} actionId - UUID of the action
 * @param {Object} options - React Query options
 * @returns {Object} React Query result with action status
 */
export function useActionStatus(actionId, options = {}) {
  return useQuery({
    queryKey: applicationsKeys.actionStatus(actionId),
    queryFn: async () => {
      const res = await api.get(`/applications/actions/${actionId}/status`)

      if (res.data?.success === false) {
        console.error('[useActionStatus] API returned error:', res.data.error)
        throw new Error(res.data.error || 'Erro ao buscar status da ação')
      }

      return res.data.data
    },
    enabled:
      typeof window !== 'undefined' && !!actionId && options.enabled !== false,
    refetchInterval: (query) => {
      // Stop polling when action reaches a terminal state
      const status = query.state.data?.status
      if (['completed', 'partial', 'failed'].includes(status)) return false
      return 1000 // Poll every 1 second while running
    },
    ...options,
  })
}

/**
 * Hook to send bulk emails
 *
 * @returns {Object} React Query mutation object
 */
export function useBulkEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ applicationIds, templateId, templateName }) => {
      const res = await api.post('/applications/send-email', {
        applicationIds: Array.from(applicationIds),
        templateId,
        templateName, // Pass template name for action history display
      })

      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Erro ao enviar emails')
      }

      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationsKeys.all })
    },
    onError: (error) => {
      console.error('[useBulkEmail] Failed:', error.message)
      message.error(error.response?.data?.error || error.message || 'Erro ao enviar emails')
    },
  })
}

/**
 * Hook to add/remove tags in bulk
 *
 * @returns {Object} React Query mutation object
 */
export function useBulkTags() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ applicationIds, tagName, action }) => {
      const res = await api.post('/applications/actions/bulk-tags', {
        applicationIds: Array.from(applicationIds),
        tagName,
        action, // 'add' or 'remove'
      })

      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Erro ao atualizar tags')
      }

      return res.data
    },
    // NOTE: Don't invalidate here - let the modal handle it after completion
    // This prevents infinite loops when useActionStatus is also using applicationsKeys
    onError: (error) => {
      console.error('[useBulkTags] Failed:', error.message)
      message.error(error.response?.data?.error || error.message || 'Erro ao atualizar tags')
    },
  })
}

/**
 * Hook to move applications in bulk
 *
 * @returns {Object} React Query mutation object
 */
export function useBulkMove() {
  return useMutation({
    mutationFn: async ({ applicationIds, targetStepName, applyToSameTemplate = false }) => {
      const res = await api.post('/applications/actions/bulk-move', {
        applicationIds: Array.from(applicationIds),
        targetStepName,
        applyToSameTemplate,
      })

      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Erro ao mover candidaturas')
      }

      return res.data
    },
    // NOTE: Don't invalidate here - let the modal handle it after completion
    // This prevents infinite loops when useActionStatus is also using applicationsKeys
    onError: (error) => {
      console.error('[useBulkMove] Failed:', error.message)
      message.error(error.response?.data?.error || error.message || 'Erro ao mover candidaturas')
    },
  })
}

/**
 * Hook to reprove applications in bulk
 *
 * @returns {Object} React Query mutation object
 */
export function useBulkReprove() {
  return useMutation({
    mutationFn: async ({ applicationIds, reason, notes = '', applyToSameTemplate = false }) => {
      const res = await api.post('/applications/actions/bulk-reprove', {
        applicationIds: Array.from(applicationIds),
        reason,
        notes,
        applyToSameTemplate,
      })

      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Erro ao reprovar candidaturas')
      }

      return res.data
    },
    // NOTE: Don't invalidate here - let the modal handle it after completion
    // This prevents infinite loops when useActionStatus is also using applicationsKeys
    onError: (error) => {
      console.error('[useBulkReprove] Failed:', error.message)
      message.error(error.response?.data?.error || error.message || 'Erro ao reprovar candidaturas')
    },
  })
}
