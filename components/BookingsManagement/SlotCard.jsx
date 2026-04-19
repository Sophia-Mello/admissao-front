// components/BookingsManagement/SlotCard.jsx

import { Card, Tag, Space, Typography, Tooltip } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  UserOutlined,
  StopOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

/**
 * SlotCard Component
 *
 * Displays a single time slot with status.
 *
 * Status types:
 * - vago (available): Green, clickable to book
 * - ocupado (occupied): Blue, shows candidate initials, clickable to view/cancel
 * - bloqueado (blocked): Red, shows reason, clickable to unblock
 *
 * Props:
 * - slot: { id, time, status, candidateName?, reason? }
 * - date: ISO date string (e.g., "2025-11-12")
 * - onSlotClick: (slot) => void
 */
export default function SlotCard({ slot, date, onSlotClick }) {
  const { time, status, candidateName, reason, job_name } = slot;

  // Get candidate display name: "FirstName LastInitial"
  // Example: "João Silva Santos" → "João S."
  const getCandidateDisplayName = (name) => {
    if (!name) return '?';

    const words = name.trim().split(/\s+/); // Split by whitespace

    if (words.length === 1) {
      // Single name: just return it
      return words[0];
    }

    // Get first name (skip middle names/compound names)
    const firstName = words[0];

    // Get last surname (skip "de", "da", "dos", etc.)
    let lastName = words[words.length - 1];

    // Get first letter of last surname
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

  return (
    <Tooltip
      title={
        status === 'vago'
          ? 'Clique para agendar manualmente'
          : status === 'ocupado'
          ? `Clique para ver detalhes de ${candidateName}`
          : status === 'bloqueado'
          ? `Clique para desbloquear. Motivo: ${reason || 'Não informado'}`
          : ''
      }
    >
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
        onClick={() => onSlotClick && onSlotClick(slot)}
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
    </Tooltip>
  );
}
