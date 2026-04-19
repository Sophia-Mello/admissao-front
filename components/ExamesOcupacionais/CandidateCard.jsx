import { Card, Tag, Typography, Space, Tooltip } from 'antd';
import {
  UserOutlined,
  IdcardOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  HeartOutlined,
  ClockCircleOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import moment from 'moment';
import 'moment/locale/pt-br';
import { getEmpresaLabel, getEmpresaColor } from '../../hooks/useExamesOcupacionais';

moment.locale('pt-br');

const { Text, Paragraph } = Typography;

/**
 * Get color for SLA badge based on days in status
 * - ≤ 1 day: green (success)
 * - 2-3 days: yellow (warning)
 * - > 3 days: red (error)
 */
function getSlaColor(dias) {
  if (dias === null || dias === undefined) return 'default';
  if (dias <= 1) return 'success';
  if (dias <= 3) return 'warning';
  return 'error';
}

/**
 * Format SLA text for display
 */
function formatSlaText(dias) {
  if (dias === null || dias === undefined) return '';
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'há 1 dia';
  return `há ${dias} dias`;
}

/**
 * Format CPF for display (XXX.XXX.XXX-XX)
 */
function formatCPF(cpf) {
  if (!cpf || cpf.length !== 11) return cpf;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

/**
 * Format phone number for display
 */
function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Draggable candidate card for Kanban board
 *
 * @param {Object} props
 * @param {Object} props.candidato - Candidate data
 * @param {boolean} [props.isDragging] - Whether card is being dragged
 */
export default function CandidateCard({ candidato, isDragging }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: candidato.id_candidato,
    data: candidato,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  const cardStyle = {
    marginBottom: 8,
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card size="small" style={cardStyle} bodyStyle={{ padding: '12px' }}>
        {/* Nome + SLA Badge */}
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <UserOutlined style={{ color: '#1890ff' }} />
            <Text strong style={{ fontSize: '14px' }}>{candidato.nome}</Text>
          </Space>
          {candidato.dias_no_status !== undefined && candidato.dias_no_status !== null && (
            <Tooltip title={`Tempo no status atual: ${formatSlaText(candidato.dias_no_status)}`}>
              <Tag
                color={getSlaColor(candidato.dias_no_status)}
                style={{ marginRight: 0, fontSize: '10px' }}
                icon={<ClockCircleOutlined />}
              >
                {formatSlaText(candidato.dias_no_status)}
              </Tag>
            </Tooltip>
          )}
        </div>

        {/* CPF */}
        <div style={{ marginBottom: 4 }}>
          <Space size={4}>
            <IdcardOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {formatCPF(candidato.cpf)}
            </Text>
          </Space>
        </div>

        {/* Cargo */}
        {candidato.cargo && (
          <div style={{ marginBottom: 4 }}>
            <Text style={{ fontSize: '12px' }}>{candidato.cargo}</Text>
          </div>
        )}

        {/* Empresa + PCD tags */}
        <Space size={4} style={{ marginBottom: 8 }}>
          {candidato.empresa && (
            <Tag
              icon={<BankOutlined />}
              color={getEmpresaColor(candidato.empresa)}
              style={{ fontSize: '11px' }}
            >
              {getEmpresaLabel(candidato.empresa)}
            </Tag>
          )}
          {candidato.pcd && (
            <Tag color="purple">
              <HeartOutlined /> PCD
            </Tag>
          )}
        </Space>

        {/* Divider visual */}
        <div style={{ borderTop: '1px dashed #f0f0f0', margin: '8px 0' }} />

        {/* Telefone */}
        {candidato.telefone && (
          <div style={{ marginBottom: 4 }}>
            <Space size={4}>
              <PhoneOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {formatPhone(candidato.telefone)}
              </Text>
            </Space>
          </div>
        )}

        {/* Email */}
        {candidato.email && (
          <Tooltip title={candidato.email}>
            <div style={{ marginBottom: 4 }}>
              <Space size={4}>
                <MailOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
                <Text
                  type="secondary"
                  style={{ fontSize: '12px', maxWidth: '150px' }}
                  ellipsis
                >
                  {candidato.email}
                </Text>
              </Space>
            </div>
          </Tooltip>
        )}

        {/* Endereco */}
        {candidato.endereco && (
          <Tooltip title={candidato.endereco}>
            <div style={{ marginBottom: 4 }}>
              <Space size={4} align="start">
                <EnvironmentOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
                <Paragraph
                  type="secondary"
                  style={{ fontSize: '11px', margin: 0, maxWidth: '150px' }}
                  ellipsis={{ rows: 2 }}
                >
                  {candidato.endereco}
                </Paragraph>
              </Space>
            </div>
          </Tooltip>
        )}

        {/* Agendamento (only if status = agendado) */}
        {candidato.status === 'agendado' && candidato.agendado_para && (
          <>
            <div style={{ borderTop: '1px dashed #f0f0f0', margin: '8px 0' }} />
            <div>
              <Space size={4}>
                <CalendarOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
                <Text style={{ fontSize: '12px', color: '#1890ff' }}>
                  {moment(candidato.agendado_para).format('DD/MM [às] HH:mm')}
                </Text>
              </Space>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
