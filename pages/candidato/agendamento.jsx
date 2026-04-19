// pages/candidato/agendamento.jsx

/**
 * Public Booking Page (Agendamento)
 *
 * URL: /candidato/agendamento?jobId=X&applicationId=Y
 *
 * This page allows candidates to schedule test classes (aulas teste)
 * at educational units.
 *
 * Flow:
 * 1. Validate eligibility (blocking check)
 * 2. Show list of available units
 * 3. User selects unit
 * 4. Show weekly calendar with available slots
 * 5. User selects slot and confirms
 * 6. Show success screen
 *
 * This is a PUBLIC page - no authentication required.
 */

import { useRouter } from 'next/router';
import BookingWizard from '../../components/booking/BookingWizard';
import ErrorDisplay from '../../components/booking/ErrorDisplay';

export default function Agendamento() {
  const router = useRouter();
  const { jobId, applicationId } = router.query;

  // Wait for router to be ready
  if (!router.isReady) {
    return null;
  }

  // Validate required query params
  if (!jobId || !applicationId) {
    return (
      <main
        role="main"
        style={{
          minHeight: '100vh',
          background: '#f0f2f5',
          padding: '20px',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ErrorDisplay
            error={{
              message: 'Link de agendamento invalido. Verifique se voce acessou pelo link correto enviado pelo Gupy.',
              type: 'invalid-params',
            }}
            onRetry={() => router.reload()}
          />
        </div>
      </main>
    );
  }

  return <BookingWizard jobId={jobId} applicationId={applicationId} />;
}
