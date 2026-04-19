/**
 * EventosPendentes.jsx - Pending Candidates Tab
 *
 * Shows candidates who have applications but no active event inscription.
 * Features:
 * - Filter by template_name
 * - Filter by subregional
 * - Shows days since application was created
 * - Click to view candidate details and schedule
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Typography,
  Space,
  Tag,
  Button,
  Select,
  Row,
  Col,
  Spin,
  Empty,
  Tooltip,
  Input,
} from 'antd';
import {
  UserOutlined,
  ClockCircleOutlined,
  SolutionOutlined,
  SearchOutlined,
  CalendarOutlined,
  ReloadOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { useCandidates } from '../../hooks/useEventos';
import { useSubregionais } from '../../hooks/useSubregionais';
import { useGupyTemplates } from '../../hooks/useGupyTemplates';
import { useEventTypes } from '../../hooks/useEventTypes';
import EventosBuscaCPF from './EventosBuscaCPF';

const { Text } = Typography;

// Status options for filter
const STATUS_OPTIONS = [
  { label: 'Pendente', value: 'pendente' },
  { label: 'Agendado', value: 'agendado' },
  { label: 'Compareceu', value: 'compareceu' },
  { label: 'Faltou', value: 'faltou' },
];

export default function EventosPendentes({ type: initialType = null }) {
  const [selectedEventType, setSelectedEventType] = useState(initialType);
  const [filters, setFilters] = useState({
    template_name: null,
    id_subregional: null,
    status: 'pendente',
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [sorter, setSorter] = useState({ field: 'dias_na_etapa', order: 'descend' });
  const [searchCPF, setSearchCPF] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Fetch event types for filter dropdown
  const { eventTypes, isLoading: loadingEventTypes } = useEventTypes();

  // Set first event type as default when loaded
  useEffect(() => {
    if (!selectedEventType && eventTypes.length > 0) {
      setSelectedEventType(eventTypes[0].code);
    }
  }, [eventTypes, selectedEventType]);


  const { candidates, pagination: paginationData, isLoading, refetch, isFetching } = useCandidates({
    type: selectedEventType,
    status: filters.status,
    template_name: filters.template_name,
    id_subregional: filters.id_subregional,
    limit: pagination.pageSize,
    offset: (pagination.current - 1) * pagination.pageSize,
    order_by: sorter.field,
    order_dir: sorter.order === 'descend' ? 'desc' : 'asc',
    enabled: true,
  });

  const { subregionais } = useSubregionais();
  const { data: templates = [], isLoading: templatesLoading } = useGupyTemplates();

  const handleCandidateClick = (record) => {
    setSearchCPF(record.cpf);
    setSelectedCandidate(record);
  };

  const columns = [
    {
      title: 'Candidato',
      key: 'candidate',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            <UserOutlined /> {record.nome}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            CPF: {formatCPF(record.cpf)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Contato',
      key: 'contact',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{record.email || '-'}</Text>
          <Text style={{ fontSize: 12 }}>{record.telefone || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Template',
      key: 'template',
      render: (_, record) => (
        <Text style={{ fontSize: 12, whiteSpace: 'normal', wordBreak: 'break-word' }}>
          <SolutionOutlined /> {record.template_name || 'N/A'}
        </Text>
      ),
    },
    {
      title: 'Subregional',
      dataIndex: 'nome_subregional',
      key: 'subregional',
      width: 150,
      render: (text) => <Text style={{ fontSize: 12 }}>{text || 'N/A'}</Text>,
    },
    {
      title: 'Dias na Etapa',
      dataIndex: 'dias_na_etapa',
      key: 'dias_na_etapa',
      width: 100,
      sorter: (a, b) => (a.dias_na_etapa || 0) - (b.dias_na_etapa || 0),
      defaultSortOrder: 'descend',
      render: (days) => {
        const numDays = parseInt(days) || 0;
        let color = 'default';
        if (numDays >= 7) color = 'red';
        else if (numDays >= 3) color = 'orange';

        return (
          <Tag color={color}>
            <ClockCircleOutlined /> {numDays} dia(s)
          </Tag>
        );
      },
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          icon={<CalendarOutlined />}
          onClick={() => handleCandidateClick(record)}
        >
          Agendar
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Select
                placeholder="Tipo de Evento"
                style={{ width: 180 }}
                value={selectedEventType}
                onChange={(value) => {
                  setSelectedEventType(value);
                  setPagination({ ...pagination, current: 1 });
                }}
                loading={loadingEventTypes}
                options={eventTypes.map((et) => ({
                  label: et.display_name,
                  value: et.code,
                }))}
              />
              <Select
                placeholder="Status"
                style={{ width: 140 }}
                value={filters.status}
                onChange={(value) => {
                  setFilters({ ...filters, status: value });
                  setPagination({ ...pagination, current: 1 });
                }}
                options={STATUS_OPTIONS}
              />
              <Select
                placeholder="Filtrar por Template"
                style={{ width: 320 }}
                dropdownStyle={{ minWidth: 400 }}
                allowClear
                showSearch
                optionFilterProp="label"
                loading={templatesLoading}
                value={filters.template_name}
                onChange={(value) => {
                  setFilters({ ...filters, template_name: value });
                  setPagination({ ...pagination, current: 1 });
                }}
                options={templates.map((t) => ({ label: t.name, value: t.name }))}
              />
              <Select
                placeholder="Filtrar por Subregional"
                style={{ width: 200 }}
                allowClear
                value={filters.id_subregional}
                onChange={(value) => {
                  setFilters({ ...filters, id_subregional: value });
                  setPagination({ ...pagination, current: 1 });
                }}
                options={subregionais.map((s) => ({
                  label: s.nome_subregional,
                  value: s.id_subregional,
                }))}
              />
            </Space>
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined spin={isFetching} />}
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Atualizar
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        {/* Candidates Table */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <UserOutlined />
                <span>Candidatos {filters.status === 'pendente' ? 'Pendentes' : filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}</span>
                <Tag>{paginationData.total}</Tag>
              </Space>
            }
          >
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
              </div>
            ) : candidates.length === 0 ? (
              <Empty description="Nenhum candidato encontrado" />
            ) : (
              <Table
                dataSource={candidates}
                columns={columns}
                rowKey={(record) => `${record.cpf}_${record.id_application || record.job_name}`}
                size="small"
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: paginationData.total,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '50'],
                  showTotal: (total) => `Total: ${total} candidatos`,
                }}
                onChange={(pag, _filters, sort, extra) => {
                  // Handle sorting
                  if (extra.action === 'sort') {
                    const newField = sort?.field || sort?.columnKey || 'dias_na_etapa';
                    const newOrder = sort?.order || null;
                    // If order is null (sort cleared), default back to descend
                    setSorter({
                      field: newField,
                      order: newOrder || 'descend'
                    });
                    setPagination({ current: 1, pageSize: pag.pageSize });
                    return;
                  }
                  // Handle pagination
                  setPagination({ current: pag.current, pageSize: pag.pageSize });
                }}
                scroll={{ x: 800 }}
              />
            )}
          </Card>
        </Col>

        {/* CPF Search / Schedule Panel */}
        <Col xs={24} lg={10}>
          <EventosBuscaCPF
            type={selectedEventType}
            initialCPF={searchCPF}
            onScheduleSuccess={() => {
              setSearchCPF('');
              setSelectedCandidate(null);
              refetch();
            }}
          />
        </Col>
      </Row>
    </div>
  );
}

// Helper function to format CPF
function formatCPF(cpf) {
  if (!cpf) return '';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
}
