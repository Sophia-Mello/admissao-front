"use client"

import dynamic from 'next/dynamic'

const Card = dynamic(() => import('antd').then(m => m.Card), { ssr: false })
const Statistic = dynamic(() => import('antd').then(m => m.Statistic), { ssr: false })
const Space = dynamic(() => import('antd').then(m => m.Space), { ssr: false })
const Button = dynamic(() => import('antd').then(m => m.Button), { ssr: false })
const Tooltip = dynamic(() => import('antd').then(m => m.Tooltip), { ssr: false })
const Skeleton = dynamic(() => import('antd').then(m => m.Skeleton), { ssr: false })

export default function AdminStatCard({ icon, title, value, onManage, onCreate, disabled = false, loading = false, hideCreate = false, hideValue = false, primaryOpen = false }) {
  if (loading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 1 }} />
      </Card>
    )
  }

  return (
    <Card style={{ opacity: disabled ? 0.6 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {icon}
          <div>
            {hideValue ? (
              <div style={{ minHeight: 62 }}>
                <div style={{ fontSize: 14, color: 'rgba(0, 0, 0, 0.45)', marginBottom: 4 }}>{title}</div>
                <div style={{ height: 38 }}></div>
              </div>
            ) : (
              <Statistic title={title} value={value ?? '-'} />
            )}
            {disabled && <div style={{ color: '#888', fontSize: 12, marginTop: 6 }}>Acesso restrito</div>}
          </div>
        </div>
        <Space>
          <Tooltip title={disabled ? 'Acesso não permitido' : `Gerenciar ${title}`}>
            <Button type={primaryOpen ? "primary" : undefined} size="small" onClick={onManage} disabled={disabled}>Abrir</Button>
          </Tooltip>
          {!hideCreate && (
            <Tooltip title={disabled ? 'Acesso não permitido' : `Criar ${title}`}>
              <Button type="primary" size="small" onClick={onCreate} disabled={disabled}>Novo</Button>
            </Tooltip>
          )}
        </Space>
      </div>
    </Card>
  )
}
