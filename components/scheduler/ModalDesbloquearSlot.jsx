/**
 * ModalDesbloquearSlot Component
 *
 * Modal for releasing a slot block (unblocking a time range across multiple days).
 *
 * Features:
 * - Select date range (date_start to date_end)
 * - Select time range (time_start to time_end)
 * - Uses useReleaseBlock hook (POST /schedule-block/release)
 *
 * Props:
 * @param {boolean} open - Whether modal is visible
 * @param {Function} onCancel - Callback when modal is closed
 * @param {number} id_unidade - Unit ID
 * @param {string} unidadeName - Unit name (for display)
 */

import { useEffect } from 'react';
import { Modal, Space, Typography, Button, Alert, message, Form, DatePicker, Input } from 'antd';
import { UnlockOutlined } from '@ant-design/icons';
import moment from 'moment';
import 'moment/locale/pt-br';
import { useReleaseBlock } from '../../hooks/useScheduleBlocks';

const { Text } = Typography;

moment.locale('pt-br');

export default function ModalDesbloquearSlot({ open, onCancel, id_unidade, unidadeName }) {
  const [form] = Form.useForm();

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  // Mutation for releasing slot block
  const releaseMutation = useReleaseBlock(id_unidade);

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
    const { releaseDateRange, timeStart, timeEnd } = values;

    // Validate date range
    if (!releaseDateRange || releaseDateRange.length !== 2) {
      message.warning('Selecione o periodo do desbloqueio (inicio e fim)');
      return;
    }

    const [startDate, endDate] = releaseDateRange;

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
      date_start: startDate.format('YYYY-MM-DD'),
      date_end: endDate.format('YYYY-MM-DD'),
      time_start: timeStart,
      time_end: timeEnd,
    };

    try {
      await releaseMutation.mutateAsync(payload);
      message.success(`Horario desbloqueado com sucesso! ${daysCount} dia(s) afetado(s).`);
      form.resetFields();
      onCancel();
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao desbloquear horario';
      message.error(errorMessage);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <UnlockOutlined style={{ color: '#52c41a' }} />
          <span>Desbloquear Horario</span>
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
          message="Desbloquear Intervalo de Horario"
          description={
            <Space direction="vertical" size={4}>
              <Text>
                Libere um intervalo de horario (de-ate) que foi previamente bloqueado durante um{' '}
                <strong>periodo de dias</strong>. Os horarios voltarao a ficar disponiveis para agendamento.
              </Text>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Exemplo: Desbloquear das 08:00 as 17:00 de 15/11 a 18/11 (4 dias)
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
            label="Periodo do Desbloqueio"
            name="releaseDateRange"
            rules={[{ required: true, message: 'Selecione o periodo' }]}
          >
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder={['Data de inicio', 'Data de fim']}
              size="large"
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

          {/* Footer Buttons */}
          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={handleModalClose} disabled={releaseMutation.isPending}>
                Cancelar
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<UnlockOutlined />}
                loading={releaseMutation.isPending}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Desbloquear Horario
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
}
