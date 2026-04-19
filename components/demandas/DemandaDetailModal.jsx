import { useState } from 'react'
import { Modal, Tabs, Table, Tag, Spin, Alert, Typography, Space, Badge, Button, Select, Input, Tooltip, Progress, message } from 'antd'
import { TeamOutlined, UserOutlined, PhoneOutlined, MailOutlined, ClockCircleOutlined, EditOutlined, WarningOutlined, ScheduleOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useQueryClient } from '@tanstack/react-query'
import { useMobilidadeInterna, useCandidatosDemanda, useDemandaHorarios, useUpdateDemandaMetadata, useDemandaTags, demandasKeys } from '../../hooks'
import { TAG_COLORS } from './DemandasTable'

const { Text, Paragraph } = Typography
const { TextArea } = Input

const DIA_SEMANA_LABELS = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sab',
}

const DIA_SHORT = {
  'Segunda-feira': 'Seg', 'Terça-feira': 'Ter', 'Quarta-feira': 'Qua',
  'Quinta-feira': 'Qui', 'Sexta-feira': 'Sex', 'Sábado': 'Sab', 'Domingo': 'Dom',
}

const DIA_ORDER = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']

const TURNO_ORDER = ['MANHA', 'TARDE', 'NOITE', 'ESPECIAL']

const TURNO_COLORS = { MANHA: 'orange', TARDE: 'blue', NOITE: 'purple', ESPECIAL: 'cyan' }

const fmtTime = (t) => t ? t.slice(0, 5) : ''

/** Summarise schedule slots into compact "Seg-Sex 07:30-12:50" style string */
function summariseSchedule(slots) {
  if (!slots || slots.length === 0) return '—'
  const byDay = {}
  for (const s of slots) {
    const d = DIA_SHORT[s.dia_semana] || s.dia_semana
    if (!byDay[d]) byDay[d] = []
    byDay[d].push(`${fmtTime(s.hora_ini)}-${fmtTime(s.hora_fim)}`)
  }
  const days = DIA_ORDER.map(d => DIA_SHORT[d]).filter(d => byDay[d])
  if (days.length === 0) return '—'

  // Get unique sorted time ranges
  const allTimes = [...new Set(Object.values(byDay).flat())].sort()
  const timeRange = allTimes.length <= 2
    ? allTimes.join(', ')
    : `${allTimes[0].split('-')[0]}-${allTimes[allTimes.length - 1].split('-')[1]}`

  // Compact day range: "Seg-Sex" if consecutive Mon-Fri
  const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
  const isFullWeek = weekdays.every(d => days.includes(d)) && days.length === 5
  const dayStr = isFullWeek ? 'Seg-Sex' : days.join(', ')

  return `${dayStr} ${timeRange}`
}

/**
 * Modal that shows demand details with turno breakdown, tags, observação,
 * horários, and candidates who could fill it.
 *
 * @param {Object}   demanda - The clicked demand row
 * @param {boolean}  open
 * @param {Function} onClose
 * @param {Function} afterClose
 * @param {Function} onPersonClick - Called with { type: 'colaborador'|'candidato', id, record }
 */
export default function DemandaDetailModal({ demanda, open, onClose, afterClose, onPersonClick }) {
  const [editingObs, setEditingObs] = useState(false)
  const [obsText, setObsText] = useState('')

  const mobilidadeParams = demanda ? {
    cod_materia: demanda.cod_materia,
    id_unidade: demanda.id_unidade,
    id_subregional: demanda.id_subregional,
  } : null

  const candidatosParams = demanda ? {
    cod_materia: demanda.cod_materia,
    nome_materia: demanda.nome_materia,
    id_subregional: demanda.id_subregional,
  } : null

  const horariosParams = demanda ? {
    id_unidade: demanda.id_unidade,
    cod_materia: demanda.cod_materia,
  } : null

  const {
    data: colaboradores = [],
    isLoading: loadingColaboradores,
    isError: errorColaboradores,
    error: errorColaboradoresObj,
    refetch: refetchColaboradores,
  } = useMobilidadeInterna(mobilidadeParams, { enabled: open && !!demanda })

  const {
    data: candidatos = [],
    isLoading: loadingCandidatos,
    isError: errorCandidatos,
    error: errorCandidatosObj,
    refetch: refetchCandidatos,
  } = useCandidatosDemanda(candidatosParams, { enabled: open && !!demanda })

  const {
    data: horarios = [],
    isLoading: loadingHorarios,
  } = useDemandaHorarios(horariosParams, { enabled: open && !!demanda })

  const updateMetadata = useUpdateDemandaMetadata()
  const { data: existingTags = [] } = useDemandaTags({ enabled: open })
  const queryClient = useQueryClient()
  const [creatingTag, setCreatingTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  // ─── Tag handling ─────────────────────────────────
  const currentTags = demanda?.tags || []

  // Build unique tag list: existing from DB + any current tags not yet in DB
  const allTagOptions = (() => {
    const fromDb = existingTags.map(t => t.name)
    const merged = [...new Set([...fromDb, ...currentTags])]
    merged.sort((a, b) => a.localeCompare(b, 'pt-BR'))
    return merged
  })()

  const handleTagChange = async (newTags) => {
    if (!demanda) return
    try {
      await updateMetadata.mutateAsync({
        cod_materia: demanda.cod_materia,
        id_unidade: demanda.id_unidade,
        tags: newTags,
      })
      demanda.tags = newTags
      queryClient.invalidateQueries({ queryKey: demandasKeys.tags() })
      message.success('Tags atualizadas')
    } catch {
      message.error('Erro ao atualizar tags')
    }
  }

  const handleCreateTag = async () => {
    const name = newTagName.trim()
    if (!name || !demanda) return
    setCreatingTag(false)
    setNewTagName('')
    const newTags = [...currentTags, name]
    await handleTagChange(newTags)
  }

  // ─── Observação handling ──────────────────────────
  const handleSaveObs = async () => {
    if (!demanda) return
    try {
      await updateMetadata.mutateAsync({
        cod_materia: demanda.cod_materia,
        id_unidade: demanda.id_unidade,
        observacao: obsText || null,
      })
      demanda.observacao = obsText || null
      setEditingObs(false)
      message.success('Observacao atualizada')
    } catch {
      message.error('Erro ao atualizar observacao')
    }
  }

  const startEditObs = () => {
    setObsText(demanda?.observacao || '')
    setEditingObs(true)
  }

  // ─── SLA info ─────────────────────────────────────
  const getSlaInfo = () => {
    if (!demanda?.first_seen_at) return null
    if (demanda.closed_at) {
      const days = dayjs(demanda.closed_at).diff(dayjs(demanda.first_seen_at), 'day')
      return { days, status: 'closed', label: `Fechada em ${days} dias` }
    }
    const days = dayjs().diff(dayjs(demanda.first_seen_at), 'day')
    if (days >= 10) return { days, status: 'alert', label: `${days} dias - Alerta!` }
    if (days >= 5) return { days, status: 'attention', label: `${days} dias - Atencao` }
    return { days, status: 'ok', label: `${days} dias` }
  }

  const sla = getSlaInfo()

  // ─── Mobilidade Interna columns ──────────────────
  const colaboradorColumns = [
    {
      title: 'Nome',
      dataIndex: 'nome',
      key: 'nome',
      render: (nome, record) => (
        <a onClick={() => onPersonClick?.({ type: 'colaborador', id: record.id_colaborador, record })}>
          {nome}
        </a>
      ),
    },
    {
      title: 'Unidade(s)',
      dataIndex: 'unidade_nomes',
      key: 'unidade',
      ellipsis: true,
      render: (nomes) => {
        if (!nomes || nomes.length === 0) return '-'
        if (nomes.length === 1) return nomes[0]
        return (
          <Tooltip title={nomes.join(', ')}>
            <span>{nomes[0]} <Tag>+{nomes.length - 1}</Tag></span>
          </Tooltip>
        )
      },
    },
    {
      title: 'Aulas',
      dataIndex: 'aulas_ativas',
      key: 'aulas',
      width: 100,
      align: 'center',
      render: (n) => `${n}/40`,
    },
    {
      title: 'Horarios Livres',
      key: 'horarios',
      width: 140,
      align: 'center',
      render: (_, r) => {
        if (!r.total_horarios_demanda) return '-'
        const pct = Math.round((r.horarios_disponiveis / r.total_horarios_demanda) * 100)
        const color = pct >= 80 ? '#52c41a' : pct >= 50 ? '#faad14' : '#ff4d4f'
        return (
          <Tooltip title={`${r.horarios_disponiveis} de ${r.total_horarios_demanda} horarios livres`}>
            <Progress
              percent={pct}
              size="small"
              strokeColor={color}
              format={() => `${r.horarios_disponiveis}/${r.total_horarios_demanda}`}
            />
          </Tooltip>
        )
      },
    },
    {
      title: 'Disciplinas',
      dataIndex: 'materias_compativeis',
      key: 'materias',
      ellipsis: true,
      render: (arr) => (
        <Space wrap size={[0, 4]}>
          {(arr || []).slice(0, 3).map(m => <Tag key={m}>{m}</Tag>)}
          {(arr || []).length > 3 && <Tag>+{arr.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Localizacao',
      key: 'loc',
      width: 150,
      render: (_, r) => {
        if (r.prioridade === 0) return <Tag color="blue">Mesma unidade</Tag>
        if (r.prioridade === 1) return <Tag color="cyan">Mesma subregional</Tag>
        return <Tag>Outra subregional</Tag>
      },
    },
    {
      title: 'Contato',
      key: 'contato',
      width: 200,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          {(r.telefone || r.celular) && (
            <Text type="secondary" style={{ fontSize: 12 }}><PhoneOutlined /> {r.celular || r.telefone}</Text>
          )}
          {r.email && <Text type="secondary" style={{ fontSize: 12 }}><MailOutlined /> {r.email}</Text>}
        </Space>
      ),
    },
  ]

  // ─── Candidatos columns ──────────────────────────
  const candidatoColumns = [
    {
      title: 'Nome',
      dataIndex: 'nome',
      key: 'nome',
      render: (nome, record) => (
        <a onClick={() => onPersonClick?.({ type: 'candidato', id: record.candidate_id, record })}>
          {nome}
        </a>
      ),
    },
    { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
    { title: 'Telefone', dataIndex: 'telefone', key: 'telefone', width: 130 },
    {
      title: 'Etapa Atual',
      key: 'step',
      width: 250,
      render: (_, r) => {
        const counts = {}
        for (const c of r.candidaturas || []) {
          const step = c.current_step_name || 'Sem etapa'
          counts[step] = (counts[step] || 0) + 1
        }
        return (
          <Space size={[4, 4]} wrap>
            {Object.entries(counts).map(([step, count]) => (
              <Tag key={step}>{step}{count > 1 ? ` (${count})` : ''}</Tag>
            ))}
          </Space>
        )
      },
    },
    {
      title: 'Subregional Candidatura',
      key: 'subregional',
      width: 220,
      render: (_, r) => {
        const seen = new Set()
        const subs = []
        for (const c of r.candidaturas || []) {
          const key = c.id_subregional
          if (seen.has(key)) continue
          seen.add(key)
          subs.push(c)
        }
        return (
          <Space size={[4, 4]} wrap>
            {subs.map(s => (
              <Tag key={s.id_subregional} color={s.distancia === 0 ? 'blue' : undefined}>
                {s.distancia === 0 ? 'Mesma subregional' : (s.nome_subregional || 'Sem subregional')}
              </Tag>
            ))}
          </Space>
        )
      },
    },
  ]

  // ─── Turno breakdown ─────────────────────────────
  const turnos = demanda?.turnos || []

  // ─── Horarios rendering ──────────────────────────
  const renderHorarios = () => {
    if (loadingHorarios) return <Spin size="small" />
    if (!horarios || horarios.length === 0) return <Text type="secondary">Nenhuma turma com aulas abertas</Text>

    // Group turmas by turno
    const byTurno = {}
    for (const h of horarios) {
      const t = h.turno || 'OUTRO'
      if (!byTurno[t]) byTurno[t] = []
      byTurno[t].push(h)
    }

    const sortedTurnos = TURNO_ORDER.filter(t => byTurno[t])
    for (const t of Object.keys(byTurno)) {
      if (!sortedTurnos.includes(t)) sortedTurnos.push(t)
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sortedTurnos.map(turno => {
          const turmas = byTurno[turno]
          const totalAbertas = turmas.reduce((s, t) => s + (t.aulas_abertas || 0), 0)
          return (
            <div key={turno}>
              <div style={{ marginBottom: 8 }}>
                <Tag color={TURNO_COLORS[turno] || 'default'}>{turno}</Tag>
                <Text strong>{totalAbertas} aula{totalAbertas !== 1 ? 's' : ''} aberta{totalAbertas !== 1 ? 's' : ''}</Text>
                <Text type="secondary"> em {turmas.length} turma{turmas.length !== 1 ? 's' : ''}</Text>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', fontWeight: 600 }}>Turma</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0', fontWeight: 600, width: 80 }}>Abertas</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', fontWeight: 600 }}>Horário</th>
                  </tr>
                </thead>
                <tbody>
                  {turmas.map(t => (
                    <tr key={t.nome_turma}>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0' }}>{t.nome_turma}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#cf1322' }}>
                        {t.aulas_abertas}/{t.aulas_necessarias}
                      </td>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', fontSize: 12, color: '#595959' }}>
                        {summariseSchedule(t.horarios)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    )
  }

  // ─── Tab items ───────────────────────────────────
  const tabItems = [
    {
      key: 'mobilidade',
      label: (
        <span>
          <TeamOutlined /> Mobilidade Interna
          {!loadingColaboradores && <Badge count={colaboradores.length} style={{ marginLeft: 8 }} showZero />}
        </span>
      ),
      children: loadingColaboradores ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : errorColaboradores ? (
        <Alert
          type="error"
          message="Erro ao carregar colaboradores"
          description={errorColaboradoresObj?.message}
          showIcon
          action={<Button size="small" onClick={() => refetchColaboradores()}>Tentar novamente</Button>}
        />
      ) : (
        <Table
          columns={colaboradorColumns}
          dataSource={colaboradores}
          rowKey="cpf"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 1000 }}
          locale={{ emptyText: 'Nenhum colaborador disponivel para esta demanda' }}
        />
      ),
    },
    {
      key: 'candidatos',
      label: (
        <span>
          <UserOutlined /> Candidatos no PS
          {!loadingCandidatos && <Badge count={candidatos.length} style={{ marginLeft: 8 }} showZero />}
        </span>
      ),
      children: loadingCandidatos ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : errorCandidatos ? (
        <Alert
          type="error"
          message="Erro ao carregar candidatos"
          description={errorCandidatosObj?.message}
          showIcon
          action={<Button size="small" onClick={() => refetchCandidatos()}>Tentar novamente</Button>}
        />
      ) : (
        <Table
          columns={candidatoColumns}
          dataSource={candidatos}
          rowKey="candidate_id"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 800 }}
          locale={{ emptyText: 'Nenhum candidato encontrado com curriculo compativel' }}
        />
      ),
    },
    {
      key: 'horarios',
      label: (
        <span>
          <ScheduleOutlined /> Horarios
        </span>
      ),
      children: renderHorarios(),
    },
  ]

  return (
    <Modal
      title={
        demanda
          ? `${demanda.nome_materia} — ${demanda.nome_unidade}`
          : 'Detalhes da Demanda'
      }
      open={open}
      onCancel={onClose}
      afterClose={() => { setEditingObs(false); afterClose?.() }}
      footer={null}
      width={1100}
      destroyOnClose
    >
      {demanda && (
        <>
          {/* Summary tags */}
          <Space style={{ marginBottom: 12 }} wrap>
            <Tag color="red">{demanda.total_aulas_abertas} aulas abertas</Tag>
            <Tag color="blue">{demanda.total_aulas_atribuidas} / {demanda.total_aulas_necessarias} atribuidas</Tag>
            <Tag>{demanda.nome_subregional}</Tag>
            {sla && (
              <Tag
                color={sla.status === 'alert' ? 'red' : sla.status === 'attention' ? 'orange' : sla.status === 'closed' ? 'green' : 'default'}
                icon={sla.status === 'alert' ? <WarningOutlined /> : sla.status === 'attention' ? <ClockCircleOutlined /> : null}
              >
                {sla.label}
              </Tag>
            )}
          </Space>

          {/* Turno breakdown */}
          {turnos.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Por turno: </Text>
              <Space wrap size={[4, 4]}>
                {turnos.map(t => (
                  <Tooltip
                    key={t.turno}
                    title={`${t.aulas_atribuidas}/${t.aulas_necessarias} atribuidas, ${t.aulas_abertas} abertas`}
                  >
                    <Tag color={t.aulas_abertas > 0 ? 'volcano' : 'green'}>
                      {t.turno}: {t.aulas_abertas} abertas
                    </Tag>
                  </Tooltip>
                ))}
              </Space>
            </div>
          )}

          {/* Tags management */}
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>Status: </Text>
            <Select
              mode="multiple"
              placeholder="Adicionar tags..."
              value={currentTags}
              onChange={handleTagChange}
              style={{ minWidth: 300 }}
              loading={updateMetadata.isPending}
              size="small"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <div
                    style={{ padding: '4px 8px', borderTop: '1px solid #f0f0f0' }}
                    onMouseDown={e => e.preventDefault()}
                  >
                    {!creatingTag ? (
                      <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => setCreatingTag(true)}>
                        Criar nova tag
                      </Button>
                    ) : (
                      <Space.Compact size="small" style={{ width: '100%' }}>
                        <Input
                          placeholder="Nome da nova tag"
                          value={newTagName}
                          onChange={e => setNewTagName(e.target.value)}
                          onPressEnter={handleCreateTag}
                          autoFocus
                        />
                        <Button type="primary" onClick={handleCreateTag} disabled={!newTagName.trim()}>OK</Button>
                      </Space.Compact>
                    )}
                  </div>
                </>
              )}
            >
              {allTagOptions.map(tag => (
                <Select.Option key={tag} value={tag}>
                  <Tag color={TAG_COLORS[tag] || 'default'}>{tag}</Tag>
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* Observação */}
          <div style={{ marginBottom: 16, background: '#fafafa', padding: '8px 12px', borderRadius: 6 }}>
            <Space>
              <Text type="secondary" style={{ fontSize: 12 }}>Observacao:</Text>
              {!editingObs && (
                <Button type="link" size="small" icon={<EditOutlined />} onClick={startEditObs}>
                  {demanda.observacao ? 'Editar' : 'Adicionar'}
                </Button>
              )}
            </Space>
            {editingObs ? (
              <div style={{ marginTop: 4 }}>
                <TextArea
                  value={obsText}
                  onChange={(e) => setObsText(e.target.value)}
                  rows={3}
                  placeholder="Anotacoes sobre esta demanda..."
                  maxLength={2000}
                  showCount
                />
                <Space style={{ marginTop: 8 }}>
                  <Button size="small" type="primary" onClick={handleSaveObs} loading={updateMetadata.isPending}>
                    Salvar
                  </Button>
                  <Button size="small" onClick={() => setEditingObs(false)}>Cancelar</Button>
                </Space>
              </div>
            ) : (
              demanda.observacao && <Paragraph style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>{demanda.observacao}</Paragraph>
            )}
          </div>
        </>
      )}
      <Tabs defaultActiveKey="mobilidade" items={tabItems} />
    </Modal>
  )
}
