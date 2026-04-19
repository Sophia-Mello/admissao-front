// components/BookingsManagement/FiltersSection.jsx

import { Row, Col, Select, DatePicker, Space, Typography, Button, Spin } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import moment from 'moment';
import 'moment/locale/pt-br';

const { Text } = Typography;
const { Option } = Select;

moment.locale('pt-br');

/**
 * FiltersSection Component
 *
 * Filters for bookings management:
 * - Regional dropdown (fetched from API)
 * - Unit dropdown (filtered by regional, fetched from API)
 * - Week navigation (prev/next week buttons + week display)
 */
export default function FiltersSection({
  selectedRegional,
  selectedUnidade,
  selectedWeek,
  onRegionalChange,
  onUnidadeChange,
  onWeekChange,
}) {
  // Fetch regionais
  const { data: regionaisData, isLoading: loadingRegionais } = useQuery({
    queryKey: ['regionais'],
    queryFn: async () => {
      const res = await api.get('/admin/regional');
      return res.data;
    },
    staleTime: 300000, // 5 minutes
  });

  // Fetch unidades for selected regional
  const { data: unidadesData, isLoading: loadingUnidades } = useQuery({
    queryKey: ['unidades', selectedRegional],
    queryFn: async () => {
      if (!selectedRegional) return { unidades: [] };
      const res = await api.get(`/admin/regional/${selectedRegional}/unidades`);
      return res.data;
    },
    enabled: !!selectedRegional,
    staleTime: 300000,
  });
  // Calculate week start (Monday) and end (Sunday)
  const weekStart = moment(selectedWeek).startOf('isoWeek');
  const weekEnd = moment(selectedWeek).endOf('isoWeek');

  const handlePrevWeek = () => {
    const prevWeek = moment(selectedWeek).subtract(1, 'week').toDate();
    onWeekChange(prevWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = moment(selectedWeek).add(1, 'week').toDate();
    onWeekChange(nextWeek);
  };

  return (
    <Row gutter={[16, 16]} align="middle">
      <Col xs={24} sm={12} md={8}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text strong>Regional</Text>
          <Select
            placeholder="Selecione a regional"
            style={{ width: '100%' }}
            value={selectedRegional}
            onChange={onRegionalChange}
            allowClear
            loading={loadingRegionais}
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {regionaisData?.regionais?.map((regional) => (
              <Option key={regional.id_regional} value={regional.id_regional}>
                {regional.nome_regional}
              </Option>
            ))}
          </Select>
        </Space>
      </Col>

      <Col xs={24} sm={12} md={8}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text strong>Unidade</Text>
          <Select
            placeholder="Selecione a unidade"
            style={{ width: '100%' }}
            value={selectedUnidade}
            onChange={(value, option) => onUnidadeChange(value, option)}
            disabled={!selectedRegional}
            loading={loadingUnidades}
            allowClear
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {unidadesData?.unidades?.map((unidade) => (
              <Option
                key={unidade.id_unidade}
                value={unidade.id_unidade}
                unidade={unidade}
              >
                {unidade.nome_unidade}
              </Option>
            ))}
          </Select>
        </Space>
      </Col>

      <Col xs={24} sm={24} md={8}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text strong>Semana</Text>
          <Space.Compact style={{ width: '100%' }}>
            <Button icon={<LeftOutlined />} onClick={handlePrevWeek} />
            <Button style={{ flex: 1, textAlign: 'center' }}>
              {weekStart.format('DD/MM')} - {weekEnd.format('DD/MM/YYYY')}
            </Button>
            <Button icon={<RightOutlined />} onClick={handleNextWeek} />
          </Space.Compact>
        </Space>
      </Col>
    </Row>
  );
}
