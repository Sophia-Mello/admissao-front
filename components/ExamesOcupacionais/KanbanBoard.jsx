import { useState } from 'react';
import { message } from 'antd';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import KanbanColumn from './KanbanColumn';
import CandidateCard from './CandidateCard';
import ScheduleModal from './ScheduleModal';
import {
  KANBAN_STATUSES,
  useCandidatosByStatus,
} from '../../hooks/useExamesOcupacionais';

/**
 * Wrapper component for a single Kanban column with its own query
 * This pattern allows us to use hooks properly (one per component instance)
 */
function KanbanColumnWithQuery({
  status,
  filters,
  activeId,
  totalCount,
}) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useCandidatosByStatus(status.key, filters);

  const candidatos = data?.pages?.flatMap((p) => p.candidatos) || [];

  return (
    <KanbanColumn
      id={status.key}
      title={status.label}
      color={status.color}
      candidatos={candidatos}
      activeId={activeId}
      totalCount={totalCount}
      onLoadMore={fetchNextPage}
      hasMore={hasNextPage}
      isLoadingMore={isFetchingNextPage}
      isLoading={isLoading}
    />
  );
}

/**
 * Main Kanban board with drag-and-drop functionality
 * Uses per-column infinite scroll queries for efficient pagination
 *
 * @param {Object} props
 * @param {Object} props.filters - Filters to apply to all columns (search, cargo, empresa)
 * @param {Function} props.onStatusChange - Called when status changes: (id, newStatus, extraData) => Promise
 * @param {Object} [props.statusCounts] - Counts per status from summary.detalhado (for correct totals)
 */
export default function KanbanBoard({ filters, onStatusChange, statusCounts = {} }) {
  const [activeId, setActiveId] = useState(null);
  const [activeCandidato, setActiveCandidato] = useState(null);
  const [pendingDrop, setPendingDrop] = useState(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    // Store the candidato data from the drag event
    // useSortable passes data directly as current
    if (active.data?.current) {
      setActiveCandidato(active.data.current);
    }
  };

  const handleDragEnd = async (event) => {
    const { over } = event;
    const candidato = activeCandidato;

    setActiveId(null);
    setActiveCandidato(null);

    if (!over || !candidato) return;

    const newStatus = over.id;
    const oldStatus = candidato.status;

    // No change
    if (newStatus === oldStatus) return;

    // If moving to 'agendado', show schedule modal
    if (newStatus === 'agendado') {
      setPendingDrop({ candidato, newStatus });
      setScheduleModalOpen(true);
      return;
    }

    // Direct status change for other statuses
    await handleStatusUpdate(candidato.id_candidato, newStatus);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveCandidato(null);
  };

  const handleStatusUpdate = async (id, newStatus, extraData = {}) => {
    setUpdating(true);
    try {
      await onStatusChange(id, newStatus, extraData);
      message.success('Status atualizado com sucesso');
    } catch (error) {
      console.error('Error updating status:', error);
      message.error(error.response?.data?.error || 'Erro ao atualizar status');
    } finally {
      setUpdating(false);
    }
  };

  const handleScheduleConfirm = async (data) => {
    if (!pendingDrop) return;

    setUpdating(true);
    try {
      await onStatusChange(pendingDrop.candidato.id_candidato, 'agendado', data);
      message.success('Exame agendado com sucesso');
      setScheduleModalOpen(false);
      setPendingDrop(null);
    } catch (error) {
      console.error('Error scheduling:', error);
      message.error(error.response?.data?.error || 'Erro ao agendar exame');
    } finally {
      setUpdating(false);
    }
  };

  const handleScheduleCancel = () => {
    setScheduleModalOpen(false);
    setPendingDrop(null);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            padding: '8px 0',
            minHeight: 400,
          }}
        >
          {KANBAN_STATUSES.map((status) => (
            <KanbanColumnWithQuery
              key={status.key}
              status={status}
              filters={filters}
              activeId={activeId}
              totalCount={statusCounts[status.key]}
            />
          ))}
        </div>

        {/* Drag overlay for smooth dragging */}
        <DragOverlay>
          {activeCandidato ? (
            <div style={{ width: 250 }}>
              <CandidateCard candidato={activeCandidato} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Schedule modal */}
      <ScheduleModal
        open={scheduleModalOpen}
        candidato={pendingDrop?.candidato}
        loading={updating}
        onConfirm={handleScheduleConfirm}
        onCancel={handleScheduleCancel}
      />
    </>
  );
}
