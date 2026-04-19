/**
 * /recrutamento page - Redirect to /recrutamento/jobs
 *
 * This is a simple redirect page to maintain clean URL structure.
 * All recrutamento functionality lives under /recrutamento/jobs.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function RecrutamentoIndex() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/recrutamento/jobs')
  }, [router])

  return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <p>Redirecionando...</p>
    </div>
  )
}
