/**
 * /exames-ocupacionais - Kanban de Exames Ocupacionais
 *
 * Page for managing occupational exam candidates with Kanban interface.
 * Features:
 * - Summary cards (Pendentes, Agendados, Concluídos) - filtered counts
 * - Drag-and-drop Kanban board
 * - Per-column infinite scroll pagination
 * - Schedule modal when moving to "Agendado"
 * - CSV export functionality
 *
 * @route /exames-ocupacionais
 * @auth Required (admin | recrutamento | salu)
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, Typography, Button, Space, message, Input, Select, Alert } from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import withSalu from '../../lib/withSalu';
import { KanbanBoard, SummaryCards } from '../../components/ExamesOcupacionais';
import {
  useSummary,
  useCargos,
  useUpdateStatus,
  useExportCsv,
  EMPRESAS,
  exameKeys,
} from '../../hooks/useExamesOcupacionais';

const { Title } = Typography;
const { Search } = Input;

function ExamesOcupacionaisPage() {
  const [searchText, setSearchText] = useState('');
  const [selectedCargo, setSelectedCargo] = useState(undefined);
  const [selectedEmpresa, setSelectedEmpresa] = useState(undefined);

  const queryClient = useQueryClient();

  // Build filters object
  const filters = useMemo(() => ({
    search: searchText || undefined,
    cargo: selectedCargo || undefined,
    empresa: selectedEmpresa || undefined,
  }), [searchText, selectedCargo, selectedEmpresa]);

  // Summary with filters - shows correct counts for filtered view
  const {
    data: summaryData,
    isLoading: loadingSummary,
    isError: summaryError,
    refetch: refetchSummary,
  } = useSummary(filters);

  const { data: cargos, isLoading: loadingCargos } = useCargos();

  // Mutations
  const updateStatusMutation = useUpdateStatus();
  const exportCsvMutation = useExportCsv();

  // Handle status change from Kanban
  const handleStatusChange = useCallback(
    async (id, newStatus, extraData = {}) => {
      await updateStatusMutation.mutateAsync({
        id,
        status: newStatus,
        ...extraData,
      });
      // useUpdateStatus already invalidates exameKeys.all, which includes all column queries
      refetchSummary();
    },
    [updateStatusMutation, refetchSummary]
  );

  // Handle CSV export
  const handleExport = async () => {
    try {
      await exportCsvMutation.mutateAsync({ search: searchText || undefined });
      message.success('Exportação iniciada');
    } catch (error) {
      console.error('Export error:', error);
      message.error('Erro ao exportar CSV');
    }
  };

  // Handle refresh - invalidate all exame queries
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: exameKeys.all });
    message.success('Dados atualizados');
  };

  // Handle search
  const handleSearch = (value) => {
    setSearchText(value);
  };

  return (
    <Layout>
      <Card>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <Space>
            <MedicineBoxOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>
              Exames Ocupacionais
            </Title>
          </Space>

          <Space wrap>
            <Search
              placeholder="Buscar por nome ou CPF"
              allowClear
              onSearch={handleSearch}
              style={{ width: 250 }}
              prefix={<SearchOutlined />}
            />
            <Select
              placeholder="Filtrar por cargo"
              allowClear
              showSearch
              optionFilterProp="children"
              loading={loadingCargos}
              style={{ width: 200 }}
              value={selectedCargo}
              onChange={setSelectedCargo}
              options={(cargos || []).map((cargo) => ({
                value: cargo,
                label: cargo,
              }))}
            />
            <Select
              placeholder="Empresa"
              allowClear
              style={{ width: 120 }}
              value={selectedEmpresa}
              onChange={setSelectedEmpresa}
              options={EMPRESAS.map((e) => ({
                value: e.value,
                label: e.label,
              }))}
            />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              Atualizar
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={exportCsvMutation.isPending}
            >
              Exportar CSV
            </Button>
          </Space>
        </div>

        {/* Error Alert */}
        {summaryError && (
          <Alert
            message="Erro ao carregar dados"
            description="Não foi possível carregar os dados. Verifique sua conexão e tente novamente."
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" onClick={handleRefresh}>
                Tentar novamente
              </Button>
            }
          />
        )}

        {/* Summary Cards - now filtered */}
        <SummaryCards summary={summaryData} loading={loadingSummary} />

        {/* Kanban Board - handles its own per-column queries */}
        <KanbanBoard
          filters={filters}
          onStatusChange={handleStatusChange}
          statusCounts={summaryData?.detalhado}
        />
      </Card>
    </Layout>
  );
}

export default withSalu(ExamesOcupacionaisPage);
