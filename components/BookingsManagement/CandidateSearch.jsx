// components/BookingsManagement/CandidateSearch.jsx

import { useState, useEffect } from 'react';
import { Select, Spin, Empty, Tag, Space, Typography } from 'antd';
import { UserOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { searchCandidatesByCPF } from '../../lib/services/bookingsManagementService';

const { Text } = Typography;

/**
 * CandidateSearch Component
 *
 * Reusable component for searching candidates by CPF.
 *
 * Features:
 * - CPF-only search (11 digits required)
 * - Debounced search (300ms)
 * - Loading state with spinner
 * - Dropdown with candidate cards
 * - Empty state
 *
 * Props:
 * @param {Function} onSelect - Callback when candidate is selected (candidate) => void
 * @param {number} id_unidade - Unit ID for scoped search (required)
 * @param {string} placeholder - Input placeholder text
 * @param {boolean} disabled - Whether the search is disabled
 * @param {string} value - Controlled value
 */
export default function CandidateSearch({
  onSelect,
  id_unidade,
  placeholder = 'Buscar por CPF (11 dígitos)',
  disabled = false,
  value
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Validate CPF format (only digits, must be 11 digits)
  const isValidCPFFormat = (cpf) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.length === 11;
  };

  // Query candidates (only if valid CPF format and id_unidade exists)
  const { data, isLoading, error } = useQuery({
    queryKey: ['candidates-by-cpf', debouncedQuery, id_unidade],
    queryFn: () => searchCandidatesByCPF(debouncedQuery, id_unidade),
    enabled: isValidCPFFormat(debouncedQuery) && !!id_unidade,
    staleTime: 30000, // 30s cache
  });

  const candidates = data?.candidates || [];

  // Get status tag color
  const getStatusColor = (status) => {
    if (!status) return 'default';
    if (status.toLowerCase().includes('elegível') || status.toLowerCase().includes('aprovado')) {
      return 'success';
    }
    if (status.toLowerCase().includes('bloqueado') || status.toLowerCase().includes('reprovado')) {
      return 'error';
    }
    return 'processing';
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
      notFoundContent={
        isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="small" />
            <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: '12px' }}>
              Buscando candidatos...
            </Text>
          </div>
        ) : !isValidCPFFormat(searchQuery) ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Digite um CPF válido (11 dígitos)"
            style={{ padding: '20px 0' }}
          />
        ) : error ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={error.message || 'Erro ao buscar candidatos'}
            style={{ padding: '20px 0' }}
          />
        ) : candidates.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Nenhum candidato encontrado"
            style={{ padding: '20px 0' }}
          />
        ) : null
      }
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

            {/* Job name */}
            {candidate.job_name && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Vaga: {candidate.job_name}
              </Text>
            )}

            {/* Status */}
            {candidate.status && (
              <Tag color={getStatusColor(candidate.status)} style={{ fontSize: '11px' }}>
                {candidate.status}
              </Tag>
            )}
          </Space>
        </Select.Option>
      ))}
    </Select>
  );
}
