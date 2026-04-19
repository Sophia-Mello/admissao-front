/**
 * PublishModal - Modal for publishing one or more jobs to Gupy
 *
 * Features:
 * - Shows job name(s) being published
 * - Hiring deadline picker
 * - Application deadline picker
 * - Job boards selection (checkboxes)
 * - Batch mode: Shows count, progress during publish
 * - Batch result: Summary of success/failure per job
 *
 * Note: Location is now stored in the database and associated by the backend on publish.
 *
 * @example
 * // Single job publish
 * <PublishModal
 *   open={publishModalOpen}
 *   jobIds={[1]}
 *   onCancel={() => setPublishModalOpen(false)}
 *   onSuccess={() => { setPublishModalOpen(false); refetch(); }}
 * />
 *
 * // Batch publish
 * <PublishModal
 *   open={publishModalOpen}
 *   jobIds={[1, 2, 3]}
 *   onCancel={() => setPublishModalOpen(false)}
 *   onSuccess={() => { setPublishModalOpen(false); clearSelection(); refetch(); }}
 * />
 */

import { useState } from 'react'
import {
  Modal,
  Form,
  DatePicker,
  Select,
  Alert,
  Space,
  Button,
  message,
  Divider,
  Typography,
  Card,
  Tag,
  Result,
  List,
} from 'antd'
import {
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { usePublishJobs, useJobs } from '../../hooks'
import dayjs from 'dayjs'

const { Text } = Typography
const { Option } = Select

// Free job boards available for selection
const FREE_JOB_BOARDS = [
  { id: 1, name: 'Indeed', group: 'Principais' },
  { id: 3, name: 'LinkedIn', group: 'Principais' },
  { id: 10, name: 'Riovagas', group: 'Gratuitos' },
  { id: 11, name: 'Jooble', group: 'Gratuitos' },
  { id: 12, name: 'Netvagas', group: 'Gratuitos' },
  { id: 13, name: '99Hunters', group: 'Gratuitos' },
  { id: 15, name: 'Talent', group: 'Gratuitos' },
  { id: 147, name: 'Career Jet', group: 'Gratuitos' },
  { id: 279, name: 'Jobbol', group: 'Gratuitos' },
  { id: 246, name: 'Carreira Fashion', group: 'Gratuitos' },
  { id: 213, name: 'Yduqs', group: 'Gratuitos' },
  { id: 180, name: 'Recruta Simples', group: 'Gratuitos' },
]

/**
 * @param {Object} props
 * @param {boolean} props.open - Whether modal is visible
 * @param {number[]} props.jobIds - Array of job IDs to publish (single or batch)
 * @param {Function} props.onCancel - Callback when modal is closed
 * @param {Function} props.onSuccess - Callback when publish is complete
 */
export default function PublishModal({ open, jobIds = [], onCancel, onSuccess }) {
  const [form] = Form.useForm()
  const [publishResult, setPublishResult] = useState(null)

  // Publish jobs mutation
  const publishMutation = usePublishJobs()

  // Get jobs data to display names
  const { data: jobsData } = useJobs({}, { enabled: open && jobIds.length > 0 })

  // Find job names for display
  const getJobNames = () => {
    if (!jobsData?.jobs || !jobIds.length) return []
    return jobIds
      .map((id) => {
        const job = jobsData.jobs.find((j) => j.id_job_subregional === id)
        return job?.job_name || `Job #${id}`
      })
  }

  const isBatchMode = jobIds.length > 1
  const jobNames = getJobNames()

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      const result = await publishMutation.mutateAsync({
        ids: jobIds,
        jobBoards: values.jobBoards || [],
        publishStatus: true,
        hiringDeadline: values.hiringDeadline.toISOString(),
        applicationDeadline: values.applicationDeadline.toISOString(),
      })

      // Show result for batch operations
      if (isBatchMode && result.results) {
        setPublishResult(result)
      } else {
        message.success(
          isBatchMode
            ? `${jobIds.length} vagas publicadas com sucesso!`
            : 'Vaga publicada com sucesso!'
        )
        handleClose()
        onSuccess()
      }
    } catch (error) {
      console.error('[PublishModal] Publish error:', error)
      message.error(error.response?.data?.error || error.message || 'Erro ao publicar vaga(s)')
    }
  }

  // Handle modal close
  const handleClose = () => {
    form.resetFields()
    setPublishResult(null)
    onCancel()
  }

  // Handle closing result view and triggering success
  const handleCloseResult = () => {
    setPublishResult(null)
    onSuccess()
    handleClose()
  }

  // Quick select actions for job boards
  const selectAllFree = () => {
    form.setFieldsValue({ jobBoards: FREE_JOB_BOARDS.map((b) => b.id) })
  }

  const selectMainOnly = () => {
    form.setFieldsValue({ jobBoards: [1, 3] }) // Indeed + LinkedIn
  }

  const clearJobBoards = () => {
    form.setFieldsValue({ jobBoards: [] })
  }

  // Render result view for batch operations
  if (publishResult) {
    const { summary, results } = publishResult
    return (
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>Resultado da Publicacao</span>
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
              ? `Publicacao parcialmente concluida`
              : `Todas as vagas publicadas!`
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
          <SendOutlined />
          <span>{isBatchMode ? 'Publicar Vagas em Lote' : 'Publicar Vaga'}</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={700}
      destroyOnClose
    >
      {/* Info Alert */}
      <Alert
        message={
          isBatchMode
            ? `Publicando ${jobIds.length} vagas simultaneamente`
            : 'Publicar vaga na Gupy'
        }
        description="Configure as datas limites e selecione os portais de emprego."
        type="info"
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
        disabled={publishMutation.isPending}
        initialValues={{
          hiringDeadline: dayjs().add(90, 'days'),
          applicationDeadline: dayjs().add(60, 'days'),
          jobBoards: [],
        }}
      >
        <Divider orientation="left">Datas</Divider>

        {/* Hiring Deadline */}
        <Form.Item
          label="Data Prevista de Contratacao"
          name="hiringDeadline"
          rules={[
            { required: true, message: 'Data de contratacao e obrigatoria' },
            {
              validator: (_, value) => {
                if (!value) return Promise.reject()
                if (value.isBefore(dayjs())) {
                  return Promise.reject(new Error('Data deve ser no futuro'))
                }
                return Promise.resolve()
              },
            },
          ]}
          extra="Data limite para contratar. Gupy fecha a vaga automaticamente apos esta data."
        >
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            disabledDate={(current) => current && current < dayjs().startOf('day')}
            placeholder="Selecione a data"
          />
        </Form.Item>

        {/* Application Deadline */}
        <Form.Item
          label="Data de Encerramento das Inscricoes"
          name="applicationDeadline"
          rules={[
            { required: true, message: 'Data de encerramento e obrigatoria' },
            {
              validator: (_, value) => {
                if (!value) return Promise.reject()
                if (value.isBefore(dayjs())) {
                  return Promise.reject(new Error('Data deve ser no futuro'))
                }
                return Promise.resolve()
              },
            },
          ]}
          extra="Data final para receber candidaturas."
        >
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            disabledDate={(current) => current && current < dayjs().startOf('day')}
            placeholder="Selecione a data"
          />
        </Form.Item>

        <Divider orientation="left">Portais de Emprego</Divider>

        {/* Job Boards Selection */}
        <Form.Item
          label={
            <Space>
              <span>Portais de Emprego</span>
              <Button size="small" type="link" onClick={selectAllFree}>
                Todos Gratuitos
              </Button>
              <Button size="small" type="link" onClick={selectMainOnly}>
                Apenas Principais
              </Button>
              <Button size="small" type="link" danger onClick={clearJobBoards}>
                Limpar
              </Button>
            </Space>
          }
          name="jobBoards"
          extra="Selecione onde a vaga sera divulgada."
        >
          <Select
            mode="multiple"
            placeholder="Selecione os portais"
            allowClear
            maxTagCount="responsive"
          >
            <Select.OptGroup label="Principais (Gratuitos)">
              {FREE_JOB_BOARDS.filter((b) => b.group === 'Principais').map((board) => (
                <Option key={board.id} value={board.id}>
                  {board.name}
                </Option>
              ))}
            </Select.OptGroup>
            <Select.OptGroup label="Portais Gratuitos">
              {FREE_JOB_BOARDS.filter((b) => b.group === 'Gratuitos').map((board) => (
                <Option key={board.id} value={board.id}>
                  {board.name}
                </Option>
              ))}
            </Select.OptGroup>
          </Select>
        </Form.Item>

        <Divider />

        {/* Warning */}
        <Alert
          message="Atencao"
          description={
            isBatchMode
              ? `Ao clicar em 'Publicar', ${jobIds.length} vagas serao imediatamente ativadas na Gupy.`
              : "Ao clicar em 'Publicar', a vaga sera imediatamente ativada na Gupy."
          }
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        {/* Footer */}
        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={publishMutation.isPending}
              icon={<SendOutlined />}
            >
              {isBatchMode ? `Publicar ${jobIds.length} Vagas` : 'Publicar Vaga'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}
