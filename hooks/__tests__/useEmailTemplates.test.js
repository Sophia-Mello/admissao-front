import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEmailTemplates, useEmailTemplate, useSendEmail } from '../useEmailTemplates'

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

describe('useEmailTemplates', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch email templates successfully', async () => {
    const mockTemplates = [
      { id: 1, name: 'Welcome Email', subject: 'Welcome!' },
      { id: 2, name: 'Rejection Email', subject: 'Application Status' },
    ]

    api.get.mockResolvedValueOnce({ data: { data: mockTemplates } })

    const { result } = renderHook(() => useEmailTemplates(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data[0].name).toBe('Welcome Email')
    expect(api.get).toHaveBeenCalledWith('/applications/email-templates')
  })

  it('should throw error when API returns success: false', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    api.get.mockResolvedValueOnce({
      data: { success: false, error: 'Gupy API unavailable' },
    })

    const { result } = renderHook(() => useEmailTemplates(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.message).toBe('Gupy API unavailable')
    expect(consoleSpy).toHaveBeenCalledWith(
      '[useEmailTemplates] Failed to fetch templates:',
      'Gupy API unavailable'
    )

    consoleSpy.mockRestore()
  })

  it('should throw error when response format is invalid', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    api.get.mockResolvedValueOnce({
      data: { data: 'not an array' },
    })

    const { result } = renderHook(() => useEmailTemplates(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.message).toBe('Formato de resposta inválido ao carregar templates')
    expect(consoleSpy).toHaveBeenCalledWith(
      '[useEmailTemplates] Invalid response format:',
      expect.objectContaining({ response: { data: 'not an array' } })
    )

    consoleSpy.mockRestore()
  })

  it('should respect enabled option', async () => {
    const { result } = renderHook(
      () => useEmailTemplates({ enabled: false }),
      { wrapper: createWrapper() }
    )

    expect(api.get).not.toHaveBeenCalled()
    expect(result.current.isFetching).toBe(false)
  })
})

describe('useEmailTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch single template by ID', async () => {
    const mockTemplate = { id: 1, name: 'Welcome', subject: 'Hello!', body: 'Welcome message' }

    api.get.mockResolvedValueOnce({ data: { data: mockTemplate } })

    const { result } = renderHook(() => useEmailTemplate(1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data.name).toBe('Welcome')
    expect(api.get).toHaveBeenCalledWith('/applications/email-templates/1')
  })

  it('should throw error when template not found', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    api.get.mockResolvedValueOnce({ data: {} })

    const { result } = renderHook(() => useEmailTemplate(999), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.message).toBe('Template de email não encontrado')

    consoleSpy.mockRestore()
  })

  it('should not fetch when ID is falsy', async () => {
    const { result } = renderHook(() => useEmailTemplate(null), {
      wrapper: createWrapper(),
    })

    expect(api.get).not.toHaveBeenCalled()
    expect(result.current.isFetching).toBe(false)
  })
})

describe('useSendEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should send emails successfully', async () => {
    const mockResponse = {
      success: true,
      data: { sent: 5, failed: 0 },
      message: 'Emails enviados com sucesso',
    }

    api.post.mockResolvedValueOnce({ data: mockResponse })

    const { result } = renderHook(() => useSendEmail(), {
      wrapper: createWrapper(),
    })

    const response = await result.current.mutateAsync({
      applicationIds: [1, 2, 3, 4, 5],
      templateId: 1,
    })

    expect(response.success).toBe(true)
    expect(response.data.sent).toBe(5)
    expect(api.post).toHaveBeenCalledWith('/applications/send-email', {
      applicationIds: [1, 2, 3, 4, 5],
      templateId: 1,
    })
  })

  it('should handle send errors and log them', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const error = new Error('Failed to send')
    error.response = { data: { error: 'Email service unavailable' } }
    api.post.mockRejectedValueOnce(error)

    const { result } = renderHook(() => useSendEmail(), {
      wrapper: createWrapper(),
    })

    await expect(
      result.current.mutateAsync({ applicationIds: [1], templateId: 1 })
    ).rejects.toThrow('Failed to send')

    expect(consoleSpy).toHaveBeenCalledWith(
      '[useSendEmail] Failed to send emails:',
      expect.objectContaining({
        error: 'Failed to send',
        response: { error: 'Email service unavailable' },
      })
    )

    consoleSpy.mockRestore()
  })

  it('should handle partial failures', async () => {
    const mockResponse = {
      success: true,
      data: { sent: 3, failed: 2 },
      message: '3 emails enviados, 2 falhas',
    }

    api.post.mockResolvedValueOnce({ data: mockResponse })

    const { result } = renderHook(() => useSendEmail(), {
      wrapper: createWrapper(),
    })

    const response = await result.current.mutateAsync({
      applicationIds: [1, 2, 3, 4, 5],
      templateId: 1,
    })

    expect(response.data.sent).toBe(3)
    expect(response.data.failed).toBe(2)
  })
})
