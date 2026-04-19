/**
 * SendEmailModal - Modal for sending mass emails to selected applications
 *
 * Features:
 * - Select email template from Gupy
 * - Preview template info
 * - Send to selected applications
 * - Show progress and results
 */

import { useState, useEffect } from 'react'
import {
  Modal,
  Select,
  Typography,
  Space,
  Alert,
  Spin,
  Result,
  Divider,
  Tag,
  Progress,
} from 'antd'
import { MailOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { useEmailTemplates, useBulkEmail, useActionStatus } from '../../hooks'

const { Text, Title } = Typography
const { Option } = Select

/**
 * @param {Object} props
 * @param {boolean} props.open - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {(Set.<number>|Array.<number>)} props.selectedIds - Selected application IDs
 * @param {Function} props.onSuccess - Success callback
 */
export default function SendEmailModal({ open, onClose, selectedIds, onSuccess }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)
  const [actionId, setActionId] = useState(null)
  const [sendResult, setSendResult] = useState(null)

  // Fetch email templates
  const { data: templates, isLoading: loadingTemplates, isError: templatesError } = useEmailTemplates({
    enabled: open,
  })

  // Send email mutation
  const sendEmailMutation = useBulkEmail()

  // Poll action status when actionId is set
  const { data: actionStatus, isLoading: loadingActionStatus } = useActionStatus(actionId, {
    enabled: !!actionId && !sendResult, // Stop polling once we have result
  })

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedTemplateId(null)
      setActionId(null)
      setSendResult(null)
    }
  }, [open])

  // Handle action completion
  useEffect(() => {
    if (actionStatus?.status === 'completed' && !sendResult) {
      setSendResult({
        success: actionStatus.failed === 0,
        message: `${actionStatus.completed} email(s) enviado(s)${actionStatus.failed > 0 ? `, ${actionStatus.failed} falha(s)` : ''}`,
        data: {
          sent: actionStatus.completed,
          failed: actionStatus.failed,
        },
        errors: actionStatus.errors,
      })

      if (actionStatus.failed === 0 && onSuccess) {
        onSuccess({
          message: `${actionStatus.completed} email(s) enviado(s) com sucesso`,
        })
      }
    }
  }, [actionStatus, sendResult, onSuccess])

  // Convert Set to Array if needed
  const applicationIds = Array.isArray(selectedIds) ? selectedIds : Array.from(selectedIds)

  // Get selected template details
  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId)

  const handleSend = async () => {
    if (!selectedTemplateId || applicationIds.length === 0) return

    try {
      const result = await sendEmailMutation.mutateAsync({
        applicationIds,
        templateId: selectedTemplateId,
        templateName: selectedTemplate?.name || selectedTemplate?.subject || `Template ${selectedTemplateId}`,
      })

      if (result.actionId) {
        setActionId(result.actionId)
      } else {
        // Synchronous result (no actionId)
        setSendResult({
          success: true,
          message: result.message,
          data: { sent: result.queued, failed: 0 },
        })
        if (onSuccess) {
          onSuccess({ message: result.message })
        }
      }
    } catch (error) {
      console.error('[SendEmailModal] Failed:', error)
      setSendResult({
        success: false,
        error: error.message,
      })
    }
  }

  const handleClose = () => {
    if (!sendEmailMutation.isPending && !actionId) {
      onClose()
    } else if (actionStatus?.status === 'completed') {
      onClose()
    }
  }

  const renderContent = () => {
    // Loading templates
    if (loadingTemplates) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>Carregando templates de email...</Text>
          </div>
        </div>
      )
    }

    // Templates error
    if (templatesError) {
      return (
        <Alert
          type="error"
          message="Erro ao carregar templates"
          description="Nao foi possivel carregar os templates de email da Gupy. Tente novamente."
        />
      )
    }

    // Processing - show when actionId is set AND (still loading poll OR status is running)
    if (actionId && (loadingActionStatus || actionStatus?.status === 'running')) {
      const percent = actionStatus?.total > 0
        ? Math.round((actionStatus.completed / actionStatus.total) * 100)
        : 0

      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Progress type="circle" percent={percent} />
          <div style={{ marginTop: 16 }}>
            <Text>
              Enviando: {actionStatus?.completed ?? 0} de {actionStatus?.total ?? '...'}
            </Text>
          </div>
        </div>
      )
    }

    // Send result
    if (sendResult) {
      if (sendResult.success) {
        return (
          <Result
            status="success"
            title="Emails enviados com sucesso!"
            subTitle={sendResult.message}
            extra={
              <Space direction="vertical">
                <Tag icon={<CheckCircleOutlined />} color="success">
                  {sendResult.data?.sent || 0} enviados
                </Tag>
                {sendResult.data?.failed > 0 && (
                  <Tag icon={<WarningOutlined />} color="warning">
                    {sendResult.data.failed} falhas
                  </Tag>
                )}
              </Space>
            }
          />
        )
      } else {
        return (
          <Result
            status="error"
            title="Erro ao enviar emails"
            subTitle={sendResult.error || 'Ocorreu um erro ao enviar os emails.'}
          />
        )
      }
    }

    // Template selection
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert
          type="info"
          message={`${applicationIds.length} candidatura(s) selecionada(s)`}
          description="Os emails serao enviados para todas as candidaturas selecionadas usando o template escolhido."
        />

        <div>
          <Text strong>Selecione o template de email:</Text>
          <Select
            placeholder="Escolha um template..."
            style={{ width: '100%', marginTop: 8 }}
            value={selectedTemplateId}
            onChange={setSelectedTemplateId}
            loading={loadingTemplates}
            showSearch
            optionFilterProp="children"
          >
            {(templates || []).map((template) => (
              <Option key={template.id} value={template.id}>
                {template.name || template.subject || `Template ${template.id}`}
              </Option>
            ))}
          </Select>
        </div>

        {selectedTemplate && (
          <>
            <Divider />
            <div>
              <Title level={5}>Preview do Template</Title>
              <Space direction="vertical" style={{ width: '100%' }}>
                {selectedTemplate.subject && (
                  <div>
                    <Text type="secondary">Assunto: </Text>
                    <Text strong>{selectedTemplate.subject}</Text>
                  </div>
                )}
                {selectedTemplate.name && (
                  <div>
                    <Text type="secondary">Nome: </Text>
                    <Text>{selectedTemplate.name}</Text>
                  </div>
                )}
              </Space>
            </div>
          </>
        )}
      </Space>
    )
  }

  const isProcessing = sendEmailMutation.isPending || (actionId && (loadingActionStatus || actionStatus?.status === 'running'))

  return (
    <Modal
      title={
        <Space>
          <MailOutlined />
          Enviar Email em Massa
        </Space>
      }
      open={open}
      onCancel={handleClose}
      onOk={sendResult ? handleClose : handleSend}
      okText={sendResult ? 'Fechar' : 'Enviar'}
      cancelText="Cancelar"
      okButtonProps={{
        disabled: !sendResult && (!selectedTemplateId || applicationIds.length === 0),
        loading: isProcessing,
      }}
      cancelButtonProps={{
        disabled: isProcessing,
        style: sendResult ? { display: 'none' } : {},
      }}
      closable={!isProcessing}
      maskClosable={!isProcessing}
      width={600}
    >
      {renderContent()}
    </Modal>
  )
}
