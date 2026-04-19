/**
 * CancelJobsModal - Modal for canceling one or more jobs
 *
 * Cancels jobs in Gupy - changes status to 'canceled'.
 * Requires a cancellation reason.
 * Used for batch operations when jobs are selected.
 *
 * @example
 * <CancelJobsModal
 *   open={cancelModalOpen}
 *   jobIds={[1, 2, 3]}
 *   onCancel={() => setCancelModalOpen(false)}
 *   onSuccess={() => { setCancelModalOpen(false); refetch(); }}
 * />
 */

import { useState } from 'react'
import {
  Modal,
  Form,
  Input,
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
  CloseCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { useCancelJobs, useJobs } from '../../hooks'

const { Text } = Typography
const { TextArea } = Input

/**
 * @param {Object} props
 * @param {boolean} props.open - Whether modal is visible
 * @param {number[]} props.jobIds - Array of job IDs to cancel
 * @param {Function} props.onCancel - Callback when modal is closed
 * @param {Function} props.onSuccess - Callback when cancel is complete
 */
export default function CancelJobsModal({ open, jobIds = [], onCancel, onSuccess }) {
  const [form] = Form.useForm()
  const [cancelResult, setCancelResult] = useState(null)

  // Cancel jobs mutation
  const cancelMutation = useCancelJobs()

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
  const handleSubmit = async (values) => {
    try {
      const result = await cancelMutation.mutateAsync({
        ids: jobIds,
        cancelReasonNotes: values.cancelReasonNotes,
      })

      // Show result for batch operations
      if (isBatchMode && result.results) {
        setCancelResult(result)
      } else {
        message.success(
          isBatchMode
            ? `${jobIds.length} vagas canceladas com sucesso!`
            : 'Vaga cancelada com sucesso!'
        )
        handleClose()
        onSuccess()
      }
    } catch (error) {
      console.error('[CancelJobsModal] Cancel error:', error)
      message.error(error.response?.data?.error || error.message || 'Erro ao cancelar vaga(s)')
    }
  }

  // Handle modal close
  const handleClose = () => {
    form.resetFields()
    setCancelResult(null)
    onCancel()
  }

  // Handle closing result view and triggering success
  const handleCloseResult = () => {
    setCancelResult(null)
    onSuccess()
    handleClose()
  }

  // Render result view for batch operations
  if (cancelResult) {
    const { summary, results } = cancelResult
    return (
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>Resultado do Cancelamento</span>
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
              ? `Cancelamento parcialmente concluido`
              : `Todas as vagas canceladas!`
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
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
          <span>{isBatchMode ? 'Cancelar Vagas' : 'Cancelar Vaga'}</span>
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
        message="Acao Irreversivel"
        description="Ao cancelar uma vaga, ela sera permanentemente encerrada. Esta acao nao pode ser desfeita."
        type="error"
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

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={cancelMutation.isPending}
      >
        <Form.Item
          label="Motivo do Cancelamento"
          name="cancelReasonNotes"
          rules={[
            { required: true, message: 'Informe o motivo do cancelamento' },
            { min: 10, message: 'Motivo deve ter pelo menos 10 caracteres' },
          ]}
          extra="Descreva o motivo do cancelamento da vaga"
        >
          <TextArea
            rows={4}
            placeholder="Ex: Vaga preenchida internamente, projeto cancelado, etc."
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* Footer */}
        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleClose}>Voltar</Button>
            <Button
              type="primary"
              danger
              htmlType="submit"
              loading={cancelMutation.isPending}
              icon={<CloseCircleOutlined />}
            >
              {isBatchMode ? `Cancelar ${jobIds.length} Vagas` : 'Cancelar Vaga'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}
