/**
 * OcorrenciaModal.jsx - Modal to register occurrence reports
 *
 * Allows fiscal to:
 * - Select type: alert or eliminatory
 * - Enter description
 * - Submit to create report + Gupy tag + timeline comment
 */

import { useState, useEffect } from 'react';
import { Modal, Form, Radio, Input, Typography, Space, Alert, Divider, List, message } from 'antd';
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  StopOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useCreateReport, useApplicationReports } from '../../hooks/useFiscalizacao';

const { Text, Title } = Typography;
const { TextArea } = Input;

export default function OcorrenciaModal({
  open,
  onCancel,
  candidate,
}) {
  const [form] = Form.useForm();
  const [selectedType, setSelectedType] = useState('alert');

  const createReport = useCreateReport();
  const { reports, isLoading: loadingReports, isError: reportsError } = useApplicationReports(
    candidate?.id_event_application,
    open && !!candidate
  );

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields();
      setSelectedType('alert');
    }
  }, [open, form]);

  const handleSubmit = async () => {
    // Validate candidate before proceeding
    if (!candidate?.id_event_application) {
      message.error('Candidato inválido. Feche o modal e tente novamente.');
      return;
    }

    // Validate form fields
    let values;
    try {
      values = await form.validateFields();
    } catch {
      // Form validation failed - Ant Design Form shows inline errors
      return;
    }

    // Submit report - API errors handled by useCreateReport hook (shows message.error)
    try {
      await createReport.mutateAsync({
        id_event_application: candidate.id_event_application,
        type: values.type,
        description: values.description,
      });
    } catch {
      // Error already displayed by useCreateReport hook - prevent further execution
      return;
    }

    form.resetFields();

    try {
      onCancel?.();
    } catch (callbackError) {
      console.error('[OcorrenciaModal] onCancel callback failed:', callbackError);
    }
  };

  const typeOptions = [
    {
      value: 'alert',
      label: (
        <Space>
          <WarningOutlined style={{ color: '#faad14' }} />
          <span>Alerta</span>
        </Space>
      ),
      description: 'Comportamento suspeito que precisa ser investigado. Adiciona tag "alerta-prova-online" na Gupy.',
    },
    {
      value: 'eliminatory',
      label: (
        <Space>
          <StopOutlined style={{ color: '#ff4d4f' }} />
          <span>Eliminatória</span>
        </Space>
      ),
      description: 'Candidato deve ser eliminado do processo. Adiciona tag "eliminado-prova-online" na Gupy.',
    },
    {
      value: 'technical',
      label: (
        <Space>
          <ToolOutlined style={{ color: '#1890ff' }} />
          <span>Problema Técnico</span>
        </Space>
      ),
      description: 'Problema técnico impediu o candidato de realizar a prova. Candidato será movido de volta para reagendar.',
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
          <span>Registrar Ocorrência</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText="Registrar"
      okButtonProps={{
        loading: createReport.isPending,
        danger: selectedType === 'eliminatory',
        type: selectedType === 'technical' ? 'primary' : undefined,
      }}
      cancelText="Cancelar"
      width={600}
      destroyOnClose
    >
      {candidate && (
        <>
          {/* Candidate Info */}
          <Alert
            type="info"
            showIcon
            message={
              <Space direction="vertical" size={0}>
                <Text strong>{candidate.nome}</Text>
                <Text type="secondary">CPF: {candidate.cpf}</Text>
              </Space>
            }
            style={{ marginBottom: 16 }}
          />

          {/* Form */}
          <Form form={form} layout="vertical" initialValues={{ type: 'alert' }}>
            <Form.Item
              name="type"
              label="Tipo de Ocorrência"
              rules={[{ required: true, message: 'Selecione o tipo' }]}
            >
              <Radio.Group
                onChange={(e) => setSelectedType(e.target.value)}
                value={selectedType}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {typeOptions.map((option) => (
                    <Radio key={option.value} value={option.value} style={{ width: '100%' }}>
                      <Space direction="vertical" size={0}>
                        {option.label}
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {option.description}
                        </Text>
                      </Space>
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            </Form.Item>

            {selectedType === 'technical' && (
              <Alert
                type="info"
                showIcon
                icon={<ToolOutlined />}
                message="O candidato será cancelado e movido de volta para Agendamento de Prova Online no Gupy."
                style={{ marginBottom: 16 }}
              />
            )}

            <Form.Item
              name="description"
              label="Descrição da Ocorrência"
              rules={[
                { required: true, message: 'Descreva a ocorrência' },
                { min: 5, message: 'Mínimo de 5 caracteres' },
              ]}
            >
              <TextArea
                rows={4}
                placeholder="Descreva o comportamento observado com o máximo de detalhes possível..."
                maxLength={2000}
                showCount
              />
            </Form.Item>
          </Form>

          {/* Previous Reports */}
          {(reports.length > 0 || reportsError) && (
            <>
              <Divider orientation="left">
                <Text type="secondary">
                  Ocorrências Anteriores {reportsError ? '' : `(${reports.length})`}
                </Text>
              </Divider>
              {reportsError ? (
                <Alert
                  type="warning"
                  message="Não foi possível carregar ocorrências anteriores"
                  showIcon
                />
              ) : (
                <List
                  size="small"
                  dataSource={reports}
                  loading={loadingReports}
                  renderItem={(report) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          report.type === 'alert' ? (
                            <WarningOutlined style={{ color: '#faad14', fontSize: 16 }} />
                          ) : report.type === 'eliminatory' ? (
                            <StopOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
                          ) : (
                            <ToolOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                          )
                        }
                        title={
                          <Space>
                            <Text strong>
                              {report.type === 'alert' ? 'Alerta' : report.type === 'eliminatory' ? 'Eliminatória' : 'Problema Técnico'}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {new Date(report.created_at).toLocaleString('pt-BR')}
                            </Text>
                          </Space>
                        }
                        description={
                          <Text ellipsis={{ tooltip: report.description }}>
                            {report.description}
                          </Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </>
          )}
        </>
      )}
    </Modal>
  );
}
