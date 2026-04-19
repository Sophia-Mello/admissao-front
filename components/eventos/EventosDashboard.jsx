/**
 * EventosDashboard.jsx - Dashboard with Slots Overview
 *
 * Displays time slots as color-coded cards:
 * - Gray: 0 inscriptions (empty)
 * - Green: Partially filled (1 to capacity-1)
 * - Blue: Full (at capacity)
 *
 * Clicking a card opens the rooms modal for that slot.
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Spin,
  Empty,
  Tag,
  Space,
  DatePicker,
  Button,
  Tooltip,
  Badge,
  Select,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  TagOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useDashboardSlots } from '../../hooks/useEventos';
import { useEventTypes } from '../../hooks/useEventTypes';
import EventosSlotsModal from './EventosSlotsModal';
import EventosCreateModal from './EventosCreateModal';
import EventosDeleteBulkModal from './EventosDeleteBulkModal';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

// Color scheme based on occupancy
const getSlotColor = (total, inscritos) => {
  if (inscritos === 0) return { bg: '#f5f5f5', border: '#d9d9d9', text: '#8c8c8c' }; // Gray
  if (inscritos >= total) return { bg: '#e6f7ff', border: '#1890ff', text: '#1890ff' }; // Blue (full)
  return { bg: '#f6ffed', border: '#52c41a', text: '#52c41a' }; // Green (partial)
};

export default function EventosDashboard({ type: initialType = null }) {
  const [selectedEventType, setSelectedEventType] = useState(initialType);
  const [dateRange, setDateRange] = useState([
    dayjs(),
    dayjs().add(14, 'day'),
  ]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteBulkModalOpen, setDeleteBulkModalOpen] = useState(false);

  // Fetch event types for filter dropdown
  const { eventTypes, isLoading: loadingEventTypes } = useEventTypes();

  // Set first event type as default when loaded
  useEffect(() => {
    if (!selectedEventType && eventTypes.length > 0) {
      setSelectedEventType(eventTypes[0].code);
    }
  }, [eventTypes, selectedEventType]);


  const { slots, isLoading, refetch, isFetching } = useDashboardSlots({
    type: selectedEventType,
    date_start: dateRange[0]?.format('YYYY-MM-DD'),
    date_end: dateRange[1]?.format('YYYY-MM-DD'),
    enabled: !!(dateRange[0] && dateRange[1]),
  });

  // Group slots by date
  const slotsByDate = useMemo(() => {
    if (!slots || slots.length === 0) return {};

    return slots.reduce((acc, slot) => {
      const dateKey = slot.date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(slot);
      return acc;
    }, {});
  }, [slots]);

  const handleSlotClick = (slot) => {
    setSelectedSlot({
      date: slot.date,
      time: slot.time_start,
      type: selectedEventType,
    });
  };

  const formatDate = (dateStr) => {
    return dayjs(dateStr).format('ddd, DD/MM');
  };

  const formatTime = (timeStr) => {
    return timeStr?.substring(0, 5);
  };

  return (
    <div>
      {/* Header with filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space wrap>
              <Space>
                <TagOutlined />
                <Text strong>Tipo:</Text>
                <Select
                  value={selectedEventType}
                  onChange={setSelectedEventType}
                  loading={loadingEventTypes}
                  style={{ minWidth: 180 }}
                  options={eventTypes.map((et) => ({
                    label: et.display_name,
                    value: et.code,
                  }))}
                />
              </Space>
              <Space>
                <CalendarOutlined />
                <Text strong>Período:</Text>
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  format="DD/MM/YYYY"
                />
              </Space>
              <Button
                icon={<ReloadOutlined spin={isFetching} />}
                onClick={() => refetch()}
                disabled={isFetching}
              >
                Atualizar
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => setDeleteBulkModalOpen(true)}
              >
                Excluir em Massa
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalOpen(true)}
              >
                Criar Eventos em Massa
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Legend */}
        <Row style={{ marginTop: 16 }}>
          <Space size="large">
            <Space>
              <Badge color="#d9d9d9" />
              <Text type="secondary">Vazio</Text>
            </Space>
            <Space>
              <Badge color="#52c41a" />
              <Text type="secondary">Parcialmente ocupado</Text>
            </Space>
            <Space>
              <Badge color="#1890ff" />
              <Text type="secondary">Lotado</Text>
            </Space>
          </Space>
        </Row>
      </Card>

      {/* Slots Grid */}
      {isLoading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Carregando horários...</Text>
            </div>
          </div>
        </Card>
      ) : Object.keys(slotsByDate).length === 0 ? (
        <Card>
          <Empty
            description={
              <span>
                Nenhum evento encontrado no período selecionado.
                <br />
                <Button type="link" onClick={() => setCreateModalOpen(true)}>
                  Criar eventos agora
                </Button>
              </span>
            }
          />
        </Card>
      ) : (
        Object.entries(slotsByDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, slots]) => (
            <Card
              key={date}
              title={
                <Space>
                  <CalendarOutlined />
                  {formatDate(date)}
                  <Tag>{slots.length} horários</Tag>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Row gutter={[12, 12]}>
                {slots
                  .sort((a, b) => a.time_start.localeCompare(b.time_start))
                  .map((slot, idx) => {
                    const colors = getSlotColor(
                      parseInt(slot.total_capacity),
                      parseInt(slot.total_inscritos)
                    );
                    const occupancyPercent = slot.total_capacity > 0
                      ? Math.round((slot.total_inscritos / slot.total_capacity) * 100)
                      : 0;

                    return (
                      <Col key={idx} xs={12} sm={8} md={6} lg={4} xl={3}>
                        <Tooltip
                          title={
                            <div>
                              <div>Horário: {formatTime(slot.time_start)} - {formatTime(slot.time_end)}</div>
                              <div>Ocupação: {slot.total_inscritos}/{slot.total_capacity} ({occupancyPercent}%)</div>
                              <div>Salas: {slot.rooms_count || 'N/A'}</div>
                            </div>
                          }
                        >
                          <Card
                            hoverable
                            size="small"
                            onClick={() => handleSlotClick(slot)}
                            style={{
                              backgroundColor: colors.bg,
                              borderColor: colors.border,
                              cursor: 'pointer',
                            }}
                            bodyStyle={{ padding: '12px 8px', textAlign: 'center' }}
                          >
                            <Space direction="vertical" size={0}>
                              <Text strong style={{ color: colors.text, fontSize: 16 }}>
                                <ClockCircleOutlined /> {formatTime(slot.time_start)}
                              </Text>
                              <Text style={{ color: colors.text }}>
                                <TeamOutlined /> {slot.total_inscritos}/{slot.total_capacity}
                              </Text>
                            </Space>
                          </Card>
                        </Tooltip>
                      </Col>
                    );
                  })}
              </Row>
            </Card>
          ))
      )}

      {/* Modals */}
      <EventosSlotsModal
        open={!!selectedSlot}
        onCancel={() => setSelectedSlot(null)}
        date={selectedSlot?.date}
        time={selectedSlot?.time}
        type={selectedSlot?.type}
        onSuccess={() => refetch()}
      />

      <EventosCreateModal
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        defaultType={selectedEventType}
        onSuccess={() => {
          setCreateModalOpen(false);
          refetch();
        }}
      />

      <EventosDeleteBulkModal
        open={deleteBulkModalOpen}
        onCancel={() => setDeleteBulkModalOpen(false)}
        type={selectedEventType}
        onSuccess={() => {
          setDeleteBulkModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
