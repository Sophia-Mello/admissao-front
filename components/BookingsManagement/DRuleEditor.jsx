// components/BookingsManagement/DRuleEditor.jsx

import { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Button,
  Space,
  Alert,
  Spin,
  message,
  Typography,
  Divider,
  DatePicker,
} from 'antd';
import { SettingOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDRule, saveDRule, deleteDRule } from '../../lib/services/bookingsManagementService';
import moment from 'moment';

const { Text, Paragraph } = Typography;

/**
 * DRuleEditor Component
 *
 * Modal for managing d_rule (min/max days advance) for a unit.
 *
 * Features:
 * - Fetch current d_rule (if exists)
 * - Edit min_days_advance and max_days_advance
 * - Save (create/update) d_rule
 * - Delete d_rule (revert to default d+1)
 *
 * Business Rules:
 * - min_days_advance: Minimum days in advance (default: 1)
 * - max_days_advance: Maximum days in advance (default: 1)
 * - min <= max validation
 * - If no custom rule: shows default (1, 1)
 */
export default function DRuleEditor({ open, onCancel, id_unidade }) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Fetch current d_rule
  const { data: dRuleData, isLoading: loadingDRule } = useQuery({
    queryKey: ['d-rule', id_unidade],
    queryFn: () => getDRule(id_unidade),
    enabled: open && !!id_unidade,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: saveDRule,
    onSuccess: () => {
      queryClient.invalidateQueries(['d-rule', id_unidade]);
      message.success('Regra salva com sucesso!');
      onCancel();
    },
    onError: (error) => {
      const errorMsg =
        error.response?.data?.error || error.message || 'Erro ao salvar regra';
      message.error(errorMsg);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteDRule(id_unidade),
    onSuccess: () => {
      queryClient.invalidateQueries(['d-rule', id_unidade]);
      message.success('Regra removida. A unidade voltará a usar a regra padrão (d+1)');
      onCancel();
    },
    onError: (error) => {
      const errorMsg =
        error.response?.data?.error || error.message || 'Erro ao remover regra';
      message.error(errorMsg);
    },
  });

  // Always keep form blank - user fills based on placeholders
  useEffect(() => {
    form.resetFields();
  }, [dRuleData, form]);

  // Dynamic placeholders showing current values
  const getPlaceholder = (field, defaultValue) => {
    if (dRuleData?.d_rule && dRuleData.d_rule[field] !== null && dRuleData.d_rule[field] !== undefined) {
      return `${dRuleData.d_rule[field]} (atual)`;
    }
    return `${defaultValue} (padrão)`;
  };

  const getDateRangePlaceholder = () => {
    if (dRuleData?.d_rule && dRuleData.d_rule.start_day && dRuleData.d_rule.end_day) {
      const start = moment(dRuleData.d_rule.start_day).format('DD/MM/YYYY');
      const end = moment(dRuleData.d_rule.end_day).format('DD/MM/YYYY');
      return [`${start} (atual)`, `${end} (atual)`];
    }
    return ['Data de início', 'Data de fim'];
  };

  const handleSave = async (values) => {
    // Extract vigência dates from range
    const [startDay, endDay] = values.vigenciaRange || [null, null];

    await saveMutation.mutateAsync({
      id_unidade,
      d_rule_start: values.min_days_advance,
      d_rule_end: values.max_days_advance,
      // Add vigência fields (null if not provided)
      start_day: startDay ? startDay.format('YYYY-MM-DD') : null,
      end_day: endDay ? endDay.format('YYYY-MM-DD') : null,
    });
  };

  const handleDelete = async () => {
    Modal.confirm({
      title: 'Remover regra customizada?',
      content:
        'A unidade voltará a usar a regra padrão (d+1). Os agendamentos existentes não serão afetados.',
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
          <SettingOutlined />
          <span>Gerenciar Regras de Agendamento</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      {loadingDRule ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <Paragraph type="secondary" style={{ marginTop: 16 }}>
            Carregando configuração...
          </Paragraph>
        </div>
      ) : (
        <>
          {/* Vigência status display */}
          {dRuleData?.d_rule && (
            <Alert
              message={
                dRuleData.d_rule.start_day && dRuleData.d_rule.end_day ? (
                  <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: '13px' }}>
                      Regra Temporária (Vigência Ativa)
                    </Text>
                    <Text style={{ fontSize: '12px' }}>
                      Válida de {moment(dRuleData.d_rule.start_day).format('DD/MM/YYYY')}
                      {' até '}
                      {moment(dRuleData.d_rule.end_day).format('DD/MM/YYYY')}
                    </Text>
                  </Space>
                ) : (
                  <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: '13px' }}>
                      Regra Permanente
                    </Text>
                    <Text style={{ fontSize: '12px' }}>
                      Válida indefinidamente (sem data de expiração)
                    </Text>
                  </Space>
                )
              }
              type={dRuleData.d_rule.start_day ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: 16, fontSize: '12px' }}
            />
          )}

          <Alert
            message="Regra d+N (Days Advance)"
            description="Configure quantos dias de antecedência os candidatos podem agendar aulas teste nesta unidade. A regra padrão é d+1 a d+4 (amanhã até 4 dias)."
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
            <Form.Item
              label="Mínimo de dias de antecedência"
              name="min_days_advance"
              rules={[
                { required: true, message: 'Campo obrigatório' },
                { type: 'number', min: 0, message: 'Deve ser >= 0' },
              ]}
              extra="Dias mínimos de antecedência para agendar (0 = pode agendar hoje)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={30}
                placeholder={getPlaceholder('d_rule_start', 1)}
              />
            </Form.Item>

            <Form.Item
              label="Máximo de dias de antecedência"
              name="max_days_advance"
              rules={[
                { required: true, message: 'Campo obrigatório' },
                { type: 'number', min: 1, message: 'Deve ser >= 1' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const minDays = getFieldValue('min_days_advance');
                    if (!value || value >= minDays) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error('Máximo deve ser >= mínimo')
                    );
                  },
                }),
              ]}
              extra="Dias máximos de antecedência para agendar"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={30}
                placeholder={getPlaceholder('d_rule_end', 4)}
              />
            </Form.Item>

            {/* Vigência section */}
            <Divider orientation="left" style={{ fontSize: '14px', marginTop: 24 }}>
              Vigência (Opcional)
            </Divider>

            <Alert
              message="Regra Temporária"
              description="Defina um período específico para esta regra. Se deixar vazio, a regra será válida indefinidamente."
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
                  disabled={!dRuleData?.d_rule}
                  loading={deleteMutation.isPending}
                >
                  Remover Regra
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
