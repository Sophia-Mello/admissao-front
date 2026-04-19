/**
 * /recrutamento/gestao-de-demandas - Gestao de Demandas Page
 *
 * Displays open teaching demands (aulas sem professor atribuido)
 * consolidated by materia+unidade, with tags, SLA tracking,
 * and drill-down to internal mobility + selection process candidates.
 *
 * @route /recrutamento/gestao-de-demandas
 * @auth Required (admin | recrutamento). Backend also allows coordenador (future frontend support).
 */

import { useState } from 'react'
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Select,
  Alert,
  Tag,
} from 'antd'
import {
  ReloadOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import Layout from '../../components/Layout'
import ErrorBoundary from '../../components/ErrorBoundary'
import withRecrutamentoOrAdmin from '../../lib/withRecrutamentoOrAdmin'
import { getErrorMessage } from '../../lib/errorHandler'
import {
  useDemandas,
  useDemandasSubregionais,
  useDemandasUnidades,
  useDisciplinas,
  useDemandaTags,
} from '../../hooks'

import { DemandasTable, DemandaDetailModal, ColaboradorDetailModal } from '../../components/demandas'
import { TAG_COLORS } from '../../components/demandas/DemandasTable'
import CandidateDetailModal from '../../components/applications/CandidateDetailModal'

const { Title, Text } = Typography
const { Option } = Select

function GestaoDeDemandas() {
  // ─── Filter state ──────────────────────────────
  const [filters, setFilters] = useState({
    subregional: null,
    unidade: null,
    cod_materia: null,
    tag: null,
  })
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50 })

  // ─── Modal state ───────────────────────────────
  const [selectedDemanda, setSelectedDemanda] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [candidateModalOpen, setCandidateModalOpen] = useState(false)
  const [selectedCandidateId, setSelectedCandidateId] = useState(null)
  const [colaboradorModalOpen, setColaboradorModalOpen] = useState(false)
  const [selectedColaborador, setSelectedColaborador] = useState(null)

  // ─── Data fetching ─────────────────────────────
  const { data, isLoading, isError, error, refetch } = useDemandas({
    ...filters,
    limit: pagination.pageSize,
    offset: (pagination.current - 1) * pagination.pageSize,
  })

  const { data: subregionais, isLoading: loadingSr } = useDemandasSubregionais()
  const { data: unidades, isLoading: loadingUnidades } = useDemandasUnidades(filters.subregional)
  const { data: disciplinas, isLoading: loadingDisciplinas } = useDisciplinas()
  const { data: tagOptions = [] } = useDemandaTags()

  const demandas = data?.demandas || []
  const total = data?.total || 0

  // ─── Handlers ──────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value || null }
      if (key === 'subregional') next.unidade = null
      return next
    })
    setPagination((p) => ({ ...p, current: 1 }))
  }

  const handleTableChange = (pag) => {
    setPagination({ current: pag.current, pageSize: pag.pageSize })
  }

  const handleDemandaClick = (demanda) => {
    setSelectedDemanda(demanda)
    setDetailOpen(true)
  }

  const handlePersonClick = ({ type, id, record }) => {
    if (type === 'candidato') {
      setSelectedCandidateId(id)
      setCandidateModalOpen(true)
    } else if (type === 'colaborador') {
      setSelectedColaborador(record)
      setColaboradorModalOpen(true)
    }
  }

  const handleClearFilters = () => {
    setFilters({ subregional: null, unidade: null, cod_materia: null, tag: null })
    setPagination((p) => ({ ...p, current: 1 }))
  }

  // ─── Render ────────────────────────────────────
  return (
    <Layout>
      <ErrorBoundary>
        <div style={{ padding: '24px' }}>
          {/* Header */}
          <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                <ApartmentOutlined style={{ marginRight: 12 }} />
                Gestao de Demandas
              </Title>
              <Text type="secondary">Posicoes docentes abertas por disciplina e unidade</Text>
            </Col>
            <Col>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Atualizar
              </Button>
            </Col>
          </Row>

          {/* Filters */}
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={8} md={5}>
                <Select
                  placeholder="Subregional"
                  style={{ width: '100%' }}
                  value={filters.subregional ?? undefined}
                  onChange={(v) => handleFilterChange('subregional', v)}
                  allowClear
                  loading={loadingSr}
                  showSearch
                  optionFilterProp="children"
                >
                  {(subregionais || []).map((sr) => (
                    <Option key={sr.id_subregional} value={sr.id_subregional}>
                      {sr.nome_subregional}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={8} md={5}>
                <Select
                  placeholder="Unidade"
                  style={{ width: '100%' }}
                  value={filters.unidade ?? undefined}
                  onChange={(v) => handleFilterChange('unidade', v)}
                  allowClear
                  loading={loadingUnidades}
                  showSearch
                  optionFilterProp="children"
                >
                  {(unidades || []).map((u) => (
                    <Option key={u.id_unidade} value={u.id_unidade}>
                      {u.nome_unidade}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={8} md={5}>
                <Select
                  placeholder="Disciplina"
                  style={{ width: '100%' }}
                  value={filters.cod_materia ?? undefined}
                  onChange={(v) => handleFilterChange('cod_materia', v)}
                  allowClear
                  loading={loadingDisciplinas}
                  showSearch
                  optionFilterProp="children"
                >
                  {(disciplinas || []).map((d) => (
                    <Option key={d.cod_materia} value={d.cod_materia}>
                      {d.nome_materia}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={8} md={5}>
                <Select
                  placeholder="Tag"
                  style={{ width: '100%' }}
                  value={filters.tag ?? undefined}
                  onChange={(v) => handleFilterChange('tag', v)}
                  allowClear
                >
                  {tagOptions.map((t) => (
                    <Option key={t.name} value={t.name}>
                      <Tag color={TAG_COLORS[t.name] || 'default'}>{t.name}</Tag>
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={8} md={4}>
                <Button onClick={handleClearFilters}>Limpar Filtros</Button>
              </Col>
            </Row>
          </Card>

          {/* Error */}
          {isError && (
            <Alert
              type="error"
              message="Erro ao carregar demandas"
              description={getErrorMessage(error)}
              style={{ marginBottom: 16 }}
              showIcon
              action={<Button size="small" onClick={() => refetch()}>Tentar novamente</Button>}
            />
          )}

          {/* Table */}
          <Card>
            <DemandasTable
              demandas={demandas}
              loading={isLoading}
              pagination={{ current: pagination.current, pageSize: pagination.pageSize, total }}
              onTableChange={handleTableChange}
              onDemandaClick={handleDemandaClick}
            />
          </Card>
        </div>

        {/* Demand Detail Modal */}
        <DemandaDetailModal
          demanda={selectedDemanda}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          afterClose={() => setSelectedDemanda(null)}
          onPersonClick={handlePersonClick}
        />

        {/* Reuse existing CandidateDetailModal for candidate drill-down */}
        <ColaboradorDetailModal
          open={colaboradorModalOpen}
          colaborador={selectedColaborador}
          onClose={() => { setColaboradorModalOpen(false); setSelectedColaborador(null) }}
        />

        <CandidateDetailModal
          open={candidateModalOpen}
          candidateId={selectedCandidateId}
          onClose={() => { setCandidateModalOpen(false); setSelectedCandidateId(null) }}
          zIndex={1050}
        />
      </ErrorBoundary>
    </Layout>
  )
}

export default withRecrutamentoOrAdmin(GestaoDeDemandas)
