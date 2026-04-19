/**
 * EventosDeleteBulkModal.jsx - Bulk Delete Events
 *
 * Modal for deleting multiple events at once.
 * Filters: date range (required), time range (optional).
 * Only deletes future events (cannot delete past or ongoing).
 */

import { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  DatePicker,
  TimePicker,
  Typography,
  Alert,
  Input,
  Space,
  Divider,
} from 'antd';
import {
  DeleteOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useDeleteEventsBulk } from '../../hooks/useEventos';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

export default function EventosDeleteBulkModal({ open, onCancel, type = null, onSuccess }) {
  const [form] = Form.useForm();
  const [confirmText, setConfirmText] = useState('');
  const deleteEventsBulkMutation = useDeleteEventsBulk();

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields();
      setConfirmText('');
      // Set default date range: tomorrow to 2 weeks from now
      form.setFieldsValue({
        dateRange: [dayjs().add(1, 'day'), dayjs().add(14, 'day')],
      });
    }
  }, [open, form]);

  const handleSubmit = async () => {
    if (confirmText !== 'excluir') {
      return;
    }

    try {
      const values = await form.validateFields();

      const payload = {
        type,
        date_start: values.dateRange[0].format('YYYY-MM-DD'),
        date_end: values.dateRange[1].format('YYYY-MM-DD'),
        confirmation: 'excluir',
      };

      // Add time range if specified
      if (values.timeRange && values.timeRange[0] && values.timeRange[1]) {
        payload.time_start = values.timeRange[0].format('HH:mm');
        payload.time_end = values.timeRange[1].format('HH:mm');
      }

      await deleteEventsBulkMutation.mutateAsync(payload);
      setConfirmText('');
      onSuccess?.();
      onCancel();
    } catch (error) {
      // Validation or API errors handled by the hook
    }
  };

  const handleCancel = () => {
    setConfirmText('');
    form.resetFields();
    onCancel();
  };

  // Disable dates in the past
  const disabledDate = (current) => {
    return current && current < dayjs().startOf('day');
  };

  return (
    <Modal
      title={
        <Space>
          <DeleteOutlined style={{ color: '#ff4d4f' }} />
          <span>Excluir Eventos em Massa</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit}
      okText="Excluir Eventos"
      cancelText="Cancelar"
      okButtonProps={{
        danger: true,
        disabled: confirmText !== 'excluir',
        loading: deleteEventsBulkMutation.isPending,
        icon: <DeleteOutlined />,
      }}
      width={500}
    >
      <Alert
        type="warning"
        icon={<ExclamationCircleOutlined />}
        message="Atenção"
        description={
          <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
            <li>Esta ação irá excluir permanentemente os eventos selecionados</li>
            <li>Todas as inscrições de candidatos serão canceladas</li>
            <li>Os eventos do Google Calendar serão removidos</li>
            <li>Apenas eventos futuros podem ser excluídos</li>
          </ul>
        }
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          name="dateRange"
          label={
            <Space>
              <CalendarOutlined />
              <span>Intervalo de Datas</span>
            </Space>
          }
          rules={[{ required: true, message: 'Selecione o intervalo de datas' }]}
        >
          <RangePicker
            format="DD/MM/YYYY"
            disabledDate={disabledDate}
            style={{ width: '100%' }}
            placeholder={['Data inicial', 'Data final']}
          />
        </Form.Item>

        <Form.Item
          name="timeRange"
          label={
            <Space>
              <ClockCircleOutlined />
              <span>Intervalo de Horários (opcional)</span>
            </Space>
          }
          extra="Deixe em branco para excluir todos os horários do período"
        >
          <TimePicker.RangePicker
            format="HH:mm"
            minuteStep={30}
            style={{ width: '100%' }}
            placeholder={['Hora inicial', 'Hora final']}
          />
        </Form.Item>
      </Form>

      <Divider />

      <div style={{ marginBottom: 16 }}>
        <Text strong>Confirme a exclusão</Text>
        <br />
        <Text type="secondary">
          Digite <Text code>excluir</Text> para confirmar:
        </Text>
      </div>

      <Input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="Digite 'excluir'"
        status={confirmText && confirmText !== 'excluir' ? 'error' : undefined}
      />
    </Modal>
  );
}
