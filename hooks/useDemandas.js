import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

/**
 * Query keys factory for demandas
 */
export const demandasKeys = {
  all: ['demandas'],
  lists: () => [...demandasKeys.all, 'list'],
  list: (filters) => [...demandasKeys.lists(), filters],
  subregionais: () => [...demandasKeys.all, 'subregionais'],
  unidades: (subregional) => [...demandasKeys.all, 'unidades', subregional],
  disciplinas: () => [...demandasKeys.all, 'disciplinas'],
  mobilidade: (params) => [...demandasKeys.all, 'mobilidade', params],
  candidatos: (params) => [...demandasKeys.all, 'candidatos', params],
  horarios: (params) => [...demandasKeys.all, 'horarios', params],
  atribuicoes: (id) => [...demandasKeys.all, 'atribuicoes', id],
  tags: () => [...demandasKeys.all, 'tags'],
}

/**
 * Hook for fetching open demands list (consolidated by materia+unidade)
 *
 * @param {Object} filters - { subregional, unidade, cod_materia, tag, limit, offset }
 * @param {Object} options - React Query options override
 */
export function useDemandas(filters = {}, options = {}) {
  return useQuery({
    queryKey: demandasKeys.list(filters),
    queryFn: async () => {
      const params = {}
      if (filters.subregional) params.subregional = filters.subregional
      if (filters.unidade) params.unidade = filters.unidade
      if (filters.cod_materia) params.cod_materia = filters.cod_materia
      if (filters.tag) params.tag = filters.tag
      if (filters.limit !== undefined) params.limit = filters.limit
      if (filters.offset !== undefined) params.offset = filters.offset

      const res = await api.get('/demandas', { params })
      if (res.data?.success === false) throw new Error(res.data.error || 'Erro ao buscar demandas')
      return {
        demandas: res.data.data || [],
        total: res.data.pagination?.total ?? 0,
        pagination: res.data.pagination,
      }
    },
    enabled: typeof window !== 'undefined' && options.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook for updating demand metadata (tags, observação)
 */
export function useUpdateDemandaMetadata() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ cod_materia, id_unidade, tags, observacao }) => {
      const payload = {}
      if (tags !== undefined) payload.tags = tags
      if (observacao !== undefined) payload.observacao = observacao
      const res = await api.patch(`/demandas/${cod_materia}/${id_unidade}/metadata`, payload)
      if (res.data?.success === false) throw new Error(res.data.error || 'Erro ao atualizar metadata')
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: demandasKeys.lists() })
    },
  })
}

/**
 * Hook for fetching subregionais with open demands (empresa=1 only)
 */
export function useDemandasSubregionais(options = {}) {
  return useQuery({
    queryKey: demandasKeys.subregionais(),
    queryFn: async () => {
      const res = await api.get('/demandas/subregionais')
      if (res.data?.success === false) throw new Error(res.data.error || 'Erro ao buscar subregionais')
      return res.data.data || []
    },
    enabled: typeof window !== 'undefined' && options.enabled !== false,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook for fetching unidades with open demands (empresa=1 only)
 *
 * @param {number|null} subregional - Optional subregional filter
 */
export function useDemandasUnidades(subregional, options = {}) {
  return useQuery({
    queryKey: demandasKeys.unidades(subregional),
    queryFn: async () => {
      const params = {}
      if (subregional) params.subregional = subregional
      const res = await api.get('/demandas/unidades', { params })
      if (res.data?.success === false) throw new Error(res.data.error || 'Erro ao buscar unidades')
      return res.data.data || []
    },
    enabled: typeof window !== 'undefined' && options.enabled !== false,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook for fetching distinct disciplines (for filter dropdown)
 */
export function useDisciplinas(options = {}) {
  return useQuery({
    queryKey: demandasKeys.disciplinas(),
    queryFn: async () => {
      const res = await api.get('/demandas/disciplinas')
      if (res.data?.success === false) throw new Error(res.data.error || 'Erro ao buscar disciplinas')
      return res.data.data || []
    },
    enabled: typeof window !== 'undefined' && options.enabled !== false,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook for fetching schedule slots for a demand's turmas
 *
 * @param {Object} params - { id_unidade, cod_materia }
 * @param {Object} options - React Query options override
 */
export function useDemandaHorarios(params, options = {}) {
  return useQuery({
    queryKey: demandasKeys.horarios(params),
    queryFn: async () => {
      const res = await api.get('/demandas/horarios', { params })
      if (res.data?.success === false) throw new Error(res.data.error || 'Erro ao buscar horarios')
      return res.data.data || []
    },
    enabled: !!(params?.id_unidade && params?.cod_materia) && (options.enabled !== false),
    staleTime: 10 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook for fetching internal mobility candidates
 *
 * @param {Object} params - { cod_materia, id_unidade, id_subregional, turno (optional) }
 * @param {Object} options - React Query options override
 */
export function useMobilidadeInterna(params, options = {}) {
  return useQuery({
    queryKey: demandasKeys.mobilidade(params),
    queryFn: async () => {
      const res = await api.get('/demandas/mobilidade-interna', { params })
      if (res.data?.success === false) throw new Error(res.data.error || 'Erro ao buscar mobilidade')
      return res.data.data || []
    },
    enabled: !!(params?.cod_materia && params?.id_unidade && params?.id_subregional)
              && (options.enabled !== false),
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook for fetching active atribuicoes for an employee (CPF-deduped)
 *
 * @param {number|null} idColaborador - Any id_colaborador for the person
 * @param {Object} options - React Query options override
 */
export function useColaboradorAtribuicoes(idColaborador, options = {}) {
  return useQuery({
    queryKey: demandasKeys.atribuicoes(idColaborador),
    queryFn: async () => {
      const res = await api.get(`/demandas/colaborador/${idColaborador}/atribuicoes`)
      if (res.data?.success === false) throw new Error(res.data.error || 'Erro ao buscar atribuicoes')
      return res.data.data || { colaboradores: [], atribuicoes: [] }
    },
    enabled: !!idColaborador && (options.enabled !== false),
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook for fetching selection process candidates
 *
 * @param {Object} params - { cod_materia, nome_materia, id_subregional, limit, offset }
 * @param {Object} options - React Query options override
 */
export function useCandidatosDemanda(params, options = {}) {
  return useQuery({
    queryKey: demandasKeys.candidatos(params),
    queryFn: async () => {
      const res = await api.get('/demandas/candidatos', { params })
      if (res.data?.success === false) throw new Error(res.data.error || 'Erro ao buscar candidatos')
      return res.data.data || []
    },
    enabled: !!(params?.cod_materia && params?.nome_materia && params?.id_subregional)
              && (options.enabled !== false),
    staleTime: 3 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook for fetching unique tags used across demandas
 */
export function useDemandaTags(options = {}) {
  return useQuery({
    queryKey: demandasKeys.tags(),
    queryFn: async () => {
      const res = await api.get('/demandas/tags')
      if (res.data?.success === false) throw new Error(res.data.error || 'Erro ao buscar tags')
      return res.data.data || []
    },
    enabled: typeof window !== 'undefined' && options.enabled !== false,
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}
