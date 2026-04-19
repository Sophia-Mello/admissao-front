"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import auth from '../lib/auth'
import { getErrorMessage } from '../lib/errorHandler'
import { Card, Form, Input, Button, Alert, Typography } from 'antd'
const { Title } = Typography

export default function Login() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // if already logged in redirect based on role
    if (auth.getToken()) {
      const user = auth.getUser()
      const destination = user?.role === 'salu' ? '/exames-ocupacionais' : '/dashboard'
      router.replace(destination)
    }

    // capture uncaught errors and surface them to console
    const onErr = (event) => {
      // event may be ErrorEvent or string
      console.error('[login] window error', event)
    }
    window.addEventListener && window.addEventListener('error', onErr)
    return () => window.removeEventListener && window.removeEventListener('error', onErr)
  }, [])

  async function onFinish(values) {
    setError(null)
    setLoading(true)
  console.log('[login] onFinish called', values)
    try {
  const res = await auth.login(values.email, values.password)
  console.log('[login] auth.login result', res)
      if (res?.token) {
        // Force a full page navigation and include the token as a query param so
        // server-side middleware can set the cookie on the first request.
        if (typeof window !== 'undefined') {
          try {
            const t = res.token || (res && res.token) || res
            // Get user role to determine redirect destination
            const user = auth.getUser()
            const destination = user?.role === 'salu' ? '/exames-ocupacionais' : '/dashboard'
            window.location.href = `${destination}?token=${encodeURIComponent(t)}`
            return
          } catch (e) {
            window.location.href = '/dashboard'
            return
          }
        }
        router.replace('/dashboard')
        return
      }
      setError('Credenciais inválidas')
    } catch (err) {
      console.error('[login] auth.login threw', err)
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f0f2f5'}}>
      <Card style={{width:420}}>
        <div style={{textAlign:'center', marginBottom: 12}}>
          <Title level={3} style={{margin:0}}>RH SISTEMA</Title>
          {/* use simple Text from Card or keep secondary subtitle */}
          <div style={{color:'#888'}}>Acessar o sistema</div>
        </div>
        {error && <Alert type="error" message={error} style={{marginBottom:12}} />}
        <Form name="login" layout="vertical" onFinish={onFinish}>
          <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Informe o email' }]}> 
            <Input placeholder="seu@exemplo.com" />
          </Form.Item>
          <Form.Item label="Senha" name="password" rules={[{ required: true, message: 'Informe a senha' }]}> 
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>Entrar</Button>
          </Form.Item>
        </Form>
        <div style={{textAlign:'center'}}>
          <Button type="link" onClick={() => router.push('/forgot')}>Esqueci minha senha</Button>
        </div>
      </Card>
    </div>
  )
}

