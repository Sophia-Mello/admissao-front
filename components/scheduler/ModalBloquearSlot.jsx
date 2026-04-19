/**
 * ModalBloquearSlot Component
 *
 * Modal for creating a new slot block (blocking a time range across multiple days).
 *
 * Features:
 * - Select date range (start_day to end_day)
 * - Select time range (blocked_start_at to blocked_end_at)
 * - Reason textarea
 * - Uses useCreateScheduleBlock hook
 * - Can be pre-filled with initialSlotData from clicking on a specific slot
 *
 * Props:
 * @param {boolean} open - Whether modal is visible
 * @param {Function} onCancel - Callback when modal is closed
 * @param {number} id_unidade - Unit ID
 * @param {string} unidadeName - Unit name (for display)
 * @param {Object} initialSlotData - Optional pre-fill data { date, start_at, end_at }
 */

import { useEffect } from 'react';
import { Modal, Space, Typography, Button, Alert, message, Form, DatePicker, Input } from 'antd';
import { StopOutlined } from '@ant-design/icons';
import moment from 'moment';
import 'moment/locale/pt-br';
import { useCreateScheduleBlock } from '../../hooks/useScheduleBlocks';

const { Text } = Typography;
const { TextArea } = Input;

moment.locale('pt-br');

export default function ModalBloquearSlot({ open, onCancel, id_unidade, unidadeName, initialSlotData }) {
  const [form] = Form.useForm();

  // Pre-fill form when initialSlotData is provided
  useEffect(() => {
    if (open && initialSlotData) {
      const { date, start_at, end_at } = initialSlotData;

      // Parse times from ISO or HH:mm format
      const parseTime = (timeStr) => {
        if (!timeStr) return null;
        if (timeStr.includes('T')) {
          return moment(timeStr).format('HH:mm');
        }
        return timeStr.slice(0, 5);
      };

      // Set form values
      if (date) {
        const dateMoment = moment(date);
        form.setFieldsValue({
          blockDateRange: [dateMoment, dateMoment], // Same date for single slot
          timeStart: parseTime(start_at),
          timeEnd: parseTime(end_at),
        });
      }
    } else if (open && !initialSlotData) {
      form.resetFields();
    }
  }, [open, initialSlotData, form]);

  // Mutation for creating slot block
  const createBlockMutation = useCreateScheduleBlock(id_unidade);

  const handleModalClose = () => {
    form.resetFields();
    onCancel();
  };

  // Auto-format time input (HH:mm)
  const formatTimeInput = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) {
      return cleaned;
    }
    return cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
  };

  const handleSubmit = async (values) => {
    const { blockDateRange, timeStart, timeEnd, reason } = values;

    // Validate date range
    if (!blockDateRange || blockDateRange.length !== 2) {
      message.warning('Selecione o periodo do bloqueio (inicio e fim)');
      return;
    }

    const [startDate, endDate] = blockDateRange;

    // Validate times
    if (!timeStart || !timeEnd) {
      message.warning('Digite o horario inicial e final (Ex: 08:00)');
      return;
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(timeStart) || !timeRegex.test(timeEnd)) {
      message.error('Horario invalido. Use o formato HH:mm (Ex: 08:00)');
      return;
    }

    // Validate end > start
    if (timeEnd <= timeStart) {
      message.error('Horario final deve ser maior que o horario inicial');
      return;
    }

    // Calculate days count
    const daysCount = endDate.diff(startDate, 'days') + 1;

    const payload = {
      id_unidade,
      block_from: startDate.format('YYYY-MM-DD'),
      block_until: endDate.format('YYYY-MM-DD'),
      blocked_start_at: timeStart,
      blocked_end_at: timeEnd,
      reason: reason || null,
    };

    try {
      await createBlockMutation.mutateAsync(payload);
      message.success(`Horario bloqueado com sucesso! ${daysCount} dia(s) afetado(s).`);
      form.resetFields();
      onCancel();
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao bloquear horario';
      message.error(errorMessage);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <StopOutlined style={{ color: '#ff4d4f' }} />
          <span>Bloquear Horario</span>
        </Space>
      }
      open={open}
      onCancel={handleModalClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* Info Alert */}
        <Alert
          message="Bloquear Intervalo de Horario"
          description={
            <Space direction="vertical" size={4}>
              <Text>
                Bloqueie um intervalo de horario (de-ate) para impedir agendamentos durante um{' '}
                <strong>periodo de dias</strong>. Isso e util para feriados prolongados, manutencao
                ou eventos especiais.
              </Text>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Exemplo: Bloquear das 08:00 as 17:00 de 15/11 a 18/11 (4 dias)
              </Text>
              {unidadeName && <Text strong>Unidade: {unidadeName}</Text>}
            </Space>
          }
          type="info"
          showIcon
          style={{ fontSize: '12px' }}
        />

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {/* Date Range Picker */}
          <Form.Item
            label="Periodo do Bloqueio"
            name="blockDateRange"
            rules={[{ required: true, message: 'Selecione o periodo' }]}
          >
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder={['Data de inicio', 'Data de fim']}
              size="large"
              disabledDate={(current) => {
                // Disable dates before today
                return current && current < moment().startOf('day');
              }}
            />
          </Form.Item>

          {/* Time Range */}
          <Form.Item
            label="Horario Inicial (De)"
            name="timeStart"
            rules={[{ required: true, message: 'Digite o horario inicial' }]}
          >
            <Input
              style={{ width: '100%' }}
              placeholder="Ex: 08:00"
              size="large"
              maxLength={5}
              onChange={(e) => {
                const formatted = formatTimeInput(e.target.value);
                form.setFieldsValue({ timeStart: formatted });
              }}
            />
          </Form.Item>

          <Form.Item
            label="Horario Final (Ate)"
            name="timeEnd"
            rules={[{ required: true, message: 'Digite o horario final' }]}
          >
            <Input
              style={{ width: '100%' }}
              placeholder="Ex: 17:00"
              size="large"
              maxLength={5}
              onChange={(e) => {
                const formatted = formatTimeInput(e.target.value);
                form.setFieldsValue({ timeEnd: formatted });
              }}
            />
          </Form.Item>

          {/* Reason */}
          <Form.Item label="Motivo (Opcional)" name="reason">
            <TextArea
              rows={3}
              placeholder="Ex: Ferias do coordenador, Evento especial, Manutencao..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          {/* Warning Alert */}
          <Alert
            message="Importante"
            description="Se ja existir um agendamento em qualquer dia deste periodo, o bloqueio falhara. Voce precisara cancelar os agendamentos conflitantes primeiro."
            type="warning"
            showIcon
            style={{ fontSize: '12px' }}
          />

          {/* Footer Buttons */}
          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={handleModalClose} disabled={createBlockMutation.isPending}>
                Cancelar
              </Button>
              <Button
                type="primary"
                danger
                htmlType="submit"
                icon={<StopOutlined />}
                loading={createBlockMutation.isPending}
              >
                Bloquear Horario
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
}
