// components/BookingsManagement/ModalBloquearSlot.jsx

import { useState } from 'react';
import { Modal, Space, Typography, Button, Alert, message, Form, DatePicker, Input } from 'antd';
import { StopOutlined, CalendarOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import 'moment/locale/pt-br';
import { createSlotBlock } from '../../lib/services/bookingsManagementService';

const { Title, Text } = Typography;

moment.locale('pt-br');

/**
 * ModalBloquearSlot Component
 *
 * Modal for creating a new slot block (blocking a time range across multiple days).
 *
 * Features:
 * - Select date range (start_day to end_day)
 * - Select time range (blocked_start_at to blocked_end_at)
 * - Validation: time format HH:mm, end > start
 * - API call to createSlotBlock with start_day/end_day (BREAKING: no longer uses block_date)
 * - Shows days count in success message
 *
 * Props:
 * @param {boolean} open - Whether modal is visible
 * @param {Function} onCancel - Callback when modal is closed
 * @param {number} id_unidade - Unit ID
 * @param {number} id_job_unidade - Job unit ID
 * @param {string} unidadeName - Unit name (for display)
 */
export default function ModalBloquearSlot({ open, onCancel, id_unidade, id_job_unidade, unidadeName }) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const handleModalClose = () => {
    form.resetFields();
    onCancel();
  };

  // Mutation for creating slot block
  const blockMutation = useMutation({
    mutationFn: (payload) => createSlotBlock(payload),
    onSuccess: (data) => {
      const daysCount = data.blocked_range?.days_blocked || 1;
      message.success(`Horário bloqueado com sucesso! ${daysCount} dia(s) afetado(s).`);
      queryClient.invalidateQueries(['weekly-slots']);
      queryClient.invalidateQueries(['availability']);
      queryClient.invalidateQueries(['slot-blocks']);
      form.resetFields();
      onCancel();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao bloquear horário';
      message.error(errorMessage);
    },
  });

  // Auto-format time input (HH:mm)
  const formatTimeInput = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) {
      return cleaned;
    }
    return cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
  };

  const handleSubmit = async (values) => {
    const { blockDateRange, timeStart, timeEnd } = values;

    // NEW: Extract start_day and end_day from range
    if (!blockDateRange || blockDateRange.length !== 2) {
      message.warning('Selecione o período do bloqueio (início e fim)');
      return;
    }

    const [startDate, endDate] = blockDateRange;

    if (!timeStart || !timeEnd) {
      message.warning('Digite o horário inicial e final (Ex: 08:00)');
      return;
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(timeStart) || !timeRegex.test(timeEnd)) {
      message.error('Horário inválido. Use o formato HH:mm (Ex: 08:00)');
      return;
    }

    // Validate end > start
    if (timeEnd <= timeStart) {
      message.error('Horário final deve ser maior que o horário inicial');
      return;
    }

    // NEW: Calculate days count for user feedback
    const daysCount = endDate.diff(startDate, 'days') + 1; // +1 to include both start and end

    const payload = {
      id_unidade,
      start_day: startDate.format('YYYY-MM-DD'),  // NEW: Required field
      end_day: endDate.format('YYYY-MM-DD'),      // NEW: Required field
      blocked_start_at: timeStart,
      blocked_end_at: timeEnd,
    };

    console.log(`[ModalBloquearSlot] Blocking ${daysCount} days:`, payload);

    blockMutation.mutate(payload);
  };

  return (
    <Modal
      title={
        <Space>
          <StopOutlined style={{ color: '#ff4d4f' }} />
          <span>Bloquear Horário</span>
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
          message="Bloquear Intervalo de Horário"
          description={
            <Space direction="vertical" size={4}>
              <Text>
                Bloqueie um intervalo de horário (de-até) para impedir agendamentos durante um <strong>período de dias</strong>.
                Isso é útil para feriados prolongados, manutenção ou eventos especiais.
              </Text>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Exemplo: Bloquear das 08:00 às 17:00 de 15/11 a 18/11 (4 dias)
              </Text>
              {unidadeName && (
                <Text strong>Unidade: {unidadeName}</Text>
              )}
            </Space>
          }
          type="info"
          showIcon
          style={{ fontSize: '12px' }}
        />

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {/* Date Range Picker */}
          <Form.Item
            label="Período do Bloqueio"
            name="blockDateRange"
            rules={[{ required: true, message: 'Selecione o período' }]}
          >
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder={['Data de início', 'Data de fim']}
              size="large"
              disabledDate={(current) => {
                // Disable dates before today
                return current && current < moment().startOf('day');
              }}
            />
          </Form.Item>

          {/* Time Range */}
          <Form.Item
            label="Horário Inicial (De)"
            name="timeStart"
            rules={[{ required: true, message: 'Digite o horário inicial' }]}
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
            label="Horário Final (Até)"
            name="timeEnd"
            rules={[{ required: true, message: 'Digite o horário final' }]}
          >
            <Input
              style={{ width: '100%' }}
              placeholder="Ex: 09:00"
              size="large"
              maxLength={5}
              onChange={(e) => {
                const formatted = formatTimeInput(e.target.value);
                form.setFieldsValue({ timeEnd: formatted });
              }}
            />
          </Form.Item>

          {/* Warning Alert */}
          <Alert
            message="Importante"
            description="Se já existir um agendamento em qualquer dia deste período, o bloqueio falhará. Você precisará cancelar os agendamentos conflitantes primeiro."
            type="warning"
            showIcon
            style={{ fontSize: '12px' }}
          />

          {/* Footer Buttons */}
          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={handleModalClose} disabled={blockMutation.isPending}>
                Cancelar
              </Button>
              <Button
                type="primary"
                danger
                htmlType="submit"
                icon={<StopOutlined />}
                loading={blockMutation.isPending}
              >
                Bloquear Horário
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
}
