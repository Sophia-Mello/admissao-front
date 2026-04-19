import { useState } from 'react';
import {
  Modal,
  Tabs,
  Table,
  Tag,
  Button,
  Space,
  Descriptions,
  Empty,
  Spin,
  Alert,
  Checkbox,
  Typography,
  Divider,
  Tooltip,
  message,
} from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  SyncOutlined,
  TagsOutlined,
  SwapOutlined,
  StopOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

const { Text, Title } = Typography;

/**
 * Modal to display full candidate details with CV and applications.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether modal is visible
 * @param {number} props.candidateId - Candidate ID to fetch
 * @param {Function} props.onClose - Called when modal closes
 * @param {Function} props.onOpenTagModal - Called with selectedIds when tag action clicked
 * @param {Function} props.onOpenMoveModal - Called with selectedIds when move action clicked
 * @param {Function} props.onOpenReproveModal - Called with selectedIds when reprove action clicked
 */
export default function CandidateDetailModal({
  open,
  candidateId,
  onClose,
  onOpenTagModal,
  onOpenMoveModal,
  onOpenReproveModal,
  zIndex,
}) {
  const [selectedApplicationIds, setSelectedApplicationIds] = useState([]);

  // Fetch candidate details
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['candidate-detail', candidateId],
    queryFn: async () => {
      const response = await api.get(`/candidato/${candidateId}/full`);
      return response.data.data;
    },
    enabled: open && !!candidateId,
  });

  const handleRefresh = async () => {
    try {
      await api.get(`/candidato/${candidateId}/full?force=true`);
      refetch();
      message.success('CV atualizado da Gupy');
    } catch (err) {
      message.error('Erro ao atualizar CV');
    }
  };

  const handleSelectAll = (checked) => {
    if (checked && data?.applications) {
      // Use local application id, not id_application_gupy
      setSelectedApplicationIds(data.applications.map(a => a.id));
    } else {
      setSelectedApplicationIds([]);
    }
  };

  const handleSelectApplication = (appId, checked) => {
    if (checked) {
      setSelectedApplicationIds([...selectedApplicationIds, appId]);
    } else {
      setSelectedApplicationIds(selectedApplicationIds.filter(id => id !== appId));
    }
  };

  const handleAction = (action) => {
    if (selectedApplicationIds.length === 0) {
      message.warning('Selecione pelo menos uma candidatura');
      return;
    }

    // Convert to Set for compatibility with existing modals
    const selectedSet = new Set(selectedApplicationIds);

    switch (action) {
      case 'tags':
        onOpenTagModal?.(selectedSet);
        break;
      case 'move':
        onOpenMoveModal?.(selectedSet);
        break;
      case 'reprove':
        onOpenReproveModal?.(selectedSet);
        break;
    }
  };

  // Reset selection when modal closes
  const handleClose = () => {
    setSelectedApplicationIds([]);
    onClose();
  };

  // Status colors and labels
  const stepStatusColors = {
    notStarted: 'orange',
    done: 'green',
    running: 'processing',
    waiting: 'orange',
  };
  const stepStatusLabels = {
    notStarted: 'Nao Iniciado',
    done: 'Concluido',
    running: 'Em Andamento',
    waiting: 'Aguardando',
  };
  const applicationStatusColors = {
    inProgress: 'processing',
    hired: 'success',
    reproved: 'error',
    gaveUp: 'warning',
  };
  const applicationStatusLabels = {
    inProgress: 'Em Andamento',
    hired: 'Contratado',
    reproved: 'Reprovado',
    gaveUp: 'Desistiu',
  };

  const applicationColumns = [
    {
      title: (
        <Checkbox
          checked={data?.applications?.length > 0 && selectedApplicationIds.length === data.applications.length}
          indeterminate={selectedApplicationIds.length > 0 && selectedApplicationIds.length < (data?.applications?.length || 0)}
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
      ),
      width: 40,
      render: (_, record) => (
        <Checkbox
          checked={selectedApplicationIds.includes(record.id)}
          onChange={(e) => handleSelectApplication(record.id, e.target.checked)}
        />
      ),
    },
    {
      title: 'Vaga',
      dataIndex: 'job_name',
      ellipsis: true,
      width: 200,
      render: (text) => text || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status_application',
      width: 120,
      render: (status) => {
        return status ? (
          <Tag color={applicationStatusColors[status] || 'default'}>
            {applicationStatusLabels[status] || status}
          </Tag>
        ) : '-';
      },
    },
    {
      title: 'Etapa Atual',
      dataIndex: 'current_step_name',
      width: 180,
      render: (text, record) => (
        <div>
          <span>{text || '-'}</span>
          {record.current_step_status && (
            <div style={{ marginTop: 4 }}>
              <Tag color={stepStatusColors[record.current_step_status] || 'default'}>
                {stepStatusLabels[record.current_step_status] || record.current_step_status}
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      width: 150,
      render: (tags) => (
        <Space wrap size={[0, 4]}>
          {(tags || []).slice(0, 2).map(tag => (
            <Tag key={tag} color="cyan">{tag}</Tag>
          ))}
          {tags?.length > 2 && <Tag>+{tags.length - 2}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Acoes',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          {record.id_job_gupy && record.id_application_gupy && (
            <Tooltip title="Abrir na Gupy">
              <Button
                icon={<ExportOutlined />}
                size="small"
                href={`https://tomeducacao.gupy.io/companies/jobs/${record.id_job_gupy}/candidates/${record.id_application_gupy}`}
                target="_blank"
                rel="noopener noreferrer"
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const renderCvTab = () => {
    if (!data?.cv) {
      return <Empty description="CV nao disponivel" />;
    }

    const { cv } = data;

    return (
      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        {data.cvError && (
          <Alert
            type="warning"
            message="Erro ao sincronizar CV"
            description={data.cvError}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Formacao */}
        {cv.formacao?.length > 0 && (
          <>
            <Title level={5}>Formacao Academica</Title>
            {cv.formacao.map((f, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <Text strong>{f.grau}{f.curso ? ` em ${f.curso}` : ''}</Text>
                <br />
                <Text type="secondary">{f.instituicao} - {f.periodo}</Text>
              </div>
            ))}
            <Divider />
          </>
        )}

        {/* Experiencia */}
        {cv.experiencia?.length > 0 && (
          <>
            <Title level={5}>Experiencia Profissional</Title>
            {cv.experiencia.map((e, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <Text strong>{e.cargo}</Text>
                <br />
                <Text type="secondary">{e.empresa} - {e.periodo}</Text>
                {e.descricao && (
                  <div>
                    <Text style={{ fontSize: 12 }}>{e.descricao.substring(0, 200)}{e.descricao.length > 200 ? '...' : ''}</Text>
                  </div>
                )}
              </div>
            ))}
            <Divider />
          </>
        )}

        {/* Idiomas */}
        {cv.idiomas?.length > 0 && (
          <>
            <Title level={5}>Idiomas</Title>
            <Space wrap>
              {cv.idiomas.map((l, i) => (
                <Tag key={i}>{l.nome} ({l.nivel})</Tag>
              ))}
            </Space>
          </>
        )}

        {/* Empty state */}
        {!cv.formacao?.length && !cv.experiencia?.length && !cv.idiomas?.length && (
          <Empty description="Nenhuma informacao de CV disponivel" />
        )}

        {cv.syncedAt && (
          <div style={{ marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Ultima atualizacao: {new Date(cv.syncedAt).toLocaleString('pt-BR')}
              {cv.fromCache && ' (cache)'}
            </Text>
          </div>
        )}
      </div>
    );
  };

  const tabItems = [
    {
      key: 'info',
      label: <span><UserOutlined /> Dados Pessoais</span>,
      children: data?.candidate ? (
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Nome" span={2}>{data.candidate.nome}</Descriptions.Item>
          <Descriptions.Item label="Email">{data.candidate.email}</Descriptions.Item>
          <Descriptions.Item label="Telefone">{data.candidate.telefone || '-'}</Descriptions.Item>
          <Descriptions.Item label="CPF">{data.candidate.cpf || '-'}</Descriptions.Item>
          <Descriptions.Item label="ID Gupy">{data.candidate.id_candidate_gupy || '-'}</Descriptions.Item>
          {data.cv?.endereco && (
            <Descriptions.Item label="Cidade" span={2}>{data.cv.endereco}</Descriptions.Item>
          )}
        </Descriptions>
      ) : null,
    },
    {
      key: 'cv',
      label: <span><FileTextOutlined /> Curriculo</span>,
      children: renderCvTab(),
    },
    {
      key: 'applications',
      label: <span><AppstoreOutlined /> Candidaturas ({data?.applications?.length || 0})</span>,
      children: (
        <div>
          {/* Action buttons */}
          <Space style={{ marginBottom: 16 }}>
            <Button
              icon={<TagsOutlined />}
              onClick={() => handleAction('tags')}
              disabled={selectedApplicationIds.length === 0}
            >
              Tags
            </Button>
            <Button
              icon={<SwapOutlined />}
              onClick={() => handleAction('move')}
              disabled={selectedApplicationIds.length === 0}
            >
              Mover
            </Button>
            <Button
              icon={<StopOutlined />}
              onClick={() => handleAction('reprove')}
              disabled={selectedApplicationIds.length === 0}
              danger
            >
              Reprovar
            </Button>
            <Text type="secondary">
              {selectedApplicationIds.length > 0 ? `${selectedApplicationIds.length} selecionada(s)` : 'Selecione candidaturas'}
            </Text>
          </Space>

          <Table
            columns={applicationColumns}
            dataSource={data?.applications || []}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ y: 300 }}
          />
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          <span>{data?.candidate?.nome || 'Detalhes do Candidato'}</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={900}
      zIndex={zIndex}
      footer={[
        <Button key="refresh" icon={<SyncOutlined />} onClick={handleRefresh} loading={isLoading}>
          Atualizar CV
        </Button>,
        <Button key="close" onClick={handleClose}>
          Fechar
        </Button>,
      ]}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Carregando dados do candidato...</div>
        </div>
      ) : error ? (
        <Alert type="error" message="Erro ao carregar candidato" description={error.message} />
      ) : (
        <Tabs items={tabItems} defaultActiveKey="info" />
      )}
    </Modal>
  );
}
