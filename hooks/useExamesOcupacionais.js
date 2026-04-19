import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as exameService from '../lib/services/exameOcupacionalService';

// Query keys factory for exames ocupacionais
export const exameKeys = {
  all: ['exames-ocupacionais'],
  lists: () => [...exameKeys.all, 'list'],
  list: (filters) => [...exameKeys.lists(), filters],
  byStatus: (status, filters) => [...exameKeys.lists(), 'status', status, filters],
  summary: () => [...exameKeys.all, 'summary'],
  cargos: () => [...exameKeys.all, 'cargos'],
  details: () => [...exameKeys.all, 'detail'],
  detail: (id) => [...exameKeys.details(), id],
};

/**
 * Hook to fetch list of candidates with filters
 *
 * @param {Object} filters - Query filters
 * @param {string} [filters.status] - Comma-separated status filter
 * @param {string} [filters.search] - Search by name or CPF
 * @param {string} [filters.cargo] - Filter by cargo (partial match)
 * @param {number} [filters.limit=100] - Max results
 * @param {number} [filters.offset=0] - Offset for pagination
 * @param {Object} options - React Query options
 * @returns {Object} React Query result - Each candidate includes `dias_no_status`
 */
export function useCandidatos(filters = {}, options = {}) {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    };
  }

  return useQuery({
    queryKey: exameKeys.list(filters),
    queryFn: async () => {
      const result = await exameService.getCandidatos(filters);
      return {
        candidatos: result.data || [],
        pagination: result.pagination || { limit: 100, offset: 0, total: 0 },
      };
    },
    staleTime: 30 * 1000, // 30 seconds (kanban updates frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Hook to fetch list of candidates with infinite scroll pagination
 *
 * @param {Object} filters - Query filters
 * @param {string} [filters.status] - Comma-separated status filter
 * @param {string} [filters.search] - Search by name or CPF
 * @param {string} [filters.cargo] - Filter by cargo (partial match)
 * @param {number} [filters.empresa] - Filter by empresa (1 = Tom, 2 = APG)
 * @param {Object} options - React Query options
 * @returns {Object} React Query infinite result with pages of candidates
 */
export function useCandidatosInfinite(filters = {}, options = {}) {
  const PAGE_SIZE = 15;

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      fetchNextPage: async () => {},
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: async () => {},
    };
  }

  return useInfiniteQuery({
    queryKey: [...exameKeys.list(filters), 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await exameService.getCandidatos({
        ...filters,
        limit: PAGE_SIZE,
        offset: pageParam,
      });
      return {
        candidatos: result.data || [],
        pagination: result.pagination || { limit: PAGE_SIZE, offset: pageParam, total: 0 },
      };
    },
    getNextPageParam: (lastPage) => {
      const { offset, total } = lastPage.pagination;
      const nextOffset = offset + PAGE_SIZE;
      // Return undefined if we've loaded all items
      if (nextOffset >= total) return undefined;
      return nextOffset;
    },
    initialPageParam: 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch candidates for a specific status with infinite scroll
 * Used for per-column pagination in Kanban board
 *
 * @param {string} status - The status to filter by (e.g., 'pendente', 'agendado')
 * @param {Object} filters - Additional query filters
 * @param {string} [filters.search] - Search by name or CPF
 * @param {string} [filters.cargo] - Filter by cargo (partial match)
 * @param {number} [filters.empresa] - Filter by empresa (1 = Tom, 2 = APG)
 * @param {Object} options - React Query options
 * @returns {Object} React Query infinite result with pages of candidates for this status
 */
export function useCandidatosByStatus(status, filters = {}, options = {}) {
  const PAGE_SIZE = 15;

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      fetchNextPage: async () => {},
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: async () => {},
    };
  }

  return useInfiniteQuery({
    queryKey: exameKeys.byStatus(status, filters),
    queryFn: async ({ pageParam = 0 }) => {
      const result = await exameService.getCandidatos({
        ...filters,
        status, // Filter by single status
        limit: PAGE_SIZE,
        offset: pageParam,
      });
      return {
        candidatos: result.data || [],
        pagination: result.pagination || { limit: PAGE_SIZE, offset: pageParam, total: 0 },
      };
    },
    getNextPageParam: (lastPage) => {
      const { offset, total } = lastPage.pagination;
      const nextOffset = offset + PAGE_SIZE;
      if (nextOffset >= total) return undefined;
      return nextOffset;
    },
    initialPageParam: 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch summary counts by status
 * Accepts optional filters to reflect the filtered state of the UI
 *
 * @param {Object} filters - Query filters (empresa, cargo, search)
 * @param {Object} options - React Query options
 * @returns {Object} React Query result with summary data
 */
export function useSummary(filters = {}, options = {}) {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    };
  }

  return useQuery({
    queryKey: [...exameKeys.summary(), filters],
    queryFn: async () => {
      const result = await exameService.getSummary(filters);
      return result.data;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch distinct cargos for filter dropdown
 *
 * @param {Object} options - React Query options
 * @returns {Object} React Query result with cargos array
 */
export function useCargos(options = {}) {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    };
  }

  return useQuery({
    queryKey: exameKeys.cargos(),
    queryFn: async () => {
      const result = await exameService.getCargos();
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (cargos don't change often)
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

/**
 * Hook to fetch a single candidate by ID
 *
 * @param {number} id - Candidate ID
 * @param {Object} options - React Query options
 * @returns {Object} React Query result
 */
export function useCandidato(id, options = {}) {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    };
  }

  return useQuery({
    queryKey: exameKeys.detail(id),
    queryFn: async () => {
      const result = await exameService.getCandidatoById(id);
      return result.data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to update candidate status
 *
 * @returns {Object} Mutation object
 *
 * @example
 * const { mutateAsync: updateStatus, isLoading } = useUpdateStatus();
 *
 * // Move to agendado (requires date)
 * await updateStatus({
 *   id: 123,
 *   status: 'agendado',
 *   agendado_para: '2025-01-20T14:00:00-03:00'
 * });
 *
 * // Move to aprovado
 * await updateStatus({ id: 123, status: 'aprovado' });
 */
export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, agendado_para, observacoes }) => {
      const result = await exameService.updateStatus(id, {
        status,
        agendado_para,
        observacoes,
      });
      return result;
    },
    onSuccess: () => {
      // Invalidate list and summary to refetch
      queryClient.invalidateQueries({ queryKey: exameKeys.all });
    },
  });
}

/**
 * Hook to import candidates batch
 *
 * @returns {Object} Mutation object
 *
 * @example
 * const { mutateAsync: importCandidatos, isLoading } = useImportCandidatos();
 *
 * const result = await importCandidatos([
 *   { nome: 'João', cpf: '12345678901', jobId: 'job_1', applicationId: 'app_1' },
 *   { nome: 'Maria', cpf: '98765432100', jobId: 'job_2', applicationId: 'app_2' }
 * ]);
 * // result: { importados: 2, duplicados: 0, erros: [] }
 */
export function useImportCandidatos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (candidatos) => {
      const result = await exameService.importCandidatos(candidatos);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exameKeys.all });
    },
  });
}

/**
 * Hook to delete (soft) a candidate
 *
 * @returns {Object} Mutation object
 */
export function useDeleteCandidato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const result = await exameService.deleteCandidato(id);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exameKeys.all });
    },
  });
}

/**
 * Hook to export candidates to CSV
 *
 * @returns {Object} Mutation object
 */
export function useExportCsv() {
  return useMutation({
    mutationFn: async (params = {}) => {
      await exameService.downloadExport(params);
    },
  });
}

// Re-export constants
export {
  KANBAN_STATUSES,
  STATUS_GROUPS,
  EMPRESAS,
  getEmpresaLabel,
  getEmpresaColor,
} from '../lib/services/exameOcupacionalService';
