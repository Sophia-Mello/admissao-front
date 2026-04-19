import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { availabilityKeys } from './useAvailability'

/**
 * Query keys factory for schedule config
 */
export const scheduleConfigKeys = {
  all: ['scheduleConfig'],
  byUnidade: (id_unidade) => ['scheduleConfig', id_unidade],
  global: () => ['scheduleConfig', 'global'],
  list: () => ['scheduleConfig', 'list'],
}

/**
 * Hook para buscar configuracao de schedule de uma unidade
 *
 * @param {number|null} id_unidade - ID da unidade (null para config global)
 * @param {object} options - Opcoes adicionais do React Query
 * @returns {object} - { data, isLoading, isError, error, refetch }
 *
 * @example
 * const { data, isLoading } = useScheduleConfig(5)
 * // data.id_config, data.morning_start_at, data.slot_size, etc.
 *
 * // Para config global:
 * const { data } = useScheduleConfig(null)
 */
export function useScheduleConfig(id_unidade, options = {}) {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    }
  }

  const queryKey = id_unidade !== null && id_unidade !== undefined
    ? scheduleConfigKeys.byUnidade(id_unidade)
    : scheduleConfigKeys.global()

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = {}
      if (id_unidade !== null && id_unidade !== undefined) {
        params.id_unidade = id_unidade
      }

      const res = await api.get('/schedule', { params })

      // API retorna: { success, data: { id_config, ... } }
      return res.data?.data || res.data || null
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook para listar todas as configuracoes de schedule
 *
 * @param {object} options - Opcoes adicionais do React Query
 * @returns {object} - { data: [], isLoading, isError, error, refetch }
 *
 * @example
 * const { data: configs } = useScheduleConfigList()
 * // configs = [{ id_config, id_unidade, nome_unidade, ... }, ...]
 */
export function useScheduleConfigList(options = {}) {
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
    queryKey: scheduleConfigKeys.list(),
    queryFn: async () => {
      const res = await api.get('/schedule/all')
      // API retorna: { success, data: [...] }
      return res.data?.data || []
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook para criar/atualizar configuracao de schedule (upsert)
 *
 * @param {number|null} id_unidade - ID da unidade para invalidacao de cache
 * @returns {object} - React Query mutation object
 *
 * @example
 * const { mutateAsync, isLoading } = useSaveScheduleConfig(5)
 *
 * await mutateAsync({
 *   id_unidade: 5,
 *   morning_start_at: '09:00:00',
 *   morning_end_at: '11:30:00',
 *   slot_size: '00:40:00',
 * })
 */
export function useSaveScheduleConfig(id_unidade) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      const res = await api.put('/schedule', data)
      return res.data
    },
    onSuccess: () => {
      // Invalidar availability da unidade afetada
      if (id_unidade !== null && id_unidade !== undefined) {
        queryClient.invalidateQueries({ queryKey: availabilityKeys.byUnidade(id_unidade) })
        queryClient.invalidateQueries({ queryKey: scheduleConfigKeys.byUnidade(id_unidade) })
      }

      // Invalidar queries globais de schedule config
      queryClient.invalidateQueries({ queryKey: scheduleConfigKeys.all })
      queryClient.invalidateQueries({ queryKey: scheduleConfigKeys.list() })
      queryClient.invalidateQueries({ queryKey: scheduleConfigKeys.global() })
    },
  })
}

/**
 * Hook para deletar configuracao de schedule de uma unidade
 *
 * @param {number} id_unidade - ID da unidade
 * @returns {object} - React Query mutation object
 *
 * @example
 * const { mutateAsync } = useDeleteScheduleConfig(5)
 * await mutateAsync() // Deleta config da unidade 5
 */
export function useDeleteScheduleConfig(id_unidade) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/schedule/${id_unidade}`)
      return res.data
    },
    onSuccess: () => {
      // Invalidar availability da unidade afetada
      queryClient.invalidateQueries({ queryKey: availabilityKeys.byUnidade(id_unidade) })

      // Invalidar queries de schedule config
      queryClient.invalidateQueries({ queryKey: scheduleConfigKeys.byUnidade(id_unidade) })
      queryClient.invalidateQueries({ queryKey: scheduleConfigKeys.all })
      queryClient.invalidateQueries({ queryKey: scheduleConfigKeys.list() })
    },
  })
}

/**
 * Hook para buscar configuracao global de schedule (id_unidade=NULL)
 *
 * Atalho para useScheduleConfig(null)
 *
 * @param {object} options - Opcoes adicionais do React Query
 * @returns {object} - { data, isLoading, isError, error, refetch }
 *
 * @example
 * const { data: globalConfig, isLoading } = useGlobalConfig()
 * // globalConfig.morning_start_at, globalConfig.slot_duration, etc.
 */
export function useGlobalConfig(options = {}) {
  return useScheduleConfig(null, options)
}

/**
 * Hook para restaurar campos de configuracao de uma unidade para os valores globais
 *
 * Busca a config global e faz PUT apenas com os campos especificados.
 *
 * @param {number} id_unidade - ID da unidade para restaurar
 * @returns {object} - React Query mutation object
 *
 * @example
 * const { mutateAsync } = useRestoreToGlobal(5)
 *
 * // Restaurar apenas campos de vigencia:
 * await mutateAsync({ fields: ['start_day', 'end_day'] })
 *
 * // Restaurar apenas campos de antecedencia (d_rule):
 * await mutateAsync({ fields: ['d_rule_start', 'd_rule_end'] })
 *
 * // Restaurar apenas campos de horarios:
 * await mutateAsync({ fields: ['morning_start_at', 'morning_end_at', 'afternoon_start_at', 'afternoon_end_at'] })
 *
 * // Restaurar apenas duracao:
 * await mutateAsync({ fields: ['slot_duration'] })
 */
export function useRestoreToGlobal(id_unidade) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ fields }) => {
      // 1. Buscar config global
      const globalRes = await api.get('/schedule')
      const globalConfig = globalRes.data?.data || globalRes.data || {}

      // 2. Montar payload apenas com os campos especificados
      const payload = { id_unidade }
      for (const field of fields) {
        // Inclui o valor global mesmo se for null
        payload[field] = globalConfig[field] !== undefined ? globalConfig[field] : null
      }

      // 3. PUT na unidade
      const res = await api.put('/schedule', payload)
      return res.data
    },
    onSuccess: () => {
      // Invalidar availability da unidade afetada
      queryClient.invalidateQueries({ queryKey: availabilityKeys.byUnidade(id_unidade) })

      // Invalidar queries de schedule config
      queryClient.invalidateQueries({ queryKey: scheduleConfigKeys.byUnidade(id_unidade) })
      queryClient.invalidateQueries({ queryKey: scheduleConfigKeys.all })
      queryClient.invalidateQueries({ queryKey: scheduleConfigKeys.list() })
    },
  })
}

export default useScheduleConfig
