import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import api from '../lib/api'

/**
 * Query keys factory for candidate search
 */
export const candidateKeys = {
  all: ['candidates'],
  search: (id_unidade, cpf) => [...candidateKeys.all, 'search', id_unidade, cpf],
}

/**
 * Validates CPF format (11 digits only)
 * Does NOT validate CPF checksum - backend handles that
 *
 * @param {string} cpf - CPF to validate
 * @returns {boolean} - True if CPF has exactly 11 digits
 */
function isValidCpfFormat(cpf) {
  if (!cpf) return false
  // Remove non-numeric characters
  const cleanCpf = cpf.replace(/\D/g, '')
  return cleanCpf.length === 11
}

/**
 * Hook for searching candidates by CPF via Gupy integration
 *
 * IMPORTANT: This search does NOT filter by phase/step!
 * Returns candidates from ANY phase of the selection process.
 *
 * Features:
 * - Built-in 300ms debounce
 * - CPF format validation (11 digits)
 * - Only executes when both id_unidade and valid CPF are provided
 *
 * @param {number|string} id_unidade - Unit ID to search within
 * @param {string} cpf - CPF to search (with or without formatting)
 *
 * @example
 * const { candidates, isLoading, isSearching, error } = useCandidateSearch(5, '12345678901')
 *
 * // candidates: [
 * //   {
 * //     id_application: 456789,
 * //     candidate_name: "Joao Silva",
 * //     candidate_email: "joao.silva@email.com",
 * //     candidate_cpf: "12345678901",
 * //     candidate_phone: "11999999999",
 * //     current_step: "Aula Teste",
 * //     job_id: "123456",
 * //     job_name: "Professor de Matematica - Regional Sul",
 * //     id_job_gupy: "123456"
 * //   }
 * // ]
 */
export function useCandidateSearch(id_unidade, cpf) {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      candidates: [],
      isLoading: false,
      isSearching: false,
      isError: false,
      error: null,
      isValidCpf: false,
    }
  }

  // Debounced CPF state
  const [debouncedCpf, setDebouncedCpf] = useState('')
  const debounceTimerRef = useRef(null)

  // Clean CPF (remove formatting)
  const cleanCpf = cpf ? cpf.replace(/\D/g, '') : ''
  const isValidCpf = isValidCpfFormat(cleanCpf)

  // Debounce effect - updates debouncedCpf 300ms after cpf changes
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Only set debounced value if CPF is valid
    if (isValidCpf) {
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedCpf(cleanCpf)
      }, 300)
    } else {
      // Clear debounced value immediately if CPF becomes invalid
      setDebouncedCpf('')
    }

    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [cleanCpf, isValidCpf])

  // Determine if we should fetch
  const shouldFetch = !!id_unidade && !!debouncedCpf && debouncedCpf.length === 11

  /**
   * GET /api/v1/gupy/unidades/:id/applications?cpf=XXX
   *
   * CRITICAL: NO step/phase filter!
   * Returns candidates from ANY phase of the selection process.
   */
  const query = useQuery({
    queryKey: candidateKeys.search(id_unidade, debouncedCpf),
    queryFn: async () => {
      const res = await api.get(`/gupy/unidades/${id_unidade}/applications`, {
        params: { cpf: debouncedCpf }
        // IMPORTANT: NO step filter! Do not add step: 'Aula Teste' or any phase filter
      })
      // API returns { success: true, data: [...] }
      return res.data?.data || []
    },
    enabled: shouldFetch,
    staleTime: 30 * 1000, // 30 seconds - candidate data can change
    gcTime: 2 * 60 * 1000,
  })

  // isSearching: true when user has typed valid CPF but debounce hasn't triggered yet
  const isSearching = isValidCpf && cleanCpf !== debouncedCpf

  return {
    candidates: query.data || [],
    isLoading: query.isLoading,
    isSearching, // Debounce in progress
    isFetching: query.isFetching, // Query in progress
    isError: query.isError,
    error: query.error,
    isValidCpf,
  }
}

/**
 * Hook for fetching a specific application from Gupy
 *
 * @param {string} jobId - Gupy job ID
 * @param {string} applicationId - Gupy application ID
 *
 * @example
 * const { application, isLoading } = useApplicationDetail('123456', '456789')
 */
export function useApplicationDetail(jobId, applicationId) {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      application: null,
      isLoading: true,
      isError: false,
      error: null,
    }
  }

  const query = useQuery({
    queryKey: ['application', jobId, applicationId],
    queryFn: async () => {
      const res = await api.get(`/gupy/jobs/${jobId}/applications/${applicationId}`)
      return res.data?.data || null
    },
    enabled: !!jobId && !!applicationId,
    staleTime: 30 * 1000,
  })

  return {
    application: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

export default useCandidateSearch
