/**
 * FiltersSection Component
 *
 * Filters for scheduler management:
 * - Regional dropdown (fetched from API)
 * - Unit dropdown (filtered by regional, fetched from API)
 * - Week navigation (prev/next page buttons + week display from API pagination)
 *
 * Uses useSubregionais hook for data fetching.
 */

import { Row, Col, Select, Space, Typography, Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import moment from 'moment';
import 'moment/locale/pt-br';
import { useSubregionais, useUnidades } from '../../hooks/useSubregionais';

const { Text } = Typography;
const { Option } = Select;

moment.locale('pt-br');

export default function FiltersSection({
  selectedRegional,
  selectedUnidade,
  paginationInfo,
  currentPage,
  onRegionalChange,
  onUnidadeChange,
  onPrevPage,
  onNextPage,
}) {
  // Fetch regionais using hook
  const { subregionais, isLoading: loadingRegionais } = useSubregionais();

  // Fetch unidades for selected regional using hook
  const { unidades, isLoading: loadingUnidades } = useUnidades(selectedRegional);

  // Week display from pagination info
  const weekStart = paginationInfo?.week_start ? moment(paginationInfo.week_start) : null;
  const weekEnd = paginationInfo?.week_end ? moment(paginationInfo.week_end) : null;

  // Navigation buttons visibility
  const canGoPrev = currentPage > 1;
  const canGoNext = paginationInfo && currentPage < paginationInfo.totalPages;

  const handleRegionalSelect = (value) => {
    onRegionalChange(value);
  };

  const handleUnidadeSelect = (value) => {
    // Find the selected unidade data
    const unidadeData = unidades.find((u) => u.id_unidade === value) || null;
    onUnidadeChange(value, unidadeData);
  };

  return (
    <Row gutter={[16, 16]} align="middle">
      {/* Regional Select */}
      <Col xs={24} sm={12} md={8}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text strong>Regional</Text>
          <Select
            placeholder="Selecione a regional"
            style={{ width: '100%' }}
            value={selectedRegional}
            onChange={handleRegionalSelect}
            allowClear
            loading={loadingRegionais}
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {subregionais.map((regional) => (
              <Option key={regional.id_subregional} value={regional.id_subregional}>
                {regional.nome_subregional}
              </Option>
            ))}
          </Select>
        </Space>
      </Col>

      {/* Unidade Select */}
      <Col xs={24} sm={12} md={8}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text strong>Unidade</Text>
          <Select
            placeholder="Selecione a unidade"
            style={{ width: '100%' }}
            value={selectedUnidade}
            onChange={handleUnidadeSelect}
            disabled={!selectedRegional}
            loading={loadingUnidades}
            allowClear
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {unidades.map((unidade) => (
              <Option key={unidade.id_unidade} value={unidade.id_unidade}>
                {unidade.nome_unidade}
              </Option>
            ))}
          </Select>
        </Space>
      </Col>

      {/* Week Navigation */}
      <Col xs={24} sm={24} md={8}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text strong>Semana</Text>
          <Space.Compact style={{ width: '100%' }}>
            {canGoPrev && (
              <Button icon={<LeftOutlined />} onClick={onPrevPage} />
            )}
            <Button style={{ flex: 1, textAlign: 'center' }} disabled>
              {weekStart && weekEnd
                ? `${weekStart.format('DD/MM')} - ${weekEnd.format('DD/MM/YYYY')}`
                : 'Selecione uma unidade'}
            </Button>
            {canGoNext && (
              <Button icon={<RightOutlined />} onClick={onNextPage} />
            )}
          </Space.Compact>
        </Space>
      </Col>
    </Row>
  );
}
