// components/BookingsManagement/ActionsBar.jsx

import { Space, Button, Tooltip } from 'antd';
import { SettingOutlined, ClockCircleOutlined, StopOutlined } from '@ant-design/icons';

/**
 * ActionsBar Component
 *
 * Action buttons for managing unit-specific settings:
 * - Gerenciar Regras (d_rule: min/max days advance)
 * - Gerenciar Horários (time slots configuration)
 * - Bloquear Horário (create slot block)
 */
export default function ActionsBar({
  selectedUnidade,
  onManageRules,
  onManageTimeSlots,
  onBlockSlot,
}) {
  const isDisabled = !selectedUnidade;

  return (
    <Space>
      <Tooltip title={isDisabled ? 'Selecione uma unidade primeiro' : 'Configurar regra d+N'}>
        <Button
          icon={<SettingOutlined />}
          onClick={onManageRules}
          disabled={isDisabled}
        >
          Gerenciar Regras
        </Button>
      </Tooltip>

      <Tooltip title={isDisabled ? 'Selecione uma unidade primeiro' : 'Configurar horários de atendimento'}>
        <Button
          icon={<ClockCircleOutlined />}
          onClick={onManageTimeSlots}
          disabled={isDisabled}
        >
          Gerenciar Horários
        </Button>
      </Tooltip>

      <Tooltip title={isDisabled ? 'Selecione uma unidade primeiro' : 'Bloquear um horário específico'}>
        <Button
          danger
          icon={<StopOutlined />}
          onClick={onBlockSlot}
          disabled={isDisabled}
        >
          Bloquear Horário
        </Button>
      </Tooltip>
    </Space>
  );
}
