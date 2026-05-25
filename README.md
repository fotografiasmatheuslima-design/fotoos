# FotoOS

**ERP/SaaS para fotógrafos profissionais**

Sistema que centraliza toda a operação de um fotógrafo autônomo ou pequeno estúdio: gestão de trabalhos, CRM de clientes, contratos em PDF, financeiro, controle de cartões SD e workflow de pós-produção.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Linguagem | TypeScript 5 |
| Auth + DB | Supabase (Auth + Postgres) |
| ORM | Drizzle ORM |
| Estado servidor | TanStack Query v5 |
| Estado cliente | Zustand v5 |
| UI | Tailwind CSS v4 + Radix UI |
| Gráficos | Recharts |
| PDF | jsPDF (CDN, gerador standalone) |

---

## Pré-requisitos

- Node.js 20+
- Uma conta no [Supabase](https://supabase.com) com um projeto criado

---

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-key>
DATABASE_URL=postgresql://postgres:<senha>@<host>:5432/postgres
```

> Os valores estão disponíveis em **Settings → API** no painel do Supabase.

### 3. Criar as tabelas no Supabase

Acesse o **SQL Editor** do Supabase e execute o arquivo `schema.sql` que está na raiz do projeto. Ele cria todas as tabelas, enums e relacionamentos.

### 4. Sincronizar com o Drizzle

```bash
npm run db:push        # aplica o schema sem gerar migration
# ou
npm run db:generate    # gera arquivos de migration
npm run db:migrate     # executa as migrations
```

### 5. Rodar em desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em [http://localhost:3000](http://localhost:3000).

---

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento com Turbopack |
| `npm run build` | Gera o build de produção |
| `npm run start` | Inicia o servidor de produção |
| `npm run lint` | Executa o ESLint |
| `npm run db:generate` | Gera arquivos de migration (Drizzle Kit) |
| `npm run db:migrate` | Executa as migrations pendentes |
| `npm run db:push` | Aplica o schema diretamente (sem migration) |
| `npm run db:studio` | Abre o Drizzle Studio (GUI do banco) |

---

## Estrutura do projeto

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          — Tela de login
│   │   └── register/page.tsx       — Tela de cadastro
│   ├── (dashboard)/
│   │   ├── layout.tsx              — Guard de autenticação + Sidebar
│   │   ├── page.tsx                — Dashboard principal
│   │   ├── trabalhos/
│   │   │   ├── ensaios/page.tsx    — Kanban de ensaios
│   │   │   ├── eventos/page.tsx    — Kanban de eventos
│   │   │   └── diarias/page.tsx    — Lista de diárias
│   │   ├── clientes/page.tsx       — CRM de clientes
│   │   ├── contratos/
│   │   │   ├── page.tsx            — Lista de contratos
│   │   │   └── gerar/page.tsx      — Gerador de contrato (iframe)
│   │   ├── financeiro/page.tsx     — Visão financeira
│   │   ├── sd-cards/page.tsx       — Controle de cartões SD
│   │   ├── workflow/page.tsx       — Kanban de edição/pós-produção
│   │   └── equipe/page.tsx         — Gestão de equipe
│   └── api/
│       └── onboarding/route.ts     — API Route para onboarding
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx             — Navegação lateral
│   │   └── header.tsx              — Cabeçalho de cada página
│   ├── charts/
│   │   ├── dashboard-chart.tsx     — Gráfico do dashboard
│   │   └── finance-chart.tsx       — Gráfico financeiro
│   └── ui/
│       └── slide-over.tsx          — Painel lateral deslizante
├── lib/
│   ├── db/
│   │   ├── index.ts                — Instância do Drizzle
│   │   └── schema/                 — Definição das tabelas e enums
│   ├── supabase/
│   │   ├── client.ts               — Cliente browser ('use client')
│   │   └── server.ts               — Cliente servidor (Server Actions)
│   ├── actions/
│   │   ├── clients.ts              — Server Actions de clientes
│   │   └── works.ts                — Server Actions de trabalhos
│   └── utils/
│       ├── cn.ts                   — Helper classNames (clsx + tailwind-merge)
│       └── format.ts               — Formatadores de moeda e data
├── hooks/
│   └── use-org.ts                  — Hook para dados da organização atual
├── stores/
│   └── ui.ts                       — Store global de UI (Zustand)
└── middleware.ts                   — Proteção de rotas via Supabase SSR

public/
├── gerador-contrato.html           — Gerador de contrato standalone (jsPDF)
└── gerador-contrato-v2.html        — Segunda versão do gerador
```

---

## Banco de dados

O schema segue uma arquitetura multi-tenant preparada para crescimento:

```
organizations           — estúdio/empresa
    ├── profiles        — usuários vinculados à org
    ├── clients         — clientes da org
    └── works           — trabalhos (ensaio / evento / diária)
           ├── payments     — parcelas e pagamentos por trabalho
           └── sd_sessions  — ciclo de vida dos cartões SD por trabalho

sd_cards                — cadastro físico dos cartões SD (hardware)
```

**Tipos de trabalho (`works.type`):** `ensaio` | `evento` | `diaria`

**Ciclo de status de um trabalho:** `orcamento` → `confirmado` → `em_andamento` → `finalizado` → `entregue` | `cancelado`

**Ciclo de um cartão SD (`sd_sessions.status`):** `pendente` → `em_descarga` → `backup_realizado` → `seguro_formatar` → `formatado`

---

## Autenticação

A proteção de rotas funciona em duas camadas:

1. **Middleware** (`src/middleware.ts`) — Edge Runtime, redireciona usuários não autenticados para `/login` e autenticados para fora das telas de auth.
2. **Layout do dashboard** (`src/app/(dashboard)/layout.tsx`) — Server Component que verifica a sessão antes de renderizar qualquer página filha.

---

## Estado atual

| Módulo | Status | Observação |
|--------|--------|-----------|
| Login / Register | ✅ Real | Supabase Auth |
| Proteção de rotas | ✅ Real | Middleware + layout guard |
| Gerador de contrato PDF | ✅ Funcional | HTML standalone com jsPDF |
| Dashboard | 🟡 Mock | Dados estáticos, gráfico funcional |
| Ensaios | 🟡 Mock | Kanban com D&D, sem persistência |
| Eventos | 🟡 Mock | Kanban com D&D, sem persistência |
| Diárias | 🟡 Mock | Lista funcional, sem persistência |
| Clientes | 🟡 Mock | Busca/CRUD funcional, sem persistência |
| Contratos | 🟡 Mock | Lista estática |
| Financeiro | 🟡 Mock | Gráfico funcional, dados estáticos |
| Cartões SD | 🟡 Mock | Animação de progresso funcional |
| Workflow | 🟡 Mock | Kanban com D&D, sem persistência |
| Equipe | 🟡 Mock | Lista estática |

---

## Próximos passos

- [ ] Executar schema no Supabase e validar RLS entre organizações
- [ ] Conectar página de **Clientes** às Server Actions (`lib/actions/clients.ts` já preparado)
- [ ] Conectar **Ensaios / Eventos / Diárias** ao banco filtrando por `type` e `orgId`
- [ ] Derivar **Financeiro** da tabela `payments` com joins em `works` e `clients`
- [ ] Conectar **Cartões SD** à tabela `sd_sessions` (status "seguro formatar" = `work.deliveredAt` preenchido)
- [ ] Implementar sistema de **notificações reais** (SDs não descarregados, pagamentos atrasados)
- [ ] Finalizar fluxo de **onboarding multi-tenant** (`/api/onboarding` + `use-org.ts`)

---

> Para documentação técnica detalhada de cada página, componente e padrão de código, consulte [`PROJETO.md`](./PROJETO.md).
