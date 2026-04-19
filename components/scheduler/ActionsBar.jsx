/**
 * ActionsBar Component
 *
 * Simplified action buttons for scheduler:
 * - Bloquear Horários - Opens modal to block time slots
 * - Desbloquear Horários - Opens modal to unblock time slots
 * - Configurações - Opens ConfiguracoesModal with global/unit settings
 *
 * Both buttons are always visible, but some actions may require a unit selection.
 */

import { Space, Button, Tooltip } from 'antd';
import { SettingOutlined, StopOutlined, UnlockOutlined } from '@ant-design/icons';

export default function ActionsBar({
  disabled,
  onBlockSlot,
  onUnblockSlot,
  onOpenConfiguracoes,
}) {
  return (
    <Space wrap>
      <Tooltip title={disabled ? 'Selecione uma unidade primeiro' : 'Bloquear horários específicos'}>
        <Button
          danger
          icon={<StopOutlined />}
          onClick={onBlockSlot}
          disabled={disabled}
        >
          Bloquear Horários
        </Button>
      </Tooltip>

      <Tooltip title={disabled ? 'Selecione uma unidade primeiro' : 'Desbloquear horários específicos'}>
        <Button
          icon={<UnlockOutlined />}
          onClick={onUnblockSlot}
          disabled={disabled}
          style={{ color: '#52c41a', borderColor: '#52c41a' }}
        >
          Desbloquear Horários
        </Button>
      </Tooltip>

      <Tooltip title="Configurações globais e por unidade">
        <Button
          type="primary"
          icon={<SettingOutlined />}
          onClick={onOpenConfiguracoes}
        >
          Configurações
        </Button>
      </Tooltip>
    </Space>
  );
}
