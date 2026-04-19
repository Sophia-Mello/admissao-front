/**
 * JobDetailsModal - View job details and edit linked units
 *
 * Features:
 * - Job name, code, status
 * - Subregional info
 * - Editable linked units (multi-select)
 * - HTML content preview (description, responsibilities, etc.)
 * - Gupy status indicator
 * - Confirmation popup when closing with unsaved changes
 *
 * @example
 * <JobDetailsModal
 *   open={!!detailsModalJobId}
 *   jobId={detailsModalJobId}
 *   onCancel={() => setDetailsModalJobId(null)}
 * />
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  Descriptions,
  Tag,
  Space,
  Typography,
  Divider,
  Spin,
  Alert,
  Tabs,
  Select,
  message,
} from 'antd'
import {
  EyeOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  CalendarOutlined,
  LinkOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { useJob, useUnidades, useUpdateJob } from '../../hooks'
import JobStatusBadge from './JobStatusBadge'

const { Text, Paragraph } = Typography

/**
 * Renders HTML content safely
 */
function HtmlContent({ content, title }) {
  if (!content) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <Text type="secondary">Nenhum conteudo definido para {title}</Text>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#fafafa',
        borderRadius: '4px',
        maxHeight: '300px',
        overflowY: 'auto',
      }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}

/**
 * @param {Object} props
 * @param {boolean} props.open - Whether modal is visible
 * @param {number|null} props.jobId - Job ID to display (null = closed)
 * @param {Function} props.onCancel - Callback when modal is closed
 */
export default function JobDetailsModal({ open, jobId, onCancel }) {
  // State for editable unidades
  const [selectedUnidades, setSelectedUnidades] = useState([])
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch job details
  const { data: job, isLoading, isError, error } = useJob(jobId, {
    enabled: !!jobId && open,
  })

  // Fetch all unidades for the job's subregional
  const { unidades: availableUnidades, isLoading: loadingUnidades } = useUnidades(
    job?.id_subregional
  )

  // Update job mutation
  const updateJobMutation = useUpdateJob()

  // Initialize selected unidades when job loads (only active job_unidade links)
  useEffect(() => {
    if (job?.unidades) {
      // Filter only active job_unidade records
      const activeUnidades = job.unidades.filter((u) => u.active === true)
      const currentIds = activeUnidades.map((u) => u.id_unidade)
      setSelectedUnidades(currentIds)
      setHasChanges(false)
    }
  }, [job])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedUnidades([])
      setHasChanges(false)
    }
  }, [open])

  // Check if selection has changed (only compare against active unidades)
  const originalIds = useMemo(() => {
    const activeUnidades = job?.unidades?.filter((u) => u.active === true) || []
    return activeUnidades.map((u) => u.id_unidade)
  }, [job])

  // Handle unidades selection change
  const handleUnidadesChange = (newValues) => {
    setSelectedUnidades(newValues)
    // Check if different from original
    const changed =
      newValues.length !== originalIds.length ||
      newValues.some((id) => !originalIds.includes(id))
    setHasChanges(changed)
  }

  // Build change summary
  const getChangeSummary = () => {
    const added = selectedUnidades.filter((id) => !originalIds.includes(id))
    const removed = originalIds.filter((id) => !selectedUnidades.includes(id))

    const addedNames = added
      .map((id) => availableUnidades?.find((u) => u.id_unidade === id)?.nome_unidade)
      .filter(Boolean)
    const removedNames = removed
      .map((id) => job?.unidades?.find((u) => u.id_unidade === id)?.nome_unidade)
      .filter(Boolean)

    return { added, removed, addedNames, removedNames }
  }

  // Save changes
  const handleSave = async () => {
    try {
      await updateJobMutation.mutateAsync({
        id: jobId,
        payload: { unidades: selectedUnidades },
      })
      message.success('Unidades atualizadas com sucesso!')
      setHasChanges(false)
      onCancel()
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao atualizar unidades')
    }
  }

  // Handle modal close - show confirmation if there are changes
  const handleClose = () => {
    if (hasChanges) {
      const summary = getChangeSummary()
      Modal.confirm({
        title: 'Salvar alteracoes?',
        icon: <EditOutlined />,
        content: (
          <div>
            <Paragraph>Voce fez alteracoes nas unidades vinculadas:</Paragraph>
            {summary.addedNames.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <Text type="success">+ Adicionadas ({summary.addedNames.length}):</Text>
                <br />
                <Text style={{ fontSize: '12px' }}>{summary.addedNames.join(', ')}</Text>
              </div>
            )}
            {summary.removedNames.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <Text type="danger">- Removidas ({summary.removedNames.length}):</Text>
                <br />
                <Text style={{ fontSize: '12px' }}>{summary.removedNames.join(', ')}</Text>
              </div>
            )}
            <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
              Deseja salvar as alteracoes?
            </Paragraph>
          </div>
        ),
        okText: 'Salvar',
        cancelText: 'Descartar',
        onOk: handleSave,
        onCancel: () => {
          setHasChanges(false)
          onCancel()
        },
      })
    } else {
      onCancel()
    }
  }

  // Tab items for HTML content sections
  const tabItems = job
    ? [
        {
          key: 'description',
          label: (
            <span>
              <FileTextOutlined /> Descricao
            </span>
          ),
          children: <HtmlContent content={job.description} title="Descricao" />,
        },
        {
          key: 'responsibilities',
          label: (
            <span>
              <InfoCircleOutlined /> Responsabilidades
            </span>
          ),
          children: <HtmlContent content={job.responsibilities} title="Responsabilidades" />,
        },
        {
          key: 'prerequisites',
          label: (
            <span>
              <InfoCircleOutlined /> Pre-requisitos
            </span>
          ),
          children: <HtmlContent content={job.prerequisites} title="Pre-requisitos" />,
        },
        {
          key: 'additional',
          label: (
            <span>
              <InfoCircleOutlined /> Info Adicional
            </span>
          ),
          children: (
            <HtmlContent content={job.additional_information} title="Informacao Adicional" />
          ),
        },
      ]
    : []

  return (
    <Modal
      title={
        <Space>
          <EyeOutlined />
          <span>Detalhes da Vaga</span>
          {hasChanges && (
            <Tag color="warning" style={{ marginLeft: 8 }}>
              Alteracoes nao salvas
            </Tag>
          )}
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={800}
    >
      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: '16px' }}>Carregando detalhes...</Paragraph>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Alert
          type="error"
          message="Erro ao carregar detalhes"
          description={error?.message || 'Nao foi possivel carregar os detalhes da vaga.'}
          showIcon
        />
      )}

      {/* Job Details */}
      {job && !isLoading && (
        <>
          {/* Basic Info */}
          <Descriptions
            bordered
            column={{ xs: 1, sm: 2 }}
            size="small"
            style={{ marginBottom: '24px' }}
          >
            <Descriptions.Item label="Nome da Vaga" span={2}>
              <Text strong>{job.job_name}</Text>
            </Descriptions.Item>

            <Descriptions.Item label="Codigo">
              <Text code>{job.job_code || '-'}</Text>
            </Descriptions.Item>

            <Descriptions.Item label="ID Gupy">
              <Text code copyable>
                {job.id_job_gupy || '-'}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="Status">
              <JobStatusBadge status={job.job_status} existsInGupy={job.exists_in_gupy} />
            </Descriptions.Item>

            <Descriptions.Item label="Ativo">
              <Tag color={job.ativo ? 'green' : 'red'}>{job.ativo ? 'Sim' : 'Nao'}</Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Subregional">
              {job.nome_subregional ? (
                <Tag icon={<EnvironmentOutlined />} color="blue">
                  {job.nome_subregional}
                </Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Regional">
              {job.nome_regional ? (
                <Tag color="cyan">{job.nome_regional}</Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Criado em">
              <Space>
                <CalendarOutlined />
                {job.created_at ? new Date(job.created_at).toLocaleString('pt-BR') : '-'}
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Atualizado em">
              <Space>
                <CalendarOutlined />
                {job.updated_at ? new Date(job.updated_at).toLocaleString('pt-BR') : '-'}
              </Space>
            </Descriptions.Item>

            {job.published_at && (
              <Descriptions.Item label="Publicado em" span={2}>
                <Space>
                  <CalendarOutlined />
                  {new Date(job.published_at).toLocaleString('pt-BR')}
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Linked Units - Editable Multi-Select */}
          <Divider orientation="left">
            <Space>
              <TeamOutlined />
              Unidades Vinculadas
              <Tag color="blue">{selectedUnidades.length}</Tag>
              {hasChanges && <Tag color="warning">modificado</Tag>}
            </Space>
          </Divider>

          <Select
            mode="multiple"
            style={{ width: '100%', marginBottom: '24px' }}
            placeholder={
              loadingUnidades
                ? 'Carregando unidades...'
                : 'Selecione as unidades vinculadas'
            }
            value={selectedUnidades}
            onChange={handleUnidadesChange}
            loading={loadingUnidades}
            disabled={loadingUnidades || !job?.id_subregional}
            showSearch
            optionFilterProp="label"
            maxTagCount="responsive"
            filterOption={(input, option) =>
              option?.label?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {(availableUnidades || []).map((unidade) => (
              <Select.Option
                key={unidade.id_unidade}
                value={unidade.id_unidade}
                label={unidade.nome_unidade}
              >
                <Space>
                  <span>{unidade.nome_unidade}</span>
                  {!unidade.email_unidade_agendador && (
                    <Tag
                      icon={<WarningOutlined />}
                      color="warning"
                      style={{ fontSize: '10px' }}
                    >
                      Sem email
                    </Tag>
                  )}
                </Space>
              </Select.Option>
            ))}
          </Select>

          {!job?.id_subregional && (
            <Alert
              type="warning"
              message="Esta vaga nao possui subregional associada"
              description="Nao e possivel vincular unidades sem uma subregional definida."
              showIcon
              style={{ marginBottom: '24px' }}
            />
          )}

          {/* HTML Content Tabs */}
          {(job.description ||
            job.responsibilities ||
            job.prerequisites ||
            job.additional_information) && (
            <>
              <Divider orientation="left">
                <Space>
                  <FileTextOutlined />
                  Conteudo da Vaga
                </Space>
              </Divider>
              <Tabs items={tabItems} />
            </>
          )}
        </>
      )}
    </Modal>
  )
}
