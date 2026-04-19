import { Card, Row, Col, Statistic, Spin } from 'antd';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

/**
 * Summary cards showing total counts by category
 *
 * @param {Object} props
 * @param {Object} props.summary - Summary data from useSummary hook
 * @param {boolean} props.loading - Loading state
 */
export default function SummaryCards({ summary, loading }) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spin />
      </div>
    );
  }

  const { pendentes = 0, agendados = 0, concluidos = 0 } = summary || {};

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={8}>
        <Card size="small">
          <Statistic
            title="Pendentes"
            value={pendentes}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card size="small">
          <Statistic
            title="Agendados"
            value={agendados}
            prefix={<CalendarOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card size="small">
          <Statistic
            title="Concluidos"
            value={concluidos}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
    </Row>
  );
}
