// components/BookingsManagement/TimeRangeEditor.jsx

import { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Alert,
  Spin,
  message,
  Typography,
  Divider,
  Row,
  Col,
  DatePicker,
} from 'antd';
import { ClockCircleOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTimeSlots,
  saveTimeSlots,
  deleteTimeSlots,
} from '../../lib/services/bookingsManagementService';
import moment from 'moment';

const { Text, Paragraph } = Typography;

/**
 * TimeRangeEditor Component
 *
 * Modal for managing time slots configuration for a unit.
 *
 * Features:
 * - Fetch current time slots (if exists)
 * - Edit morning start/end times
 * - Edit afternoon start/end times
 * - Edit slot duration (minutes)
 * - Save (create/update) time slots
 * - Delete time slots (revert to default)
 *
 * Business Rules:
 * - Morning: start < end
 * - Afternoon: start < end
 * - Slot duration: 20-60 minutes (default: 40)
 * - Times in HH:mm format (e.g., "08:00")
 */
export default function TimeRangeEditor({ open, onCancel, id_unidade }) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Auto-format time input (HH:mm)
  const formatTimeInput = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) {
      return cleaned;
    }
    return cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
  };

  // Fetch current time slots
  const { data: timeSlotsData, isLoading: loadingTimeSlots } = useQuery({
    queryKey: ['time-slots', id_unidade],
    queryFn: () => getTimeSlots(id_unidade),
    enabled: open && !!id_unidade,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: saveTimeSlots,
    onSuccess: () => {
      queryClient.invalidateQueries(['time-slots', id_unidade]);
      message.success('Horários salvos com sucesso!');
      onCancel();
    },
    onError: (error) => {
      const errorMsg =
        error.response?.data?.error || error.message || 'Erro ao salvar horários';
      message.error(errorMsg);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteTimeSlots(id_unidade),
    onSuccess: () => {
      queryClient.invalidateQueries(['time-slots', id_unidade]);
      message.success('Horários customizados removidos. A unidade voltará a usar os horários padrão');
      onCancel();
    },
    onError: (error) => {
      const errorMsg =
        error.response?.data?.error || error.message || 'Erro ao remover horários';
      message.error(errorMsg);
    },
  });

  // Always keep form blank - user fills based on placeholders
  useEffect(() => {
    form.resetFields();
  }, [timeSlotsData, form]);

  // Helper to ensure HH:mm format (truncate seconds if present)
  const ensureHHMM = (time) => {
    if (!time) return null;
    return time.slice(0, 5);
  };

  // Dynamic placeholders showing current values
  const getTimePlaceholder = (field, defaultValue) => {
    if (timeSlotsData?.slot_config && timeSlotsData.slot_config[field]) {
      return `${ensureHHMM(timeSlotsData.slot_config[field])} (atual)`;
    }
    return `${defaultValue} (padrão)`;
  };

  const getDurationPlaceholder = () => {
    if (timeSlotsData?.slot_config && timeSlotsData.slot_config.slot_duration) {
      const config = timeSlotsData.slot_config;
      let minutes;
      if (typeof config.slot_duration === 'number') {
        minutes = config.slot_duration;
      } else {
        const [hours, mins] = config.slot_duration.split(':').map(v => parseInt(v, 10));
        minutes = (hours || 0) * 60 + (mins || 0);
      }
      return `${minutes} (atual)`;
    }
    return '40 (padrão)';
  };

  const getDateRangePlaceholder = () => {
    if (timeSlotsData?.slot_config && timeSlotsData.slot_config.start_day && timeSlotsData.slot_config.end_day) {
      const start = moment(timeSlotsData.slot_config.start_day).format('DD/MM/YYYY');
      const end = moment(timeSlotsData.slot_config.end_day).format('DD/MM/YYYY');
      return [`${start} (atual)`, `${end} (atual)`];
    }
    return ['Data de início', 'Data de fim'];
  };

  const handleSave = async (values) => {
    // Extract vigência dates from range
    const [startDay, endDay] = values.vigenciaRange || [null, null];

    await saveMutation.mutateAsync({
      id_unidade,
      morning_start: values.morning_start,
      morning_end: values.morning_end,
      afternoon_start: values.afternoon_start,
      afternoon_end: values.afternoon_end,
      slot_duration: values.slot_duration, // Backend expects integer (minutes)
      // Add vigência fields (null if not provided)
      start_day: startDay ? startDay.format('YYYY-MM-DD') : null,
      end_day: endDay ? endDay.format('YYYY-MM-DD') : null,
    });
  };

  const handleDelete = async () => {
    Modal.confirm({
      title: 'Remover horários customizados?',
      content:
        'A unidade voltará a usar os horários padrão. Os agendamentos existentes não serão afetados.',
      okText: 'Sim, remover',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        await deleteMutation.mutateAsync();
      },
    });
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <ClockCircleOutlined />
          <span>Gerenciar Horários de Atendimento</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={700}
      destroyOnClose
    >
      {loadingTimeSlots ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <Paragraph type="secondary" style={{ marginTop: 16 }}>
            Carregando configuração...
          </Paragraph>
        </div>
      ) : (
        <>
          {/* Vigência status display */}
          {timeSlotsData?.slot_config && (
            <Alert
              message={
                timeSlotsData.slot_config.start_day && timeSlotsData.slot_config.end_day ? (
                  <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: '13px' }}>
                      Configuração Temporária (Vigência Ativa)
                    </Text>
                    <Text style={{ fontSize: '12px' }}>
                      Válida de {moment(timeSlotsData.slot_config.start_day).format('DD/MM/YYYY')}
                      {' até '}
                      {moment(timeSlotsData.slot_config.end_day).format('DD/MM/YYYY')}
                    </Text>
                  </Space>
                ) : (
                  <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: '13px' }}>
                      Configuração Permanente
                    </Text>
                    <Text style={{ fontSize: '12px' }}>
                      Válida indefinidamente (sem data de expiração)
                    </Text>
                  </Space>
                )
              }
              type={timeSlotsData.slot_config.start_day ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: 16, fontSize: '12px' }}
            />
          )}

          <Alert
            message="Configuração de Horários"
            description="Configure os horários de atendimento e duração de cada slot para esta unidade. Os horários padrão são: Manhã 08:00-12:00, Tarde 13:20-16:40, com slots de 40 minutos."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            disabled={saveMutation.isPending || deleteMutation.isPending}
          >
            <Divider orientation="left">Período da Manhã</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Horário de Início"
                  name="morning_start"
                  rules={[
                    { required: true, message: 'Campo obrigatório' },
                    { pattern: /^([01]\d|2[0-3]):([0-5]\d)$/, message: 'Formato inválido (HH:mm)' },
                  ]}
                >
                  <Input
                    style={{ width: '100%' }}
                    placeholder={getTimePlaceholder('morning_start', '08:00')}
                    size="large"
                    maxLength={5}
                    onChange={(e) => {
                      const formatted = formatTimeInput(e.target.value);
                      form.setFieldsValue({ morning_start: formatted });
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Horário de Término"
                  name="morning_end"
                  rules={[
                    { required: true, message: 'Campo obrigatório' },
                    { pattern: /^([01]\d|2[0-3]):([0-5]\d)$/, message: 'Formato inválido (HH:mm)' },
                  ]}
                >
                  <Input
                    style={{ width: '100%' }}
                    placeholder={getTimePlaceholder('morning_end', '12:00')}
                    size="large"
                    maxLength={5}
                    onChange={(e) => {
                      const formatted = formatTimeInput(e.target.value);
                      form.setFieldsValue({ morning_end: formatted });
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Período da Tarde</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Horário de Início"
                  name="afternoon_start"
                  rules={[
                    { required: true, message: 'Campo obrigatório' },
                    { pattern: /^([01]\d|2[0-3]):([0-5]\d)$/, message: 'Formato inválido (HH:mm)' },
                  ]}
                >
                  <Input
                    style={{ width: '100%' }}
                    placeholder={getTimePlaceholder('afternoon_start', '13:20')}
                    size="large"
                    maxLength={5}
                    onChange={(e) => {
                      const formatted = formatTimeInput(e.target.value);
                      form.setFieldsValue({ afternoon_start: formatted });
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Horário de Término"
                  name="afternoon_end"
                  rules={[
                    { required: true, message: 'Campo obrigatório' },
                    { pattern: /^([01]\d|2[0-3]):([0-5]\d)$/, message: 'Formato inválido (HH:mm)' },
                  ]}
                >
                  <Input
                    style={{ width: '100%' }}
                    placeholder={getTimePlaceholder('afternoon_end', '16:40')}
                    size="large"
                    maxLength={5}
                    onChange={(e) => {
                      const formatted = formatTimeInput(e.target.value);
                      form.setFieldsValue({ afternoon_end: formatted });
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Duração do Slot</Divider>
            <Form.Item
              label="Duração de cada slot (minutos)"
              name="slot_duration"
              rules={[
                { required: true, message: 'Campo obrigatório' },
                { type: 'number', min: 20, max: 60, message: 'Deve estar entre 20 e 60 minutos' },
              ]}
              extra="Duração de cada aula teste (padrão: 40 minutos)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={20}
                max={60}
                step={5}
                placeholder={getDurationPlaceholder()}
              />
            </Form.Item>

            <Divider orientation="left" style={{ fontSize: '14px', marginTop: 24 }}>
              Vigência (Opcional)
            </Divider>

            <Alert
              message="Configuração Temporária"
              description="Defina um período específico para esta configuração. Se deixar vazio, a configuração será válida indefinidamente."
              type="info"
              showIcon
              style={{ marginBottom: 16, fontSize: '12px' }}
            />

            <Form.Item
              label="Período de Vigência"
              name="vigenciaRange"
            >
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                placeholder={getDateRangePlaceholder()}
                size="large"
              />
            </Form.Item>

            <Divider />

            <Form.Item style={{ marginBottom: 0 }}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDelete}
                  disabled={!timeSlotsData?.slot_config}
                  loading={deleteMutation.isPending}
                >
                  Remover Horários
                </Button>

                <Space>
                  <Button onClick={handleCancel}>Cancelar</Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={saveMutation.isPending}
                  >
                    Salvar
                  </Button>
                </Space>
              </Space>
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
}
