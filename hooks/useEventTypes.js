/**
 * useEventTypes.js - Hooks for Event Types management
 *
 * Provides React Query hooks for managing dynamic event types.
 * Event types configure which Gupy templates can schedule and which calendar to use.
 *
 * API Endpoints:
 * - GET /admin/event-types - List all event types
 * - GET /admin/event-types/:id - Get single event type
 * - POST /admin/event-types - Create event type
 * - PUT /admin/event-types/:id - Update event type
 * - DELETE /admin/event-types/:id - Soft delete (set ativo=false)
 * - POST /admin/event-types/:id/templates - Add templates to event type
 * - DELETE /admin/event-types/:id/templates/:templateId - Remove template
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import api from '../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// SSR CHECK
// ─────────────────────────────────────────────────────────────────────────────

const isClient = typeof window !== 'undefined';

// ─────────────────────────────────────────────────────────────────────────────
// QUERY KEYS FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export const eventTypeKeys = {
  all: ['event-types'],
  list: () => [...eventTypeKeys.all, 'list'],
  detail: (id) => [...eventTypeKeys.all, 'detail', id],
};

// ─────────────────────────────────────────────────────────────────────────────
// LIST HOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all active event types with their templates
 */
export function useEventTypes(enabled = true) {
  const query = useQuery({
    queryKey: eventTypeKeys.list(),
    queryFn: async () => {
      const response = await api.get('/admin/event-types');
      return response.data;
    },
    enabled: enabled && isClient,
    staleTime: 5 * 60 * 1000, // 5 minutes (matches backend cache TTL)
  });

  return {
    data: query.data,
    eventTypes: query.data?.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL HOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch single event type by ID with templates
 */
export function useEventType(id, enabled = true) {
  const query = useQuery({
    queryKey: eventTypeKeys.detail(id),
    queryFn: async () => {
      const response = await api.get(`/admin/event-types/${id}`);
      return response.data;
    },
    enabled: enabled && isClient && !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: query.data,
    eventType: query.data?.data || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new event type
 */
export function useCreateEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      // payload: { display_name, calendar_id?, templates?: [] }
      const response = await api.post('/admin/event-types', payload);
      return response.data;
    },
    onSuccess: (data) => {
      message.success(data.message || 'Tipo de evento criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: eventTypeKeys.all });
    },
    onError: (error) => {
      const errorData = error.response?.data;
      const errorCode = errorData?.code;

      if (errorCode === 'DUPLICATE_CODE') {
        message.error('Já existe um tipo de evento com este nome');
      } else if (errorCode === 'TEMPLATE_ALREADY_ASSIGNED') {
        message.error(errorData.error || 'Template já está associado a outro tipo');
      } else {
        message.error(errorData?.error || 'Erro ao criar tipo de evento');
      }
    },
  });
}

/**
 * Update an existing event type
 */
export function useUpdateEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      // updates: { display_name?, calendar_id? }
      const response = await api.put(`/admin/event-types/${id}`, updates);
      return response.data;
    },
    onSuccess: (data) => {
      message.success(data.message || 'Tipo de evento atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: eventTypeKeys.all });
    },
    onError: (error) => {
      const errorData = error.response?.data;
      const errorCode = errorData?.code;

      if (errorCode === 'DUPLICATE_CODE') {
        message.error('Já existe outro tipo de evento com este nome');
      } else if (errorCode === 'INVALID_NAME') {
        message.error('Nome inválido - não foi possível gerar código');
      } else {
        message.error(errorData?.error || 'Erro ao atualizar tipo de evento');
      }
    },
  });
}

/**
 * Delete (soft delete) an event type
 */
export function useDeleteEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/admin/event-types/${id}`);
      return response.data;
    },
    onSuccess: () => {
      message.success('Tipo de evento desativado com sucesso!');
      queryClient.invalidateQueries({ queryKey: eventTypeKeys.all });
    },
    onError: (error) => {
      message.error(error.response?.data?.error || 'Erro ao desativar tipo de evento');
    },
  });
}

/**
 * Add templates to an event type
 */
export function useAddTemplatesToEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, templates }) => {
      // templates: [{ id_template_gupy, template_name? }]
      const response = await api.post(`/admin/event-types/${id}/templates`, { templates });
      return response.data;
    },
    onSuccess: (data) => {
      const added = data.added?.length || 0;
      const skipped = data.skipped?.length || 0;
      if (added > 0) {
        message.success(`${added} template(s) adicionado(s)${skipped > 0 ? ` (${skipped} já existia(m))` : ''}`);
      } else if (skipped > 0) {
        message.info('Template(s) já estava(m) associado(s)');
      }
      queryClient.invalidateQueries({ queryKey: eventTypeKeys.all });
    },
    onError: (error) => {
      const errorData = error.response?.data;
      const errorCode = errorData?.code;

      if (errorCode === 'TEMPLATE_ALREADY_ASSIGNED') {
        message.error(errorData.error || 'Template já está associado a outro tipo de evento');
      } else {
        message.error(errorData?.error || 'Erro ao adicionar templates');
      }
    },
  });
}

/**
 * Remove a template from an event type
 */
export function useRemoveTemplateFromEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventTypeId, templateId }) => {
      const response = await api.delete(`/admin/event-types/${eventTypeId}/templates/${templateId}`);
      return response.data;
    },
    onSuccess: () => {
      message.success('Template removido com sucesso!');
      queryClient.invalidateQueries({ queryKey: eventTypeKeys.all });
    },
    onError: (error) => {
      message.error(error.response?.data?.error || 'Erro ao remover template');
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  eventTypeKeys,
  useEventTypes,
  useEventType,
  useCreateEventType,
  useUpdateEventType,
  useDeleteEventType,
  useAddTemplatesToEventType,
  useRemoveTemplateFromEventType,
};
