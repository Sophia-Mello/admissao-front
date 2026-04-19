"use client"

import 'antd/dist/reset.css'
import '../styles/globals.css'
import { ConfigProvider } from 'antd'
import ErrorBoundary from '../components/ErrorBoundary'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { useEffect } from 'react'

export default function App({ Component, pageProps }) {

  // Diagnostic: print react-query module/version on client to detect stale bundles or duplicates
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      // Try to access exported version if available
      import('@tanstack/react-query').then((rq) => {
        const ver = rq && rq.version ? rq.version : (rq && typeof rq === 'object' ? Object.keys(rq).slice(0,5) : String(rq))
        // mark clearly in console
        // eslint-disable-next-line no-console
        console.info('RQ_MARKER', ver)
        // also expose to window for easier automated checks
        // @ts-ignore
        window.__RQ_MARKER = ver
      }).catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('RQ_MARKER failed to read @tanstack/react-query', e && e.message)
        // @ts-ignore
        window.__RQ_MARKER = null
      })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('RQ_MARKER failed to read @tanstack/react-query', e && e.message)
      // @ts-ignore
      window.__RQ_MARKER = null
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <ErrorBoundary>
          <Component {...pageProps} />
        </ErrorBoundary>
      </ConfigProvider>
    </QueryClientProvider>
  )
}
