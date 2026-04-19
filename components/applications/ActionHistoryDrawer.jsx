import { useState } from 'react'
import { Drawer, List, Tag, Button, Progress, Space, Typography, Popconfirm, Alert, message } from 'antd'
import { HistoryOutlined, UndoOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons'
import { useActionHistory, useUndoAction, useCanUndo } from '../../hooks/useActionHistory'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

const { Text } = Typography

const STATUS_CONFIG = {
  pending: { color: 'default', icon: <SyncOutlined spin />, label: 'Pendente' },
  processing: { color: 'processing', icon: <SyncOutlined spin />, label: 'Processando' },
  completed: { color: 'success', icon: <CheckCircleOutlined />, label: 'Concluído' },
  failed: { color: 'error', icon: <CloseCircleOutlined />, label: 'Falhou' },
  undone: { color: 'warning', icon: <UndoOutlined />, label: 'Desfeito' },
}

function ActionItem({ action, onUndoSuccess }) {
  const { canUndo, reason } = useCanUndo(action.action_id, action)
  const undoMutation = useUndoAction()
  const statusConfig = STATUS_CONFIG[action?.status] || STATUS_CONFIG.pending

  const handleUndo = async () => {
    try {
      const result = await undoMutation.mutateAsync(action.action_id)
      message.success(result.message || 'Ação desfeita com sucesso')
      onUndoSuccess?.()
    } catch (error) {
      message.error(error.response?.data?.error || 'Erro ao desfazer ação')
    }
  }

  const progress = (action?.total_items ?? 0) > 0
    ? Math.round(((action?.processed_items ?? 0) / action.total_items) * 100)
    : 0

  return (
    <List.Item
      actions={[
        canUndo && (
          <Popconfirm
            key="undo"
            title="Desfazer ação"
            description={`Reverter ${action?.success_items ?? 0} aplicações para as etapas anteriores?`}
            onConfirm={handleUndo}
            okText="Sim, desfazer"
            cancelText="Cancelar"
            okButtonProps={{ loading: undoMutation.isPending }}
          >
            <Button
              type="link"
              icon={<UndoOutlined />}
              loading={undoMutation.isPending}
              danger={undoMutation.isError}
            >
              {undoMutation.isError ? 'Tentar novamente' : 'Desfazer'}
            </Button>
          </Popconfirm>
        ),
      ].filter(Boolean)}
    >
      <List.Item.Meta
        title={
          <Space>
            <Text strong>
              {action?.action_type === 'reprove'
                ? 'Reprovar candidatos'
                : action?.action_type === 'move'
                  ? `Mover para "${action?.target_step_name ?? 'N/A'}"`
                  : action?.action_type === 'email'
                    ? `Email: ${action?.target_step_name ?? 'N/A'}`
                    : action?.target_step_name ?? action?.action_type}
            </Text>
            <Tag icon={statusConfig.icon} color={statusConfig.color}>
              {statusConfig.label}
            </Tag>
          </Space>
        }
        description={
          <Space direction="vertical" size={0}>
            <Text type="secondary">
              {action?.success_items ?? 0}/{action?.total_items ?? 0} sucesso
              {(action?.failed_items ?? 0) > 0 && `, ${action.failed_items} falhas`}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(action?.created_at).fromNow()} por {action?.registered_by ?? 'Sistema'}
            </Text>
            {action?.status === 'processing' && (
              <Progress percent={progress} size="small" style={{ width: 200, marginTop: 4 }} />
            )}
            {!canUndo && action?.action_type === 'move' && action?.status === 'completed' && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {reason}
              </Text>
            )}
          </Space>
        }
      />
    </List.Item>
  )
}

export default function ActionHistoryDrawer({ open, onClose }) {
  const [page, setPage] = useState(1)
  const { data, isLoading, error, refetch } = useActionHistory({ page, limit: 10 })

  return (
    <Drawer
      title={
        <Space>
          <HistoryOutlined />
          Histórico de Ações
        </Space>
      }
      placement="right"
      width={480}
      open={open}
      onClose={onClose}
    >
      {error && (
        <Alert
          type="error"
          message="Erro ao carregar histórico"
          description={error.response?.data?.error || error.message || 'Erro desconhecido'}
          style={{ marginBottom: 16 }}
          closable
        />
      )}
      <List
        loading={isLoading}
        dataSource={data?.data || []}
        renderItem={(action) => (
          <ActionItem
            key={action.action_id}
            action={action}
            onUndoSuccess={refetch}
          />
        )}
        pagination={{
          current: page,
          total: data?.pagination?.total || 0,
          pageSize: 10,
          onChange: setPage,
          showSizeChanger: false,
          size: 'small',
        }}
        locale={{ emptyText: 'Nenhuma ação realizada' }}
      />
    </Drawer>
  )
}
