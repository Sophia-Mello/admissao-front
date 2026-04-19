# R&S Admissao Frontend

Interface web para o modulo de Recrutamento e Selecao (R&S) e Admissoes do RHSistema. Gerencia vagas, candidaturas, agendamento de Aula Teste, provas online/teoricas, exames ocupacionais, monitoramento de provas e demandas de ensino.

**Stack:** Next.js 14 (Pages Router) | React 18.2 | Ant Design 5.7 | TanStack React Query 5.4 | Axios 1.4 | @dnd-kit (drag-and-drop)

---

## Sumario

1. [Visao Geral](#1-visao-geral)
2. [Arquitetura](#2-arquitetura)
3. [Pre-requisitos](#3-pre-requisitos)
4. [Setup Local (Desenvolvimento)](#4-setup-local-desenvolvimento)
5. [Estrutura do Projeto](#5-estrutura-do-projeto)
6. [Autenticacao e Autorizacao](#6-autenticacao-e-autorizacao)
7. [Paginas e Rotas](#7-paginas-e-rotas)
8. [Componentes](#8-componentes)
9. [Hooks (React Query)](#9-hooks-react-query)
10. [Bibliotecas Utilitarias (lib/)](#10-bibliotecas-utilitarias-lib)
11. [Edge Middleware](#11-edge-middleware)
12. [Testes](#12-testes)
13. [Deploy no Vercel (Recomendado)](#13-deploy-no-vercel-recomendado)
14. [Deploy no AWS Amplify (Alternativa)](#14-deploy-no-aws-amplify-alternativa)
15. [Deploy com Docker](#15-deploy-com-docker)
16. [Variaveis de Ambiente](#16-variaveis-de-ambiente)
17. [Padroes de Desenvolvimento](#17-padroes-de-desenvolvimento)
18. [Troubleshooting](#18-troubleshooting)

---

## 1. Visao Geral

O R&S Admissao Frontend e a interface do modulo de recrutamento, selecao e admissao do ecossistema RHSistema. Principais funcionalidades:

- **Gestao de vagas** — CRUD, publicacao, encerramento, cancelamento em lote, sincronizacao com Gupy
- **Agendamento de Aula Teste** — calendario semanal, configuracao de slots por unidade, D-rules (min/max dias antecedencia)
- **Portal do candidato** — autoservico publico para agendamento de Aula Teste, Prova Online e Prova Teorica
- **Eventos e provas** — criacao em lote de salas, agendamento multi-sala, links Google Meet automaticos
- **Fiscalizacao de provas** — monitoramento em tempo real de presenca, registro de ocorrencias
- **Exames ocupacionais** — Kanban board com drag-and-drop, pipeline de status, exportacao CSV
- **Gestao de candidaturas** — tabela paginada, acoes em lote (email, mover etapa, tags, reprovar), historico com undo
- **Gestao de demandas** — demandas abertas por disciplina/unidade, mobilidade interna, candidatos do processo seletivo
- **Dashboard** — widgets de navegacao baseados no role do usuario
- **Controle de acesso** por 4 papeis (admin, recrutamento, fiscal_prova, salu)

---

## 2. Arquitetura

```
┌──────────────────────────────────────────────────────────────────┐
│                        Navegador                                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                     Next.js Pages Router                    │  │
│  │                                                            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │  │
│  │  │  Dashboard  │  │  Jobs      │  │  Scheduler         │   │  │
│  │  │  (widgets)  │  │  (CRUD,    │  │  (calendario,      │   │  │
│  │  │             │  │   batch)   │  │   config, blocos)  │   │  │
│  │  └────────────┘  └────────────┘  └────────────────────┘   │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │  │
│  │  │  Eventos   │  │Fiscalizacao│  │  Exames Ocupac.    │   │  │
│  │  │  (salas,   │  │(presenca,  │  │  (Kanban, DnD,     │   │  │
│  │  │   Meet)    │  │ ocorrencia)│  │   CSV export)      │   │  │
│  │  └────────────┘  └────────────┘  └────────────────────┘   │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │  │
│  │  │Candidaturas│  │  Demandas  │  │  Portal Candidato  │   │  │
│  │  │(bulk ops,  │  │(disciplina,│  │  (agendamento,     │   │  │
│  │  │ tags, undo)│  │ mobilidade)│  │   prova online/teo)│   │  │
│  │  └────────────┘  └────────────┘  └────────────────────┘   │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │           Hooks (React Query) + Lib (Axios/Auth)     │   │  │
│  │  └──────────────────────┬──────────────────────────────┘   │  │
│  └─────────────────────────┼──────────────────────────────────┘  │
│                            │                                      │
│  ┌─────────────────────────┴──────────────────────────────────┐  │
│  │           Edge Middleware (validacao JWT, cache 5min)        │  │
│  └─────────────────────────┬──────────────────────────────────┘  │
└────────────────────────────┼─────────────────────────────────────┘
                             │ HTTPS (JWT Bearer)
                             ▼
                   ┌──────────────────┐
                   │  Backend R&S     │
                   │  Express.js      │
                   │  :4001           │
                   └──────────────────┘
```

### Fluxo principal: Aula Teste (candidato)

1. Candidato acessa `/candidato/agendamento?jobId=X&applicationId=Y`
2. Wizard valida elegibilidade via backend (etapa Gupy, historico no-show)
3. Candidato seleciona unidade entre as disponiveis
4. Calendario semanal exibe slots filtrados por D-rule (min/max dias)
5. Candidato seleciona slot e confirma agendamento
6. Backend cria evento no Google Calendar (unidade + candidato) com link Meet
7. Tela de sucesso com detalhes do agendamento

---

## 3. Pre-requisitos

| Requisito | Versao | Observacao |
|-----------|--------|------------|
| Node.js | 18+ (recomendado 20.x) | Docker usa 18 |
| npm | 10+ | Vem com Node.js |
| Git | 2.x+ | Controle de versao |
| Backend R&S | Rodando local ou remoto | Porta 4001 |

---

## 4. Setup Local (Desenvolvimento)

### 4.1. Clonar e instalar

```bash
git clone https://github.com/techTOMAPG/v0-frontend-rs-admissao.git
cd v0-frontend-rs-admissao
npm install
```

### 4.2. Configurar variaveis de ambiente

```bash
cp .env.example .env.local
```

Conteudo minimo:

```env
NEXT_PUBLIC_API_URL=http://localhost:4001
NEXT_PUBLIC_BACKEND_URL=http://localhost:4001
```

### 4.3. Iniciar o servidor

```bash
npm run dev          # Dev server na porta 3000
```

Acesse [http://localhost:3000](http://localhost:3000)

### 4.4. Comandos

```bash
npm run dev          # Desenvolvimento (hot reload)
npm run build        # Build de producao
npm run start        # Servir build (porta 3000)
npm test             # Jest + Testing Library
```

---

## 5. Estrutura do Projeto

```
frontend/
├── pages/                          # Paginas Next.js
│   ├── _app.jsx                    # QueryClient, Ant Design, ErrorBoundary
│   ├── index.jsx                   # Redirect /dashboard ou /login
│   ├── login.jsx                   # Login
│   ├── dashboard.jsx               # Dashboard (widgets role-based)
│   ├── recrutamento/
│   │   ├── jobs.jsx                # Gestao de vagas
│   │   ├── scheduler.jsx           # Agendador Aula Teste
│   │   ├── eventos.jsx             # Gestao de eventos
│   │   ├── fiscalizacao.jsx        # Monitoramento de provas
│   │   ├── gestao-de-candidaturas.jsx
│   │   └── gestao-de-demandas.jsx
│   ├── exames-ocupacionais/
│   │   └── index.jsx               # Kanban (SALU)
│   ├── candidato/                  # Publico (sem auth)
│   │   ├── agendamento.jsx         # Wizard Aula Teste
│   │   ├── prova-online.jsx
│   │   └── prova-teorica.jsx
│   ├── admin/regional-jobs.jsx
│   └── usuarios/
│
├── components/                     # ~40 componentes
│   ├── Layout.jsx                  # Header, nav, user menu
│   ├── ErrorBoundary.jsx
│   ├── jobs/                       # 9 componentes
│   ├── scheduler/                  # 10 componentes
│   ├── booking/                    # 4 componentes (portal candidato)
│   ├── applications/               # 6 componentes
│   ├── eventos/                    # 4 componentes
│   ├── fiscalizacao/               # 4 componentes
│   ├── ExamesOcupacionais/         # 4 componentes (Kanban)
│   ├── demandas/                   # 3 componentes
│   ├── candidato/                  # 2 componentes
│   └── BookingsManagement/         # 4 componentes
│
├── hooks/                          # 21 hooks React Query
│   ├── useAuth.js, useJobs.js, useScheduleConfig.js
│   ├── useAvailability.js, useBookings.js, useApplications.js
│   ├── useEventos.js, useFiscalizacao.js, useExamesOcupacionais.js
│   ├── useDemandas.js, useCandidatoHub.js, useActionHistory.js
│   └── useGupyTemplates.js, useEmailTemplates.js, useJobSteps.js, ...
│
├── lib/                            # Infra e utilidades
│   ├── api.js                      # Axios (JWT interceptor, timeout 30s)
│   ├── auth.js                     # JWT localStorage + cookie
│   ├── queryClient.js              # React Query config + keys + invalidation
│   ├── errorHandler.js             # Mensagens de erro PT-BR
│   ├── withRecrutamentoOrAdmin.js  # HOC: admin | recrutamento
│   ├── withFiscalProva.js          # HOC: + fiscal_prova
│   ├── withSalu.js                 # HOC: + salu
│   └── services/                   # Servicos diretos (booking, candidato, exame)
│
├── styles/globals.css              # Estilos globais (minimo)
├── middleware.js                   # Edge middleware (JWT, cache 5min)
├── next.config.js                  # Transpile Ant Design
├── jest.config.js / jest.setup.js  # Config Jest + mocks Ant Design
├── Dockerfile                      # Multi-stage (Node 18)
├── amplify.yml                     # AWS Amplify config
├── .env.example                    # Template de variaveis
└── package.json
```

---

## 6. Autenticacao e Autorizacao

### 6.1. Armazenamento JWT

| Local | Uso |
|-------|-----|
| `localStorage` | Requisicoes client-side (Axios) |
| Cookie `token` | Validacao server-side (Edge middleware) |

### 6.2. Roles

| Role | Acesso |
|------|--------|
| `admin` | Tudo |
| `recrutamento` | Vagas, agendamento, eventos, candidaturas, demandas |
| `fiscal_prova` | Monitoramento de provas |
| `salu` | Exames ocupacionais |

### 6.3. HOCs

| HOC | Roles |
|-----|-------|
| `withRecrutamentoOrAdmin` | admin, recrutamento |
| `withFiscalProva` | admin, recrutamento, fiscal_prova |
| `withSalu` | admin, recrutamento, salu |

### 6.4. Redirect pos-login

- `salu` → `/exames-ocupacionais`
- Demais → `/dashboard`

---

## 7. Paginas e Rotas

### Publicas

| Rota | Descricao |
|------|-----------|
| `/login` | Login (email + senha) |
| `/candidato/agendamento` | Wizard Aula Teste (4 etapas) |
| `/candidato/prova-online` | Prova online |
| `/candidato/prova-teorica` | Agendamento prova teorica (sala + Meet) |

### Recrutamento (admin | recrutamento)

| Rota | Descricao |
|------|-----------|
| `/dashboard` | Widgets de navegacao role-based |
| `/recrutamento/jobs` | CRUD vagas, batch publish/close/cancel, stats, Gupy sync |
| `/recrutamento/scheduler` | Calendario semanal, config slots, bloqueios, D-rules |
| `/recrutamento/eventos` | Criacao em lote de salas, Meet, dashboard ocupacao |
| `/recrutamento/fiscalizacao` | Presenca em tempo real, ocorrencias |
| `/recrutamento/gestao-de-candidaturas` | Tabela paginada, bulk email/tags/move/reprove, undo |
| `/recrutamento/gestao-de-demandas` | Disciplinas x unidades, mobilidade interna |

### Exames (admin | recrutamento | salu)

| Rota | Descricao |
|------|-----------|
| `/exames-ocupacionais` | Kanban DnD (Pendentes → Agendados → Concluidos), CSV export |

### Admin

| Rota | Descricao |
|------|-----------|
| `/admin/regional-jobs` | Jobs regionais (legacy) |
| `/usuarios` | Gestao de usuarios |

---

## 8. Componentes

### Jobs

`JobsTable`, `CreateJobModal` (template Gupy), `PublishModal` (batch), `CloseJobsModal`, `CancelJobsModal` (com motivo), `JobDetailsModal`, `BatchActionsBar` (flutuante), `JobStatusBadge`

### Scheduler

`WeeklyCalendarAdmin` (grid semanal), `ModalAgendar`, `ModalCancelar`, `ModalBloqueado`, `ModalBloquearSlot`, `ConfiguracoesModal` (horarios + D-rule + vigencia), `DRuleEditor`, `TimeRangeEditor`

### Booking (portal candidato)

`BookingWizard` (4 etapas), `WeeklyCalendar` (publico), `SlotCardPublic`, `ValidationStep`

### Applications

`ApplicationsTable` (selecao em lote), `CandidateDetailModal`, `SendEmailModal` (template Gupy), `BulkMoveModal`, `BulkTagModal`, `ActionHistoryDrawer` (undo)

### Eventos

`EventosDashboard`, `EventosCreateModal` (lote), `EventosPendentes`, `EventosSlotsModal`

### Fiscalizacao

`FiscalizacaoContent`, `CandidateTable` (presenca), `IniciarProvaModal`, `OcorrenciaModal`

### Exames Ocupacionais (Kanban)

`KanbanBoard` (@dnd-kit), `KanbanColumn` (infinite scroll), `CandidateCard` (draggable), `SummaryCards`

### Demandas

`DemandasTable`, `DemandaDetailModal` (mobilidade + candidatos), `ColaboradorDetailModal`

---

## 9. Hooks (React Query)

### Jobs

`useJobs(filters)`, `useJob(id)`, `useCreateJob()`, `useUpdateJob()`, `usePublishJobs()`, `useCloseJobs()`, `useCancelJobs()`, `useDeleteJobs()`, `useDeleteDrafts()`, `useSyncJobFromGupy()`

### Agendamento

`useScheduleConfig(unit)`, `useSaveScheduleConfig()`, `useAvailability(unit, week)`, `useScheduleBlocks(unit)`, `useCreateScheduleBlock()`, `useDeleteScheduleBlock()`, `useBookings(filters)`, `useBookingDetail(id)`

### Candidaturas

`useApplications(filters)`, `useSyncApplications()`, `useApplicationTags()`, `useCommonSteps(ids)`, `useBulkEmail()`, `useBulkTags()`, `useBulkMove()`, `useBulkReprove()`, `useActionHistory()`, `useActionStatus(actionId)` (polling 1s)

### Eventos

`useEventos()`, `useEventTypes()`, `usePublicAvailability(jobId)`, `useScheduleCandidate()`, `useFiscalizacao(eventId)`

### Exames

`useSummary(filters)`, `useCargos()`, `useUpdateStatus()`, `useExportCsv()`

### Demandas

`useDemandas(filters)`, `useDemandasSubregionais()`, `useDemandasUnidades(sr)`, `useDisciplinas()`, `useDemandaTags()`, `useMobilidadeInterna(id)`, `useColaboradorAtribuicoes(id)`

### Suporte

`useAuth()`, `useGupyTemplates()`, `useEmailTemplates()`, `useJobSteps(template)`, `useSubregionais()`, `useUnidades(sr)`, `useCandidateSearch(unit, cpf)`, `useCandidatoHub()`

---

## 10. Bibliotecas Utilitarias (lib/)

### api.js

Axios com baseURL `{API_URL}/api/v1`, timeout 30s. Interceptors: JWT auto-inject, error logging.

### auth.js

`login()`, `logout()`, `getToken()`, `getUser()`, `isAuthenticated()`. Token em localStorage + cookie.

### queryClient.js

staleTime 5min, gcTime 10min, retry 3x (5xx) / 0x (4xx), exponential backoff. Query keys factory + invalidation helpers.

### errorHandler.js

`getErrorMessage(error)` — converte erros para portugues (timeout, rede, 401, 403, 404, 409, 500).

---

## 11. Edge Middleware

Protege `/dashboard`, `/admin/*`, `/usuarios/*`, `/exames-ocupacionais/*`. Rotas `/candidato/*` sao publicas.

Validacao JWT contra backend com cache 5min, timeout 3s, fallback gracioso em erro de rede.

---

## 12. Testes

Jest 30.2 + @testing-library/react 16.3. Setup com mocks de matchMedia/getComputedStyle para Ant Design.

```bash
npm test
```

Testes existentes: ApplicationsTable, SendEmailModal, useApplications, useEmailTemplates, useExamesOcupacionais, useJobSteps.

---

## 13. Deploy no Vercel (Recomendado)

1. Importar repo no Vercel
2. Configurar `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_BACKEND_URL`
3. Deploy automatico em push

Dominio: Settings → Domains → CNAME para `cname.vercel-dns.com`. SSL automatico.

---

## 14. Deploy no AWS Amplify (Alternativa)

O `amplify.yml` ja existe no repo. Configurar variaveis em App Settings → Environment Variables.

Para dominio com Cloudflare: CNAME + proxy ON + SSL "Full".

---

## 15. Deploy com Docker

```bash
docker build -t rs-admissao-frontend .

docker run -d -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://recrutamento-api.seudominio.com \
  rs-admissao-frontend
```

> Variaveis `NEXT_PUBLIC_*` sao embutidas no build.

---

## 16. Variaveis de Ambiente

### Obrigatorias

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | URL do backend R&S | `http://localhost:4001` |
| `NEXT_PUBLIC_BACKEND_URL` | Alias | `http://localhost:4001` |

### Opcionais

| Variavel | Default |
|----------|---------|
| `NEXT_PUBLIC_APP_NAME` | `RHSistema` |
| `NEXT_PUBLIC_APP_VERSION` | `1.0.0` |
| `NEXT_PUBLIC_ENABLE_DEBUG` | `true` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | `false` |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | — |
| `NEXT_PUBLIC_SENTRY_DSN` | — |

### Internas (server-side)

| Variavel | Descricao |
|----------|-----------|
| `INTERNAL_API_URL` | URL interna backend (Docker) |

---

## 17. Padroes de Desenvolvimento

### Nova pagina protegida

```jsx
'use client';
import Layout from '../../components/Layout';
import withRecrutamentoOrAdmin from '../../lib/withRecrutamentoOrAdmin';

function MinhaPage() {
  return <Layout><h1>Conteudo</h1></Layout>;
}
export default withRecrutamentoOrAdmin(MinhaPage);
```

### Novo hook React Query

```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useMinhaEntidade(filters) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['minha-entidade', filters],
    queryFn: () => api.get('/minha-entidade', { params: filters }).then(r => r.data),
  });
  const create = useMutation({
    mutationFn: (data) => api.post('/minha-entidade', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['minha-entidade'] }),
  });
  return { ...query, create };
}
```

### Acoes em lote

Tabela com checkbox → BatchActionsBar flutuante → Modal de confirmacao → Mutation → Polling `useActionStatus()` → Toast de resultado.

### Kanban drag-and-drop

`@dnd-kit`: DndContext → SortableContext → useSortable() nos cards → onDragEnd chama mutation de status.

---

## 18. Troubleshooting

| Problema | Solucao |
|----------|---------|
| CORS errors | Verificar `FRONTEND_ORIGIN` no backend |
| Login falha | Verificar `NEXT_PUBLIC_API_URL` (porta 4001) |
| Pagina em branco | Verificar token no localStorage (F12) |
| Build falha | Node >= 18. Testar `npm run build` local |
| DnD nao funciona | Verificar @dnd-kit instalado |
| Gupy sync timeout | Normal. Timeout 2min configurado |
| Exames sem dados | Verificar role `salu` no JWT |
| Candidato bloqueado | Verificar historico no-show no backend |

---

## Dependencias Principais

| Pacote | Versao | Funcao |
|--------|--------|--------|
| `next` | 14 | Framework (Pages Router) |
| `react` | 18.2.0 | UI |
| `antd` | 5.7.0 | Componentes |
| `@tanstack/react-query` | 5.4.0 | Estado servidor |
| `axios` | 1.4.0 | HTTP |
| `@dnd-kit/core` | 6.3.1 | Drag-and-drop |
| `@dnd-kit/sortable` | 10.0.0 | Sortable |
| `dayjs` | 1.11.18 | Datas |
| `moment` | 2.29.4 | Datas (legado) |
| `js-cookie` | 3.0.5 | Cookies |

**Dev:** `jest` 30.2, `@testing-library/react` 16.3, `eslint` 8.0
