/**
 * useEventos.js - Hooks for Evento (Prova Teórica) system
 *
 * Provides React Query hooks for:
 * - Dashboard slots (GET /evento/dashboard/slots)
 * - Slot rooms (GET /evento/dashboard/slots/:date/:time)
 * - Room candidates (GET /evento/dashboard/rooms/:id)
 * - Pending candidates (GET /evento/dashboard/pending)
 * - Candidate search by CPF (GET /evento/dashboard/candidate/:cpf)
 * - Events CRUD (GET/POST/PATCH/DELETE /evento/events)
 * - Bulk event creation (POST /evento/events/bulk)
 * - Manual scheduling (POST /evento/dashboard/schedule-manual)
 * - Public availability (GET /evento/applications/availability)
 * - Candidate scheduling (PUT /evento/applications)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import api from '../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// QUERY KEYS FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Query keys factory for eventos
 * Following the pattern established in useBookings.js
 */
export const eventoKeys = {
  all: ['evento'],
  // Dashboard
  dashboard: () => [...eventoKeys.all, 'dashboard'],
  slots: (params) => [...eventoKeys.dashboard(), 'slots', params],
  slotRooms: (date, timeStart, timeEnd, type) => [...eventoKeys.dashboard(), 'rooms', date, timeStart, timeEnd, type],
  roomCandidates: (id) => [...eventoKeys.dashboard(), 'candidates', id],
  pending: (params) => [...eventoKeys.dashboard(), 'pending', params],
  candidates: (params) => [...eventoKeys.dashboard(), 'candidates-list', params],
  candidateCpf: (cpf, type) => [...eventoKeys.dashboard(), 'cpf', cpf, type],
  // Events
  events: () => [...eventoKeys.all, 'events'],
  eventsList: (params) => [...eventoKeys.events(), 'list', params],
  // Public
  publicAvailability: (params) => [...eventoKeys.all, 'public', 'availability', params],
  candidateLookup: (cpf) => [...eventoKeys.all, 'public', 'lookup', cpf],
};

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch dashboard slots with occupancy info
 */
export function useDashboardSlots(params = {}) {
  const { type, date_start, date_end, enabled = true } = params;

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: null,
      slots: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
      isFetching: false,
    };
  }

  const queryParams = { type, date_start, date_end };
  const query = useQuery({
    queryKey: eventoKeys.slots(queryParams),
    queryFn: async () => {
      const searchParams = new URLSearchParams({ type });
      if (date_start) searchParams.append('date_start', date_start);
      if (date_end) searchParams.append('date_end', date_end);

      const response = await api.get(`/evento/dashboard/slots?${searchParams}`);
      return response.data;
    },
    enabled: enabled && !!type, // Only run when type is set
    staleTime: 30000, // 30 seconds
  });

  return {
    data: query.data,
    slots: query.data?.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

/**
 * Fetch rooms for a specific time slot
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} timeStart - Start time (HH:MM or HH:MM:SS)
 * @param {string} timeEnd - End time (HH:MM or HH:MM:SS) - optional but recommended for disambiguation
 * @param {string} type - Event type (required)
 * @param {boolean} enabled - Enable/disable the query
 */
export function useSlotRooms(date, timeStart, timeEnd, type, enabled = true) {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: null,
      rooms: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    };
  }

  const query = useQuery({
    queryKey: eventoKeys.slotRooms(date, timeStart, timeEnd, type),
    queryFn: async () => {
      const params = new URLSearchParams({ type });
      if (timeEnd) {
        params.append('time_end', timeEnd);
      }
      const response = await api.get(`/evento/dashboard/slots/${date}/${timeStart}?${params}`);
      return response.data;
    },
    enabled: enabled && !!date && !!timeStart && !!type,
    staleTime: 10000, // 10 seconds
  });

  return {
    data: query.data,
    rooms: query.data?.data?.rooms || [],
    summary: query.data?.data?.summary || {},
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Fetch candidates in a specific room
 */
export function useRoomCandidates(roomId, enabled = true) {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: null,
      room: null,
      candidates: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    };
  }

  const query = useQuery({
    queryKey: eventoKeys.roomCandidates(roomId),
    queryFn: async () => {
      const response = await api.get(`/evento/dashboard/rooms/${roomId}`);
      return response.data;
    },
    enabled: enabled && !!roomId,
    staleTime: 10000,
  });

  return {
    data: query.data,
    room: query.data?.data?.room || null,
    candidates: query.data?.data?.candidates || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Fetch pending candidates (without active inscription)
 */
export function usePendingCandidates(params = {}) {
  const { template_name, id_subregional, type, enabled = true } = params;

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: null,
      candidates: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
      isFetching: false,
    };
  }

  const queryParams = { type, template_name, id_subregional };
  const query = useQuery({
    queryKey: eventoKeys.pending(queryParams),
    queryFn: async () => {
      const searchParams = new URLSearchParams({ type });
      if (template_name) searchParams.append('template_name', template_name);
      if (id_subregional) searchParams.append('id_subregional', id_subregional);

      const response = await api.get(`/evento/dashboard/pending?${searchParams}`);
      return response.data;
    },
    enabled: enabled && !!type, // Only run when type is set
    staleTime: 60000, // 1 minute
  });

  return {
    data: query.data,
    candidates: query.data?.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

/**
 * Fetch candidates with status filter and server-side pagination
 *
 * @param {object} params
 * @param {string} params.status - 'pendente' (default) | 'agendado' | 'compareceu' | 'faltou'
 * @param {string} params.template_name - Filter by template name (ILIKE)
 * @param {number} params.id_subregional - Filter by subregional ID
 * @param {number} params.limit - Records per page (default 10)
 * @param {number} params.offset - Pagination offset (default 0)
 * @param {string} params.type - Event type (required)
 * @param {boolean} params.enabled - Enable query (default true)
 */
export function useCandidates(params = {}) {
  const {
    status = 'pendente',
    template_name,
    id_subregional,
    type,
    limit = 10,
    offset = 0,
    order_by = 'dias_na_etapa',
    order_dir = 'desc',
    enabled = true,
  } = params;

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: null,
      candidates: [],
      pagination: { limit: 10, offset: 0, count: 0, total: 0, hasMore: false },
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
      isFetching: false,
    };
  }

  const queryParams = { status, type, template_name, id_subregional, limit, offset, order_by, order_dir };
  const query = useQuery({
    queryKey: eventoKeys.candidates(queryParams),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.append('status', status);
      searchParams.append('type', type);
      searchParams.append('limit', limit.toString());
      searchParams.append('offset', offset.toString());
      searchParams.append('order_by', order_by);
      searchParams.append('order_dir', order_dir);
      if (template_name) searchParams.append('template_name', template_name);
      if (id_subregional) searchParams.append('id_subregional', id_subregional.toString());

      const response = await api.get(`/evento/dashboard/candidates?${searchParams}`);
      return response.data;
    },
    enabled: enabled && !!type, // Only run when type is set
    staleTime: 60000, // 1 minute
  });

  return {
    data: query.data,
    candidates: query.data?.data || [],
    pagination: query.data?.pagination || { limit: 10, offset: 0, count: 0, total: 0, hasMore: false },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

/**
 * Search candidate by CPF
 */
export function useCandidateByCPF(cpf, type, enabled = true) {
  const cleanCpf = cpf?.replace(/\D/g, '');

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: null,
      candidate: null,
      applications: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    };
  }

  const query = useQuery({
    queryKey: eventoKeys.candidateCpf(cleanCpf, type),
    queryFn: async () => {
      const response = await api.get(`/evento/dashboard/candidate/${cleanCpf}?type=${type}`);
      return response.data;
    },
    enabled: enabled && cleanCpf?.length === 11 && !!type,
    staleTime: 30000,
    retry: false,
  });

  return {
    data: query.data,
    candidate: query.data?.data?.candidate || null,
    applications: query.data?.data?.applications || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS CRUD HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch events list
 */
export function useEventsList(params = {}) {
  const { type, date_start, date_end, status, enabled = true } = params;

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: null,
      events: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    };
  }

  const queryParams = { type, date_start, date_end, status };
  const query = useQuery({
    queryKey: eventoKeys.eventsList(queryParams),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (type) searchParams.append('type', type);
      if (date_start) searchParams.append('date_start', date_start);
      if (date_end) searchParams.append('date_end', date_end);
      if (status) searchParams.append('status', status);

      const response = await api.get(`/evento/events?${searchParams}`);
      return response.data;
    },
    enabled,
    staleTime: 30000,
  });

  return {
    data: query.data,
    events: query.data?.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Create events in bulk
 */
export function useCreateEventsBulk() {
  const queryClient = useQueryClient();

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      mutateAsync: async () => { throw new Error('Cannot mutate on server'); },
      isPending: false,
      isError: false,
      error: null,
    };
  }

  return useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/evento/events/bulk', payload);
      return response.data;
    },
    onSuccess: (data) => {
      message.success(`${data.summary?.total_events || 0} eventos criados com sucesso!`);
      queryClient.invalidateQueries({ queryKey: eventoKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: eventoKeys.events() });
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.error || 'Erro ao criar eventos';
      message.error(errorMsg);
    },
  });
}

/**
 * Update event
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      mutateAsync: async () => { throw new Error('Cannot mutate on server'); },
      isPending: false,
      isError: false,
      error: null,
    };
  }

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const response = await api.patch(`/evento/events/${id}`, updates);
      return response.data;
    },
    onSuccess: () => {
      message.success('Evento atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: eventoKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: eventoKeys.events() });
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.error || 'Erro ao atualizar evento';
      message.error(errorMsg);
    },
  });
}

/**
 * Delete event
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      mutateAsync: async () => { throw new Error('Cannot mutate on server'); },
      isPending: false,
      isError: false,
      error: null,
    };
  }

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/evento/events/${id}`);
      return response.data;
    },
    onSuccess: () => {
      message.success('Evento excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: eventoKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: eventoKeys.events() });
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.error || 'Erro ao excluir evento';
      message.error(errorMsg);
    },
  });
}

/**
 * Delete all events in a time slot
 */
export function useDeleteSlot() {
  const queryClient = useQueryClient();

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      mutateAsync: async () => { throw new Error('Cannot mutate on server'); },
      isPending: false,
      isError: false,
      error: null,
    };
  }

  return useMutation({
    mutationFn: async ({ date, time, type, confirmation }) => {
      const response = await api.delete(`/evento/dashboard/slots/${date}/${time}?type=${type}`, {
        data: { confirmation },
      });
      return response.data;
    },
    onSuccess: (data) => {
      message.success(`${data.deleted_ids?.length || 0} eventos excluídos!`);
      // Invalidate all dashboard queries (slots, rooms, etc.)
      queryClient.invalidateQueries({ queryKey: eventoKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: eventoKeys.events() });
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.error || 'Erro ao excluir horário';
      message.error(errorMsg);
    },
  });
}

/**
 * Delete events in bulk by date/time range
 */
export function useDeleteEventsBulk() {
  const queryClient = useQueryClient();

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      mutateAsync: async () => { throw new Error('Cannot mutate on server'); },
      isPending: false,
      isError: false,
      error: null,
    };
  }

  return useMutation({
    mutationFn: async ({ type, date_start, date_end, time_start, time_end, confirmation }) => {
      const response = await api.delete('/evento/events/bulk', {
        data: { type, date_start, date_end, time_start, time_end, confirmation },
      });
      return response.data;
    },
    onSuccess: (data) => {
      message.success(`${data.deleted_count || 0} eventos excluídos com sucesso!`);
      // Invalidate all dashboard queries (slots, rooms, etc.)
      queryClient.invalidateQueries({ queryKey: eventoKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: eventoKeys.events() });
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.error || 'Erro ao excluir eventos';
      message.error(errorMsg);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULING HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Manual scheduling by admin
 */
export function useScheduleManual() {
  const queryClient = useQueryClient();

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      mutateAsync: async () => { throw new Error('Cannot mutate on server'); },
      isPending: false,
      isError: false,
      error: null,
    };
  }

  return useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/evento/dashboard/schedule-manual', payload);
      return response.data;
    },
    onSuccess: (data) => {
      message.success(data.message || 'Candidato agendado com sucesso!');
      // Invalidate all dashboard queries (slots, pending, rooms, etc.)
      queryClient.invalidateQueries({ queryKey: eventoKeys.dashboard() });
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.error || 'Erro ao agendar candidato';
      message.error(errorMsg);
    },
  });
}

/**
 * Cancel event application
 */
export function useCancelEventApplication() {
  const queryClient = useQueryClient();

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      mutateAsync: async () => { throw new Error('Cannot mutate on server'); },
      isPending: false,
      isError: false,
      error: null,
    };
  }

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.patch(`/evento/dashboard/applications/${id}`, {
        status: 'cancelado',
      });
      return response.data;
    },
    onSuccess: () => {
      message.success('Inscrição cancelada com sucesso!');
      // Invalidate all dashboard queries
      queryClient.invalidateQueries({ queryKey: eventoKeys.dashboard() });
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.error || 'Erro ao cancelar inscrição';
      message.error(errorMsg);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API HOOKS (No auth required)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch public availability for candidates
 * Note: Uses api client but these endpoints don't require auth
 *
 * @param {object} params
 * @param {string} params.type - Event type code (resolved from application)
 * @param {string} params.jobId - Job ID (alternative: backend resolves type from template)
 * @param {string} params.date_start - Start date filter
 * @param {string} params.date_end - End date filter
 * @param {boolean} params.enabled - Enable/disable query
 */
export function usePublicAvailability(params = {}) {
  const { type, jobId, date_start, date_end, enabled = true } = params;

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: null,
      slots: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    };
  }

  const queryParams = { type, jobId, date_start, date_end };
  const query = useQuery({
    queryKey: eventoKeys.publicAvailability(queryParams),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      // Prefer jobId (backend resolves type), fallback to explicit type
      if (jobId) {
        searchParams.append('jobId', jobId);
      } else if (type) {
        searchParams.append('type', type);
      }
      if (date_start) searchParams.append('date_start', date_start);
      if (date_end) searchParams.append('date_end', date_end);

      const response = await api.get(`/evento/applications/availability?${searchParams}`);
      return response.data;
    },
    enabled: enabled && !!(type || jobId), // Require at least type or jobId
    staleTime: 60000, // 1 minute
  });

  return {
    data: query.data,
    slots: query.data?.data || [],
    meta: query.data?.meta || {},
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Lookup candidate applications by CPF + Email (public)
 *
 * Used by the "Prova Online" page for CPF+email login flow.
 * Returns list of applications with scheduling status.
 */
export function useLookupCandidate() {
  const queryClient = useQueryClient();

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      mutateAsync: async () => { throw new Error('Cannot mutate on server'); },
      isPending: false,
      isError: false,
      error: null,
      data: null,
    };
  }

  return useMutation({
    mutationFn: async ({ cpf, email }) => {
      // Clean CPF (remove non-digits)
      const cleanCpf = cpf.replace(/\D/g, '');

      const response = await api.post('/evento/applications/lookup', {
        cpf: cleanCpf,
        email: email.trim().toLowerCase(),
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Cache the result for potential re-queries
      if (data.success) {
        queryClient.setQueryData(
          eventoKeys.candidateLookup(data.candidate?.cpf),
          data
        );
      }
    },
    onError: (error) => {
      // Don't show message.error here - let the component handle it
      // since we want different UX for different errors (401 vs 404 vs 500)
      console.error('[useLookupCandidate] Error:', error.response?.data?.error || error.message);
    },
  });
}

/**
 * Schedule candidate (public or admin)
 *
 * @param {object} params
 * @param {string} params.applicationId - Application ID in Gupy
 * @param {string} params.jobId - Job ID in Gupy (backend resolves type from template if type not provided)
 * @param {string} params.type - Event type code (optional if jobId provided)
 * @param {string} params.date - Event date (YYYY-MM-DD)
 * @param {string} params.time_start - Event start time (HH:MM)
 * @param {string} params.apelido_meet - Display name for Meet (optional)
 */
export function useScheduleCandidate() {
  const queryClient = useQueryClient();

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      mutateAsync: async () => { throw new Error('Cannot mutate on server'); },
      isPending: false,
      isError: false,
      error: null,
    };
  }

  return useMutation({
    mutationFn: async ({ applicationId, jobId, type, date, time_start, apelido_meet }) => {
      const searchParams = new URLSearchParams({ applicationId, jobId });
      // Only add type if explicitly provided (backend can resolve from jobId)
      if (type) {
        searchParams.append('type', type);
      }
      const response = await api.put(`/evento/applications?${searchParams}`, {
        date,
        time_start,
        apelido_meet,
      });
      return response.data;
    },
    onSuccess: (data) => {
      message.success(data.message || 'Agendamento realizado com sucesso!');
      // Invalidate all evento queries (public and dashboard)
      queryClient.invalidateQueries({ queryKey: eventoKeys.all });
    },
    onError: (error) => {
      const errorData = error.response?.data;
      const errorCode = errorData?.code;

      // Tratamento específico para erro de template duplicado
      if (errorCode === 'DUPLICATE_TEMPLATE_APPLICATION') {
        const existing = errorData?.existing_booking;
        if (existing) {
          const date = existing.date ? new Date(existing.date).toLocaleDateString('pt-BR') : '';
          const time = existing.time?.substring(0, 5) || '';
          const status = existing.status === 'compareceu' ? 'já realizou' : 'já possui agendamento para';
          message.error(`Você ${status} esta prova (${date} às ${time}). Este agendamento vale para todas as vagas do mesmo cargo.`, 8);
        } else {
          message.error('Você já possui um agendamento de prova para esta vaga. Como você está inscrito em múltiplas vagas relacionadas, seu agendamento existente já cobre todas elas.', 8);
        }
        return;
      }

      const errorMsg = errorData?.error || 'Erro ao agendar';
      message.error(errorMsg);
    },
  });
}

export default {
  // Query keys factory
  eventoKeys,
  // Dashboard
  useDashboardSlots,
  useSlotRooms,
  useRoomCandidates,
  usePendingCandidates,
  useCandidateByCPF,
  // Events CRUD
  useEventsList,
  useCreateEventsBulk,
  useUpdateEvent,
  useDeleteEvent,
  useDeleteSlot,
  useDeleteEventsBulk,
  // Scheduling
  useScheduleManual,
  useCancelEventApplication,
  // Public
  usePublicAvailability,
  useLookupCandidate,
  useScheduleCandidate,
};
