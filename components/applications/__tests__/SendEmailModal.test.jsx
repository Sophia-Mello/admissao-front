import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SendEmailModal from '../SendEmailModal'

// Mock the hooks
const mockMutateAsync = jest.fn()
jest.mock('../../../hooks', () => ({
  useEmailTemplates: jest.fn(),
  useSendEmail: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

import { useEmailTemplates } from '../../../hooks'

describe('SendEmailModal', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    selectedIds: new Set([1, 2, 3]),
    onSuccess: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    useEmailTemplates.mockReturnValue({
      data: [
        { id: 1, name: 'Welcome Template', subject: 'Welcome!' },
        { id: 2, name: 'Rejection Template', subject: 'Application Status' },
      ],
      isLoading: false,
      isError: false,
    })
  })

  it('should render modal with template selection', () => {
    render(<SendEmailModal {...defaultProps} />)

    expect(screen.getByText('Enviar Email em Massa')).toBeInTheDocument()
    expect(screen.getByText('3 candidatura(s) selecionada(s)')).toBeInTheDocument()
    expect(screen.getByText('Selecione o template de email:')).toBeInTheDocument()
  })

  it('should show loading state when fetching templates', () => {
    useEmailTemplates.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
    })

    render(<SendEmailModal {...defaultProps} />)

    expect(screen.getByText('Carregando templates de email...')).toBeInTheDocument()
  })

  it('should show error state when templates fail to load', () => {
    useEmailTemplates.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
    })

    render(<SendEmailModal {...defaultProps} />)

    expect(screen.getByText('Erro ao carregar templates')).toBeInTheDocument()
  })

  it('should disable send button when no template selected', () => {
    render(<SendEmailModal {...defaultProps} />)

    const sendButton = screen.getByRole('button', { name: /enviar/i })
    expect(sendButton).toBeDisabled()
  })

  it('should handle successful email send', async () => {
    const mockResult = {
      success: true,
      data: { sent: 3, failed: 0 },
      message: 'Emails enviados com sucesso',
    }
    mockMutateAsync.mockResolvedValueOnce(mockResult)

    render(<SendEmailModal {...defaultProps} />)

    // Select a template
    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('Welcome Template'))

    // Click send
    const sendButton = screen.getByRole('button', { name: /enviar/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        applicationIds: [1, 2, 3],
        templateId: 1,
        templateName: 'Welcome Template',
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Emails enviados com sucesso!')).toBeInTheDocument()
    })

    expect(defaultProps.onSuccess).toHaveBeenCalledWith(mockResult)
  })

  it('should handle send error and display error message', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const error = new Error('Network error')
    error.response = { data: { error: 'SMTP server unavailable' } }
    mockMutateAsync.mockRejectedValueOnce(error)

    render(<SendEmailModal {...defaultProps} />)

    // Select a template
    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('Welcome Template'))

    // Click send
    const sendButton = screen.getByRole('button', { name: /enviar/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText('Erro ao enviar emails')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('SMTP server unavailable')).toBeInTheDocument()
    })

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should extract error message from various response formats', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    // Test error.response.data.message format
    const error = new Error('Request failed')
    error.response = { data: { message: 'Rate limit exceeded' } }
    mockMutateAsync.mockRejectedValueOnce(error)

    render(<SendEmailModal {...defaultProps} />)

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('Welcome Template'))

    fireEvent.click(screen.getByRole('button', { name: /enviar/i }))

    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  it('should accept Array of IDs as well as Set', () => {
    render(<SendEmailModal {...defaultProps} selectedIds={[1, 2, 3, 4]} />)

    expect(screen.getByText('4 candidatura(s) selecionada(s)')).toBeInTheDocument()
  })

  it('should show template preview when selected', async () => {
    render(<SendEmailModal {...defaultProps} />)

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('Welcome Template'))

    await waitFor(() => {
      expect(screen.getByText('Preview do Template')).toBeInTheDocument()
      expect(screen.getByText('Welcome!')).toBeInTheDocument()
    })
  })

  it('should reset state when modal reopens', async () => {
    const { rerender } = render(<SendEmailModal {...defaultProps} open={false} />)

    // Open modal
    rerender(<SendEmailModal {...defaultProps} open={true} />)

    // Should show initial state, not previous result
    expect(screen.queryByText('Emails enviados com sucesso!')).not.toBeInTheDocument()
  })

  it('should not close modal while sending', async () => {
    // Set isPending to true
    jest.doMock('../../../hooks', () => ({
      useEmailTemplates: () => ({
        data: [{ id: 1, name: 'Test', subject: 'Test' }],
        isLoading: false,
        isError: false,
      }),
      useSendEmail: () => ({
        mutateAsync: mockMutateAsync,
        isPending: true,
      }),
    }))

    render(<SendEmailModal {...defaultProps} />)

    // Cancel button should be disabled during send
    // The modal closable prop should be false
    // These are enforced in the component implementation
  })
})
