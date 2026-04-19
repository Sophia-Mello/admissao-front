/**
 * BulkTagModal - Modal for adding/removing tags from selected applications
 *
 * Features:
 * - Select existing tag or create new
 * - Choose action (add/remove)
 * - Send to selected applications
 * - Show progress via actionId polling
 */

import { useState, useEffect, useRef } from 'react'
import {
  Modal,
  Select,
  Typography,
  Space,
  Alert,
  Spin,
  Result,
  Radio,
  Input,
  Tag,
  Progress,
} from 'antd'
import { TagOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons'
import { useApplicationTags, useBulkTags, useActionStatus } from '../../hooks'

const { Text } = Typography

/**
 * @param {Object} props
 * @param {boolean} props.open - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {(Set.<number>|Array.<number>)} props.selectedIds - Selected application IDs
 * @param {Function} props.onSuccess - Success callback
 */
export default function BulkTagModal({ open, onClose, selectedIds, onSuccess }) {
  const [selectedTag, setSelectedTag] = useState(null)
  const [newTagName, setNewTagName] = useState('')
  const [action, setAction] = useState('add')
  const [actionId, setActionId] = useState(null)
  const [sendResult, setSendResult] = useState(null)

  // Ref to prevent calling onSuccess multiple times
  const successCalledRef = useRef(false)

  // Fetch existing tags
  const { data: existingTags, isLoading: loadingTags } = useApplicationTags({
    enabled: open,
  })

  // Bulk tags mutation
  const bulkTagsMutation = useBulkTags()

  // Poll action status when actionId is set
  const { data: actionStatus } = useActionStatus(actionId, {
    enabled: !!actionId && !sendResult, // Stop polling once we have result
  })

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedTag(null)
      setNewTagName('')
      setAction('add')
      setActionId(null)
      setSendResult(null)
      successCalledRef.current = false
    }
  }, [open])

  // Handle action completion
  useEffect(() => {
    if (actionStatus?.status === 'completed' && !successCalledRef.current) {
      successCalledRef.current = true

      setSendResult({
        success: actionStatus.failed === 0,
        completed: actionStatus.completed,
        failed: actionStatus.failed,
        errors: actionStatus.errors,
      })

      if (actionStatus.failed === 0 && onSuccess) {
        onSuccess({
          message: `${action === 'add' ? 'Tags adicionadas' : 'Tags removidas'}: ${actionStatus.completed} sucesso`,
        })
      }
    }
  }, [actionStatus, action, onSuccess])

  // Convert Set to Array if needed
  const applicationIds = Array.isArray(selectedIds) ? selectedIds : Array.from(selectedIds)

  // Get final tag name (selected or new)
  const finalTagName = selectedTag === '__new__' ? newTagName.trim() : selectedTag

  const handleSend = async () => {
    if (!finalTagName || applicationIds.length === 0) return

    try {
      const result = await bulkTagsMutation.mutateAsync({
        applicationIds,
        tagName: finalTagName,
        action,
      })

      if (result.actionId) {
        setActionId(result.actionId)
      } else {
        // Synchronous result
        setSendResult({
          success: true,
          completed: result.queued,
          failed: 0,
        })
        if (onSuccess) {
          onSuccess({ message: result.message })
        }
      }
    } catch (error) {
      console.error('[BulkTagModal] Failed:', error)
      setSendResult({
        success: false,
        error: error.message,
      })
    }
  }

  const handleClose = () => {
    if (!bulkTagsMutation.isPending && !actionId) {
      onClose()
    } else if (actionStatus?.status === 'completed') {
      onClose()
    }
  }

  const renderContent = () => {
    // Loading
    if (loadingTags) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>Carregando tags...</Text>
          </div>
        </div>
      )
    }

    // Processing
    if (actionId && actionStatus?.status === 'running') {
      const percent = actionStatus.total > 0
        ? Math.round((actionStatus.completed / actionStatus.total) * 100)
        : 0

      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Progress type="circle" percent={percent} />
          <div style={{ marginTop: 16 }}>
            <Text>
              Processando: {actionStatus.completed} de {actionStatus.total}
            </Text>
          </div>
        </div>
      )
    }

    // Result
    if (sendResult) {
      if (sendResult.success || sendResult.completed > 0) {
        return (
          <Result
            status="success"
            title={`${action === 'add' ? 'Tags adicionadas' : 'Tags removidas'} com sucesso!`}
            subTitle={`${sendResult.completed} candidatura(s) processada(s)${sendResult.failed > 0 ? `, ${sendResult.failed} falha(s)` : ''}`}
          />
        )
      } else {
        return (
          <Result
            status="error"
            title="Erro ao processar tags"
            subTitle={sendResult.error || 'Ocorreu um erro.'}
          />
        )
      }
    }

    // Form
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert
          type="info"
          message={`${applicationIds.length} candidatura(s) selecionada(s)`}
          description="Escolha a acao e a tag para aplicar."
        />

        <div>
          <Text strong>Acao:</Text>
          <Radio.Group
            value={action}
            onChange={(e) => setAction(e.target.value)}
            style={{ display: 'block', marginTop: 8 }}
          >
            <Radio value="add">
              <PlusOutlined /> Adicionar tag
            </Radio>
{/*
              TODO: Remover tag desabilitado - API DELETE /tags da Gupy está bugada.
              Retorna 200 mas não remove a tag. Testado via Swagger deles.
              Reabilitar quando Gupy corrigir.
              <Radio value="remove">
                <MinusOutlined /> Remover tag
              </Radio>
            */}
          </Radio.Group>
        </div>

        <div>
          <Text strong>Tag:</Text>
          <Select
            placeholder="Selecione uma tag ou crie nova..."
            style={{ width: '100%', marginTop: 8 }}
            value={selectedTag}
            onChange={setSelectedTag}
            showSearch
            filterOption={(input, option) => {
              // Custom filter that searches by tag name
              const tagName = option?.['data-tagname'] || option?.value || ''
              return tagName.toLowerCase().includes(input.toLowerCase())
            }}
          >
            <Select.Option value="__new__" data-tagname="criar nova">
              <PlusOutlined /> Criar nova tag...
            </Select.Option>
            {(existingTags || []).map((tag) => (
              <Select.Option key={tag.name} value={tag.name} data-tagname={tag.name}>
                <Tag>{tag.name}</Tag> ({tag.count})
              </Select.Option>
            ))}
          </Select>
        </div>

        {selectedTag === '__new__' && (
          <div>
            <Text strong>Nome da nova tag:</Text>
            <Input
              placeholder="Digite o nome da nova tag..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>
        )}
      </Space>
    )
  }

  const isProcessing = bulkTagsMutation.isPending || (actionId && actionStatus?.status === 'running')

  return (
    <Modal
      title={
        <Space>
          <TagOutlined />
          Gerenciar Tags em Massa
        </Space>
      }
      open={open}
      onCancel={handleClose}
      onOk={sendResult ? handleClose : handleSend}
      okText={sendResult ? 'Fechar' : action === 'add' ? 'Adicionar Tags' : 'Remover Tags'}
      cancelText="Cancelar"
      okButtonProps={{
        disabled: !sendResult && (!finalTagName || applicationIds.length === 0),
        loading: isProcessing,
        danger: action === 'remove' && !sendResult,
      }}
      cancelButtonProps={{
        disabled: isProcessing,
        style: sendResult ? { display: 'none' } : {},
      }}
      closable={!isProcessing}
      maskClosable={!isProcessing}
      width={500}
    >
      {renderContent()}
    </Modal>
  )
}
