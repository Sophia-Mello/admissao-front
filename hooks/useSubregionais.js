import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

/**
 * Query keys factory for subregionais and unidades
 */
export const subregionalKeys = {
  all: ['subregionais'],
  lists: () => [...subregionalKeys.all, 'list'],
  list: () => [...subregionalKeys.lists()],
  unidades: (id_subregional) => [...subregionalKeys.all, id_subregional, 'unidades'],
}

/**
 * Hook for fetching all subregionais
 *
 * Requires authentication with admin or recrutamento role.
 *
 * @example
 * const { subregionais, isLoading, error } = useSubregionais()
 *
 * // subregionais: [
 * //   { id_subregional: 1, nome_subregional: "Sul" },
 * //   { id_subregional: 2, nome_subregional: "Norte" }
 * // ]
 */
export function useSubregionais() {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      subregionais: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    }
  }

  /**
   * GET /api/v1/admin/subregional - List all subregionais
   */
  const query = useQuery({
    queryKey: subregionalKeys.list(),
    queryFn: async () => {
      const res = await api.get('/admin/subregional')
      // API returns { success: true, data: [...] }
      return res.data?.data || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - subregionais rarely change
    gcTime: 30 * 60 * 1000,
  })

  return {
    subregionais: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Hook for fetching unidades (units) of a specific subregional
 *
 * Requires authentication with admin or recrutamento role.
 *
 * @param {number|string} id_subregional - Subregional ID
 *
 * @example
 * const { unidades, isLoading, error } = useUnidades(3)
 *
 * // unidades: [
 * //   {
 * //     id_unidade: 5,
 * //     nome_unidade: "Escola ABC",
 * //     email_unidade_agendador: "escola.abc@tomeducacao.com.br",
 * //     cidade: "Sao Paulo",
 * //     uf: "SP"
 * //   }
 * // ]
 */
export function useUnidades(id_subregional) {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      unidades: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    }
  }

  /**
   * GET /api/v1/admin/subregional/:id/unidades - List units of a subregional
   */
  const query = useQuery({
    queryKey: subregionalKeys.unidades(id_subregional),
    queryFn: async () => {
      const res = await api.get(`/admin/subregional/${id_subregional}/unidades`)
      // API returns { success: true, data: [...] }
      return res.data?.data || []
    },
    enabled: !!id_subregional, // Only fetch when id_subregional is provided
    staleTime: 10 * 60 * 1000, // 10 minutes - units rarely change
    gcTime: 30 * 60 * 1000,
  })

  return {
    unidades: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Hook for fetching all unidades (units) without subregional filter
 *
 * Uses the GET /api/v1/unidade endpoint.
 *
 * @example
 * const { unidades, isLoading } = useAllUnidades()
 */
export function useAllUnidades() {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      unidades: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    }
  }

  /**
   * GET /api/v1/unidade - List all units
   * Behavior depends on user role:
   * - Admin: Returns all units
   * - Coordenador: Returns only assigned unit
   */
  const query = useQuery({
    queryKey: ['unidades', 'all'],
    queryFn: async () => {
      const res = await api.get('/unidade')
      // API returns array directly: [...]
      return Array.isArray(res.data) ? res.data : (res.data?.data || [])
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  return {
    unidades: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

export default useSubregionais
