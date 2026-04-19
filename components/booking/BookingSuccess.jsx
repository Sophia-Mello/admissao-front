// components/booking/BookingSuccess.jsx

import {
  Alert,
  Card,
  Divider,
  Result,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import 'moment/locale/pt-br';

moment.locale('pt-br');

const { Text } = Typography;

/**
 * BookingSuccess - Success screen after booking confirmation
 *
 * Displays booking details and calendar invite info.
 *
 * Props:
 * - bookingDetails: object
 *   - booking: object
 *     - id_booking: number
 *     - start_at: string (ISO datetime)
 *     - end_at: string (ISO datetime)
 *     - status: string
 *   - unidade: object
 *     - nome_unidade: string
 *     - endereco: string
 *
 * Usage:
 * <BookingSuccess
 *   bookingDetails={{
 *     booking: { id_booking: 1, start_at: '...', end_at: '...', status: 'agendado' },
 *     unidade: { nome_unidade: 'Escola A', endereco: '...' }
 *   }}
 * />
 */
export default function BookingSuccess({ bookingDetails }) {
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

  const { booking, unidade } = bookingDetails;

  return (
    <Result
      status="success"
      title="Agendamento Confirmado!"
      subTitle={`${formatDate(booking.start_at)} as ${formatTime(booking.start_at)}`}
      style={{ padding: '40px 0' }}
    >
      <Card
        style={{
          maxWidth: 600,
          margin: '0 auto',
          textAlign: 'left',
        }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Location */}
          <div>
            <Text strong style={{ fontSize: 16 }}>
              <EnvironmentOutlined /> Local:
            </Text>
            <br />
            <Text style={{ fontSize: 16 }}>{unidade.nome_unidade}</Text>
            <br />
            <Text type="secondary">{unidade.endereco}</Text>
          </div>

          {/* Date */}
          <div>
            <Text strong style={{ fontSize: 16 }}>
              <CalendarOutlined /> Data:
            </Text>
            <br />
            <Text style={{ fontSize: 16 }}>{formatDate(booking.start_at)}</Text>
          </div>

          {/* Time */}
          <div>
            <Text strong style={{ fontSize: 16 }}>
              <ClockCircleOutlined /> Horario:
            </Text>
            <br />
            <Tag color="blue" style={{ fontSize: 16, padding: '6px 14px' }}>
              {formatTimeRange(booking.start_at, booking.end_at)}
            </Tag>
          </div>
        </Space>

        <Divider />

        {/* Calendar invite alert */}
        <Alert
          type="success"
          showIcon
          message="Convite Enviado!"
          description="Voce recebera um convite por email com os detalhes da aula teste e o link para adicionar ao seu calendario."
          style={{ marginBottom: 0 }}
        />
      </Card>

      {/* Contact info */}
      <div style={{ marginTop: 32 }}>
        <Text type="secondary">
          Duvidas? Entre em contato:{' '}
          <a href="mailto:rh@tomeducacao.com.br">rh@tomeducacao.com.br</a>
        </Text>
      </div>
    </Result>
  );
}
