-- ============================================================================
-- FotoOS v4 — Schema SQL completo
-- Execute no Supabase SQL Editor
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── LIMPAR SCHEMA ANTIGO ────────────────────────────────────────────────────
DROP TABLE IF EXISTS sd_sessions          CASCADE;
DROP TABLE IF EXISTS sd_card_usages       CASCADE;
DROP TABLE IF EXISTS storage_locations    CASCADE;
DROP TABLE IF EXISTS sd_cards             CASCADE;
DROP TABLE IF EXISTS job_history          CASCADE;
DROP TABLE IF EXISTS job_tasks            CASCADE;
DROP TABLE IF EXISTS job_contracts        CASCADE;
DROP TABLE IF EXISTS payments             CASCADE;
DROP TABLE IF EXISTS jobs                 CASCADE;
DROP TABLE IF EXISTS works                CASCADE;
DROP TABLE IF EXISTS clients              CASCADE;
DROP TABLE IF EXISTS profiles             CASCADE;
DROP TABLE IF EXISTS organizations        CASCADE;

DROP TYPE IF EXISTS job_type           CASCADE;
DROP TYPE IF EXISTS job_status         CASCADE;
DROP TYPE IF EXISTS work_type          CASCADE;
DROP TYPE IF EXISTS work_status        CASCADE;
DROP TYPE IF EXISTS contract_status    CASCADE;
DROP TYPE IF EXISTS payment_method     CASCADE;
DROP TYPE IF EXISTS payment_status     CASCADE;
DROP TYPE IF EXISTS payment_type       CASCADE;
DROP TYPE IF EXISTS sd_usage_status    CASCADE;
DROP TYPE IF EXISTS storage_type       CASCADE;
DROP TYPE IF EXISTS task_priority      CASCADE;
DROP TYPE IF EXISTS client_source      CASCADE;
DROP TYPE IF EXISTS notification_type  CASCADE;

-- ─── ENUMS ───────────────────────────────────────────────────────────────────
CREATE TYPE job_type AS ENUM ('ensaio', 'evento', 'diaria');

CREATE TYPE job_status AS ENUM (
  'lead', 'orcamento', 'contrato_pendente', 'aguardando_sinal',
  'confirmado', 'aguardando_evento', 'evento_realizado',
  'sd_pendente', 'backup_realizado', 'previa_pendente', 'previa_enviada',
  'em_edicao', 'edicao_final', 'entregue', 'finalizado', 'cancelado'
);

CREATE TYPE contract_status   AS ENUM ('rascunho', 'enviado', 'assinado', 'cancelado');
CREATE TYPE payment_method    AS ENUM ('pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'transferencia');
CREATE TYPE payment_status    AS ENUM ('pendente', 'pago', 'atrasado', 'estornado');
CREATE TYPE payment_type      AS ENUM ('sinal', 'parcela', 'saldo', 'avulso');
CREATE TYPE sd_usage_status   AS ENUM ('pendente', 'em_descarga', 'backup_realizado', 'seguro_formatar', 'formatado');
CREATE TYPE storage_type      AS ENUM ('hd_externo', 'ssd_externo', 'nas', 'nuvem', 'outro');
CREATE TYPE task_priority     AS ENUM ('urgente', 'alta', 'normal', 'baixa');
CREATE TYPE client_source     AS ENUM ('indicacao', 'instagram', 'google', 'facebook', 'site', 'outro');
CREATE TYPE notification_type AS ENUM ('contrato_pendente','pagamento_vencendo','pagamento_atrasado','entrega_proxima','sd_aguardando_descarga','backup_realizado','meta_atingida','novo_job','lembrete_task');

-- ─── ORGANIZATIONS ───────────────────────────────────────────────────────────
CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  owner_email     TEXT NOT NULL,
  plan            TEXT NOT NULL DEFAULT 'trial',
  plan_expires_at TIMESTAMPTZ,
  settings        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PROFILES ────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  avatar_url TEXT,
  phone      TEXT,
  role       TEXT NOT NULL DEFAULT 'owner',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CLIENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE clients (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  cpf        TEXT,
  birth_date DATE,
  address    JSONB,
  source     client_source DEFAULT 'outro',
  notes      TEXT,
  tags       TEXT[] DEFAULT '{}',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── JOBS — ENTIDADE CENTRAL ─────────────────────────────────────────────────
CREATE TABLE jobs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Identificação
  title               TEXT NOT NULL,
  type                job_type NOT NULL,
  status              job_status NOT NULL DEFAULT 'lead',

  -- Vínculos
  client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
  contracted_studio   TEXT,  -- apenas para diárias

  -- Agenda
  scheduled_at        TIMESTAMPTZ,
  ends_at             TIMESTAMPTZ,
  confirmed_at        TIMESTAMPTZ,
  event_executed_at   TIMESTAMPTZ,

  -- Localização
  location            JSONB,

  -- Financeiro (cache calculado dos payments)
  total_value         NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_value          NUMERIC(10,2) NOT NULL DEFAULT 0,
  pending_value       NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Equipe
  editor_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  photographer_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Links operacionais
  drive_link          TEXT,
  preview_link        TEXT,
  contract_pdf_url    TEXT,
  whatsapp_link       TEXT,

  -- SD
  sd_count            INTEGER NOT NULL DEFAULT 0,

  -- Timestamps operacionais
  preview_sent_at     TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  finalized_at        TIMESTAMPTZ,
  canceled_at         TIMESTAMPTZ,
  cancel_reason       TEXT,

  -- Meta
  tags                TEXT[] DEFAULT '{}',
  notes               TEXT,
  metadata            JSONB DEFAULT '{}',

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_org_id   ON jobs(org_id);
CREATE INDEX idx_jobs_status   ON jobs(status);
CREATE INDEX idx_jobs_type     ON jobs(type);
CREATE INDEX idx_jobs_scheduled ON jobs(scheduled_at);

-- ─── JOB CONTRACTS ───────────────────────────────────────────────────────────
CREATE TABLE job_contracts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id         UUID NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  status         contract_status NOT NULL DEFAULT 'rascunho',
  form_data      JSONB,
  html_content   TEXT,
  pdf_url        TEXT,
  signed_pdf_url TEXT,
  sent_at        TIMESTAMPTZ,
  signed_at      TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
  type                payment_type NOT NULL DEFAULT 'parcela',
  method              payment_method NOT NULL DEFAULT 'pix',
  status              payment_status NOT NULL DEFAULT 'pendente',
  amount              NUMERIC(10,2) NOT NULL,
  due_date            DATE NOT NULL,
  paid_at             TIMESTAMPTZ,
  installment_number  INTEGER,
  total_installments  INTEGER,
  notes               TEXT,
  receipt_url         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_job_id ON payments(job_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);

-- ─── SD CARDS ────────────────────────────────────────────────────────────────
CREATE TABLE sd_cards (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  brand       TEXT,
  capacity_gb NUMERIC(6,1),
  camera      TEXT,
  notes       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── STORAGE LOCATIONS ───────────────────────────────────────────────────────
CREATE TABLE storage_locations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        storage_type NOT NULL DEFAULT 'hd_externo',
  capacity_gb NUMERIC(8,1),
  notes       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SD CARD USAGES ──────────────────────────────────────────────────────────
CREATE TABLE sd_card_usages (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id               UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  sd_card_id           UUID NOT NULL REFERENCES sd_cards(id) ON DELETE RESTRICT,
  status               sd_usage_status NOT NULL DEFAULT 'pendente',
  backup_primary_id    UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
  backup_primary_at    TIMESTAMPTZ,
  backup_secondary_id  UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
  backup_secondary_at  TIMESTAMPTZ,
  photos_count         INTEGER,
  raw_size_gb          NUMERIC(8,2),
  safe_to_format       BOOLEAN NOT NULL DEFAULT false,
  safe_to_format_at    TIMESTAMPTZ,
  formatted_at         TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── JOB TASKS ───────────────────────────────────────────────────────────────
CREATE TABLE job_tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  completed       BOOLEAN NOT NULL DEFAULT false,
  completed_at    TIMESTAMPTZ,
  due_date        TIMESTAMPTZ,
  priority        task_priority NOT NULL DEFAULT 'normal',
  auto_generated  BOOLEAN NOT NULL DEFAULT false,
  trigger_status  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_tasks_job_id    ON job_tasks(job_id);
CREATE INDEX idx_job_tasks_completed ON job_tasks(completed);

-- ─── JOB HISTORY ─────────────────────────────────────────────────────────────
CREATE TABLE job_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  from_status TEXT,
  to_status   TEXT,
  description TEXT,
  metadata    JSONB,
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_history_job_id ON job_history(job_id);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
ALTER TABLE organizations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_contracts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sd_cards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sd_card_usages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_history       ENABLE ROW LEVEL SECURITY;

-- Helper function: org do usuário autenticado
CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Políticas (org isolation)
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients','jobs','job_contracts','payments',
    'sd_cards','storage_locations','sd_card_usages','job_tasks','job_history'
  ] LOOP
    EXECUTE format('
      CREATE POLICY "%s_org_isolation" ON %s
      USING (org_id = auth_org_id())
      WITH CHECK (org_id = auth_org_id());
    ', t, t);
  END LOOP;
END $$;

-- Profiles: usuário vê/edita apenas o próprio perfil
CREATE POLICY "profiles_own" ON profiles
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Organizations: owner vê a própria org
CREATE POLICY "orgs_own" ON organizations
  USING (id = auth_org_id());

-- ─── TRIGGERS: updated_at automático ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations','profiles','clients','jobs',
    'job_contracts','payments','sd_cards','storage_locations','sd_card_usages'
  ] LOOP
    EXECUTE format('
      CREATE TRIGGER trg_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t);
  END LOOP;
END $$;

-- ─── SEED PARA DESENVOLVIMENTO ────────────────────────────────────────────────
-- Descomente e substitua <UID_DO_SEU_USUARIO_SUPABASE> após criar sua conta
/*
INSERT INTO organizations (id, name, slug, owner_email, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Matheus Lima Fotografias', 'matheus-lima', 'mattheus.macchado@gmail.com', 'trial');

INSERT INTO profiles (id, org_id, full_name, role)
VALUES ('<UID_DO_SEU_USUARIO_SUPABASE>', '00000000-0000-0000-0000-000000000001', 'Matheus Lima', 'owner');

INSERT INTO sd_cards (org_id, label, brand, camera) VALUES
('00000000-0000-0000-0000-000000000001', 'SD-001', 'Sony',    'Sony A7 IV'),
('00000000-0000-0000-0000-000000000001', 'SD-002', 'Sony',    'Sony A7 IV'),
('00000000-0000-0000-0000-000000000001', 'CF-001', 'SanDisk', 'Canon EOS R5');

INSERT INTO storage_locations (org_id, name, type, capacity_gb) VALUES
('00000000-0000-0000-0000-000000000001', 'SSD Samsung 2TB',  'ssd_externo', 2000),
('00000000-0000-0000-0000-000000000001', 'HD WD Backup',      'hd_externo',  4000),
('00000000-0000-0000-0000-000000000001', 'HD Arquivo',        'hd_externo',  6000);
*/

-- ─── FIM ─────────────────────────────────────────────────────────────────────
