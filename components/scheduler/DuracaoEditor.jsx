/**
 * DuracaoEditor Component
 *
 * Modal for managing slot duration configuration.
 *
 * Features:
 * - Edit slot_duration (duration in minutes)
 * - Restore to global config (for unit-specific config)
 * - Save uses useSaveScheduleConfig
 *
 * Business Rules:
 * - Slot duration: 20-60 minutes (default: 40)
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
} from 'antd';
import { FieldTimeOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import {
  useScheduleConfig,
  useSaveScheduleConfig,
  useGlobalConfig,
  useRestoreToGlobal,
} from '../../hooks/useScheduleConfig';

const { Paragraph, Text } = Typography;

export default function DuracaoEditor({ open, onCancel, id_unidade }) {
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

  // Parse slot_size to minutes
  const parseSlotDuration = (slotSize) => {
    if (!slotSize) return null;
    if (typeof slotSize === 'number') return slotSize;
    // Parse from "00:40:00" or "00:40" format
    const parts = slotSize.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    return hours * 60 + mins;
  };

  // Dynamic placeholder showing current value
  const getDurationPlaceholder = () => {
    const currentValue = parseSlotDuration(configData?.slot_size);
    if (currentValue) {
      return `${currentValue} (atual)`;
    }
    return '40 (padrao)';
  };

  // Get global duration for display
  const getGlobalDuration = () => {
    const globalValue = parseSlotDuration(globalConfig?.slot_size);
    return globalValue || 40;
  };

  const handleSave = async (values) => {
    try {
      // Convert slot_duration from minutes to interval format (HH:MM:SS)
      const minutes = values.slot_duration;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const slotSize = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;

      await saveMutation.mutateAsync({
        id_unidade,
        slot_size: slotSize,
      });

      message.success('Duracao salva com sucesso!');
      onCancel();
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Erro ao salvar duracao';
      message.error(errorMsg);
    }
  };

  const handleRestore = () => {
    Modal.confirm({
      title: 'Restaurar para configuracao global?',
      content: (
        <div>
          <Paragraph>A duracao sera restaurada para o valor global:</Paragraph>
          <Text strong>{getGlobalDuration()} minutos</Text>
        </div>
      ),
      okText: 'Restaurar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await restoreMutation.mutateAsync({ fields: ['slot_size'] });
          message.success('Duracao restaurada para o valor global!');
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
          <FieldTimeOutlined />
          <span>Gerenciar Duracao</span>
        </Space>
      }
      open={open}
      onCancel={handleModalClose}
      footer={null}
      width={500}
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
            description="Configure a duracao de cada slot de aula teste. O valor padrao e de 40 minutos."
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
              label="Duracao de cada slot (minutos)"
              name="slot_duration"
              rules={[
                { required: true, message: 'Campo obrigatorio' },
                { type: 'number', min: 20, max: 60, message: 'Deve estar entre 20 e 60 minutos' },
              ]}
              extra="Duracao de cada aula teste (padrao: 40 minutos)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={20}
                max={60}
                step={5}
                size="large"
                placeholder={getDurationPlaceholder()}
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
