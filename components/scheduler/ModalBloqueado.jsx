/**
 * ModalBloqueado Component
 *
 * Modal for viewing details of a blocked slot with options to:
 * - Unblock the slot (via POST /schedule/release)
 * - "Agendar mesmo assim" - Schedule even on blocked slot
 *
 * Features:
 * - Display block info (time, date range, reason)
 * - Fallback indicator
 * - Unblock action with confirmation (uses POST /release instead of DELETE)
 * - "Agendar mesmo assim" button that opens ModalAgendar
 *
 * Props:
 * @param {boolean} open - Whether modal is visible
 * @param {Function} onCancel - Callback when modal is closed
 * @param {Object} blockData - Block details object
 * @param {Function} onScheduleAnyway - Callback to open scheduling modal
 */

import { Modal, Space, Typography, Button, Descriptions, Card, Alert, message, Divider } from 'antd';
import {
  StopOutlined,
  UnlockOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useReleaseBlock } from '../../hooks/useScheduleBlocks';
import moment from 'moment';

const { Text } = Typography;

export default function ModalBloqueado({ open, onCancel, blockData, onScheduleAnyway }) {
  // Mutation for releasing slot block (using POST /schedule/release)
  const releaseBlockMutation = useReleaseBlock(blockData?.slotData?.id_unidade);

  const handleModalClose = () => {
    onCancel();
  };

  // Extract date and time from blockData
  const getReleaseDateAndTime = () => {
    const { start_at, end_at, date, slotData } = blockData || {};
    let dateStr = date;
    let timeStart = null;
    let timeEnd = null;

    // If start_at is ISO format with date, extract date and time
    if (start_at && start_at.includes('T')) {
      const startMoment = moment(start_at);
      dateStr = startMoment.format('YYYY-MM-DD');
      timeStart = startMoment.format('HH:mm');
    } else if (start_at) {
      timeStart = start_at.slice(0, 5); // "HH:mm"
    }

    if (end_at && end_at.includes('T')) {
      timeEnd = moment(end_at).format('HH:mm');
    } else if (end_at) {
      timeEnd = end_at.slice(0, 5); // "HH:mm"
    }

    // Fallback to slotData date if available
    if (!dateStr && slotData?.date) {
      dateStr = slotData.date;
    }

    return {
      id_unidade: slotData?.id_unidade,
      date_start: dateStr,
      date_end: dateStr, // Same date for single slot release
      time_start: timeStart,
      time_end: timeEnd,
    };
  };

  // Handle unblock via POST /schedule/release
  const handleUnblock = () => {
    const releaseData = getReleaseDateAndTime();

    if (!releaseData.id_unidade || !releaseData.date_start || !releaseData.time_start || !releaseData.time_end) {
      message.error('Dados insuficientes para desbloquear o horario');
      console.error('Release data incomplete:', releaseData);
      return;
    }

    Modal.confirm({
      title: 'Confirmar Desbloqueio',
      content: 'Tem certeza que deseja desbloquear este horario? Ele ficara disponivel para agendamentos.',
      okText: 'Sim, Desbloquear',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await releaseBlockMutation.mutateAsync(releaseData);
          message.success('Horario desbloqueado com sucesso!');
          handleModalClose();
        } catch (error) {
          const errorMessage = error.response?.data?.error || error.message || 'Erro ao desbloquear horario';
          message.error(errorMessage);
        }
      },
    });
  };

  // Handle "Agendar mesmo assim"
  const handleScheduleAnyway = () => {
    if (onScheduleAnyway) {
      onScheduleAnyway();
    }
  };

  if (!blockData) return null;

  const { start_at, end_at, date, reason, unidade, is_fallback } = blockData;

  // Format time from ISO string or HH:mm
  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    if (timeStr.includes('T')) {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return timeStr;
  };

  // Format date
  const formatDate = () => {
    if (date) {
      const d = new Date(date);
      return d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    if (start_at && start_at.includes('T')) {
      const d = new Date(start_at);
      return d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return 'Data nao disponivel';
  };

  return (
    <Modal
      title={
        <Space>
          <StopOutlined style={{ color: '#ff4d4f' }} />
          <span>Horario Bloqueado</span>
        </Space>
      }
      open={open}
      onCancel={handleModalClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* Fallback Alert */}
        {is_fallback && (
          <Alert
            message="Bloqueio Padrao"
            description="Este e um bloqueio padrao do sistema. Ao desbloquear, o horario ficara disponivel para esta unidade."
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
                  <CalendarOutlined />
                  <Text>Data</Text>
                </Space>
              }
            >
              <Text strong>{formatDate()}</Text>
            </Descriptions.Item>

            <Descriptions.Item
              label={
                <Space size={4}>
                  <ClockCircleOutlined />
                  <Text>Horario</Text>
                </Space>
              }
            >
              {formatTime(start_at)} - {formatTime(end_at)}
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
                  <Text strong>{unidade.nome_unidade || 'Nao informado'}</Text>
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

        {/* Information Alert */}
        <Alert
          message="Opcoes Disponiveis"
          description={
            <Space direction="vertical" size={4}>
              <Text>
                <strong>Desbloquear:</strong> Remove o bloqueio e torna o horario disponivel para agendamentos.
              </Text>
              <Text>
                <strong>Agendar mesmo assim:</strong> Permite agendar um candidato neste horario mesmo com o bloqueio ativo. O bloqueio permanecera para outros slots.
              </Text>
            </Space>
          }
          type="info"
          showIcon
          style={{ fontSize: '12px' }}
        />

        <Divider style={{ margin: '16px 0' }} />

        {/* Action Buttons */}
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={handleModalClose} disabled={releaseBlockMutation.isPending}>
            Fechar
          </Button>

          <Space>
            {/* Agendar mesmo assim button */}
            <Button
              type="primary"
              icon={<CalendarOutlined />}
              onClick={handleScheduleAnyway}
              disabled={releaseBlockMutation.isPending}
            >
              Agendar mesmo assim
            </Button>

            {/* Unblock button (uses POST /schedule/release) */}
            <Button
              danger
              type="primary"
              icon={<UnlockOutlined />}
              onClick={handleUnblock}
              loading={releaseBlockMutation.isPending}
            >
              Desbloquear Horario
            </Button>
          </Space>
        </Space>
      </Space>
    </Modal>
  );
}
