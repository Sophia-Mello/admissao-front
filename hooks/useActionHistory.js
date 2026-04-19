import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

const POLL_INTERVAL = 3000 // 3 segundos

// SSR guard helper
const isServer = typeof window === 'undefined'

/**
 * Hook para listar histórico de ações.
 */
export function useActionHistory({ page = 1, limit = 20, actionType, status } = {}) {
  return useQuery({
    enabled: !isServer,
    queryKey: ['actionHistory', { page, limit, actionType, status }],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('page', page)
      params.append('limit', limit)
      if (actionType) params.append('actionType', actionType)
      if (status) params.append('status', status)

      const response = await api.get(`/admin/actions?${params}`)
      return response.data
    },
    staleTime: 10000,
  })
}

/**
 * Hook para buscar detalhes de uma ação específica.
 * Faz polling enquanto status for 'processing'.
 */
export function useActionDetails(actionId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['actionDetails', actionId],
    queryFn: async () => {
      const response = await api.get(`/admin/actions/${actionId}`)
      return response.data.data
    },
    enabled: !isServer && enabled && !!actionId,
    refetchInterval: (query) => {
      return query.state.data?.status === 'processing' ? POLL_INTERVAL : false
    },
  })
}

/**
 * Hook para desfazer uma ação.
 */
export function useUndoAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (actionId) => {
      const response = await api.post(`/admin/actions/${actionId}/undo`)
      return response.data
    },
    onSuccess: (_data, actionId) => {
      queryClient.invalidateQueries({ queryKey: ['actionHistory'] })
      queryClient.invalidateQueries({ queryKey: ['actionDetails', actionId] })
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}

/**
 * Hook para verificar se uma ação pode ser desfeita.
 *
 * @param {string} [actionId] - ID da ação (opcional se actionData for fornecido)
 * @param {Object} [actionData] - Dados da ação já carregados (evita N+1 query)
 */
export function useCanUndo(actionId, actionData = null) {
  // Only fetch if actionData not provided and actionId exists
  const { data: fetchedAction, error, isLoading } = useActionDetails(actionId, {
    enabled: !!actionId && !actionData,
  })

  const action = actionData || fetchedAction

  // Handle loading state (only when fetching, not when actionData provided)
  if (!actionData && isLoading) return { canUndo: false, reason: 'Carregando...', isLoading: true }

  // Handle error state (only when fetching)
  if (!actionData && error) return { canUndo: false, reason: 'Erro ao verificar', hasError: true }

  if (!action) return { canUndo: false, reason: 'Dados não disponíveis' }

  const undoableTypes = ['move', 'reprove']
  if (!undoableTypes.includes(action.action_type)) {
    return { canUndo: false, reason: 'Apenas ações de mover ou reprovar podem ser desfeitas' }
  }

  // Allow 'available' or 'failed' (for retry), block 'processing', 'completed', etc.
  if (action.undo_status !== 'available' && action.undo_status !== 'failed') {
    const statusLabels = { processing: 'Em processamento', completed: 'Já desfeito' }
    return { canUndo: false, reason: statusLabels[action.undo_status] || `Status: ${action.undo_status}` }
  }
  if (new Date(action.undo_expires_at) < new Date()) return { canUndo: false, reason: 'Prazo expirado' }

  return { canUndo: true, action }
}

/**
 * Função helper para calcular canUndo sem hook (para uso em listas).
 * Evita N+1 queries quando já temos os dados da ação.
 *
 * @param {Object} action - Dados da ação
 * @returns {{ canUndo: boolean, reason?: string }}
 */
export function calculateCanUndo(action) {
  if (!action) return { canUndo: false, reason: 'Dados não disponíveis' }

  const undoableTypes = ['move', 'reprove']
  if (!undoableTypes.includes(action.action_type)) {
    return { canUndo: false, reason: 'Apenas ações de mover ou reprovar podem ser desfeitas' }
  }

  // Allow 'available' or 'failed' (for retry), block 'processing', 'completed', etc.
  if (action.undo_status !== 'available' && action.undo_status !== 'failed') {
    const statusLabels = { processing: 'Em processamento', completed: 'Já desfeito' }
    return { canUndo: false, reason: statusLabels[action.undo_status] || `Status: ${action.undo_status}` }
  }
  if (new Date(action.undo_expires_at) < new Date()) return { canUndo: false, reason: 'Prazo expirado' }

  return { canUndo: true }
}
