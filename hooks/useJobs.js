import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

// Query keys factory for jobs
export const jobsKeys = {
  all: ['jobs'],
  lists: () => [...jobsKeys.all, 'list'],
  list: (filters) => [...jobsKeys.lists(), filters],
  details: () => [...jobsKeys.all, 'detail'],
  detail: (id) => [...jobsKeys.details(), id],
}

/**
 * Hook to fetch list of jobs with optional filters
 *
 * @param {Object} filters - Optional filters
 * @param {number} filters.id - Filter by job ID
 * @param {number} filters.id_subregional - Filter by subregional ID
 * @param {number} filters.id_regional - Filter by regional ID
 * @param {boolean} filters.ativo - Filter by active status
 * @param {string} filters.include - Include related data ('unidades')
 * @param {number} filters.limit - Max results (1-100, default: 50)
 * @param {number} filters.offset - Pagination offset
 * @param {Object} options - React Query options
 * @returns {Object} React Query result
 *
 * @example
 * // Get all active jobs
 * const { data, isLoading } = useJobs({ ativo: true })
 *
 * @example
 * // Get jobs for a specific subregional with units
 * const { data } = useJobs({ id_subregional: 3, include: 'unidades' })
 */
export function useJobs(filters = {}, options = {}) {
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
    queryKey: jobsKeys.list(filters),
    queryFn: async () => {
      const params = {}

      // Add filters to params if provided
      if (filters.id !== undefined) params.id = filters.id
      if (filters.id_subregional !== undefined) params.id_subregional = filters.id_subregional
      if (filters.id_regional !== undefined) params.id_regional = filters.id_regional
      if (filters.id_unidade !== undefined) params.id_unidade = filters.id_unidade
      if (filters.ativo !== undefined) params.ativo = filters.ativo
      if (filters.job_status) params.job_status = filters.job_status
      if (filters.job_name) params.job_name = filters.job_name
      if (filters.job_code) params.job_code = filters.job_code
      if (filters.include) params.include = filters.include
      if (filters.limit !== undefined) params.limit = filters.limit
      if (filters.offset !== undefined) params.offset = filters.offset

      const res = await api.get('/jobs', { params })

      // Handle response structure: { success: true, data: [...], total, total_drafts, etc }
      if (res.data?.success && Array.isArray(res.data.data)) {
        return {
          jobs: res.data.data,
          total: res.data.total || res.data.data.length,
          total_drafts: res.data.total_drafts || 0,
          total_published: res.data.total_published || 0,
          total_closed: res.data.total_closed || 0,
          total_canceled: res.data.total_canceled || 0,
          limit: res.data.limit || 50,
          offset: res.data.offset || 0,
        }
      }

      // Fallback for array response
      if (Array.isArray(res.data)) {
        return {
          jobs: res.data,
          total: res.data.length,
          total_drafts: 0,
          total_published: 0,
          total_closed: 0,
          total_canceled: 0,
          limit: 50,
          offset: 0,
        }
      }

      return { jobs: [], total: 0, total_drafts: 0, total_published: 0, total_closed: 0, total_canceled: 0, limit: 50, offset: 0 }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  })
}

/**
 * Hook to fetch a single job by ID
 *
 * @param {number|string} id - Job ID (id_job_subregional)
 * @param {Object} options - React Query options
 * @returns {Object} React Query result with job data
 *
 * @example
 * const { data: job, isLoading } = useJob(1)
 */
export function useJob(id, options = {}) {
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
    queryKey: jobsKeys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/jobs/${id}`)

      // Handle response structure: { success: true, data: {...} }
      if (res.data?.success && res.data.data) {
        return res.data.data
      }

      return res.data
    },
    enabled: !!id, // Only run if id is provided
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook to create one or more jobs (supports batch)
 *
 * @returns {Object} Mutation object with mutateAsync, isLoading, etc.
 *
 * @example
 * const { mutateAsync: createJob, isLoading } = useCreateJob()
 *
 * // Single job (retrocompatible)
 * await createJob({ template_gupy_id: 789, id_subregional: 3, unidades: [5, 6, 7] })
 *
 * // Batch jobs
 * const result = await createJob([
 *   { template_gupy_id: 789, id_subregional: 3, unidades: [5, 6] },
 *   { template_gupy_id: 790, id_subregional: 4 }
 * ])
 * // result: { success: true, results: [...], summary: { total: 2, succeeded: 2, failed: 0 } }
 */
export function useCreateJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      // Payload: single object or array of objects
      const res = await api.post('/jobs', payload)
      return res.data
    },
    onSuccess: () => {
      // Invalidate all job queries to refetch lists
      queryClient.invalidateQueries({ queryKey: jobsKeys.all })
    },
  })
}

/**
 * Hook to update an existing job
 *
 * @returns {Object} Mutation object with mutateAsync, isLoading, etc.
 *
 * @example
 * const { mutateAsync: updateJob } = useUpdateJob()
 *
 * await updateJob({
 *   id: 1,
 *   payload: {
 *     job_name: 'New Job Name',
 *     ativo: false,
 *     unidades: [5, 8, 9]
 *   }
 * })
 */
export function useUpdateJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      // Payload: { job_name?, job_code?, id_subregional?, ativo?, unidades?: [...] }
      const res = await api.patch(`/jobs/${id}`, payload)
      return res.data
    },
    onSuccess: (data, variables) => {
      // Invalidate all job lists and the specific job detail
      queryClient.invalidateQueries({ queryKey: jobsKeys.all })
      queryClient.invalidateQueries({ queryKey: jobsKeys.detail(variables.id) })
    },
  })
}

/**
 * Hook to publish one or more jobs (batch operation)
 *
 * IMPORTANT: This endpoint receives an array of IDs in the `ids` field
 *
 * @returns {Object} Mutation object with mutateAsync, isLoading, etc.
 *
 * @example
 * const { mutateAsync: publishJobs, isLoading } = usePublishJobs()
 *
 * // Publish multiple jobs
 * const result = await publishJobs({
 *   ids: [1, 2, 3],
 *   jobBoards: [1, 3, 10, 11, 12],
 *   publishStatus: true,
 *   hiringDeadline: '2025-12-31T23:59:59Z',
 *   applicationDeadline: '2025-12-31T23:59:59Z'
 * })
 *
 * // Check results
 * console.log(result.summary) // { total: 3, succeeded: 2, failed: 1 }
 * console.log(result.results) // Array with success/failure for each job
 */
export function usePublishJobs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      // Payload: { ids: [...], jobBoards?: [...], publishStatus?, hiringDeadline?, applicationDeadline? }
      //
      // Required:
      // - ids: integer[] - Array of job IDs to publish
      //
      // Optional:
      // - jobBoards: integer[] - Job board IDs (default: free boards like Indeed, LinkedIn, etc)
      // - publishStatus: boolean - If true, changes status to 'published'
      // - hiringDeadline: ISO8601 string - Required if publishStatus is true
      // - applicationDeadline: ISO8601 string - Required if publishStatus is true

      if (!payload.ids || !Array.isArray(payload.ids) || payload.ids.length === 0) {
        throw new Error('ids is required and must be a non-empty array')
      }

      const res = await api.post('/jobs/publish', payload)
      return res.data
    },
    onSuccess: () => {
      // Invalidate all job queries since published status changed
      queryClient.invalidateQueries({ queryKey: jobsKeys.all })
    },
  })
}

/**
 * Hook to link a unit to a job
 *
 * @returns {Object} Mutation object
 *
 * @example
 * const { mutateAsync: linkUnit } = useLinkJobUnit()
 * await linkUnit({ jobId: 1, id_unidade: 8 })
 */
export function useLinkJobUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobId, id_unidade }) => {
      const res = await api.post(`/jobs/${jobId}/unidades`, { id_unidade })
      return res.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.all })
      queryClient.invalidateQueries({ queryKey: jobsKeys.detail(variables.jobId) })
    },
  })
}

/**
 * Hook to unlink a unit from a job
 *
 * @returns {Object} Mutation object
 *
 * @example
 * const { mutateAsync: unlinkUnit } = useUnlinkJobUnit()
 * await unlinkUnit({ jobId: 1, id_unidade: 8 })
 */
export function useUnlinkJobUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobId, id_unidade }) => {
      const res = await api.delete(`/jobs/${jobId}/unidades/${id_unidade}`)
      return res.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.all })
      queryClient.invalidateQueries({ queryKey: jobsKeys.detail(variables.jobId) })
    },
  })
}

/**
 * Hook to sync job HTML fields from Gupy template
 *
 * @returns {Object} Mutation object
 *
 * @example
 * const { mutateAsync: syncJob } = useSyncJobFromGupy()
 * await syncJob(1) // Syncs job with ID 1
 */
export function useSyncJobFromGupy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId) => {
      const res = await api.post(`/jobs/${jobId}/sync`)
      return res.data
    },
    onSuccess: (data, jobId) => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.detail(jobId) })
    },
  })
}

/**
 * Hook to close one or more jobs (batch operation)
 *
 * Closes jobs in Gupy - changes status to 'closed'
 *
 * @returns {Object} Mutation object with mutateAsync, isLoading, etc.
 *
 * @example
 * const { mutateAsync: closeJobs, isLoading } = useCloseJobs()
 *
 * const result = await closeJobs({ ids: [1, 2, 3] })
 */
export function useCloseJobs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      if (!payload.ids || !Array.isArray(payload.ids) || payload.ids.length === 0) {
        throw new Error('ids is required and must be a non-empty array')
      }

      const res = await api.post('/jobs/close', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.all })
    },
  })
}

/**
 * Hook to cancel one or more jobs (batch operation)
 *
 * Cancels jobs in Gupy - changes status to 'canceled'
 * Requires a cancellation reason
 *
 * @returns {Object} Mutation object with mutateAsync, isLoading, etc.
 *
 * @example
 * const { mutateAsync: cancelJobs, isLoading } = useCancelJobs()
 *
 * const result = await cancelJobs({
 *   ids: [1, 2, 3],
 *   cancelReasonNotes: 'Vaga nao e mais necessaria'
 * })
 */
export function useCancelJobs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      if (!payload.ids || !Array.isArray(payload.ids) || payload.ids.length === 0) {
        throw new Error('ids is required and must be a non-empty array')
      }

      if (!payload.cancelReasonNotes || typeof payload.cancelReasonNotes !== 'string') {
        throw new Error('cancelReasonNotes is required')
      }

      const res = await api.post('/jobs/cancel', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.all })
    },
  })
}

/**
 * Hook to soft delete one or more jobs (batch operation)
 *
 * Sets ativo=false for jobs that no longer exist in Gupy
 *
 * @returns {Object} Mutation object with mutateAsync, isLoading, etc.
 *
 * @example
 * const { mutateAsync: deleteJobs, isLoading } = useDeleteJobs()
 *
 * const result = await deleteJobs({ ids: [1, 2, 3] })
 */
export function useDeleteJobs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      if (!payload.ids || !Array.isArray(payload.ids) || payload.ids.length === 0) {
        throw new Error('ids is required and must be a non-empty array')
      }

      const res = await api.delete('/jobs', { data: payload })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.all })
    },
  })
}

/**
 * Hook to update job status in Gupy
 *
 * @returns {Object} Mutation object
 *
 * @example
 * const { mutateAsync: updateStatus } = useUpdateJobStatus()
 * await updateStatus({ id: 1, status: 'published' })
 *
 * // Valid statuses:
 * // 'draft', 'waiting_approval', 'approved', 'disapproved',
 * // 'published', 'frozen', 'closed', 'canceled'
 */
export function useUpdateJobStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await api.patch(`/jobs/${id}/status`, { status })
      return res.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.all })
      queryClient.invalidateQueries({ queryKey: jobsKeys.detail(variables.id) })
    },
  })
}

/**
 * Hook to delete draft jobs (batch operation)
 *
 * Only works with jobs in 'draft' status.
 *
 * @returns {Object} Mutation object with mutateAsync, isLoading, etc.
 *
 * @example
 * const { mutateAsync: deleteDrafts, isLoading } = useDeleteDrafts()
 *
 * // Delete multiple draft jobs
 * const result = await deleteDrafts({ ids: [1, 2, 3] })
 */
export function useDeleteDrafts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      if (!payload.ids || !Array.isArray(payload.ids) || payload.ids.length === 0) {
        throw new Error('ids is required and must be a non-empty array')
      }

      const res = await api.post('/jobs/delete-drafts', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.all })
    },
  })
}
