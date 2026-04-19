import { Modal, Form, DatePicker, TimePicker, Typography, Space, Alert } from 'antd';
import { CalendarOutlined, UserOutlined } from '@ant-design/icons';
import moment from 'moment';
import 'moment/locale/pt-br';

moment.locale('pt-br');

const { Text } = Typography;

/**
 * Modal to schedule an occupational exam appointment
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether modal is visible
 * @param {Object} props.candidato - Candidate being scheduled
 * @param {boolean} props.loading - Whether form is submitting
 * @param {Function} props.onConfirm - Called with { date, time } on confirm
 * @param {Function} props.onCancel - Called when modal is closed/cancelled
 */
export default function ScheduleModal({
  open,
  candidato,
  loading,
  onConfirm,
  onCancel,
}) {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const { date, time } = values;

      // Combine date and time into ISO string
      const datetime = moment(date)
        .hour(time.hour())
        .minute(time.minute())
        .second(0)
        .toISOString();

      onConfirm({ agendado_para: datetime });
    } catch (err) {
      // Validation failed
      console.log('Validation failed:', err);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  // Disable past dates
  const disabledDate = (current) => {
    return current && current < moment().startOf('day');
  };

  return (
    <Modal
      title={
        <Space>
          <CalendarOutlined />
          <span>Agendar Exame Ocupacional</span>
        </Space>
      }
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Confirmar Agendamento"
      cancelText="Cancelar"
      destroyOnClose
    >
      {candidato && (
        <>
          <Alert
            message={
              <Space>
                <UserOutlined />
                <Text strong>{candidato.nome}</Text>
              </Space>
            }
            type="info"
            showIcon={false}
            style={{ marginBottom: 16 }}
          />

          <Form
            form={form}
            layout="vertical"
            initialValues={{
              date: moment().add(1, 'day'),
              time: moment().hour(9).minute(0),
            }}
          >
            <Form.Item
              name="date"
              label="Data do Exame"
              rules={[{ required: true, message: 'Selecione a data' }]}
            >
              <DatePicker
                format="DD/MM/YYYY"
                placeholder="Selecione a data"
                disabledDate={disabledDate}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="time"
              label="Horário"
              rules={[{ required: true, message: 'Selecione o horário' }]}
            >
              <TimePicker
                format="HH:mm"
                placeholder="Selecione o horário"
                minuteStep={15}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Form>

          <Text type="secondary" style={{ fontSize: '12px' }}>
            O candidato será movido para a coluna &quot;Agendado&quot; após a confirmação.
          </Text>
        </>
      )}
    </Modal>
  );
}
