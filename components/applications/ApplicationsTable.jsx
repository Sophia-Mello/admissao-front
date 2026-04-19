/**
 * ApplicationsTable - Filterable, selectable applications table with batch operations
 *
 * Features:
 * - Ant Design Table with row selection
 * - Checkbox column for selecting applications (select all/individual)
 * - Candidate info column (name, CPF, email)
 * - Template column with tag display
 * - Subregional column with tag display
 * - Etapa Atual column with step name and status badges
 * - Tempo na Etapa column showing time elapsed in current step
 * - Gupy sync datetime column
 * - External link to Gupy application
 * - Sortable columns (candidate, template, subregional, step)
 * - Server-side pagination support
 *
 * @example
 * <ApplicationsTable
 *   applications={applications}
 *   loading={isLoading}
 *   selectedIds={selectedIds}
 *   onSelectionChange={setSelectedIds}
 *   pagination={{ current: 1, pageSize: 25, total: 100 }}
 *   onTableChange={handleTableChange}
 * />
 */

import { Table, Button, Tooltip, Checkbox, Typography, Tag, Space } from 'antd'
import { UserOutlined, ExportOutlined, MailOutlined, ClockCircleOutlined, WhatsAppOutlined } from '@ant-design/icons'

const { Text } = Typography

/**
 * Step status colors and labels (Gupy currentStep.status)
 * Values come from Gupy API in camelCase
 */
const stepStatusColors = {
  notStarted: 'orange',
  done: 'green',
  running: 'processing',
  waiting: 'orange',
}

const stepStatusLabels = {
  notStarted: 'Não Iniciado',
  done: 'Concluído',
  running: 'Em Andamento',
  waiting: 'Aguardando',
}

/**
 * Calculate time elapsed since a date in human-readable format (PT-BR)
 */
function getTimeElapsed(dateString) {
  if (!dateString) return null
  const startDate = new Date(dateString)
  const now = new Date()
  const diffMs = now - startDate

  if (diffMs < 0) return null

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h`
  }
  if (diffHours > 0) {
    return `${diffHours}h`
  }
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${diffMinutes}min`
}

/**
 * @param {Object} props
 * @param {Array} props.applications - Array of application objects
 * @param {boolean} props.loading - Loading state
 * @param {Set.<number>} props.selectedIds - Set of selected application IDs
 * @param {Function} props.onSelectionChange - Callback when selection changes (receives Set.<number>)
 * @param {Object} props.pagination - Pagination config { current, pageSize, total }
 * @param {Function} props.onTableChange - Table change handler
 * @param {Function} props.onCandidateClick - Callback when candidate name is clicked (receives candidate id)
 */
export default function ApplicationsTable({
  applications = [],
  loading = false,
  selectedIds = new Set(),
  onSelectionChange,
  pagination,
  onTableChange,
  onCandidateClick,
}) {
  // All applications are selectable
  const selectableApps = applications
  const allSelectableSelected = selectableApps.length > 0 && selectableApps.every((app) => selectedIds.has(app.id))

  // Handle "Select All" checkbox
  const handleSelectAll = (checked) => {
    if (checked) {
      const newSelection = new Set(selectedIds)
      selectableApps.forEach((app) => newSelection.add(app.id))
      onSelectionChange(newSelection)
    } else {
      const newSelection = new Set(selectedIds)
      selectableApps.forEach((app) => newSelection.delete(app.id))
      onSelectionChange(newSelection)
    }
  }

  // Handle individual row checkbox
  const handleRowSelect = (appId, checked) => {
    const newSelection = new Set(selectedIds)
    if (checked) {
      newSelection.add(appId)
    } else {
      newSelection.delete(appId)
    }
    onSelectionChange(newSelection)
  }

  const columns = [
    {
      title: () => (
        <Checkbox
          checked={allSelectableSelected}
          indeterminate={selectedIds.size > 0 && !allSelectableSelected}
          onChange={(e) => handleSelectAll(e.target.checked)}
          disabled={selectableApps.length === 0}
        />
      ),
      dataIndex: 'selection',
      key: 'selection',
      width: 50,
      render: (_, record) => (
        <Checkbox
          checked={selectedIds.has(record.id)}
          onChange={(e) => handleRowSelect(record.id, e.target.checked)}
        />
      ),
    },
    {
      title: 'Candidato',
      dataIndex: 'candidate_nome',
      key: 'candidate_nome',
      sorter: (a, b) => (a.candidate_nome || '').localeCompare(b.candidate_nome || ''),
      render: (text, record) => (
        <div>
          <Space size={4}>
            <UserOutlined style={{ color: '#1890ff' }} />
            {onCandidateClick ? (
              <Text
                strong
                style={{ cursor: 'pointer', color: '#1890ff' }}
                onClick={() => onCandidateClick(record.candidate_id)}
              >
                {text || '-'}
              </Text>
            ) : (
              <Text strong>{text || '-'}</Text>
            )}
          </Space>
          {record.candidate_cpf && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                CPF: {record.candidate_cpf}
              </Text>
            </div>
          )}
          {record.candidate_email && (
            <div>
              <Tooltip title="Enviar email">
                <a href={`mailto:${record.candidate_email}`} style={{ fontSize: '12px', color: '#1890ff' }}>
                  <MailOutlined style={{ marginRight: 4 }} />
                  {record.candidate_email}
                </a>
              </Tooltip>
            </div>
          )}
          {record.candidate_telefone && (
            <div>
              <Tooltip title="Abrir WhatsApp">
                <a
                  href={`https://wa.me/55${record.candidate_telefone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: '#25D366' }}
                >
                  <WhatsAppOutlined style={{ marginRight: 4 }} />
                  {record.candidate_telefone}
                </a>
              </Tooltip>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Template',
      dataIndex: 'template_name',
      key: 'template_name',
      width: 150,
      sorter: (a, b) => (a.template_name || '').localeCompare(b.template_name || ''),
      render: (text) =>
        text ? (
          <Tag color="blue">{text}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Subregional',
      dataIndex: 'nome_subregional',
      key: 'nome_subregional',
      width: 150,
      sorter: (a, b) => (a.nome_subregional || '').localeCompare(b.nome_subregional || ''),
      render: (text) =>
        text ? (
          <Tag color="purple">{text}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      width: 180,
      render: (tags) => {
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
          return <Text type="secondary">-</Text>
        }
        return (
          <Space size={[0, 4]} wrap>
            {tags.map((tag, index) => (
              <Tag key={index} color="cyan">
                {tag.name || tag}
              </Tag>
            ))}
          </Space>
        )
      },
    },
    {
      title: 'Etapa Atual',
      dataIndex: 'current_step_name',
      key: 'current_step_name',
      width: 150,
      sorter: (a, b) => (a.current_step_name || '').localeCompare(b.current_step_name || ''),
      render: (text, record) => (
        <div>
          <Text>{text || '-'}</Text>
          {record.current_step_status && (
            <div>
              <Tag color={stepStatusColors[record.current_step_status] || 'default'}>
                {stepStatusLabels[record.current_step_status] || record.current_step_status}
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Tempo na Etapa',
      dataIndex: 'current_step_started_at',
      key: 'current_step_started_at',
      width: 120,
      sorter: (a, b) => {
        const dateA = a.current_step_started_at ? new Date(a.current_step_started_at).getTime() : 0
        const dateB = b.current_step_started_at ? new Date(b.current_step_started_at).getTime() : 0
        return dateA - dateB
      },
      render: (date) => {
        const elapsed = getTimeElapsed(date)
        return elapsed ? (
          <Tooltip title={date ? new Date(date).toLocaleString('pt-BR') : ''}>
            <Space size={4}>
              <ClockCircleOutlined style={{ color: '#1890ff' }} />
              <Text>{elapsed}</Text>
            </Space>
          </Tooltip>
        ) : (
          <Text type="secondary">-</Text>
        )
      },
    },
    {
      title: 'Sync',
      dataIndex: 'gupy_synced_at',
      key: 'gupy_synced_at',
      width: 140,
      render: (date) =>
        date ? (
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {new Date(date).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Acoes',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          {record.id_job_gupy && record.id_application_gupy && (
            <Tooltip title="Abrir na Gupy">
              <Button
                icon={<ExportOutlined />}
                size="small"
                href={`https://tomeducacao.gupy.io/companies/jobs/${record.id_job_gupy}/candidates/${record.id_application_gupy}`}
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
      dataSource={applications}
      loading={loading}
      rowKey="id"
      pagination={pagination ? {
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        pageSizeOptions: ['10', '25', '50', '100'],
        showTotal: (total) => `Total: ${total} candidaturas`,
      } : {
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Total: ${total} candidaturas`,
      }}
      onChange={onTableChange}
      scroll={{ x: 1100 }}
    />
  )
}
