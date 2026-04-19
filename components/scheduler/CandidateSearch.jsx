/**
 * CandidateSearch Component
 *
 * Reusable component for searching candidates by CPF.
 *
 * Features:
 * - CPF-only search (11 digits required)
 * - Debounced search (via useCandidateSearch hook - 300ms)
 * - Loading state with spinner
 * - Dropdown with candidate cards
 * - Empty state
 * - Shows candidate's current phase (any phase allowed)
 *
 * Props:
 * @param {Function} onSelect - Callback when candidate is selected (candidate) => void
 * @param {number} id_unidade - Unit ID for scoped search (required)
 * @param {string} placeholder - Input placeholder text
 * @param {boolean} disabled - Whether the search is disabled
 * @param {string} value - Controlled value
 */

import { useState } from 'react';
import { Select, Spin, Empty, Tag, Space, Typography } from 'antd';
import { UserOutlined, SearchOutlined } from '@ant-design/icons';
import { useCandidateSearch } from '../../hooks/useCandidateSearch';

const { Text } = Typography;

export default function CandidateSearch({
  onSelect,
  id_unidade,
  placeholder = 'Buscar por CPF (11 digitos)',
  disabled = false,
  value,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Use the hook for candidate search with debounce
  const { candidates, isLoading, isSearching, isValidCpf, error } = useCandidateSearch(
    id_unidade,
    searchQuery
  );

  // Get status tag color based on phase/status
  const getStatusColor = (step) => {
    if (!step) return 'default';
    const stepLower = step.toLowerCase();
    if (stepLower.includes('aula teste')) {
      return 'processing';
    }
    if (stepLower.includes('aprovado') || stepLower.includes('contratado')) {
      return 'success';
    }
    if (stepLower.includes('reprovado') || stepLower.includes('desistiu')) {
      return 'error';
    }
    return 'default';
  };

  // Determine loading state
  const showLoading = isLoading || isSearching;

  // Determine content for notFoundContent
  const getNotFoundContent = () => {
    if (showLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="small" />
          <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: '12px' }}>
            Buscando candidatos...
          </Text>
        </div>
      );
    }

    if (!searchQuery || searchQuery.replace(/\D/g, '').length < 11) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Digite um CPF valido (11 digitos)"
          style={{ padding: '20px 0' }}
        />
      );
    }

    if (error) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={error.message || 'Erro ao buscar candidatos'}
          style={{ padding: '20px 0' }}
        />
      );
    }

    if (candidates.length === 0 && isValidCpf) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Nenhum candidato encontrado com este CPF"
          style={{ padding: '20px 0' }}
        />
      );
    }

    return null;
  };

  return (
    <Select
      showSearch
      value={value}
      placeholder={placeholder}
      defaultActiveFirstOption={false}
      suffixIcon={<SearchOutlined />}
      filterOption={false}
      onSearch={setSearchQuery}
      onChange={(value, option) => {
        if (onSelect && option?.candidate) {
          onSelect(option.candidate);
        }
      }}
      notFoundContent={getNotFoundContent()}
      disabled={disabled}
      style={{ width: '100%' }}
      size="large"
    >
      {candidates.map((candidate) => (
        <Select.Option
          key={candidate.id_application}
          value={candidate.id_application}
          candidate={candidate}
        >
          <Space direction="vertical" size={4} style={{ width: '100%', padding: '8px 0' }}>
            {/* Candidate name */}
            <Space size={8}>
              <UserOutlined style={{ color: '#1890ff' }} />
              <Text strong>{candidate.candidate_name}</Text>
            </Space>

            {/* Email */}
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {candidate.candidate_email}
            </Text>

            {/* Current Step/Phase - IMPORTANT: Show regardless of phase */}
            {candidate.current_step && (
              <Tag color={getStatusColor(candidate.current_step)} style={{ fontSize: '11px' }}>
                Fase: {candidate.current_step}
              </Tag>
            )}

            {/* Job name */}
            {candidate.job_name && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Vaga: {candidate.job_name}
              </Text>
            )}
          </Space>
        </Select.Option>
      ))}
    </Select>
  );
}
