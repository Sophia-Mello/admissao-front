/**
 * EventosSlotsModal.jsx - Rooms for a Time Slot
 *
 * Shows all rooms available for a specific date/time slot.
 * Each room card shows:
 * - Room number
 * - Capacity and current occupancy
 * - Meet link
 * - Button to view candidates
 */

import { useState } from 'react';
import {
  Modal,
  Card,
  Row,
  Col,
  Typography,
  Space,
  Tag,
  Button,
  Spin,
  Empty,
  Progress,
  Tooltip,
  Popconfirm,
  message,
} from 'antd';
import {
  TeamOutlined,
  VideoCameraOutlined,
  UserOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSlotRooms, useDeleteSlot } from '../../hooks/useEventos';
import EventosCandidatosModal from './EventosCandidatosModal';

const { Text, Title } = Typography;

export default function EventosSlotsModal({ open, onCancel, date, time, type, onSuccess }) {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const { rooms, summary, isLoading, refetch } = useSlotRooms(date, time, null, type, open);
  const deleteSlotMutation = useDeleteSlot();

  const formatDate = (dateStr) => {
    return dayjs(dateStr).format('dddd, DD [de] MMMM [de] YYYY');
  };

  const handleViewCandidates = (room) => {
    setSelectedRoom(room);
  };

  const handleOpenMeet = (meetLink) => {
    if (meetLink) {
      window.open(meetLink, '_blank');
    } else {
      message.warning('Link do Meet não disponível');
    }
  };

  const handleDeleteSlot = async () => {
    if (deleteConfirmText !== 'excluir') {
      message.error('Digite "excluir" para confirmar');
      return;
    }

    try {
      await deleteSlotMutation.mutateAsync({
        date,
        time,
        type,
        confirmation: 'excluir',
      });
      setDeleteConfirmText('');
      onSuccess?.(); // Refresh parent dashboard
      onCancel();
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <>
      <Modal
        title={
          <Space>
            <TeamOutlined />
            <span>Salas do Horário</span>
            <Tag color="blue">{time?.substring(0, 5)}</Tag>
          </Space>
        }
        open={open}
        onCancel={onCancel}
        width={900}
        footer={[
          <Popconfirm
            key="delete"
            title="Excluir todos os eventos deste horário?"
            description={
              <div>
                <p>Esta ação irá excluir todas as salas e cancelar todas as inscrições.</p>
                <p>Digite <strong>excluir</strong> para confirmar:</p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  style={{ width: '100%', padding: 8, marginTop: 8 }}
                  placeholder="Digite 'excluir'"
                />
              </div>
            }
            onConfirm={handleDeleteSlot}
            onCancel={() => setDeleteConfirmText('')}
            okText="Confirmar Exclusão"
            cancelText="Cancelar"
            okButtonProps={{ danger: true, loading: deleteSlotMutation.isPending }}
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
          >
            <Button danger icon={<DeleteOutlined />}>
              Excluir Horário
            </Button>
          </Popconfirm>,
          <Button key="close" onClick={onCancel}>
            Fechar
          </Button>,
        ]}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            {/* Header info */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <Text strong>{formatDate(date)}</Text>
                </Col>
                <Col>
                  <Space split={<span>|</span>}>
                    <Text>
                      <TeamOutlined /> {summary.total_inscritos || 0}/{summary.total_capacity || 0} inscritos
                    </Text>
                    <Text>
                      {rooms.length} sala(s)
                    </Text>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* Rooms grid */}
            {rooms.length === 0 ? (
              <Empty description="Nenhuma sala encontrada para este horário" />
            ) : (
              <Row gutter={[16, 16]}>
                {rooms.map((room) => {
                  const occupancy = room.capacity > 0
                    ? Math.round((room.inscritos / room.capacity) * 100)
                    : 0;
                  const isFull = room.inscritos >= room.capacity;

                  return (
                    <Col key={room.id} xs={24} sm={12} md={8}>
                      <Card
                        size="small"
                        title={
                          <Space>
                            <UserOutlined />
                            <span>Sala {room.room}</span>
                            {isFull && <Tag color="blue">Lotada</Tag>}
                          </Space>
                        }
                        extra={
                          <Tag color={room.status === 'open' ? 'green' : 'default'}>
                            {room.status === 'open' ? 'Aberta' : room.status}
                          </Tag>
                        }
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <div>
                            <Text type="secondary">Ocupação:</Text>
                            <Progress
                              percent={occupancy}
                              size="small"
                              status={isFull ? 'success' : 'active'}
                              format={() => `${room.inscritos}/${room.capacity}`}
                            />
                          </div>

                          <Space>
                            <Tooltip title="Abrir Meet">
                              <Button
                                size="small"
                                icon={<VideoCameraOutlined />}
                                onClick={() => handleOpenMeet(room.meet_link)}
                                disabled={!room.meet_link}
                              >
                                Meet
                              </Button>
                            </Tooltip>
                            <Button
                              size="small"
                              type="primary"
                              icon={<TeamOutlined />}
                              onClick={() => handleViewCandidates(room)}
                            >
                              Ver Candidatos
                            </Button>
                          </Space>
                        </Space>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </>
        )}
      </Modal>

      {/* Candidates Modal */}
      <EventosCandidatosModal
        open={!!selectedRoom}
        onCancel={() => setSelectedRoom(null)}
        roomId={selectedRoom?.id}
        roomNumber={selectedRoom?.room}
        onRefresh={refetch}
      />
    </>
  );
}
