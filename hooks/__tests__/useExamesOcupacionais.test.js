import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCandidatosInfinite, useSummary } from '../useExamesOcupacionais'

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

describe('useCandidatosInfinite', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch first page successfully', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          { id_candidato: 1, nome: 'João Silva', status: 'pendente' },
          { id_candidato: 2, nome: 'Maria Santos', status: 'agendado' },
        ],
        pagination: { limit: 50, offset: 0, total: 100 },
      },
    })

    const { result } = renderHook(() => useCandidatosInfinite({}), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data.pages).toHaveLength(1)
    expect(result.current.data.pages[0].candidatos).toHaveLength(2)
    expect(result.current.hasNextPage).toBe(true)
    expect(api.get).toHaveBeenCalledWith('/exame-ocupacional', {
      params: { limit: 50, offset: 0 },
    })
  })

  it('should calculate hasNextPage correctly when all items loaded', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [{ id_candidato: 1, nome: 'Test', status: 'pendente' }],
        pagination: { limit: 50, offset: 0, total: 1 },
      },
    })

    const { result } = renderHook(() => useCandidatosInfinite({}), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.hasNextPage).toBe(false)
  })

  it('should fetch next page when fetchNextPage is called', async () => {
    // Setup mock for both pages upfront
    api.get
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id_candidato: 1, nome: 'João', status: 'pendente' }],
          pagination: { limit: 50, offset: 0, total: 100 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id_candidato: 2, nome: 'Maria', status: 'agendado' }],
          pagination: { limit: 50, offset: 50, total: 100 },
        },
      })

    const { result } = renderHook(() => useCandidatosInfinite({}), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)

    await act(async () => {
      result.current.fetchNextPage()
    })

    await waitFor(() => expect(result.current.data.pages).toHaveLength(2), {
      timeout: 3000,
    })

    expect(api.get).toHaveBeenCalledTimes(2)
    expect(api.get).toHaveBeenLastCalledWith('/exame-ocupacional', {
      params: expect.objectContaining({ offset: 50, limit: 50 }),
    })
  })

  it('should pass filters to API call', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [],
        pagination: { limit: 50, offset: 0, total: 0 },
      },
    })

    const filters = { empresa: 1, cargo: 'Professor', search: 'joao' }

    const { result } = renderHook(() => useCandidatosInfinite(filters), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.get).toHaveBeenCalledWith('/exame-ocupacional', {
      params: expect.objectContaining({
        empresa: 1,
        cargo: 'Professor',
        search: 'joao',
        limit: 50,
        offset: 0,
      }),
    })
  })

  it('should handle empty data correctly', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [],
        pagination: { limit: 50, offset: 0, total: 0 },
      },
    })

    const { result } = renderHook(() => useCandidatosInfinite({}), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data.pages[0].candidatos).toHaveLength(0)
    expect(result.current.hasNextPage).toBe(false)
  })

  it('should handle network errors', async () => {
    api.get.mockRejectedValueOnce(new Error('Network Error'))

    const { result } = renderHook(() => useCandidatosInfinite({}), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.message).toBe('Network Error')
  })

  it('should handle missing pagination gracefully', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [{ id_candidato: 1 }],
        // No pagination object
      },
    })

    const { result } = renderHook(() => useCandidatosInfinite({}), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Should use default pagination values
    expect(result.current.data.pages[0].pagination).toEqual({
      limit: 50,
      offset: 0,
      total: 0,
    })
  })

  it('should stop fetching when reaching the end', async () => {
    // First page (offset 0, total 60 - means only 2 pages needed)
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: Array(50).fill({ id_candidato: 1 }),
        pagination: { limit: 50, offset: 0, total: 60 },
      },
    })

    const { result } = renderHook(() => useCandidatosInfinite({}), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)

    // Second page (offset 50, total 60 - should be the last page)
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: Array(10).fill({ id_candidato: 2 }),
        pagination: { limit: 50, offset: 50, total: 60 },
      },
    })

    await act(async () => {
      await result.current.fetchNextPage()
    })

    await waitFor(() => expect(result.current.data.pages).toHaveLength(2))
    expect(result.current.hasNextPage).toBe(false)
  })
})

describe('useSummary with filters', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch summary without filters', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          pendentes: 10,
          agendados: 5,
          concluidos: 3,
          detalhado: { pendente: 10, agendado: 5, compareceu: 2, faltou: 1 },
        },
      },
    })

    const { result } = renderHook(() => useSummary({}), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data.pendentes).toBe(10)
    expect(result.current.data.agendados).toBe(5)
    expect(result.current.data.concluidos).toBe(3)
    expect(api.get).toHaveBeenCalledWith('/exame-ocupacional/summary', {
      params: {},
    })
  })

  it('should pass filters to summary API', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          pendentes: 5,
          agendados: 3,
          concluidos: 2,
          detalhado: { pendente: 5, agendado: 3 },
        },
      },
    })

    const filters = { empresa: 1, cargo: 'Professor', search: 'joao' }

    const { result } = renderHook(() => useSummary(filters), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.get).toHaveBeenCalledWith('/exame-ocupacional/summary', {
      params: { empresa: 1, cargo: 'Professor', search: 'joao' },
    })
  })

  it('should handle network errors gracefully', async () => {
    api.get.mockRejectedValueOnce(new Error('Network Error'))

    const { result } = renderHook(() => useSummary({}), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.message).toBe('Network Error')
  })

  it('should update query key when filters change', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })

    api.get.mockResolvedValue({
      data: {
        success: true,
        data: { pendentes: 5, agendados: 3, concluidos: 2, detalhado: {} },
      },
    })

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    // First render with no filters
    const { result, rerender } = renderHook(
      ({ filters }) => useSummary(filters),
      {
        wrapper,
        initialProps: { filters: {} },
      }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Rerender with filters - should trigger new fetch
    rerender({ filters: { empresa: 1 } })

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith('/exame-ocupacional/summary', {
        params: { empresa: 1 },
      })
    })
  })

  it('should return detalhado counts correctly', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          pendentes: 10,
          agendados: 5,
          concluidos: 8,
          detalhado: {
            pendente: 10,
            agendado: 5,
            compareceu: 3,
            faltou: 2,
            aprovado: 2,
            reprovado: 1,
          },
        },
      },
    })

    const { result } = renderHook(() => useSummary({}), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data.detalhado.pendente).toBe(10)
    expect(result.current.data.detalhado.agendado).toBe(5)
    expect(result.current.data.detalhado.compareceu).toBe(3)
    expect(result.current.data.detalhado.faltou).toBe(2)
    expect(result.current.data.detalhado.aprovado).toBe(2)
    expect(result.current.data.detalhado.reprovado).toBe(1)
  })
})
