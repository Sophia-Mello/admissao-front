// components/BookingsManagement/ModalOcupado.jsx

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

const { Title, Text, Link } = Typography;

moment.locale('pt-br');

/**
 * ModalOcupado Component
 *
 * Modal for viewing details of an occupied slot and canceling the booking.
 *
 * Features:
 * - Display booking details (candidate, time, unit, contact info)
 * - Display calendar event IDs
 * - Display rubrica URL (evaluation form link)
 * - Button to cancel booking (opens ModalCancelar)
 *
 * Props:
 * @param {boolean} open - Whether modal is visible
 * @param {Function} onCancel - Callback when modal is closed
 * @param {Object} bookingData - Booking details object
 */
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
    candidate,
    unidade,
    calendar_event_ids,
    rubrica_url,
    status,
  } = bookingData;

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
                color={
                  status === 'agendado'
                    ? 'blue'
                    : status === 'realizado'
                    ? 'success'
                    : status === 'cancelado'
                    ? 'error'
                    : 'default'
                }
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
                <Text strong>{candidate?.name || 'Não informado'}</Text>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space size={4}>
                    <MailOutlined />
                    <Text>E-mail</Text>
                  </Space>
                }
              >
                {candidate?.email || 'Não informado'}
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
          <Card size="small" title={<Text strong>Horário e Local</Text>}>
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item
                label={
                  <Space size={4}>
                    <CalendarOutlined />
                    <Text>Data</Text>
                  </Space>
                }
              >
                {moment(start_at).format('dddd, DD [de] MMMM [de] YYYY')}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space size={4}>
                    <ClockCircleOutlined />
                    <Text>Horário</Text>
                  </Space>
                }
              >
                {moment(start_at).format('HH:mm')} - {moment(end_at).format('HH:mm')}
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
                  <Text strong>{unidade?.nome_unidade || 'Não informado'}</Text>
                  {unidade?.endereco && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {unidade.endereco}
                    </Text>
                  )}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Calendar Event IDs */}
          {calendar_event_ids && (
            <Card size="small" title={<Text strong>Eventos de Calendário</Text>}>
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
            <Card size="small" title={<Text strong>Formulário de Avaliação</Text>}>
              <Space direction="vertical" size={8}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Link para o formulário de avaliação da aula teste:
                </Text>
                <Link href={rubrica_url} target="_blank" rel="noopener noreferrer">
                  <Space size={4}>
                    <LinkOutlined />
                    <span>Abrir Formulário de Avaliação</span>
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
