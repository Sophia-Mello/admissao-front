/**
 * Higher-Order Component (HOC) para proteger rotas
 * Permite acesso apenas para usuários com role 'recrutamento' ou 'admin'
 */

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import auth from './auth';

export default function withRecrutamentoOrAdmin(Component) {
  return function ProtectedComponent(props) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
      const user = auth.getUser();

      if (!user) {
        console.log('❌ withRecrutamentoOrAdmin: Usuário não autenticado');
        router.replace('/login');
        return;
      }

      const allowedRoles = ['admin', 'recrutamento'];

      if (!allowedRoles.includes(user.role)) {
        console.log(`❌ withRecrutamentoOrAdmin: Acesso negado - role: ${user.role}`);
        router.replace('/dashboard');
        return;
      }

      console.log(`✅ withRecrutamentoOrAdmin: Acesso permitido - role: ${user.role}`);
      setIsAuthorized(true);
    }, [router]);

    if (!isAuthorized) {
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <p>Verificando permissões...</p>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
