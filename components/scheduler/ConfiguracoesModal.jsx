/**
 * ConfiguracoesModal Component
 *
 * Main configuration modal that groups all scheduler settings.
 *
 * Features:
 * - Tabs: "Configurações Globais" and "Configurações Unidade"
 * - 4 config buttons: Antecedência, Horários, Duração, Datas
 * - Opens corresponding editor modals
 * - Unit tab includes "Restaurar para Global" option
 *
 * Usage:
 * <ConfiguracoesModal
 *   open={true}
 *   onCancel={handleClose}
 *   id_unidade={5}
 * />
 */

import { useState } from 'react';
import {
  Modal,
  Tabs,
  Button,
  Space,
  Card,
  Row,
  Col,
  Typography,
  Alert,
  Divider,
} from 'antd';
import {
  SettingOutlined,
  FieldTimeOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  HourglassOutlined,
  GlobalOutlined,
  BankOutlined,
} from '@ant-design/icons';

// Editor modals
import DRuleEditor from './DRuleEditor';
import TimeRangeEditor from './TimeRangeEditor';
import VigenciaEditor from './VigenciaEditor';
import DuracaoEditor from './DuracaoEditor';

const { Title, Text } = Typography;

// Configuration button definitions
const CONFIG_BUTTONS = [
  {
    key: 'antecedencia',
    label: 'Gerenciar Antecedência',
    icon: <HourglassOutlined />,
    description: 'Regras de d_rule (antecedência mínima/máxima)',
    color: '#1890ff',
  },
  {
    key: 'horarios',
    label: 'Gerenciar Horários',
    icon: <ClockCircleOutlined />,
    description: 'Horários de manhã e tarde',
    color: '#52c41a',
  },
  {
    key: 'duracao',
    label: 'Gerenciar Duração',
    icon: <FieldTimeOutlined />,
    description: 'Duração de cada slot de aula',
    color: '#722ed1',
  },
  {
    key: 'datas',
    label: 'Gerenciar Datas',
    icon: <CalendarOutlined />,
    description: 'Vigência (data inicial e final)',
    color: '#fa8c16',
  },
];

function ConfigButton({ config, onClick, disabled }) {
  return (
    <Card
      hoverable={!disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        borderColor: config.color,
        borderWidth: 2,
      }}
      bodyStyle={{ padding: 16 }}
    >
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space>
          <span style={{ fontSize: 24, color: config.color }}>{config.icon}</span>
          <Text strong>{config.label}</Text>
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {config.description}
        </Text>
      </Space>
    </Card>
  );
}

export default function ConfiguracoesModal({ open, onCancel, id_unidade }) {
  // Active tab
  const [activeTab, setActiveTab] = useState('unidade');

  // Editor modal states
  const [editorOpen, setEditorOpen] = useState({
    antecedencia: false,
    horarios: false,
    duracao: false,
    datas: false,
  });

  // Current config context (global or unit)
  const [editorIdUnidade, setEditorIdUnidade] = useState(null);

  // Open editor modal
  const openEditor = (key, isGlobal = false) => {
    setEditorIdUnidade(isGlobal ? null : id_unidade);
    setEditorOpen((prev) => ({ ...prev, [key]: true }));
  };

  // Close editor modal
  const closeEditor = (key) => {
    setEditorOpen((prev) => ({ ...prev, [key]: false }));
  };

  // Handle tab change
  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  // Render config buttons grid
  const renderConfigButtons = (isGlobal) => (
    <Row gutter={[16, 16]}>
      {CONFIG_BUTTONS.map((config) => (
        <Col xs={24} sm={12} key={config.key}>
          <ConfigButton
            config={config}
            onClick={() => openEditor(config.key, isGlobal)}
            disabled={!open}
          />
        </Col>
      ))}
    </Row>
  );

  // Tab items
  const tabItems = [
    {
      key: 'unidade',
      label: (
        <Space>
          <BankOutlined />
          <span>Configurações Unidade</span>
        </Space>
      ),
      children: (
        <div>
          {id_unidade ? (
            <>
              <Alert
                message="Configurações específicas desta unidade"
                description="Estas configurações se aplicam apenas à unidade selecionada. Você pode restaurar para os valores globais a qualquer momento usando o botão dentro de cada configuração."
                type="info"
                showIcon
                icon={<BankOutlined />}
                style={{ marginBottom: 24 }}
              />
              {renderConfigButtons(false)}
            </>
          ) : (
            <Alert
              message="Nenhuma unidade selecionada"
              description="Selecione uma unidade no calendário para configurar suas opções específicas."
              type="warning"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}
        </div>
      ),
    },
    {
      key: 'global',
      label: (
        <Space>
          <GlobalOutlined />
          <span>Configurações Globais</span>
        </Space>
      ),
      children: (
        <div>
          <Alert
            message="Configurações globais do sistema"
            description="Estas configurações são usadas como padrão para todas as unidades que não possuem configuração específica."
            type="info"
            showIcon
            icon={<GlobalOutlined />}
            style={{ marginBottom: 24 }}
          />
          {renderConfigButtons(true)}
        </div>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={
          <Space>
            <SettingOutlined />
            <span>Configurações do Scheduler</span>
          </Space>
        }
        open={open}
        onCancel={onCancel}
        footer={
          <Button onClick={onCancel}>Fechar</Button>
        }
        width={700}
        destroyOnClose
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
        />
      </Modal>

      {/* DRuleEditor (Antecedência) */}
      <DRuleEditor
        open={editorOpen.antecedencia}
        onCancel={() => closeEditor('antecedencia')}
        id_unidade={editorIdUnidade}
      />

      {/* TimeRangeEditor (Horários) */}
      <TimeRangeEditor
        open={editorOpen.horarios}
        onCancel={() => closeEditor('horarios')}
        id_unidade={editorIdUnidade}
      />

      {/* DuracaoEditor (Duração) */}
      <DuracaoEditor
        open={editorOpen.duracao}
        onCancel={() => closeEditor('duracao')}
        id_unidade={editorIdUnidade}
      />

      {/* VigenciaEditor (Datas) */}
      <VigenciaEditor
        open={editorOpen.datas}
        onCancel={() => closeEditor('datas')}
        id_unidade={editorIdUnidade}
      />
    </>
  );
}
