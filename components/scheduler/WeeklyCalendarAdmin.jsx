/**
 * WeeklyCalendarAdmin Component
 *
 * Admin view of weekly calendar showing days with slots only.
 * Displays all slot statuses: vago, ocupado, bloqueado.
 *
 * Uses useAvailability hook for fetching slot data.
 *
 * Props:
 * - unidadeId: number - Selected unit ID
 * - page: number - Page number for pagination (default: 1)
 * - unidadeData: object - Full unit data
 * - onSlotClick: (slot, date) => void - Callback when slot is clicked
 * - onBlockSlotClick: (slot, date) => void - Callback when "Bloquear" is clicked on empty slot
 * - onPaginationUpdate: (pagination) => void - Callback with pagination info
 */

import { useEffect } from 'react';
import { Row, Col, Typography, Empty, Alert, Skeleton } from 'antd';
import moment from 'moment';
import 'moment/locale/pt-br';
import SlotCard from './SlotCard';
import { useAvailability } from '../../hooks/useAvailability';

const { Text } = Typography;

moment.locale('pt-br');

export default function WeeklyCalendarAdmin({
  unidadeId,
  page = 1,
  unidadeData,
  onSlotClick,
  onBlockSlotClick,
  onPaginationUpdate,
}) {
  // If no unit selected, show empty state
  if (!unidadeId) {
    return (
      <Empty
        description="Selecione uma unidade para visualizar os agendamentos"
        style={{ padding: '60px 0' }}
      />
    );
  }

  // Fetch availability using hook with page parameter
  const { data: availabilityData, isLoading, isError, error } = useAvailability(
    unidadeId,
    page
  );

  // Update parent with pagination info when data changes
  useEffect(() => {
    if (availabilityData?.pagination && onPaginationUpdate) {
      onPaginationUpdate(availabilityData.pagination);
    }
  }, [availabilityData?.pagination, onPaginationUpdate]);

  // Get week start from pagination for display
  const weekStartMoment = availabilityData?.pagination?.week_start
    ? moment(availabilityData.pagination.week_start)
    : moment().startOf('isoWeek');

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div style={{ padding: '20px 0' }}>
        <Row gutter={[16, 16]}>
          {Array.from({ length: 6 }, (_, i) => (
            <Col key={i} xs={24} sm={12} md={8} lg={4}>
              <div
                style={{
                  border: '1px solid #d9d9d9',
                  borderRadius: '8px',
                  padding: '12px',
                  minHeight: '200px',
                }}
              >
                <Skeleton active paragraph={{ rows: 4 }} />
              </div>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <Alert
        message="Erro ao carregar agendamentos"
        description={error?.message || 'Erro desconhecido'}
        type="error"
        showIcon
        style={{ margin: '20px 0' }}
      />
    );
  }

  // Group slots by date
  const slotsByDate = {};
  if (availabilityData?.slots) {
    availabilityData.slots.forEach((slot) => {
      const dateKey = slot.date;
      if (!slotsByDate[dateKey]) {
        slotsByDate[dateKey] = [];
      }
      slotsByDate[dateKey].push(slot);
    });
  }

  // Build days array and filter out days without slots
  const daysWithSlots = Array.from({ length: 6 }, (_, i) => {
    const day = weekStartMoment.clone().add(i, 'days');
    const dateKey = day.format('YYYY-MM-DD');
    const daySlots = slotsByDate[dateKey] || [];
    return { day, dateKey, daySlots };
  }).filter(({ daySlots }) => daySlots.length > 0);

  // If no days have slots, show empty message
  if (daysWithSlots.length === 0) {
    return (
      <Empty
        description="Nenhum horario configurado para esta semana"
        style={{ padding: '60px 0' }}
      />
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {daysWithSlots.map(({ day, dateKey, daySlots }) => {
        const isToday = day.isSame(moment(), 'day');

        return (
          <Col key={dateKey} xs={24} sm={12} md={8} lg={4}>
            <div
              style={{
                border: isToday ? '2px solid #1890ff' : '1px solid #d9d9d9',
                borderRadius: '8px',
                padding: '12px',
                backgroundColor: isToday ? '#e6f7ff' : '#fafafa',
                minHeight: '200px',
              }}
            >
              {/* Date Header */}
              <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                <Text strong style={{ fontSize: '16px', textTransform: 'capitalize' }}>
                  {day.format('ddd')}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  {day.format('DD/MM')}
                </Text>
              </div>

              {/* Slots */}
              {daySlots.map((slot, index) => {
                // Map slot data to UI format
                const slotData = {
                  id: `${slot.status}_${slot.id_booking || slot.id_slot || index}`,
                  time: `${slot.slot_start} - ${slot.slot_end}`,
                  slot_start: slot.slot_start,
                  slot_end: slot.slot_end,
                  status: slot.status,
                  date: dateKey,
                  id_unidade: unidadeId,
                  unidade: unidadeData,
                };

                if (slot.status === 'ocupado') {
                  slotData.id_booking = slot.id_booking;
                  slotData.candidateName = slot.candidate_name;
                  slotData.candidateEmail = slot.candidate_email;
                  slotData.candidateCpf = slot.candidate_cpf;
                  slotData.candidatePhone = slot.candidate_phone;
                  slotData.booking_status = slot.status_booking || slot.booking_status;
                  slotData.job_name = slot.job_name;
                  slotData.rubrica_url = slot.rubrica_url;
                  slotData.calendar_event_ids = {
                    coordenador: slot.id_calendar_event,
                    candidato: slot.id_calendar_event_candidato,
                  };
                } else if (slot.status === 'bloqueado') {
                  slotData.id_slot = slot.id_slot;
                  slotData.id_slot_block = slot.id_slot || slot.id_block;
                  slotData.reason = slot.reason || 'Horario bloqueado';
                  slotData.is_fallback = slot.is_fallback;
                }

                return (
                  <SlotCard
                    key={slotData.id}
                    slot={slotData}
                    date={dateKey}
                    onClick={() => onSlotClick && onSlotClick(slotData, dateKey)}
                    onBlockSlot={() => onBlockSlotClick && onBlockSlotClick(slotData, dateKey)}
                  />
                );
              })}
            </div>
          </Col>
        );
      })}
    </Row>
  );
}
