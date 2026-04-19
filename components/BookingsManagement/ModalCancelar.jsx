// components/BookingsManagement/ModalCancelar.jsx

import { useState } from 'react';
import { Modal, Space, Typography, Button, Input, Alert, message } from 'antd';
import { ExclamationCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelBooking } from '../../lib/services/bookingsManagementService';

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * ModalCancelar Component
 *
 * Modal for canceling a booking with a required reason (min 10 chars).
 *
 * Features:
 * - Input field for cancel reason (TextArea)
 * - Character counter (min 10 characters)
 * - Validation before submit
 * - API call to cancel booking
 * - Success message and close modal
 *
 * Props:
 * @param {boolean} open - Whether modal is visible
 * @param {Function} onCancel - Callback when modal is closed
 * @param {Function} onSuccess - Callback when cancellation succeeds
 * @param {number} id_booking - Booking ID to cancel
 * @param {string} candidateName - Candidate name (for display)
 */
export default function ModalCancelar({ open, onCancel, onSuccess, id_booking, candidateName }) {
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState('');

  const handleModalClose = () => {
    setCancelReason('');
    onCancel();
  };

  // Mutation for canceling booking
  const cancelMutation = useMutation({
    mutationFn: ({ id_booking, cancel_reason }) => cancelBooking(id_booking, cancel_reason),
    onSuccess: (data) => {
      message.success(data.message || 'Agendamento cancelado com sucesso!');
      queryClient.invalidateQueries(['weekly-slots']);
      queryClient.invalidateQueries(['availability']);
      queryClient.invalidateQueries(['booking-details']);
      setCancelReason('');
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao cancelar agendamento';
      message.error(errorMessage);
    },
  });

  // Handle confirm cancellation
  const handleConfirmCancel = () => {
    if (cancelReason.trim().length < 10) {
      message.warning('O motivo do cancelamento deve ter no mínimo 10 caracteres');
      return;
    }

    cancelMutation.mutate({
      id_booking,
      cancel_reason: cancelReason.trim(),
    });
  };

  const isValid = cancelReason.trim().length >= 10;
  const charCount = cancelReason.trim().length;

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
          <span>Cancelar Agendamento</span>
        </Space>
      }
      open={open}
      onCancel={handleModalClose}
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={handleModalClose} disabled={cancelMutation.isPending}>
            Voltar
          </Button>
          <Button
            danger
            type="primary"
            icon={<CloseCircleOutlined />}
            onClick={handleConfirmCancel}
            loading={cancelMutation.isPending}
            disabled={!isValid}
          >
            Confirmar Cancelamento
          </Button>
        </Space>
      }
      width={600}
      destroyOnClose
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* Warning Alert */}
        <Alert
          message="Atenção"
          description={
            <Space direction="vertical" size={4}>
              <Text>
                Você está prestes a cancelar o agendamento
                {candidateName && (
                  <Text strong> de {candidateName}</Text>
                )}
                .
              </Text>
              <Text>
                O candidato receberá uma notificação por e-mail sobre o cancelamento.
              </Text>
              <Text strong style={{ color: '#ff4d4f' }}>
                Esta ação não pode ser desfeita.
              </Text>
            </Space>
          }
          type="warning"
          showIcon
          style={{ fontSize: '12px' }}
        />

        {/* Cancel Reason Input */}
        <div>
          <Title level={5} style={{ marginBottom: 8 }}>
            Motivo do Cancelamento *
          </Title>
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 8 }}>
            Informe o motivo do cancelamento (mínimo 10 caracteres)
          </Text>
          <TextArea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Ex: Candidato solicitou reagendamento para outra data..."
            rows={4}
            maxLength={500}
            showCount={{
              formatter: ({ count }) => (
                <Text
                  type={count >= 10 ? 'success' : 'secondary'}
                  style={{ fontSize: '12px' }}
                >
                  {count} / 10 caracteres mínimos
                </Text>
              ),
            }}
            disabled={cancelMutation.isPending}
          />
        </div>

        {/* Validation Message */}
        {!isValid && charCount > 0 && (
          <Text type="danger" style={{ fontSize: '12px' }}>
            Ainda faltam {10 - charCount} caracteres
          </Text>
        )}

        {isValid && (
          <Text type="success" style={{ fontSize: '12px' }}>
            Motivo válido - você pode confirmar o cancelamento
          </Text>
        )}
      </Space>
    </Modal>
  );
}
