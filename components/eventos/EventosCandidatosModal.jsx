/**
 * EventosCandidatosModal.jsx - Candidates in a Room
 *
 * Shows all candidates inscribed in a specific room.
 * Allows:
 * - View candidate details (name, CPF, email, phone)
 * - View job name
 * - Cancel inscription
 * - Register occurrence (ocorrência) for any candidate, even after the event
 */

import { useState } from 'react';
import {
  Modal,
  Table,
  Typography,
  Space,
  Tag,
  Button,
  Spin,
  Empty,
  Popconfirm,
  message,
  Tooltip,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
  SolutionOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useRoomCandidates, useCancelEventApplication } from '../../hooks/useEventos';
import OcorrenciaModal from '../fiscalizacao/OcorrenciaModal';

const { Text, Title } = Typography;

const STATUS_COLORS = {
  agendado: 'blue',
  compareceu: 'green',
  faltou: 'red',
  cancelado: 'default',
};

const STATUS_LABELS = {
  agendado: 'Agendado',
  compareceu: 'Compareceu',
  faltou: 'Faltou',
  cancelado: 'Cancelado',
};

export default function EventosCandidatosModal({
  open,
  onCancel,
  roomId,
  roomNumber,
  onRefresh,
}) {
  const [selectedCandidateForOcorrencia, setSelectedCandidateForOcorrencia] = useState(null);

  const { room, candidates, isLoading, refetch } = useRoomCandidates(roomId, open);
  const cancelMutation = useCancelEventApplication();

  const handleCancel = async (id) => {
    try {
      await cancelMutation.mutateAsync(id);
    } catch {
      // Mutation error handled by useCancelEventApplication hook (shows message.error)
      return;
    }

    // Mutation succeeded - refresh data (best-effort, non-blocking)
    refetch().catch(() => {
      message.warning('A lista pode estar desatualizada. Atualize a página se necessário.');
    });

    try {
      onRefresh?.();
    } catch (refreshError) {
      console.error('[EventosCandidatosModal] onRefresh callback failed:', refreshError);
    }
  };

  const columns = [
    {
      title: 'Candidato',
      key: 'candidate',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            <UserOutlined /> {record.nome || 'Nome não informado'}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <IdcardOutlined /> {record.cpf ? formatCPF(record.cpf) : 'CPF não informado'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Contato',
      key: 'contact',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.email && (
            <Text style={{ fontSize: 12 }}>
              <MailOutlined /> {record.email}
            </Text>
          )}
          {record.telefone && (
            <Text style={{ fontSize: 12 }}>
              <PhoneOutlined /> {record.telefone}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Vaga',
      dataIndex: 'job_name',
      key: 'job',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Text style={{ fontSize: 12 }}>
            <SolutionOutlined /> {text || 'N/A'}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="Lançar ocorrência">
            <Button
              size="small"
              icon={<WarningOutlined />}
              onClick={() => setSelectedCandidateForOcorrencia(record)}
              style={{ color: '#faad14' }}
            />
          </Tooltip>
          {record.status === 'agendado' && (
            <Popconfirm
              title="Cancelar inscrição?"
              description="O candidato será removido deste horário."
              onConfirm={() => handleCancel(record.id_event_application)}
              okText="Confirmar"
              cancelText="Não"
              icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            >
              <Tooltip title="Cancelar inscrição">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  loading={cancelMutation.isPending}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          <span>Candidatos da Sala {roomNumber}</span>
          <Tag color="blue">{candidates.length} inscrito(s)</Tag>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      width={900}
      footer={[
        <Button key="close" onClick={onCancel}>
          Fechar
        </Button>,
      ]}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* Room info */}
          {room && (
            <Space style={{ marginBottom: 16 }} wrap>
              <Tag>
                {dayjs(room.date).format('DD/MM/YYYY')}
              </Tag>
              <Tag>
                {room.time_start?.substring(0, 5)} - {room.time_end?.substring(0, 5)}
              </Tag>
              <Tag color={room.status === 'open' ? 'green' : 'default'}>
                {room.status === 'open' ? 'Aberta' : room.status}
              </Tag>
            </Space>
          )}

          {/* Candidates table */}
          {candidates.length === 0 ? (
            <Empty description="Nenhum candidato inscrito nesta sala" />
          ) : (
            <Table
              dataSource={candidates}
              columns={columns}
              rowKey="id_event_application"
              pagination={false}
              size="small"
            />
          )}
        </>
      )}

      {/* Ocorrência Modal */}
      <OcorrenciaModal
        open={!!selectedCandidateForOcorrencia}
        onCancel={() => setSelectedCandidateForOcorrencia(null)}
        candidate={selectedCandidateForOcorrencia}
      />
    </Modal>
  );
}

// Helper function to format CPF
function formatCPF(cpf) {
  if (!cpf) return '';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
}
