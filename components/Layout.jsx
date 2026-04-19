"use client"

import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import auth from '../lib/auth'

// load Ant Design components on client only to avoid server ESM issues
const AntLayout = dynamic(() => import('antd').then(mod => mod.Layout), { ssr: false })
const Header = dynamic(() => import('antd').then(mod => mod.Layout.Header), { ssr: false })
const Content = dynamic(() => import('antd').then(mod => mod.Layout.Content), { ssr: false })
const Button = dynamic(() => import('antd').then(mod => mod.Button), { ssr: false })
const Space = dynamic(() => import('antd').then(mod => mod.Space), { ssr: false })
const TypographyText = dynamic(() => import('antd').then(mod => mod.Typography.Text), { ssr: false })
const Dropdown = dynamic(() => import('antd').then(mod => mod.Dropdown), { ssr: false })
const Avatar = dynamic(() => import('antd').then(mod => mod.Avatar), { ssr: false })
// small fallback caret instead of dynamic import for icons
const Caret = () => <span style={{ fontSize: 12 }}>▾</span>

export default function Layout({ children }) {
  const router = useRouter()
  const user = auth.getUser() || {}

  function handleLogout() {
    auth.logout()
    router.replace('/login')
  }

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <TypographyText style={{ color: '#fff', fontWeight: 700 }}>R&S ADMISSAO</TypographyText>
        <Space>
          <Button type="default" onClick={() => router.push('/dashboard')}>Dashboard</Button>
          {(user?.role === 'admin' || user?.role === 'recrutamento' || user?.role === 'salu') && (
            <Button type="default" onClick={() => router.push('/exames-ocupacionais')}>Exames Ocupacionais</Button>
          )}
          {/* user dropdown on top-right (menu built as items array to avoid Menu.Item undefined when using dynamic import) */}
          {(() => {
            const items = []
            if (user?.role === 'admin' || user?.role === 'recrutamento') {
              items.push({ key: 'jobs', label: 'Gestao de Vagas', onClick: () => router.push('/recrutamento/jobs') })
              items.push({ key: 'scheduler', label: 'Agendamento Aulas-Teste', onClick: () => router.push('/recrutamento/scheduler') })
              items.push({ key: 'eventos', label: 'Agendamento de Provas', onClick: () => router.push('/recrutamento/eventos') })
              items.push({ key: 'gestao-candidaturas', label: 'Gestao de Candidaturas', onClick: () => router.push('/recrutamento/gestao-de-candidaturas') })
              items.push({ key: 'gestao-demandas', label: 'Gestao de Demandas', onClick: () => router.push('/recrutamento/gestao-de-demandas') })
              items.push({ key: 'exames-ocupacionais', label: 'Exames Ocupacionais', onClick: () => router.push('/exames-ocupacionais') })
              items.push({ type: 'divider' })
              items.push({ key: 'regional-jobs', label: 'Jobs Regionais (Legacy)', onClick: () => router.push('/admin/regional-jobs') })
            }
            if (user?.role === 'salu') {
              items.push({ key: 'exames-ocupacionais', label: 'Exames Ocupacionais', onClick: () => router.push('/exames-ocupacionais') })
            }
            if (user?.role === 'admin') {
              items.push({ key: 'users', label: 'Gestao de Usuarios', onClick: () => router.push('/usuarios') })
            }
            items.push({ type: 'divider' })
            items.push({ key: 'logout', label: 'Sair', onClick: handleLogout })
            return (
              <Dropdown menu={{ items }}>
                <a style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <Avatar style={{ backgroundColor: '#1890ff' }}>{(user?.nome || user?.email || 'U').charAt(0)}</Avatar>
                  <span>{user?.nome || user?.email || 'Usuário'}</span>
                  <Caret />
                </a>
              </Dropdown>
            )
          })()}
        </Space>
      </Header>
      <Content style={{ padding: 24 }}>{children}</Content>
    </AntLayout>
  )
}
