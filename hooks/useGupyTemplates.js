import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

// Query keys factory for Gupy templates
export const gupyTemplatesKeys = {
  all: ['gupy-templates'],
  lists: () => [...gupyTemplatesKeys.all, 'list'],
  list: (params) => [...gupyTemplatesKeys.lists(), params],
}

/**
 * Hook to fetch job templates from Gupy
 *
 * Templates are used when creating new jobs - they contain the base
 * structure (description, responsibilities, prerequisites, etc.) that
 * gets copied to the new job.
 *
 * @param {Object} params - Optional query parameters
 * @param {number} params.perPage - Results per page (1-200, default: 100)
 * @param {string} params.fields - Fields to return (e.g., 'all')
 * @param {Object} options - React Query options
 * @returns {Object} React Query result with templates array
 *
 * @example
 * // Get all templates
 * const { data: templates, isLoading } = useGupyTemplates()
 *
 * @example
 * // Get templates with custom pagination
 * const { data } = useGupyTemplates({ perPage: 200 })
 *
 * @example
 * // Use template for creating a job
 * const { data: templates } = useGupyTemplates()
 * const selectedTemplate = templates?.find(t => t.id === selectedId)
 *
 * // Pass to createJob mutation
 * await createJob({
 *   template_gupy_id: selectedTemplate.id,
 *   id_subregional: 3,
 *   unidades: [5, 6, 7]
 * })
 */
export function useGupyTemplates(params = {}, options = {}) {
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
    queryKey: gupyTemplatesKeys.list(params),
    queryFn: async () => {
      const queryParams = {}

      if (params.perPage !== undefined) queryParams.perPage = params.perPage
      if (params.fields) queryParams.fields = params.fields

      const res = await api.get('/admin/gupy/templates', { params: queryParams })

      // Handle response structure: { success: true, data: [...] }
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data
      }

      // Fallback for direct array response
      if (Array.isArray(res.data)) {
        return res.data
      }

      return []
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - templates don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    ...options,
  })
}

/**
 * Hook to fetch a specific template's details
 *
 * This is useful when you need full template data including HTML fields
 * for preview before creating a job.
 *
 * @param {number|string} templateId - Gupy template ID
 * @param {Object} options - React Query options
 * @returns {Object} React Query result with template data
 *
 * @example
 * const { data: template, isLoading } = useGupyTemplate(789)
 *
 * // Template structure:
 * // {
 * //   id: 789,
 * //   name: 'Professor de Matematica',
 * //   type: 'vacancy_type_talent_pool',
 * //   departmentId: 123,
 * //   roleId: 456,
 * //   description: '<p>...</p>',
 * //   responsibilities: '<p>...</p>',
 * //   prerequisites: '<p>...</p>',
 * //   additionalInformation: '<p>...</p>'
 * // }
 */
export function useGupyTemplate(templateId, options = {}) {
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
    queryKey: [...gupyTemplatesKeys.all, 'detail', templateId],
    queryFn: async () => {
      // Note: This fetches template via job's gupy endpoint
      // The templates endpoint doesn't have individual GET by ID
      // This is typically used after a job is created to get its template data
      const res = await api.get(`/gupy/templates/${templateId}`)

      if (res.data?.success && res.data.data) {
        return res.data.data
      }

      return res.data
    },
    enabled: !!templateId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  })
}
