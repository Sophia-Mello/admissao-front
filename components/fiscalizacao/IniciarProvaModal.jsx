/**
 * IniciarProvaModal.jsx - Confirmation modal to start exam
 *
 * Shows summary of:
 * - Candidates with presence marked (will be moved to next stage)
 * - Candidates without presence (will receive absence tag)
 *
 * Requires confirmation before processing.
 */

import { Modal, Typography, Space, Alert, Statistic, Row, Col, List, Tag } from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useIniciarProva } from '../../hooks/useFiscalizacao';

const { Text, Title, Paragraph } = Typography;

export default function IniciarProvaModal({
  open,
  onCancel,
  onSuccess,
  idEvent,
  room,
  candidates = [],
}) {
  const iniciarProva = useIniciarProva();

  // Calculate summary
  const presentes = candidates.filter((c) => c.presence_marked);
  const ausentes = candidates.filter((c) => !c.presence_marked);

  const handleConfirm = async () => {
    try {
      await iniciarProva.mutateAsync({
        idEvent,
        room,
      });
      onSuccess?.();
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <Modal
      title={
        <Space>
          <PlayCircleOutlined style={{ color: '#1890ff' }} />
          <span>Iniciar Prova - Sala {room}</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleConfirm}
      okText="Confirmar e Iniciar"
      okButtonProps={{
        loading: iniciarProva.isPending,
        type: 'primary',
      }}
      cancelText="Cancelar"
      width={600}
      destroyOnClose
    >
      {/* Warning */}
      <Alert
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        message="Atenção: Esta ação é irreversível"
        description={
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>Candidatos com presença marcada serão movidos para "Prova Online e Análise Curricular" na Gupy</li>
            <li>Candidatos sem presença receberão a tag "ausente-prova-online" na Gupy</li>
            <li>A coluna de presenças será travada após esta ação</li>
          </ul>
        }
        style={{ marginBottom: 24 }}
      />

      {/* Summary Statistics */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Statistic
            title={<Text type="success">Presentes</Text>}
            value={presentes.length}
            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title={<Text type="danger">Ausentes</Text>}
            value={ausentes.length}
            prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Col>
      </Row>

      {/* Candidate Lists */}
      <Row gutter={16}>
        {/* Presentes */}
        <Col span={12}>
          <Title level={5} style={{ color: '#52c41a' }}>
            <CheckCircleOutlined /> Compareceram ({presentes.length})
          </Title>
          <List
            size="small"
            bordered
            dataSource={presentes}
            style={{ maxHeight: 200, overflow: 'auto' }}
            renderItem={(item) => (
              <List.Item>
                <Text ellipsis style={{ width: '100%' }}>
                  {item.nome}
                </Text>
              </List.Item>
            )}
            locale={{ emptyText: 'Nenhum candidato presente' }}
          />
        </Col>

        {/* Ausentes */}
        <Col span={12}>
          <Title level={5} style={{ color: '#ff4d4f' }}>
            <CloseCircleOutlined /> Faltaram ({ausentes.length})
          </Title>
          <List
            size="small"
            bordered
            dataSource={ausentes}
            style={{ maxHeight: 200, overflow: 'auto' }}
            renderItem={(item) => (
              <List.Item>
                <Text ellipsis style={{ width: '100%' }}>
                  {item.nome}
                </Text>
              </List.Item>
            )}
            locale={{ emptyText: 'Todos os candidatos presentes' }}
          />
        </Col>
      </Row>
    </Modal>
  );
}
