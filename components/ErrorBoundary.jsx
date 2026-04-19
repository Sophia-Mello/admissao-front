"use client"

import React from 'react'
import dynamic from 'next/dynamic'

const Button = dynamic(() => import('antd').then(m => m.Button), { ssr: false })
const Card = dynamic(() => import('antd').then(m => m.Card), { ssr: false })
const Result = dynamic(() => import('antd').then(m => m.Result), { ssr: false })

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  componentDidCatch(error, info) {
    // Log to console (user can copy) and to window so tests can read it
    console.error('ErrorBoundary caught', error, info)
    if (typeof window !== 'undefined') {
      window.__LAST_CLIENT_ERROR__ = { error: (error && error.toString && error.toString()) || String(error), info }
    }
    this.setState({ hasError: true, error, info })
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (Sentry, etc.)
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null })
  }

  render() {
    if (this.state.hasError) {
      const { error, info } = this.state
      return (
        <div style={{ padding: 20, minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card style={{ maxWidth: 500, width: '100%' }}>
            <Result
              status="error"
              title="Erro Inesperado"
              subTitle="Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada."
              extra={[
                <Button type="primary" key="reload" onClick={this.handleReload}>
                  Recarregar Página
                </Button>,
                <Button key="retry" onClick={this.handleReset}>
                  Tentar Novamente
                </Button>
              ]}
            />
            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginTop: 20, padding: 10, background: '#f5f5f5', borderRadius: 4 }}>
                <summary>Detalhes do Erro (Desenvolvimento)</summary>
                <div style={{whiteSpace:'pre-wrap', background:'#111', color:'#fff', padding:12, borderRadius:6, maxHeight:'60vh', overflow:'auto'}}>
                  <strong>Error:</strong>
                  {'\n'}{error && (error.stack || error.toString())}
                  {'\n\n'}
                  <strong>Component stack / info:</strong>
                  {'\n'}{info && (info.componentStack || JSON.stringify(info))}
                </div>
              </details>
            )}
          </Card>
        </div>
      )
    }
    return this.props.children
  }
}
