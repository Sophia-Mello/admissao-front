/**
 * useCandidatoHub Hook
 *
 * React Query hook for the Candidato Hub page.
 * Uses mutation for CPF+email lookup that fetches from both
 * Prova Online and Aula Teste systems in parallel.
 */

import { useMutation } from '@tanstack/react-query';
import { lookupAll } from '../lib/services/candidatoService';

/**
 * Query keys factory for candidato hub
 */
export const candidatoHubKeys = {
  all: ['candidato-hub'],
  lookup: (cpf) => ['candidato-hub', 'lookup', cpf],
};

/**
 * Hook for candidate lookup mutation
 *
 * @param {Object} options - React Query mutation options
 * @returns {Object} - { mutate, mutateAsync, data, isPending, isSuccess, isError, error, reset }
 *
 * @example
 * const { mutate, isPending, data, error } = useCandidatoLookup({
 *   onSuccess: (data) => console.log('Found:', data),
 *   onError: (err) => console.error('Error:', err),
 * });
 *
 * // Trigger lookup
 * mutate({ cpf: '12345678901', email: 'test@email.com' });
 *
 * // data structure:
 * // {
 * //   success: true,
 * //   candidate: { nome: 'João' },
 * //   prova: { success: true, applications: [...] },
 * //   aulaTeste: { success: true, applications: [...] },
 * //   hasPartialError: false,
 * //   error: null,
 * // }
 */
export function useCandidatoLookup(options = {}) {
  return useMutation({
    mutationFn: async ({ cpf, email }) => {
      // Validate inputs
      if (!cpf || cpf.length !== 11) {
        throw new Error('CPF deve ter 11 dígitos');
      }
      if (!email || !email.includes('@')) {
        throw new Error('Email inválido');
      }

      return lookupAll(cpf, email);
    },
    ...options,
  });
}

export default useCandidatoLookup;
