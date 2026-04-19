/**
 * BulkMoveModal - Modal for moving selected applications to a target step
 *
 * Features:
 * - Fetch common steps across selected applications
 * - Select target step
 * - Option to apply to same-template applications
 * - Closes immediately after submitting (progress tracked in ActionHistoryDrawer)
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  Select,
  Typography,
  Space,
  Alert,
  Spin,
  Checkbox,
  message,
} from 'antd'
import { SwapOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { useCommonSteps, useBulkMove } from '../../hooks'

const { Text } = Typography

/**
 * @param {Object} props
 * @param {boolean} props.open - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {(Set.<number>|Array.<number>)} props.selectedIds - Selected application IDs
 * @param {Function} props.onSuccess - Success callback
 */
export default function BulkMoveModal({ open, onClose, selectedIds, onSuccess }) {
  const [targetStep, setTargetStep] = useState(null)
  const [applyToSameTemplate, setApplyToSameTemplate] = useState(false)
  const queryClient = useQueryClient()

  // Convert Set to Array if needed
  const applicationIds = useMemo(
    () => (Array.isArray(selectedIds) ? selectedIds : Array.from(selectedIds)),
    [selectedIds]
  )

  // Fetch available steps (unique across all jobs of selected applications)
  const {
    data: availableSteps,
    isLoading: loadingSteps,
    isError: stepsError,
  } = useCommonSteps(applicationIds, {
    enabled: open && applicationIds.length > 0,
  })

  // Bulk move mutation
  const bulkMoveMutation = useBulkMove()

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setTargetStep(null)
      setApplyToSameTemplate(false)
    }
  }, [open])

  const handleSend = async () => {
    if (!targetStep || applicationIds.length === 0) return

    try {
      const result = await bulkMoveMutation.mutateAsync({
        applicationIds,
        targetStepName: targetStep,
        applyToSameTemplate,
      })

      const queuedCount = result.queued || result.data?.queued || applicationIds.length
      message.success(`${queuedCount} aplicacoes na fila para mover. Acompanhe no Historico.`)

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['actionHistory'] })

      if (onSuccess) {
        onSuccess({ message: result.message })
      }

      onClose() // Close immediately
    } catch (error) {
      console.error('[BulkMoveModal] Failed:', error)
      message.error(error.response?.data?.error || error.message || 'Erro ao iniciar movimentacao')
    }
  }

  const handleClose = () => {
    if (!bulkMoveMutation.isPending) {
      onClose()
    }
  }

  const renderContent = () => {
    // Loading steps
    if (loadingSteps) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>Buscando etapas comuns...</Text>
          </div>
        </div>
      )
    }

    // Steps error
    if (stepsError) {
      return (
        <Alert
          type="error"
          message="Erro ao carregar etapas"
          description="Nao foi possivel carregar as etapas comuns. Tente novamente."
        />
      )
    }

    // No common steps
    if (availableSteps && availableSteps.length === 0) {
      return (
        <Alert
          type="warning"
          message="Nenhuma etapa em comum"
          description="As vagas das candidaturas selecionadas nao possuem etapas em comum. Para mover em massa, selecione candidaturas de vagas com etapas identicas."
        />
      )
    }

    // Form
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert
          type="info"
          message={`${applicationIds.length} candidatura(s) selecionada(s)`}
          description="Escolha a etapa de destino para mover as candidaturas."
        />

        <div>
          <Text strong>Etapa de destino:</Text>
          <Select
            placeholder="Selecione a etapa..."
            style={{ width: '100%', marginTop: 8 }}
            value={targetStep}
            onChange={setTargetStep}
            showSearch
            optionFilterProp="children"
          >
            {(availableSteps || []).map((step) => (
              <Select.Option key={step.name} value={step.name}>
                {step.name}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div>
          <Checkbox
            checked={applyToSameTemplate}
            onChange={(e) => setApplyToSameTemplate(e.target.checked)}
          >
            <Space>
              Aplicar tambem a outras candidaturas dos mesmos candidatos em vagas do mesmo template
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
            </Space>
          </Checkbox>
        </div>

        {applyToSameTemplate && (
          <Alert
            type="warning"
            message="Acao expandida"
            description="Esta acao tambem movera outras candidaturas dos mesmos candidatos em vagas com o mesmo template."
            showIcon
          />
        )}
      </Space>
    )
  }

  const isProcessing = bulkMoveMutation.isPending
  const hasCommonSteps = availableSteps && availableSteps.length > 0

  return (
    <Modal
      title={
        <Space>
          <SwapOutlined />
          Mover Candidaturas em Massa
        </Space>
      }
      open={open}
      onCancel={handleClose}
      onOk={!hasCommonSteps ? handleClose : handleSend}
      okText={!hasCommonSteps ? 'Fechar' : 'Mover Candidaturas'}
      cancelText="Cancelar"
      okButtonProps={{
        disabled: hasCommonSteps && (!targetStep || applicationIds.length === 0),
        loading: isProcessing,
      }}
      cancelButtonProps={{
        disabled: isProcessing,
        style: !hasCommonSteps ? { display: 'none' } : {},
      }}
      closable={!isProcessing}
      maskClosable={!isProcessing}
      width={600}
    >
      {renderContent()}
    </Modal>
  )
}
