/**
 * JobStatusBadge - Visual indicator for job status
 *
 * Displays a colored Ant Design Tag based on the job's current status.
 *
 * @example
 * <JobStatusBadge status="draft" />
 * <JobStatusBadge status="published" existsInGupy={true} />
 */

import { Tag } from 'antd'
import {
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LockOutlined,
  StopOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  PauseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'

// Status configuration mapping
const STATUS_CONFIG = {
  draft: {
    color: 'default',
    text: 'Rascunho',
    icon: EditOutlined,
  },
  waiting_approval: {
    color: 'gold',
    text: 'Aguardando Aprovacao',
    icon: ClockCircleOutlined,
  },
  approved: {
    color: 'cyan',
    text: 'Aprovada',
    icon: CheckOutlined,
  },
  disapproved: {
    color: 'red',
    text: 'Reprovada',
    icon: CloseCircleOutlined,
  },
  published: {
    color: 'green',
    text: 'Publicada',
    icon: CheckCircleOutlined,
  },
  frozen: {
    color: 'blue',
    text: 'Congelada',
    icon: PauseCircleOutlined,
  },
  closed: {
    color: 'red',
    text: 'Fechada',
    icon: LockOutlined,
  },
  canceled: {
    color: 'error',
    text: 'Cancelada',
    icon: StopOutlined,
  },
}

/**
 * @param {Object} props
 * @param {string} props.status - Job status ('draft' | 'published' | 'closed' | 'frozen' | etc.)
 * @param {boolean} [props.existsInGupy] - Whether the job exists in Gupy (false = deleted)
 */
export default function JobStatusBadge({ status, existsInGupy }) {
  // Handle deleted from Gupy case
  if (existsInGupy === false) {
    return (
      <Tag color="error" icon={<WarningOutlined />}>
        Excluida na Gupy
      </Tag>
    )
  }

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  const IconComponent = config.icon

  return (
    <Tag color={config.color} icon={IconComponent ? <IconComponent /> : null}>
      {config.text}
    </Tag>
  )
}
