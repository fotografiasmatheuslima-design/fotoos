# FotoOS — Documentação do Projeto

**ERP/SaaS para fotógrafos profissionais**  
Stack: Next.js 15 (App Router) · Supabase (Auth + Postgres) · Drizzle ORM · Tailwind CSS · Recharts

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Pastas](#estrutura-de-pastas)
3. [Autenticação e Proteção de Rotas](#autenticação-e-proteção-de-rotas)
4. [Banco de Dados — Schema](#banco-de-dados--schema)
5. [Componentes Globais](#componentes-globais)
6. [Páginas — Lógica Detalhada](#páginas--lógica-detalhada)
   - [Login / Register](#login--register)
   - [Dashboard](#dashboard)
   - [Ensaios](#ensaios)
   - [Eventos](#eventos)
   - [Diárias](#diárias)
   - [Clientes](#clientes)
   - [Contratos](#contratos)
   - [Financeiro](#financeiro)
   - [Cartões SD](#cartões-sd)
   - [Workflow](#workflow)
   - [Equipe](#equipe)
7. [Padrões de Código Recorrentes](#padrões-de-código-recorrentes)
8. [Estado Atual — Mock vs. Banco Real](#estado-atual--mock-vs-banco-real)
9. [Próximos Passos](#próximos-passos)

---

## Visão Geral

O FotoOS centraliza toda a operação de um fotógrafo autônomo ou pequeno estúdio:

- **Trabalhos** — Ensaios (sessões fotográficas), Eventos (casamentos, formaturas) e Diárias (quando o fotógrafo é contratado por outro estúdio)
- **Operacional** — CRM de clientes, motor de contratos em PDF, controle financeiro
- **Produção** — Rastreamento de cartões SD do disparo até a formatação segura, fila de workflow de edição
- **Gestão** — Equipe freelancer com comissões

O sistema foi construído em duas fases:
1. **Fase Mock** (atual) — todas as páginas funcionam com dados estáticos em `useState`, sem precisar do banco configurado
2. **Fase Real** (próxima) — conectar cada página às Server Actions e ao Supabase/Drizzle

---

## Estrutura de Pastas

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
│   │   ├── clientes/
│   │   │   ├── page.tsx            — CRM de clientes
│   │   │   └── actions.ts          — Server Actions (futuro)
│   │   ├── contratos/
│   │   │   ├── page.tsx            — Lista de contratos
│   │   │   └── gerar/page.tsx      — Gerador de contrato em PDF (iframe)
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
│       └── slide-over.tsx          — Painel lateral deslizante (formulários/detalhes)
├── lib/
│   ├── db/
│   │   ├── index.ts                — Instância do Drizzle
│   │   └── schema/                 — Definição das tabelas
│   ├── supabase/
│   │   ├── client.ts               — Cliente browser (componentes 'use client')
│   │   └── server.ts               — Cliente servidor (Server Components/Actions)
│   ├── actions/
│   │   ├── clients.ts              — Actions de clientes
│   │   └── works.ts                — Actions de trabalhos
│   └── utils/
│       ├── cn.ts                   — Helper classNames
│       └── format.ts               — Formatadores (moeda, data)
├── hooks/
│   └── use-org.ts                  — Hook para org atual
├── stores/
│   └── ui.ts                       — Store global de UI (Zustand)
└── middleware.ts                   — Proteção de rotas via Supabase SSR

public/
└── gerador-contrato.html           — Gerador de contrato standalone (jsPDF)
```

---

## Autenticação e Proteção de Rotas

A autenticação é tratada em **duas camadas complementares**:

### 1. Middleware (`src/middleware.ts`)

Executa em toda requisição (Edge Runtime). Atualiza o cookie de sessão do Supabase e redireciona:

- Usuário **não autenticado** tentando acessar qualquer rota → redireciona para `/login`
- Usuário **autenticado** tentando acessar `/login` ou `/register` → redireciona para `/`

```
matcher: exclui arquivos estáticos (_next, imagens, favicon)
```

### 2. Layout do Dashboard (`src/app/(dashboard)/layout.tsx`)

Server Component que verifica a sessão antes de renderizar qualquer página do dashboard. Se o usuário não estiver logado, chama `redirect('/login')`. Isso garante proteção mesmo se o middleware falhar.

**Por que duas camadas?** O middleware é mais rápido (Edge), mas o layout é mais seguro (roda no servidor Node antes de qualquer rendering).

**Consequência importante:** nenhuma página filha do dashboard precisa verificar autenticação individualmente. Todas podem ser componentes simples (server ou client) focados apenas na sua lógica de negócio.

---

## Banco de Dados — Schema

Todos os schemas ficam em `src/lib/db/schema/`. São definidos com **Drizzle ORM** e tipados automaticamente.

### Tabelas e Relacionamentos

```
organizations           — estúdio/empresa (multi-tenant no futuro)
    └── profiles        — usuários vinculados à org (auth.users → profiles)
    └── clients         — clientes da org
    └── works           — trabalhos (ensaio / evento / diária)
           └── payments — parcelas e pagamentos por work
           └── sd_sessions — sessões de cartão SD vinculadas ao work
    └── sd_cards        — cartões SD cadastrados (hardware)
```

### Descrição das Tabelas

**`organizations`**
Representa o estúdio. Campos: `name`, `slug` (único), `ownerEmail`, `plan` (trial/pro), `settings` (JSONB para configurações futuras).

**`profiles`**
Espelho de `auth.users` do Supabase. O `id` é o mesmo UUID do usuário na tabela de auth. Contém `role` (owner / admin / editor / viewer) e `orgId` para multi-tenant.

**`clients`**
CRM de clientes do estúdio. Armazena dados pessoais, `source` (indicação, instagram, google...), `address` como JSONB e `tags` como array de texto.

**`works`**
Tabela central do sistema. Representa qualquer trabalho fotográfico:
- `type`: `ensaio` | `evento` | `diaria`
- `status`: `orcamento` → `confirmado` → `em_andamento` → `finalizado` → `entregue` | `cancelado`
- `contractedStudio`: preenchido apenas para diárias (estúdio que contratou o fotógrafo)
- `location`: JSONB com `{ name, address, city, lat, lng }`
- `metadata`: JSONB livre para dados extras por tipo

**`payments`**
Controle financeiro por work. Um work pode ter múltiplos payments (sinal + parcelas + saldo).
- `type`: `sinal` | `parcela` | `saldo` | `avulso`
- `method`: `pix` | `cartao_credito` | `cartao_debito`
- `status`: `pendente` | `pago` | `estornado`
- `installmentNumber` / `totalInstallments`: para parcelamento

**`sd_cards`**
Cadastro físico dos cartões SD (hardware). Um cartão pode ser reutilizado em múltiplos trabalhos.

**`sd_sessions`**
Vincula um cartão SD a um work específico. Controla o ciclo de vida completo:
- `status`: `pendente` → `em_descarga` → `backup_realizado` → `seguro_formatar`
- Campos de timestamp para cada transição (`dischargeStartedAt`, `backupPrimaryAt`, `safeToFormatAt`)
- `backupPrimary` / `backupSecondary`: confirmação de dois backups antes de liberar formatação

### Enums (`schema/enums.ts`)

Todos os enums do Postgres são definidos aqui:
`workTypeEnum`, `workStatusEnum`, `sdStatusEnum`, `contractStatusEnum`, `paymentMethodEnum`, `paymentStatusEnum`, `paymentTypeEnum`, `clientSourceEnum`, `freelancerRoleEnum`, `notificationTypeEnum`, `workflowStepStatusEnum`

---

## Componentes Globais

### `Sidebar` (`components/layout/sidebar.tsx`)

Navegação lateral fixa. Estrutura definida no array `NAV` que mistura itens de navegação e separadores de seção (`sep`). A lógica de destaque (`isActive`) usa `usePathname()` e compara com `item.href`. Sub-itens (Ensaios, Eventos, Diárias) têm recuo visual e borda esquerda roxa quando ativos. O botão de logout chama `supabase.auth.signOut()` e redireciona para `/login`.

**Seções do menu:**
- **TRABALHOS** — Ensaios · Eventos · Diárias
- **OPERACIONAL** — Clientes · Contratos · Financeiro
- **PRODUÇÃO** — Cartões SD · Workflow
- **GESTÃO** — Equipe

### `Header` (`components/layout/header.tsx`)

Barra de topo de cada página. Recebe `title` (string) e `chip` opcional `{ label, color }` — usado nas páginas de Diárias ("Você é contratado por outro estúdio") e Ensaios. Exibe sino de notificações com badge vermelho fixo (contador 6 no mock).

### `SlideOver` (`components/ui/slide-over.tsx`)

Painel lateral deslizante reutilizado em todas as páginas para formulários de criação e detalhamento de registros. Aceita:
- `open` / `onClose` — controle de visibilidade
- `title` / `subtitle` — cabeçalho
- `children` — conteúdo livre
- `footer` — rodapé com botões de ação
- `width` — largura (default 440px)

Quando aberto, trava o scroll do body (`document.body.style.overflow = 'hidden'`). Fecha ao clicar no backdrop semitransparente. Usa animação CSS `slideIn` (translateX 100% → 0).

**Helpers exportados:** `FormField`, `BtnPrimary`, `BtnSecondary`, `inputStyle`, `selectStyle` — garantem consistência visual em todos os formulários.

### `DashboardChart` / `FinanceChart` (`components/charts/`)

Componentes `'use client'` com Recharts `BarChart` empilhado. Dados mock hardcoded. Cores: Eventos (#7c3aed) · Ensaios (#2563eb) · Diárias (#0d9488). O `FinanceChart` adiciona uma barra "Previsto" para o mês futuro (Jun) em cinza tracejado.

---

## Páginas — Lógica Detalhada

### Login / Register

**Rota:** `/login` · `/register`  
**Tipo:** Client Component  

Formulário controlado com `useState` para email, senha, erro e loading. Chama `supabase.auth.signInWithPassword()` (login) ou `supabase.auth.signUp()` (register). Em caso de sucesso, `router.push('/')` + `router.refresh()` para forçar o middleware a re-validar a sessão e mostrar o dashboard.

---

### Dashboard

**Rota:** `/`  
**Tipo:** Server Component (sem `'use client'`)  
**Arquivo:** `app/(dashboard)/page.tsx`

Página de visão geral do negócio. Não faz queries ao banco — dados mock em constantes no topo do arquivo. Composta por quatro blocos:

**1. KPIs (4 cards)**
Receita total, Jobs ativos, A receber, Diárias no mês. Cada card tem label, valor principal e subtexto colorido (verde para positivo, vermelho para alertas).

**2. Gráfico de faturamento**
Componente `DashboardChart` com histórico de 6 meses empilhado por tipo de trabalho.

**3. Agenda do dia**
Lista de compromissos com horário, título, local e tipo. Itens futuros têm barra lateral roxa; passados ficam em cinza.

**4. Coluna direita**
- **Alertas** — lista de itens críticos com dot colorido (vermelho = urgente, amarelo = atenção). Contador no badge do header.
- **Receita por tipo** — barras de progresso mostrando % de cada categoria (Eventos/Ensaios/Diárias) sobre o total do mês.

---

### Ensaios

**Rota:** `/trabalhos/ensaios`  
**Tipo:** Client Component  
**Arquivo:** `app/(dashboard)/trabalhos/ensaios/page.tsx`

Kanban de 4 colunas: **Agendado → Confirmado → Em Edição → Entregue**

**Estado:**
```ts
cols: Col[]          // array de colunas com seus jobs
dragOver: string     // qual coluna está recebendo drag (highlight visual)
selected: Job        // job aberto no SlideOver de detalhe
showNew: boolean     // controla abertura do SlideOver de novo ensaio
newForm: object      // campos do formulário de criação
```

**Drag and Drop (HTML5 nativo):**
O estado do drag é guardado em `useRef` (não `useState`) para evitar closure stale — o `dragRef.current` sempre tem o valor mais recente sem precisar de re-renders.

- `onDragStart` — grava `{ id, from }` no ref
- `onDragOver` — previne default (habilita drop) e atualiza `dragOver` para highlight visual
- `onDrop(to)` — encontra o job, remove da coluna de origem, adiciona na coluna de destino
- `onDragEnd` / `onDragLeave` — limpa o highlight

**Funções:**
- `saveNew()` — valida campos obrigatórios (nome + data), cria objeto Job, insere no primeiro estágio "Agendado"
- `updateStage(jobId, newStage)` — move job para novo estágio via botões no SlideOver de detalhe
- `deleteJob(jobId)` — remove job de qualquer coluna

**SlideOver de detalhe:** exibe todos os campos do job + botões para mover entre estágios + botão excluir.  
**SlideOver de criação:** campos nome, tipo (dropdown com 8 opções), data, valor, telefone, observações.

---

### Eventos

**Rota:** `/trabalhos/eventos`  
**Tipo:** Client Component  
**Arquivo:** `app/(dashboard)/trabalhos/eventos/page.tsx`

Estrutura idêntica ao Ensaios com diferenças:

**Colunas:** Agendado → Confirmado → Realizado / Edição → Entregue

**Dados adicionais por card:**
- `sds` — quantidade de cartões SD vinculados ao evento (ex: "2 SDs OK")
- `eq` — equipe escalada (ex: "ML+CA+MR" — iniciais dos membros)

Esses campos aparecem como tags no card, mas no mock são strings simples. Na versão com banco, serão relacionamentos com `sd_sessions` e membros da equipe.

**Formulário de criação** tem campo extra para `eq` (equipe). Tipos disponíveis: Casamento, Debutante, 15 Anos, Formatura, Corporativo, Festa, Batizado, Aniversário.

---

### Diárias

**Rota:** `/trabalhos/diarias`  
**Tipo:** Client Component  
**Arquivo:** `app/(dashboard)/trabalhos/diarias/page.tsx`

**Conceito importante:** Diárias são o inverso dos outros trabalhos — o fotógrafo é **contratado** por outro estúdio. Não há contrato próprio, não há cartão SD, não há workflow. É uma fonte de renda avulsa.

Apresentação em **lista** (não kanban), com banner explicativo no topo.

**KPIs dinâmicos** calculados em tempo real a partir do estado:
```ts
totalRecebido = diarias.filter(d => d.s === 'Pago').reduce(...)
totalPendente = diarias.filter(d => d.s === 'Pag. pendente').reduce(...)
```

**Funções:**
- `saveNew()` — cria nova diária, inicia com status "Agendado"
- `updateStatus(id, s)` — altera status via botões no SlideOver de detalhe. Atualiza tanto o array principal quanto o `selected` do SlideOver para refletir a mudança em tempo real sem fechar o painel.

**Status disponíveis:** Agendado · Pag. pendente · Pago · Cancelado

**SlideOver de detalhe:** grid 2×N com todos os campos + seção de atualização de status com botões toggle (ativo = verde teal, inativo = cinza).

---

### Clientes

**Rota:** `/clientes`  
**Tipo:** Client Component  
**Arquivo:** `app/(dashboard)/clientes/page.tsx`

CRM completo com busca em tempo real.

**Busca:**
```ts
filtered = clientes.filter(c =>
  c.n.toLowerCase().includes(search.toLowerCase()) ||
  c.email.toLowerCase().includes(search.toLowerCase()) ||
  c.phone.includes(search)
)
```
A lista renderiza `filtered` (não `clientes` diretamente), então qualquer digitação no campo de busca filtra instantaneamente.

**KPIs dinâmicos:** Total clientes, Leads ativos, Confirmados, Entregues — todos calculados com `.filter().length` sobre o estado atual.

**Avatar gerado automaticamente:** as iniciais são extraídas do nome no momento da criação:
```ts
const initials = newForm.n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
```
A cor de fundo é ciclada em um array de 5 combinações para variedade visual.

**SlideOver de detalhe:** mostra grid com Email, Telefone, Status, Último job, Total jobs, Total faturado. Botão "Novo job" no footer (a ser implementado).

**SlideOver de criação:** campos Nome, Email, Telefone, Como nos encontrou (dropdown: Instagram/Indicação/Google/Facebook/Site/Outro), Observações.

---

### Contratos

**Rota:** `/contratos`  
**Tipo:** Client Component  
**Arquivo:** `app/(dashboard)/contratos/page.tsx`

Lista de contratos com fluxo visual de 5 etapas no topo. Dados mock com status Pendente/Assinado.

**Botão "+ Gerar ↗"** navega para `/contratos/gerar`.

#### Gerador de Contrato

**Rota:** `/contratos/gerar`  
**Tipo:** Client Component  
**Arquivo:** `app/(dashboard)/contratos/gerar/page.tsx`

Embeds o arquivo `public/gerador-contrato.html` em um `<iframe>` full-height dentro do layout do FotoOS. O HTML é um gerador standalone com:

- Dados do fotógrafo pré-preenchidos: **Matheus Lima Fotografias, CNPJ 60.085.955/0001-10**, Rua Conrado Fanceli n° 545, Jd. Progresso, Paranavaí-PR
- Formulário: nome do contratante, nacionalidade, CPF, endereço, tipo de evento (rádio), data, horários, locais, valor total, % do sinal, data do contrato
- 12 cláusulas jurídicas completas
- Geração de PDF via **jsPDF** (CDN) com download automático: `Contrato_{nome}_{data}.pdf`

---

### Financeiro

**Rota:** `/financeiro`  
**Tipo:** Server Component  
**Arquivo:** `app/(dashboard)/financeiro/page.tsx`

Visão financeira com três seções:

**1. KPIs:** Receita total Maio, A receber, Inadimplência, Ticket médio — com variação percentual vs. mês/ano anterior.

**2. Gráfico `FinanceChart`:** Receita mensal de Jan a Jun/2026 empilhada por tipo. Jun aparece como "Previsto" (projeção).

**3. Contas a receber:** Lista detalhada com nome do cliente, descrição da parcela, data de vencimento e status (Pendente/Atrasado). Itens atrasados têm badge vermelho.

---

### Cartões SD

**Rota:** `/sd-cards`  
**Tipo:** Client Component  
**Arquivo:** `app/(dashboard)/sd-cards/page.tsx`

Controle do ciclo de vida completo de cada cartão SD, desde o disparo até a formatação segura.

**Regra de negócio central:** um cartão só pode ser marcado como "Seguro para formatar" quando o **job estiver finalizado e entregue** (`jobDone: true`). Isso evita formatar um SD antes de confirmar que as fotos foram entregues ao cliente. Um banner vermelho no topo da página reforça essa regra.

**Status do ciclo:**
```
pending → downloading → downloaded → ready → safe → formatted
```

**Animação de progresso:**
O estado de cada descarga é controlado por `useRef<Record<string, ReturnType<typeof setInterval>>>`. Isso permite múltiplos downloads simultâneos independentes. Cada `setInterval` incrementa 2% a cada 80ms até chegar em 100%, quando o status muda automaticamente para `downloaded`.

```ts
// Exemplo simplificado
intervals.current[id] = setInterval(() => {
  setCards(prev => {
    const card = prev.find(c => c.id === id)
    if (!card || card.progress >= 100) {
      clearInterval(intervals.current[id])
      return prev.map(c => c.id === id ? { ...c, status: 'downloaded', progress: 100 } : c)
    }
    return prev.map(c => c.id === id ? { ...c, progress: Math.min(100, c.progress + 2) } : c)
  })
}, 80)
```

O `useEffect` de cleanup garante que todos os intervals sejam limpos quando o componente é desmontado.

**Botões de ação por status:**
| Status | Ação disponível |
|--------|----------------|
| `pending` | ▶ Iniciar descarga |
| `downloading` | ⏸ Pausar |
| `downloaded` | ↻ Re-descarregar · ✓ Marcar seguro (se jobDone) |
| `ready` | ✓ Marcar seguro (se jobDone) |
| `safe` | 🗑 Formatar SD (com `confirm()`) |
| `formatted` | — (exibe "Formatado ✓") |

**KPIs dinâmicos:** Total cartões, Pendentes, Seguros/Formatados, Formatados — calculados em tempo real.

---

### Workflow

**Rota:** `/workflow`  
**Tipo:** Client Component  
**Arquivo:** `app/(dashboard)/workflow/page.tsx`

Kanban de pós-produção com 5 colunas: **Seleção → Edição → Revisão → Exportação → Entrega**

Representa a fila de edição interna do estúdio — diferente dos kanbans de Ensaios/Eventos (que rastreiam o relacionamento com o cliente), o Workflow rastreia a etapa técnica de produção das imagens.

**Dados por card:**
- `n` — nome do job
- `t` — tipo (Ensaio / Evento)
- `r` — responsável (iniciais: JP, ML, FS, CA)
- `p` — prazo
- `over` — prazo vencido (borda vermelha no card)
- `prio` — prioridade: Urgente / Alta / Normal (com cores diferentes)

**Prioridades:**
```ts
Urgente: bg '#fee2e2', tc '#991b1b'   // vermelho
Alta:    bg '#fef3c7', tc '#92400e'   // amarelo
Normal:  bg '#f3f4f6', tc '#6b7280'   // cinza
```

Drag and drop idêntico ao padrão dos outros kanbans. Coluna vazia exibe ícone ✅ "Fila vazia".

---

### Equipe

**Rota:** `/equipe`  
**Tipo:** Server Component  
**Arquivo:** `app/(dashboard)/equipe/page.tsx`

Gestão de freelancers e colaboradores que **trabalham para o fotógrafo**.

Dois cards explicativos no topo deixam clara a distinção:
- **Equipe** = pessoas que você contrata → ficam aqui
- **Diárias** = você trabalhando para outros → fica em Trabalhos → Diárias

**Dados por membro:** nome, função, tipo (Freelancer), jobs no mês, comissão do mês, especialidades.

Página atualmente estática (sem SlideOver de criação implementado).

---

## Padrões de Código Recorrentes

### Kanban com Drag and Drop

Usado em: Ensaios, Eventos, Workflow.

```ts
// Estado das colunas
const [cols, setCols] = useState<Col[]>(INIT)

// Ref para estado do drag (evita closure stale)
const dragRef = useRef<{ id: string; from: string } | null>(null)

// Drop: remove de origem, adiciona no destino
function onDrop(to: string) {
  const drag = dragRef.current
  if (!drag || drag.from === to) { cleanup(); return }
  const job = allJobs().find(j => j.id === drag.id)
  if (job) {
    setCols(prev => prev.map(col => {
      if (col.stage === drag.from) return { ...col, jobs: col.jobs.filter(j => j.id !== drag.id) }
      if (col.stage === to)        return { ...col, jobs: [...col.jobs, job] }
      return col
    }))
  }
  cleanup()
}
```

### Slide-Over com Formulário

Usado em: Ensaios, Eventos, Diárias, Clientes.

```tsx
const [showNew, setShowNew] = useState(false)
const [newForm, setNewForm] = useState({ campo1: '', campo2: '' })

function saveNew() {
  if (!newForm.campo1) return  // validação mínima
  const novo = { id: Date.now().toString(), ...newForm }
  setDados(prev => [...prev, novo])
  setShowNew(false)
  setNewForm({ campo1: '', campo2: '' })  // reset
}

<SlideOver open={showNew} onClose={() => setShowNew(false)} title="Novo Item"
  footer={<><BtnSecondary onClick={() => setShowNew(false)}>Cancelar</BtnSecondary>
            <BtnPrimary onClick={saveNew}>Salvar</BtnPrimary></>}>
  <FormField label="Campo 1" required>
    <input style={inputStyle} value={newForm.campo1}
      onChange={e => setNewForm(p => ({ ...p, campo1: e.target.value }))} />
  </FormField>
</SlideOver>
```

### KPIs Dinâmicos

Calculados diretamente no JSX a partir do estado atual — não são cacheados em variáveis de estado separadas:

```tsx
const total = dados.filter(d => d.status === 'ativo').length
const receita = dados.reduce((s, d) => s + parseFloat(d.valor.replace('R$', '')), 0)
```

---

## Estado Atual — Mock vs. Banco Real

| Página | Estado | Observação |
|--------|--------|-----------|
| Login/Register | ✅ Real | Usa Supabase Auth |
| Auth Guard (layout) | ✅ Real | Verifica sessão no servidor |
| Dashboard | 🟡 Mock | Dados estáticos |
| Ensaios | 🟡 Mock | Kanban funcional, sem persistência |
| Eventos | 🟡 Mock | Kanban funcional, sem persistência |
| Diárias | 🟡 Mock | Lista funcional, sem persistência |
| Clientes | 🟡 Mock | Busca/CRUD funcional, sem persistência |
| Contratos | 🟡 Mock | Lista estática |
| Gerador PDF | ✅ Funcional | HTML standalone com jsPDF |
| Financeiro | 🟡 Mock | Gráfico funcional, dados estáticos |
| Cartões SD | 🟡 Mock | Animação de progresso funcional |
| Workflow | 🟡 Mock | Kanban funcional, sem persistência |
| Equipe | 🟡 Mock | Lista estática |

---

## Próximos Passos

### 1. Rodar o Schema no Supabase

Acessar o **SQL Editor** do Supabase e executar o arquivo de migrations do Drizzle para criar todas as tabelas (`organizations`, `profiles`, `clients`, `works`, `payments`, `sd_cards`, `sd_sessions`).

### 2. Conectar Clientes ao Banco

A página de Clientes já tem `src/lib/actions/clients.ts` preparado. Substituir o `useState(INIT_CLIENTES)` por uma query real com Drizzle e conectar o `saveNew()` à Server Action correspondente.

### 3. Conectar Trabalhos ao Banco

Substituir os estados mock de Ensaios/Eventos/Diárias por queries filtrando `works` pelo `type` e `orgId`. As funções de drag-and-drop passam a chamar Server Actions de update de status.

### 4. Financeiro Real

Derivar KPIs e lista de "contas a receber" da tabela `payments` com joins em `works` e `clients`.

### 5. SD Cards Real

Conectar à tabela `sd_sessions`. O status de "seguro para formatar" passa a ser calculado verificando se o `work` associado tem `deliveredAt` preenchido.

### 6. Notificações

Usar os enums `notificationTypeEnum` já definidos para criar um sistema de alertas reais (SD não descarregado, pagamentos atrasados, contratos pendentes) — atualmente o sino mostra badge fixo "6".

### 7. Multi-tenant

A estrutura de `orgId` em todas as tabelas já suporta múltiplos estúdios. O hook `use-org.ts` e a rota `/api/onboarding` são o ponto de partida para o fluxo de cadastro de novos estúdios.
