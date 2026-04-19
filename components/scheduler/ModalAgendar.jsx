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
 * 5. API call creates booking
 * 6. Success message and modal closes
 *
 * Props:
 * @param {boolean} open - Whether modal is visible
 * @param {Function} onCancel - Callback when modal is closed
 * @param {Object} slotData - { id_unidade, start_at, end_at, date, unidade }
 */

import { useState } from 'react';
import { Modal, Space, Typography, Button, Card, Descriptions, message, Alert } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, EnvironmentOutlined, UserOutlined } from '@ant-design/icons';
import moment from 'moment';
import 'moment/locale/pt-br';
import CandidateSearch from './CandidateSearch';
import { useBookings } from '../../hooks/useBookings';

const { Title, Text } = Typography;

moment.locale('pt-br');

export default function ModalAgendar({ open, onCancel, slotData }) {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Booking mutation
  const { createBooking } = useBookings();

  // Reset state when modal opens/closes
  const handleModalClose = () => {
    setSelectedCandidate(null);
    setShowConfirmation(false);
    onCancel();
  };

  // Handle candidate selection
  const handleCandidateSelect = (candidate) => {
    setSelectedCandidate(candidate);
    setShowConfirmation(true);
  };

  // Handle booking confirmation
  const handleConfirmBooking = async () => {
    if (!selectedCandidate || !slotData) {
      return;
    }

    // Get jobId from candidate
    const jobId = selectedCandidate.id_job_gupy || selectedCandidate.job_id;
    if (!jobId) {
      message.error('Job ID nao disponivel no candidato. Por favor, recarregue a pagina.');
      return;
    }

    // Validate id_unidade
    if (!slotData.id_unidade) {
      message.error('ID da unidade nao disponivel. Por favor, recarregue a pagina.');
      return;
    }

    // Build start_at and end_at datetime from date and time
    const startDateTime = slotData.date
      ? `${slotData.date}T${slotData.start_at}:00`
      : slotData.start_at;

    const endDateTime = slotData.date && slotData.end_at
      ? `${slotData.date}T${slotData.end_at}:00`
      : slotData.end_at;

    const payload = {
      id_unidade: slotData.id_unidade,
      id_application_gupy: selectedCandidate.id_application,
      id_job_gupy: jobId,
      start_at: startDateTime,
      end_at: endDateTime,
    };

    try {
      await createBooking.mutateAsync(payload);
      message.success('Agendamento realizado com sucesso!');
      handleModalClose();
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao criar agendamento';
      message.error(errorMessage);
    }
  };

  // Handle back to search
  const handleBackToSearch = () => {
    setShowConfirmation(false);
  };

  if (!slotData) return null;

  // Format date display
  const formatDate = () => {
    if (slotData.date) {
      return moment(slotData.date).format('dddd, DD [de] MMMM [de] YYYY');
    }
    if (slotData.start_at && slotData.start_at.includes('T')) {
      return moment(slotData.start_at).format('dddd, DD [de] MMMM [de] YYYY');
    }
    return 'Data nao disponivel';
  };

  // Format time display
  const formatTime = () => {
    const start = slotData.start_at?.includes('T')
      ? moment(slotData.start_at).format('HH:mm')
      : slotData.start_at;
    const end = slotData.end_at?.includes('T')
      ? moment(slotData.end_at).format('HH:mm')
      : slotData.end_at;
    return `${start} - ${end}`;
  };

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
              {formatDate()}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <Space size={4}>
                  <ClockCircleOutlined />
                  <Text strong>Horario</Text>
                </Space>
              }
            >
              {formatTime()}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <Space size={4}>
                  <EnvironmentOutlined />
                  <Text strong>Unidade</Text>
                </Space>
              }
            >
              {slotData.unidade?.nome_unidade || 'Unidade nao informada'}
              {slotData.unidade?.endereco && (
                <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                  {slotData.unidade.endereco}
                </Text>
              )}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Override Block Warning */}
        {slotData.isOverridingBlock && (
          <Alert
            message="Agendando em Horario Bloqueado"
            description="Voce esta agendando em um horario que estava bloqueado. O bloqueio continuara ativo para outros slots."
            type="warning"
            showIcon
          />
        )}

        {/* Candidate Search (Step 1) */}
        {!showConfirmation && (
          <>
            <div>
              <Title level={5} style={{ marginBottom: 8 }}>
                1. Buscar Candidato
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Digite o CPF do candidato (11 digitos). Candidatos de QUALQUER fase serao mostrados.
              </Text>
            </div>

            <CandidateSearch
              onSelect={handleCandidateSelect}
              id_unidade={slotData.id_unidade}
              placeholder="Buscar por CPF (11 digitos)"
            />

            <Alert
              message="Dica"
              description="Digite apenas os 11 digitos do CPF do candidato. Voce pode digitar com ou sem formatacao. Candidatos de qualquer fase do processo seletivo serao exibidos."
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
                Revise as informacoes antes de confirmar
              </Text>
            </div>

            <Card size="small" style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
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

                {selectedCandidate.current_step && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Fase atual: <strong>{selectedCandidate.current_step}</strong>
                  </Text>
                )}

                {selectedCandidate.job_name && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Vaga: {selectedCandidate.job_name}
                  </Text>
                )}
              </Space>
            </Card>

            <Alert
              message="Importante"
              description="Ao confirmar, o candidato recebera automaticamente um convite por e-mail com os detalhes da aula teste."
              type="warning"
              showIcon
              style={{ fontSize: '12px' }}
            />

            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button onClick={handleBackToSearch} disabled={createBooking.isPending}>
                Voltar
              </Button>
              <Button
                type="primary"
                icon={<CalendarOutlined />}
                onClick={handleConfirmBooking}
                loading={createBooking.isPending}
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
