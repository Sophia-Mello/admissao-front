/**
 * SlotCard Component
 *
 * Displays a single time slot with status.
 *
 * Status types:
 * - vago (available): Green, shows Popover with options (Agendar | Bloquear)
 * - ocupado (occupied): Blue, shows candidate name, clickable to view/cancel
 * - bloqueado (blocked): Red, shows reason, clickable to unblock/schedule anyway
 *
 * Props:
 * - slot: { id, time, status, candidateName?, reason?, job_name?, ... }
 * - date: ISO date string (e.g., "2025-11-12")
 * - onClick: () => void - Called to open scheduling modal
 * - onBlockSlot: () => void - Called to block this specific slot
 */

import { useState } from 'react';
import { Card, Tag, Space, Typography, Tooltip, Popover, Button } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  UserOutlined,
  StopOutlined,
  CalendarOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

export default function SlotCard({ slot, date, onClick, onBlockSlot }) {
  const { time, status, candidateName, reason, job_name } = slot;
  const [popoverOpen, setPopoverOpen] = useState(false);

  /**
   * Get candidate display name: "FirstName LastInitial"
   * Example: "Joao Silva Santos" -> "Joao S."
   */
  const getCandidateDisplayName = (name) => {
    if (!name) return '?';

    const words = name.trim().split(/\s+/);

    if (words.length === 1) {
      return words[0];
    }

    const firstName = words[0];
    const lastName = words[words.length - 1];
    const lastInitial = lastName.charAt(0).toUpperCase() + '.';

    return `${firstName} ${lastInitial}`;
  };

  // Status configuration
  const statusConfig = {
    vago: {
      color: '#52c41a',
      bgColor: '#f6ffed',
      borderColor: '#b7eb8f',
      icon: <CheckCircleOutlined />,
      label: 'Vago',
      cursorStyle: 'pointer',
    },
    ocupado: {
      color: '#1890ff',
      bgColor: '#e6f7ff',
      borderColor: '#91d5ff',
      icon: <UserOutlined />,
      label: 'Ocupado',
      cursorStyle: 'pointer',
    },
    bloqueado: {
      color: '#ff4d4f',
      bgColor: '#fff1f0',
      borderColor: '#ffa39e',
      icon: <StopOutlined />,
      label: 'Bloqueado',
      cursorStyle: 'pointer',
    },
  };

  const config = statusConfig[status] || statusConfig.vago;

  // Handle schedule action from popover
  const handleSchedule = () => {
    setPopoverOpen(false);
    onClick?.();
  };

  // Handle block action from popover
  const handleBlock = () => {
    setPopoverOpen(false);
    onBlockSlot?.();
  };

  // Popover content for empty slots
  const vagosPopoverContent = (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Text type="secondary" style={{ fontSize: '12px' }}>
        O que deseja fazer?
      </Text>
      <Button
        type="primary"
        icon={<CalendarOutlined />}
        onClick={handleSchedule}
        block
        size="small"
      >
        Agendar Candidato
      </Button>
      <Button
        danger
        icon={<StopOutlined />}
        onClick={handleBlock}
        block
        size="small"
      >
        Bloquear Horario
      </Button>
    </Space>
  );

  // Tooltip content (used for non-vago slots)
  const getTooltipContent = () => {
    switch (status) {
      case 'vago':
        return 'Clique para ver opcoes';
      case 'ocupado':
        return `Clique para ver detalhes de ${candidateName || 'candidato'}`;
      case 'bloqueado':
        return `Clique para ver opcoes. Motivo: ${reason || 'Nao informado'}`;
      default:
        return '';
    }
  };

  // Card component (shared between popover and direct click)
  const cardContent = (
    <Card
      size="small"
      style={{
        marginBottom: '8px',
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
        cursor: config.cursorStyle,
        transition: 'all 0.3s',
      }}
      bodyStyle={{ padding: '8px' }}
      onClick={status !== 'vago' ? onClick : undefined}
      hoverable
    >
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        {/* Time */}
        <Space size={4}>
          <ClockCircleOutlined style={{ color: config.color, fontSize: '12px' }} />
          <Text strong style={{ fontSize: '12px', color: config.color }}>
            {time}
          </Text>
        </Space>

        {/* Status badge */}
        <Tag
          color={config.color}
          icon={config.icon}
          style={{ marginRight: 0, fontSize: '11px' }}
        >
          {config.label}
        </Tag>

        {/* Candidate info (if occupied) */}
        {status === 'ocupado' && candidateName && (
          <>
            <div
              style={{
                backgroundColor: config.color,
                color: 'white',
                borderRadius: '4px',
                padding: '4px 8px',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
              }}
            >
              {getCandidateDisplayName(candidateName)}
            </div>
            {job_name && (
              <Text
                type="secondary"
                style={{
                  fontSize: '10px',
                  lineHeight: '1.2',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={job_name}
              >
                {job_name}
              </Text>
            )}
          </>
        )}

        {/* Block reason (if blocked) */}
        {status === 'bloqueado' && reason && (
          <Text
            type="secondary"
            style={{
              fontSize: '10px',
              lineHeight: '1.2',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {reason}
          </Text>
        )}
      </Space>
    </Card>
  );

  // For empty slots, wrap in Popover with options
  if (status === 'vago') {
    return (
      <Popover
        content={vagosPopoverContent}
        title="Horario Vago"
        trigger="click"
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        placement="right"
      >
        <div>{cardContent}</div>
      </Popover>
    );
  }

  // For other statuses, wrap in Tooltip
  return (
    <Tooltip title={getTooltipContent()}>
      {cardContent}
    </Tooltip>
  );
}
