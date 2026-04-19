/**
 * RestaurarGlobalModal Component
 *
 * Generic confirmation modal for restoring unit config fields to global values.
 *
 * Features:
 * - Shows global values that will be applied
 * - Confirms before executing restoration
 * - Uses useRestoreToGlobal hook
 * - Supports different field types (datas, horarios, antecedencia, duracao)
 *
 * Usage:
 * <RestaurarGlobalModal
 *   open={true}
 *   onCancel={handleCancel}
 *   onSuccess={handleSuccess}
 *   id_unidade={5}
 *   restoreType="datas" // 'datas' | 'horarios' | 'antecedencia' | 'duracao'
 * />
 */

import { useEffect, useState } from 'react';
import {
  Modal,
  Space,
  Alert,
  Spin,
  Typography,
  Descriptions,
  message,
  Divider,
} from 'antd';
import { UndoOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useGlobalConfig, useRestoreToGlobal } from '../../hooks/useScheduleConfig';

const { Text, Paragraph } = Typography;

// Field configurations for each restore type
const RESTORE_CONFIG = {
  datas: {
    title: 'Restaurar Datas',
    fields: ['start_day', 'end_day'],
    description: 'Os campos de vigência (data inicial e final) serão restaurados para os valores da configuração global.',
    formatValues: (globalConfig) => ({
      'Data Inicial': globalConfig?.start_day
        ? new Date(globalConfig.start_day).toLocaleDateString('pt-BR')
        : 'Não definida (sem restrição)',
      'Data Final': globalConfig?.end_day
        ? new Date(globalConfig.end_day).toLocaleDateString('pt-BR')
        : 'Não definida (sem restrição)',
    }),
  },
  horarios: {
    title: 'Restaurar Horários',
    fields: ['morning_start_at', 'morning_end_at', 'afternoon_start_at', 'afternoon_end_at'],
    description: 'Os horários de manhã e tarde serão restaurados para os valores da configuração global.',
    formatValues: (globalConfig) => {
      const formatTime = (time) => {
        if (!time) return 'Não definido';
        // Handle "HH:mm:ss" or "HH:mm" format
        const parts = time.split(':');
        return `${parts[0]}:${parts[1]}`;
      };
      return {
        'Manhã - Início': formatTime(globalConfig?.morning_start_at),
        'Manhã - Fim': formatTime(globalConfig?.morning_end_at),
        'Tarde - Início': formatTime(globalConfig?.afternoon_start_at),
        'Tarde - Fim': formatTime(globalConfig?.afternoon_end_at),
      };
    },
  },
  antecedencia: {
    title: 'Restaurar Antecedência',
    fields: ['d_rule_start', 'd_rule_end'],
    description: 'As regras de antecedência (d_rule) serão restauradas para os valores da configuração global.',
    formatValues: (globalConfig) => ({
      'Antecedência Mínima (d_rule_start)': globalConfig?.d_rule_start !== null && globalConfig?.d_rule_start !== undefined
        ? `${globalConfig.d_rule_start} dia(s)`
        : 'Não definida',
      'Antecedência Máxima (d_rule_end)': globalConfig?.d_rule_end !== null && globalConfig?.d_rule_end !== undefined
        ? `${globalConfig.d_rule_end} dia(s)`
        : 'Não definida',
    }),
  },
  duracao: {
    title: 'Restaurar Duração',
    fields: ['slot_size'],
    description: 'A duração de cada slot será restaurada para o valor da configuração global.',
    formatValues: (globalConfig) => {
      // Parse slot_size from "00:40:00" or "00:40" to minutes
      const parseSlotDuration = (slotSize) => {
        if (!slotSize) return null;
        if (typeof slotSize === 'number') return slotSize;
        const parts = slotSize.split(':');
        const hours = parseInt(parts[0], 10) || 0;
        const mins = parseInt(parts[1], 10) || 0;
        return hours * 60 + mins;
      };

      const minutes = parseSlotDuration(globalConfig?.slot_size);
      return {
        'Duração do Slot': minutes !== null ? `${minutes} minutos` : '40 minutos (padrão)',
      };
    },
  },
};

export default function RestaurarGlobalModal({
  open,
  onCancel,
  onSuccess,
  id_unidade,
  restoreType,
}) {
  const [confirming, setConfirming] = useState(false);

  // Get config for the restore type
  const config = RESTORE_CONFIG[restoreType];

  // Fetch global config
  const { data: globalConfig, isLoading: loadingGlobal } = useGlobalConfig({
    enabled: open && !!config,
  });

  // Restore mutation
  const restoreMutation = useRestoreToGlobal(id_unidade);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setConfirming(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!config) return;

    setConfirming(true);
    try {
      await restoreMutation.mutateAsync({ fields: config.fields });
      message.success(`${config.title} concluída com sucesso!`);
      onSuccess?.();
      onCancel();
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Erro ao restaurar configuração';
      message.error(errorMsg);
    } finally {
      setConfirming(false);
    }
  };

  // Get formatted values for display
  const formattedValues = config?.formatValues?.(globalConfig) || {};

  if (!config) {
    return null;
  }

  return (
    <Modal
      title={
        <Space>
          <UndoOutlined />
          <span>{config.title}</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleConfirm}
      okText="Confirmar Restauração"
      cancelText="Cancelar"
      okButtonProps={{
        icon: <UndoOutlined />,
        loading: confirming || restoreMutation.isPending,
        danger: true,
      }}
      width={500}
      destroyOnClose
    >
      {loadingGlobal ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <Paragraph type="secondary" style={{ marginTop: 16 }}>
            Carregando configuração global...
          </Paragraph>
        </div>
      ) : (
        <>
          <Alert
            message="Atenção"
            description={config.description}
            type="warning"
            icon={<ExclamationCircleOutlined />}
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Divider orientation="left">Valores Globais</Divider>

          <Descriptions
            column={1}
            bordered
            size="small"
            style={{ marginBottom: 24 }}
          >
            {Object.entries(formattedValues).map(([label, value]) => (
              <Descriptions.Item key={label} label={label}>
                <Text strong>{value}</Text>
              </Descriptions.Item>
            ))}
          </Descriptions>

          <Alert
            message="Esta ação irá sobrescrever a configuração atual da unidade com os valores globais mostrados acima."
            type="info"
            showIcon
          />
        </>
      )}
    </Modal>
  );
}
