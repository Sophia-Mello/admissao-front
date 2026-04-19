import { QueryClient } from '@tanstack/react-query'

// Optimized QueryClient configuration for R&S Admissao
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache time - how long data stays in cache when not used
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)

      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false
        }
        // Retry up to 3 times for other errors
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch configuration
      refetchOnWindowFocus: false, // Disable to prevent unnecessary refetches
      refetchOnReconnect: true, // Refetch when connection is restored
      refetchOnMount: true, // Always refetch when component mounts

      // Background refetch
      refetchInterval: false, // Disable automatic polling
      refetchIntervalInBackground: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      retryDelay: 1000,
    },
  },
})

// R&S Admissao query keys
export const queryKeys = {
  // Booking management
  bookings: ['bookings'],
  availability: ['availability'],
  regionalJobs: ['regional-jobs'],
  regions: ['regions'],
  units: ['units'],
  usuarios: ['usuarios'],

  // Jobs (from useJobs hook)
  jobs: ['jobs'],
  jobsList: (filters) => ['jobs', 'list', filters],
  job: (id) => ['jobs', 'detail', id],

  // Gupy templates (from useGupyTemplates hook)
  gupyTemplates: ['gupy-templates'],
  gupyTemplatesList: (params) => ['gupy-templates', 'list', params],

  // Subregionais and Unidades (from useSubregionais hook)
  subregionais: ['subregionais'],
  subregionalUnidades: (id_subregional) => ['subregionais', id_subregional, 'unidades'],

  // Candidate search (from useCandidateSearch hook)
  candidates: ['candidates'],
  candidateSearch: (id_unidade, cpf) => ['candidates', 'search', id_unidade, cpf],

  // Specific item keys
  booking: (id) => ['bookings', id],
  regionalJob: (id) => ['regional-jobs', id],
  unitAvailability: (unitId, weekStart) => ['availability', unitId, weekStart],
  usuario: (id) => ['usuarios', id],
}

// Cache invalidation helpers
export const invalidateQueries = {
  // Invalidate all queries for an entity
  allBookings: () => queryClient.invalidateQueries({ queryKey: queryKeys.bookings }),
  allAvailability: () => queryClient.invalidateQueries({ queryKey: queryKeys.availability }),
  allRegionalJobs: () => queryClient.invalidateQueries({ queryKey: queryKeys.regionalJobs }),
  allRegions: () => queryClient.invalidateQueries({ queryKey: queryKeys.regions }),
  allUnits: () => queryClient.invalidateQueries({ queryKey: queryKeys.units }),
  allUsuarios: () => queryClient.invalidateQueries({ queryKey: queryKeys.usuarios }),
  allJobs: () => queryClient.invalidateQueries({ queryKey: queryKeys.jobs }),
  allGupyTemplates: () => queryClient.invalidateQueries({ queryKey: queryKeys.gupyTemplates }),
  allSubregionais: () => queryClient.invalidateQueries({ queryKey: queryKeys.subregionais }),
  allCandidates: () => queryClient.invalidateQueries({ queryKey: queryKeys.candidates }),

  // Invalidate specific item
  booking: (id) => queryClient.invalidateQueries({ queryKey: queryKeys.booking(id) }),
  regionalJob: (id) => queryClient.invalidateQueries({ queryKey: queryKeys.regionalJob(id) }),
  usuario: (id) => queryClient.invalidateQueries({ queryKey: queryKeys.usuario(id) }),
  job: (id) => queryClient.invalidateQueries({ queryKey: queryKeys.job(id) }),
  subregionalUnidades: (id) => queryClient.invalidateQueries({ queryKey: queryKeys.subregionalUnidades(id) }),
}
