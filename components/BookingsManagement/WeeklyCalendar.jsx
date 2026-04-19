// components/BookingsManagement/WeeklyCalendar.jsx

import { Row, Col, Typography, Empty, Spin, Alert } from 'antd';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import 'moment/locale/pt-br';
import SlotCard from './SlotCard';
import { getAvailability } from '../../lib/services/bookingsManagementService';

const { Text } = Typography;

moment.locale('pt-br');

/**
 * WeeklyCalendar Component
 *
 * 7-day grid (Monday to Sunday) showing bookings per day.
 * Fetches bookings from backend and displays them by day.
 */
export default function WeeklyCalendar({
  selectedUnidade,
  selectedWeek,
  unidadeData, // NEW: Pass full unit data
  onSlotClick
}) {
  // If no unit selected, show empty state
  if (!selectedUnidade) {
    return (
      <Empty
        description="Selecione uma unidade para visualizar os agendamentos"
        style={{ padding: '60px 0' }}
      />
    );
  }

  // Calculate week days (Monday to Sunday)
  const weekStart = moment(selectedWeek).startOf('isoWeek');
  const weekEnd = weekStart.clone().endOf('isoWeek');

  // Fetch availability (includes all slots with status: vago, ocupado, bloqueado)
  const { data: availabilityData, isLoading, error } = useQuery({
    queryKey: ['availability', selectedUnidade, weekStart.format('YYYY-MM-DD')],
    queryFn: () => getAvailability(
      selectedUnidade,
      weekStart.format('YYYY-MM-DD'),
      weekEnd.format('YYYY-MM-DD')
    ),
    enabled: !!selectedUnidade,
  });

  // Loading state
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
        <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
          Carregando agendamentos...
        </Text>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert
        message="Erro ao carregar agendamentos"
        description={error.message || 'Erro desconhecido'}
        type="error"
        showIcon
        style={{ margin: '20px 0' }}
      />
    );
  }

  // Group days by date for easier lookup
  const daysByDate = {};
  if (availabilityData?.days) {
    availabilityData.days.forEach(day => {
      daysByDate[day.date] = day;
    });
  }

  return (
    <Row gutter={[16, 16]}>
      {Array.from({ length: 6 }, (_, i) => { // Only Monday-Saturday (6 days), no Sunday
        const day = weekStart.clone().add(i, 'days');
        const dateKey = day.format('YYYY-MM-DD');
        const isToday = day.isSame(moment(), 'day');
        const dayData = daysByDate[dateKey];

        // Map slots to UI format with complete data
        const slots = (dayData?.slots || []).map((slot, index) => {
          // Backend returns slot_start/slot_end as time only (HH:mm)
          // We need to combine with date to create full ISO datetime
          const slotStartTime = slot.slot_start; // "08:00"
          const slotEndTime = slot.slot_end;     // "08:40"

          // Create full ISO datetime strings (e.g., "2025-12-05T08:00:00")
          const fullSlotStart = `${dateKey}T${slotStartTime}:00`;
          const fullSlotEnd = `${dateKey}T${slotEndTime}:00`;

          const slotData = {
            id: `${slot.status}_${slot.id_booking || slot.id_slot || index}`,
            time: `${slotStartTime} - ${slotEndTime}`,
            slot_start: fullSlotStart,
            slot_end: fullSlotEnd,
            status: slot.status,
            date: dateKey,
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
            slotData.id_slot_block = slot.id_slot; // Backend uses id_slot for blocks
            slotData.reason = slot.reason || 'Horário bloqueado';
          }

          return slotData;
        });

        return (
          <Col key={dateKey} xs={24} sm={12} md={8} lg={3} style={{ minWidth: '160px' }}>
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

              {/* Slots (vago, ocupado, bloqueado) */}
              {slots.length > 0 ? (
                slots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    date={dateKey}
                    onSlotClick={(slot) => {
                      if (onSlotClick) {
                        // Pass slot with id_unidade, id_job_unidade and unidade data
                        onSlotClick({
                          ...slot,
                          id_unidade: selectedUnidade,
                          id_job_unidade: unidadeData?.id_job_unidade,
                          unidade: unidadeData,
                        }, dateKey);
                      }
                    }}
                  />
                ))
              ) : (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Sem horários configurados
                </Text>
              )}
            </div>
          </Col>
        );
      })}
    </Row>
  );
}
