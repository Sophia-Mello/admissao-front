import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { queryKeys, invalidateQueries } from '../lib/queryClient'

/**
 * Query keys factory for bookings
 */
export const bookingKeys = {
  all: ['bookings'],
  lists: () => [...bookingKeys.all, 'list'],
  list: (filters) => [...bookingKeys.lists(), filters],
  details: () => [...bookingKeys.all, 'detail'],
  detail: (id) => [...bookingKeys.details(), id],
}

/**
 * Hook for managing bookings with React Query
 *
 * @example
 * // List bookings with filters
 * const { bookings, isLoading, error } = useBookings({ id_unidade: 5, status: 'agendado' })
 *
 * // Create a manual booking
 * const { createBooking } = useBookings()
 * await createBooking.mutateAsync({ id_job_unidade: 45, start_at: '...', end_at: '...' })
 *
 * // Update booking status
 * const { updateBookingStatus } = useBookings()
 * await updateBookingStatus.mutateAsync({ id: 123, status_booking: 'compareceu' })
 *
 * // Cancel a booking
 * const { cancelBooking } = useBookings()
 * await cancelBooking.mutateAsync(123)
 */
export function useBookings(filters = {}) {
  // SSR Guard - Return safe stubs on server
  if (typeof window === 'undefined') {
    return {
      bookings: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
      createBooking: { mutateAsync: async () => { throw new Error('Cannot mutate on server') }, isPending: false },
      updateBookingStatus: { mutateAsync: async () => { throw new Error('Cannot mutate on server') }, isPending: false },
      cancelBooking: { mutateAsync: async () => { throw new Error('Cannot mutate on server') }, isPending: false },
    }
  }

  const qc = useQueryClient()

  // Build query params from filters
  const queryParams = {}
  if (filters.id_unidade) queryParams.id_unidade = filters.id_unidade
  if (filters.cpf) queryParams.cpf = filters.cpf
  if (filters.status) queryParams.status = filters.status
  if (filters.limit) queryParams.limit = filters.limit
  if (filters.offset) queryParams.offset = filters.offset

  /**
   * GET /api/v1/booking - List bookings with filters
   */
  const listQuery = useQuery({
    queryKey: bookingKeys.list(queryParams),
    queryFn: async () => {
      const res = await api.get('/booking', { params: queryParams })
      // API returns { success: true, data: [...], pagination: {...} }
      return res.data?.data || []
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - bookings can change frequently
    gcTime: 5 * 60 * 1000,
    enabled: Object.keys(queryParams).length > 0, // Only fetch when filters are provided
  })

  /**
   * POST /api/v1/booking - Create a manual booking
   * Requires authentication (admin/recrutamento)
   */
  const createBooking = useMutation({
    mutationFn: async (payload) => {
      // payload: { id_job_unidade, start_at, end_at, candidate_name?, candidate_email?, cpf? }
      const res = await api.post('/booking', payload)
      return res.data
    },
    onSuccess: () => {
      // Invalidate bookings list
      qc.invalidateQueries({ queryKey: bookingKeys.all })
      // IMPORTANT: Also invalidate availability - a slot is now occupied
      invalidateQueries.allAvailability()
    },
  })

  /**
   * PATCH /api/v1/booking/:id - Update booking status or evaluation
   */
  const updateBookingStatus = useMutation({
    mutationFn: async ({ id, status_booking, evaluation }) => {
      const payload = {}
      if (status_booking) payload.status_booking = status_booking
      if (evaluation) payload.evaluation = evaluation

      const res = await api.patch(`/booking/${id}`, payload)
      return res.data
    },
    onSuccess: (data, variables) => {
      // Invalidate the specific booking and the list
      qc.invalidateQueries({ queryKey: bookingKeys.detail(variables.id) })
      qc.invalidateQueries({ queryKey: bookingKeys.all })
      // If status changed to 'cancelado', the slot is now available
      if (variables.status_booking === 'cancelado') {
        invalidateQueries.allAvailability()
      }
    },
  })

  /**
   * DELETE /api/v1/booking/:id - Cancel a booking (soft delete)
   * Only bookings with status 'agendado' can be cancelled
   */
  const cancelBooking = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/booking/${id}`)
      return res.data
    },
    onSuccess: (data, id) => {
      // Invalidate bookings
      qc.invalidateQueries({ queryKey: bookingKeys.detail(id) })
      qc.invalidateQueries({ queryKey: bookingKeys.all })
      // IMPORTANT: Slot is now available again
      invalidateQueries.allAvailability()
    },
  })

  return {
    // Query results
    bookings: listQuery.data || [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    refetch: listQuery.refetch,

    // Mutations
    createBooking,
    updateBookingStatus,
    cancelBooking,
  }
}

/**
 * Hook to fetch a single booking by ID
 *
 * @example
 * const { booking, isLoading } = useBookingDetail(123)
 */
export function useBookingDetail(id) {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      booking: null,
      isLoading: true,
      isError: false,
      error: null,
    }
  }

  const query = useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/booking/${id}`)
      return res.data?.data || null
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })

  return {
    booking: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

export default useBookings
