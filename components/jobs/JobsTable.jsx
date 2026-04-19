/**
 * JobsTable - Filterable, selectable jobs table with batch operations
 *
 * Features:
 * - Ant Design Table with row selection
 * - Status column with colored badges
 * - Actions column (view only - batch operations in BatchActionsBar)
 * - Checkbox column for selecting jobs
 * - Sorting by name, status, created date
 *
 * @example
 * <JobsTable
 *   jobs={jobs}
 *   loading={isLoading}
 *   selectedIds={selectedIds}
 *   onSelectionChange={setSelectedIds}
 *   onViewDetails={(id) => setDetailsModalJobId(id)}
 * />
 */

import { Table, Button, Tooltip, Checkbox, Typography, Tag, Space } from 'antd'
import { EyeOutlined, EnvironmentOutlined, TeamOutlined, ExportOutlined } from '@ant-design/icons'
import JobStatusBadge from './JobStatusBadge'

const { Text } = Typography

/**
 * @param {Object} props
 * @param {Array} props.jobs - Array of job objects
 * @param {boolean} props.loading - Loading state
 * @param {Set<number>} props.selectedIds - Set of selected job IDs
 * @param {Function} props.onSelectionChange - Callback when selection changes (receives Set<number>)
 * @param {Function} props.onViewDetails - Callback when view details button is clicked (receives jobId)
 */
export default function JobsTable({
  jobs = [],
  loading = false,
  selectedIds = new Set(),
  onSelectionChange,
  onViewDetails,
  pagination,
  onTableChange,
}) {
  // Filter selectable jobs (exists in Gupy and not canceled)
  const selectableJobs = jobs.filter((job) => job.exists_in_gupy !== false && job.job_status !== 'canceled')
  const allSelectableSelected = selectableJobs.length > 0 && selectableJobs.every((job) => selectedIds.has(job.id_job_subregional))

  // Handle "Select All" checkbox
  const handleSelectAll = (checked) => {
    if (checked) {
      const newSelection = new Set(selectedIds)
      selectableJobs.forEach((job) => newSelection.add(job.id_job_subregional))
      onSelectionChange(newSelection)
    } else {
      const newSelection = new Set(selectedIds)
      selectableJobs.forEach((job) => newSelection.delete(job.id_job_subregional))
      onSelectionChange(newSelection)
    }
  }

  // Handle individual row checkbox
  const handleRowSelect = (jobId, checked) => {
    const newSelection = new Set(selectedIds)
    if (checked) {
      newSelection.add(jobId)
    } else {
      newSelection.delete(jobId)
    }
    onSelectionChange(newSelection)
  }

  // Table columns configuration
  const columns = [
    {
      title: () => (
        <Checkbox
          checked={allSelectableSelected}
          indeterminate={selectedIds.size > 0 && !allSelectableSelected}
          onChange={(e) => handleSelectAll(e.target.checked)}
          disabled={selectableJobs.length === 0}
        />
      ),
      dataIndex: 'selection',
      key: 'selection',
      width: 50,
      render: (_, record) => {
        const isSelectable = record.exists_in_gupy !== false && record.job_status !== 'canceled'
        return (
          <Checkbox
            checked={selectedIds.has(record.id_job_subregional)}
            disabled={!isSelectable}
            onChange={(e) => handleRowSelect(record.id_job_subregional, e.target.checked)}
          />
        )
      },
    },
    {
      title: 'Nome da Vaga',
      dataIndex: 'job_name',
      key: 'job_name',
      sorter: (a, b) => (a.job_name || '').localeCompare(b.job_name || ''),
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          {record.job_code && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Codigo: {record.job_code}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Subregional',
      dataIndex: 'nome_subregional',
      key: 'nome_subregional',
      width: 180,
      sorter: (a, b) => (a.nome_subregional || '').localeCompare(b.nome_subregional || ''),
      render: (text) =>
        text ? (
          <Tag icon={<EnvironmentOutlined />} color="blue">
            {text}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'job_status',
      key: 'job_status',
      width: 160,
      align: 'center',
      sorter: (a, b) => (a.job_status || '').localeCompare(b.job_status || ''),
      render: (job_status, record) => (
        <JobStatusBadge status={job_status} existsInGupy={record.exists_in_gupy} />
      ),
    },
    {
      title: 'Unidades',
      dataIndex: 'total_unidades',
      key: 'total_unidades',
      width: 100,
      align: 'center',
      sorter: (a, b) => (parseInt(a.total_unidades) || 0) - (parseInt(b.total_unidades) || 0),
      render: (count) => (
        <Tag icon={<TeamOutlined />} color="green">
          {count || 0}
        </Tag>
      ),
    },
    {
      title: 'Criado em',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      render: (date) =>
        date ? new Date(date).toLocaleDateString('pt-BR') : '-',
    },
    {
      title: 'Acoes',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Ver detalhes">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => onViewDetails(record.id_job_subregional)}
            />
          </Tooltip>
          {record.id_job_gupy && (
            <Tooltip title="Abrir na Gupy">
              <Button
                icon={<ExportOutlined />}
                size="small"
                href={`https://tomeducacao.gupy.io/companies/jobs/${record.id_job_gupy}/candidates?type=all`}
                target="_blank"
                rel="noopener noreferrer"
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={jobs}
      loading={loading}
      rowKey="id_job_subregional"
      pagination={pagination ? {
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        pageSizeOptions: ['10', '25', '50'],
        showTotal: (total) => `Total: ${total} vagas`,
      } : {
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Total: ${total} vagas`,
      }}
      onChange={onTableChange}
      scroll={{ x: 900 }}
    />
  )
}
