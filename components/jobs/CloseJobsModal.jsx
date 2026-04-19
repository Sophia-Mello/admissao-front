/**
 * CloseJobsModal - Modal for closing one or more jobs
 *
 * Closes jobs in Gupy - changes status to 'closed'.
 * Used for batch operations when jobs are selected.
 *
 * @example
 * <CloseJobsModal
 *   open={closeModalOpen}
 *   jobIds={[1, 2, 3]}
 *   onCancel={() => setCloseModalOpen(false)}
 *   onSuccess={() => { setCloseModalOpen(false); refetch(); }}
 * />
 */

import { useState } from 'react'
import {
  Modal,
  Alert,
  Space,
  Button,
  message,
  Typography,
  Card,
  Tag,
  Result,
  List,
  Divider,
} from 'antd'
import {
  StopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { useCloseJobs, useJobs } from '../../hooks'

const { Text } = Typography

/**
 * @param {Object} props
 * @param {boolean} props.open - Whether modal is visible
 * @param {number[]} props.jobIds - Array of job IDs to close
 * @param {Function} props.onCancel - Callback when modal is closed
 * @param {Function} props.onSuccess - Callback when close is complete
 */
export default function CloseJobsModal({ open, jobIds = [], onCancel, onSuccess }) {
  const [closeResult, setCloseResult] = useState(null)

  // Close jobs mutation
  const closeMutation = useCloseJobs()

  // Get jobs data to display names
  const { data: jobsData } = useJobs({}, { enabled: open && jobIds.length > 0 })

  // Find job names for display
  const getJobNames = () => {
    if (!jobsData?.jobs || !jobIds.length) return []
    return jobIds.map((id) => {
      const job = jobsData.jobs.find((j) => j.id_job_subregional === id)
      return job?.job_name || `Job #${id}`
    })
  }

  const isBatchMode = jobIds.length > 1
  const jobNames = getJobNames()

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const result = await closeMutation.mutateAsync({ ids: jobIds })

      // Show result for batch operations
      if (isBatchMode && result.results) {
        setCloseResult(result)
      } else {
        message.success(
          isBatchMode
            ? `${jobIds.length} vagas fechadas com sucesso!`
            : 'Vaga fechada com sucesso!'
        )
        handleClose()
        onSuccess()
      }
    } catch (error) {
      console.error('[CloseJobsModal] Close error:', error)
      message.error(error.response?.data?.error || error.message || 'Erro ao fechar vaga(s)')
    }
  }

  // Handle modal close
  const handleClose = () => {
    setCloseResult(null)
    onCancel()
  }

  // Handle closing result view and triggering success
  const handleCloseResult = () => {
    setCloseResult(null)
    onSuccess()
    handleClose()
  }

  // Render result view for batch operations
  if (closeResult) {
    const { summary, results } = closeResult
    return (
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>Resultado do Fechamento</span>
          </Space>
        }
        open={open}
        onCancel={handleCloseResult}
        footer={[
          <Button key="close" type="primary" onClick={handleCloseResult}>
            Fechar
          </Button>,
        ]}
        width={600}
      >
        <Result
          status={summary.failed > 0 ? 'warning' : 'success'}
          title={
            summary.failed > 0
              ? `Fechamento parcialmente concluido`
              : `Todas as vagas fechadas!`
          }
          subTitle={
            <Space direction="vertical" align="center">
              <Text>
                <Tag color="green">{summary.succeeded} sucesso</Tag>
                {summary.failed > 0 && <Tag color="red">{summary.failed} erro(s)</Tag>}
              </Text>
            </Space>
          }
        />

        <Divider>Detalhes</Divider>

        <List
          size="small"
          dataSource={results}
          renderItem={(item) => (
            <List.Item>
              <Space>
                {item.success ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
                <Text strong={!item.success} type={item.success ? undefined : 'danger'}>
                  {item.job_name}
                </Text>
                {!item.success && item.error && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    - {item.error}
                  </Text>
                )}
              </Space>
            </List.Item>
          )}
        />
      </Modal>
    )
  }

  return (
    <Modal
      title={
        <Space>
          <StopOutlined />
          <span>{isBatchMode ? 'Fechar Vagas' : 'Fechar Vaga'}</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      {/* Warning Alert */}
      <Alert
        message="Acao de Fechamento"
        description="Ao fechar uma vaga, ela nao aceitara mais candidaturas. Esta acao pode ser revertida republicando a vaga."
        type="warning"
        showIcon
        style={{ marginBottom: '16px' }}
      />

      {/* Job Names Preview */}
      {jobNames.length > 0 && (
        <Card
          size="small"
          style={{ marginBottom: '16px', backgroundColor: '#f5f5f5' }}
        >
          <Text strong>{isBatchMode ? 'Vagas selecionadas:' : 'Vaga:'}</Text>
          <div style={{ marginTop: '8px' }}>
            {isBatchMode ? (
              <Space wrap>
                {jobNames.slice(0, 5).map((name, idx) => (
                  <Tag key={idx}>{name}</Tag>
                ))}
                {jobNames.length > 5 && <Tag>+{jobNames.length - 5} mais</Tag>}
              </Space>
            ) : (
              <Text>{jobNames[0]}</Text>
            )}
          </div>
        </Card>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button
          type="primary"
          danger
          onClick={handleSubmit}
          loading={closeMutation.isPending}
          icon={<StopOutlined />}
        >
          {isBatchMode ? `Fechar ${jobIds.length} Vagas` : 'Fechar Vaga'}
        </Button>
      </div>
    </Modal>
  )
}
