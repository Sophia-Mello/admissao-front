import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useJobSteps } from '../useJobSteps'

// Mock the api module
jest.mock('../../lib/api', () => ({
  get: jest.fn(),
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

describe('useJobSteps', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch job steps successfully when template is provided', async () => {
    const mockSteps = [
      { id: 1, name: 'Triagem', type: 'screening' },
      { id: 2, name: 'Entrevista', type: 'interview' },
      { id: 3, name: 'Aula Teste', type: 'test_class' },
    ]

    api.get.mockResolvedValueOnce({ data: { data: mockSteps } })

    const { result } = renderHook(() => useJobSteps('Professor Matematica'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(3)
    expect(result.current.data[0].name).toBe('Triagem')
    expect(api.get).toHaveBeenCalledWith('/applications/job-steps', {
      params: { template: 'Professor Matematica' },
    })
  })

  it('should not fetch when template is null', async () => {
    const { result } = renderHook(() => useJobSteps(null), {
      wrapper: createWrapper(),
    })

    // Should not fetch when template is null
    expect(api.get).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isFetching).toBe(false)
  })

  it('should not fetch when template is undefined', async () => {
    const { result } = renderHook(() => useJobSteps(undefined), {
      wrapper: createWrapper(),
    })

    // Should not fetch when template is undefined
    expect(api.get).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isFetching).toBe(false)
  })

  it('should not fetch when template is empty string', async () => {
    const { result } = renderHook(() => useJobSteps(''), {
      wrapper: createWrapper(),
    })

    // Should not fetch when template is empty (falsy)
    expect(api.get).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isFetching).toBe(false)
  })

  it('should throw error when API returns success: false', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    api.get.mockResolvedValueOnce({
      data: { success: false, error: 'Template not found' },
    })

    const { result } = renderHook(() => useJobSteps('Invalid Template'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.message).toBe('Template not found')
    expect(consoleSpy).toHaveBeenCalledWith(
      '[useJobSteps] API returned error:',
      'Template not found'
    )

    consoleSpy.mockRestore()
  })

  it('should throw error when data format is invalid', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    api.get.mockResolvedValueOnce({
      data: { data: 'not an array' },
    })

    const { result } = renderHook(() => useJobSteps('Professor'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.message).toBe('Formato de resposta inválido ao carregar etapas')
    expect(consoleSpy).toHaveBeenCalledWith(
      '[useJobSteps] Invalid response format:',
      expect.objectContaining({ response: { data: 'not an array' } })
    )

    consoleSpy.mockRestore()
  })

  it('should handle network errors', async () => {
    api.get.mockRejectedValueOnce(new Error('Network Error'))

    const { result } = renderHook(() => useJobSteps('Professor'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.message).toBe('Network Error')
  })

  it('should respect enabled option', async () => {
    const { result } = renderHook(
      () => useJobSteps('Professor', { enabled: false }),
      { wrapper: createWrapper() }
    )

    // Should not fetch when disabled
    expect(api.get).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isFetching).toBe(false)
  })

  it('should use different query keys for different templates', async () => {
    const mockSteps1 = [{ id: 1, name: 'Step 1' }]
    const mockSteps2 = [{ id: 2, name: 'Step 2' }]

    api.get
      .mockResolvedValueOnce({ data: { data: mockSteps1 } })
      .mockResolvedValueOnce({ data: { data: mockSteps2 } })

    const { result: result1 } = renderHook(() => useJobSteps('Template A'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result1.current.isSuccess).toBe(true))

    const { result: result2 } = renderHook(() => useJobSteps('Template B'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result2.current.isSuccess).toBe(true))

    // Both templates should have made separate API calls
    expect(api.get).toHaveBeenCalledTimes(2)
    expect(api.get).toHaveBeenNthCalledWith(1, '/applications/job-steps', {
      params: { template: 'Template A' },
    })
    expect(api.get).toHaveBeenNthCalledWith(2, '/applications/job-steps', {
      params: { template: 'Template B' },
    })
  })
})
