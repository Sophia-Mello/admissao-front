/**
 * DRuleEditor Component
 *
 * Modal for managing d_rule (min/max days advance) for a unit.
 *
 * Features:
 * - Fetch current d_rule (if exists)
 * - Edit d_rule_start and d_rule_end
 * - Save uses useSaveScheduleConfig
 * - Restore to global config (for unit-specific config)
 *
 * Business Rules:
 * - d_rule_start: Minimum days in advance (default: 1)
 * - d_rule_end: Maximum days in advance (default: 4)
 * - d_rule_start <= d_rule_end validation
 * - If no custom rule: shows default (1, 4)
 */

import { useEffect } from 'react';
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
} from 'antd';
import { HourglassOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import {
  useScheduleConfig,
  useSaveScheduleConfig,
  useGlobalConfig,
  useRestoreToGlobal,
} from '../../hooks/useScheduleConfig';

const { Paragraph, Text } = Typography;

export default function DRuleEditor({ open, onCancel, id_unidade }) {
  const [form] = Form.useForm();

  // Determine if this is global config (id_unidade is null)
  const isGlobal = id_unidade === null;

  // Fetch current schedule config
  const { data: configData, isLoading: loadingConfig } = useScheduleConfig(id_unidade);

  // Fetch global config (for restore functionality)
  const { data: globalConfig } = useGlobalConfig({ enabled: !isGlobal && open });

  // Mutations
  const saveMutation = useSaveScheduleConfig(id_unidade);
  const restoreMutation = useRestoreToGlobal(id_unidade);

  // Reset form when data changes
  useEffect(() => {
    form.resetFields();
  }, [configData, form, open]);

  // Dynamic placeholders showing current values
  const getPlaceholder = (field, defaultValue) => {
    if (configData && configData[field] !== null && configData[field] !== undefined) {
      return `${configData[field]} (atual)`;
    }
    return `${defaultValue} (padrao)`;
  };

  const handleSave = async (values) => {
    try {
      await saveMutation.mutateAsync({
        id_unidade,
        d_rule_start: values.d_rule_start,
        d_rule_end: values.d_rule_end,
      });

      message.success('Regra salva com sucesso!');
      onCancel();
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Erro ao salvar regra';
      message.error(errorMsg);
    }
  };

  // Get global rule values for restore display
  const getGlobalRuleValues = () => ({
    'Antecedência Mínima': globalConfig?.d_rule_start !== null && globalConfig?.d_rule_start !== undefined
      ? `${globalConfig.d_rule_start} dia(s)`
      : '1 dia (padrão)',
    'Antecedência Máxima': globalConfig?.d_rule_end !== null && globalConfig?.d_rule_end !== undefined
      ? `${globalConfig.d_rule_end} dia(s)`
      : '4 dias (padrão)',
  });

  const handleRestore = () => {
    const globalValues = getGlobalRuleValues();

    Modal.confirm({
      title: 'Restaurar para configuracao global?',
      content: (
        <div>
          <Paragraph>As regras de antecedência serão restauradas para os valores globais:</Paragraph>
          {Object.entries(globalValues).map(([label, value]) => (
            <div key={label}>
              <Text type="secondary">{label}:</Text> <Text strong>{value}</Text>
            </div>
          ))}
        </div>
      ),
      okText: 'Restaurar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await restoreMutation.mutateAsync({
            fields: ['d_rule_start', 'd_rule_end'],
          });
          message.success('Antecedência restaurada para os valores globais!');
          onCancel();
        } catch (error) {
          const errorMsg = error.response?.data?.error || error.message || 'Erro ao restaurar';
          message.error(errorMsg);
        }
      },
    });
  };

  const handleModalClose = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <HourglassOutlined />
          <span>Gerenciar Antecedência</span>
        </Space>
      }
      open={open}
      onCancel={handleModalClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      {loadingConfig ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <Paragraph type="secondary" style={{ marginTop: 16 }}>
            Carregando configuracao...
          </Paragraph>
        </div>
      ) : (
        <>
          <Alert
            message={isGlobal ? 'Configuracao Global' : 'Configuracao da Unidade'}
            description="Configure quantos dias de antecedência os candidatos podem agendar aulas teste. A regra padrao e d+1 a d+4 (amanha ate 4 dias)."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            disabled={saveMutation.isPending || restoreMutation.isPending}
          >
            <Form.Item
              label="Minimo de dias de antecedencia"
              name="d_rule_start"
              rules={[
                { required: true, message: 'Campo obrigatorio' },
                { type: 'number', min: 0, message: 'Deve ser >= 0' },
              ]}
              extra="Dias minimos de antecedencia para agendar (0 = pode agendar hoje)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={30}
                placeholder={getPlaceholder('d_rule_start', 1)}
              />
            </Form.Item>

            <Form.Item
              label="Maximo de dias de antecedencia"
              name="d_rule_end"
              rules={[
                { required: true, message: 'Campo obrigatorio' },
                { type: 'number', min: 1, message: 'Deve ser >= 1' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const minDays = getFieldValue('d_rule_start');
                    if (!value || value >= minDays) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Maximo deve ser >= minimo'));
                  },
                }),
              ]}
              extra="Dias maximos de antecedencia para agendar"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={30}
                placeholder={getPlaceholder('d_rule_end', 4)}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                {!isGlobal ? (
                  <Button
                    icon={<UndoOutlined />}
                    onClick={handleRestore}
                    loading={restoreMutation.isPending}
                  >
                    Restaurar para Global
                  </Button>
                ) : (
                  <div />
                )}

                <Space>
                  <Button onClick={handleModalClose}>Cancelar</Button>
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
