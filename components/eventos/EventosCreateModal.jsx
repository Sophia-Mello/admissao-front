/**
 * EventosCreateModal.jsx - Bulk Event Creation Modal
 *
 * Modal for creating events in bulk with:
 * - Date range selection
 * - Time range configuration
 * - Number of rooms
 * - Capacity per room
 * - Automatic Meet link generation
 */

import { useState } from 'react';
import {
  Modal,
  Form,
  DatePicker,
  TimePicker,
  InputNumber,
  Select,
  Button,
  Space,
  Alert,
  Typography,
  Divider,
  Row,
  Col,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCreateEventsBulk } from '../../hooks/useEventos';
import { useEventTypes } from '../../hooks/useEventTypes';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

export default function EventosCreateModal({ open, onCancel, onSuccess, defaultType = null }) {
  // Fetch dynamic event types
  const { eventTypes, isLoading: loadingEventTypes } = useEventTypes(open);
  const [form] = Form.useForm();
  const [previewData, setPreviewData] = useState(null);
  const createEventsMutation = useCreateEventsBulk();

  const handleValuesChange = () => {
    const values = form.getFieldsValue();
    if (
      values.dateRange?.length === 2 &&
      values.timeRange?.length === 2 &&
      values.duration_minutes &&
      values.rooms_count &&
      values.capacity_per_room
    ) {
      calculatePreview(values);
    } else {
      setPreviewData(null);
    }
  };

  const calculatePreview = (values) => {
    const dateStart = values.dateRange[0];
    const dateEnd = values.dateRange[1];
    const timeStart = values.timeRange[0];
    const timeEnd = values.timeRange[1];
    const duration = values.duration_minutes;

    // Calculate number of days (including all days)
    let days = 0;
    let current = dateStart.clone();
    while (current.isBefore(dateEnd) || current.isSame(dateEnd, 'day')) {
      days++;
      current = current.add(1, 'day');
    }

    // Calculate slots per day
    const startMinutes = timeStart.hour() * 60 + timeStart.minute();
    const endMinutes = timeEnd.hour() * 60 + timeEnd.minute();
    const totalMinutes = endMinutes - startMinutes;
    const slotsPerDay = Math.floor(totalMinutes / duration);

    // Total events = days × slots × rooms
    const totalEvents = days * slotsPerDay * values.rooms_count;
    const totalCapacity = totalEvents * values.capacity_per_room;

    setPreviewData({
      days,
      slotsPerDay,
      rooms: values.rooms_count,
      totalEvents,
      totalCapacity,
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        type: values.type,
        date_start: values.dateRange[0].format('YYYY-MM-DD'),
        date_end: values.dateRange[1].format('YYYY-MM-DD'),
        time_start: values.timeRange[0].format('HH:mm'),
        time_end: values.timeRange[1].format('HH:mm'),
        duration_minutes: values.duration_minutes,
        rooms_count: values.rooms_count,
        capacity_per_room: values.capacity_per_room,
      };

      const result = await createEventsMutation.mutateAsync(payload);

      form.resetFields();
      setPreviewData(null);
      onSuccess?.(result);
      onCancel();
    } catch (error) {
      // Form validation or mutation error - handled by hook
      console.error('Error creating events:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setPreviewData(null);
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <CalendarOutlined />
          <span>Criar Eventos em Massa</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancelar
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={createEventsMutation.isPending}
          onClick={handleSubmit}
          disabled={!previewData}
        >
          Criar {previewData?.totalEvents || 0} Eventos
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        initialValues={{
          type: defaultType,
          duration_minutes: 60,
          rooms_count: 3,
          capacity_per_room: 30,
        }}
      >
        <Form.Item
          name="type"
          label="Tipo de Evento"
          rules={[{ required: true, message: 'Selecione o tipo de evento' }]}
        >
          <Select
            loading={loadingEventTypes}
            options={eventTypes.map((et) => ({
              label: et.display_name,
              value: et.code,
            }))}
          />
        </Form.Item>

        <Divider orientation="left">
          <CalendarOutlined /> Período
        </Divider>

        <Form.Item
          name="dateRange"
          label="Intervalo de Datas"
          rules={[{ required: true, message: 'Selecione o intervalo de datas' }]}
        >
          <RangePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </Form.Item>

        <Divider orientation="left">
          <ClockCircleOutlined /> Horários
        </Divider>

        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="timeRange"
              label="Horário de Funcionamento"
              rules={[{ required: true, message: 'Selecione o horário' }]}
            >
              <TimePicker.RangePicker
                style={{ width: '100%' }}
                format="HH:mm"
                minuteStep={30}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="duration_minutes"
              label="Duração (min)"
              rules={[{ required: true, message: 'Informe a duração' }]}
            >
              <InputNumber min={30} max={180} step={30} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">
          <TeamOutlined /> Salas e Capacidade
        </Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="rooms_count"
              label="Número de Salas"
              rules={[{ required: true, message: 'Informe o número de salas' }]}
            >
              <InputNumber min={1} max={10} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="capacity_per_room"
              label="Capacidade por Sala"
              rules={[{ required: true, message: 'Informe a capacidade' }]}
            >
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        {previewData && (
          <Alert
            type="info"
            showIcon
            icon={<VideoCameraOutlined />}
            message="Resumo da Criação"
            description={
              <Space direction="vertical" size={0}>
                <Text>
                  <strong>{previewData.days}</strong> dias
                </Text>
                <Text>
                  <strong>{previewData.slotsPerDay}</strong> horários por dia
                </Text>
                <Text>
                  <strong>{previewData.rooms}</strong> salas por horário
                </Text>
                <Divider style={{ margin: '8px 0' }} />
                <Text strong>
                  Total: {previewData.totalEvents} eventos | {previewData.totalCapacity} vagas
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Cada sala terá um link do Google Meet gerado automaticamente
                </Text>
              </Space>
            }
            style={{ marginTop: 16 }}
          />
        )}
      </Form>
    </Modal>
  );
}
