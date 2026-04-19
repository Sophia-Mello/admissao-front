// components/BookingsManagement/ModalAgendar.jsx

import { useState } from 'react';
import { Modal, Space, Typography, Button, Card, Descriptions, message, Alert } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, EnvironmentOutlined, UserOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import 'moment/locale/pt-br';
import CandidateSearch from './CandidateSearch';
import { createManualBooking } from '../../lib/services/bookingsManagementService';

const { Title, Text } = Typography;

moment.locale('pt-br');

/**
 * ModalAgendar Component
 *
 * Modal for manually booking a candidate into an empty slot.
 *
 * Flow:
 * 1. User searches for candidate by CPF
 * 2. User selects candidate from dropdown
 * 3. Confirmation section shows booking details
 * 4. User confirms booking
 * 5. API call creates booking (backend resolves id_job_unidade from id_unidade + jobId)
 * 6. Success message and modal closes
 *
 * Props:
 * @param {boolean} open - Whether modal is visible
 * @param {Function} onCancel - Callback when modal is closed
 * @param {Object} slotData - Slot data from calendar
 * @param {number} slotData.id_unidade - Unit ID (required)
 * @param {number} slotData.id_job_unidade - Job-unit junction ID (optional, for faster resolution)
 * @param {string} slotData.start_at - Start datetime ISO 8601
 * @param {string} slotData.end_at - End datetime ISO 8601
 * @param {Object} slotData.unidade - Unit details { nome_unidade, endereco }
 */
export default function ModalAgendar({ open, onCancel, slotData }) {
  const queryClient = useQueryClient();
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Reset state when modal opens/closes
  const handleModalClose = () => {
    setSelectedCandidate(null);
    setShowConfirmation(false);
    onCancel();
  };

  // Mutation for creating manual booking
  const createBookingMutation = useMutation({
    mutationFn: (payload) => createManualBooking(payload),
    retry: false, // Don't retry on 4xx errors
    onSuccess: (data) => {
      message.success('Agendamento realizado com sucesso!');
      queryClient.invalidateQueries(['weekly-slots']);
      queryClient.invalidateQueries(['availability']);
      handleModalClose();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao criar agendamento';
      message.error(errorMessage);
    },
  });

  // Handle candidate selection
  const handleCandidateSelect = (candidate) => {
    setSelectedCandidate(candidate);
    setShowConfirmation(true);
  };

  // Handle booking confirmation
  const handleConfirmBooking = () => {
    if (!selectedCandidate || !slotData) {
      return;
    }

    // Validate required fields
    // jobId comes from selectedCandidate (from CPF search)
    const jobId = selectedCandidate.id_job_gupy || selectedCandidate.job_id;
    if (!jobId) {
      message.error('Job ID não disponível no candidato. Por favor, recarregue a página.');
      return;
    }

    // id_unidade comes from slotData (used by backend to resolve id_job_unidade)
    if (!slotData.id_unidade) {
      message.error('ID da unidade não disponível. Por favor, recarregue a página.');
      return;
    }

    // Backend accepts id_unidade + jobId and resolves id_job_unidade internally
    // Also accepts id_job_unidade directly if available
    const payload = {
      id_unidade: parseInt(slotData.id_unidade, 10),
      applicationId: selectedCandidate.id_application,
      jobId: jobId,
      start_at: slotData.start_at,
      end_at: slotData.end_at,
    };

    // If id_job_unidade is available, include it for faster resolution
    if (slotData.id_job_unidade) {
      payload.id_job_unidade = parseInt(slotData.id_job_unidade, 10);
    }

    createBookingMutation.mutate(payload);
  };

  // Handle back to search
  const handleBackToSearch = () => {
    setShowConfirmation(false);
  };

  if (!slotData) return null;

  return (
    <Modal
      title={
        <Space>
          <CalendarOutlined style={{ color: '#1890ff' }} />
          <span>Agendar Candidato Manualmente</span>
        </Space>
      }
      open={open}
      onCancel={handleModalClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* Slot Information */}
        <Card size="small" style={{ backgroundColor: '#f0f5ff' }}>
          <Descriptions column={1} size="small" colon={false}>
            <Descriptions.Item
              label={
                <Space size={4}>
                  <CalendarOutlined />
                  <Text strong>Data</Text>
                </Space>
              }
            >
              {moment(slotData.start_at).format('dddd, DD [de] MMMM [de] YYYY')}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <Space size={4}>
                  <ClockCircleOutlined />
                  <Text strong>Horário</Text>
                </Space>
              }
            >
              {moment(slotData.start_at).format('HH:mm')} - {moment(slotData.end_at).format('HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <Space size={4}>
                  <EnvironmentOutlined />
                  <Text strong>Unidade</Text>
                </Space>
              }
            >
              {slotData.unidade?.nome_unidade || 'Unidade não informada'}
              {slotData.unidade?.endereco && (
                <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                  {slotData.unidade.endereco}
                </Text>
              )}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Candidate Search (Step 1) */}
        {!showConfirmation && (
          <>
            <div>
              <Title level={5} style={{ marginBottom: 8 }}>
                1. Buscar Candidato
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Digite o CPF do candidato (11 dígitos)
              </Text>
            </div>

            <CandidateSearch
              onSelect={handleCandidateSelect}
              id_unidade={slotData.id_unidade}
              placeholder="Buscar por CPF (11 dígitos)"
            />

            <Alert
              message="Dica"
              description="Digite apenas os 11 dígitos do CPF do candidato. Você pode digitar com ou sem formatação."
              type="info"
              showIcon
              style={{ fontSize: '12px' }}
            />
          </>
        )}

        {/* Confirmation (Step 2) */}
        {showConfirmation && selectedCandidate && (
          <>
            <div>
              <Title level={5} style={{ marginBottom: 8 }}>
                2. Confirmar Agendamento
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Revise as informações antes de confirmar
              </Text>
            </div>

            <Card
              size="small"
              style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}
            >
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space size={8}>
                  <UserOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
                  <Text strong style={{ fontSize: '16px' }}>
                    {selectedCandidate.candidate_name}
                  </Text>
                </Space>

                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {selectedCandidate.candidate_email}
                </Text>

                {selectedCandidate.job_name && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Vaga: {selectedCandidate.job_name}
                  </Text>
                )}
              </Space>
            </Card>

            <Alert
              message="Importante"
              description="Ao confirmar, o candidato receberá automaticamente um convite por e-mail com os detalhes da aula teste."
              type="warning"
              showIcon
              style={{ fontSize: '12px' }}
            />

            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button onClick={handleBackToSearch} disabled={createBookingMutation.isPending}>
                Voltar
              </Button>
              <Button
                type="primary"
                icon={<CalendarOutlined />}
                onClick={handleConfirmBooking}
                loading={createBookingMutation.isPending}
                size="large"
              >
                Confirmar Agendamento
              </Button>
            </Space>
          </>
        )}

        {/* Cancel button (Step 1 only) */}
        {!showConfirmation && (
          <div style={{ textAlign: 'right' }}>
            <Button onClick={handleModalClose}>Cancelar</Button>
          </div>
        )}
      </Space>
    </Modal>
  );
}
