// components/BookingsManagement/index.jsx

import { useState } from 'react';
import { Row, Col, Card, Typography, Space } from 'antd';
import FiltersSection from './FiltersSection';
import ActionsBar from './ActionsBar';
import WeeklyCalendar from './WeeklyCalendar';
import DRuleEditor from './DRuleEditor';
import TimeRangeEditor from './TimeRangeEditor';
import ModalAgendar from './ModalAgendar';
import ModalOcupado from './ModalOcupado';
import ModalBloqueado from './ModalBloqueado';
import ModalBloquearSlot from './ModalBloquearSlot';
import ErrorBoundary from './ErrorBoundary';

const { Title, Text } = Typography;

/**
 * BookingsManagementInner Component
 *
 * Admin dashboard for managing test class bookings.
 *
 * Features:
 * - Regional and Unit filters
 * - Week navigation
 * - Weekly calendar view with slot status
 * - Manual booking creation
 * - Booking cancellation
 * - Slot blocking
 * - d_rule and time slots configuration
 */
function BookingsManagementInner() {
  // Filter state
  const [selectedRegional, setSelectedRegional] = useState(null);
  const [selectedUnidade, setSelectedUnidade] = useState(null);
  const [selectedUnidadeData, setSelectedUnidadeData] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date()); // Start of week

  // Modal state - Configuration modals
  const [dRuleModalOpen, setDRuleModalOpen] = useState(false);
  const [timeRangeModalOpen, setTimeRangeModalOpen] = useState(false);
  const [blockSlotModalOpen, setBlockSlotModalOpen] = useState(false);

  // Modal state - Slot interaction modals
  const [activeModal, setActiveModal] = useState(null); // 'agendar' | 'ocupado' | 'bloqueado' | null
  const [modalData, setModalData] = useState(null);

  // Handlers
  const handleRegionalChange = (value) => {
    setSelectedRegional(value);
    setSelectedUnidade(null); // Reset unit when regional changes
  };

  const handleUnidadeChange = (value, option) => {
    setSelectedUnidade(value);
    // Store full unit data from Select option
    setSelectedUnidadeData(option?.unidade || null);
  };

  const handleWeekChange = (date) => {
    setSelectedWeek(date);
  };

  const handleManageRules = () => {
    if (!selectedUnidade) {
      return; // Disabled if no unit selected
    }
    setDRuleModalOpen(true);
  };

  const handleManageTimeSlots = () => {
    if (!selectedUnidade) {
      return; // Disabled if no unit selected
    }
    setTimeRangeModalOpen(true);
  };

  const handleBlockSlot = () => {
    if (!selectedUnidade) {
      return; // Disabled if no unit selected
    }
    setBlockSlotModalOpen(true);
  };

  // Handle slot click from WeeklyCalendar
  const handleSlotClick = (slot, date) => {
    if (slot.status === 'vago') {
      setActiveModal('agendar');
      setModalData({
        id_unidade: slot.id_unidade,
        id_job_unidade: slot.id_job_unidade,
        start_at: slot.slot_start,
        end_at: slot.slot_end,
        unidade: slot.unidade,
      });
    } else if (slot.status === 'ocupado') {
      setActiveModal('ocupado');
      setModalData({
        id_booking: slot.id_booking,
        start_at: slot.slot_start,
        end_at: slot.slot_end,
        candidate: {
          name: slot.candidateName,
          email: slot.candidateEmail,
          cpf: slot.candidateCpf,
          phone: slot.candidatePhone,
        },
        unidade: slot.unidade,
        job_name: slot.job_name,
        calendar_event_ids: slot.calendar_event_ids,
        rubrica_url: slot.rubrica_url,
        status: slot.booking_status,
      });
    } else if (slot.status === 'bloqueado') {
      setActiveModal('bloqueado');
      setModalData({
        id_slot_block: slot.id_slot_block,
        start_at: slot.slot_start,
        reason: slot.reason,
        unidade: slot.unidade,
      });
    }
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setModalData(null);
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2}>Agendamentos</Title>
          <Text type="secondary">
            Gerencie agendamentos de aulas teste por unidade e semana
          </Text>
        </Col>
      </Row>

      <Card style={{ marginBottom: '16px' }}>
        <FiltersSection
          selectedRegional={selectedRegional}
          selectedUnidade={selectedUnidade}
          selectedWeek={selectedWeek}
          onRegionalChange={handleRegionalChange}
          onUnidadeChange={handleUnidadeChange}
          onWeekChange={handleWeekChange}
        />
      </Card>

      <Card style={{ marginBottom: '16px' }}>
        <ActionsBar
          selectedUnidade={selectedUnidade}
          onManageRules={handleManageRules}
          onManageTimeSlots={handleManageTimeSlots}
          onBlockSlot={handleBlockSlot}
        />
      </Card>

      <Card>
        <WeeklyCalendar
          selectedUnidade={selectedUnidade}
          selectedWeek={selectedWeek}
          unidadeData={selectedUnidadeData}
          onSlotClick={handleSlotClick}
        />
      </Card>

      {/* Configuration Modals */}
      <DRuleEditor
        open={dRuleModalOpen}
        onCancel={() => setDRuleModalOpen(false)}
        id_unidade={selectedUnidade}
      />
      <TimeRangeEditor
        open={timeRangeModalOpen}
        onCancel={() => setTimeRangeModalOpen(false)}
        id_unidade={selectedUnidade}
      />
      <ModalBloquearSlot
        open={blockSlotModalOpen}
        onCancel={() => setBlockSlotModalOpen(false)}
        id_unidade={selectedUnidade}
        id_job_unidade={selectedUnidadeData?.id_job_unidade}
        unidadeName={selectedUnidadeData?.nome_unidade || 'Unidade não disponível'}
      />

      {/* Slot Interaction Modals */}
      <ModalAgendar
        open={activeModal === 'agendar'}
        onCancel={handleCloseModal}
        slotData={modalData}
      />
      <ModalOcupado
        open={activeModal === 'ocupado'}
        onCancel={handleCloseModal}
        bookingData={modalData}
      />
      <ModalBloqueado
        open={activeModal === 'bloqueado'}
        onCancel={handleCloseModal}
        blockData={modalData}
      />
    </div>
  );
}

export default function BookingsManagement() {
  return (
    <ErrorBoundary>
      <BookingsManagementInner />
    </ErrorBoundary>
  );
}
