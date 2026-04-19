/**
 * CandidateTable.jsx - Table of candidates for exam monitoring
 *
 * Displays:
 * - Checkbox for presence (disabled when event is done)
 * - Apelido Meet input for identification
 * - Candidate info (name, CPF, email, phone)
 * - Button to open occurrence modal
 */

import { useState } from 'react';
import { Table, Checkbox, Input, Button, Space, Tag, Tooltip, Typography, Badge } from 'antd';
import {
  ExclamationCircleOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useTogglePresence, useUpdateApelido } from '../../hooks/useFiscalizacao';

const { Text } = Typography;


export default function CandidateTable({
  candidates = [],
  eventStatus = 'open',
  onOcorrencia,
  loading = false,
}) {
  const [editingApelido, setEditingApelido] = useState({});

  const togglePresence = useTogglePresence();
  const updateApelido = useUpdateApelido();

  const isDone = eventStatus === 'done';

  // Handle presence checkbox toggle
  const handlePresenceChange = async (record, checked) => {
    try {
      await togglePresence.mutateAsync({
        id: record.id_event_application,
        present: checked,
      });
    } catch (error) {
      // Error handled by hook
    }
  };

  // Handle apelido local state change (controlled input)
  const handleApelidoChange = (record, value) => {
    setEditingApelido(prev => ({
      ...prev,
      [record.id_event_application]: value,
    }));
  };

  // Save apelido on blur (when clicking outside the field)
  const handleApelidoBlur = async (record) => {
    const newValue = editingApelido[record.id_event_application];
    // Only save if value was edited and is different from original
    if (newValue !== undefined && newValue !== (record.apelido_meet ?? '')) {
      try {
        await updateApelido.mutateAsync({
          id: record.id_event_application,
          apelido_meet: newValue,
        });
      } catch (error) {
        // Error handled by hook
      }
    }
  };

  // Format CPF for display
  const formatCPF = (cpf) => {
    if (!cpf) return '-';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Get status tag
  const getStatusTag = (status) => {
    switch (status) {
      case 'compareceu':
        return <Tag color="success" icon={<CheckCircleOutlined />}>Compareceu</Tag>;
      case 'faltou':
        return <Tag color="error" icon={<CloseCircleOutlined />}>Faltou</Tag>;
      case 'agendado':
        return <Tag color="processing">Agendado</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Presença',
      dataIndex: 'presence_marked',
      key: 'presence',
      width: 80,
      align: 'center',
      render: (value, record) => (
        <Checkbox
          checked={value}
          disabled={isDone || togglePresence.isPending}
          onChange={(e) => handlePresenceChange(record, e.target.checked)}
        />
      ),
    },
    {
      title: 'Apelido Meet',
      dataIndex: 'apelido_meet',
      key: 'apelido_meet',
      width: 150,
      render: (value, record) => (
        <Input
          size="small"
          placeholder="Ex: João S."
          value={editingApelido[record.id_event_application] ?? value ?? ''}
          onChange={(e) => handleApelidoChange(record, e.target.value)}
          onBlur={() => handleApelidoBlur(record)}
          disabled={updateApelido.isPending}
          maxLength={100}
        />
      ),
    },
    {
      title: 'Nome',
      dataIndex: 'nome',
      key: 'nome',
      ellipsis: true,
      render: (value, record) => (
        <Space>
          <UserOutlined />
          <Text strong>{value}</Text>
          {record.other_jobs_report_severity === 2 && (
            <Tooltip title="Ocorrência eliminatória em outra vaga">
              <Badge status="error" />
            </Tooltip>
          )}
          {record.other_jobs_report_severity === 1 && (
            <Tooltip title="Alerta em outra vaga">
              <Badge status="warning" />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Vaga',
      dataIndex: 'job_name',
      key: 'vaga',
      ellipsis: true,
      render: (value) => value || '-',
    },
    {
      title: 'CPF',
      dataIndex: 'cpf',
      key: 'cpf',
      width: 140,
      render: (value) => <Text type="secondary">{formatCPF(value)}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      render: (value) => value || '-',
    },
    {
      title: 'Telefone',
      dataIndex: 'telefone',
      key: 'telefone',
      width: 130,
      render: (value) => value || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value) => getStatusTag(value),
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 180,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          {record.id_job_gupy && record.id_application_gupy && (
            <Tooltip title="Ver candidato no Gupy">
              <Button
                type="link"
                size="small"
                icon={<LinkOutlined />}
                href={`https://tomeducacao.gupy.io/companies/jobs/${record.id_job_gupy}/candidates/${record.id_application_gupy}`}
                target="_blank"
                rel="noopener noreferrer"
              />
            </Tooltip>
          )}
          <Tooltip title="Registrar ocorrência">
            <Button
              type="default"
              size="small"
              icon={<ExclamationCircleOutlined />}
              onClick={() => onOcorrencia?.(record)}
              danger
            >
              Ocorrência
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={candidates}
      rowKey="id_event_application"
      loading={loading}
      pagination={false}
      size="middle"
      scroll={{ x: 1000 }}
      rowClassName={(record) => {
        if (record.status === 'compareceu') return 'table-row-success';
        if (record.status === 'faltou') return 'table-row-error';
        if (record.presence_marked) return 'table-row-marked';
        return '';
      }}
      locale={{
        emptyText: 'Nenhum candidato nesta sala',
      }}
    />
  );
}
