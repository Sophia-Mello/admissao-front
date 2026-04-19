import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { availabilityKeys } from './useAvailability'

/**
 * Query keys factory for schedule blocks
 */
export const scheduleBlockKeys = {
  all: ['scheduleBlocks'],
  byUnidade: (id_unidade) => ['scheduleBlocks', id_unidade],
  byId: (id_block) => ['scheduleBlocks', 'detail', id_block],
}

/**
 * Hook para listar bloqueios de schedule de uma unidade
 *
 * @param {number} id_unidade - ID da unidade
 * @param {object} filters - Filtros opcionais { active: boolean }
 * @param {object} options - Opcoes adicionais do React Query
 * @returns {object} - { data: [], isLoading, isError, error, refetch }
 *
 * @example
 * const { data: blocks, isLoading } = useScheduleBlocks(5)
 * // blocks = [{ id_block, blocked_start_at, blocked_end_at, ... }, ...]
 *
 * // Filtrar apenas bloqueios ativos:
 * const { data } = useScheduleBlocks(5, { active: true })
 */
export function useScheduleBlocks(id_unidade, filters = {}, options = {}) {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    }
  }

  return useQuery({
    queryKey: [...scheduleBlockKeys.byUnidade(id_unidade), filters],
    queryFn: async () => {
      const params = {}

      if (id_unidade !== null && id_unidade !== undefined) {
        params.id_unidade = id_unidade
      }

      if (filters.active !== undefined) {
        params.active = filters.active
      }

      const res = await api.get('/schedule-block', { params })

      // API retorna: { success, data: [...] }
      return res.data?.data || []
    },
    enabled: !!id_unidade,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook para criar um novo bloqueio de schedule
 *
 * @param {number} id_unidade - ID da unidade (para invalidacao de cache)
 * @returns {object} - React Query mutation object
 *
 * @example
 * const { mutateAsync, isLoading } = useCreateScheduleBlock(5)
 *
 * await mutateAsync({
 *   id_unidade: 5,
 *   blocked_start_at: '08:00',
 *   blocked_end_at: '12:00',
 *   block_from: '2025-01-20',
 *   block_until: '2025-01-22',
 *   reason: 'Ferias do coordenador',
 * })
 */
export function useCreateScheduleBlock(id_unidade) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/schedule-block', data)
      return res.data
    },
    onSuccess: () => {
      // Invalidar availability da unidade afetada
      queryClient.invalidateQueries({ queryKey: availabilityKeys.byUnidade(id_unidade) })

      // Invalidar lista de bloqueios
      queryClient.invalidateQueries({ queryKey: scheduleBlockKeys.byUnidade(id_unidade) })
      queryClient.invalidateQueries({ queryKey: scheduleBlockKeys.all })
    },
  })
}

/**
 * Hook para atualizar um bloqueio de schedule
 *
 * @param {number} id_unidade - ID da unidade (para invalidacao de cache)
 * @returns {object} - React Query mutation object
 *
 * @example
 * const { mutateAsync } = useUpdateScheduleBlock(5)
 *
 * await mutateAsync({
 *   id: 123,
 *   payload: {
 *     blocked_start_at: '09:00',
 *     blocked_end_at: '11:00',
 *     reason: 'Motivo atualizado',
 *   },
 * })
 */
export function useUpdateScheduleBlock(id_unidade) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.patch(`/schedule-block/${id}`, payload)
      return res.data
    },
    onSuccess: (data, variables) => {
      // Invalidar availability da unidade afetada
      queryClient.invalidateQueries({ queryKey: availabilityKeys.byUnidade(id_unidade) })

      // Invalidar lista de bloqueios
      queryClient.invalidateQueries({ queryKey: scheduleBlockKeys.byUnidade(id_unidade) })
      queryClient.invalidateQueries({ queryKey: scheduleBlockKeys.byId(variables.id) })
      queryClient.invalidateQueries({ queryKey: scheduleBlockKeys.all })
    },
  })
}

/**
 * Hook para deletar (desativar) um bloqueio de schedule
 *
 * @param {number} id_unidade - ID da unidade (para invalidacao de cache)
 * @returns {object} - React Query mutation object
 *
 * @example
 * const { mutateAsync } = useDeleteScheduleBlock(5)
 * await mutateAsync(123) // Deleta bloqueio com id_block = 123
 */
export function useDeleteScheduleBlock(id_unidade) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id_block) => {
      const res = await api.delete(`/schedule-block/${id_block}`)
      return res.data
    },
    onSuccess: (data, id_block) => {
      // Invalidar availability da unidade afetada
      queryClient.invalidateQueries({ queryKey: availabilityKeys.byUnidade(id_unidade) })

      // Invalidar lista de bloqueios
      queryClient.invalidateQueries({ queryKey: scheduleBlockKeys.byUnidade(id_unidade) })
      queryClient.invalidateQueries({ queryKey: scheduleBlockKeys.byId(id_block) })
      queryClient.invalidateQueries({ queryKey: scheduleBlockKeys.all })
    },
  })
}

/**
 * Hook para liberar (release) um bloqueio de schedule via POST /schedule-block/release
 *
 * Usa a nova rota POST que trata melhor a exclusao de bloqueios no backend.
 *
 * @param {number} id_unidade - ID da unidade (para invalidacao de cache)
 * @returns {object} - React Query mutation object
 *
 * @example
 * const { mutateAsync } = useReleaseBlock(5)
 * await mutateAsync({
 *   id_unidade: 5,
 *   date_start: '2025-01-20',
 *   date_end: '2025-01-20',
 *   time_start: '08:00',
 *   time_end: '08:40',
 * })
 */
export function useReleaseBlock(id_unidade) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      // payload: { id_unidade, date_start, date_end, time_start, time_end }
      const res = await api.post('/schedule-block/release', payload)
      return res.data
    },
    onSuccess: () => {
      // Invalidar availability da unidade afetada
      queryClient.invalidateQueries({ queryKey: availabilityKeys.byUnidade(id_unidade) })

      // Invalidar lista de bloqueios
      queryClient.invalidateQueries({ queryKey: scheduleBlockKeys.byUnidade(id_unidade) })
      queryClient.invalidateQueries({ queryKey: scheduleBlockKeys.all })
    },
  })
}

export default useScheduleBlocks
