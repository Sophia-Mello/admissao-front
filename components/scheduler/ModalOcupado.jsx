/**
 * ModalOcupado Component
 *
 * Modal for viewing details of an occupied slot and canceling the booking.
 *
 * Features:
 * - Display candidate info (name, email, CPF, phone)
 * - Display booking info (date, time, unit)
 * - Display calendar event IDs
 * - Display rubrica URL link
 * - Button to cancel booking (opens ModalCancelar)
 *
 * Props:
 * @param {boolean} open - Whether modal is visible
 * @param {Function} onCancel - Callback when modal is closed
 * @param {Object} bookingData - Booking details object
 */

import { useState } from 'react';
import { Modal, Space, Typography, Button, Descriptions, Card, Tag } from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import 'moment/locale/pt-br';
import ModalCancelar from './ModalCancelar';

const { Text, Link } = Typography;

moment.locale('pt-br');

export default function ModalOcupado({ open, onCancel, bookingData }) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const handleModalClose = () => {
    setCancelModalOpen(false);
    onCancel();
  };

  const handleCancelSuccess = () => {
    setCancelModalOpen(false);
    handleModalClose();
  };

  if (!bookingData) return null;

  const {
    id_booking,
    start_at,
    end_at,
    date,
    candidate,
    unidade,
    calendar_event_ids,
    rubrica_url,
    status,
    job_name,
  } = bookingData;

  // Format date display
  const formatDate = () => {
    if (date) {
      return moment(date).format('dddd, DD [de] MMMM [de] YYYY');
    }
    if (start_at && start_at.includes('T')) {
      return moment(start_at).format('dddd, DD [de] MMMM [de] YYYY');
    }
    return 'Data nao disponivel';
  };

  // Format time display
  const formatTime = () => {
    const start = start_at?.includes('T')
      ? moment(start_at).format('HH:mm')
      : start_at;
    const end = end_at?.includes('T')
      ? moment(end_at).format('HH:mm')
      : end_at;
    return `${start} - ${end}`;
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'agendado':
        return 'blue';
      case 'compareceu':
      case 'realizado':
        return 'success';
      case 'faltou':
      case 'cancelado':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <>
      <Modal
        title={
          <Space>
            <UserOutlined style={{ color: '#1890ff' }} />
            <span>Detalhes do Agendamento</span>
          </Space>
        }
        open={open}
        onCancel={handleModalClose}
        footer={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button onClick={handleModalClose}>Fechar</Button>
            <Button
              danger
              type="primary"
              onClick={() => setCancelModalOpen(true)}
              disabled={status === 'cancelado'}
            >
              Cancelar Agendamento
            </Button>
          </Space>
        }
        width={700}
        destroyOnClose
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* Status Badge */}
          {status && (
            <div>
              <Tag
                color={getStatusColor(status)}
                style={{ fontSize: '14px', padding: '4px 12px' }}
              >
                {status.toUpperCase()}
              </Tag>
            </div>
          )}

          {/* Candidate Information */}
          <Card size="small" title={<Text strong>Candidato</Text>} style={{ backgroundColor: '#f0f5ff' }}>
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item
                label={
                  <Space size={4}>
                    <UserOutlined />
                    <Text>Nome</Text>
                  </Space>
                }
              >
                <Text strong>{candidate?.name || 'Nao informado'}</Text>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space size={4}>
                    <MailOutlined />
                    <Text>E-mail</Text>
                  </Space>
                }
              >
                {candidate?.email || 'Nao informado'}
              </Descriptions.Item>
              {candidate?.cpf && (
                <Descriptions.Item
                  label={
                    <Space size={4}>
                      <IdcardOutlined />
                      <Text>CPF</Text>
                    </Space>
                  }
                >
                  {candidate.cpf}
                </Descriptions.Item>
              )}
              {candidate?.phone && (
                <Descriptions.Item
                  label={
                    <Space size={4}>
                      <PhoneOutlined />
                      <Text>Telefone</Text>
                    </Space>
                  }
                >
                  {candidate.phone}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Booking Information */}
          <Card size="small" title={<Text strong>Horario e Local</Text>}>
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item
                label={
                  <Space size={4}>
                    <CalendarOutlined />
                    <Text>Data</Text>
                  </Space>
                }
              >
                {formatDate()}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space size={4}>
                    <ClockCircleOutlined />
                    <Text>Horario</Text>
                  </Space>
                }
              >
                {formatTime()}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space size={4}>
                    <EnvironmentOutlined />
                    <Text>Unidade</Text>
                  </Space>
                }
              >
                <Space direction="vertical" size={4}>
                  <Text strong>{unidade?.nome_unidade || 'Nao informado'}</Text>
                  {unidade?.endereco && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {unidade.endereco}
                    </Text>
                  )}
                </Space>
              </Descriptions.Item>
              {job_name && (
                <Descriptions.Item label={<Text>Vaga</Text>}>
                  {job_name}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Calendar Event IDs */}
          {calendar_event_ids && (calendar_event_ids.coordenador || calendar_event_ids.candidato) && (
            <Card size="small" title={<Text strong>Eventos de Calendario</Text>}>
              <Descriptions column={1} size="small" colon={false}>
                {calendar_event_ids.coordenador && (
                  <Descriptions.Item label="ID Coordenador">
                    <Text code style={{ fontSize: '11px' }}>
                      {calendar_event_ids.coordenador}
                    </Text>
                  </Descriptions.Item>
                )}
                {calendar_event_ids.candidato && (
                  <Descriptions.Item label="ID Candidato">
                    <Text code style={{ fontSize: '11px' }}>
                      {calendar_event_ids.candidato}
                    </Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          {/* Rubrica URL */}
          {rubrica_url && (
            <Card size="small" title={<Text strong>Formulario de Avaliacao</Text>}>
              <Space direction="vertical" size={8}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Link para o formulario de avaliacao da aula teste:
                </Text>
                <Link href={rubrica_url} target="_blank" rel="noopener noreferrer">
                  <Space size={4}>
                    <LinkOutlined />
                    <span>Abrir Formulario de Avaliacao</span>
                  </Space>
                </Link>
              </Space>
            </Card>
          )}

          {/* Booking ID */}
          <Text type="secondary" style={{ fontSize: '11px' }}>
            ID do Agendamento: {id_booking}
          </Text>
        </Space>
      </Modal>

      {/* Cancel Modal */}
      <ModalCancelar
        open={cancelModalOpen}
        onCancel={() => setCancelModalOpen(false)}
        onSuccess={handleCancelSuccess}
        id_booking={id_booking}
        candidateName={candidate?.name}
      />
    </>
  );
}
