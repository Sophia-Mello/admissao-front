/**
 * FiscalizacaoContent.jsx - Main component for exam monitoring
 *
 * Structure:
 * - Header with event/room selectors
 * - Open Meet button (external link)
 * - Iniciar Prova button (disabled when done)
 * - CandidateTable with presence checkboxes
 * - OcorrenciaModal for reporting issues
 * - IniciarProvaModal for confirmation
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Space,
  Typography,
  Empty,
  Spin,
  Alert,
  Tag,
  Statistic,
  Tooltip,
} from 'antd';
import {
  PlayCircleOutlined,
  VideoCameraOutlined,
  ReloadOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LockOutlined,
  TagOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useMonitorCandidates } from '../../hooks/useFiscalizacao';
import { useDashboardSlots, useSlotRooms } from '../../hooks/useEventos';
import { useEventTypes } from '../../hooks/useEventTypes';
import CandidateTable from './CandidateTable';
import OcorrenciaModal from './OcorrenciaModal';
import IniciarProvaModal from './IniciarProvaModal';

const { Text } = Typography;
const { Option } = Select;

export default function FiscalizacaoContent({ type: initialType = null }) {
  // Selection state
  const [selectedEventType, setSelectedEventType] = useState(initialType);
  const [selectedTimeStart, setSelectedTimeStart] = useState(null);
  const [selectedTimeEnd, setSelectedTimeEnd] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Modal state
  const [ocorrenciaCandidate, setOcorrenciaCandidate] = useState(null);
  const [showIniciarModal, setShowIniciarModal] = useState(false);

  // Get today's date
  const today = dayjs().format('YYYY-MM-DD');

  // Fetch event types for filter dropdown
  const { eventTypes, isLoading: loadingEventTypes } = useEventTypes();

  // Set first event type as default when loaded
  useEffect(() => {
    if (!selectedEventType && eventTypes.length > 0) {
      setSelectedEventType(eventTypes[0].code);
    }
  }, [eventTypes, selectedEventType]);


  // Get today's slots for time selection
  const { slots, isLoading: loadingSlots, refetch: refetchSlots } = useDashboardSlots({
    type: selectedEventType,
    date_start: today,
    date_end: today,
  });

  // Get rooms for selected time slot
  const {
    rooms: slotRooms,
    isLoading: loadingRooms,
    refetch: refetchRooms,
  } = useSlotRooms(today, selectedTimeStart, selectedTimeEnd, selectedEventType, !!selectedTimeStart);

  // Get candidates for selected room
  const {
    event,
    candidates,
    isLoading: loadingCandidates,
    isFetching: fetchingCandidates,
    refetch: refetchCandidates,
  } = useMonitorCandidates(selectedEventId, selectedRoom, !!selectedEventId && !!selectedRoom);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!candidates.length) return { total: 0, presentes: 0, ausentes: 0 };
    return {
      total: candidates.length,
      presentes: candidates.filter((c) => c.presence_marked).length,
      ausentes: candidates.filter((c) => !c.presence_marked).length,
    };
  }, [candidates]);

  // Check if event is done (locked)
  const isEventDone = event?.status === 'done';

  // Format time for display
  const formatTime = (timeStr) => timeStr?.substring(0, 5) || '';

  // Find selected slot info
  const selectedSlot = useMemo(() => {
    if (!selectedTimeStart || !selectedTimeEnd || !slots?.length) return null;
    return slots.find((s) => s.time_start === selectedTimeStart && s.time_end === selectedTimeEnd);
  }, [selectedTimeStart, selectedTimeEnd, slots]);

  // Get available time options for dropdown
  // Use composite key (time_start|time_end) to distinguish slots with same start time
  const timeOptions = useMemo(() => {
    if (!slots?.length) return [];

    return slots.map((slot, idx) => ({
      key: idx,
      value: `${slot.time_start}|${slot.time_end}`,
      label: `${formatTime(slot.time_start)} - ${formatTime(slot.time_end)} (${slot.total_inscritos}/${slot.total_capacity} candidatos)`,
    }));
  }, [slots]);

  // Handle time selection - parse composite value "time_start|time_end"
  const handleTimeSelect = (compositeValue) => {
    const [timeStart, timeEnd] = compositeValue.split('|');
    setSelectedTimeStart(timeStart);
    setSelectedTimeEnd(timeEnd);
    setSelectedRoom(null);
    setSelectedEventId(null);
  };

  // Handle room selection - get event ID from room
  const handleRoomSelect = (roomNumber) => {
    setSelectedRoom(roomNumber);
    // Find the room to get its event ID (backend returns 'id' as event ID)
    const room = slotRooms.find((r) => r.room === roomNumber);
    if (room?.id) {
      setSelectedEventId(room.id);
    }
  };

  // Refresh all data
  const handleRefresh = () => {
    if (selectedEventId && selectedRoom) {
      refetchCandidates();
    } else if (selectedTimeStart) {
      refetchRooms();
    } else {
      refetchSlots();
    }
  };

  // Open Meet link
  const handleOpenMeet = () => {
    if (event?.meet_link) {
      window.open(event.meet_link, '_blank');
    }
  };

  // Handle iniciar prova success
  const handleIniciarSuccess = () => {
    setShowIniciarModal(false);
    refetchCandidates();
    refetchRooms();
  };

  return (
    <div>
      {/* Header Card */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          {/* Event Type Selector */}
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              <TagOutlined /> Tipo de Evento
            </Text>
            <Select
              placeholder="Selecione o tipo"
              style={{ width: '100%' }}
              loading={loadingEventTypes}
              value={selectedEventType}
              onChange={(value) => {
                setSelectedEventType(value);
                setSelectedTimeStart(null);
                setSelectedTimeEnd(null);
                setSelectedRoom(null);
                setSelectedEventId(null);
              }}
            >
              {eventTypes.map((et) => (
                <Option key={et.id} value={et.code}>
                  {et.display_name}
                </Option>
              ))}
            </Select>
          </Col>

          {/* Time Selector */}
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Horário do Evento
            </Text>
            <Select
              placeholder="Selecione o horário"
              style={{ width: '100%' }}
              loading={loadingSlots}
              value={selectedTimeStart && selectedTimeEnd ? `${selectedTimeStart}|${selectedTimeEnd}` : null}
              onChange={handleTimeSelect}
              disabled={loadingSlots}
            >
              {timeOptions.map((opt) => (
                <Option key={opt.key} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Col>

          {/* Room Selector */}
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Sala
            </Text>
            <Select
              placeholder="Selecione a sala"
              style={{ width: '100%' }}
              loading={loadingRooms}
              value={selectedRoom}
              onChange={handleRoomSelect}
              disabled={!selectedTimeStart || loadingRooms}
            >
              {slotRooms.map((room) => (
                <Option key={room.room} value={room.room}>
                  Sala {room.room} - {room.inscritos}/{room.capacity} candidatos
                  {room.status === 'done' && (
                    <Tag color="green" style={{ marginLeft: 8 }}>Concluída</Tag>
                  )}
                </Option>
              ))}
            </Select>
          </Col>

          {/* Action Buttons */}
          <Col xs={24} md={6}>
            <Space style={{ marginTop: 24 }}>
              <Tooltip title="Atualizar dados">
                <Button
                  icon={<ReloadOutlined spin={fetchingCandidates} />}
                  onClick={handleRefresh}
                  disabled={fetchingCandidates}
                />
              </Tooltip>

              <Button
                icon={<VideoCameraOutlined />}
                onClick={handleOpenMeet}
                disabled={!event?.meet_link}
              >
                Abrir Meet
              </Button>

              <Button
                type="primary"
                icon={isEventDone ? <LockOutlined /> : <PlayCircleOutlined />}
                onClick={() => setShowIniciarModal(true)}
                disabled={!selectedRoom || isEventDone || candidates.length === 0}
              >
                {isEventDone ? 'Prova Iniciada' : 'Iniciar Prova'}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Event Status Alert */}
      {isEventDone && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message="Prova já iniciada"
          description="Os candidatos já foram processados e as presenças estão travadas."
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Statistics Card */}
      {selectedRoom && candidates.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={24}>
            <Col span={8}>
              <Statistic
                title="Total de Candidatos"
                value={stats.total}
                prefix={<TeamOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Presentes"
                value={stats.presentes}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Ausentes"
                value={stats.ausentes}
                prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Candidates Table */}
      <Card
        title={
          selectedRoom && selectedSlot ? (
            <Space>
              <TeamOutlined />
              <span>
                Sala {selectedRoom} - {formatTime(selectedSlot.time_start)} às {formatTime(selectedSlot.time_end)}
              </span>
              {event?.meet_link && (
                <Button type="link" size="small" onClick={handleOpenMeet}>
                  <VideoCameraOutlined /> Meet
                </Button>
              )}
            </Space>
          ) : (
            'Candidatos'
          )
        }
      >
        {!selectedTimeStart ? (
          <Empty description="Selecione um horário para começar" />
        ) : !selectedRoom ? (
          <Empty description="Selecione uma sala para ver os candidatos" />
        ) : loadingCandidates ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Carregando candidatos...</Text>
            </div>
          </div>
        ) : (
          <CandidateTable
            candidates={candidates}
            eventStatus={event?.status}
            onOcorrencia={(candidate) => setOcorrenciaCandidate(candidate)}
            loading={fetchingCandidates}
          />
        )}
      </Card>

      {/* Modals */}
      <OcorrenciaModal
        open={!!ocorrenciaCandidate}
        onCancel={() => setOcorrenciaCandidate(null)}
        candidate={ocorrenciaCandidate}
      />

      <IniciarProvaModal
        open={showIniciarModal}
        onCancel={() => setShowIniciarModal(false)}
        onSuccess={handleIniciarSuccess}
        idEvent={selectedEventId}
        room={selectedRoom}
        candidates={candidates}
      />
    </div>
  );
}
