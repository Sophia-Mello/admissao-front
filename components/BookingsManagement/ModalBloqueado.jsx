// components/BookingsManagement/ModalBloqueado.jsx

import { Modal, Space, Typography, Button, Descriptions, Card, Alert, message } from 'antd';
import { StopOutlined, UnlockOutlined, ClockCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteSlotBlock } from '../../lib/services/bookingsManagementService';

const { Title, Text } = Typography;

/**
 * ModalBloqueado Component
 *
 * Modal for viewing details of a blocked slot and unblocking it.
 *
 * Features:
 * - Display blocked time range
 * - Display block reason
 * - Display which unit (or if default/fallback)
 * - Button to unblock (removes the block)
 *
 * Props:
 * @param {boolean} open - Whether modal is visible
 * @param {Function} onCancel - Callback when modal is closed
 * @param {Object} blockData - Block details object
 * @param {number} blockData.id_slot_block - Block ID
 * @param {string} blockData.start_at - Block start time (ISO)
 * @param {string} blockData.reason - Block reason
 * @param {Object} blockData.unidade - Unit details
 * @param {boolean} blockData.is_fallback - Whether this is a default block
 */
export default function ModalBloqueado({ open, onCancel, blockData }) {
  const queryClient = useQueryClient();

  const handleModalClose = () => {
    onCancel();
  };

  // Mutation for deleting slot block
  const unblockMutation = useMutation({
    mutationFn: (id_slot_block) => deleteSlotBlock(id_slot_block),
    onSuccess: (data) => {
      message.success(data.message || 'Horário desbloqueado com sucesso!');
      queryClient.invalidateQueries(['weekly-slots']);
      queryClient.invalidateQueries(['availability']);
      queryClient.invalidateQueries(['slot-blocks']);
      handleModalClose();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao desbloquear horário';
      message.error(errorMessage);
    },
  });

  // Handle unblock
  const handleUnblock = () => {
    if (!blockData?.id_slot_block) {
      message.error('ID do bloqueio não encontrado');
      return;
    }

    Modal.confirm({
      title: 'Confirmar Desbloqueio',
      content: 'Tem certeza que deseja desbloquear este horário? Ele ficará disponível para agendamentos.',
      okText: 'Sim, Desbloquear',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => {
        unblockMutation.mutate(blockData.id_slot_block);
      },
    });
  };

  if (!blockData) return null;

  const { start_at, reason, unidade, is_fallback } = blockData;

  // Format time from ISO string
  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <StopOutlined style={{ color: '#ff4d4f' }} />
          <span>Horário Bloqueado</span>
        </Space>
      }
      open={open}
      onCancel={handleModalClose}
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={handleModalClose} disabled={unblockMutation.isPending}>
            Fechar
          </Button>
          <Button
            danger
            type="primary"
            icon={<UnlockOutlined />}
            onClick={handleUnblock}
            loading={unblockMutation.isPending}
          >
            Desbloquear Horário
          </Button>
        </Space>
      }
      width={600}
      destroyOnClose
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* Warning Alert */}
        {is_fallback && (
          <Alert
            message="Bloqueio Padrão"
            description="Este é um bloqueio padrão do sistema. Ao desbloquear, o horário ficará disponível para esta unidade."
            type="info"
            showIcon
            style={{ fontSize: '12px' }}
          />
        )}

        {/* Block Information */}
        <Card size="small" title={<Text strong>Detalhes do Bloqueio</Text>} style={{ backgroundColor: '#fff1f0' }}>
          <Descriptions column={1} size="small" colon={false}>
            <Descriptions.Item
              label={
                <Space size={4}>
                  <ClockCircleOutlined />
                  <Text>Data e Horário</Text>
                </Space>
              }
            >
              <Space direction="vertical" size={4}>
                <Text strong>{formatDate(start_at)}</Text>
                <Text>{formatTime(start_at)}</Text>
              </Space>
            </Descriptions.Item>

            {reason && (
              <Descriptions.Item
                label={
                  <Space size={4}>
                    <StopOutlined />
                    <Text>Motivo</Text>
                  </Space>
                }
              >
                <Text>{reason}</Text>
              </Descriptions.Item>
            )}

            {unidade && (
              <Descriptions.Item
                label={
                  <Space size={4}>
                    <EnvironmentOutlined />
                    <Text>Unidade</Text>
                  </Space>
                }
              >
                <Space direction="vertical" size={4}>
                  <Text strong>{unidade.nome_unidade || 'Não informado'}</Text>
                  {unidade.endereco && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {unidade.endereco}
                    </Text>
                  )}
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Instructions */}
        <Alert
          message="Informação"
          description="Ao desbloquear este horário, ele ficará disponível para que candidatos possam agendar aulas teste. Certifique-se de que é isso que deseja fazer."
          type="warning"
          showIcon
          style={{ fontSize: '12px' }}
        />
      </Space>
    </Modal>
  );
}
