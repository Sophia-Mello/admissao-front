/**
 * BulkReproveModal - Modal for reproving selected applications with a reason
 *
 * Features:
 * - Select disapproval reason from Gupy enum
 * - Add optional notes
 * - Option to apply to same-template applications
 * - Show progress via actionId polling
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Modal,
  Select,
  Typography,
  Space,
  Alert,
  Result,
  Checkbox,
  Progress,
  Input,
} from 'antd'
import { CloseCircleOutlined, InfoCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { useBulkReprove, useActionStatus } from '../../hooks'

const { Text } = Typography
const { TextArea } = Input

// Disapproval reasons from Gupy API v1
const DISAPPROVAL_REASONS = [
  { value: 'hired_by_another_company', label: 'Contratado por outra empresa' },
  { value: 'invited_to_another_process', label: 'Convidado para outro processo' },
  { value: 'missed_steps_of_process', label: 'Perdeu etapas do processo' },
  { value: 'insufficient_knowledge', label: 'Conhecimento insuficiente' },
  { value: 'hiring_not_allowed', label: 'Contratacao nao permitida' },
  { value: 'incompatible_curriculum', label: 'Curriculo incompativel' },
  { value: 'withdrawn_for_personal_reasons', label: 'Desistencia por motivos pessoais' },
  { value: 'inconsistent_admission_docs', label: 'Documentos de admissao inconsistentes' },
  { value: 'incompatible_wage_expectation', label: 'Expectativa salarial incompativel' },
  { value: 'lack_of_culture_alignment', label: 'Falta de alinhamento cultural' },
  { value: 'insufficient_academic_background', label: 'Formacao academica insuficiente' },
  { value: 'no_potential_for_growth', label: 'Sem potencial de crescimento' },
  { value: 'overqualified', label: 'Superqualificado' },
  { value: 'insufficient_seniority', label: 'Senioridade insuficiente' },
  { value: 'fulfilled_vacancy', label: 'Vaga preenchida' },
  { value: 'reject_at_medical_exam', label: 'Reprovado no exame medico' },
  { value: 'candidate_outside_required_location', label: 'Candidato fora da localizacao requerida' },
  { value: 'test_result_below_cutoff', label: 'Resultado de teste abaixo do corte' },
  { value: 'not_respond_to_contacts', label: 'Nao respondeu aos contatos' },
  { value: 'proposal_not_accepted', label: 'Proposta nao aceita' },
  { value: 'hired_in_another_job', label: 'Contratado em outra vaga' },
  { value: 'lack_of_professional_experience', label: 'Falta de experiencia profissional' },
  { value: 'low_stability_in_previous_companies', label: 'Baixa estabilidade em empresas anteriores' },
  { value: 'medical_report_disqualified', label: 'Laudo medico desqualificado' },
  { value: 'incomplete_screening_stage', label: 'Etapa de triagem incompleta' },
  { value: 'incomplete_registration_step', label: 'Etapa de cadastro incompleta' },
  { value: 'other_reason', label: 'Outro motivo' },
]

/**
 * @param {Object} props
 * @param {boolean} props.open - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {(Set.<number>|Array.<number>)} props.selectedIds - Selected application IDs
 * @param {Function} props.onSuccess - Success callback
 */
export default function BulkReproveModal({ open, onClose, selectedIds, onSuccess }) {
  const [reason, setReason] = useState(null)
  const [notes, setNotes] = useState('')
  const [applyToSameTemplate, setApplyToSameTemplate] = useState(false)
  const [actionId, setActionId] = useState(null)
  const [sendResult, setSendResult] = useState(null)

  // Ref to prevent calling onSuccess multiple times
  const successCalledRef = useRef(false)

  // Convert Set to Array if needed
  const applicationIds = useMemo(
    () => (Array.isArray(selectedIds) ? selectedIds : Array.from(selectedIds)),
    [selectedIds]
  )

  // Bulk reprove mutation
  const bulkReproveMutation = useBulkReprove()

  // Poll action status when actionId is set
  const { data: actionStatus } = useActionStatus(actionId, {
    enabled: !!actionId && !sendResult, // Stop polling once we have result
  })

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setReason(null)
      setNotes('')
      setApplyToSameTemplate(false)
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
        additionalProcessed: actionStatus.additionalProcessed,
        errors: actionStatus.errors,
      })

      if (actionStatus.failed === 0 && onSuccess) {
        onSuccess({
          message: `Candidaturas reprovadas: ${actionStatus.completed}`,
        })
      }
    }
  }, [actionStatus, onSuccess])

  const handleSend = async () => {
    if (!reason || applicationIds.length === 0) return

    try {
      const result = await bulkReproveMutation.mutateAsync({
        applicationIds,
        reason,
        notes: notes.trim(),
        applyToSameTemplate,
      })

      if (result.actionId) {
        setActionId(result.actionId)
      } else {
        // Synchronous result
        setSendResult({
          success: true,
          completed: result.queued,
          failed: 0,
          additionalProcessed: result.additionalProcessed,
        })
        if (onSuccess) {
          onSuccess({ message: result.message })
        }
      }
    } catch (error) {
      console.error('[BulkReproveModal] Failed:', error)
      setSendResult({
        success: false,
        error: error.message,
      })
    }
  }

  const handleClose = () => {
    if (!bulkReproveMutation.isPending && !actionId) {
      onClose()
    } else if (actionStatus?.status === 'completed') {
      onClose()
    }
  }

  const renderContent = () => {
    // Processing
    if (actionId && actionStatus?.status === 'running') {
      const percent = actionStatus.total > 0
        ? Math.round((actionStatus.completed / actionStatus.total) * 100)
        : 0

      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Progress type="circle" percent={percent} status="exception" />
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
            title="Candidaturas reprovadas!"
            subTitle={
              <>
                {sendResult.completed} candidatura(s) reprovada(s)
                {sendResult.additionalProcessed > 0 && (
                  <> (+{sendResult.additionalProcessed} relacionadas)</>
                )}
                {sendResult.failed > 0 && <>, {sendResult.failed} falha(s)</>}
              </>
            }
          />
        )
      } else {
        return (
          <Result
            status="error"
            title="Erro ao reprovar candidaturas"
            subTitle={sendResult.error || 'Ocorreu um erro.'}
          />
        )
      }
    }

    // Form
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert
          type="error"
          icon={<ExclamationCircleOutlined />}
          message={`${applicationIds.length} candidatura(s) sera(ao) reprovada(s)`}
          description="Esta acao e irreversivel. Os candidatos serao notificados pela Gupy."
          showIcon
        />

        <div>
          <Text strong>Motivo da reprovacao: *</Text>
          <Select
            placeholder="Selecione o motivo..."
            style={{ width: '100%', marginTop: 8 }}
            value={reason}
            onChange={setReason}
            showSearch
            optionFilterProp="children"
          >
            {DISAPPROVAL_REASONS.map((r) => (
              <Select.Option key={r.value} value={r.value}>
                {r.label}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div>
          <Text strong>Observacoes (opcional):</Text>
          <TextArea
            placeholder="Adicione observacoes detalhadas sobre a reprovacao..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ marginTop: 8 }}
            maxLength={500}
            showCount
          />
        </div>

        <div>
          <Checkbox
            checked={applyToSameTemplate}
            onChange={(e) => setApplyToSameTemplate(e.target.checked)}
          >
            <Space>
              Reprovar tambem outras candidaturas dos mesmos candidatos em vagas do mesmo template
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
            </Space>
          </Checkbox>
        </div>

        {applyToSameTemplate && (
          <Alert
            type="warning"
            message="Acao expandida"
            description="Esta acao tambem reprovara outras candidaturas dos mesmos candidatos em vagas com o mesmo template."
            showIcon
          />
        )}
      </Space>
    )
  }

  const isProcessing = bulkReproveMutation.isPending || (actionId && actionStatus?.status === 'running')

  return (
    <Modal
      title={
        <Space>
          <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
          <span style={{ color: '#ff4d4f' }}>Reprovar Candidaturas em Massa</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      onOk={sendResult ? handleClose : handleSend}
      okText={sendResult ? 'Fechar' : 'Reprovar Candidaturas'}
      cancelText="Cancelar"
      okButtonProps={{
        disabled: !sendResult && (!reason || applicationIds.length === 0),
        loading: isProcessing,
        danger: !sendResult,
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
