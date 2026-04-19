/**
 * /recrutamento/jobs - Jobs Management Page
 *
 * Main page for managing regional jobs with:
 * - Filters (status, subregional, search by text)
 * - Table with batch selection
 * - Create, publish, close, cancel actions
 * - Batch operations for selected jobs
 * - Auto soft-delete for jobs marked as deleted in Gupy
 *
 * @route /recrutamento/jobs
 * @auth Required (admin | recrutamento)
 */

import { useState, useMemo, useEffect } from 'react'
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
} from 'antd'
import {
  PlusOutlined,
  SolutionOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import Layout from '../../components/Layout'
import withRecrutamentoOrAdmin from '../../lib/withRecrutamentoOrAdmin'
import { useJobs, useDeleteJobs, useDeleteDrafts, useSubregionais, useUnidades } from '../../hooks'

// Components
import JobsTable from '../../components/jobs/JobsTable'
import BatchActionsBar from '../../components/jobs/BatchActionsBar'
import CreateJobModal from '../../components/jobs/CreateJobModal'
import PublishModal from '../../components/jobs/PublishModal'
import CloseJobsModal from '../../components/jobs/CloseJobsModal'
import CancelJobsModal from '../../components/jobs/CancelJobsModal'
import JobDetailsModal from '../../components/jobs/JobDetailsModal'

const { Title, Text } = Typography
const { Option } = Select

function JobsPage() {
  // Selection state for batch operations
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Filter state
  const [filters, setFilters] = useState({
    job_status: null,
    id_subregional: null,
    id_unidade: null,
    searchText: '',
  })

  // Pagination state
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [publishModalJobIds, setPublishModalJobIds] = useState([])
  const [closeModalJobIds, setCloseModalJobIds] = useState([])
  const [cancelModalJobIds, setCancelModalJobIds] = useState([])
  const [detailsModalJobId, setDetailsModalJobId] = useState(null)

  // Data fetching with server-side filters
  const { data: jobsData, isLoading, refetch } = useJobs({
    ativo: true,
    include: 'unidades',
    limit: pagination.pageSize,
    offset: (pagination.current - 1) * pagination.pageSize,
    ...(filters.job_status && { job_status: filters.job_status }),
    ...(filters.id_subregional && { id_subregional: filters.id_subregional }),
    ...(filters.id_unidade && { id_unidade: filters.id_unidade }),
    ...(filters.searchText && { job_name: filters.searchText }),
  })
  const { subregionais, isLoading: loadingSubregionais } = useSubregionais()
  const { unidades: availableUnidades, isLoading: loadingUnidades } = useUnidades(filters.id_subregional)

  // Delete jobs mutation for auto-cleanup
  const deleteJobsMutation = useDeleteJobs()

  // Delete drafts mutation
  const deleteDraftsMutation = useDeleteDrafts()

  // Auto soft-delete jobs that are marked as deleted in Gupy
  useEffect(() => {
    if (!jobsData?.jobs) return

    // Find jobs that exist in our DB but are deleted in Gupy
    const deletedInGupy = jobsData.jobs.filter((job) => job.exists_in_gupy === false)

    if (deletedInGupy.length > 0) {
      const idsToDelete = deletedInGupy.map((job) => job.id_job_subregional)

      // Soft delete them in our database
      deleteJobsMutation.mutate(
        { ids: idsToDelete },
        {
          onSuccess: () => {
            console.log(`[JobsPage] Auto soft-deleted ${idsToDelete.length} jobs that were deleted in Gupy`)
          },
          onError: (error) => {
            console.error('[JobsPage] Error auto-deleting jobs:', error)
          },
        }
      )
    }
  }, [jobsData?.jobs])

  // Statistics from backend totals
  const stats = useMemo(() => ({
    total: jobsData?.total || 0,
    draft: jobsData?.total_drafts || 0,
    published: jobsData?.total_published || 0,
    closed: jobsData?.total_closed || 0,
    canceled: jobsData?.total_canceled || 0,
  }), [jobsData])

  // Handle filter changes (reset to page 1 when filters change)
  const handleStatusChange = (value) => {
    setFilters((prev) => ({ ...prev, job_status: value || null }))
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleSubregionalChange = (value) => {
    setFilters((prev) => ({ ...prev, id_subregional: value || null, id_unidade: null }))
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleUnidadeChange = (value) => {
    setFilters((prev) => ({ ...prev, id_unidade: value || null }))
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleSearchChange = (e) => {
    setFilters((prev) => ({ ...prev, searchText: e.target.value }))
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleClearFilters = () => {
    setFilters({ job_status: null, id_subregional: null, id_unidade: null, searchText: '' })
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  // Handle table pagination change
  const handleTableChange = (pag) => {
    setPagination({ current: pag.current, pageSize: pag.pageSize })
  }

  // Handle view details action
  const handleViewDetails = (jobId) => {
    setDetailsModalJobId(jobId)
  }

  // Handle batch actions
  const handleBatchPublish = () => {
    setPublishModalJobIds(Array.from(selectedIds))
  }

  const handleBatchClose = () => {
    setCloseModalJobIds(Array.from(selectedIds))
  }

  const handleBatchCancel = () => {
    setCancelModalJobIds(Array.from(selectedIds))
  }

  // Handle delete drafts
  const handleDeleteDrafts = () => {
    const draftIds = Array.from(selectedIds)

    // Confirm before deleting
    if (window.confirm(`Tem certeza que deseja excluir ${draftIds.length} rascunho(s)? Esta acao nao pode ser desfeita.`)) {
      deleteDraftsMutation.mutate(
        { ids: draftIds },
        {
          onSuccess: (result) => {
            const { summary } = result
            if (summary?.failed === 0) {
              message.success(`${summary.succeeded} rascunho(s) excluído(s) com sucesso!`)
            } else if (summary?.succeeded > 0) {
              message.warning(`${summary.succeeded} excluído(s), ${summary.failed} erro(s)`)
            } else {
              message.error('Erro ao excluir rascunhos')
            }
            setSelectedIds(new Set())
            refetch()
          },
          onError: (error) => {
            console.error('[JobsPage] Error deleting drafts:', error)
            message.error(error.response?.data?.error || 'Erro ao excluir rascunhos')
          },
        }
      )
    }
  }

  // Handle clear selection
  const handleClearSelection = () => {
    setSelectedIds(new Set())
  }

  // Handle successful create
  const handleCreateSuccess = () => {
    setCreateModalOpen(false)
    refetch()
  }

  // Handle successful publish
  const handlePublishSuccess = () => {
    setPublishModalJobIds([])
    setSelectedIds(new Set())
    refetch()
  }

  // Handle successful close
  const handleCloseSuccess = () => {
    setCloseModalJobIds([])
    setSelectedIds(new Set())
    refetch()
  }

  // Handle successful cancel
  const handleCancelSuccess = () => {
    setCancelModalJobIds([])
    setSelectedIds(new Set())
    refetch()
  }

  // Get selected jobs data for BatchActionsBar
  const selectedJobs = useMemo(() => {
    if (!jobsData?.jobs || selectedIds.size === 0) return []
    return jobsData.jobs.filter((job) => selectedIds.has(job.id_job_subregional))
  }, [jobsData?.jobs, selectedIds])

  return (
    <Layout>
      <div style={{ padding: '24px', paddingBottom: selectedIds.size > 0 ? '80px' : '24px' }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <SolutionOutlined /> Gestao de Vagas
            </Title>
            <Text type="secondary">
              Crie e publique vagas em multiplas subregionais usando templates da Gupy
            </Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>
                Atualizar
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                onClick={() => setCreateModalOpen(true)}
              >
                Criar Vaga
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="Total"
                value={stats.total}
                prefix={<SolutionOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card size="small">
              <Statistic
                title="Rascunhos"
                value={stats.draft}
                valueStyle={{ color: '#666' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card size="small">
              <Statistic
                title="Publicadas"
                value={stats.published}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card size="small">
              <Statistic
                title="Fechadas"
                value={stats.closed}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card size="small">
              <Statistic
                title="Canceladas"
                value={stats.canceled}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters Card */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Input
                placeholder="Buscar por nome ou codigo..."
                prefix={<SearchOutlined />}
                value={filters.searchText}
                onChange={handleSearchChange}
                allowClear
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="Status"
                value={filters.job_status}
                onChange={handleStatusChange}
                style={{ width: '100%' }}
                suffixIcon={<FilterOutlined />}
                allowClear
              >
                <Option value="draft">Rascunho</Option>
                <Option value="published">Publicada</Option>
                <Option value="closed">Fechada</Option>
                <Option value="canceled">Cancelada</Option>
              </Select>
            </Col>
            <Col xs={12} sm={6} md={5}>
              <Select
                placeholder="Subregional"
                value={filters.id_subregional}
                onChange={handleSubregionalChange}
                style={{ width: '100%' }}
                allowClear
                loading={loadingSubregionais}
                showSearch
                optionFilterProp="children"
              >
                {(subregionais || []).map((sub) => (
                  <Option key={sub.id_subregional} value={sub.id_subregional}>
                    {sub.nome_subregional}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={12} sm={6} md={5}>
              <Select
                placeholder="Unidade"
                value={filters.id_unidade}
                onChange={handleUnidadeChange}
                style={{ width: '100%' }}
                allowClear
                loading={loadingUnidades}
                showSearch
                optionFilterProp="children"
                disabled={!filters.id_subregional}
              >
                {(availableUnidades || []).map((u) => (
                  <Option key={u.id_unidade} value={u.id_unidade}>
                    {u.nome_unidade}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Button onClick={handleClearFilters}>Limpar Filtros</Button>
            </Col>
          </Row>
        </Card>

        {/* Jobs Table */}
        <Card>
          <JobsTable
            jobs={jobsData?.jobs || []}
            loading={isLoading}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onViewDetails={handleViewDetails}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: jobsData?.total || 0,
            }}
            onTableChange={handleTableChange}
          />
        </Card>

        {/* Batch Actions Bar (floating at bottom when items selected) */}
        <BatchActionsBar
          selectedCount={selectedIds.size}
          selectedJobs={selectedJobs}
          onDeleteDrafts={handleDeleteDrafts}
          onPublish={handleBatchPublish}
          onClose={handleBatchClose}
          onCancel={handleBatchCancel}
          onClear={handleClearSelection}
          loading={deleteDraftsMutation.isPending}
        />

        {/* Create Job Modal */}
        <CreateJobModal
          open={createModalOpen}
          onCancel={() => setCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />

        {/* Publish Modal (batch) */}
        <PublishModal
          open={publishModalJobIds.length > 0}
          jobIds={publishModalJobIds}
          onCancel={() => setPublishModalJobIds([])}
          onSuccess={handlePublishSuccess}
        />

        {/* Close Jobs Modal (batch) */}
        <CloseJobsModal
          open={closeModalJobIds.length > 0}
          jobIds={closeModalJobIds}
          onCancel={() => setCloseModalJobIds([])}
          onSuccess={handleCloseSuccess}
        />

        {/* Cancel Jobs Modal (batch) */}
        <CancelJobsModal
          open={cancelModalJobIds.length > 0}
          jobIds={cancelModalJobIds}
          onCancel={() => setCancelModalJobIds([])}
          onSuccess={handleCancelSuccess}
        />

        {/* Job Details Modal */}
        <JobDetailsModal
          open={!!detailsModalJobId}
          jobId={detailsModalJobId}
          onCancel={() => setDetailsModalJobId(null)}
        />
      </div>
    </Layout>
  )
}

export default withRecrutamentoOrAdmin(JobsPage)
