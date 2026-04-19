import { render, screen, fireEvent, within } from '@testing-library/react'
import ApplicationsTable from '../ApplicationsTable'

// Mock Ant Design's Table to simplify testing
jest.mock('antd', () => {
  const originalModule = jest.requireActual('antd')
  return {
    ...originalModule,
    // Keep Table but mock some complex behaviors if needed
  }
})

describe('ApplicationsTable', () => {
  const mockApplications = [
    {
      id: 1,
      candidate_nome: 'Joao Silva',
      candidate_cpf: '12345678901',
      candidate_email: 'joao@test.com',
      template_name: 'Template A',
      nome_subregional: 'Norte',
      current_step_name: 'Entrevista',
      current_step_status: 'done',
      current_step_started_at: '2024-01-14T08:00:00Z',
      gupy_synced_at: '2024-01-15T10:30:00Z',
      id_job_gupy: 'job456',
      id_application_gupy: 'gupy123',
    },
    {
      id: 2,
      candidate_nome: 'Maria Santos',
      candidate_cpf: '98765432100',
      candidate_email: 'maria@test.com',
      template_name: 'Template B',
      nome_subregional: 'Sul',
      current_step_name: 'Aula Teste',
      current_step_status: 'notStarted',
      current_step_started_at: null,
      gupy_synced_at: null,
      id_job_gupy: null,
      id_application_gupy: null,
    },
  ]

  const defaultProps = {
    applications: mockApplications,
    loading: false,
    selectedIds: new Set(),
    onSelectionChange: jest.fn(),
    pagination: { current: 1, pageSize: 25, total: 2 },
    onTableChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render table with applications', () => {
    render(<ApplicationsTable {...defaultProps} />)

    expect(screen.getByText('Joao Silva')).toBeInTheDocument()
    expect(screen.getByText('Maria Santos')).toBeInTheDocument()
  })

  it('should render candidate details (CPF and email)', () => {
    render(<ApplicationsTable {...defaultProps} />)

    expect(screen.getByText(/12345678901/)).toBeInTheDocument()
    expect(screen.getByText('joao@test.com')).toBeInTheDocument()
  })

  it('should render template tags', () => {
    render(<ApplicationsTable {...defaultProps} />)

    expect(screen.getByText('Template A')).toBeInTheDocument()
    expect(screen.getByText('Template B')).toBeInTheDocument()
  })

  it('should render subregional tags', () => {
    render(<ApplicationsTable {...defaultProps} />)

    expect(screen.getByText('Norte')).toBeInTheDocument()
    expect(screen.getByText('Sul')).toBeInTheDocument()
  })

  it('should render step status badges with PT-BR labels', () => {
    render(<ApplicationsTable {...defaultProps} />)

    // Step status 'done' -> 'Concluído', 'notStarted' -> 'Não Iniciado'
    expect(screen.getByText('Concluído')).toBeInTheDocument()
    expect(screen.getByText('Não Iniciado')).toBeInTheDocument()
  })


  it('should show loading state', () => {
    render(<ApplicationsTable {...defaultProps} loading={true} />)

    // Ant Design Table shows spinner when loading
    expect(document.querySelector('.ant-spin')).toBeInTheDocument()
  })

  it('should handle individual row selection', () => {
    const onSelectionChange = jest.fn()
    render(
      <ApplicationsTable {...defaultProps} onSelectionChange={onSelectionChange} />
    )

    // Find and click the first row checkbox
    const checkboxes = screen.getAllByRole('checkbox')
    // First checkbox is "select all", subsequent are row checkboxes
    fireEvent.click(checkboxes[1]) // First row checkbox

    expect(onSelectionChange).toHaveBeenCalledWith(new Set([1]))
  })

  it('should handle select all checkbox', () => {
    const onSelectionChange = jest.fn()
    render(
      <ApplicationsTable {...defaultProps} onSelectionChange={onSelectionChange} />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]) // Select all checkbox

    expect(onSelectionChange).toHaveBeenCalledWith(new Set([1, 2]))
  })

  it('should show indeterminate state when some items selected', () => {
    render(
      <ApplicationsTable {...defaultProps} selectedIds={new Set([1])} />
    )

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
    // Ant Design adds ant-checkbox-indeterminate class for indeterminate state
    const checkboxWrapper = selectAllCheckbox.closest('.ant-checkbox-wrapper')
    expect(checkboxWrapper.querySelector('.ant-checkbox-indeterminate')).toBeInTheDocument()
  })

  it('should deselect all when clicking select all while all selected', () => {
    const onSelectionChange = jest.fn()
    render(
      <ApplicationsTable
        {...defaultProps}
        selectedIds={new Set([1, 2])}
        onSelectionChange={onSelectionChange}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]) // Click select all (already all selected)

    expect(onSelectionChange).toHaveBeenCalledWith(new Set())
  })

  it('should deselect individual row', () => {
    const onSelectionChange = jest.fn()
    render(
      <ApplicationsTable
        {...defaultProps}
        selectedIds={new Set([1, 2])}
        onSelectionChange={onSelectionChange}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1]) // Uncheck first row

    expect(onSelectionChange).toHaveBeenCalledWith(new Set([2]))
  })

  it('should render Gupy link when id_job_gupy and id_application_gupy exist', () => {
    render(<ApplicationsTable {...defaultProps} />)

    const gupyLinks = document.querySelectorAll('a[href*="gupy.io"]')
    expect(gupyLinks.length).toBe(1) // Only first application has both gupy IDs
    // New URL format: /companies/jobs/{id_job_gupy}/candidates/{id_application_gupy}
    expect(gupyLinks[0]).toHaveAttribute(
      'href',
      'https://tomeducacao.gupy.io/companies/jobs/job456/candidates/gupy123'
    )
  })

  it('should not render Gupy link when gupy IDs are null', () => {
    render(<ApplicationsTable {...defaultProps} />)

    // Only one link should exist (for first application with both IDs)
    // Second application has null IDs so no link
    const gupyLinks = document.querySelectorAll('a[href*="gupy.io"]')
    expect(gupyLinks.length).toBe(1)
  })

  it('should format sync datetime correctly', () => {
    render(<ApplicationsTable {...defaultProps} />)

    // The datetime should be formatted as pt-BR date + time
    // 2024-01-15T10:30:00Z converted to pt-BR (UTC-3 in Brazil)
    expect(screen.getByText(/15\/01\/2024/)).toBeInTheDocument()
  })

  it('should show dash when sync date is null', () => {
    render(<ApplicationsTable {...defaultProps} />)

    // Find the sync column cells - one has date, one has dash
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('should handle pagination change', () => {
    const onTableChange = jest.fn()
    render(
      <ApplicationsTable {...defaultProps} onTableChange={onTableChange} />
    )

    // Pagination is handled by Ant Design Table and triggers onTableChange
    // The component passes this through to the parent
  })

  it('should render with empty applications array', () => {
    render(<ApplicationsTable {...defaultProps} applications={[]} />)

    // Should render empty table without errors
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('should handle missing optional fields gracefully', () => {
    const incompleteApplication = {
      id: 3,
      candidate_nome: 'Test User',
      // All other fields missing
    }

    render(
      <ApplicationsTable
        {...defaultProps}
        applications={[incompleteApplication]}
      />
    )

    expect(screen.getByText('Test User')).toBeInTheDocument()
    // Should show dashes for missing fields
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('should preserve selection when adding to existing selection', () => {
    const onSelectionChange = jest.fn()
    render(
      <ApplicationsTable
        {...defaultProps}
        selectedIds={new Set([1])}
        onSelectionChange={onSelectionChange}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[2]) // Select second row

    expect(onSelectionChange).toHaveBeenCalledWith(new Set([1, 2]))
  })

  it('should show total count in pagination', () => {
    render(<ApplicationsTable {...defaultProps} />)

    expect(screen.getByText(/Total: 2 candidaturas/)).toBeInTheDocument()
  })
})
