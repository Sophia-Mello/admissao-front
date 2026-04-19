/**
 * EventTypesModal.jsx - Event Types Configuration Modal
 *
 * Modal for managing event types (Tipos de Evento):
 * - List all active event types
 * - Create new event types
 * - Edit existing event types (display_name, calendar_id)
 * - Manage template associations
 * - Delete (soft delete) event types
 */

import { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Table,
  Tag,
  Typography,
  Divider,
  Popconfirm,
  Empty,
  Spin,
  Tooltip,
  Row,
  Col,
  Card,
  Select,
  message,
} from 'antd';
import {
  SettingOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  CalendarOutlined,
  TagsOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import {
  useEventTypes,
  useCreateEventType,
  useUpdateEventType,
  useDeleteEventType,
  useAddTemplatesToEventType,
  useRemoveTemplateFromEventType,
} from '../../hooks/useEventTypes';
import { useGupyTemplates } from '../../hooks/useGupyTemplates';

const { Text, Title } = Typography;

// View modes for the modal
const VIEW_MODES = {
  LIST: 'list',
  CREATE: 'create',
  EDIT: 'edit',
  TEMPLATES: 'templates',
};

export default function EventTypesModal({ open, onCancel }) {
  const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
  const [selectedEventType, setSelectedEventType] = useState(null);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const [form] = Form.useForm();

  // Hooks
  const { eventTypes, isLoading, refetch } = useEventTypes(open);
  const { data: gupyTemplates, isLoading: isLoadingTemplates } = useGupyTemplates({}, { enabled: open && viewMode === VIEW_MODES.TEMPLATES });
  const createMutation = useCreateEventType();
  const updateMutation = useUpdateEventType();
  const deleteMutation = useDeleteEventType();
  const addTemplatesMutation = useAddTemplatesToEventType();
  const removeTemplateMutation = useRemoveTemplateFromEventType();

  // Reset view when modal opens/closes
  useEffect(() => {
    if (open) {
      setViewMode(VIEW_MODES.LIST);
      setSelectedEventType(null);
      setSelectedTemplateIds([]);
      form.resetFields();
    }
  }, [open, form]);

  // Handlers
  const handleCreate = () => {
    form.resetFields();
    setViewMode(VIEW_MODES.CREATE);
  };

  const handleEdit = (eventType) => {
    setSelectedEventType(eventType);
    form.setFieldsValue({
      display_name: eventType.display_name,
      calendar_id: eventType.calendar_id || '',
    });
    setViewMode(VIEW_MODES.EDIT);
  };

  const handleManageTemplates = (eventType) => {
    setSelectedEventType(eventType);
    setSelectedTemplateIds([]);
    setViewMode(VIEW_MODES.TEMPLATES);
  };

  const handleBack = () => {
    setViewMode(VIEW_MODES.LIST);
    setSelectedEventType(null);
    setSelectedTemplateIds([]);
    form.resetFields();
  };

  const handleSubmitCreate = async () => {
    try {
      const values = await form.validateFields();
      await createMutation.mutateAsync({
        display_name: values.display_name,
        calendar_id: values.calendar_id || null,
      });
      handleBack();
    } catch (error) {
      // Validation or mutation error - handled by hook
    }
  };

  const handleSubmitEdit = async () => {
    try {
      const values = await form.validateFields();
      await updateMutation.mutateAsync({
        id: selectedEventType.id,
        display_name: values.display_name,
        calendar_id: values.calendar_id || null,
      });
      handleBack();
    } catch (error) {
      // Validation or mutation error - handled by hook
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleAddTemplates = async () => {
    if (selectedTemplateIds.length === 0) {
      message.warning('Selecione pelo menos um template');
      return;
    }

    try {
      // Map selected IDs to template objects with name
      const templatesToAdd = selectedTemplateIds.map((id) => {
        const template = gupyTemplates?.find((t) => String(t.id) === String(id));
        return {
          id_template_gupy: String(id),
          template_name: template?.name || null,
        };
      });

      await addTemplatesMutation.mutateAsync({
        id: selectedEventType.id,
        templates: templatesToAdd,
      });
      setSelectedTemplateIds([]);
      // Refetch and update selected event type with fresh data
      const result = await refetch();
      const updated = result.data?.data?.find((et) => et.id === selectedEventType.id);
      if (updated) setSelectedEventType(updated);
    } catch (error) {
      // Mutation error - handled by hook
    }
  };

  const handleRemoveTemplate = async (templateId) => {
    try {
      await removeTemplateMutation.mutateAsync({
        eventTypeId: selectedEventType.id,
        templateId,
      });
      // Refetch and update selected event type with fresh data
      const result = await refetch();
      const updated = result.data?.data?.find((et) => et.id === selectedEventType.id);
      if (updated) setSelectedEventType(updated);
    } catch (error) {
      // Error handled by hook
    }
  };

  // Table columns for event types list
  const columns = [
    {
      title: 'Nome',
      dataIndex: 'display_name',
      key: 'display_name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Código: {record.code}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Templates',
      dataIndex: 'templates',
      key: 'templates',
      render: (templates) => (
        <Tag color={templates?.length > 0 ? 'blue' : 'default'}>
          {templates?.length || 0} template(s)
        </Tag>
      ),
    },
    {
      title: 'Calendário',
      dataIndex: 'calendar_id',
      key: 'calendar_id',
      render: (calendarId) =>
        calendarId ? (
          <Tooltip title={calendarId}>
            <Tag color="green" icon={<CalendarOutlined />}>
              Configurado
            </Tag>
          </Tooltip>
        ) : (
          <Tag color="default">Padrão</Tag>
        ),
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space>
          <Tooltip title="Gerenciar Templates">
            <Button
              type="text"
              icon={<TagsOutlined />}
              onClick={() => handleManageTemplates(record)}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Desativar tipo de evento?"
            description="O tipo será desativado e não poderá ser usado para novos eventos."
            onConfirm={() => handleDelete(record.id)}
            okText="Sim, desativar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Desativar">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Render content based on view mode
  const renderContent = () => {
    if (isLoading) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Carregando tipos de evento...</Text>
          </div>
        </div>
      );
    }

    switch (viewMode) {
      case VIEW_MODES.CREATE:
        return (
          <div>
            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              style={{ marginBottom: 16, padding: 0 }}
            >
              Voltar
            </Button>
            <Title level={5}>
              <PlusOutlined /> Novo Tipo de Evento
            </Title>
            <Form form={form} layout="vertical">
              <Form.Item
                name="display_name"
                label="Nome de Exibição"
                rules={[
                  { required: true, message: 'Informe o nome do tipo de evento' },
                  { min: 3, message: 'Nome deve ter pelo menos 3 caracteres' },
                ]}
              >
                <Input placeholder="Ex: Prova Teórica, Entrevista Técnica" />
              </Form.Item>
              <Form.Item
                name="calendar_id"
                label="ID do Calendário Google (opcional)"
                help="Se não informado, será usado o calendário padrão do sistema"
              >
                <Input placeholder="Ex: abc123xyz@group.calendar.google.com" />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button onClick={handleBack}>Cancelar</Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    loading={createMutation.isPending}
                    onClick={handleSubmitCreate}
                  >
                    Criar Tipo
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        );

      case VIEW_MODES.EDIT:
        return (
          <div>
            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              style={{ marginBottom: 16, padding: 0 }}
            >
              Voltar
            </Button>
            <Title level={5}>
              <EditOutlined /> Editar Tipo de Evento
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Código: {selectedEventType?.code}
            </Text>
            <Form form={form} layout="vertical">
              <Form.Item
                name="display_name"
                label="Nome de Exibição"
                rules={[
                  { required: true, message: 'Informe o nome do tipo de evento' },
                  { min: 3, message: 'Nome deve ter pelo menos 3 caracteres' },
                ]}
              >
                <Input placeholder="Ex: Prova Teórica, Entrevista Técnica" />
              </Form.Item>
              <Form.Item
                name="calendar_id"
                label="ID do Calendário Google (opcional)"
                help="Se não informado, será usado o calendário padrão do sistema"
              >
                <Input placeholder="Ex: abc123xyz@group.calendar.google.com" />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button onClick={handleBack}>Cancelar</Button>
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    loading={updateMutation.isPending}
                    onClick={handleSubmitEdit}
                  >
                    Salvar Alterações
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        );

      case VIEW_MODES.TEMPLATES:
        const templates = selectedEventType?.templates || [];
        return (
          <div>
            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              style={{ marginBottom: 16, padding: 0 }}
            >
              Voltar
            </Button>
            <Title level={5}>
              <TagsOutlined /> Templates - {selectedEventType?.display_name}
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Templates Gupy associados a este tipo de evento. Apenas candidatos
              com estes templates poderão agendar.
            </Text>

            {/* Add template multiselect */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={8} align="middle">
                <Col flex="auto">
                  <Select
                    mode="multiple"
                    placeholder="Selecione os templates Gupy"
                    value={selectedTemplateIds}
                    onChange={setSelectedTemplateIds}
                    loading={isLoadingTemplates}
                    style={{ width: '100%' }}
                    optionFilterProp="label"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={
                      gupyTemplates
                        ?.filter((t) => !templates.some((et) => String(et.id_template_gupy) === String(t.id)))
                        .map((t) => ({
                          value: String(t.id),
                          label: `${t.name} (ID: ${t.id})`,
                        })) || []
                    }
                    notFoundContent={isLoadingTemplates ? <Spin size="small" /> : 'Nenhum template disponível'}
                  />
                </Col>
                <Col>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    loading={addTemplatesMutation.isPending}
                    onClick={handleAddTemplates}
                    disabled={selectedTemplateIds.length === 0}
                  >
                    Adicionar
                  </Button>
                </Col>
              </Row>
            </Card>

            {/* Templates list */}
            {templates.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Nenhum template associado"
              />
            ) : (
              <Table
                dataSource={templates}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: 'ID Template Gupy',
                    dataIndex: 'id_template_gupy',
                    key: 'id_template_gupy',
                    render: (id) => <Text code>{id}</Text>,
                  },
                  {
                    title: 'Nome',
                    dataIndex: 'template_name',
                    key: 'template_name',
                    render: (name) => name || <Text type="secondary">-</Text>,
                  },
                  {
                    title: 'Ação',
                    key: 'action',
                    width: 80,
                    render: (_, record) => (
                      <Popconfirm
                        title="Remover template?"
                        description="Candidatos com este template não poderão mais agendar este tipo de evento."
                        onConfirm={() => handleRemoveTemplate(record.id_template_gupy)}
                        okText="Sim, remover"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          loading={removeTemplateMutation.isPending}
                        />
                      </Popconfirm>
                    ),
                  },
                ]}
              />
            )}
          </div>
        );

      case VIEW_MODES.LIST:
      default:
        return (
          <div>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Col>
                <Text type="secondary">
                  Gerencie os tipos de evento disponíveis no sistema
                </Text>
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreate}
                >
                  Novo Tipo
                </Button>
              </Col>
            </Row>

            {eventTypes.length === 0 ? (
              <Empty
                description={
                  <span>
                    Nenhum tipo de evento cadastrado.
                    <br />
                    <Button type="link" onClick={handleCreate}>
                      Criar primeiro tipo
                    </Button>
                  </span>
                }
              />
            ) : (
              <Table
                dataSource={eventTypes}
                columns={columns}
                rowKey="id"
                size="small"
                pagination={false}
              />
            )}
          </div>
        );
    }
  };

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>Tipos de Evento</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      width={800}
      footer={
        viewMode === VIEW_MODES.LIST ? (
          <Button onClick={onCancel}>Fechar</Button>
        ) : null
      }
      destroyOnClose
    >
      {renderContent()}
    </Modal>
  );
}
