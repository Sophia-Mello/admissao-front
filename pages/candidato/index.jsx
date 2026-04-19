/**
 * /candidato - Hub Page for Candidate Scheduling
 *
 * Unified hub for all candidate scheduling systems:
 * - Prova Online
 * - Aula Teste
 *
 * Uses dynamic import with ssr: false to avoid hydration issues.
 */

import dynamic from 'next/dynamic';
import { Spin } from 'antd';

const CandidatoHub = dynamic(
  () => import('../../components/candidato/CandidatoHub'),
  {
    ssr: false,
    loading: () => (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    ),
  }
);

export default function CandidatoHubPage() {
  return <CandidatoHub />;
}
