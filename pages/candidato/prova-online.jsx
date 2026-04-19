/**
 * /candidato/prova-online - Public Page for Candidate Scheduling
 *
 * Uses dynamic import with ssr: false to avoid hydration issues.
 */

import dynamic from 'next/dynamic';
import { Spin } from 'antd';

const ProvaOnlineContent = dynamic(
  () => import('../../components/candidato/ProvaOnlineContent'),
  {
    ssr: false,
    loading: () => (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    ),
  }
);

export default function ProvaOnlinePage() {
  return <ProvaOnlineContent />;
}
