// components/booking/ValidationStep.jsx

import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import * as bookingService from '../../lib/bookingService';
import { getErrorMessage } from '../../lib/errorHandler';

/**
 * ValidationStep - Initial session validation step
 *
 * Validates candidate eligibility by calling the backend API.
 * Shows loading state during validation.
 *
 * Props:
 * - jobId: string - Gupy job ID
 * - applicationId: string - Gupy application ID
 * - onValid: (data) => void - Called when validation succeeds
 *   - data.candidateName: string
 *   - data.candidateEmail: string
 *   - data.jobName: string
 *   - data.existingBooking: object | null
 *   - data.unidades: array
 *   - data.blockedUnits: array - IDs of units where candidate already has booking
 * - onError: (error) => void - Called when validation fails
 *   - error.message: string
 *   - error.type: 'blocked' | 'not-found' | 'server' | 'network'
 *
 * Usage:
 * <ValidationStep
 *   jobId="123"
 *   applicationId="456"
 *   onValid={(data) => console.log('Valid:', data)}
 *   onError={(err) => console.log('Error:', err)}
 * />
 */
export default function ValidationStep({ jobId, applicationId, onValid, onError }) {
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    async function validate() {
      setIsValidating(true);

      try {
        // Step 1: Validate session (eligibility check)
        const validationResult = await bookingService.validateSession(jobId, applicationId);

        // Extract data from new API response structure
        const candidateName = validationResult.candidate?.name || '';
        const candidateEmail = validationResult.candidate?.email || '';
        const jobName = validationResult.job?.job_name || '';

        // Check for active booking
        if (validationResult.active_booking) {
          // Candidate already has an active booking
          onValid({
            candidateName,
            candidateEmail,
            jobName,
            existingBooking: validationResult.active_booking,
            unidades: [],
          });
          return;
        }

        // Step 2: Load available units
        const unidadesResult = await bookingService.getUnidades(jobId);

        // Success: pass all data to parent
        onValid({
          candidateName,
          candidateEmail,
          jobName: unidadesResult.job_name || jobName,
          existingBooking: null,
          unidades: unidadesResult.unidades || [],
          blockedUnits: validationResult.blocked_units || [],
        });
      } catch (err) {
        const status = err.response?.status;
        const errorMessage = getErrorMessage(err);

        let errorType = 'unknown';

        if (status === 403) {
          // Blocked: wrong stage or too many no-shows
          errorType = 'blocked';
        } else if (status === 404) {
          errorType = 'not-found';
        } else if (status >= 500) {
          errorType = 'server';
        } else if (!err.response) {
          errorType = 'network';
        }

        onError({
          message: errorMessage,
          type: errorType,
          status,
        });
      } finally {
        setIsValidating(false);
      }
    }

    validate();
  }, [jobId, applicationId, onValid, onError]);

  if (!isValidating) {
    return null; // Parent will render next step or error
  }

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '40px 0',
        animation: 'fadeIn 0.3s ease-in',
      }}
    >
      <Spin size="large" />
      <p style={{ marginTop: 16 }}>Validando seu acesso...</p>
    </div>
  );
}
