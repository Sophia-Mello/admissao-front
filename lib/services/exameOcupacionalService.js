// lib/services/exameOcupacionalService.js

import api from '../api';

/**
 * Exame Ocupacional Service Layer
 *
 * Service for managing occupational exam candidates with Kanban interface.
 * Provides methods for:
 * - Listing candidates with filters
 * - Getting summary counts by status
 * - Updating candidate status
 * - Exporting to CSV
 * - Importing candidates via API
 */

// ===================================
// List & Search APIs
// ===================================

/**
 * Get candidates list with filters and pagination
 *
 * @param {Object} params - Query parameters
 * @param {string} [params.status] - Comma-separated status filter
 * @param {string} [params.search] - Search by name or CPF
 * @param {string} [params.cargo] - Filter by cargo (partial match)
 * @param {number} [params.empresa] - Filter by empresa (1 = Tom, 2 = APG)
 * @param {number} [params.limit=100] - Max results
 * @param {number} [params.offset=0] - Offset for pagination
 * @returns {Promise<Object>} { success, data: [...], pagination: { limit, offset, total } }
 *
 * Note: Each candidate in data[] includes `dias_no_status` (days since last status change)
 * and `empresa` (1 = Tom, 2 = APG)
 */
export async function getCandidatos(params = {}) {
  const response = await api.get('/exame-ocupacional', { params });
  return response.data;
}

/**
 * Get distinct cargos list for filter dropdown
 *
 * @returns {Promise<Object>} { success, data: ['cargo1', 'cargo2', ...] }
 */
export async function getCargos() {
  const response = await api.get('/exame-ocupacional/cargos');
  return response.data;
}

/**
 * Get candidate by ID
 *
 * @param {number} id - Candidate ID
 * @returns {Promise<Object>} { success, data: { ... } }
 */
export async function getCandidatoById(id) {
  const response = await api.get(`/exame-ocupacional/${id}`);
  return response.data;
}

// ===================================
// Summary APIs
// ===================================

/**
 * Get summary counts by status
 * Accepts optional filters to reflect the filtered state of the UI
 *
 * @param {Object} params - Query parameters (optional)
 * @param {number} [params.empresa] - Filter by empresa (1 = Tom, 2 = APG)
 * @param {string} [params.cargo] - Filter by cargo (partial match)
 * @param {string} [params.search] - Search by name or CPF
 * @returns {Promise<Object>} {
 *   success,
 *   data: {
 *     pendentes: number,
 *     agendados: number,
 *     concluidos: number,
 *     detalhado: { pendente, agendado, compareceu, faltou, aprovado, reprovado }
 *   }
 * }
 */
export async function getSummary(params = {}) {
  const response = await api.get('/exame-ocupacional/summary', { params });
  return response.data;
}

// ===================================
// Status Update APIs
// ===================================

/**
 * Update candidate status
 *
 * @param {number} id - Candidate ID
 * @param {Object} payload - Status update payload
 * @param {string} payload.status - New status (pendente, agendado, compareceu, faltou, aprovado, reprovado)
 * @param {string} [payload.agendado_para] - ISO8601 datetime (required if status = 'agendado')
 * @param {string} [payload.observacoes] - Optional notes
 * @returns {Promise<Object>} { success, data: { ... } }
 */
export async function updateStatus(id, payload) {
  const response = await api.patch(`/exame-ocupacional/${id}/status`, payload);
  return response.data;
}

// ===================================
// Import/Export APIs
// ===================================

/**
 * Import batch of candidates
 *
 * @param {Array<Object>} candidatos - Array of candidates to import
 * @param {string} candidatos[].nome - Candidate name
 * @param {string} candidatos[].cpf - CPF (11 digits)
 * @param {string} candidatos[].jobId - Gupy job ID
 * @param {string} candidatos[].applicationId - Gupy application ID
 * @param {string} [candidatos[].cargo] - Position
 * @param {boolean} [candidatos[].pcd] - Person with disability flag
 * @param {string} [candidatos[].endereco] - Address
 * @param {string} [candidatos[].telefone] - Phone
 * @param {string} [candidatos[].email] - Email
 * @returns {Promise<Object>} { success, data: { importados, duplicados, erros } }
 */
export async function importCandidatos(candidatos) {
  const response = await api.post('/exame-ocupacional/import', candidatos);
  return response.data;
}

/**
 * Get CSV export URL
 * Returns the URL to download CSV file
 *
 * @param {Object} [params] - Optional filters
 * @param {string} [params.status] - Comma-separated status filter
 * @param {string} [params.search] - Search by name or CPF
 * @returns {string} URL for CSV download
 */
export function getExportUrl(params = {}) {
  const baseUrl = api.defaults.baseURL || '';
  const queryParams = new URLSearchParams();

  if (params.status) {
    queryParams.set('status', params.status);
  }
  if (params.search) {
    queryParams.set('search', params.search);
  }

  const queryString = queryParams.toString();
  return `${baseUrl}/exame-ocupacional/export${queryString ? `?${queryString}` : ''}`;
}

/**
 * Download CSV export
 * Triggers browser download of CSV file
 *
 * @param {Object} [params] - Optional filters
 * @param {string} [params.status] - Comma-separated status filter
 * @param {string} [params.search] - Search by name or CPF
 */
export async function downloadExport(params = {}) {
  const response = await api.get('/exame-ocupacional/export', {
    params,
    responseType: 'blob'
  });

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;

  // Get filename from Content-Disposition header or use default
  const contentDisposition = response.headers['content-disposition'];
  let filename = 'exames-ocupacionais.csv';
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match) {
      filename = match[1];
    }
  }

  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// ===================================
// Delete APIs
// ===================================

/**
 * Soft delete candidate
 *
 * @param {number} id - Candidate ID
 * @returns {Promise<Object>} { success, message }
 */
export async function deleteCandidato(id) {
  const response = await api.delete(`/exame-ocupacional/${id}`);
  return response.data;
}

// ===================================
// Constants
// ===================================

export const KANBAN_STATUSES = [
  { key: 'pendente', label: 'Pendente', color: '#faad14' },
  { key: 'agendado', label: 'Agendado', color: '#1890ff' },
  { key: 'compareceu', label: 'Compareceu', color: '#52c41a' },
  { key: 'faltou', label: 'Faltou', color: '#ff4d4f' },
  { key: 'aprovado', label: 'Aprovado', color: '#52c41a' },
  { key: 'reprovado', label: 'Reprovado', color: '#ff4d4f' }
];

export const STATUS_GROUPS = {
  pendentes: ['pendente'],
  agendados: ['agendado'],
  concluidos: ['compareceu', 'faltou', 'aprovado', 'reprovado']
};

// Empresas: 1 = Tom, 2 = APG
export const EMPRESAS = [
  { value: 1, label: 'Tom', color: '#1890ff' },
  { value: 2, label: 'APG', color: '#52c41a' }
];

/**
 * Get empresa label by value
 * @param {number} empresa - 1 or 2
 * @returns {string} 'Tom' or 'APG'
 */
export function getEmpresaLabel(empresa) {
  if (empresa === 1) return 'Tom';
  if (empresa === 2) return 'APG';
  return 'Tom'; // Default
}

/**
 * Get empresa color by value
 * @param {number} empresa - 1 or 2
 * @returns {string} hex color
 */
export function getEmpresaColor(empresa) {
  if (empresa === 1) return '#1890ff'; // Blue for Tom
  if (empresa === 2) return '#52c41a'; // Green for APG
  return '#1890ff'; // Default
}
