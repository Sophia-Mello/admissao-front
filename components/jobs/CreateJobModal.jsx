/**
 * CreateJobModal - Modal for creating new jobs from Gupy templates
 *
 * Features:
 * - Multi-select template selection (from Gupy)
 * - Multi-select subregional selection
 * - Multi-select units (filtered by selected subregionais)
 * - Combinatorial logic: N templates × M subregionais = N×M jobs
 * - Each job linked to selected units from its subregional
 *
 * @example
 * <CreateJobModal
 *   open={createModalOpen}
 *   onCancel={() => setCreateModalOpen(false)}
 *   onSuccess={() => { setCreateModalOpen(false); refetch(); }}
 * />
 */

import { useState, useEffect, useMemo } from 'react'
import { Modal, Form, Select, Alert, Space, Button, message, Tag, Typography, Divider } from 'antd'
import { PlusOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { useGupyTemplates, useSubregionais, useCreateJob } from '../../hooks'
import api from '../../lib/api'

const { Text } = Typography

/**
 * @param {Object} props
 * @param {boolean} props.open - Whether modal is visible
 * @param {Function} props.onCancel - Callback when modal is closed
 * @param {Function} props.onSuccess - Callback when jobs are created successfully
 */
export default function CreateJobModal({ open, onCancel, onSuccess }) {
  const [form] = Form.useForm()
  const [selectedSubregionais, setSelectedSubregionais] = useState([])
  const [unidadesBySubregional, setUnidadesBySubregional] = useState({})
  const [loadingUnidades, setLoadingUnidades] = useState(false)
  const [creatingJobs, setCreatingJobs] = useState(false)

  // Hooks for data fetching
  const { data: templates, isLoading: loadingTemplates } = useGupyTemplates()
  const { subregionais, isLoading: loadingSubregionais } = useSubregionais()

  // Create job mutation
  const createJobMutation = useCreateJob()

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      form.resetFields()
      setSelectedSubregionais([])
      setUnidadesBySubregional({})
    }
  }, [open, form])

  // Fetch unidades when subregionais change
  useEffect(() => {
    const fetchUnidades = async () => {
      if (selectedSubregionais.length === 0) {
        setUnidadesBySubregional({})
        return
      }

      setLoadingUnidades(true)
      try {
        const results = {}
        await Promise.all(
          selectedSubregionais.map(async (id_subregional) => {
            const res = await api.get(`/admin/subregional/${id_subregional}/unidades`)
            results[id_subregional] = res.data?.data || []
          })
        )
        setUnidadesBySubregional(results)
      } catch (error) {
        console.error('[CreateJobModal] Error fetching unidades:', error)
        message.error('Erro ao carregar unidades')
      } finally {
        setLoadingUnidades(false)
      }
    }

    fetchUnidades()
  }, [selectedSubregionais])

  // Combine all unidades from selected subregionais for the Select
  const allUnidades = useMemo(() => {
    const combined = []
    for (const id_subregional of selectedSubregionais) {
      const subregional = subregionais.find(s => s.id_subregional === id_subregional)
      const unidades = unidadesBySubregional[id_subregional] || []
      unidades.forEach(u => {
        combined.push({
          ...u,
          id_subregional,
          nome_subregional: subregional?.nome_subregional || '',
        })
      })
    }
    return combined
  }, [selectedSubregionais, unidadesBySubregional, subregionais])

  // Handle subregional change
  const handleSubregionalChange = (values) => {
    setSelectedSubregionais(values)
    // Clear unidades selection when subregionais change
    form.setFieldsValue({ unidades: [] })
  }

  // Calculate combinations preview
  const getPreviewInfo = () => {
    const selectedTemplates = form.getFieldValue('templates') || []
    const selectedUnidades = form.getFieldValue('unidades') || []

    const numTemplates = selectedTemplates.length
    const numSubregionais = selectedSubregionais.length
    const numVagas = numTemplates * numSubregionais
    const numJobUnidades = selectedUnidades.length

    return { numTemplates, numSubregionais, numVagas, numJobUnidades }
  }

  // Handle form submission
  const handleSubmit = async (values) => {
    const { templates: selectedTemplates, unidades: selectedUnidades = [] } = values

    if (selectedTemplates.length === 0) {
      message.error('Selecione ao menos um template')
      return
    }

    if (selectedSubregionais.length === 0) {
      message.error('Selecione ao menos uma subregional')
      return
    }

    setCreatingJobs(true)

    try {
      // Group selected unidades by subregional
      const unidadesPorSubregional = {}
      for (const id_unidade of selectedUnidades) {
        const unidade = allUnidades.find(u => u.id_unidade === id_unidade)
        if (unidade) {
          if (!unidadesPorSubregional[unidade.id_subregional]) {
            unidadesPorSubregional[unidade.id_subregional] = []
          }
          unidadesPorSubregional[unidade.id_subregional].push(id_unidade)
        }
      }

      // Build batch payload: 1 item per template+subregional combination
      const payload = []
      for (const template_gupy_id of selectedTemplates) {
        for (const id_subregional of selectedSubregionais) {
          const unidadesDaSubregional = unidadesPorSubregional[id_subregional] || []
          payload.push({
            template_gupy_id,
            id_subregional,
            unidades: unidadesDaSubregional,
          })
        }
      }

      // Single batch request
      const result = await createJobMutation.mutateAsync(payload)

      // Handle response with summary
      const { summary } = result
      if (summary.failed === 0) {
        message.success(`${summary.succeeded} vaga(s) criada(s) com sucesso!`)
        onSuccess()
      } else if (summary.succeeded > 0) {
        message.warning(`${summary.succeeded} vaga(s) criada(s), ${summary.failed} erro(s)`)
        onSuccess()
      } else {
        message.error('Erro ao criar vagas')
      }
    } catch (error) {
      console.error('[CreateJobModal] Unexpected error:', error)
      message.error(error.response?.data?.error || 'Erro inesperado ao criar vagas')
    } finally {
      setCreatingJobs(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    form.resetFields()
    setSelectedSubregionais([])
    setUnidadesBySubregional({})
    onCancel()
  }

  const preview = getPreviewInfo()

  return (
    <Modal
      title={
        <Space>
          <PlusOutlined />
          <span>Criar Novas Vagas</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={700}
      destroyOnClose
    >
      <Alert
        message="Criacao combinatoria de vagas"
        description="Selecione templates, subregionais e unidades. Sera criada 1 vaga para cada combinacao de template + subregional, vinculada as unidades selecionadas daquela subregional."
        type="info"
        showIcon
        style={{ marginBottom: '16px' }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={creatingJobs}
        onValuesChange={() => {
          // Force re-render to update preview
          form.getFieldValue('templates')
        }}
      >
        {/* Template Selection - Multiple */}
        <Form.Item
          label="Templates Gupy"
          name="templates"
          rules={[{ required: true, message: 'Selecione ao menos um template' }]}
        >
          <Select
            mode="multiple"
            placeholder="Selecione os templates"
            loading={loadingTemplates}
            showSearch
            optionFilterProp="label"
            maxTagCount="responsive"
            filterOption={(input, option) =>
              option?.label?.toLowerCase().includes(input.toLowerCase())
            }
            options={(templates || []).map((template) => ({
              value: template.id,
              label: template.name || template.title || `Template ${template.id}`,
            }))}
          />
        </Form.Item>

        {/* Subregional Selection - Multiple */}
        <Form.Item
          label="Subregionais"
          name="subregionais"
          rules={[{ required: true, message: 'Selecione ao menos uma subregional' }]}
        >
          <Select
            mode="multiple"
            placeholder="Selecione as subregionais"
            loading={loadingSubregionais}
            showSearch
            optionFilterProp="label"
            maxTagCount="responsive"
            onChange={handleSubregionalChange}
            filterOption={(input, option) =>
              option?.label?.toLowerCase().includes(input.toLowerCase())
            }
            options={(subregionais || []).map((sub) => ({
              value: sub.id_subregional,
              label: sub.nome_subregional,
            }))}
          />
        </Form.Item>

        {/* Units Multi-Select (Optional) */}
        <Form.Item
          label="Unidades (opcional)"
          name="unidades"
          extra={
            selectedSubregionais.length > 0
              ? `${allUnidades.length} unidades disponiveis nas subregionais selecionadas`
              : 'Selecione subregionais primeiro'
          }
        >
          <Select
            mode="multiple"
            placeholder={
              selectedSubregionais.length > 0
                ? 'Selecione as unidades'
                : 'Selecione subregionais primeiro'
            }
            loading={loadingUnidades}
            disabled={selectedSubregionais.length === 0}
            showSearch
            optionFilterProp="label"
            maxTagCount="responsive"
            filterOption={(input, option) =>
              option?.label?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {allUnidades.map((unidade) => (
              <Select.Option
                key={unidade.id_unidade}
                value={unidade.id_unidade}
                label={`${unidade.nome_unidade} - ${unidade.nome_subregional}`}
              >
                <Space>
                  <span>{unidade.nome_unidade}</span>
                  <Tag color="blue" style={{ fontSize: '10px' }}>
                    {unidade.nome_subregional}
                  </Tag>
                  {!unidade.email_unidade_agendador && (
                    <Tag icon={<WarningOutlined />} color="warning" style={{ fontSize: '10px' }}>
                      Sem email
                    </Tag>
                  )}
                </Space>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Preview */}
        {(preview.numTemplates > 0 || preview.numSubregionais > 0) && (
          <>
            <Divider />
            <Alert
              message={
                <Space>
                  <InfoCircleOutlined />
                  <Text strong>Previa da criacao</Text>
                </Space>
              }
              description={
                <div style={{ marginTop: 8 }}>
                  <Text>
                    {preview.numTemplates} template(s) × {preview.numSubregionais} subregional(is) ={' '}
                    <Text strong>{preview.numVagas} vaga(s)</Text>
                  </Text>
                  <br />
                  <Text type="secondary">
                    Cada vaga sera vinculada as unidades selecionadas da sua subregional
                  </Text>
                </div>
              }
              type="warning"
              style={{ marginBottom: 16 }}
            />
          </>
        )}

        {/* Actions */}
        <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel}>Cancelar</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={creatingJobs}
              icon={<PlusOutlined />}
            >
              Criar {preview.numVagas > 0 ? `${preview.numVagas} Vaga(s)` : 'Vagas'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}
