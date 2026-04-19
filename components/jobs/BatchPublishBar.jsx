/**
 * BatchPublishBar - Floating action bar for batch publishing selected jobs
 *
 * Appears at the bottom of the viewport when jobs are selected.
 * Provides quick actions for publishing multiple draft jobs at once.
 *
 * @example
 * <BatchPublishBar
 *   selectedCount={3}
 *   onPublish={() => setPublishModalOpen(true)}
 *   onClear={() => setSelectedIds(new Set())}
 *   loading={publishMutation.isPending}
 * />
 */

import { Button, Space, Typography } from 'antd'
import { SendOutlined, CloseOutlined } from '@ant-design/icons'

const { Text } = Typography

/**
 * @param {Object} props
 * @param {number} props.selectedCount - Number of selected jobs
 * @param {Function} props.onPublish - Callback when "Publicar Selecionados" is clicked
 * @param {Function} props.onClear - Callback when "Limpar" is clicked
 * @param {boolean} [props.loading] - Whether publish action is in progress
 */
export default function BatchPublishBar({ selectedCount, onPublish, onClear, loading }) {
  // Don't render if nothing selected
  if (selectedCount === 0) {
    return null
  }

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
      <Text style={{ color: '#fff', fontSize: '16px' }}>
        <strong>{selectedCount}</strong> {selectedCount === 1 ? 'vaga selecionada' : 'vagas selecionadas'}
      </Text>

      <Space>
        <Button
          icon={<CloseOutlined />}
          onClick={onClear}
          disabled={loading}
        >
          Limpar
        </Button>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={onPublish}
          loading={loading}
        >
          Publicar Selecionados
        </Button>
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
