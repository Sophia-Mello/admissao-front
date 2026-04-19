"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import auth from '../lib/auth'

const Row = dynamic(() => import('antd').then(m => m.Row), { ssr: false })
const Col = dynamic(() => import('antd').then(m => m.Col), { ssr: false })
const Card = dynamic(() => import('antd').then(m => m.Card), { ssr: false })
const Button = dynamic(() => import('antd').then(m => m.Button), { ssr: false })
const Space = dynamic(() => import('antd').then(m => m.Space), { ssr: false })
const Title = dynamic(() => import('antd').then(m => m.Typography.Title), { ssr: false })
const Text = dynamic(() => import('antd').then(m => m.Typography.Text), { ssr: false })
const SolutionOutlined = dynamic(() => import('@ant-design/icons').then(m => m.SolutionOutlined), { ssr: false })
const TeamOutlined = dynamic(() => import('@ant-design/icons').then(m => m.TeamOutlined), { ssr: false })
const CalendarOutlined = dynamic(() => import('@ant-design/icons').then(m => m.CalendarOutlined), { ssr: false })
const FileSearchOutlined = dynamic(() => import('@ant-design/icons').then(m => m.FileSearchOutlined), { ssr: false })
const EyeOutlined = dynamic(() => import('@ant-design/icons').then(m => m.EyeOutlined), { ssr: false })
const ContainerOutlined = dynamic(() => import('@ant-design/icons').then(m => m.ContainerOutlined), { ssr: false })
const ApartmentOutlined = dynamic(() => import('@ant-design/icons').then(m => m.ApartmentOutlined), { ssr: false })
const Layout = dynamic(() => import('../components/Layout').catch(() => ({ default: () => <div /> })), { ssr: false })

export default function Dashboard() {
  const router = useRouter()
  const [role, setRole] = useState('guest')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const user = auth.getUser && auth.getUser()
    setRole(user?.role || 'guest')
    setUserName(user?.nome || '')
  }, [])

  // R&S Admissao widgets only
  const widgets = [
    {
      key: 'jobs',
      title: 'Gestao de Vagas',
      description: 'Criar e gerenciar vagas regionais com templates Gupy',
      icon: <SolutionOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      route: '/recrutamento/jobs',
      roles: ['admin', 'recrutamento']
    },
    {
      key: 'eventos',
      title: 'Agendamentos de Prova',
      description: 'Gerenciar eventos e provas de candidatos',
      icon: <FileSearchOutlined style={{ fontSize: 32, color: '#fa8c16' }} />,
      route: '/recrutamento/eventos',
      roles: ['admin', 'recrutamento']
    },
    {
      key: 'fiscalizacao',
      title: 'Fiscalização de Prova',
      description: 'Acompanhar candidatos durante a prova online',
      icon: <EyeOutlined style={{ fontSize: 32, color: '#13c2c2' }} />,
      route: '/recrutamento/fiscalizacao',
      roles: ['admin', 'recrutamento', 'fiscal_prova']
    },
    {
      key: 'scheduler',
      title: 'Agendamento de Aulas-Teste',
      description: 'Gerenciar calendario de aulas teste por unidade',
      icon: <CalendarOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
      route: '/recrutamento/scheduler',
      roles: ['admin', 'recrutamento']
    },
    {
      key: 'gestao-candidaturas',
      title: 'Gestao de Candidaturas',
      description: 'Visualizar, filtrar e enviar emails para candidatos',
      icon: <ContainerOutlined style={{ fontSize: 32, color: '#eb2f96' }} />,
      route: '/recrutamento/gestao-de-candidaturas',
      roles: ['admin', 'recrutamento']
    },
    {
      key: 'gestao-demandas',
      title: 'Gestao de Demandas',
      description: 'Posicoes docentes abertas por disciplina e unidade',
      icon: <ApartmentOutlined style={{ fontSize: 32, color: '#2f54eb' }} />,
      route: '/recrutamento/gestao-de-demandas',
      roles: ['admin', 'recrutamento']
    },
    {
      key: 'usuarios',
      title: 'Gestao de Usuarios',
      description: 'Gerenciar usuarios do sistema',
      icon: <TeamOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      route: '/usuarios',
      roles: ['admin']
    },
  ]

  const canAccess = (widget) => {
    return widget.roles.includes(role)
  }

  const accessibleWidgets = widgets.filter(canAccess)

  return (
    <Layout>
      <div style={{ padding: 20 }}>
        <div style={{ marginBottom: 24 }}>
          <Title style={{ margin: 0 }}>R&S Admissao</Title>
          <Text type="secondary">
            Sistema de Agendamento de Aulas Teste
          </Text>
          <div style={{ marginTop: 8 }}>
            <Text>
              Perfil: <strong>
                {role === 'admin' ? 'Administrador' :
                 role === 'recrutamento' ? 'Recrutamento & Selecao' :
                 role === 'fiscal_prova' ? 'Fiscal de Prova' :
                 role}
              </strong>
            </Text>
          </div>
        </div>

        {accessibleWidgets.length === 0 ? (
          <Card>
            <Text type="secondary">
              Voce nao possui acesso a nenhum modulo. Entre em contato com o administrador.
            </Text>
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {accessibleWidgets.map(w => (
              <Col key={w.key} xs={24} sm={24} md={12} lg={8}>
                <Card
                  hoverable
                  onClick={() => router.push(w.route)}
                  style={{ height: '100%', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div>{w.icon}</div>
                    <div style={{ flex: 1 }}>
                      <Title level={4} style={{ margin: 0 }}>{w.title}</Title>
                      <Text type="secondary">{w.description}</Text>
                    </div>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <Button type="primary" block>
                      Acessar
                    </Button>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        <Space direction="vertical" style={{ marginTop: 24 }}>
          <Text type="secondary">
            Caso precise de acessos adicionais, contate o administrador.
          </Text>
        </Space>
      </div>
    </Layout>
  )
}
