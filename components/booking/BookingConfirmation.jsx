// components/booking/BookingConfirmation.jsx

import { useState, useRef, useEffect } from 'react';
import {
  Button,
  Card,
  Divider,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import 'moment/locale/pt-br';
import * as bookingService from '../../lib/bookingService';
import { getErrorMessage } from '../../lib/errorHandler';

moment.locale('pt-br');

const { Title, Text } = Typography;

/**
 * BookingConfirmation - Confirmation dialog before booking
 *
 * Shows booking details and allows confirmation or cancellation.
 * Handles API call to create the booking.
 *
 * Props:
 * - jobId: string - Gupy job ID
 * - applicationId: string - Gupy application ID
 * - slot: object - Selected slot
 *   - slot_start: string (ISO datetime)
 *   - slot_end: string (ISO datetime)
 * - unidade: object - Selected unit
 *   - nome_unidade: string
 *   - endereco: string
 * - idUnidade: number - Unit ID
 * - candidateName: string - Candidate name
 * - jobName: string - Job title
 * - onSuccess: (details) => void - Called on successful booking
 * - onCancel: () => void - Called when user cancels
 * - onError: (message) => void - Called on error (e.g., 409 conflict)
 *
 * Usage:
 * <BookingConfirmation
 *   jobId="123"
 *   applicationId="456"
 *   slot={{ slot_start: '...', slot_end: '...' }}
 *   unidade={{ nome_unidade: 'Escola A', endereco: '...' }}
 *   idUnidade={1}
 *   candidateName="Joao Silva"
 *   jobName="Professor de Matematica"
 *   onSuccess={(details) => console.log('Success:', details)}
 *   onCancel={() => console.log('Cancelled')}
 *   onError={(msg) => console.log('Error:', msg)}
 * />
 */
export default function BookingConfirmation({
  jobId,
  applicationId,
  slot,
  unidade,
  idUnidade,
  candidateName,
  jobName,
  onSuccess,
  onCancel,
  onError,
}) {
  const [submitting, setSubmitting] = useState(false);
  const confirmButtonRef = useRef(null);

  // Scroll to confirm button on mount
  useEffect(() => {
    if (confirmButtonRef.current) {
      confirmButtonRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, []);

  /**
   * Format date in Portuguese
   */
  const formatDate = (dateStr) => {
    return moment(dateStr).format('dddd, DD [de] MMMM [de] YYYY');
  };

  /**
   * Format time
   */
  const formatTime = (timeStr) => {
    return moment(timeStr).format('HH:mm');
  };

  /**
   * Format time range
   */
  const formatTimeRange = (start, end) => {
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  /**
   * Handle booking confirmation
   */
  const handleConfirm = async () => {
    setSubmitting(true);

    try {
      const payload = {
        id_unidade: parseInt(idUnidade, 10),
        id_job_gupy: jobId,
        id_application_gupy: applicationId,
        start_at: slot.slot_start,
        end_at: slot.slot_end,
      };

      const result = await bookingService.createBooking(payload);

      // Transform API response to match BookingSuccess expected format
      // Backend returns: { success: true, data: { id_booking, start_at, end_at, status_booking, unidade (string), job_name } }
      // BookingSuccess expects: { booking: { id_booking, start_at, end_at, status }, unidade: { nome_unidade, endereco } }
      // NOTE: rubrica_url is NOT exposed to candidates - only visible to recruiters
      onSuccess({
        booking: {
          id_booking: result.data.id_booking,
          start_at: result.data.start_at,
          end_at: result.data.end_at,
          status: result.data.status_booking,
        },
        unidade: {
          nome_unidade: result.data.unidade, // Backend sends unidade name as string
          endereco: unidade.endereco, // Use unidade prop for address
        },
      });
    } catch (err) {
      const status = err.response?.status;

      if (status === 409) {
        // Slot taken by another candidate
        onError(
          'Este horario foi agendado por outro candidato ha alguns instantes. Por favor, escolha outro horario disponivel.'
        );
      } else {
        // Other errors
        onError(getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Back button */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={onCancel}
        disabled={submitting}
        style={{ marginBottom: 16 }}
      >
        Voltar
      </Button>

      {/* Summary card */}
      <Card
        type="inner"
        style={{
          background: '#e6f7ff',
          borderLeft: '4px solid #1890ff',
        }}
      >
        <Title level={5} style={{ marginTop: 0 }}>
          <CheckCircleOutlined style={{ color: '#52c41a' }} /> Resumo do
          Agendamento
        </Title>

        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {/* Candidate name */}
          <div>
            <Text strong>Candidato:</Text>
            <br />
            <Text>{candidateName}</Text>
          </div>

          {/* Job name */}
          <div>
            <Text strong>Vaga:</Text>
            <br />
            <Text>{jobName}</Text>
          </div>

          {/* Unit */}
          <div>
            <Text strong>Unidade:</Text>
            <br />
            <Text>{unidade.nome_unidade}</Text>
          </div>

          {/* Address */}
          <div>
            <Text strong>Endereco:</Text>
            <br />
            <Text type="secondary">{unidade.endereco}</Text>
          </div>

          {/* Date */}
          <div>
            <Text strong>Data:</Text>
            <br />
            <Text>{formatDate(slot.slot_start)}</Text>
          </div>

          {/* Time */}
          <div>
            <Text strong>Horario:</Text>
            <br />
            <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
              <ClockCircleOutlined />{' '}
              {formatTimeRange(slot.slot_start, slot.slot_end)}
            </Tag>
          </div>
        </Space>

        <Divider />

        {/* Confirm button */}
        <Button
          ref={confirmButtonRef}
          type="primary"
          size="large"
          block
          loading={submitting}
          onClick={handleConfirm}
          style={{ height: 48 }}
        >
          {submitting ? 'Confirmando...' : 'Confirmar Agendamento'}
        </Button>
      </Card>
    </>
  );
}
