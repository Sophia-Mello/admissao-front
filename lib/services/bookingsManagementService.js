// lib/services/bookingsManagementService.js

import api from '../api';

/**
 * Bookings Management Service Layer
 *
 * Service for admin bookings management operations.
 * Provides methods for:
 * - Manual booking creation
 * - Booking cancellation
 * - Slot blocking
 * - d_rule (min/max days advance) management
 * - Time slots configuration
 */

// ===================================
// Bookings List APIs
// ===================================

/**
 * Get bookings for a unit and date range
 *
 * @param {number} id_unidade - Unit ID
 * @param {string} start_date - Start date (YYYY-MM-DD)
 * @param {string} end_date - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} { success, bookings: [...] }
 * @throws {Error} 400 if validation fails, 500 if server error
 */
export async function getBookings(id_unidade, start_date, end_date) {
  const response = await api.get('/admin/bookings', {
    params: { id_unidade, start_date, end_date }
  });

  return response.data;
}

// ===================================
// Availability APIs
// ===================================

/**
 * Get availability for admin view (calendar week)
 *
 * Uses the same /availability endpoint as public, but with auth token
 * Backend returns more data when authenticated (config details, all slot statuses)
 *
 * @param {number} id_unidade - Unit ID
 * @param {string} start_date - Start date YYYY-MM-DD (not used - backend calculates from page)
 * @param {string} end_date - End date YYYY-MM-DD (not used - backend calculates from page)
 * @returns {Promise<Object>} { success, slots: [{ date, slot_start, slot_end, status }], pagination }
 * @throws {Error} 404 if unit not found, 500 if server error
 */
export async function getAvailability(id_unidade, start_date, end_date) {
  const response = await api.get('/availability', {
    params: { id_unidade }
  });

  // Transform response to match expected format (days grouped by date)
  const slots = response.data.slots || [];
  const daysByDate = {};

  slots.forEach(slot => {
    if (!daysByDate[slot.date]) {
      daysByDate[slot.date] = {
        date: slot.date,
        day_of_week: slot.day_of_week,
        slots: []
      };
    }
    daysByDate[slot.date].slots.push(slot);
  });

  return {
    success: true,
    days: Object.values(daysByDate),
    pagination: response.data.pagination,
    config: response.data.config
  };
}

// ===================================
// Candidate Search
// ===================================

/**
 * Search candidates by CPF within a unit
 *
 * @param {string} cpf - Candidate CPF (digits only or formatted)
 * @param {number} id_unidade - Unit ID to search within
 * @returns {Promise<Object>} { success, candidates: [...] }
 * @throws {Error} 400 if validation fails, 404 if not found, 500 if server error
 */
export async function searchCandidatesByCPF(cpf, id_unidade) {
  // Remove formatting from CPF (keep only digits)
  const cleanCPF = cpf.replace(/\D/g, '');

  const response = await api.get('/admin/bookings/candidates/search-by-cpf', {
    params: { cpf: cleanCPF, id_unidade }
  });

  return response.data;
}

// ===================================
// Booking Management
// ===================================

/**
 * Create manual booking (admin only)
 *
 * Backend accepts either:
 * - id_job_unidade directly
 * - OR id_unidade + jobId (resolves id_job_unidade internally)
 *
 * @param {Object} payload
 * @param {string} payload.jobId - Gupy job ID
 * @param {string} payload.applicationId - Gupy application ID
 * @param {number} payload.id_unidade - Unit ID (backend resolves id_job_unidade)
 * @param {number} payload.id_job_unidade - Job unit ID (optional if id_unidade + jobId provided)
 * @param {string} payload.start_at - ISO 8601 datetime
 * @param {string} payload.end_at - ISO 8601 datetime
 * @returns {Promise<Object>} { success, data: { booking, unidade, job_name, rubrica_url } }
 * @throws {Error} 400 if validation fails, 409 if slot taken
 */
export async function createManualBooking(payload) {
  const response = await api.post('/booking', payload);

  return response.data;
}

/**
 * Cancel booking
 *
 * @param {number} id_booking - Booking ID
 * @param {string} cancel_reason - Reason for cancellation
 * @returns {Promise<Object>} { success, message }
 * @throws {Error} 404 if booking not found, 400 if already cancelled
 */
export async function cancelBooking(id_booking, cancel_reason) {
  const response = await api.patch(`/admin/bookings/${id_booking}/cancel`, {
    cancel_reason
  });

  return response.data;
}

// ===================================
// Slot Blocking
// ===================================

/**
 * Create slot block
 *
 * @param {Object} payload
 * @param {number} payload.id_unidade - Unit ID
 * @param {string} payload.start_day - Start date YYYY-MM-DD (REQUIRED)
 * @param {string} payload.end_day - End date YYYY-MM-DD (REQUIRED)
 * @param {string} payload.blocked_start_at - Start time in HH:MM format
 * @param {string} payload.blocked_end_at - End time in HH:MM format
 * @returns {Promise<Object>} { success, message, blocked_range }
 * @throws {Error} 400 if validation fails, 409 if slot occupied with bookings
 */
export async function createSlotBlock(payload) {
  const response = await api.post('/admin/bookings/slot-blocks', payload);

  return response.data;
}

/**
 * Delete slot block
 *
 * @param {number} id_slot_block - Slot block ID
 * @returns {Promise<Object>} { success, message }
 * @throws {Error} 404 if not found
 */
export async function deleteSlotBlock(id_slot_block) {
  const response = await api.delete(`/admin/slot-blocks/${id_slot_block}`);

  return response.data;
}

// ===================================
// d_rule Management
// ===================================

/**
 * Get d_rule for unit
 *
 * @param {number} id_unidade - Unit ID
 * @returns {Promise<Object>} { success, d_rule: { d_rule_start, d_rule_end, start_day, end_day } | null }
 * @throws {Error} 404 if unit not found
 */
export async function getDRule(id_unidade) {
  const response = await api.get(`/admin/bookings/d_rules/${id_unidade}`);

  return response.data;
}

/**
 * Save (create or update) d_rule
 *
 * @param {Object} payload
 * @param {number} payload.id_unidade - Unit ID
 * @param {number} payload.d_rule_start - Minimum days in advance
 * @param {number} payload.d_rule_end - Maximum days in advance
 * @param {string} payload.start_day - Start date YYYY-MM-DD (optional)
 * @param {string} payload.end_day - End date YYYY-MM-DD (optional)
 * @returns {Promise<Object>} { success, d_rule }
 * @throws {Error} 400 if validation fails
 */
export async function saveDRule(payload) {
  const { id_unidade, d_rule_start, d_rule_end, start_day, end_day } = payload;
  const response = await api.patch(`/admin/bookings/d_rules/${id_unidade}`, {
    d_rule_start,
    d_rule_end,
    start_day,
    end_day,
  });

  return response.data;
}

/**
 * Delete d_rule (revert to default)
 *
 * @param {number} id_unidade - Unit ID
 * @returns {Promise<Object>} { success, message }
 * @throws {Error} 404 if not found
 */
export async function deleteDRule(id_unidade) {
  const response = await api.delete(`/admin/bookings/d_rules/${id_unidade}`);

  return response.data;
}

// ===================================
// Time Slots Management
// ===================================

/**
 * Get time slots for unit
 *
 * @param {number} id_unidade - Unit ID
 * @returns {Promise<Object>} { success, slot_config: { morning_start, morning_end, afternoon_start, afternoon_end, slot_duration, start_day, end_day } | null }
 * @throws {Error} 404 if unit not found
 */
export async function getTimeSlots(id_unidade) {
  const response = await api.get(`/admin/bookings/slots/${id_unidade}`);
  return response.data;
}

/**
 * Save (create or update) time slots
 *
 * @param {Object} payload
 * @param {number} payload.id_unidade - Unit ID
 * @param {string} payload.morning_start - Morning start time (HH:mm)
 * @param {string} payload.morning_end - Morning end time (HH:mm)
 * @param {string} payload.afternoon_start - Afternoon start time (HH:mm)
 * @param {string} payload.afternoon_end - Afternoon end time (HH:mm)
 * @param {number} payload.slot_duration - Slot duration in minutes
 * @param {string} payload.start_day - Start date YYYY-MM-DD (optional)
 * @param {string} payload.end_day - End date YYYY-MM-DD (optional)
 * @returns {Promise<Object>} { success, slot_config }
 * @throws {Error} 400 if validation fails
 */
export async function saveTimeSlots(payload) {
  const { id_unidade, ...slotData } = payload;
  const response = await api.patch(`/admin/bookings/slots/${id_unidade}`, slotData);

  return response.data;
}

/**
 * Delete time slots (revert to default)
 *
 * @param {number} id_unidade - Unit ID
 * @returns {Promise<Object>} { success, message }
 * @throws {Error} 404 if not found
 */
export async function deleteTimeSlots(id_unidade) {
  const response = await api.delete(`/admin/bookings/slots/${id_unidade}`);

  return response.data;
}
