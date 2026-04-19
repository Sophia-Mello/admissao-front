/**
 * Candidato Hub Service
 *
 * Unified service for candidate lookup across both scheduling systems:
 * - Prova Online (evento/applications)
 * - Aula Teste (booking)
 *
 * Uses single consolidated endpoint that checks Gupy stage once per application.
 */

import api from '../api';

/**
 * Lookup candidate applications across both scheduling systems
 *
 * Uses the consolidated /candidato/lookup endpoint that:
 * 1. Searches candidate + applications in LOCAL database
 * 2. Checks Gupy stage ONCE per application
 * 3. Routes to Prova Online or Aula Teste based on stage
 *
 * @param {string} cpf - CPF (11 digits, numbers only)
 * @param {string} email - Candidate email
 * @returns {Promise<Object>} Combined results from both systems
 */
export async function lookupAll(cpf, email) {
  const response = await api.post('/candidato/lookup', { cpf, email });
  return response.data;
}
