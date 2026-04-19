/**
 * useFiscalizacao.js - Hooks for Fiscalização (Exam Monitoring)
 *
 * Provides React Query hooks for:
 * - Rooms list (GET /evento/monitor/rooms/:id_event)
 * - Candidates in room (GET /evento/monitor/:id_event/room/:room)
 * - Toggle presence (PATCH /evento/monitor/applications/:id/presence)
 * - Update apelido (PATCH /evento/monitor/applications/:id/apelido)
 * - Start exam (POST /evento/monitor/:id_event/iniciar-prova)
 * - Reports (POST/GET /evento/reports)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import api from '../lib/api';
import { eventoKeys } from './useEventos';

// ─────────────────────────────────────────────────────────────────────────────
// QUERY KEYS FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export const fiscalizacaoKeys = {
  all: ['fiscalizacao'],
  // Monitor
  monitor: () => [...fiscalizacaoKeys.all, 'monitor'],
  monitorRooms: (idEvent) => [...fiscalizacaoKeys.monitor(), 'rooms', idEvent],
  monitorCandidates: (idEvent, room) => [...fiscalizacaoKeys.monitor(), 'candidates', idEvent, room],
  // Reports
  reports: () => [...fiscalizacaoKeys.all, 'reports'],
  applicationReports: (idEventApplication) => [...fiscalizacaoKeys.reports(), idEventApplication],
};

// ─────────────────────────────────────────────────────────────────────────────
// MONITOR HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch rooms for an event (for fiscal to select)
 */
export function useMonitorRooms(idEvent, enabled = true) {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: null,
      rooms: [],
      event_type: null,
      date: null,
      time_start: null,
      time_end: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    };
  }

  const query = useQuery({
    queryKey: fiscalizacaoKeys.monitorRooms(idEvent),
    queryFn: async () => {
      const response = await api.get(`/evento/monitor/rooms/${idEvent}`);
      return response.data;
    },
    enabled: enabled && !!idEvent,
    staleTime: 10000, // 10 seconds
  });

  return {
    data: query.data,
    rooms: query.data?.rooms || [],
    event_type: query.data?.event_type,
    date: query.data?.date,
    time_start: query.data?.time_start,
    time_end: query.data?.time_end,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

/**
 * Fetch candidates in a specific room for monitoring
 */
export function useMonitorCandidates(idEvent, room, enabled = true) {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: null,
      event: null,
      candidates: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    };
  }

  const query = useQuery({
    queryKey: fiscalizacaoKeys.monitorCandidates(idEvent, room),
    queryFn: async () => {
      const response = await api.get(`/evento/monitor/${idEvent}/room/${room}`);
      return response.data;
    },
    enabled: enabled && !!idEvent && !!room,
    staleTime: 5000, // 5 seconds - need fresh data for presence
    refetchInterval: 30000, // Refetch every 30 seconds while monitoring
  });

  return {
    data: query.data,
    event: query.data?.event || null,
    candidates: query.data?.candidates || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

/**
 * Toggle candidate presence (checkbox)
 * CRITICAL: Shows persistent error for rate limiting (429) to prevent silent failures
 */
export function useTogglePresence() {
  const queryClient = useQueryClient();

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      mutateAsync: async () => { throw new Error('Cannot mutate on server'); },
      mutate: () => {},
      isPending: false,
      isError: false,
      error: null,
    };
  }

  return useMutation({
    mutationFn: async ({ id, present }) => {
      const response = await api.patch(`/evento/monitor/applications/${id}/presence`, {
        present,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Optimistically update the candidate in cache
      queryClient.invalidateQueries({ queryKey: fiscalizacaoKeys.monitor() });
      // Also invalidate dashboard to reflect changes
      queryClient.invalidateQueries({ queryKey: eventoKeys.dashboard() });
    },
    onError: (error) => {
      const status = error.response?.status;
      const retryAfter = error.response?.data?.retryAfter;

      // CRITICAL: Rate limit error - show persistent warning
      if (status === 429) {
        message.error({
          content: `ATENÇÃO: Sistema sobrecarregado! A presença NÃO foi salva. Aguarde ${retryAfter || 60} segundos e tente novamente.`,
          duration: 10, // Show for 10 seconds
          key: 'rate-limit-error', // Prevent duplicate messages
        });
        return;
      }

      // Network error
      if (!error.response) {
        message.error({
          content: 'ERRO DE CONEXÃO: Não foi possível salvar a presença. Verifique sua internet.',
          duration: 8,
          key: 'network-error',
        });
        return;
      }

      const errorMsg = error.response?.data?.error || 'Erro ao atualizar presença';
      message.error(errorMsg);
    },
  });
}

/**
 * Update candidate apelido_meet
 * CRITICAL: Shows persistent error for rate limiting (429) to prevent silent failures
 */
export function useUpdateApelido() {
  const queryClient = useQueryClient();

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      mutateAsync: async () => { throw new Error('Cannot mutate on server'); },
      mutate: () => {},
      isPending: false,
      isError: false,
      error: null,
    };
  }

  return useMutation({
    mutationFn: async ({ id, apelido_meet }) => {
      const response = await api.patch(`/evento/monitor/applications/${id}/apelido`, {
        apelido_meet,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalizacaoKeys.monitor() });
    },
    onError: (error) => {
      const status = error.response?.status;
      const retryAfter = error.response?.data?.retryAfter;

      // CRITICAL: Rate limit error - show persistent warning
      if (status === 429) {
        message.error({
          content: `ATENÇÃO: Sistema sobrecarregado! O apelido NÃO foi salvo. Aguarde ${retryAfter || 60} segundos e tente novamente.`,
          duration: 10,
          key: 'rate-limit-error',
        });
        return;
      }

      // Network error
      if (!error.response) {
        message.error({
          content: 'ERRO DE CONEXÃO: Não foi possível salvar o apelido. Verifique sua internet.',
          duration: 8,
          key: 'network-error',
        });
        return;
      }

      const errorMsg = error.response?.data?.error || 'Erro ao atualizar apelido';
      message.error(errorMsg);
    },
  });
}

/**
 * Start exam (process attendance and move candidates in Gupy)
 * CRITICAL: Shows persistent error for rate limiting (429) to prevent silent failures
 */
export function useIniciarProva() {
  const queryClient = useQueryClient();

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      mutateAsync: async () => { throw new Error('Cannot mutate on server'); },
      mutate: () => {},
      isPending: false,
      isError: false,
      error: null,
    };
  }

  return useMutation({
    mutationFn: async ({ idEvent, room }) => {
      const response = await api.post(`/evento/monitor/${idEvent}/iniciar-prova`, {
        room,
      });
      return response.data;
    },
    onSuccess: (data) => {
      message.success(
        `Prova iniciada! ${data.presentes} presente(s), ${data.ausentes} ausente(s)`
      );
      // Invalidate all monitor and dashboard queries
      queryClient.invalidateQueries({ queryKey: fiscalizacaoKeys.all });
      queryClient.invalidateQueries({ queryKey: eventoKeys.dashboard() });
    },
    onError: (error) => {
      const status = error.response?.status;
      const retryAfter = error.response?.data?.retryAfter;

      // CRITICAL: Rate limit error
      if (status === 429) {
        message.error({
          content: `ATENÇÃO: Sistema sobrecarregado! Não foi possível iniciar a prova. Aguarde ${retryAfter || 60} segundos e tente novamente.`,
          duration: 10,
          key: 'rate-limit-error',
        });
        return;
      }

      // Network error
      if (!error.response) {
        message.error({
          content: 'ERRO DE CONEXÃO: Não foi possível iniciar a prova. Verifique sua internet.',
          duration: 8,
          key: 'network-error',
        });
        return;
      }

      const errorMsg = error.response?.data?.error || 'Erro ao iniciar prova';
      message.error(errorMsg);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch reports for an event_application
 */
export function useApplicationReports(idEventApplication, enabled = true) {
  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      data: null,
      reports: [],
      candidate_name: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: async () => {},
    };
  }

  const query = useQuery({
    queryKey: fiscalizacaoKeys.applicationReports(idEventApplication),
    queryFn: async () => {
      const response = await api.get(`/evento/reports/${idEventApplication}`);
      return response.data;
    },
    enabled: enabled && !!idEventApplication,
    staleTime: 30000, // 30 seconds
  });

  return {
    data: query.data,
    reports: query.data?.reports || [],
    candidate_name: query.data?.candidate_name,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Create occurrence report
 * CRITICAL: Shows persistent error for rate limiting (429) to prevent silent failures
 */
export function useCreateReport() {
  const queryClient = useQueryClient();

  // SSR Guard
  if (typeof window === 'undefined') {
    return {
      mutateAsync: async () => { throw new Error('Cannot mutate on server'); },
      mutate: () => {},
      isPending: false,
      isError: false,
      error: null,
    };
  }

  return useMutation({
    mutationFn: async ({ id_event_application, type, description }) => {
      const response = await api.post('/evento/reports', {
        id_event_application,
        type,
        description,
      });
      return response.data;
    },
    onSuccess: (data) => {
      const tagMsg = data.gupy_tag_created ? ` (Tag "${data.gupy_tag}" adicionada)` : '';
      message.success(`Ocorrência registrada com sucesso${tagMsg}`);
      // Invalidate reports
      queryClient.invalidateQueries({ queryKey: fiscalizacaoKeys.reports() });
    },
    onError: (error) => {
      const status = error.response?.status;
      const retryAfter = error.response?.data?.retryAfter;

      // CRITICAL: Rate limit error - show persistent warning
      if (status === 429) {
        message.error({
          content: `ATENÇÃO: Sistema sobrecarregado! A ocorrência NÃO foi registrada. Aguarde ${retryAfter || 60} segundos e tente novamente.`,
          duration: 10,
          key: 'rate-limit-error',
        });
        return;
      }

      // Network error
      if (!error.response) {
        message.error({
          content: 'ERRO DE CONEXÃO: Não foi possível registrar a ocorrência. Verifique sua internet.',
          duration: 8,
          key: 'network-error',
        });
        return;
      }

      const errorMsg = error.response?.data?.error || 'Erro ao registrar ocorrência';
      message.error(errorMsg);
    },
  });
}

export default {
  // Query keys factory
  fiscalizacaoKeys,
  // Monitor
  useMonitorRooms,
  useMonitorCandidates,
  useTogglePresence,
  useUpdateApelido,
  useIniciarProva,
  // Reports
  useApplicationReports,
  useCreateReport,
};
