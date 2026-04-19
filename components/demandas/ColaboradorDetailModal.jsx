import { Modal, Descriptions, Tag, Space, Typography, Empty, Table, Spin, Alert, Tooltip } from 'antd'
import { UserOutlined, PhoneOutlined, MailOutlined, HomeOutlined, BookOutlined, ScheduleOutlined } from '@ant-design/icons'
import { useColaboradorAtribuicoes } from '../../hooks'

const { Text } = Typography

const DIA_SEMANA = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sab' }

/**
 * Modal showing employee (colaborador) details from internal mobility data.
 * Now fetches and displays active atribuicoes with schedule.
 *
 * @param {boolean}  open
 * @param {Object}   colaborador - Record from mobilidade-interna query
 * @param {Function} onClose
 */
export default function ColaboradorDetailModal({ open, colaborador, onClose }) {
  const {
    data: atribData,
    isLoading: loadingAtrib,
    isError: errorAtrib,
  } = useColaboradorAtribuicoes(colaborador?.id_colaborador, { enabled: open && !!colaborador })

  if (!colaborador) return null

  const r = colaborador
  const unidades = r.unidade_nomes || [r.unidade_atual_nome || '-']

  const atribuicaoColumns = [
    { title: 'Unidade', dataIndex: 'nome_unidade', key: 'unidade', ellipsis: true },
    { title: 'Turma', dataIndex: 'nome_turma', key: 'turma', width: 80 },
    { title: 'Turno', dataIndex: 'turno', key: 'turno', width: 90, render: (t) => <Tag>{t}</Tag> },
    { title: 'Disciplina', dataIndex: 'nome_materia', key: 'materia', ellipsis: true },
    { title: 'Aulas', dataIndex: 'quantidade_aulas', key: 'aulas', width: 70, align: 'center' },
    {
      title: 'Horarios',
      dataIndex: 'horarios',
      key: 'horarios',
      width: 200,
      render: (horarios) => {
        if (!horarios || horarios.length === 0) return <Text type="secondary">-</Text>
        const grouped = {}
        for (const h of horarios) {
          const dia = DIA_SEMANA[h.dia_semana] || h.dia_semana
          if (!grouped[dia]) grouped[dia] = []
          const ini = (h.hora_ini || '').slice(0, 5)
          const fim = (h.hora_fim || '').slice(0, 5)
          grouped[dia].push(`${ini}-${fim}`)
        }
        return (
          <Space wrap size={[4, 2]}>
            {Object.entries(grouped).map(([dia, slots]) => (
              <Tooltip key={dia} title={slots.join(', ')}>
                <Tag color="blue">{dia} ({slots.length})</Tag>
              </Tooltip>
            ))}
          </Space>
        )
      },
    },
  ]

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          <span>{r.nome || 'Detalhes do Colaborador'}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      zIndex={1050}
      destroyOnClose
    >
      <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Nome" span={2}>{r.nome}</Descriptions.Item>
        <Descriptions.Item label={<><MailOutlined /> Email</>}>
          {r.email || '-'}
        </Descriptions.Item>
        <Descriptions.Item label={<><PhoneOutlined /> Telefone</>}>
          {r.celular || r.telefone || '-'}
        </Descriptions.Item>
        <Descriptions.Item label={<><HomeOutlined /> Unidade(s)</>} span={2}>
          <Space wrap>
            {unidades.map((u, i) => <Tag key={i}>{u}</Tag>)}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Tipo Vinculo">
          <Tag color={r.tipo_vinculo === 'CLT' ? 'green' : 'default'}>{r.tipo_vinculo || '-'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Aulas Ativas">
          <Tag color={r.aulas_ativas >= 35 ? 'red' : r.aulas_ativas >= 25 ? 'orange' : 'green'}>
            {r.aulas_ativas} / 40
          </Tag>
        </Descriptions.Item>
        {r.total_horarios_demanda > 0 && (
          <Descriptions.Item label={<><ScheduleOutlined /> Horarios Livres (demanda)</>} span={2}>
            <Tag color={r.horarios_disponiveis > 0 ? 'green' : 'red'}>
              {r.horarios_disponiveis} / {r.total_horarios_demanda} horarios disponiveis
            </Tag>
          </Descriptions.Item>
        )}
      </Descriptions>

      <div style={{ marginBottom: 8 }}>
        <Text strong><BookOutlined /> Disciplinas Compativeis</Text>
      </div>
      {r.materias_compativeis?.length > 0 ? (
        <Space wrap style={{ marginBottom: 16 }}>
          {r.materias_compativeis.map(m => <Tag key={m} color="blue">{m}</Tag>)}
        </Space>
      ) : (
        <Empty description="Nenhuma disciplina compativel" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}

      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <Text strong><ScheduleOutlined /> Suprimentos Ativos</Text>
      </div>
      {loadingAtrib ? (
        <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /></div>
      ) : errorAtrib ? (
        <Alert type="error" message="Erro ao carregar atribuicoes" showIcon />
      ) : atribData?.atribuicoes?.length > 0 ? (
        <Table
          columns={atribuicaoColumns}
          dataSource={atribData.atribuicoes}
          rowKey="id_atribuicao"
          size="small"
          pagination={false}
          scroll={{ x: 700 }}
        />
      ) : (
        <Empty description="Nenhum suprimento ativo" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Modal>
  )
}
