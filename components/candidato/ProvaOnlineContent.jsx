/**
 * ProvaOnlineContent - Main content for Prova Online scheduling
 *
 * Client-side only component to avoid hydration issues.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Card,
  Typography,
  Space,
  Spin,
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
  DatePicker,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  VideoCameraOutlined,
  MailOutlined,
  IdcardOutlined,
  RightOutlined,
  ArrowLeftOutlined,
  LockOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import locale from 'antd/lib/date-picker/locale/pt_BR';
import {
  usePublicAvailability,
  useScheduleCandidate,
  useLookupCandidate,
} from '../../hooks/useEventos';

dayjs.locale('pt-br');

const { Title, Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function LoginForm({ onSubmit, isLoading }) {
  const [form] = Form.useForm();

  const formatCpf = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <LockOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          <Title level={2} style={{ marginTop: 16, marginBottom: 8 }}>
            Agendamento de Prova Online
          </Title>
          <Text type="secondary">
            Insira seu CPF e email cadastrados na Gupy para ver suas candidaturas
          </Text>
        </div>

        <Divider />

        <Form form={form} onFinish={onSubmit} layout="vertical" size="large">
          <Form.Item
            name="cpf"
            label="CPF"
            rules={[
              { required: true, message: 'Informe seu CPF' },
              {
                validator: (_, value) => {
                  const digits = value?.replace(/\D/g, '') || '';
                  if (digits.length === 11) return Promise.resolve();
                  return Promise.reject('CPF deve ter 11 dígitos');
                },
              },
            ]}
            normalize={formatCpf}
          >
            <Input
              prefix={<IdcardOutlined />}
              placeholder="000.000.000-00"
              maxLength={14}
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Informe seu email' },
              { type: 'email', message: 'Email inválido' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="seu.email@exemplo.com"
              type="email"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              icon={<RightOutlined />}
              block
            >
              Buscar Minhas Candidaturas
            </Button>
          </Form.Item>
        </Form>

        <Alert
          type="info"
          showIcon
          message="Dicas"
          description={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>Use o mesmo email cadastrado na Gupy</li>
              <li>Digite apenas números no CPF</li>
            </ul>
          }
        />
      </Space>
    </Card>
  );
}

function ApplicationCard({ application, onSchedule }) {
  const { job_name, can_schedule, blocked_reason, existing_event } = application;

  let statusTag = null;
  let cardContent = null;

  if (can_schedule) {
    statusTag = <Tag color="green">Disponível para agendamento</Tag>;
    cardContent = (
      <Button type="primary" icon={<CalendarOutlined />} onClick={() => onSchedule(application)} block>
        Agendar Prova
      </Button>
    );
  } else if (blocked_reason === 'already_scheduled' && existing_event) {
    statusTag = <Tag color="blue">Agendado</Tag>;
    cardContent = (
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>Data: </Text>
          <Text>{dayjs(existing_event.date).format('dddd, DD/MM/YYYY')}</Text>
        </div>
        <div>
          <Text strong>Horário: </Text>
          <Text>{existing_event.time_start}</Text>
        </div>
        {existing_event.meet_link && (
          <Button type="primary" icon={<VideoCameraOutlined />} href={existing_event.meet_link} target="_blank" block>
            Entrar na Sala (Meet)
          </Button>
        )}
      </Space>
    );
  } else if (blocked_reason === 'has_other_scheduled' && existing_event) {
    statusTag = <Tag color="orange">Aguardando outra prova</Tag>;
    cardContent = (
      <Alert
        type="warning"
        showIcon
        message="Aguarde sua prova agendada"
        description={
          <Text type="secondary">
            Você tem uma prova agendada para {dayjs(existing_event.date).format('DD/MM')} às{' '}
            {existing_event.time_start}. Após realizá-la, poderá agendar para esta vaga.
          </Text>
        }
      />
    );
  } else if (blocked_reason === 'wrong_stage') {
    statusTag = <Tag color="default">Aguardando etapa</Tag>;
    cardContent = (
      <Alert
        type="info"
        showIcon
        message="Aguarde"
        description="Você será notificado quando o agendamento estiver disponível para esta vaga."
      />
    );
  } else if (blocked_reason === 'no_show') {
    statusTag = <Tag color="red">Bloqueado</Tag>;
    cardContent = (
      <Alert
        type="error"
        showIcon
        message="Agendamento Indisponível"
        description={
          <Space direction="vertical" size="small">
            <Text>
              Você não compareceu à prova agendada anteriormente para esta vaga.
            </Text>
            <Text>
              Para reagendar, entre em contato com o setor de Recrutamento:
            </Text>
            <Text strong>
              <MailOutlined /> recrutamento@tomeducacao.com.br
            </Text>
          </Space>
        }
      />
    );
  } else {
    statusTag = <Tag color="default">Indisponível</Tag>;
    cardContent = <Text type="secondary">O agendamento não está disponível para esta candidatura no momento.</Text>;
  }

  return (
    <Card
      size="small"
      style={{ marginBottom: 16 }}
      title={
        <Space>
          <CalendarOutlined />
          <Text strong style={{ fontSize: 14 }}>{job_name}</Text>
        </Space>
      }
      extra={statusTag}
    >
      {cardContent}
    </Card>
  );
}

function ApplicationsList({ candidateName, applications, onSchedule, onBack }) {
  const canScheduleCount = applications.filter((a) => a.can_schedule).length;
  const scheduledCount = applications.filter((a) => a.blocked_reason === 'already_scheduled').length;

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
          <Title level={3} style={{ marginTop: 16, marginBottom: 8 }}>
            Olá, {candidateName}!
          </Title>
          <Text type="secondary">
            {applications.length === 1 ? 'Encontramos 1 candidatura' : `Encontramos ${applications.length} candidaturas`}
          </Text>
        </div>

        <Row gutter={16} justify="center">
          {canScheduleCount > 0 && (
            <Col><Tag color="green" style={{ padding: '4px 12px' }}>{canScheduleCount} para agendar</Tag></Col>
          )}
          {scheduledCount > 0 && (
            <Col><Tag color="blue" style={{ padding: '4px 12px' }}>{scheduledCount} agendado(s)</Tag></Col>
          )}
        </Row>

        <Divider />

        {applications.map((app, index) => (
          <ApplicationCard key={index} application={app} onSchedule={onSchedule} />
        ))}

        <Divider />

        <Button icon={<ArrowLeftOutlined />} onClick={onBack} block>
          Voltar
        </Button>
      </Space>
    </Card>
  );
}

function SlotSelection({ application, onConfirm, onBack, isPending }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Use event type from application, or fallback to jobId for backend resolution
  const { data, isLoading: loadingSlots, error } = usePublicAvailability({
    type: application?.event_type?.code,
    jobId: application?.id_job_gupy,
    enabled: true,
  });

  const slotsByDate = useMemo(() => {
    return (data?.data || []).reduce((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {});
  }, [data]);

  const dates = Object.keys(slotsByDate).sort();

  const handleConfirm = () => {
    if (!selectedSlot) {
      message.warning('Selecione um horário');
      return;
    }
    onConfirm(selectedSlot);
  };

  if (loadingSlots) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <Text style={{ display: 'block', marginTop: 16 }}>Carregando horários...</Text>
        </div>
      </Card>
    );
  }

  if (error || dates.length === 0) {
    return (
      <Card>
        <Result
          status="warning"
          title="Sem Horários Disponíveis"
          subTitle="Não há horários disponíveis para agendamento no momento."
          extra={[
            onBack && <Button key="back" icon={<ArrowLeftOutlined />} onClick={onBack}>Voltar</Button>,
            <Button key="reload" type="primary" onClick={() => window.location.reload()}>Atualizar</Button>,
          ].filter(Boolean)}
        />
      </Card>
    );
  }

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <CalendarOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          <Title level={3} style={{ marginTop: 16, marginBottom: 8 }}>Agendar Prova Online</Title>
          <Tag color="blue">{application.job_name}</Tag>
        </div>

        <Divider orientation="left"><CalendarOutlined /> Selecione a Data</Divider>

        <DatePicker
          value={selectedDate ? dayjs(selectedDate) : null}
          onChange={(date) => {
            setSelectedDate(date ? date.format('YYYY-MM-DD') : null);
            setSelectedSlot(null);
          }}
          format="DD/MM/YYYY (dddd)"
          placeholder="Selecione uma data"
          style={{ width: '100%' }}
          size="large"
          locale={locale}
          disabledDate={(current) => {
            if (!current) return false;
            const dateStr = current.format('YYYY-MM-DD');
            return !dates.includes(dateStr);
          }}
          cellRender={(current) => {
            const dateStr = current.format('YYYY-MM-DD');
            if (dates.includes(dateStr)) {
              const slotsCount = slotsByDate[dateStr]?.length || 0;
              const vagasCount = slotsByDate[dateStr]?.reduce((sum, s) => sum + s.vagas_disponiveis, 0) || 0;
              return (
                <div className="ant-picker-cell-inner" style={{ position: 'relative' }}>
                  {current.date()}
                  <div style={{ fontSize: 10, color: '#52c41a', lineHeight: 1 }}>{vagasCount}v</div>
                </div>
              );
            }
            return current.date();
          }}
        />

        {selectedDate && slotsByDate[selectedDate] && (
          <Alert
            type="info"
            showIcon
            message={`${slotsByDate[selectedDate].length} horário(s) disponível(is) com ${slotsByDate[selectedDate].reduce((sum, s) => sum + s.vagas_disponiveis, 0)} vaga(s) total`}
          />
        )}

        {selectedDate && (
          <>
            <Divider orientation="left"><ClockCircleOutlined /> Selecione o Horário</Divider>
            <Radio.Group
              value={selectedSlot ? `${selectedSlot.date}_${selectedSlot.time_start}` : null}
              onChange={(e) => {
                const slot = slotsByDate[selectedDate].find((s) => `${s.date}_${s.time_start}` === e.target.value);
                setSelectedSlot(slot);
              }}
              style={{ width: '100%' }}
            >
              <Row gutter={[12, 12]}>
                {slotsByDate[selectedDate].sort((a, b) => a.time_start.localeCompare(b.time_start)).map((slot) => {
                  const slotKey = `${slot.date}_${slot.time_start}`;
                  const isDisabled = slot.vagas_disponiveis <= 0;
                  return (
                    <Col key={slotKey} xs={12} sm={8} md={6}>
                      <Radio.Button value={slotKey} disabled={isDisabled} style={{ width: '100%', height: 'auto', padding: '12px', textAlign: 'center', opacity: isDisabled ? 0.5 : 1 }}>
                        <Space direction="vertical" size={0}>
                          <Text strong>{slot.time_start?.substring(0, 5)}</Text>
                          <Tag color={isDisabled ? 'default' : 'green'}>{slot.vagas_disponiveis} vaga(s)</Tag>
                        </Space>
                      </Radio.Button>
                    </Col>
                  );
                })}
              </Row>
            </Radio.Group>
          </>
        )}

        {selectedSlot && (
          <>
            <Divider />
            <Alert
              type="info"
              showIcon
              message="Confirme seu agendamento"
              description={
                <Space direction="vertical">
                  <Text><strong>Data:</strong> {dayjs(selectedSlot.date).format('dddd, DD [de] MMMM [de] YYYY')}</Text>
                  <Text><strong>Horário:</strong> {selectedSlot.time_start?.substring(0, 5)} - {selectedSlot.time_end?.substring(0, 5)}</Text>
                </Space>
              }
            />
            <Button type="primary" size="large" icon={<CheckCircleOutlined />} onClick={handleConfirm} loading={isPending} block>
              Confirmar Agendamento
            </Button>
          </>
        )}

        <Divider />
        {onBack && <Button icon={<ArrowLeftOutlined />} onClick={onBack} block>Voltar para Candidaturas</Button>}
      </Space>
    </Card>
  );
}

function ConfirmationScreen({ confirmationData, selectedSlot }) {
  return (
    <Result
      status="success"
      icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
      title="Prova Agendada com Sucesso!"
      subTitle={
        <Space direction="vertical" size={4}>
          <Text>Você foi agendado para:</Text>
          <Text strong style={{ fontSize: 18 }}>
            {dayjs(confirmationData?.event_application?.date || selectedSlot?.date).format('dddd, DD [de] MMMM [de] YYYY')}
          </Text>
          <Text strong style={{ fontSize: 18 }}>às {selectedSlot?.time_start?.substring(0, 5)}</Text>
          <Text type="secondary">Sala {confirmationData?.room?.number}</Text>
        </Space>
      }
      extra={[
        confirmationData?.room?.meet_link && (
          <Button key="meet" type="primary" icon={<VideoCameraOutlined />} href={confirmationData.room.meet_link} target="_blank" size="large">
            Acessar Google Meet
          </Button>
        ),
      ].filter(Boolean)}
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
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ProvaOnlineContent() {
  const router = useRouter();
  const { applicationId, jobId } = router.query;

  const [step, setStep] = useState('login');
  const [candidateData, setCandidateData] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [confirmationData, setConfirmationData] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loginError, setLoginError] = useState(null);

  const lookupMutation = useLookupCandidate();
  const scheduleMutation = useScheduleCandidate();

  const hasLegacyParams = applicationId && jobId;

  useEffect(() => {
    if (router.isReady && hasLegacyParams) {
      setSelectedApplication({
        id_application_gupy: applicationId,
        id_job_gupy: jobId,
        job_name: 'Vaga',
        can_schedule: true,
      });
      setStep('scheduling');
    }
  }, [router.isReady, hasLegacyParams, applicationId, jobId]);

  const handleLogin = async ({ cpf, email }) => {
    setLoginError(null);
    try {
      const result = await lookupMutation.mutateAsync({ cpf, email });
      if (result.success) {
        setCandidateData(result);
        setStep('applications');
      }
    } catch (error) {
      const status = error.response?.status;
      const errorMsg = error.response?.data?.error;
      if (status === 401) {
        setLoginError('CPF ou email incorretos. Verifique os dados e tente novamente.');
      } else if (status === 404) {
        setLoginError('Nenhuma candidatura encontrada. Verifique seu CPF e email.');
      } else {
        setLoginError(errorMsg || 'Erro ao buscar candidaturas. Tente novamente.');
      }
    }
  };

  const handleSelectApplication = (application) => {
    setSelectedApplication(application);
    setStep('scheduling');
  };

  const handleConfirmSchedule = async (slot) => {
    setSelectedSlot(slot);
    try {
      const result = await scheduleMutation.mutateAsync({
        applicationId: selectedApplication.id_application_gupy,
        jobId: selectedApplication.id_job_gupy,
        type: selectedApplication.event_type?.code, // Dynamic type from application, backend resolves from jobId if null
        date: slot.date,
        time_start: slot.time_start,
      });
      setConfirmationData(result.data);
      setStep('confirmed');
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleBackToLogin = () => {
    setStep('login');
    setCandidateData(null);
    setSelectedApplication(null);
    setLoginError(null);
  };

  const handleBackToApplications = () => {
    setStep('applications');
    setSelectedApplication(null);
  };

  if (!router.isReady) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
      {step === 'login' && (
        <>
          <LoginForm onSubmit={handleLogin} isLoading={lookupMutation.isPending} />
          {loginError && (
            <Alert type="error" message={loginError} showIcon style={{ marginTop: 16 }} closable onClose={() => setLoginError(null)} />
          )}
        </>
      )}

      {step === 'applications' && candidateData && (
        <ApplicationsList
          candidateName={candidateData.candidate?.nome}
          applications={candidateData.applications}
          onSchedule={handleSelectApplication}
          onBack={handleBackToLogin}
        />
      )}

      {step === 'scheduling' && selectedApplication && (
        <SlotSelection
          application={selectedApplication}
          onConfirm={handleConfirmSchedule}
          onBack={hasLegacyParams ? undefined : handleBackToApplications}
          isPending={scheduleMutation.isPending}
        />
      )}

      {step === 'confirmed' && (
        <Card>
          <ConfirmationScreen confirmationData={confirmationData} selectedSlot={selectedSlot} />
        </Card>
      )}
    </div>
  );
}
