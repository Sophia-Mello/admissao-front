// lib/bookingService.js
//
// Booking Service - Public candidate booking flow
//
// Flow:
// 1. validateSession() - Check candidate eligibility via Gupy
// 2. getUnidades() - Get units available for the job
// 3. getAvailability() - Get available slots for a unit
// 4. createBooking() - Confirm booking

import api from './api';

/**
 * 1. Validate candidate eligibility
 *
 * Checks via Gupy API:
 * - Candidate is in "Aula Teste" stage
 * - Candidate has no no-show history
 *
 * @param {string} jobId - Gupy job ID
 * @param {string} applicationId - Gupy application ID
 * @returns {Promise<Object>} { success, eligible, candidate, job, active_booking }
 */
export async function validateSession(jobId, applicationId) {
  const response = await api.get('/auth/validate-application', {
    params: { jobId, applicationId }
  });
  return response.data;
}

/**
 * 2. Get available units for a job
 *
 * @param {string} jobId - Gupy job ID (id_job_gupy)
 * @returns {Promise<Object>} { success, job_name, unidades }
 */
export async function getUnidades(jobId) {
  const response = await api.get('/job', {
    params: {
      id_job_gupy: jobId,
      include: 'unidades',
      ativo: true
    }
  });

  const jobs = response.data.data || [];
  if (jobs.length === 0) {
    throw new Error('Vaga não encontrada');
  }

  const job = jobs[0];

  // Transform unidades to expected format
  const unidades = (job.unidades || []).map(u => ({
    id_job_unidade: u.id_job_unidade,
    id_unidade: u.id_unidade,
    nome_unidade: u.nome_unidade,
    endereco: u.endereco_unidade || u.endereco || ''
  }));

  return {
    success: true,
    job_name: job.job_name,
    unidades
  };
}

/**
 * 3. Get available slots for a unit
 *
 * @param {string} jobId - Gupy job ID (not used, kept for compatibility)
 * @param {string} applicationId - Gupy application ID (not used, kept for compatibility)
 * @param {number} id_job_unidade - Job-Unit junction ID
 * @param {number} id_unidade - Unit ID for availability query
 * @param {number} page - Page number (1 page = 1 week)
 * @returns {Promise<Object>} { success, id_job_unidade, slots, config, pagination }
 */
export async function getAvailability(jobId, applicationId, id_job_unidade, id_unidade, page = 1) {
  const response = await api.get('/availability', {
    params: { id_unidade, page }
  });

  return {
    success: true,
    id_job_unidade,
    ...response.data
  };
}

/**
 * 4. Create booking
 *
 * @param {Object} payload
 * @param {number} payload.id_unidade - Unit ID
 * @param {string} payload.id_job_gupy - Gupy job ID
 * @param {string} payload.id_application_gupy - Gupy application ID
 * @param {string} payload.start_at - ISO 8601 datetime
 * @param {string} payload.end_at - ISO 8601 datetime
 * @returns {Promise<Object>} { success, data: { booking, unidade, job_name } }
 */
export async function createBooking(payload) {
  const response = await api.post('/booking', {
    id_unidade: payload.id_unidade,
    id_job_gupy: payload.id_job_gupy,
    id_application_gupy: payload.id_application_gupy,
    start_at: payload.start_at,
    end_at: payload.end_at,
  });

  return response.data;
}
