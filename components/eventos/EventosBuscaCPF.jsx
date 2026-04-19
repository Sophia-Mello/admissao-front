/**
 * EventosBuscaCPF.jsx - CPF Search and Manual Scheduling
 *
 * Search candidate by CPF and schedule them manually.
 * Shows:
 * - Candidate details (name, email, phone)
 * - All applications for the candidate
 * - Existing event inscriptions
 * - Schedule button for each application
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Typography,
  Space,
  Tag,
  Button,
  Spin,
  Empty,
  Alert,
  Divider,
  List,
  Select,
  DatePicker,
  Modal,
  Form,
  message,
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  SolutionOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useCandidateByCPF,
  useScheduleManual,
  usePublicAvailability,
} from '../../hooks/useEventos';

const { Text, Title } = Typography;
const { Search } = Input;

export default function EventosBuscaCPF({ type = null, initialCPF = '', onScheduleSuccess }) {
  const [cpf, setCpf] = useState(initialCPF);
  const [searchCPF, setSearchCPF] = useState(initialCPF);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [form] = Form.useForm();

  // Update search when initialCPF changes
  useEffect(() => {
    if (initialCPF) {
      setCpf(initialCPF);
      setSearchCPF(initialCPF);
    }
  }, [initialCPF]);

  const { candidate, applications, isLoading, error, refetch } = useCandidateByCPF(searchCPF, type, !!searchCPF);
  const scheduleMutation = useScheduleManual();

  // Get availability for scheduling modal
  const { slots: availableSlots } = usePublicAvailability({
    type,
    enabled: scheduleModalOpen,
  });

  const handleSearch = (value) => {
    const cleanCpf = value.replace(/\D/g, '');
    if (cleanCpf.length === 11) {
      setSearchCPF(cleanCpf);
    } else {
      message.warning('CPF deve ter 11 dígitos');
    }
  };

  const handleOpenScheduleModal = (application) => {
    setSelectedApplication(application);
    setScheduleModalOpen(true);
  };

  const handleSchedule = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        type,
        cpf: candidate?.cpf,
        id_application_gupy: selectedApplication.id_application_gupy,
        id_job_gupy: selectedApplication.id_job_gupy,
        date: values.date.format('YYYY-MM-DD'),
        time_start: values.time_start,
      };

      await scheduleMutation.mutateAsync(payload);

      form.resetFields();
      setScheduleModalOpen(false);
      setSelectedApplication(null);
      refetch();
      onScheduleSuccess?.();
    } catch (error) {
      // Error handled by hook or form validation
    }
  };

  // Group availability by date for the select (availableSlots now comes from hook)
  const slotsByDate = (availableSlots || []).reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  return (
    <Card
      title={
        <Space>
          <SearchOutlined />
          <span>Busca por CPF</span>
        </Space>
      }
    >
      <Search
        placeholder="Digite o CPF (apenas números)"
        value={cpf}
        onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
        onSearch={handleSearch}
        enterButton={<><SearchOutlined /> Buscar</>}
        loading={isLoading}
        maxLength={11}
        style={{ marginBottom: 16 }}
      />

      {isLoading && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spin />
        </div>
      )}

      {error && !isLoading && (
        <Alert
          type="warning"
          showIcon
          message="Candidato não encontrado"
          description="Não foi encontrado candidato com este CPF no sistema."
        />
      )}

      {candidate && !isLoading && (
        <>
          {/* Candidate Info */}
          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: 16 }}>
                <UserOutlined /> {candidate.nome}
              </Text>
              <Text type="secondary">
                CPF: {formatCPF(candidate.cpf)}
              </Text>
              {candidate.email && (
                <Text>
                  <MailOutlined /> {candidate.email}
                </Text>
              )}
              {candidate.telefone && (
                <Text>
                  <PhoneOutlined /> {candidate.telefone}
                </Text>
              )}
            </Space>
          </Card>

          <Divider orientation="left" style={{ margin: '12px 0' }}>
            Candidaturas ({applications.length})
          </Divider>

          {/* Applications List */}
          {applications.length === 0 ? (
            <Empty description="Nenhuma candidatura encontrada" />
          ) : (
            <List
              size="small"
              dataSource={applications}
              renderItem={(app) => {
                // Backend returns: status (agendado|compareceu|faltou|cancelado|pendente) and existing_event (details)
                const inscription = app.existing_event;
                const appStatus = app.status || 'pendente';
                const hasActiveInscription = appStatus === 'agendado' && inscription;
                const canSchedule = app.can_schedule || ['cancelado', 'pendente'].includes(appStatus);

                // Show Reagendar button for agendado and faltou statuses
                const showReagendarButton = ['agendado', 'faltou'].includes(appStatus);

                return (
                  <List.Item
                    actions={
                      canSchedule
                        ? [
                            <Button
                              key="schedule"
                              size="small"
                              type="primary"
                              icon={<CalendarOutlined />}
                              onClick={() => handleOpenScheduleModal(app)}
                            >
                              Agendar
                            </Button>,
                          ]
                        : showReagendarButton
                        ? [
                            <Button
                              key="reschedule"
                              size="small"
                              type="default"
                              icon={<CalendarOutlined />}
                              onClick={() => handleOpenScheduleModal(app)}
                            >
                              Reagendar
                            </Button>,
                          ]
                        : [
                            <Tag
                              key="status"
                              color={getStatusColor(appStatus)}
                              icon={getStatusIcon(appStatus)}
                            >
                              {appStatus}
                            </Tag>,
                          ]
                    }
                  >
                    <List.Item.Meta
                      avatar={<SolutionOutlined />}
                      title={
                        <Text ellipsis style={{ maxWidth: 250 }}>
                          {app.job_name}
                        </Text>
                      }
                      description={
                        hasActiveInscription ? (
                          <Space size={4}>
                            <Tag color="blue">{appStatus}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {formatDate(inscription.date)} - {inscription.time_start?.substring(0, 5)}
                            </Text>
                          </Space>
                        ) : appStatus === 'cancelado' ? (
                          <Tag color="default">Cancelado - pode reagendar</Tag>
                        ) : appStatus === 'faltou' ? (
                          <Tag color="red">Faltou - pode reagendar</Tag>
                        ) : appStatus === 'compareceu' ? (
                          <Tag color="green">Realizada</Tag>
                        ) : (
                          <Tag color="orange">Sem agendamento</Tag>
                        )
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </>
      )}

      {/* Schedule Modal */}
      <Modal
        title={
          <Space>
            <CalendarOutlined />
            <span>Agendar Candidato</span>
          </Space>
        }
        open={scheduleModalOpen}
        onCancel={() => {
          setScheduleModalOpen(false);
          setSelectedApplication(null);
          form.resetFields();
        }}
        onOk={handleSchedule}
        confirmLoading={scheduleMutation.isPending}
        okText="Agendar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical">
          {/* Candidate and Job Info */}
          <Alert
            type="info"
            showIcon={false}
            message={
              <Space direction="vertical" size={0}>
                <Text strong>{candidate?.nome}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {selectedApplication?.job_name}
                </Text>
              </Space>
            }
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="date"
            label="Data"
            rules={[{ required: true, message: 'Selecione a data' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              disabledDate={(current) => {
                const dateStr = current.format('YYYY-MM-DD');
                return !slotsByDate[dateStr];
              }}
            />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.date !== cur.date}>
            {({ getFieldValue }) => {
              const selectedDate = getFieldValue('date');
              const dateStr = selectedDate?.format('YYYY-MM-DD');
              const slotsForDate = slotsByDate[dateStr] || [];

              return (
                <Form.Item
                  name="time_start"
                  label="Horário"
                  rules={[{ required: true, message: 'Selecione o horário' }]}
                >
                  <Select
                    placeholder="Selecione o horário"
                    disabled={!selectedDate}
                    options={slotsForDate.map((slot) => ({
                      label: `${slot.time_start?.substring(0, 5)} - ${slot.time_end?.substring(0, 5)} (${slot.vagas_disponiveis} vagas)`,
                      value: slot.time_start,
                      disabled: slot.vagas_disponiveis <= 0,
                    }))}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

// Helper functions
function formatCPF(cpf) {
  if (!cpf) return '';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
}

function formatDate(dateStr) {
  return dayjs(dateStr).format('DD/MM/YYYY');
}

function getStatusColor(status) {
  const colors = {
    agendado: 'blue',
    compareceu: 'green',
    faltou: 'red',
    cancelado: 'default',
  };
  return colors[status] || 'default';
}

function getStatusIcon(status) {
  const icons = {
    agendado: <ClockCircleOutlined />,
    compareceu: <CheckCircleOutlined />,
    faltou: <CloseCircleOutlined />,
    cancelado: <CloseCircleOutlined />,
  };
  return icons[status] || null;
}
