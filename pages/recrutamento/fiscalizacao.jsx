/**
 * /recrutamento/fiscalizacao page - Exam Monitoring (Fiscalização)
 *
 * Page for fiscal to monitor candidates during online exams:
 * - Select event/room
 * - Mark presence manually
 * - Fill apelido_meet for identification
 * - Register occurrence reports
 * - Start exam (process attendance)
 *
 * Features:
 * - Real-time candidate list with presence checkboxes
 * - Lock presence after exam starts
 * - Gupy integration (move candidates, add tags)
 * - Occurrence reporting system
 */

import { Row, Col, Typography, Card, Alert } from 'antd';
import {
  VideoCameraOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import Layout from '../../components/Layout';
import withFiscalProva from '../../lib/withFiscalProva';
import { FiscalizacaoContent } from '../../components/fiscalizacao';

const { Title, Text } = Typography;

function FiscalizacaoPage() {
  return (
    <Layout>
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2}>
            <EyeOutlined /> Fiscalização - Evento Online
          </Title>
          <Text type="secondary">
            Acompanhe candidatos durante a prova e registre presenças e ocorrências
          </Text>
        </Col>
      </Row>

      <Alert
        type="info"
        showIcon
        icon={<VideoCameraOutlined />}
        message="Como usar esta tela"
        description={
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>Selecione o <strong>horário</strong> e a <strong>sala</strong> que você vai fiscalizar</li>
            <li>Marque a <strong>presença</strong> dos candidatos conforme eles entrarem no Meet</li>
            <li>Use o campo <strong>Apelido Meet</strong> para identificar candidatos no Google Meet</li>
            <li>Registre <strong>ocorrências</strong> se observar comportamento suspeito</li>
            <li>Clique em <strong>Iniciar Prova</strong> quando todos estiverem prontos</li>
          </ul>
        }
        style={{ marginBottom: 16 }}
        closable
      />

      <FiscalizacaoContent />
    </Layout>
  );
}

export default withFiscalProva(FiscalizacaoPage);
