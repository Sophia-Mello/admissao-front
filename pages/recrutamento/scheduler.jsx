/**
 * /recrutamento/scheduler page - Scheduler Management
 *
 * Admin page for managing test class schedules per unit.
 *
 * Features:
 * - Regional/unit selection filters
 * - Week navigation
 * - Weekly calendar view with slot status
 * - Manual booking creation
 * - Booking cancellation
 * - Slot blocking
 * - Centralized configuration modal (global + unit settings)
 * - Schedule even on blocked slots ("Agendar mesmo assim")
 */

import { useState } from 'react';
import { Row, Col, Card, Typography } from 'antd';
import Layout from '../../components/Layout';
import withRecrutamentoOrAdmin from '../../lib/withRecrutamentoOrAdmin';
import FiltersSection from '../../components/scheduler/FiltersSection';
import ActionsBar from '../../components/scheduler/ActionsBar';
import WeeklyCalendarAdmin from '../../components/scheduler/WeeklyCalendarAdmin';
import ConfiguracoesModal from '../../components/scheduler/ConfiguracoesModal';
import ModalAgendar from '../../components/scheduler/ModalAgendar';
import ModalOcupado from '../../components/scheduler/ModalOcupado';
import ModalBloqueado from '../../components/scheduler/ModalBloqueado';
import ModalBloquearSlot from '../../components/scheduler/ModalBloquearSlot';
import ModalDesbloquearSlot from '../../components/scheduler/ModalDesbloquearSlot';

const { Title, Text } = Typography;

function SchedulerPage() {
  // Filter state
  const [selectedRegional, setSelectedRegional] = useState(null);
  const [selectedUnidade, setSelectedUnidade] = useState(null);
  const [selectedUnidadeData, setSelectedUnidadeData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState(null); // { currentPage, totalPages, week_start, week_end }

  // Configuration modals state
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [blockSlotModalOpen, setBlockSlotModalOpen] = useState(false);
  const [unblockSlotModalOpen, setUnblockSlotModalOpen] = useState(false);

  // Slot interaction modals state
  const [activeModal, setActiveModal] = useState(null); // 'agendar' | 'ocupado' | 'bloqueado' | null
  const [modalData, setModalData] = useState(null);

  // Handlers - Filters
  const handleRegionalChange = (value) => {
    setSelectedRegional(value);
    setSelectedUnidade(null);
    setSelectedUnidadeData(null);
  };

  const handleUnidadeChange = (value, unidadeData) => {
    setSelectedUnidade(value);
    setSelectedUnidadeData(unidadeData);
    setCurrentPage(1); // Reset to first page when unit changes
    setPaginationInfo(null);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (paginationInfo && currentPage < paginationInfo.totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePaginationUpdate = (pagination) => {
    setPaginationInfo(pagination);
  };

  // State for slot-specific blocking
  const [blockSlotData, setBlockSlotData] = useState(null);

  // Handlers - Configuration Modals
  const handleOpenConfiguracoes = () => {
    setConfigModalOpen(true);
  };

  const handleBlockSlot = () => {
    if (!selectedUnidade) return;
    setBlockSlotData(null); // Reset slot-specific data
    setBlockSlotModalOpen(true);
  };

  const handleUnblockSlot = () => {
    if (!selectedUnidade) return;
    setUnblockSlotModalOpen(true);
  };

  // Handler - Block specific slot from Popover
  const handleBlockSlotClick = (slot, date) => {
    // Pre-fill the block modal with slot-specific data
    setBlockSlotData({
      date: date,
      start_at: slot.slot_start,
      end_at: slot.slot_end,
    });
    setBlockSlotModalOpen(true);
  };

  // Handler - Slot Click
  const handleSlotClick = (slot, date) => {
    if (slot.status === 'vago') {
      setActiveModal('agendar');
      setModalData({
        id_unidade: slot.id_unidade,
        id_job_unidade: slot.id_job_unidade,
        start_at: slot.slot_start,
        end_at: slot.slot_end,
        date: date,
        unidade: slot.unidade,
      });
    } else if (slot.status === 'ocupado') {
      setActiveModal('ocupado');
      setModalData({
        id_booking: slot.id_booking,
        start_at: slot.slot_start,
        end_at: slot.slot_end,
        date: date,
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
        end_at: slot.slot_end,
        date: date,
        reason: slot.reason,
        unidade: slot.unidade,
        is_fallback: slot.is_fallback,
        // Data for "Agendar mesmo assim" feature
        slotData: {
          id_unidade: slot.id_unidade,
          start_at: slot.slot_start,
          end_at: slot.slot_end,
          date: date,
          unidade: slot.unidade,
        },
      });
    }
  };

  // Handler - Close Modal
  const handleCloseModal = () => {
    setActiveModal(null);
    setModalData(null);
  };

  // Handler - Schedule Anyway (from blocked slot)
  const handleScheduleAnyway = () => {
    if (modalData?.slotData) {
      const slotData = modalData.slotData;
      setActiveModal('agendar');
      setModalData({
        id_unidade: slotData.id_unidade,
        start_at: slotData.start_at,
        end_at: slotData.end_at,
        date: slotData.date,
        unidade: slotData.unidade,
        isOverridingBlock: true, // Flag to indicate this is overriding a block
      });
    }
  };

  return (
    <Layout>
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2}>Scheduler</Title>
          <Text type="secondary">
            Gerencie agendamentos de aulas teste por unidade e semana
          </Text>
        </Col>
      </Row>

      {/* Filters Section */}
      <Card style={{ marginBottom: '16px' }}>
        <FiltersSection
          selectedRegional={selectedRegional}
          selectedUnidade={selectedUnidade}
          paginationInfo={paginationInfo}
          currentPage={currentPage}
          onRegionalChange={handleRegionalChange}
          onUnidadeChange={handleUnidadeChange}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
        />
      </Card>

      {/* Actions Bar */}
      <Card style={{ marginBottom: '16px' }}>
        <ActionsBar
          disabled={!selectedUnidade}
          onBlockSlot={handleBlockSlot}
          onUnblockSlot={handleUnblockSlot}
          onOpenConfiguracoes={handleOpenConfiguracoes}
        />
      </Card>

      {/* Weekly Calendar */}
      <Card>
        <WeeklyCalendarAdmin
          unidadeId={selectedUnidade}
          page={currentPage}
          unidadeData={selectedUnidadeData}
          onSlotClick={handleSlotClick}
          onBlockSlotClick={handleBlockSlotClick}
          onPaginationUpdate={handlePaginationUpdate}
        />
      </Card>

      {/* Configuration Modal (centralized) */}
      <ConfiguracoesModal
        open={configModalOpen}
        onCancel={() => setConfigModalOpen(false)}
        id_unidade={selectedUnidade}
      />

      {/* Block Slot Modal */}
      <ModalBloquearSlot
        open={blockSlotModalOpen}
        onCancel={() => {
          setBlockSlotModalOpen(false);
          setBlockSlotData(null);
        }}
        id_unidade={selectedUnidade}
        unidadeName={selectedUnidadeData?.nome_unidade || 'Unidade'}
        initialSlotData={blockSlotData}
      />

      {/* Unblock Slot Modal */}
      <ModalDesbloquearSlot
        open={unblockSlotModalOpen}
        onCancel={() => setUnblockSlotModalOpen(false)}
        id_unidade={selectedUnidade}
        unidadeName={selectedUnidadeData?.nome_unidade || 'Unidade'}
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
        onScheduleAnyway={handleScheduleAnyway}
      />
    </Layout>
  );
}

export default withRecrutamentoOrAdmin(SchedulerPage);
