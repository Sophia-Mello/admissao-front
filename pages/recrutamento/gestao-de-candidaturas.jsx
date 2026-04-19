/**
 * /recrutamento/gestao-de-candidaturas - Gestao de Candidaturas Page
 *
 * Main page for managing candidate applications with:
 * - Filters (template, subregional, step, search)
 * - Table with batch selection
 * - Sync with Gupy
 * - Mass email actions
 *
 * @route /recrutamento/gestao-de-candidaturas
 * @auth Required (admin | recrutamento)
 */

import { useState } from 'react'
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Input,
  Select,
  Statistic,
  message,
  Alert,
} from 'antd'
import {
  SyncOutlined,
  SearchOutlined,
  FileSearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  MailOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TagOutlined,
  SwapOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import Layout from '../../components/Layout'
import ErrorBoundary from '../../components/ErrorBoundary'
import withRecrutamentoOrAdmin from '../../lib/withRecrutamentoOrAdmin'
import { getErrorMessage } from '../../lib/errorHandler'
import { useApplications, useSyncApplications, useSubregionais, useGupyTemplates, useJobSteps, useApplicationTags, fetchAllApplicationIds } from '../../hooks'

// Components
import {
  ApplicationsTable,
  SendEmailModal,
  BulkTagModal,
  BulkMoveModal,
  BulkReproveModal,
  ActionHistoryDrawer,
} from '../../components/applications'
import CandidateDetailModal from '../../components/applications/CandidateDetailModal'

const { Title, Text } = Typography
const { Option } = Select

function GestaoDeCanditaturasPage() {
  // Selection state for batch operations
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectingAll, setSelectingAll] = useState(false)

  // Modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [reproveModalOpen, setReproveModalOpen] = useState(false)
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const [candidateModalOpen, setCandidateModalOpen] = useState(false)
  const [selectedCandidateId, setSelectedCandidateId] = useState(null)

  // Filter state
  const [filters, setFilters] = useState({
    template: null,
    subregional: null,
    step: null,
    stepStatus: null,
    statusApplication: 'inProgress', // Default: Em Progresso
    statusAulaTeste: null,
    statusProva: null,
    tag: null,
    searchText: '',
    cvSearchText: '',
  })

  // CV search input (separate from committed filter to avoid querying on every keystroke)
  const [cvSearchInput, setCvSearchInput] = useState('')

  // Pagination state
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25 })

  // Data fetching with server-side filters
  const { data: applicationsData, isLoading, refetch, isError, error } = useApplications({
    include: 'candidate',
    limit: pagination.pageSize,
    offset: (pagination.current - 1) * pagination.pageSize,
    ...(filters.template && { template: filters.template }),
    ...(filters.subregional && { subregional: filters.subregional }),
    ...(filters.step && { step: filters.step }),
    ...(filters.stepStatus && { stepStatus: filters.stepStatus }),
    ...(filters.statusApplication && { statusApplication: filters.statusApplication }),
    ...(filters.statusAulaTeste && { statusAulaTeste: filters.statusAulaTeste }),
    ...(filters.statusProva && { statusProva: filters.statusProva }),
    ...(filters.tag && { tag: filters.tag }),
    ...(filters.searchText && { search: filters.searchText }),
    ...(filters.cvSearchText && { cvSearch: filters.cvSearchText }),
  })

  // Support data
  const { subregionais, isLoading: loadingSubregionais } = useSubregionais()
  const { data: templatesData, isLoading: loadingTemplates } = useGupyTemplates()
  const { data: tagsData, isLoading: loadingTags, isError: tagsError } = useApplicationTags()

  // Job steps - busca etapas do template selecionado ou todas etapas únicas se não há template
  const { data: jobSteps, isLoading: loadingJobSteps } = useJobSteps(filters.template)

  // Sync mutation
  const syncMutation = useSyncApplications()

  // Handle sync button
  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync({
        template: filters.template,
        subregional: filters.subregional,
      })
      message.success(`Sync concluido: ${result.data?.synced || 0} atualizados`)
    } catch (err) {
      message.error('Erro ao sincronizar: ' + (err.response?.data?.error || err.message))
    }
  }

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value }
      // Clear step filter when template changes
      if (key === 'template') {
        newFilters.step = null
      }
      return newFilters
    })
    setPagination((prev) => ({ ...prev, current: 1 })) // Reset to page 1
    setSelectedIds(new Set()) // Clear selection when filters change
  }

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      template: null,
      subregional: null,
      step: null,
      stepStatus: null,
      statusApplication: 'inProgress', // Mantém default: Em Progresso
      statusAulaTeste: null,
      statusProva: null,
      tag: null,
      searchText: '',
      cvSearchText: '',
    })
    setCvSearchInput('')
    setPagination({ current: 1, pageSize: 25 })
  }

  // Handle table change (pagination, sorter)
  const handleTableChange = (pag) => {
    setPagination({
      current: pag.current,
      pageSize: pag.pageSize,
    })
  }

  // Handle "Select All" - fetches ALL IDs matching current filters
  const handleSelectAll = async () => {
    setSelectingAll(true)
    try {
      const allIds = await fetchAllApplicationIds({
        template: filters.template,
        subregional: filters.subregional,
        step: filters.step,
        stepStatus: filters.stepStatus,
        statusApplication: filters.statusApplication,
        statusAulaTeste: filters.statusAulaTeste,
        statusProva: filters.statusProva,
        tag: filters.tag,
        search: filters.searchText,
        cvSearch: filters.cvSearchText,
      })
      setSelectedIds(new Set(allIds))
      message.success(`${allIds.length} candidatura(s) selecionada(s)`)
    } catch (err) {
      message.error('Erro ao selecionar todos: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setSelectingAll(false)
    }
  }

  // Clear selection
  const handleClearSelection = () => {
    setSelectedIds(new Set())
  }

  // Derived data
  const applications = applicationsData?.applications || []
  const total = applicationsData?.total || 0
  const templates = templatesData || []

  // Step status options (Gupy currentStep.status values - camelCase)
  const stepStatusOptions = [
    { value: 'notStarted', label: 'Não Iniciado' },
    { value: 'done', label: 'Concluído' },
    { value: 'running', label: 'Em Andamento' },
    { value: 'waiting', label: 'Aguardando' },
  ]

  // Application status options (Gupy application.status values - camelCase)
  const applicationStatusOptions = [
    { value: 'inProgress', label: 'Em Progresso' },
    { value: 'hired', label: 'Contratado' },
    { value: 'reproved', label: 'Reprovado' },
    { value: 'disqualified', label: 'Desqualificado' },
    { value: 'withdrawn', label: 'Desistiu' },
    { value: 'standBy', label: 'Stand By' },
  ]

  // Status Aula Teste options (booking system status)
  const statusAulaTesteOptions = [
    { value: 'pendente', label: 'Pendente' },
  ]

  // Status Prova Teórica options (event system status)
  const statusProvaOptions = [
    { value: 'pendente', label: 'Pendente' },
    { value: 'agendado', label: 'Agendado' },
    { value: 'compareceu', label: 'Compareceu' },
    { value: 'faltou', label: 'Faltou' },
    { value: 'cancelado', label: 'Cancelado' },
  ]

  return (
    <Layout>
      <ErrorBoundary>
        <div style={{ padding: '24px' }}>
          {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <TeamOutlined style={{ marginRight: 12 }} />
              Gestao de Candidaturas
            </Title>
            <Text type="secondary">
              Visualize e gerencie candidaturas sincronizadas com a Gupy
            </Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<HistoryOutlined />}
                onClick={() => setHistoryDrawerOpen(true)}
              >
                Historico
              </Button>
              <Button
                icon={<SyncOutlined spin={syncMutation.isPending} />}
                onClick={handleSync}
                loading={syncMutation.isPending}
              >
                Sincronizar Gupy
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
              >
                Atualizar
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Stats */}
        <Row gutter={16} style={{ marginBottom: 24 }} align="middle">
          <Col span={6}>
            <Card>
              <Statistic
                title="Total de Candidaturas"
                value={total}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Selecionados"
                value={selectedIds.size}
                suffix={`/ ${total}`}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Space>
              <Button
                icon={<CheckCircleOutlined />}
                onClick={handleSelectAll}
                loading={selectingAll}
                disabled={total === 0}
              >
                Selecionar Todos ({total})
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  icon={<CloseCircleOutlined />}
                  onClick={handleClearSelection}
                >
                  Limpar Seleção
                </Button>
              )}
            </Space>
            {selectedIds.size > applications.length && (
              <Alert
                type="warning"
                message={`${selectedIds.size} candidatura(s) selecionada(s) de todos os filtros`}
                style={{ marginTop: 8 }}
                showIcon
              />
            )}
          </Col>
        </Row>

        {/* Filters */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Input.Search
                placeholder="Buscar por CPF ou nome..."
                prefix={<SearchOutlined />}
                value={filters.searchText}
                onChange={(e) => setFilters((prev) => ({ ...prev, searchText: e.target.value }))}
                onSearch={(value) => handleFilterChange('searchText', value)}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Input.Search
                placeholder="Buscar no currículo... (ex: bacharel matemática)"
                prefix={<FileSearchOutlined />}
                value={cvSearchInput}
                onChange={(e) => {
                  setCvSearchInput(e.target.value)
                  // Clear committed filter when input is cleared (allowClear / backspace to empty)
                  if (!e.target.value && filters.cvSearchText) {
                    handleFilterChange('cvSearchText', '')
                  }
                }}
                onSearch={(value) => {
                  setCvSearchInput(value)
                  handleFilterChange('cvSearchText', value)
                }}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Template"
                style={{ width: '100%' }}
                value={filters.template}
                onChange={(v) => handleFilterChange('template', v)}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
                loading={loadingTemplates}
              >
                {templates.map((t) => (
                  <Option key={t.id} value={t.name}>
                    {t.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Subregional"
                style={{ width: '100%' }}
                value={filters.subregional}
                onChange={(v) => handleFilterChange('subregional', v)}
                allowClear
                loading={loadingSubregionais}
              >
                {(subregionais || []).map((sr) => (
                  <Option key={sr.id_subregional} value={sr.id_subregional}>
                    {sr.nome_subregional}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Etapa"
                style={{ width: '100%' }}
                value={filters.step}
                onChange={(v) => handleFilterChange('step', v)}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
                loading={loadingJobSteps}
              >
                {(jobSteps || []).map((step) => (
                  <Option key={step.id || step.name} value={step.name}>
                    {step.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Status Etapa"
                style={{ width: '100%' }}
                value={filters.stepStatus}
                onChange={(v) => handleFilterChange('stepStatus', v)}
                allowClear
              >
                {stepStatusOptions.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Status Application"
                style={{ width: '100%' }}
                value={filters.statusApplication}
                onChange={(v) => handleFilterChange('statusApplication', v)}
                allowClear
              >
                {applicationStatusOptions.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Status Aula Teste"
                style={{ width: '100%' }}
                value={filters.statusAulaTeste}
                onChange={(v) => handleFilterChange('statusAulaTeste', v)}
                allowClear
              >
                {statusAulaTesteOptions.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Status Prova"
                style={{ width: '100%' }}
                value={filters.statusProva}
                onChange={(v) => handleFilterChange('statusProva', v)}
                allowClear
              >
                {statusProvaOptions.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder={tagsError ? 'Erro ao carregar tags' : 'Tag'}
                style={{ width: '100%' }}
                value={filters.tag}
                onChange={(v) => handleFilterChange('tag', v)}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option.label || '').toLowerCase().includes(input.toLowerCase())
                }
                loading={loadingTags}
                disabled={tagsError}
                status={tagsError ? 'error' : undefined}
              >
                {(tagsData || []).map((t) => (
                  <Option key={t.name} value={t.name} label={t.name}>
                    {t.name} ({t.count})
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={2}>
              <Button
                icon={<FilterOutlined />}
                onClick={handleClearFilters}
              >
                Limpar
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Batch Actions Bar */}
        {selectedIds.size > 0 && (
          <Card style={{ marginBottom: 16, background: '#e6f7ff' }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Text strong>{selectedIds.size} candidatura(s) selecionada(s)</Text>
              </Col>
              <Col>
                <Space>
                  <Button
                    icon={<TagOutlined />}
                    onClick={() => setTagModalOpen(true)}
                  >
                    Tags
                  </Button>
                  <Button
                    icon={<SwapOutlined />}
                    onClick={() => setMoveModalOpen(true)}
                  >
                    Mover
                  </Button>
                  <Button
                    icon={<CloseCircleOutlined />}
                    danger
                    onClick={() => setReproveModalOpen(true)}
                  >
                    Reprovar
                  </Button>
                  <Button
                    icon={<MailOutlined />}
                    type="primary"
                    onClick={() => setEmailModalOpen(true)}
                  >
                    Enviar Email
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        )}

        {/* Error State */}
        {isError && (
          <Alert
            type="error"
            message="Erro ao carregar candidaturas"
            description={getErrorMessage(error)}
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" onClick={() => refetch()}>
                Tentar Novamente
              </Button>
            }
          />
        )}

        {/* Table */}
        <Card>
          <ApplicationsTable
            applications={applications}
            loading={isLoading}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total,
            }}
            onTableChange={handleTableChange}
            onCandidateClick={(candidateId) => {
              setSelectedCandidateId(candidateId)
              setCandidateModalOpen(true)
            }}
          />
          </Card>

        {/* Send Email Modal */}
        <SendEmailModal
          open={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          selectedIds={selectedIds}
          onSuccess={(result) => {
            message.success(result.message || 'Emails enviados com sucesso!')
            setSelectedIds(new Set())
          }}
        />

        {/* Bulk Tag Modal */}
        <BulkTagModal
          open={tagModalOpen}
          onClose={() => setTagModalOpen(false)}
          selectedIds={selectedIds}
          onSuccess={(result) => {
            message.success(result.message || 'Tags atualizadas com sucesso!')
            setSelectedIds(new Set())
            refetch()
          }}
        />

        {/* Bulk Move Modal */}
        <BulkMoveModal
          open={moveModalOpen}
          onClose={() => setMoveModalOpen(false)}
          selectedIds={selectedIds}
          onSuccess={(result) => {
            message.success(result.message || 'Candidaturas movidas com sucesso!')
            setSelectedIds(new Set())
            refetch()
          }}
        />

        {/* Bulk Reprove Modal */}
        <BulkReproveModal
          open={reproveModalOpen}
          onClose={() => setReproveModalOpen(false)}
          selectedIds={selectedIds}
          onSuccess={(result) => {
            message.success(result.message || 'Candidaturas reprovadas com sucesso!')
            setSelectedIds(new Set())
            refetch()
          }}
        />

        {/* Action History Drawer */}
        <ActionHistoryDrawer
          open={historyDrawerOpen}
          onClose={() => setHistoryDrawerOpen(false)}
        />

        {/* Candidate Detail Modal */}
        <CandidateDetailModal
          open={candidateModalOpen}
          candidateId={selectedCandidateId}
          onClose={() => {
            setCandidateModalOpen(false)
            setSelectedCandidateId(null)
          }}
          onOpenTagModal={(ids) => {
            // Keep candidate modal open when action modal opens
            setSelectedIds(ids)
            setTagModalOpen(true)
          }}
          onOpenMoveModal={(ids) => {
            // Keep candidate modal open when action modal opens
            setSelectedIds(ids)
            setMoveModalOpen(true)
          }}
          onOpenReproveModal={(ids) => {
            // Keep candidate modal open when action modal opens
            setSelectedIds(ids)
            setReproveModalOpen(true)
          }}
        />
        </div>
      </ErrorBoundary>
    </Layout>
  )
}

export default withRecrutamentoOrAdmin(GestaoDeCanditaturasPage)
