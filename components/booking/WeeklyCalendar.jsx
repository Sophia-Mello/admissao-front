// components/booking/WeeklyCalendar.jsx

import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Button,
  Card,
  Result,
  Space,
  Spin,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import 'moment/locale/pt-br';
import * as bookingService from '../../lib/bookingService';
import { getErrorMessage } from '../../lib/errorHandler';
import SlotCardPublic from './SlotCardPublic';

moment.locale('pt-br');

const { Text } = Typography;

/**
 * WeeklyCalendar - Public calendar view showing available slots
 *
 * Displays a 5-day week grid (Mon-Fri) with available time slots.
 * Allows navigation between weeks and slot selection.
 *
 * Props:
 * - jobId: string - Gupy job ID
 * - applicationId: string - Gupy application ID
 * - unidade: object - Selected unit data
 *   - id_job_unidade: number
 *   - nome_unidade: string
 *   - endereco: string
 * - onSlotSelect: (slot) => void - Called when a slot is selected
 * - onBack: () => void - Called when back button is clicked
 * - error: string | null - Error message to display (e.g., conflict error)
 * - onClearError: () => void - Called to clear the error
 *
 * Usage:
 * <WeeklyCalendar
 *   jobId="123"
 *   applicationId="456"
 *   unidade={{ id_job_unidade: 1, nome_unidade: 'Escola A', endereco: '...' }}
 *   onSlotSelect={(slot) => console.log('Selected:', slot)}
 *   onBack={() => console.log('Back')}
 *   error={null}
 *   onClearError={() => {}}
 * />
 */
export default function WeeklyCalendar({
  jobId,
  applicationId,
  unidade,
  onSlotSelect,
  onBack,
  error,
  onClearError,
}) {
  // Loading state
  const [loading, setLoading] = useState(true);

  // Available slots (flat array)
  const [slotsData, setSlotsData] = useState([]);

  // Current week start (Monday) - from backend pagination
  const [currentWeekStart, setCurrentWeekStart] = useState(null);

  // Pagination state from backend
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load error
  const [loadError, setLoadError] = useState(null);

  /**
   * Load availability data for the selected unit
   * @param {number} page - Page number (1 page = 1 week from backend)
   * @param {boolean} isAutoAdvance - True if this is an automatic advance to next page
   */
  const loadAvailability = useCallback(async (page = 1, isAutoAdvance = false) => {
    setLoading(true);
    setLoadError(null);

    try {
      const result = await bookingService.getAvailability(
        jobId,
        applicationId,
        unidade.id_job_unidade,
        unidade.id_unidade,
        page
      );

      // Transform slots to have full datetime in slot_start/slot_end
      // Backend returns: { date: "2025-12-04", slot_start: "08:00", slot_end: "08:40" }
      // Frontend needs: { slot_start: "2025-12-04T08:00:00", slot_end: "2025-12-04T08:40:00" }
      let slotsArray = [];

      const transformSlot = (slot) => {
        // If slot already has full datetime, return as-is
        if (slot.slot_start && slot.slot_start.includes('T')) {
          return slot;
        }
        // Combine date + time into full ISO datetime
        const date = slot.date;
        return {
          ...slot,
          slot_start: `${date}T${slot.slot_start}:00`,
          slot_end: `${date}T${slot.slot_end}:00`,
        };
      };

      if (result.days && Array.isArray(result.days)) {
        // Backend returns: { days: [{ date, slots: [...] }] }
        slotsArray = result.days.flatMap((day) =>
          (day.slots || [])
            .filter((slot) => {
              const isOccupied = slot.occupied === true || slot.status === 'ocupado';
              return !isOccupied;
            })
            .map(transformSlot)
        );
      } else if (result.slots && Array.isArray(result.slots)) {
        // Current structure: { slots: [{ date, slot_start, slot_end }] }
        slotsArray = result.slots
          .filter((slot) => {
            const isOccupied = slot.occupied === true || slot.status === 'ocupado';
            return !isOccupied;
          })
          .map(transformSlot);
      }

      // Get pagination info
      const paginationCurrentPage = result.pagination?.currentPage || page;
      const paginationTotalPages = result.pagination?.totalPages || 1;

      // AUTO-ADVANCE: If slots are empty but there are more pages, fetch next page
      // This handles the case where d_rules block current week but next week has slots
      if (slotsArray.length === 0 && paginationCurrentPage < paginationTotalPages) {
        console.log(`[WeeklyCalendar] Página ${paginationCurrentPage} sem slots, avançando para página ${paginationCurrentPage + 1}`);
        // Recursive call to fetch next page
        return loadAvailability(paginationCurrentPage + 1, true);
      }

      setSlotsData(slotsArray);

      // Store pagination from backend
      if (result.pagination) {
        setCurrentPage(result.pagination.currentPage || 1);
        setTotalPages(result.pagination.totalPages || 1);
        // Use week_start from backend pagination
        if (result.pagination.week_start) {
          setCurrentWeekStart(moment(result.pagination.week_start).startOf('isoWeek'));
        }
      } else {
        // Fallback: calculate from slots
        let weekStart;
        if (slotsArray.length > 0) {
          const firstSlotDate = moment(slotsArray[0].slot_start);
          weekStart = firstSlotDate.clone().startOf('isoWeek');
        } else {
          const tomorrow = moment().add(1, 'day');
          weekStart = tomorrow.clone().startOf('isoWeek');
        }
        setCurrentWeekStart(weekStart);
      }
    } catch (err) {
      setLoadError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [jobId, applicationId, unidade.id_job_unidade, unidade.id_unidade]);

  // Load availability on mount
  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  /**
   * Group slots by date for calendar view
   */
  const getWeekSlots = useCallback(() => {
    if (!slotsData || !currentWeekStart) {
      return {};
    }

    const weekEnd = moment(currentWeekStart).add(6, 'days').endOf('day');
    const grouped = {};

    slotsData.forEach((slot) => {
      const slotDate = moment(slot.slot_start);
      const isInRange = slotDate.isBetween(currentWeekStart, weekEnd, null, '[]');

      if (isInRange) {
        const dateKey = slotDate.format('YYYY-MM-DD');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(slot);
      }
    });

    return grouped;
  }, [slotsData, currentWeekStart]);

  /**
   * Check if there's a next page (week) available
   */
  const hasNextPage = useCallback(() => {
    return currentPage < totalPages;
  }, [currentPage, totalPages]);

  /**
   * Check if can navigate to previous page (week)
   */
  const hasPreviousPage = useCallback(() => {
    return currentPage > 1;
  }, [currentPage]);

  /**
   * Navigate to previous week (page)
   */
  const handlePreviousWeek = useCallback(() => {
    if (hasPreviousPage()) {
      loadAvailability(currentPage - 1);
    }
  }, [currentPage, hasPreviousPage, loadAvailability]);

  /**
   * Navigate to next week (page)
   */
  const handleNextWeek = useCallback(() => {
    if (hasNextPage()) {
      loadAvailability(currentPage + 1);
    }
  }, [currentPage, hasNextPage, loadAvailability]);

  /**
   * Format time from ISO string
   */
  const formatTime = (timeStr) => {
    return moment(timeStr).format('HH:mm');
  };

  // Get weekly slots for display
  const weekSlots = getWeekSlots();

  // Show loading state
  if (loading) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '40px 0',
          animation: 'fadeIn 0.3s ease-in',
        }}
      >
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Carregando horarios disponiveis...</p>
      </div>
    );
  }

  // Show load error
  if (loadError) {
    return (
      <Result
        status="error"
        title="Erro ao carregar horarios"
        subTitle={loadError}
        extra={
          <Space>
            <Button onClick={onBack}>Voltar</Button>
            <Button type="primary" onClick={loadAvailability}>
              Tentar novamente
            </Button>
          </Space>
        }
        style={{ padding: '40px 0' }}
      />
    );
  }

  return (
    <>
      {/* Back button */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={onBack}
        style={{ marginBottom: 16 }}
      >
        Voltar para unidades
      </Button>

      {/* Unit header */}
      <Alert
        type="info"
        showIcon
        message={unidade.nome_unidade}
        description={unidade.endereco}
        style={{ marginBottom: 24 }}
      />

      {/* Error message (e.g., slot conflict) */}
      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          closable
          onClose={onClearError}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* No slots available */}
      {slotsData.length === 0 && (
        <Result
          status="warning"
          title="Sem horarios disponiveis"
          subTitle="Esta unidade nao possui horarios disponiveis no momento. Tente outra unidade."
          style={{ padding: '40px 0' }}
        />
      )}

      {/* Weekly calendar navigation and grid */}
      {slotsData.length > 0 && currentWeekStart && (
        <>
          {/* Week navigation */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
              padding: '16px',
              background: '#fafafa',
              borderRadius: '8px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <Button
              icon={<LeftOutlined />}
              onClick={handlePreviousWeek}
              disabled={!hasPreviousPage() || loading}
            >
              <span className="hide-mobile">Anterior</span>
            </Button>

            <Text strong style={{ fontSize: 16, textAlign: 'center' }}>
              <CalendarOutlined /> Semana: {currentWeekStart.format('DD/MM')} -{' '}
              {moment(currentWeekStart).add(6, 'days').format('DD/MM')}
              {totalPages > 1 && (
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                  ({currentPage}/{totalPages})
                </Text>
              )}
            </Text>

            <Button
              onClick={handleNextWeek}
              disabled={!hasNextPage() || loading}
            >
              <span className="hide-mobile">Proxima</span>
              <RightOutlined />
            </Button>
          </div>

          {/* Weekly calendar grid - 5 days (Mon-Fri) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            {[0, 1, 2, 3, 4].map((dayOffset) => {
              const currentDay = moment(currentWeekStart).add(dayOffset, 'days');
              const dateKey = currentDay.format('YYYY-MM-DD');
              const daySlots = weekSlots[dateKey] || [];
              const isToday = currentDay.isSame(moment(), 'day');
              const isPast = currentDay.isBefore(moment(), 'day');

              return (
                <Card
                  key={dayOffset}
                  size="small"
                  style={{
                    background: isToday ? '#e6f7ff' : isPast ? '#f5f5f5' : '#fff',
                    opacity: isPast ? 0.6 : 1,
                  }}
                >
                  {/* Day header */}
                  <Text
                    strong
                    style={{
                      display: 'block',
                      marginBottom: 12,
                      textAlign: 'center',
                      fontSize: 14,
                    }}
                  >
                    {currentDay.format('ddd')}
                    <br />
                    {currentDay.format('DD/MM')}
                  </Text>

                  {/* Slots list */}
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {daySlots.length === 0 && (
                      <Text
                        type="secondary"
                        style={{
                          fontSize: 12,
                          display: 'block',
                          textAlign: 'center',
                        }}
                      >
                        -
                      </Text>
                    )}
                    {daySlots.map((slot, idx) => (
                      <SlotCardPublic
                        key={`${slot.slot_start}-${idx}`}
                        time={formatTime(slot.slot_start)}
                        onClick={() => onSlotSelect(slot)}
                      />
                    ))}
                  </Space>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Responsive styles */}
      <style jsx global>{`
        @media (max-width: 480px) {
          .hide-mobile {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
