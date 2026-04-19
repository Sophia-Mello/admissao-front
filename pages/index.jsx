"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import auth from '../lib/auth'

export default function Dashboard() {
  const router = useRouter()

  useEffect(() => {
  if (!auth.getToken()) router.replace('/login')
  else router.replace('/dashboard')
  }, [])

  return (
    <Layout>
      <h2>Dashboard</h2>
      <p>Bem-vindo ao painel.</p>
      <button onClick={() => router.push('/unidades')}>Ver Unidades</button>
    </Layout>
  )
}
