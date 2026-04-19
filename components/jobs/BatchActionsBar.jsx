/**
 * BatchActionsBar - Floating action bar for batch operations on selected jobs
 *
 * Appears at the bottom of the viewport when jobs are selected.
 * Provides actions: Delete Drafts, Publish, Close, Cancel.
 *
 * Business Rules:
 * - Delete Drafts: Only works when ALL selected jobs are 'draft' status
 * - Publish: Only works with 'draft' status
 * - Close: Only works with 'published' status
 * - Cancel: Only works with 'published' or 'closed' status
 *
 * Buttons are disabled with helpful tooltips when selection contains
 * jobs with incompatible statuses.
 *
 * @example
 * <BatchActionsBar
 *   selectedCount={3}
 *   selectedJobs={[...]}
 *   onDeleteDrafts={() => handleDeleteDrafts()}
 *   onPublish={() => setPublishModalOpen(true)}
 *   onClose={() => setCloseModalOpen(true)}
 *   onCancel={() => setCancelModalOpen(true)}
 *   onClear={() => setSelectedIds(new Set())}
 *   loading={false}
 * />
 */

import { Button, Space, Typography, Tooltip } from 'antd'
import {
  SendOutlined,
  StopOutlined,
  CloseCircleOutlined,
  ClearOutlined,
  DeleteOutlined,
} from '@ant-design/icons'

const { Text } = Typography

/**
 * @param {Object} props
 * @param {number} props.selectedCount - Number of selected jobs
 * @param {Array} props.selectedJobs - Array of selected job objects (with status)
 * @param {Function} props.onDeleteDrafts - Callback when "Excluir Rascunho(s)" is clicked
 * @param {Function} props.onPublish - Callback when "Publicar" is clicked
 * @param {Function} props.onClose - Callback when "Fechar" is clicked
 * @param {Function} props.onCancel - Callback when "Cancelar" is clicked
 * @param {Function} props.onClear - Callback when "Limpar" is clicked
 * @param {boolean} [props.loading] - Whether any action is in progress
 */
export default function BatchActionsBar({
  selectedCount,
  selectedJobs = [],
  onDeleteDrafts,
  onPublish,
  onClose,
  onCancel,
  onClear,
  loading,
}) {
  // Don't render if nothing selected
  if (selectedCount === 0) {
    return null
  }

  // Analyze selected jobs by status
  const statusCounts = selectedJobs.reduce((acc, job) => {
    acc[job.job_status] = (acc[job.job_status] || 0) + 1
    return acc
  }, {})

  const hasDraft = statusCounts.draft > 0
  const hasPublished = statusCounts.published > 0
  const hasClosed = statusCounts.closed > 0
  const hasFrozen = statusCounts.frozen > 0

  // Delete Drafts: Only when ALL selected are drafts
  const canDeleteDrafts = hasDraft && !hasPublished && !hasClosed && !hasFrozen
  const deleteDraftsDisabledReason = !hasDraft
    ? 'Nenhuma vaga em rascunho selecionada'
    : hasPublished
    ? `${statusCounts.published} vaga(s) publicada(s) na selecao - apenas rascunhos podem ser excluidos`
    : hasClosed
    ? `${statusCounts.closed} vaga(s) fechada(s) na selecao - apenas rascunhos podem ser excluidos`
    : hasFrozen
    ? `${statusCounts.frozen} vaga(s) congelada(s) na selecao - apenas rascunhos podem ser excluidos`
    : ''

  // Publish: Only drafts allowed
  const canPublish = hasDraft && !hasPublished && !hasClosed && !hasFrozen
  const publishDisabledReason = !hasDraft
    ? 'Nenhuma vaga em rascunho selecionada'
    : hasPublished
    ? `${statusCounts.published} vaga(s) ja publicada(s) na selecao`
    : hasClosed
    ? `${statusCounts.closed} vaga(s) fechada(s) na selecao`
    : hasFrozen
    ? `${statusCounts.frozen} vaga(s) congelada(s) na selecao`
    : ''

  // Close: Only published allowed
  const canClose = hasPublished && !hasDraft && !hasClosed && !hasFrozen
  const closeDisabledReason = !hasPublished
    ? 'Nenhuma vaga publicada selecionada'
    : hasDraft
    ? `${statusCounts.draft} vaga(s) em rascunho na selecao`
    : hasClosed
    ? `${statusCounts.closed} vaga(s) ja fechada(s) na selecao`
    : hasFrozen
    ? `${statusCounts.frozen} vaga(s) congelada(s) na selecao`
    : ''

  // Cancel: Published or closed allowed (not draft or frozen)
  const canCancel = (hasPublished || hasClosed) && !hasDraft && !hasFrozen
  const cancelDisabledReason = !hasPublished && !hasClosed
    ? 'Selecione vagas publicadas ou fechadas'
    : hasDraft
    ? `${statusCounts.draft} vaga(s) em rascunho na selecao (cancelar nao funciona com rascunhos)`
    : hasFrozen
    ? `${statusCounts.frozen} vaga(s) congelada(s) na selecao`
    : ''

  // Build status summary for display
  const statusSummary = Object.entries(statusCounts)
    .map(([status, count]) => {
      const statusLabels = {
        draft: 'rascunho',
        published: 'publicada',
        closed: 'fechada',
        frozen: 'congelada',
      }
      return `${count} ${statusLabels[status] || status}`
    })
    .join(', ')

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#001529',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        animation: 'slideUp 0.2s ease-out',
      }}
    >
      <div>
        <Text style={{ color: '#fff', fontSize: '16px' }}>
          <strong>{selectedCount}</strong> {selectedCount === 1 ? 'vaga selecionada' : 'vagas selecionadas'}
        </Text>
        <br />
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px' }}>
          {statusSummary}
        </Text>
      </div>

      <Space size="middle">
        <Tooltip title="Limpar selecao">
          <Button
            icon={<ClearOutlined />}
            onClick={onClear}
            disabled={loading}
          >
            Limpar
          </Button>
        </Tooltip>

        <Tooltip title={canDeleteDrafts ? 'Excluir rascunhos selecionados permanentemente' : deleteDraftsDisabledReason}>
          <Button
            icon={<DeleteOutlined />}
            onClick={onDeleteDrafts}
            disabled={loading || !canDeleteDrafts}
            style={canDeleteDrafts && !loading ? { backgroundColor: '#722ed1', borderColor: '#722ed1', color: '#fff' } : { backgroundColor: '#d9d9d9', borderColor: '#d9d9d9', color: 'rgba(0,0,0,0.25)' }}
          >
            Excluir Rascunho(s)
          </Button>
        </Tooltip>

        <Tooltip title={canPublish ? 'Publicar vagas selecionadas na Gupy' : publishDisabledReason}>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={onPublish}
            disabled={loading || !canPublish}
            style={!canPublish || loading ? { backgroundColor: '#d9d9d9', borderColor: '#d9d9d9', color: 'rgba(0,0,0,0.25)' } : {}}
          >
            Publicar Vaga(s)
          </Button>
        </Tooltip>

        <Tooltip title={canClose ? 'Fechar vagas selecionadas (para de receber candidaturas)' : closeDisabledReason}>
          <Button
            icon={<StopOutlined />}
            onClick={onClose}
            disabled={loading || !canClose}
            style={canClose && !loading ? { backgroundColor: '#faad14', borderColor: '#faad14', color: '#fff' } : { backgroundColor: '#d9d9d9', borderColor: '#d9d9d9', color: 'rgba(0,0,0,0.25)' }}
          >
            Fechar Vaga(s)
          </Button>
        </Tooltip>

        <Tooltip title={canCancel ? 'Cancelar vagas selecionadas permanentemente' : cancelDisabledReason}>
          <Button
            type="primary"
            icon={<CloseCircleOutlined />}
            onClick={onCancel}
            disabled={loading || !canCancel}
            style={canCancel && !loading ? { backgroundColor: '#ff4d4f', borderColor: '#ff4d4f', color: '#fff' } : { backgroundColor: '#d9d9d9', borderColor: '#d9d9d9', color: 'rgba(0,0,0,0.25)' }}
          >
            Cancelar Vaga(s)
          </Button>
        </Tooltip>
      </Space>

      <style jsx global>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
