import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useApplications, useSyncApplications, fetchAllApplicationIds } from '../useApplications'

// Mock the api module
jest.mock('../../lib/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
}))

import api from '../../lib/api'

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useApplications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch applications successfully', async () => {
    const mockData = {
      data: [
        { id: 1, candidate_nome: 'Test User', status_application: 'in_progress' },
        { id: 2, candidate_nome: 'Another User', status_application: 'hired' },
      ],
      total: 2,
      limit: 50,
      offset: 0,
    }

    api.get.mockResolvedValueOnce({ data: mockData })

    const { result } = renderHook(() => useApplications(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data.applications).toHaveLength(2)
    expect(result.current.data.total).toBe(2)
    expect(api.get).toHaveBeenCalledWith('/applications', { params: {} })
  })

  it('should pass filter params to API', async () => {
    const mockData = { data: [], total: 0, limit: 50, offset: 0 }
    api.get.mockResolvedValueOnce({ data: mockData })

    const filters = {
      template: 'Professor',
      subregional: 1,
      stepStatus: 'approved',
      search: 'test',
      limit: 25,
      offset: 50,
    }

    const { result } = renderHook(() => useApplications(filters), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.get).toHaveBeenCalledWith('/applications', {
      params: {
        template: 'Professor',
        subregional: 1,
        stepStatus: 'approved',
        search: 'test',
        limit: 25,
        offset: 50,
      },
    })
  })

  it('should throw error when API returns success: false', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    api.get.mockResolvedValueOnce({
      data: { success: false, error: 'Database connection failed' },
    })

    const { result } = renderHook(() => useApplications(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.message).toBe('Database connection failed')
    expect(consoleSpy).toHaveBeenCalledWith(
      '[useApplications] API returned error:',
      'Database connection failed'
    )

    consoleSpy.mockRestore()
  })

  it('should throw error when data format is invalid', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    api.get.mockResolvedValueOnce({
      data: { data: 'not an array' },
    })

    const { result } = renderHook(() => useApplications(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.message).toBe('Formato de resposta inválido do servidor')
    expect(consoleSpy).toHaveBeenCalledWith(
      '[useApplications] Invalid response format:',
      expect.objectContaining({ dataType: 'string' })
    )

    consoleSpy.mockRestore()
  })

  it('should handle network errors', async () => {
    api.get.mockRejectedValueOnce(new Error('Network Error'))

    const { result } = renderHook(() => useApplications(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.message).toBe('Network Error')
  })

  it('should respect enabled option', async () => {
    const { result } = renderHook(
      () => useApplications({}, { enabled: false }),
      { wrapper: createWrapper() }
    )

    // Should not fetch when disabled
    expect(api.get).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isFetching).toBe(false)
  })
})

describe('useSyncApplications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should sync applications successfully', async () => {
    api.post.mockResolvedValueOnce({
      data: { success: true, synced: 10 },
    })

    const { result } = renderHook(() => useSyncApplications(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({ template: 'Professor' })

    expect(api.post).toHaveBeenCalledWith(
      '/applications/sync?template=Professor',
      null,
      { timeout: 120000 }
    )
  })

  it('should handle sync errors and log them', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const error = new Error('Sync failed')
    error.response = { data: { error: 'Gupy API error' } }
    api.post.mockRejectedValueOnce(error)

    const { result } = renderHook(() => useSyncApplications(), {
      wrapper: createWrapper(),
    })

    await expect(result.current.mutateAsync({})).rejects.toThrow('Sync failed')

    expect(consoleSpy).toHaveBeenCalledWith(
      '[useSyncApplications] Sync failed:',
      expect.objectContaining({
        error: 'Sync failed',
        response: { error: 'Gupy API error' },
      })
    )

    consoleSpy.mockRestore()
  })
})

describe('fetchAllApplicationIds', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch all application IDs successfully', async () => {
    const mockIds = [1, 2, 3, 4, 5]
    api.get.mockResolvedValueOnce({ data: { data: mockIds } })

    const result = await fetchAllApplicationIds({})

    expect(result).toEqual([1, 2, 3, 4, 5])
    expect(api.get).toHaveBeenCalledWith('/applications/ids', { params: {} })
  })

  it('should pass filter params to API', async () => {
    const mockIds = [1, 2]
    api.get.mockResolvedValueOnce({ data: { data: mockIds } })

    const filters = {
      template: 'Professor',
      subregional: 1,
      step: 'Entrevista',
      stepStatus: 'done',
      statusApplication: 'in_progress',
      search: 'joao',
    }

    await fetchAllApplicationIds(filters)

    expect(api.get).toHaveBeenCalledWith('/applications/ids', {
      params: {
        template: 'Professor',
        subregional: 1,
        step: 'Entrevista',
        stepStatus: 'done',
        statusApplication: 'in_progress',
        search: 'joao',
      },
    })
  })

  it('should throw error when API returns success: false', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    api.get.mockResolvedValueOnce({
      data: { success: false, error: 'Database error' },
    })

    await expect(fetchAllApplicationIds({})).rejects.toThrow('Database error')

    expect(consoleSpy).toHaveBeenCalledWith(
      '[fetchAllApplicationIds] API returned error:',
      'Database error'
    )

    consoleSpy.mockRestore()
  })

  it('should throw error when response format is invalid', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    api.get.mockResolvedValueOnce({
      data: { data: 'not an array' },
    })

    await expect(fetchAllApplicationIds({})).rejects.toThrow(
      'Formato de resposta inválido ao buscar IDs de candidaturas'
    )

    expect(consoleSpy).toHaveBeenCalledWith(
      '[fetchAllApplicationIds] Invalid response format:',
      expect.objectContaining({
        expectedType: 'array',
        actualType: 'string',
      })
    )

    consoleSpy.mockRestore()
  })

  it('should throw error when data is null', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    api.get.mockResolvedValueOnce({
      data: { data: null },
    })

    await expect(fetchAllApplicationIds({})).rejects.toThrow(
      'Formato de resposta inválido ao buscar IDs de candidaturas'
    )

    consoleSpy.mockRestore()
  })

  it('should throw error when data is undefined', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    api.get.mockResolvedValueOnce({
      data: {},
    })

    await expect(fetchAllApplicationIds({})).rejects.toThrow(
      'Formato de resposta inválido ao buscar IDs de candidaturas'
    )

    consoleSpy.mockRestore()
  })

  it('should handle network errors', async () => {
    api.get.mockRejectedValueOnce(new Error('Network Error'))

    await expect(fetchAllApplicationIds({})).rejects.toThrow('Network Error')
  })

  it('should return empty array when API returns empty array', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [] } })

    const result = await fetchAllApplicationIds({})

    expect(result).toEqual([])
    expect(result).toHaveLength(0)
  })
})
