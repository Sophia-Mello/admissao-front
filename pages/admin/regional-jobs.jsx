import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Select,
  Tag,
  Space,
  message,
  Card,
  Typography,
  Alert,
  Row,
  Col,
  Statistic,
  Checkbox,
  Divider,
  Input,
  DatePicker,
  Tooltip,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  SolutionOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  SendOutlined,
  EditOutlined,
  EyeOutlined,
  LoadingOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import withRecrutamentoOrAdmin from '../../lib/withRecrutamentoOrAdmin';
import api from '../../lib/api';
import dayjs from 'dayjs';
import BookingsManagement from '../../components/BookingsManagement';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

/**
 * Modal de Publicação de Vaga
 */
function PublishModal({ job, open, onCancel, onSuccess }) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [addressData, setAddressData] = useState(null);

  // Função para buscar endereço via CEP
  const handleCEPBlur = async (e) => {
    const cepValue = e.target.value;
    const cep = cepValue.replace(/\D/g, ''); // Remove formatação

    if (cep.length !== 8) {
      return; // CEP incompleto
    }

    setLoadingCEP(true);
    setAddressData(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        message.error('CEP não encontrado. Verifique o número digitado.');
        setAddressData(null);
      } else {
        setAddressData(data);
        message.success('Endereço carregado com sucesso!');
      }
    } catch (error) {
      console.error('[PublishModal] Erro ao buscar CEP:', error);
      message.error('Erro ao buscar CEP. Verifique sua conexão e tente novamente.');
      setAddressData(null);
    } finally {
      setLoadingCEP(false);
    }
  };

  // Mutation: Publicar vaga
  const publishMutation = useMutation({
    mutationFn: async (values) => {
      // Validar que temos os dados de endereço
      if (!addressData) {
        throw new Error('Por favor, digite um CEP válido e aguarde o carregamento do endereço.');
      }

      console.log('[PublishModal] Enviando requisição de publicação:', {
        jobId: job.id_job_regional,
        hiringDeadline: values.hiringDeadline.toISOString(),
        applicationDeadline: values.applicationDeadline.toISOString(),
        cep: values.cep,
        addressData: addressData,
        addressNumber: values.addressNumber || 'S/N',
        jobBoards: values.jobBoards || [],
      });

      const res = await api.patch(`/admin/regional-jobs/${job.id_job_regional}/publish`, {
        hiringDeadline: values.hiringDeadline.toISOString(),
        applicationDeadline: values.applicationDeadline.toISOString(),
        cep: values.cep,
        addressData: addressData,
        addressNumber: values.addressNumber || 'S/N',
        jobBoards: values.jobBoards || [],
        publishStatus: true,
      });

      console.log('[PublishModal] ✓ Vaga publicada com sucesso:', res.data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['regional-jobs']);
      message.success('Vaga publicada com sucesso!');
      onSuccess();
    },
    onError: (error) => {
      console.error('[PublishModal] ✗ Erro ao publicar vaga:', error);
      console.error('[PublishModal] Resposta do servidor:', error.response?.data);

      const errorMessage = error.response?.data?.details
        || error.response?.data?.error
        || error.message
        || 'Erro desconhecido ao publicar vaga';

      const missingFields = error.response?.data?.missingFields;

      Modal.error({
        title: 'Erro ao publicar vaga',
        content: (
          <div>
            <p>{errorMessage}</p>
            {missingFields && missingFields.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <strong>Campos faltando:</strong>
                <ul>
                  {missingFields.map((field, idx) => (
                    <li key={idx}>{field}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ),
      });
    },
  });

  const handleSubmit = async (values) => {
    await publishMutation.mutateAsync(values);
  };

  const handleCancel = () => {
    form.resetFields();
    setAddressData(null);
    setLoadingCEP(false);
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <SendOutlined />
          <span>Publicar Vaga</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={700}
      destroyOnClose
    >
      <Alert
        message="Configuração Automática"
        description="Os campos HTML foram copiados do template e a página de carreiras 'Tom Educação' será usada automaticamente. Configure apenas as datas, localização e portais de publicação."
        type="info"
        showIcon
        style={{ marginBottom: '16px' }}
      />

      {job && (
        <Card size="small" style={{ marginBottom: '16px', backgroundColor: '#f5f5f5' }}>
          <Text strong>Vaga: </Text>
          <Text>{job.job_name}</Text>
          <br />
          <Text strong>Regional: </Text>
          <Tag color="blue">{job.nome_regional}</Tag>
          <br />
          <Text strong>ID Gupy: </Text>
          <Text code>{job.id_job_gupy}</Text>
        </Card>
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={publishMutation.isPending}
        initialValues={{
          hiringDeadline: dayjs().add(90, 'days'), // Data padrão: 90 dias no futuro
          applicationDeadline: dayjs().add(60, 'days'), // Data padrão: 60 dias no futuro
          jobBoards: [], // Sem portais por padrão
        }}
      >
        <Divider orientation="left">Datas</Divider>

        {/* Data de Contratação */}
        <Form.Item
          label="Data Prevista de Contratação"
          name="hiringDeadline"
          rules={[
            { required: true, message: 'Data de contratação é obrigatória' },
            {
              validator: (_, value) => {
                if (!value) return Promise.reject();
                if (value.isBefore(dayjs())) {
                  return Promise.reject(new Error('Data deve ser no futuro'));
                }
                return Promise.resolve();
              },
            },
          ]}
          extra="Data limite para contratar. Gupy fecha a vaga automaticamente após esta data."
        >
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            disabledDate={(current) => current && current < dayjs().startOf('day')}
            placeholder="Selecione a data"
          />
        </Form.Item>

        {/* Data de Encerramento das Inscrições */}
        <Form.Item
          label="Data de Encerramento das Inscrições"
          name="applicationDeadline"
          rules={[
            { required: true, message: 'Data de encerramento é obrigatória' },
            {
              validator: (_, value) => {
                if (!value) return Promise.reject();
                if (value.isBefore(dayjs())) {
                  return Promise.reject(new Error('Data deve ser no futuro'));
                }
                return Promise.resolve();
              },
            },
          ]}
          extra="Data final para receber candidaturas. Candidatos não poderão se inscrever após esta data."
        >
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            disabledDate={(current) => current && current < dayjs().startOf('day')}
            placeholder="Selecione a data"
          />
        </Form.Item>

        <Divider orientation="left">Localização</Divider>

        {/* CEP da Vaga */}
        <Form.Item
          label="CEP da Vaga"
          name="cep"
          rules={[
            { required: true, message: 'CEP é obrigatório para publicação' },
            {
              pattern: /^\d{5}-?\d{3}$/,
              message: 'CEP inválido. Use o formato: 80000-000'
            },
          ]}
          extra={
            <span style={{ color: loadingCEP ? '#1890ff' : addressData ? '#52c41a' : undefined, fontWeight: loadingCEP ? 600 : undefined }}>
              {loadingCEP ? '🔄 Buscando endereço...' : addressData ? '✓ Endereço carregado' : 'Digite o CEP e aguarde o carregamento do endereço'}
            </span>
          }
        >
          <Input
            placeholder="Ex: 80000-000"
            maxLength={9}
            onBlur={handleCEPBlur}
            suffix={loadingCEP ? <LoadingOutlined spin /> : addressData ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : null}
            disabled={loadingCEP}
            style={{
              borderColor: loadingCEP ? '#1890ff' : addressData ? '#52c41a' : undefined,
              borderWidth: loadingCEP || addressData ? 2 : undefined
            }}
          />
        </Form.Item>

        {/* Alert de carregamento */}
        {loadingCEP && (
          <Alert
            type="info"
            message="Buscando endereço..."
            description="Aguarde enquanto consultamos o CEP na base de dados dos Correios."
            icon={<LoadingOutlined />}
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {/* Exibição do endereço encontrado */}
        {addressData && !loadingCEP && (
          <Alert
            type="success"
            message="✓ Endereço encontrado com sucesso!"
            description={
              <div>
                <Text strong>Logradouro:</Text> {addressData.logradouro || 'Não informado'}<br />
                <Text strong>Bairro:</Text> {addressData.bairro || 'Não informado'}<br />
                <Text strong>Cidade:</Text> {addressData.localidade} - {addressData.uf}<br />
                <Text strong>CEP:</Text> {addressData.cep}
              </div>
            }
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {/* Número do endereço (opcional) */}
        <Form.Item
          label="Número do Endereço (Opcional)"
          name="addressNumber"
          extra="Deixe em branco se não houver número específico (será usado 'S/N')"
        >
          <Input placeholder="Ex: 1000, S/N" />
        </Form.Item>

        <Divider orientation="left">Publicação</Divider>

        {/* Job Boards (Portais de Emprego) */}
        <Form.Item
          label={
            <Space>
              <span>Portais de Emprego</span>
              <Space size="small">
                <Button
                  size="small"
                  type="link"
                  onClick={() => {
                    const allFree = [1, 3, 10, 11, 12, 13, 15, 147, 279, 246, 213, 180];
                    form.setFieldsValue({ jobBoards: allFree });
                  }}
                >
                  Todos Gratuitos
                </Button>
                <Button
                  size="small"
                  type="link"
                  onClick={() => {
                    const mainOnly = [1, 3];
                    form.setFieldsValue({ jobBoards: mainOnly });
                  }}
                >
                  Apenas Principais
                </Button>
                <Button
                  size="small"
                  type="link"
                  onClick={() => {
                    const allBoards = [1, 3, 9, 10, 11, 12, 13, 14, 15, 147, 279, 246, 213, 180];
                    form.setFieldsValue({ jobBoards: allBoards });
                  }}
                >
                  Todos (incl. pagos)
                </Button>
                <Button
                  size="small"
                  type="link"
                  danger
                  onClick={() => {
                    form.setFieldsValue({ jobBoards: [] });
                  }}
                >
                  Limpar
                </Button>
              </Space>
            </Space>
          }
          name="jobBoards"
          extra="Selecione onde a vaga será divulgada. Use os atalhos acima para seleção rápida."
        >
          <Select
            mode="multiple"
            placeholder="Selecione os portais ou use os atalhos acima"
            allowClear
            optionFilterProp="children"
            showSearch
            maxTagCount="responsive"
          >
            <Select.OptGroup label="Principais (Gratuitos)">
              <Option value={1}>⭐ Indeed (ativado por padrão)</Option>
              <Option value={3}>LinkedIn (requer ativação)</Option>
            </Select.OptGroup>

            <Select.OptGroup label="Portais Gratuitos">
              <Option value={10}>Riovagas</Option>
              <Option value={11}>Jooble</Option>
              <Option value={12}>Netvagas</Option>
              <Option value={13}>99Hunters</Option>
              <Option value={15}>Talent</Option>
              <Option value={147}>Career Jet</Option>
              <Option value={279}>Jobbol</Option>
              <Option value={246}>Carreira Fashion</Option>
              <Option value={213}>Yduqs</Option>
              <Option value={180}>Recruta Simples</Option>
            </Select.OptGroup>

            <Select.OptGroup label="Portais Pagos / Integrados">
              <Option value={9}>Glassdoor (integrado com Indeed)</Option>
              <Option value={14}>Trampos (pago - requer conta)</Option>
            </Select.OptGroup>
          </Select>
        </Form.Item>

        <Divider />

        <Alert
          message="Atenção"
          description="Ao clicar em 'Publicar', a vaga será imediatamente ativada na Gupy e candidatos poderão se candidatar."
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        {/* Footer */}
        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>Cancelar</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={publishMutation.isPending}
              icon={<SendOutlined />}
            >
              Publicar Vaga
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

/**
 * Modal de Detalhes da Vaga
 */
function JobDetailsModal({ job, open, onCancel }) {
  return (
    <Modal
      title={
        <Space>
          <EyeOutlined />
          <span>Detalhes da Vaga</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          Fechar
        </Button>,
      ]}
      width={700}
    >
      {job && (
        <>
          <Paragraph>
            <Text strong>Nome da Vaga:</Text>
            <br />
            {job.job_name}
          </Paragraph>

          <Paragraph>
            <Text strong>ID no Sistema:</Text> {job.id_job_regional}
            <br />
            <Text strong>ID Gupy:</Text> <Text code>{job.id_job_gupy}</Text>
          </Paragraph>

          <Paragraph>
            <Text strong>Regional:</Text>
            <br />
            <Tag icon={<EnvironmentOutlined />} color="blue">
              {job.nome_regional}
            </Tag>
          </Paragraph>

          <Paragraph>
            <Text strong>Unidades Vinculadas ({job.unidades?.length || 0}):</Text>
            <br />
            {job.unidades?.map((unidade) => (
              <div key={unidade.id_unidade} style={{ marginTop: '8px' }}>
                • {unidade.nome_unidade}
                <br />
                {unidade.email_unidade && (
                  <Text type="secondary" style={{ marginLeft: '16px', fontSize: '12px' }}>
                    {unidade.email_unidade}
                  </Text>
                )}
              </div>
            ))}
          </Paragraph>

          <Paragraph>
            <Text strong>Criado em:</Text> {new Date(job.created_at).toLocaleString('pt-BR')}
          </Paragraph>
        </>
      )}
    </Modal>
  );
}

/**
 * Página de Gestão de Vagas
 */
function RegionalJobsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [publishModalJob, setPublishModalJob] = useState(null);
  const [detailsModalJob, setDetailsModalJob] = useState(null);
  const [selectedRegionais, setSelectedRegionais] = useState([]);
  const [unidadesPorRegional, setUnidadesPorRegional] = useState({});
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Query: Listar vagas regionais
  const { data: jobsData, isLoading: loadingJobs } = useQuery({
    queryKey: ['regional-jobs'],
    queryFn: async () => {
      const res = await api.get('/admin/regional-jobs');
      return res.data;
    },
    retry: 2,
    staleTime: 60000,
  });

  // Query: Listar regionais
  const { data: regionaisData } = useQuery({
    queryKey: ['regionais'],
    queryFn: async () => {
      const res = await api.get('/admin/regional');
      return res.data;
    },
    retry: 2,
    staleTime: 300000,
  });

  // Query: Listar templates Gupy
  const { data: templatesData, isLoading: loadingTemplates } = useQuery({
    queryKey: ['gupy-templates'],
    queryFn: async () => {
      const res = await api.get('/admin/gupy/templates');
      return res.data;
    },
    retry: 1,
    staleTime: 300000,
  });

  // Query: Carregar unidades
  const { data: todasUnidadesData } = useQuery({
    queryKey: ['todas-unidades'],
    queryFn: async () => {
      if (!regionaisData?.regionais) return {};

      const promises = regionaisData.regionais.map(async (regional) => {
        try {
          const res = await api.get(`/admin/regional/${regional.id_regional}/unidades`);
          return { id_regional: regional.id_regional, unidades: res.data.unidades || [] };
        } catch (error) {
          return { id_regional: regional.id_regional, unidades: [] };
        }
      });

      const results = await Promise.all(promises);
      return results.reduce((acc, curr) => {
        acc[curr.id_regional] = curr.unidades;
        return acc;
      }, {});
    },
    enabled: !!regionaisData?.regionais,
    staleTime: 300000,
  });

  // Mutation: Criar múltiplas vagas regionais
  const createJobsMutation = useMutation({
    mutationFn: async (values) => {
      const { template_gupy_id, regionais_config } = values;

      const promises = regionais_config.map(async (config) => {
        try {
          const res = await api.post('/admin/regional-jobs', {
            template_gupy_id,
            regional_id: config.regional_id,
            unidade_ids: config.unidade_ids,
          });
          return { success: true, data: res.data, regional_id: config.regional_id };
        } catch (error) {
          return {
            success: false,
            error: error.response?.data?.error || error.message,
            regional_id: config.regional_id,
          };
        }
      });

      return await Promise.all(promises);
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries(['regional-jobs']);

      const sucessos = results.filter((r) => r.success);
      const falhas = results.filter((r) => !r.success);

      if (falhas.length === 0) {
        // Tudo deu certo - fechar modal
        setIsModalOpen(false);
        form.resetFields();
        setSelectedRegionais([]);
        setUnidadesPorRegional({});

        // Verificar se há warnings
        const warnings = sucessos.flatMap(s => s.data?.warnings || []);
        if (warnings.length > 0) {
          message.warning({
            content: (
              <div>
                <div>{`${sucessos.length} ${sucessos.length === 1 ? 'vaga criada' : 'vagas criadas'} com sucesso!`}</div>
                <div style={{ marginTop: 8 }}>
                  <strong>Atenção:</strong> {warnings.length} unidade(s) sem email configurado.
                </div>
              </div>
            ),
            duration: 5,
          });
        } else {
          message.success(`${sucessos.length} ${sucessos.length === 1 ? 'vaga criada' : 'vagas criadas'} com sucesso!`);
        }
      } else {
        // Houve falhas - NÃO fechar modal, mostrar erros
        falhas.forEach(falha => {
          const regional = regionaisData?.regionais?.find(r => r.id_regional === falha.regional_id);
          message.error(`Erro ao criar vaga para ${regional?.nome_regional || 'regional'}: ${falha.error}`);
        });

        if (sucessos.length > 0) {
          message.warning(`${sucessos.length} ${sucessos.length === 1 ? 'vaga criada' : 'vagas criadas'}, mas houve ${falhas.length} ${falhas.length === 1 ? 'erro' : 'erros'}`);
        }
      }
    },
  });

  // Mutation: Buscar detalhes da vaga
  const fetchJobDetailsMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.get(`/admin/regional-jobs/${id}`);
      return res.data.job;
    },
    onSuccess: (job) => {
      setDetailsModalJob(job);
    },
  });

  // Colunas da tabela
  const columns = [
    {
      title: 'ID Gupy',
      dataIndex: 'id_job_gupy',
      key: 'id_job_gupy',
      width: 120,
      render: (text) => <Text code copyable>{text}</Text>,
    },
    {
      title: 'Nome da Vaga',
      dataIndex: 'job_name',
      key: 'job_name',
      width: 'auto',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      align: 'center',
      filters: [
        { text: '📝 Rascunho', value: 'draft' },
        { text: '✅ Publicada', value: 'published' },
        { text: '❌ Excluída na Gupy', value: 'deleted' },
        { text: '🗄️ Arquivada', value: 'archived' },
        { text: '🔒 Fechada', value: 'closed' },
        { text: '❄️ Congelada', value: 'frozen' },
        { text: '🚫 Cancelada', value: 'canceled' },
        { text: '⏳ Aguardando Aprovação', value: 'waiting_approval' },
        { text: '👍 Aprovada', value: 'approved' },
      ],
      onFilter: (value, record) => {
        if (value === 'deleted') {
          return record.exists_in_gupy === false || record.status === 'deleted';
        }
        return record.status === value;
      },
      render: (status, record) => {
        // Debug: ver qual valor está vindo do backend
        if (process.env.NODE_ENV === 'development') {
          console.log('[Status Debug]', {
            id: record.id_job_regional,
            status,
            exists_in_gupy: record.exists_in_gupy
          });
        }

        // Verificar se foi excluída na Gupy
        if (record.exists_in_gupy === false || status === 'deleted') {
          return (
            <Tag color="error" icon="⚠️">
              ❌ Excluída na Gupy
            </Tag>
          );
        }

        const statusConfig = {
          draft: { color: 'default', text: 'Rascunho', icon: '📝' },
          published: { color: 'success', text: 'Publicada', icon: '✅' },
          archived: { color: 'error', text: 'Arquivada', icon: '🗄️' },
          closed: { color: 'warning', text: 'Fechada', icon: '🔒' },
          frozen: { color: 'blue', text: 'Congelada', icon: '❄️' },
          canceled: { color: 'red', text: 'Cancelada', icon: '🚫' },
          waiting_approval: { color: 'gold', text: 'Aguardando Aprovação', icon: '⏳' },
          approved: { color: 'cyan', text: 'Aprovada', icon: '👍' },
        };
        const config = statusConfig[status] || statusConfig.draft;
        return (
          <Tag color={config.color}>
            {config.icon} {config.text}
          </Tag>
        );
      },
    },
    {
      title: 'Regional',
      dataIndex: 'nome_regional',
      key: 'nome_regional',
      render: (text) => (
        <Tag icon={<EnvironmentOutlined />} color="blue">
          {text}
        </Tag>
      ),
    },
    {
      title: 'Unidades',
      dataIndex: 'total_unidades',
      key: 'total_unidades',
      align: 'center',
      render: (count) => (
        <Tag icon={<TeamOutlined />} color="green">
          {count}
        </Tag>
      ),
    },
    {
      title: 'Criado em',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString('pt-BR'),
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 200,
      render: (_, record) => {
        const isPublished = record.status === 'published';
        const isDeleted = record.exists_in_gupy === false || record.status === 'deleted';

        return (
          <Space>
            <Tooltip title="Ver detalhes">
              <Button
                icon={<EyeOutlined />}
                size="small"
                onClick={() => fetchJobDetailsMutation.mutate(record.id_job_regional)}
              />
            </Tooltip>
            {isDeleted ? (
              <Tooltip title="Vaga excluída na Gupy - não pode ser publicada">
                <Button
                  type="default"
                  danger
                  disabled
                  size="small"
                >
                  ❌ Excluída
                </Button>
              </Tooltip>
            ) : isPublished ? (
              <Tooltip title="Vaga já publicada na Gupy">
                <Button
                  type="default"
                  disabled
                  size="small"
                >
                  ✅ Publicada
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title="Publicar vaga na Gupy">
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  size="small"
                  onClick={() => setPublishModalJob(record)}
                >
                  Publicar
                </Button>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  const handleRegionalToggle = (regionalId, checked) => {
    if (checked) {
      setSelectedRegionais([...selectedRegionais, regionalId]);
    } else {
      setSelectedRegionais(selectedRegionais.filter((id) => id !== regionalId));
      const newUnidades = { ...unidadesPorRegional };
      delete newUnidades[regionalId];
      setUnidadesPorRegional(newUnidades);
    }
  };

  const handleUnidadeToggle = (regionalId, unidadeId, checked) => {
    const currentUnidades = unidadesPorRegional[regionalId] || [];

    if (checked) {
      setUnidadesPorRegional({
        ...unidadesPorRegional,
        [regionalId]: [...currentUnidades, unidadeId],
      });
    } else {
      setUnidadesPorRegional({
        ...unidadesPorRegional,
        [regionalId]: currentUnidades.filter((id) => id !== unidadeId),
      });
    }
  };

  const handleSubmit = async (values) => {
    const regionalsSemUnidades = selectedRegionais.filter(
      (id) => !unidadesPorRegional[id] || unidadesPorRegional[id].length === 0
    );

    if (regionalsSemUnidades.length > 0) {
      message.error('Selecione pelo menos uma unidade para cada regional');
      return;
    }

    const regionais_config = selectedRegionais.map((id) => ({
      regional_id: id,
      unidade_ids: unidadesPorRegional[id],
    }));

    await createJobsMutation.mutateAsync({
      template_gupy_id: values.template_gupy_id,
      regionais_config,
    });
  };

  // Tab items
  const tabItems = [
    {
      key: 'jobs',
      label: (
        <span>
          <SolutionOutlined /> Vagas Regionais
        </span>
      ),
      children: (
        <>
          <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
            <Col>
              <Title level={2}>
                <SolutionOutlined /> Gestão de Vagas
              </Title>
              <Text type="secondary">
                Crie e publique vagas em múltiplas regionais usando templates da Gupy
              </Text>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                onClick={() => setIsModalOpen(true)}
              >
                Criar Vagas
              </Button>
            </Col>
          </Row>

          {jobsData && (
            <Row gutter={16} style={{ marginBottom: '24px' }}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Total de Vagas"
                    value={jobsData.total || 0}
                    prefix={<SolutionOutlined />}
                  />
                </Card>
              </Col>
            </Row>
          )}

          <Card>
            <Table
              columns={columns}
              dataSource={jobsData?.jobs || []}
              loading={loadingJobs}
              rowKey="id_job_regional"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total: ${total} jobs`,
              }}
            />
          </Card>
        </>
      ),
    },
    {
      key: 'bookings',
      label: (
        <span>
          <CalendarOutlined /> Agendamentos
        </span>
      ),
      children: <BookingsManagement />,
    },
  ];

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <Tabs defaultActiveKey="jobs" items={tabItems} />

        {/* Modal: Criar Vagas */}
        <Modal
          title={<Space><PlusOutlined /><span>Criar Vagas em Múltiplas Regionais</span></Space>}
          open={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false);
            form.resetFields();
            setSelectedRegionais([]);
            setUnidadesPorRegional({});
          }}
          footer={null}
          width={800}
          destroyOnClose
        >
          <Alert
            message="Crie vagas em várias regionais de uma vez"
            description="Selecione um template da Gupy, marque as regionais e unidades desejadas."
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            disabled={createJobsMutation.isPending}
          >
            <Form.Item
              label="Template Gupy"
              name="template_gupy_id"
              rules={[{ required: true, message: 'Selecione um template' }]}
            >
              <Select
                placeholder="Selecione o template"
                loading={loadingTemplates}
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {templatesData?.templates?.map((template) => (
                  <Option key={template.id} value={template.id}>
                    {template.name || template.title || template.id}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Regionais e Unidades"
              required
              extra={`${selectedRegionais.length} ${selectedRegionais.length === 1 ? 'regional selecionada' : 'regionais selecionadas'}`}
            >
              <div
                style={{
                  border: '1px solid #d9d9d9',
                  borderRadius: '8px',
                  padding: '16px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {regionaisData?.regionais?.map((regional) => {
                    const isSelected = selectedRegionais.includes(regional.id_regional);
                    const unidades = todasUnidadesData?.[regional.id_regional] || [];
                    const unidadesSelecionadas = unidadesPorRegional[regional.id_regional] || [];

                    return (
                      <div key={regional.id_regional}>
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) =>
                            handleRegionalToggle(regional.id_regional, e.target.checked)
                          }
                        >
                          <Text strong style={{ fontSize: '16px' }}>
                            {regional.nome_regional}
                          </Text>
                          {isSelected && (
                            <Tag color="blue" style={{ marginLeft: '8px' }}>
                              {unidadesSelecionadas.length} unidade(s)
                            </Tag>
                          )}
                        </Checkbox>

                        {isSelected && (
                          <div
                            style={{
                              marginLeft: '24px',
                              marginTop: '8px',
                              padding: '12px',
                              backgroundColor: '#f5f5f5',
                              borderRadius: '4px',
                            }}
                          >
                            <Space direction="vertical" size="small">
                              {unidades.map((unidade) => (
                                <Checkbox
                                  key={unidade.id_unidade}
                                  checked={unidadesSelecionadas.includes(unidade.id_unidade)}
                                  onChange={(e) =>
                                    handleUnidadeToggle(
                                      regional.id_regional,
                                      unidade.id_unidade,
                                      e.target.checked
                                    )
                                  }
                                >
                                  {unidade.nome_unidade}
                                  {!unidade.email_unidade && (
                                    <Tag icon={<WarningOutlined />} color="warning" style={{ marginLeft: '8px' }}>
                                      Sem email
                                    </Tag>
                                  )}
                                </Checkbox>
                              ))}
                            </Space>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Space>
              </div>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={createJobsMutation.isPending}
                  icon={<PlusOutlined />}
                  disabled={selectedRegionais.length === 0}
                >
                  Criar {selectedRegionais.length} Vaga(s)
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal: Publicar Vaga */}
        <PublishModal
          job={publishModalJob}
          open={!!publishModalJob}
          onCancel={() => setPublishModalJob(null)}
          onSuccess={() => setPublishModalJob(null)}
        />

        {/* Modal: Detalhes da Vaga */}
        <JobDetailsModal
          job={detailsModalJob}
          open={!!detailsModalJob}
          onCancel={() => setDetailsModalJob(null)}
        />
      </div>
    </Layout>
  );
}

export default withRecrutamentoOrAdmin(RegionalJobsPage);
