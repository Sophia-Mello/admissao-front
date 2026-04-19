/**
 * Higher-Order Component (HOC) para proteger rotas de Exames Ocupacionais
 * Permite acesso para usuários com role 'admin', 'recrutamento' ou 'salu'
 */

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import auth from './auth';

export default function withSalu(Component) {
  return function ProtectedComponent(props) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
      const user = auth.getUser();

      if (!user) {
        console.log('❌ withSalu: Usuário não autenticado');
        router.replace('/login');
        return;
      }

      const allowedRoles = ['admin', 'recrutamento', 'salu'];

      if (!allowedRoles.includes(user.role)) {
        console.log(`❌ withSalu: Acesso negado - role: ${user.role}`);
        router.replace('/dashboard');
        return;
      }

      console.log(`✅ withSalu: Acesso permitido - role: ${user.role}`);
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
