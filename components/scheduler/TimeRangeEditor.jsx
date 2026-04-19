/**
 * TimeRangeEditor Component
 *
 * Modal for managing time slots configuration for a unit.
 *
 * Features:
 * - Fetch current time slots (if exists)
 * - Edit morning start/end times
 * - Edit afternoon start/end times
 * - Save uses useSaveScheduleConfig
 * - Restore to global config (for unit-specific config)
 *
 * Business Rules:
 * - Morning: start < end
 * - Afternoon: start < end
 * - Times in HH:mm format
 *
 * Note: slot_duration is now managed by DuracaoEditor
 */

import { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Alert,
  Spin,
  message,
  Typography,
  Divider,
  Row,
  Col,
} from 'antd';
import { ClockCircleOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import {
  useScheduleConfig,
  useSaveScheduleConfig,
  useGlobalConfig,
  useRestoreToGlobal,
} from '../../hooks/useScheduleConfig';

const { Paragraph, Text } = Typography;

export default function TimeRangeEditor({ open, onCancel, id_unidade }) {
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

  // Auto-format time input (HH:mm)
  const formatTimeInput = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) {
      return cleaned;
    }
    return cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
  };

  // Helper to ensure HH:mm format (truncate seconds if present)
  const ensureHHMM = (time) => {
    if (!time) return null;
    return time.slice(0, 5);
  };

  // Dynamic placeholders showing current values
  const getTimePlaceholder = (field, defaultValue) => {
    if (configData && configData[field]) {
      return `${ensureHHMM(configData[field])} (atual)`;
    }
    return `${defaultValue} (padrao)`;
  };

  // Helper to format time for display
  const formatTimeForDisplay = (time) => {
    if (!time) return 'Não definido';
    return ensureHHMM(time);
  };

  // Get global time values for restore display
  const getGlobalTimeValues = () => ({
    'Manhã - Início': formatTimeForDisplay(globalConfig?.morning_start_at),
    'Manhã - Fim': formatTimeForDisplay(globalConfig?.morning_end_at),
    'Tarde - Início': formatTimeForDisplay(globalConfig?.afternoon_start_at),
    'Tarde - Fim': formatTimeForDisplay(globalConfig?.afternoon_end_at),
  });

  const handleSave = async (values) => {
    try {
      await saveMutation.mutateAsync({
        id_unidade,
        morning_start_at: values.morning_start + ':00',
        morning_end_at: values.morning_end + ':00',
        afternoon_start_at: values.afternoon_start + ':00',
        afternoon_end_at: values.afternoon_end + ':00',
      });

      message.success('Horarios salvos com sucesso!');
      onCancel();
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Erro ao salvar horarios';
      message.error(errorMsg);
    }
  };

  const handleRestore = () => {
    const globalValues = getGlobalTimeValues();

    Modal.confirm({
      title: 'Restaurar para configuracao global?',
      content: (
        <div>
          <Paragraph>Os horarios serao restaurados para os valores globais:</Paragraph>
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
            fields: ['morning_start_at', 'morning_end_at', 'afternoon_start_at', 'afternoon_end_at'],
          });
          message.success('Horarios restaurados para os valores globais!');
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
          <ClockCircleOutlined />
          <span>Gerenciar Horarios</span>
        </Space>
      }
      open={open}
      onCancel={handleModalClose}
      footer={null}
      width={700}
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
            description="Configure os horarios de atendimento para esta unidade. Os horarios padrao sao: Manha 08:00-12:00, Tarde 13:20-16:40."
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
            <Divider orientation="left">Periodo da Manha</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Horario de Inicio"
                  name="morning_start"
                  rules={[
                    { required: true, message: 'Campo obrigatorio' },
                    { pattern: /^([01]\d|2[0-3]):([0-5]\d)$/, message: 'Formato invalido (HH:mm)' },
                  ]}
                >
                  <Input
                    style={{ width: '100%' }}
                    placeholder={getTimePlaceholder('morning_start_at', '08:00')}
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
                  label="Horario de Termino"
                  name="morning_end"
                  rules={[
                    { required: true, message: 'Campo obrigatorio' },
                    { pattern: /^([01]\d|2[0-3]):([0-5]\d)$/, message: 'Formato invalido (HH:mm)' },
                  ]}
                >
                  <Input
                    style={{ width: '100%' }}
                    placeholder={getTimePlaceholder('morning_end_at', '12:00')}
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

            <Divider orientation="left">Periodo da Tarde</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Horario de Inicio"
                  name="afternoon_start"
                  rules={[
                    { required: true, message: 'Campo obrigatorio' },
                    { pattern: /^([01]\d|2[0-3]):([0-5]\d)$/, message: 'Formato invalido (HH:mm)' },
                  ]}
                >
                  <Input
                    style={{ width: '100%' }}
                    placeholder={getTimePlaceholder('afternoon_start_at', '13:20')}
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
                  label="Horario de Termino"
                  name="afternoon_end"
                  rules={[
                    { required: true, message: 'Campo obrigatorio' },
                    { pattern: /^([01]\d|2[0-3]):([0-5]\d)$/, message: 'Formato invalido (HH:mm)' },
                  ]}
                >
                  <Input
                    style={{ width: '100%' }}
                    placeholder={getTimePlaceholder('afternoon_end_at', '16:40')}
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
