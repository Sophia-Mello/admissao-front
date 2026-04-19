/**
 * /candidato/prova-teorica - Public Page for Candidate Scheduling
 *
 * Public page where Gupy candidates can schedule their theoretical test.
 *
 * Query params:
 * - applicationId: Gupy application ID
 * - jobId: Gupy job ID
 *
 * Flow:
 * 1. Validate params
 * 2. Load available slots
 * 3. Candidate selects date and time
 * 4. Confirm scheduling
 * 5. Show confirmation with Meet link
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Card,
  Typography,
  Space,
  Spin,
  Empty,
  Alert,
  Button,
  Radio,
  Divider,
  Result,
  Tag,
  Row,
  Col,
  Input,
  Form,
  message,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  VideoCameraOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { usePublicAvailability, useScheduleCandidate } from '../../hooks/useEventos';

dayjs.locale('pt-br');

const { Title, Text, Paragraph } = Typography;

// Public page - no auth required
export default function ProvaTeoricaPage() {
  const router = useRouter();
  const { applicationId, jobId } = router.query;

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [apelido, setApelido] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [duplicateError, setDuplicateError] = useState(null);

  const paramsValid = applicationId && jobId;

  // Use jobId to let backend resolve the type from the job's template
  const { data, isLoading, error } = usePublicAvailability({
    jobId,
    enabled: paramsValid,
  });

  const scheduleMutation = useScheduleCandidate();

  // Group slots by date
  const slotsByDate = (data?.data || []).reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  const dates = Object.keys(slotsByDate).sort();

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
  };

  const handleConfirm = async () => {
    if (!selectedSlot) {
      message.warning('Selecione um horário');
      return;
    }

    try {
      // Type is resolved by backend from jobId's template mapping
      const result = await scheduleMutation.mutateAsync({
        applicationId,
        jobId,
        date: selectedSlot.date,
        time_start: selectedSlot.time_start,
        apelido_meet: apelido || undefined,
      });

      setIsConfirmed(true);
      setConfirmationData(result.data);
    } catch (error) {
      // Tratamento específico para erro de template duplicado
      const errorCode = error.response?.data?.code;
      if (errorCode === 'DUPLICATE_TEMPLATE_APPLICATION') {
        const existing = error.response?.data?.existing_booking;
        setDuplicateError({ existing });
      }
      // Outros erros são tratados pelo hook via message.error
    }
  };

  // Invalid params
  if (router.isReady && !paramsValid) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px' }}>
        <Result
          status="error"
          title="Link Inválido"
          subTitle="Os parâmetros necessários não foram fornecidos. Verifique o link recebido por email."
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          }
        />
      </div>
    );
  }

  // Loading
  if (isLoading || !router.isReady) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px', textAlign: 'center' }}>
        <Card>
          <Space direction="vertical" size="large">
            <Spin size="large" />
            <Text>Carregando horários disponíveis...</Text>
          </Space>
        </Card>
      </div>
    );
  }

  // Error or no slots
  if (error || dates.length === 0) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px' }}>
        <Result
          status="warning"
          title="Sem Horários Disponíveis"
          subTitle="Não há horários disponíveis para agendamento no momento. Por favor, tente novamente mais tarde."
          extra={
            <Button type="primary" onClick={() => router.reload()}>
              Atualizar
            </Button>
          }
        />
      </div>
    );
  }

  // Duplicate template error screen
  if (duplicateError) {
    const existing = duplicateError.existing;
    const dateStr = existing?.date ? dayjs(existing.date).format('dddd, DD [de] MMMM [de] YYYY') : '';
    const timeStr = existing?.time?.substring(0, 5) || '';
    const statusMsg = existing?.status === 'compareceu' ? 'Você já realizou' : 'Você já possui agendamento para';

    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px' }}>
        <Result
          status="warning"
          icon={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
          title={`${statusMsg} esta prova`}
          subTitle={
            <Space direction="vertical" size={8}>
              {existing?.date && (
                <>
                  <Text>Agendamento existente:</Text>
                  <Text strong style={{ fontSize: 16 }}>
                    {dateStr} às {timeStr}
                  </Text>
                </>
              )}
              <Text type="secondary" style={{ marginTop: 8 }}>
                Como você está inscrito em múltiplas vagas do mesmo cargo, seu agendamento vale para todas elas.
              </Text>
            </Space>
          }
          extra={[
            <Button key="back" onClick={() => window.history.back()}>
              Voltar
            </Button>,
          ]}
        >
          <Alert
            type="info"
            showIcon
            message="O que isso significa?"
            description="Vagas do mesmo cargo compartilham o mesmo processo seletivo. Você só precisa fazer a prova uma vez, e o resultado valerá para todas as vagas em que está inscrito."
          />
        </Result>
      </div>
    );
  }

  // Confirmation screen
  if (isConfirmed && confirmationData) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px' }}>
        <Result
          status="success"
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          title="Prova Agendada com Sucesso!"
          subTitle={
            <Space direction="vertical" size={4}>
              <Text>Você foi agendado para:</Text>
              <Text strong style={{ fontSize: 18 }}>
                {dayjs(confirmationData?.event_application?.date || selectedSlot.date).format('dddd, DD [de] MMMM [de] YYYY')}
              </Text>
              <Text strong style={{ fontSize: 18 }}>
                às {selectedSlot.time_start?.substring(0, 5)}
              </Text>
              <Text type="secondary">Sala {confirmationData?.room?.number}</Text>
            </Space>
          }
          extra={[
            confirmationData?.room?.meet_link && (
              <Button
                key="meet"
                type="primary"
                icon={<VideoCameraOutlined />}
                href={confirmationData.room.meet_link}
                target="_blank"
                size="large"
              >
                Acessar Google Meet
              </Button>
            ),
          ]}
        >
          <Alert
            type="info"
            showIcon
            message="Informações Importantes"
            description={
              <ul style={{ margin: 0, paddingLeft: 16, textAlign: 'left' }}>
                <li>Você receberá um email com o convite do Google Calendar</li>
                <li>Acesse o link do Meet no horário agendado</li>
                <li>Mantenha a câmera ligada durante toda a prova</li>
                <li>Tenha documento de identificação em mãos</li>
              </ul>
            }
          />
        </Result>
      </div>
    );
  }

  // Scheduling screen
  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <CalendarOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            <Title level={2} style={{ marginTop: 16, marginBottom: 8 }}>
              Agendamento de Prova Teórica
            </Title>
            <Text type="secondary">
              Selecione a data e horário de sua preferência para realizar a prova
            </Text>
          </div>

          <Divider />

          {/* Apelido (optional) */}
          <div>
            <Text strong>
              <UserOutlined /> Como você quer aparecer no Meet? (opcional)
            </Text>
            <Input
              placeholder="Seu nome ou apelido"
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
              maxLength={100}
              style={{ marginTop: 8 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Este nome aparecerá para os fiscais durante a prova
            </Text>
          </div>

          <Divider orientation="left">
            <CalendarOutlined /> Selecione a Data
          </Divider>

          {/* Date selection */}
          <Radio.Group
            value={selectedDate}
            onChange={(e) => handleDateSelect(e.target.value)}
            style={{ width: '100%' }}
          >
            <Row gutter={[12, 12]}>
              {dates.map((date) => {
                const slotsCount = slotsByDate[date].length;
                const totalVagas = slotsByDate[date].reduce(
                  (sum, s) => sum + s.vagas_disponiveis,
                  0
                );

                return (
                  <Col key={date} xs={24} sm={12} md={8}>
                    <Radio.Button
                      value={date}
                      style={{
                        width: '100%',
                        height: 'auto',
                        padding: '12px',
                        textAlign: 'center',
                      }}
                    >
                      <Space direction="vertical" size={0}>
                        <Text strong>
                          {dayjs(date).format('ddd, DD/MM')}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {slotsCount} horário(s) • {totalVagas} vaga(s)
                        </Text>
                      </Space>
                    </Radio.Button>
                  </Col>
                );
              })}
            </Row>
          </Radio.Group>

          {/* Time selection */}
          {selectedDate && (
            <>
              <Divider orientation="left">
                <ClockCircleOutlined /> Selecione o Horário
              </Divider>

              <Radio.Group
                value={selectedSlot ? `${selectedSlot.date}_${selectedSlot.time_start}` : null}
                onChange={(e) => {
                  const slot = slotsByDate[selectedDate].find(
                    (s) => `${s.date}_${s.time_start}` === e.target.value
                  );
                  handleSlotSelect(slot);
                }}
                style={{ width: '100%' }}
              >
                <Row gutter={[12, 12]}>
                  {slotsByDate[selectedDate]
                    .sort((a, b) => a.time_start.localeCompare(b.time_start))
                    .map((slot) => {
                      const slotKey = `${slot.date}_${slot.time_start}`;
                      const isDisabled = slot.vagas_disponiveis <= 0;

                      return (
                        <Col key={slotKey} xs={12} sm={8} md={6}>
                          <Radio.Button
                            value={slotKey}
                            disabled={isDisabled}
                            style={{
                              width: '100%',
                              height: 'auto',
                              padding: '12px',
                              textAlign: 'center',
                              opacity: isDisabled ? 0.5 : 1,
                            }}
                          >
                            <Space direction="vertical" size={0}>
                              <Text strong>
                                {slot.time_start?.substring(0, 5)}
                              </Text>
                              <Tag color={isDisabled ? 'default' : 'green'}>
                                {slot.vagas_disponiveis} vaga(s)
                              </Tag>
                            </Space>
                          </Radio.Button>
                        </Col>
                      );
                    })}
                </Row>
              </Radio.Group>
            </>
          )}

          {/* Confirm button */}
          {selectedSlot && (
            <>
              <Divider />

              <Alert
                type="info"
                showIcon
                message="Confirme seu agendamento"
                description={
                  <Space direction="vertical">
                    <Text>
                      <strong>Data:</strong>{' '}
                      {dayjs(selectedSlot.date).format('dddd, DD [de] MMMM [de] YYYY')}
                    </Text>
                    <Text>
                      <strong>Horário:</strong> {selectedSlot.time_start?.substring(0, 5)} -{' '}
                      {selectedSlot.time_end?.substring(0, 5)}
                    </Text>
                  </Space>
                }
              />

              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleConfirm}
                loading={scheduleMutation.isPending}
                block
              >
                Confirmar Agendamento
              </Button>

              <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
                Ao confirmar, você receberá um email com o convite do Google Calendar
              </Text>
            </>
          )}
        </Space>
      </Card>
    </div>
  );
}
