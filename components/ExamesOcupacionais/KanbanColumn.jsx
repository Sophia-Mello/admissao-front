import { useRef, useEffect } from 'react';
import { Badge, Typography, Empty, Spin } from 'antd';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import CandidateCard from './CandidateCard';

const { Title } = Typography;

/**
 * Kanban column (droppable area)
 *
 * @param {Object} props
 * @param {string} props.id - Column ID (status key)
 * @param {string} props.title - Column title
 * @param {string} props.color - Header color
 * @param {Array} props.candidatos - Candidates in this column
 * @param {string} [props.activeId] - ID of currently dragged item
 * @param {number} [props.totalCount] - Total count from summary (for filtered view)
 * @param {Function} [props.onLoadMore] - Called to load more candidates
 * @param {boolean} [props.hasMore] - Whether there are more candidates to load
 * @param {boolean} [props.isLoadingMore] - Whether more candidates are being loaded
 * @param {boolean} [props.isLoading] - Whether initial data is being loaded
 */
export default function KanbanColumn({
  id,
  title,
  color,
  candidatos,
  activeId,
  totalCount,
  onLoadMore,
  hasMore,
  isLoadingMore,
  isLoading,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  // Ref for the scroll container
  const scrollContainerRef = useRef(null);
  // Ref for the load more trigger element
  const loadMoreTriggerRef = useRef(null);

  // Refs to track loading state without recreating observer
  const isLoadingMoreRef = useRef(isLoadingMore);
  const hasMoreRef = useRef(hasMore);

  // Keep refs in sync with props
  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
    hasMoreRef.current = hasMore;
  }, [isLoadingMore, hasMore]);

  // Track if trigger element should exist (candidatos loaded)
  const hasCandidatos = candidatos.length > 0;

  // IntersectionObserver to detect when user scrolls near the bottom
  useEffect(() => {
    // Don't set up observer if no candidates (trigger element doesn't exist)
    if (!hasCandidatos) return;

    const scrollContainer = scrollContainerRef.current;
    const loadMoreTrigger = loadMoreTriggerRef.current;

    if (!scrollContainer || !loadMoreTrigger || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // Check refs instead of closure values to avoid stale state
        if (entry.isIntersecting && hasMoreRef.current && !isLoadingMoreRef.current) {
          onLoadMore();
        }
      },
      {
        root: scrollContainer,
        rootMargin: '100px', // Trigger 100px before reaching the bottom
        threshold: 0,
      }
    );

    observer.observe(loadMoreTrigger);

    return () => {
      observer.disconnect();
    };
  }, [onLoadMore, hasCandidatos]); // Recreate when candidates exist or onLoadMore changes

  const columnStyle = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minWidth: 220,
    maxWidth: 280,
    backgroundColor: isOver ? '#f6ffed' : '#fafafa',
    borderRadius: 8,
    border: isOver ? '2px dashed #52c41a' : '1px solid #f0f0f0',
    transition: 'background-color 0.2s, border-color 0.2s',
  };

  const headerStyle = {
    padding: '12px 16px',
    backgroundColor: color,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const contentStyle = {
    padding: '8px 12px',
    flex: 1,
    minHeight: 200,
    maxHeight: 'calc(100vh - 350px)',
    overflowY: 'auto',
  };

  const candidatoIds = candidatos.map((c) => c.id_candidato);

  return (
    <div style={columnStyle}>
      <div style={headerStyle}>
        <Title
          level={5}
          style={{ margin: 0, color: '#fff', fontSize: '14px' }}
        >
          {title}
        </Title>
        <Badge
          count={totalCount !== undefined ? totalCount : candidatos.length}
          showZero
          style={{
            backgroundColor: '#fff',
            color: color,
            fontWeight: 'bold',
          }}
        />
      </div>

      <div
        ref={(node) => {
          setNodeRef(node);
          scrollContainerRef.current = node;
        }}
        style={contentStyle}
      >
        <SortableContext items={candidatoIds} strategy={verticalListSortingStrategy}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin />
            </div>
          ) : candidatos.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Nenhum candidato"
              style={{ margin: '40px 0' }}
            />
          ) : (
            candidatos.map((candidato) => (
              <CandidateCard
                key={candidato.id_candidato}
                candidato={candidato}
                isDragging={activeId === candidato.id_candidato}
              />
            ))
          )}
        </SortableContext>

        {/* Infinite scroll trigger and loading indicator */}
        {candidatos.length > 0 && (
          <div
            ref={loadMoreTriggerRef}
            style={{
              padding: '16px 0',
              textAlign: 'center',
              minHeight: 40,
            }}
          >
            {isLoadingMore && (
              <Spin size="small" tip="Carregando..." />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
