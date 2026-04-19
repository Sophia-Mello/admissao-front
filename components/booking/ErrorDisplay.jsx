// components/booking/ErrorDisplay.jsx

import { Alert, Button, Result } from 'antd';

/**
 * ErrorDisplay - Error display component for various error types
 *
 * Shows appropriate error messages based on error type.
 *
 * Props:
 * - error: object
 *   - message: string - Error message to display
 *   - type: 'blocked' | 'not-found' | 'server' | 'network' | 'unknown'
 *   - status: number (optional) - HTTP status code
 * - onRetry: () => void - Called when retry button is clicked
 *
 * Usage:
 * <ErrorDisplay
 *   error={{ message: 'Error message', type: 'blocked' }}
 *   onRetry={() => console.log('Retry')}
 * />
 */
export default function ErrorDisplay({ error, onRetry }) {
  const { message, type } = error;

  // Blocked candidate (403 - wrong stage or too many no-shows)
  if (type === 'blocked') {
    const isNoShowBlock =
      message.includes('faltas') || message.includes('limite');
    const isStageBlock = message.includes('fase') || message.includes('etapa');

    return (
      <Result
        status="warning"
        title="Acesso nao autorizado"
        subTitle={message}
        style={{ padding: '40px 0' }}
        extra={
          isNoShowBlock && (
            <Alert
              type="info"
              showIcon
              message="O que isso significa?"
              description="Voce atingiu o limite de faltas permitido em aulas teste anteriores. Para mais informacoes, entre em contato com o RH."
              style={{ marginTop: 16, textAlign: 'left' }}
            />
          )
        }
      />
    );
  }

  // Missing params (invalid URL)
  if (type === 'invalid-params') {
    return (
      <Result
        status="error"
        title="Link Invalido"
        subTitle={message || 'Link de agendamento invalido. Verifique se voce acessou pelo link correto enviado pelo Gupy.'}
        style={{ padding: '40px 0' }}
        extra={
          <Alert
            type="info"
            showIcon
            message="Como acessar?"
            description="Este link deve ser acessado atraves do email enviado pelo sistema Gupy. Verifique sua caixa de entrada ou pasta de spam."
            style={{ marginTop: 16, textAlign: 'left' }}
          />
        }
      />
    );
  }

  // Not found (404)
  if (type === 'not-found') {
    return (
      <Result
        status="404"
        title="Nao encontrado"
        subTitle={message || 'O recurso solicitado nao foi encontrado.'}
        style={{ padding: '40px 0' }}
        extra={
          <Button type="primary" size="large" onClick={onRetry}>
            Tentar Novamente
          </Button>
        }
      />
    );
  }

  // Server error (500)
  if (type === 'server') {
    return (
      <Result
        status="500"
        title="Erro no servidor"
        subTitle={message || 'Ocorreu um erro no servidor. Tente novamente mais tarde.'}
        style={{ padding: '40px 0' }}
        extra={
          <Button type="primary" size="large" onClick={onRetry}>
            Tentar Novamente
          </Button>
        }
      />
    );
  }

  // Network error
  if (type === 'network') {
    return (
      <Result
        status="error"
        title="Erro de conexao"
        subTitle={message || 'Nao foi possivel conectar ao servidor. Verifique sua conexao com a internet.'}
        style={{ padding: '40px 0' }}
        extra={
          <Button type="primary" size="large" onClick={onRetry}>
            Tentar Novamente
          </Button>
        }
      />
    );
  }

  // Generic error (fallback)
  return (
    <Result
      status="error"
      title="Erro ao processar solicitacao"
      subTitle={message || 'Ocorreu um erro inesperado. Tente novamente.'}
      style={{ padding: '40px 0' }}
      extra={
        <Button type="primary" size="large" onClick={onRetry}>
          Tentar Novamente
        </Button>
      }
    />
  );
}
