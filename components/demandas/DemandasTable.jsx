import { Table, Tag, Button, Tooltip, Space } from 'antd'
import { SearchOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const TAG_COLORS = {
  'Prova': 'blue',
  'Aula Teste': 'green',
  'Trabalhando Funil': 'orange',
  'Concluída': 'default',
}

/**
 * Main table for displaying open teaching demands (consolidated by materia+unidade)
 *
 * @param {Object[]} demandas - Array of demand rows from vw_demandas + metadata
 * @param {boolean}  loading
 * @param {Object}   pagination - { current, pageSize, total }
 * @param {Function} onTableChange - Ant Design Table onChange handler
 * @param {Function} onDemandaClick - Called with the full demand row object
 */
export default function DemandasTable({
  demandas,
  loading,
  pagination,
  onTableChange,
  onDemandaClick,
}) {
  const columns = [
    {
      title: 'Disciplina',
      dataIndex: 'nome_materia',
      key: 'nome_materia',
      render: (nome, record) => (
        <a onClick={() => onDemandaClick?.(record)}>{nome}</a>
      ),
    },
    {
      title: 'Aulas Abertas',
      dataIndex: 'total_aulas_abertas',
      key: 'total_aulas_abertas',
      width: 130,
      align: 'center',
      sorter: (a, b) => a.total_aulas_abertas - b.total_aulas_abertas,
      render: (n) => (
        <Tag color={n >= 20 ? 'red' : n >= 10 ? 'orange' : 'gold'}>{n}</Tag>
      ),
    },
    {
      title: 'Total / Atribuidas',
      key: 'aulas_info',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <span>{record.total_aulas_atribuidas} / {record.total_aulas_necessarias}</span>
      ),
    },
    {
      title: 'Unidade',
      dataIndex: 'nome_unidade',
      key: 'nome_unidade',
      ellipsis: true,
    },
    {
      title: 'Subregional',
      dataIndex: 'nome_subregional',
      key: 'nome_subregional',
      width: 160,
      render: (nome) => <Tag>{nome}</Tag>,
    },
    {
      title: 'Tags',
      key: 'tags',
      width: 200,
      render: (_, record) => {
        const tags = record.tags || []
        if (tags.length === 0) return <span style={{ color: '#bbb' }}>-</span>
        return (
          <Space wrap size={[0, 4]}>
            {tags.map(t => <Tag key={t} color={TAG_COLORS[t] || 'default'}>{t}</Tag>)}
          </Space>
        )
      },
    },
    {
      title: 'SLA',
      key: 'sla',
      width: 100,
      align: 'center',
      sorter: (a, b) => {
        const daysA = a.first_seen_at ? dayjs().diff(dayjs(a.first_seen_at), 'day') : 0
        const daysB = b.first_seen_at ? dayjs().diff(dayjs(b.first_seen_at), 'day') : 0
        return daysA - daysB
      },
      render: (_, record) => {
        if (record.closed_at) {
          const closedDays = dayjs(record.closed_at).diff(dayjs(record.first_seen_at), 'day')
          return <Tooltip title={`Fechada em ${closedDays}d`}><Tag color="green">{closedDays}d</Tag></Tooltip>
        }
        if (!record.first_seen_at) return '-'
        const days = dayjs().diff(dayjs(record.first_seen_at), 'day')
        if (days >= 10) {
          return (
            <Tooltip title={`${days} dias aberta - Alerta!`}>
              <Tag color="red" icon={<WarningOutlined />}>{days}d</Tag>
            </Tooltip>
          )
        }
        if (days >= 5) {
          return (
            <Tooltip title={`${days} dias aberta - Atencao`}>
              <Tag color="orange" icon={<ClockCircleOutlined />}>{days}d</Tag>
            </Tooltip>
          )
        }
        return <Tooltip title={`${days} dias aberta`}><Tag>{days}d</Tag></Tooltip>
      },
    },
    {
      title: '',
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Tooltip title="Ver candidatos e mobilidade interna">
          <Button
            icon={<SearchOutlined />}
            size="small"
            onClick={() => onDemandaClick?.(record)}
          />
        </Tooltip>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={demandas}
      rowKey={(r) => `${r.id_unidade}-${r.cod_materia}`}
      loading={loading}
      pagination={{
        current: pagination?.current || 1,
        pageSize: pagination?.pageSize || 50,
        total: pagination?.total || 0,
        showSizeChanger: true,
        pageSizeOptions: ['25', '50', '100'],
        showTotal: (total) => `${total} demandas`,
      }}
      onChange={onTableChange}
      size="middle"
      scroll={{ x: 900 }}
    />
  )
}

export { TAG_COLORS }
