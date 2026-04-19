import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

/**
 * Query keys factory for availability
 */
export const availabilityKeys = {
  all: ['availability'],
  byUnidade: (id_unidade) => ['availability', id_unidade],
  byUnidadeAndWeek: (id_unidade, weekStart) => ['availability', id_unidade, weekStart],
}

/**
 * Hook para buscar disponibilidade de slots de agendamento
 *
 * @param {number} id_unidade - ID da unidade
 * @param {number} page - Numero da pagina (semana) - opcional, default 1
 * @param {object} options - Opcoes adicionais do React Query
 * @returns {object} - { data: { config, pagination, slots }, isLoading, isError, error, refetch }
 *
 * @example
 * const { data, isLoading, error } = useAvailability(5, 1)
 * // data.config - configuracao do schedule (slot_size, morning_start, etc.)
 * // data.pagination - { currentPage, totalPages, week_start, week_end }
 * // data.slots - array de slots disponiveis
 */
export function useAvailability(id_unidade, page = null, options = {}) {
  // SSR Guard - Return safe stubs on server
  if (typeof window === 'undefined') {
    return {
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    }
  }

  return useQuery({
    queryKey: availabilityKeys.byUnidadeAndWeek(id_unidade, page),
    queryFn: async () => {
      const params = {
        id_unidade,
      }

      // API usa 'page' para paginacao semanal (integer >= 1)
      if (page) {
        params.page = page
      }

      const res = await api.get('/availability', { params })

      // API retorna: { success, config, pagination, slots }
      const responseData = res.data

      return {
        config: responseData.config || {},
        pagination: responseData.pagination || {},
        slots: responseData.slots || [],
      }
    },
    enabled: !!id_unidade,
    staleTime: 2 * 60 * 1000, // 2 minutos - availability muda frequentemente
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true, // Refetch ao voltar para a aba
    ...options,
  })
}

/**
 * Hook para prefetch de availability (util para navegacao de semanas)
 *
 * @returns {function} - Funcao para prefetch
 *
 * @example
 * const prefetchAvailability = usePrefetchAvailability()
 * prefetchAvailability(5, 2) // Prefetch pagina 2
 */
export function usePrefetchAvailability() {
  const queryClient = useQueryClient()

  return async (id_unidade, page) => {
    await queryClient.prefetchQuery({
      queryKey: availabilityKeys.byUnidadeAndWeek(id_unidade, page),
      queryFn: async () => {
        const params = { id_unidade }
        if (page) {
          params.page = page
        }
        const res = await api.get('/availability', { params })
        const responseData = res.data
        return {
          config: responseData.config || {},
          pagination: responseData.pagination || {},
          slots: responseData.slots || [],
        }
      },
      staleTime: 2 * 60 * 1000,
    })
  }
}

export default useAvailability
