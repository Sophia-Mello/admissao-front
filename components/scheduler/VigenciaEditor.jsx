/**
 * VigenciaEditor Component
 *
 * Modal for managing validity period (vigencia/datas) for a unit's schedule config.
 *
 * Features:
 * - Fetch current schedule config (with valid_from and valid_until dates)
 * - Edit valid_from and valid_until (DatePicker range)
 * - Save uses useSaveScheduleConfig
 * - Restore to global config (for unit-specific config)
 *
 * Business Rules:
 * - If both dates null: config valid indefinitely
 * - If both dates set: config only valid during that period
 * - valid_from <= valid_until validation
 */

import { useEffect } from 'react';
import {
  Modal,
  Form,
  Button,
  Space,
  Alert,
  Spin,
  message,
  Typography,
  DatePicker,
} from 'antd';
import { CalendarOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import moment from 'moment';
import {
  useScheduleConfig,
  useSaveScheduleConfig,
  useGlobalConfig,
  useRestoreToGlobal,
} from '../../hooks/useScheduleConfig';

const { Paragraph, Text } = Typography;

export default function VigenciaEditor({ open, onCancel, id_unidade }) {
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

  // Get current vigencia dates for display
  const getCurrentVigencia = () => {
    if (configData && configData.valid_from && configData.valid_until) {
      const start = moment(configData.valid_from).format('DD/MM/YYYY');
      const end = moment(configData.valid_until).format('DD/MM/YYYY');
      return { hasVigencia: true, start, end };
    }
    return { hasVigencia: false };
  };

  const vigencia = getCurrentVigencia();

  // Get global dates values for restore display
  const getGlobalDatasValues = () => ({
    'Data Inicial': globalConfig?.valid_from
      ? moment(globalConfig.valid_from).format('DD/MM/YYYY')
      : 'Não definida (sem restrição)',
    'Data Final': globalConfig?.valid_until
      ? moment(globalConfig.valid_until).format('DD/MM/YYYY')
      : 'Não definida (sem restrição)',
  });

  const handleSave = async (values) => {
    try {
      const [validFrom, validUntil] = values.vigenciaRange || [null, null];

      await saveMutation.mutateAsync({
        id_unidade,
        valid_from: validFrom ? validFrom.format('YYYY-MM-DD') : null,
        valid_until: validUntil ? validUntil.format('YYYY-MM-DD') : null,
      });

      message.success('Datas salvas com sucesso!');
      onCancel();
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Erro ao salvar datas';
      message.error(errorMsg);
    }
  };

  const handleRestore = () => {
    const globalValues = getGlobalDatasValues();

    Modal.confirm({
      title: 'Restaurar para configuracao global?',
      content: (
        <div>
          <Paragraph>As datas de vigência serão restauradas para os valores globais:</Paragraph>
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
            fields: ['valid_from', 'valid_until'],
          });
          message.success('Datas restauradas para os valores globais!');
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
          <CalendarOutlined />
          <span>Gerenciar Datas</span>
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
          {/* Current vigencia status */}
          {configData && (
            <Alert
              message={
                vigencia.hasVigencia ? (
                  <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: '13px' }}>
                      Configuracao Temporaria (Vigencia Ativa)
                    </Text>
                    <Text style={{ fontSize: '12px' }}>
                      Valida de {vigencia.start} ate {vigencia.end}
                    </Text>
                  </Space>
                ) : (
                  <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: '13px' }}>
                      Configuracao Permanente
                    </Text>
                    <Text style={{ fontSize: '12px' }}>
                      Valida indefinidamente (sem data de expiracao)
                    </Text>
                  </Space>
                )
              }
              type={vigencia.hasVigencia ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Alert
            message={isGlobal ? 'Configuracao Global' : 'Configuracao da Unidade'}
            description="Defina um periodo especifico para as configuracoes. Se deixar vazio, as configuracoes serao validas indefinidamente."
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
              label="Periodo de Vigencia"
              name="vigenciaRange"
              extra="Selecione as datas de inicio e fim da vigencia"
            >
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                placeholder={['Data de inicio', 'Data de fim']}
                size="large"
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
