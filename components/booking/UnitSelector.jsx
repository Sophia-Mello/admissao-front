// components/booking/UnitSelector.jsx

import { Alert, Card, Divider, Space, Typography, Result } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * UnitSelector - Unit selection step
 *
 * Displays a list of available units for the candidate to choose from.
 * Shows unit name, city, and state.
 *
 * Props:
 * - unidades: array - List of available units
 *   - id_unidade: number
 *   - id_job_unidade: number
 *   - nome_unidade: string
 *   - endereco: string
 *   - cidade: string (optional)
 *   - uf: string (optional)
 * - blockedUnits: array - IDs of units to filter out (where candidate already has booking)
 * - jobName: string - Job title to display
 * - candidateName: string - Candidate name for greeting
 * - onSelect: (unidade) => void - Called when a unit is selected
 *
 * Usage:
 * <UnitSelector
 *   unidades={[{ id_unidade: 1, nome_unidade: 'Escola A', endereco: '...' }]}
 *   blockedUnits={[2, 3]}
 *   jobName="Professor de Matematica"
 *   candidateName="Joao Silva"
 *   onSelect={(unidade) => console.log('Selected:', unidade)}
 * />
 */
export default function UnitSelector({ unidades, blockedUnits = [], jobName, candidateName, onSelect }) {
  // Filter out blocked units (where candidate already has booking)
  const availableUnidades = unidades.filter(
    u => !blockedUnits.includes(u.id_unidade)
  );

  // Check if all units were blocked (candidate already has booking at all of them)
  const allUnitsBlocked = unidades.length > 0 && availableUnidades.length === 0;

  // Handle empty units list after filtering
  if (!availableUnidades || availableUnidades.length === 0) {
    return (
      <Result
        status="warning"
        title={allUnitsBlocked ? "Voce ja possui agendamento em todas as unidades" : "Sem unidades disponiveis"}
        subTitle={allUnitsBlocked
          ? "Voce ja realizou ou tem agendamento em todas as unidades disponiveis para esta vaga. Nao e possivel agendar novamente na mesma unidade."
          : "No momento, nao ha unidades com horarios disponiveis para agendamento. Tente novamente mais tarde."}
        style={{ padding: '40px 0' }}
      />
    );
  }

  return (
    <>
      {/* Greeting alert */}
      <Alert
        type="info"
        showIcon
        message={`Ola, ${candidateName}!`}
        description={
          <div>
            <p style={{ margin: 0 }}>
              Selecione uma unidade para ver os horarios disponiveis.
            </p>
          </div>
        }
        style={{ marginBottom: 24 }}
      />

      {/* Job name */}
      <Title level={4} style={{ marginBottom: 16 }}>
        Vaga: {jobName}
      </Title>

      <Divider />

      {/* Units list header */}
      <Title level={5} style={{ marginBottom: 16 }}>
        Unidades Disponiveis:
      </Title>

      {/* Units cards */}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {availableUnidades.map((unidade) => (
          <Card
            key={unidade.id_unidade || unidade.id_job_unidade}
            hoverable
            onClick={() => onSelect(unidade)}
            style={{
              cursor: 'pointer',
              borderLeft: '4px solid #1890ff',
              transition: 'all 0.3s ease',
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
              <EnvironmentOutlined /> {unidade.nome_unidade}
            </Title>
            <Text type="secondary">{unidade.endereco}</Text>
            {/* Optional: show city/state if available */}
            {(unidade.cidade || unidade.uf) && (
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {[unidade.cidade, unidade.uf].filter(Boolean).join(' - ')}
                </Text>
              </div>
            )}
          </Card>
        ))}
      </Space>
    </>
  );
}
