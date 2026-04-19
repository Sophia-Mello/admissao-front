// components/booking/BookingWizard.jsx

import { useState, useCallback } from 'react';
import { Card, Typography } from 'antd';
import ValidationStep from './ValidationStep';
import UnitSelector from './UnitSelector';
import WeeklyCalendar from './WeeklyCalendar';
import BookingConfirmation from './BookingConfirmation';
import BookingSuccess from './BookingSuccess';
import ErrorDisplay from './ErrorDisplay';

const { Title } = Typography;

/**
 * BookingWizard - Main container for the public booking flow
 *
 * Manages wizard steps: 'validating' | 'unit-select' | 'calendar' | 'confirming' | 'success' | 'error'
 *
 * Props:
 * - jobId: string - Gupy job ID from URL query params
 * - applicationId: string - Gupy application ID from URL query params
 *
 * Usage:
 * <BookingWizard jobId="123" applicationId="456" />
 */
export default function BookingWizard({ jobId, applicationId }) {
  // Current wizard step
  const [step, setStep] = useState('validating');

  // Data from validation step
  const [validationData, setValidationData] = useState({
    candidateName: '',
    candidateEmail: '',
    jobName: '',
    existingBooking: null,
  });

  // Available units
  const [unidades, setUnidades] = useState([]);

  // Blocked units (where candidate already has booking)
  const [blockedUnits, setBlockedUnits] = useState([]);

  // Selected unit
  const [selectedUnidade, setSelectedUnidade] = useState(null);

  // Selected slot (includes unidade, slot, and id_unidade)
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Booking result after confirmation
  const [bookingDetails, setBookingDetails] = useState(null);

  // Error state
  const [error, setError] = useState(null);

  /**
   * Handle successful validation
   * Receives validation result and units list
   */
  const handleValidationSuccess = useCallback((data) => {
    setValidationData({
      candidateName: data.candidateName,
      candidateEmail: data.candidateEmail,
      jobName: data.jobName,
      existingBooking: data.existingBooking || null,
    });

    // If there's an existing booking, show success with existing booking details
    if (data.existingBooking) {
      setBookingDetails({
        booking: {
          id_booking: data.existingBooking.id_booking,
          start_at: data.existingBooking.start_at,
          end_at: data.existingBooking.end_at,
          status: data.existingBooking.status,
        },
        unidade: {
          nome_unidade: data.existingBooking.unidade?.nome_unidade,
          endereco: data.existingBooking.unidade?.endereco,
        },
      });
      setStep('success');
      return;
    }

    // Set units and blocked units, then proceed to unit selection
    setUnidades(data.unidades || []);
    setBlockedUnits(data.blockedUnits || []);
    setStep('unit-select');
  }, []);

  /**
   * Handle validation error
   */
  const handleValidationError = useCallback((errorData) => {
    setError(errorData);
    setStep('error');
  }, []);

  /**
   * Handle unit selection
   */
  const handleUnitSelect = useCallback((unidade) => {
    setSelectedUnidade(unidade);
    setStep('calendar');
  }, []);

  /**
   * Handle back to unit selection
   */
  const handleBackToUnits = useCallback(() => {
    setSelectedUnidade(null);
    setSelectedSlot(null);
    setStep('unit-select');
  }, []);

  /**
   * Handle slot selection from calendar
   */
  const handleSlotSelect = useCallback((slot) => {
    setSelectedSlot({
      unidade: selectedUnidade,
      slot,
      id_unidade: selectedUnidade.id_unidade,
    });
    setStep('confirming');
  }, [selectedUnidade]);

  /**
   * Handle cancel confirmation (go back to calendar)
   */
  const handleCancelConfirmation = useCallback(() => {
    setSelectedSlot(null);
    setStep('calendar');
  }, []);

  /**
   * Handle booking confirmed successfully
   */
  const handleBookingSuccess = useCallback((details) => {
    setBookingDetails(details);
    setStep('success');
  }, []);

  /**
   * Handle booking error (e.g., 409 conflict)
   * Goes back to calendar to select another slot
   */
  const handleBookingError = useCallback((errorMessage) => {
    setError({ message: errorMessage, type: 'conflict' });
    setSelectedSlot(null);
    setStep('calendar');
  }, []);

  /**
   * Handle retry from error state
   */
  const handleRetry = useCallback(() => {
    setError(null);
    setStep('validating');
  }, []);

  /**
   * Clear calendar error (for inline error alerts)
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <main
      role="main"
      style={{
        minHeight: '100vh',
        background: '#f0f2f5',
        padding: '20px',
      }}
    >
      <Card
        style={{ maxWidth: 1200, margin: '0 auto' }}
        bodyStyle={{ padding: '24px' }}
      >
        <Title level={2}>Agende sua Aula Teste</Title>

        {/* Step: Validating */}
        {step === 'validating' && (
          <ValidationStep
            jobId={jobId}
            applicationId={applicationId}
            onValid={handleValidationSuccess}
            onError={handleValidationError}
          />
        )}

        {/* Step: Unit Selection */}
        {step === 'unit-select' && (
          <UnitSelector
            unidades={unidades}
            blockedUnits={blockedUnits}
            jobName={validationData.jobName}
            candidateName={validationData.candidateName}
            onSelect={handleUnitSelect}
          />
        )}

        {/* Step: Calendar */}
        {step === 'calendar' && selectedUnidade && (
          <WeeklyCalendar
            jobId={jobId}
            applicationId={applicationId}
            unidade={selectedUnidade}
            onSlotSelect={handleSlotSelect}
            onBack={handleBackToUnits}
            error={error?.type === 'conflict' ? error.message : null}
            onClearError={clearError}
          />
        )}

        {/* Step: Confirming */}
        {step === 'confirming' && selectedSlot && (
          <BookingConfirmation
            jobId={jobId}
            applicationId={applicationId}
            slot={selectedSlot.slot}
            unidade={selectedSlot.unidade}
            idUnidade={selectedSlot.id_unidade}
            candidateName={validationData.candidateName}
            jobName={validationData.jobName}
            onSuccess={handleBookingSuccess}
            onCancel={handleCancelConfirmation}
            onError={handleBookingError}
          />
        )}

        {/* Step: Success */}
        {step === 'success' && bookingDetails && (
          <BookingSuccess bookingDetails={bookingDetails} />
        )}

        {/* Step: Error */}
        {step === 'error' && error && (
          <ErrorDisplay error={error} onRetry={handleRetry} />
        )}
      </Card>
    </main>
  );
}
