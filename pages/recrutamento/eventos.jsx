/**
 * /recrutamento/eventos page - Events Management (Prova Teórica)
 *
 * Main page for managing test events with tabs:
 * - Dashboard: Overview of time slots with occupancy
 * - Pendentes: Candidates without active inscription
 *
 * Features:
 * - Create events in bulk with Meet links
 * - View and manage time slots
 * - View candidates per room
 * - Search candidates by CPF
 * - Manual scheduling
 * - Event Types configuration (types and templates)
 */

import { useState } from 'react';
import { Row, Col, Typography, Tabs, Card, Space, Alert, Button, Tooltip } from 'antd';
import {
  CalendarOutlined,
  TeamOutlined,
  UserOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import Layout from '../../components/Layout';
import withRecrutamentoOrAdmin from '../../lib/withRecrutamentoOrAdmin';
import { EventosDashboard, EventosPendentes, EventTypesModal } from '../../components/eventos';

const { Title, Text } = Typography;

function EventosPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [eventTypesModalOpen, setEventTypesModalOpen] = useState(false);

  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <Space>
          <CalendarOutlined />
          Dashboard
        </Space>
      ),
      children: <EventosDashboard />,
    },
    {
      key: 'pendentes',
      label: (
        <Space>
          <UserOutlined />
          Candidatos Pendentes
        </Space>
      ),
      children: <EventosPendentes />,
    },
  ];

  return (
    <Layout>
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2}>
            <CalendarOutlined /> Eventos
          </Title>
          <Text type="secondary">
            Gerencie horários, salas e candidatos para eventos
          </Text>
        </Col>
        <Col>
          <Tooltip title="Configurar Tipos de Evento">
            <Button
              icon={<SettingOutlined />}
              onClick={() => setEventTypesModalOpen(true)}
            >
              Tipos de Evento
            </Button>
          </Tooltip>
        </Col>
      </Row>

      <Alert
        type="info"
        showIcon
        message="Sistema de Agendamento de Eventos"
        description={
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>Crie eventos em massa com link do Google Meet</li>
            <li>Acompanhe ocupação por horário e sala</li>
            <li>Agende candidatos manualmente ou envie link para autoagendamento</li>
            <li>Gerencie candidatos pendentes e reagende faltas</li>
          </ul>
        }
        style={{ marginBottom: 16 }}
        closable
      />

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>

      {/* Event Types Configuration Modal */}
      <EventTypesModal
        open={eventTypesModalOpen}
        onCancel={() => setEventTypesModalOpen(false)}
      />
    </Layout>
  );
}

export default withRecrutamentoOrAdmin(EventosPage);
