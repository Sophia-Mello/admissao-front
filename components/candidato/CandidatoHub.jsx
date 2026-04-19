/**
 * CandidatoHub - Hub for all candidate scheduling systems
 *
 * Displays unified view of:
 * - Prova Online (evento/applications)
 * - Aula Teste (booking)
 *
 * Client-side only component to avoid hydration issues.
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Card,
  Typography,
  Space,
  Spin,
  Alert,
  Button,
  Divider,
  Tag,
  Row,
  Col,
  Input,
  Form,
  Empty,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  VideoCameraOutlined,
  EnvironmentOutlined,
  UserOutlined,
  MailOutlined,
  IdcardOutlined,
  RightOutlined,
  WarningOutlined,
  StopOutlined,
  LockOutlined,
  BookOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { useCandidatoLookup } from '../../hooks/useCandidatoHub';

dayjs.locale('pt-br');

const { Title, Text, Paragraph } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN FORM
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
          <CalendarOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          <Title level={2} style={{ marginTop: 16, marginBottom: 8 }}>
            Central de Agendamentos
          </Title>
          <Text type="secondary">
            Insira seu CPF e email cadastrados na Gupy para ver seus agendamentos
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
              Buscar Meus Agendamentos
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

// ─────────────────────────────────────────────────────────────────────────────
// PROVA ONLINE CARD
// ─────────────────────────────────────────────────────────────────────────────

function ProvaOnlineCard({ application, cpf, email }) {
  const router = useRouter();

  const handleAgendar = () => {
    router.push({
      pathname: '/candidato/prova-online',
      query: {
        applicationId: application.id_application_gupy,
        jobId: application.id_job_gupy,
        cpf,
        email,
      },
    });
  };

  // Already scheduled - show event details
  if (application.blocked_reason === 'already_scheduled' && application.existing_event) {
    const event = application.existing_event;
    return (
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text strong>{application.job_name}</Text>
            <Tag color="green" icon={<CheckCircleOutlined />}>Agendado</Tag>
          </div>

          <Space direction="vertical" size={4}>
            <Text>
              <CalendarOutlined style={{ marginRight: 8 }} />
              {dayjs(event.date).format('DD/MM/YYYY (dddd)')}
            </Text>
            <Text>
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              {event.time_start}
            </Text>
          </Space>

          {event.meet_link && (
            <Button
              type="primary"
              icon={<VideoCameraOutlined />}
              href={event.meet_link}
              target="_blank"
              block
            >
              Entrar na Prova (Meet)
            </Button>
          )}
        </Space>
      </Card>
    );
  }

  // Has another prova scheduled
  if (application.blocked_reason === 'has_other_scheduled') {
    return (
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text strong>{application.job_name}</Text>
            <Tag color="orange" icon={<WarningOutlined />}>Aguardando</Tag>
          </div>
          <Alert
            type="warning"
            message="Você já possui outra prova agendada"
            description={`Conclua a prova da vaga "${application.existing_event?.job_name}" antes de agendar esta.`}
            showIcon
          />
        </Space>
      </Card>
    );
  }

  // Wrong stage - not eligible yet
  if (application.blocked_reason === 'wrong_stage') {
    return (
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text strong>{application.job_name}</Text>
            <Tag color="default" icon={<ClockCircleOutlined />}>Aguardando Etapa</Tag>
          </div>
          <Text type="secondary">
            Você ainda não está na etapa de agendamento de prova para esta vaga.
          </Text>
        </Space>
      </Card>
    );
  }

  // No-show - blocked from rebooking
  if (application.blocked_reason === 'no_show') {
    return (
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text strong>{application.job_name}</Text>
            <Tag color="red" icon={<StopOutlined />}>Bloqueado</Tag>
          </div>
          <Alert
            type="error"
            message="Agendamento Indisponível"
            description={
              <Space direction="vertical" size="small">
                <Text>Você não compareceu à prova agendada anteriormente.</Text>
                <Text>Para reagendar, entre em contato com o setor de Recrutamento:</Text>
                <Text strong><MailOutlined /> recrutamento@tomeducacao.com.br</Text>
              </Space>
            }
            showIcon
          />
        </Space>
      </Card>
    );
  }

  // Completed - already took the test
  if (application.blocked_reason === 'completed') {
    return (
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text strong>{application.job_name}</Text>
            <Tag color="green" icon={<CheckCircleOutlined />}>Realizada</Tag>
          </div>
          <Alert
            type="success"
            message="Prova concluída"
            description="Você já realizou a prova para esta vaga. Aguarde o contato do recrutamento sobre os próximos passos."
            showIcon
          />
        </Space>
      </Card>
    );
  }

  // Can schedule
  if (application.can_schedule) {
    return (
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text strong>{application.job_name}</Text>
            <Tag color="blue" icon={<CalendarOutlined />}>Disponível</Tag>
          </div>
          <Button
            type="primary"
            icon={<CalendarOutlined />}
            onClick={handleAgendar}
            block
          >
            Agendar Prova Online
          </Button>
        </Space>
      </Card>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AULA TESTE CARD
// ─────────────────────────────────────────────────────────────────────────────

function AulaTesteCard({ application, cpf, email }) {
  const router = useRouter();

  const handleAgendar = () => {
    router.push({
      pathname: '/candidato/agendamento',
      query: {
        applicationId: application.id_application_gupy,
        jobId: application.id_job_gupy,
        cpf,
        email,
      },
    });
  };

  // Already scheduled - show booking details
  if (application.blocked_reason === 'already_scheduled' && application.existing_booking) {
    const booking = application.existing_booking;
    return (
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text strong>{application.job_name}</Text>
            <Tag color="green" icon={<CheckCircleOutlined />}>Agendado</Tag>
          </div>

          <Space direction="vertical" size={4}>
            <Text>
              <CalendarOutlined style={{ marginRight: 8 }} />
              {dayjs(booking.start_at).format('DD/MM/YYYY (dddd)')}
            </Text>
            <Text>
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              {dayjs(booking.start_at).format('HH:mm')} - {dayjs(booking.end_at).format('HH:mm')}
            </Text>
            <Text>
              <EnvironmentOutlined style={{ marginRight: 8 }} />
              {booking.nome_unidade}
            </Text>
            {booking.endereco && (
              <Text type="secondary" style={{ marginLeft: 22, fontSize: 12 }}>
                {booking.endereco}
              </Text>
            )}
          </Space>
        </Space>
      </Card>
    );
  }

  // No-show - blocked from rebooking
  if (application.blocked_reason === 'no_show') {
    return (
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text strong>{application.job_name}</Text>
            <Tag color="red" icon={<StopOutlined />}>Bloqueado</Tag>
          </div>
          <Alert
            type="error"
            message="Falta registrada"
            description="Você não compareceu à aula teste agendada. Entre em contato com o recrutamento para mais informações."
            showIcon
          />
        </Space>
      </Card>
    );
  }

  // Completed - candidate already attended
  if (application.blocked_reason === 'completed') {
    return (
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text strong>{application.job_name}</Text>
            <Tag color="green" icon={<CheckCircleOutlined />}>Realizada</Tag>
          </div>
          <Alert
            type="success"
            message="Aula teste concluída"
            description="Você já realizou a aula teste para esta vaga. Aguarde o contato do recrutamento sobre os próximos passos."
            showIcon
          />
        </Space>
      </Card>
    );
  }

  // Can schedule
  if (application.can_schedule) {
    return (
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text strong>{application.job_name}</Text>
            <Tag color="blue" icon={<CalendarOutlined />}>Disponível</Tag>
          </div>
          <Button
            type="primary"
            icon={<CalendarOutlined />}
            onClick={handleAgendar}
            block
          >
            Agendar Aula Teste
          </Button>
        </Space>
      </Card>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATIONS LIST
// ─────────────────────────────────────────────────────────────────────────────

function ApplicationsList({ data, credentials, onLogout }) {
  const { prova, aulaTeste } = data;
  const { cpf, email } = credentials;

  const hasProvaApps = prova?.success && prova?.applications?.length > 0;
  const hasAulaTesteApps = aulaTeste?.success && aulaTeste?.applications?.length > 0;
  const hasNoApps = !hasProvaApps && !hasAulaTesteApps;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Header */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <UserOutlined style={{ fontSize: 24 }} />
            <div>
              <Text strong style={{ fontSize: 16 }}>Olá, {data.candidate?.nome || 'Candidato'}!</Text>
              <br />
              <Text type="secondary">Veja seus agendamentos abaixo</Text>
            </div>
          </Space>
          <Button onClick={onLogout}>Sair</Button>
        </div>
      </Card>

      {/* Partial Error Warning */}
      {data.hasPartialError && (
        <Alert
          type="warning"
          showIcon
          message="Alguns sistemas estão indisponíveis"
          description="Não foi possível carregar todos os agendamentos. Tente novamente mais tarde."
        />
      )}

      {/* No applications */}
      {hasNoApps && (
        <Card>
          <Empty
            description={
              <Text type="secondary">
                Nenhum agendamento disponível no momento.<br />
                Você precisa estar na etapa correta do processo seletivo.
              </Text>
            }
          />
        </Card>
      )}

      {/* Prova Online Section */}
      {hasProvaApps && (
        <Card
          title={
            <Space>
              <FileTextOutlined />
              <span>Prova Online</span>
            </Space>
          }
          extra={<Tag>{prova.applications.length} vaga(s)</Tag>}
        >
          {prova.applications.map((app) => (
            <ProvaOnlineCard
              key={app.id_application_gupy}
              application={app}
              cpf={cpf}
              email={email}
            />
          ))}
        </Card>
      )}

      {/* Aula Teste Section */}
      {hasAulaTesteApps && (
        <Card
          title={
            <Space>
              <BookOutlined />
              <span>Aula Teste</span>
            </Space>
          }
          extra={<Tag>{aulaTeste.applications.length} vaga(s)</Tag>}
        >
          {aulaTeste.applications.map((app) => (
            <AulaTesteCard
              key={app.id_application_gupy}
              application={app}
              cpf={cpf}
              email={email}
            />
          ))}
        </Card>
      )}
    </Space>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function CandidatoHub() {
  const [credentials, setCredentials] = useState(null);
  const lookupMutation = useCandidatoLookup();

  const handleSubmit = async (values) => {
    const cpf = values.cpf.replace(/\D/g, '');
    const email = values.email.trim().toLowerCase();

    setCredentials({ cpf, email });

    try {
      await lookupMutation.mutateAsync({ cpf, email });
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleLogout = () => {
    setCredentials(null);
    lookupMutation.reset();
  };

  // Show login form if not logged in or if there was an error
  const showLogin = !credentials || (lookupMutation.isError && !lookupMutation.data?.success);

  // Show error message for auth errors
  const authError = lookupMutation.error?.response?.data?.error ||
    (lookupMutation.isError ? 'Erro ao buscar candidaturas. Tente novamente.' : null);

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px' }}>
      {showLogin ? (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <LoginForm
            onSubmit={handleSubmit}
            isLoading={lookupMutation.isPending}
          />

          {authError && (
            <Alert
              type="error"
              showIcon
              message="Erro"
              description={authError}
            />
          )}
        </Space>
      ) : lookupMutation.isPending ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <br /><br />
            <Text type="secondary">Buscando seus agendamentos...</Text>
          </div>
        </Card>
      ) : lookupMutation.isSuccess && lookupMutation.data ? (
        <ApplicationsList
          data={lookupMutation.data}
          credentials={credentials}
          onLogout={handleLogout}
        />
      ) : null}
    </div>
  );
}
