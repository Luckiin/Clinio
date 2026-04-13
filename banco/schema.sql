-- ============================================================
-- CLINIO - Schema do Banco de Dados PostgreSQL
-- SaaS para Gestão de Clínicas Médicas e Estéticas
-- ============================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELA: clinicas
-- Armazena os dados de cada clínica cadastrada no SaaS
-- ============================================================
CREATE TABLE IF NOT EXISTS clinicas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome              TEXT NOT NULL,
  cnpj              TEXT UNIQUE,
  telefone          TEXT,
  email             TEXT,
  endereco          TEXT,
  cidade            TEXT,
  estado            TEXT,
  cep               TEXT,
  logo_url          TEXT,
  slug              TEXT UNIQUE NOT NULL,       -- identificador único para agendamento público
  plano             TEXT NOT NULL DEFAULT 'basico' CHECK (plano IN ('basico', 'profissional', 'enterprise')),
  ativo             BOOLEAN NOT NULL DEFAULT true,
  configuracoes     JSONB DEFAULT '{}',         -- configurações gerais da clínica
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: usuarios
-- Usuários com acesso ao sistema (vinculados ao Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinica_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  email             TEXT NOT NULL,
  telefone          TEXT,
  perfil            TEXT NOT NULL DEFAULT 'recepcao' CHECK (perfil IN ('administrador', 'recepcao', 'medico')),
  avatar_url        TEXT,
  ativo             BOOLEAN NOT NULL DEFAULT true,
  ultimo_acesso     TIMESTAMPTZ,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: medicos
-- Profissionais de saúde da clínica
-- ============================================================
CREATE TABLE IF NOT EXISTS medicos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  usuario_id        UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  nome              TEXT NOT NULL,
  especialidade     TEXT,
  crm               TEXT,
  telefone          TEXT,
  email             TEXT,
  cor_agenda        TEXT DEFAULT '#3B82F6',     -- cor para exibição na agenda
  duracao_padrao    INT NOT NULL DEFAULT 30,    -- duração padrão da consulta em minutos
  horarios_trabalho JSONB DEFAULT '{}',         -- horários disponíveis por dia da semana
  ativo             BOOLEAN NOT NULL DEFAULT true,
  foto_url          TEXT,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: salas
-- Salas e consultórios disponíveis na clínica
-- ============================================================
CREATE TABLE IF NOT EXISTS salas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  descricao         TEXT,
  capacidade        INT DEFAULT 1,
  cor               TEXT DEFAULT '#10B981',
  ativa             BOOLEAN NOT NULL DEFAULT true,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: tipos_consulta
-- Tipos de procedimentos e consultas oferecidos
-- ============================================================
CREATE TABLE IF NOT EXISTS tipos_consulta (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  descricao         TEXT,
  duracao_minutos   INT NOT NULL DEFAULT 30,
  valor             NUMERIC(10,2),
  cor               TEXT DEFAULT '#8B5CF6',
  exige_medico      BOOLEAN DEFAULT true,
  ativo             BOOLEAN NOT NULL DEFAULT true,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: pacientes
-- Cadastro completo de pacientes da clínica
-- ============================================================
CREATE TABLE IF NOT EXISTS pacientes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  cpf               TEXT,
  data_nascimento   DATE,
  sexo              TEXT CHECK (sexo IN ('masculino', 'feminino', 'outro', 'nao_informado')),
  telefone          TEXT,
  telefone_whatsapp TEXT,
  email             TEXT,
  endereco          TEXT,
  cidade            TEXT,
  estado            TEXT,
  cep               TEXT,
  convenio          TEXT,
  numero_convenio   TEXT,
  observacoes       TEXT,
  como_conheceu     TEXT,    -- como o paciente conheceu a clínica
  status            TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'bloqueado')),
  ultimo_atendimento TIMESTAMPTZ,
  total_consultas   INT NOT NULL DEFAULT 0,
  foto_url          TEXT,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clinica_id, cpf)
);

-- ============================================================
-- TABELA: tags_pacientes
-- Tags para categorização de pacientes (ex: VIP, Risco de Fuga)
-- ============================================================
CREATE TABLE IF NOT EXISTS tags_pacientes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id       UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tag               TEXT NOT NULL,
  cor               TEXT DEFAULT '#6B7280',
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(paciente_id, tag)
);

-- ============================================================
-- TABELA: consultas
-- Agendamentos e consultas realizadas
-- ============================================================
CREATE TABLE IF NOT EXISTS consultas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id       UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
  medico_id         UUID NOT NULL REFERENCES medicos(id) ON DELETE RESTRICT,
  sala_id           UUID REFERENCES salas(id) ON DELETE SET NULL,
  tipo_consulta_id  UUID REFERENCES tipos_consulta(id) ON DELETE SET NULL,
  data_hora_inicio  TIMESTAMPTZ NOT NULL,
  data_hora_fim     TIMESTAMPTZ NOT NULL,
  status            TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN (
    'agendado', 'confirmado', 'em_atendimento', 'concluido',
    'cancelado', 'faltou', 'remarcado'
  )),
  tipo              TEXT NOT NULL DEFAULT 'presencial' CHECK (tipo IN ('presencial', 'teleconsulta')),
  valor             NUMERIC(10,2),
  observacoes       TEXT,
  anamnese          TEXT,
  diagnostico       TEXT,
  prescricao        TEXT,
  agendado_online   BOOLEAN DEFAULT false,     -- se foi agendado pelo portal público
  lembrete_enviado  BOOLEAN DEFAULT false,
  confirmado_em     TIMESTAMPTZ,
  cancelado_em      TIMESTAMPTZ,
  motivo_cancelamento TEXT,
  criado_por        UUID REFERENCES usuarios(id),
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: historico_consultas
-- Prontuário e histórico clínico do paciente
-- ============================================================
CREATE TABLE IF NOT EXISTS historico_consultas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  consulta_id       UUID NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  paciente_id       UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id         UUID NOT NULL REFERENCES medicos(id),
  anamnese          TEXT,
  diagnostico       TEXT,
  prescricao        TEXT,
  procedimentos     TEXT[],
  arquivos          JSONB DEFAULT '[]',        -- arquivos anexados (exames, fotos)
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: automacoes
-- Regras de automação para comunicação com pacientes
-- ============================================================
CREATE TABLE IF NOT EXISTS automacoes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  descricao         TEXT,
  evento_gatilho    TEXT NOT NULL,             -- consulta_criada, consulta_amanha, etc
  acoes             JSONB NOT NULL DEFAULT '[]', -- array de ações {tipo, canal, template, etc}
  condicoes         JSONB DEFAULT '{}',         -- regras extras para disparo
  delay_horas       INT DEFAULT 0,              -- delay em horas após o evento
  ativa             BOOLEAN NOT NULL DEFAULT true,
  executada_total   INT DEFAULT 0,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: mensagens
-- Registro de mensagens enviadas aos pacientes
-- ============================================================
CREATE TABLE IF NOT EXISTS mensagens (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id       UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  consulta_id       UUID REFERENCES consultas(id) ON DELETE SET NULL,
  automacao_id      UUID REFERENCES automacoes(id) ON DELETE SET NULL,
  campanha_id       UUID,                      -- referência à campanha (FK definida abaixo)
  canal             TEXT NOT NULL DEFAULT 'whatsapp' CHECK (canal IN ('whatsapp', 'email', 'sms')),
  conteudo          TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN (
    'pendente', 'enviada', 'entregue', 'lida', 'respondida', 'falhou'
  )),
  enviada_em        TIMESTAMPTZ,
  entregue_em       TIMESTAMPTZ,
  lida_em           TIMESTAMPTZ,
  erro              TEXT,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: campanhas
-- Campanhas de marketing para grupos de pacientes
-- ============================================================
CREATE TABLE IF NOT EXISTS campanhas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  descricao         TEXT,
  tipo              TEXT NOT NULL DEFAULT 'marketing' CHECK (tipo IN (
    'marketing', 'reativacao', 'promocional', 'informativa', 'aniversario'
  )),
  canal             TEXT NOT NULL DEFAULT 'whatsapp' CHECK (canal IN ('whatsapp', 'email', 'sms')),
  mensagem_template TEXT NOT NULL,
  segmentacao       JSONB DEFAULT '{}',         -- critérios de segmentação dos pacientes
  agendada_para     TIMESTAMPTZ,               -- data/hora de envio agendado
  status            TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN (
    'rascunho', 'agendada', 'enviando', 'concluida', 'cancelada', 'pausada'
  )),
  total_destinatarios INT DEFAULT 0,
  total_enviadas    INT DEFAULT 0,
  total_entregues   INT DEFAULT 0,
  total_lidas       INT DEFAULT 0,
  total_respostas   INT DEFAULT 0,
  criado_por        UUID REFERENCES usuarios(id),
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adicionar FK de campanha_id em mensagens após criar campanhas
/* ALTER TABLE mensagens
  ADD CONSTRAINT fk_mensagens_campanha
  FOREIGN KEY (campanha_id) REFERENCES campanhas(id) ON DELETE SET NULL; */

-- ============================================================
-- TABELA: cobrancas
-- Cobranças geradas para pacientes
-- ============================================================
CREATE TABLE IF NOT EXISTS cobrancas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id       UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
  consulta_id       UUID REFERENCES consultas(id) ON DELETE SET NULL,
  descricao         TEXT NOT NULL,
  valor             NUMERIC(10,2) NOT NULL,
  valor_desconto    NUMERIC(10,2) DEFAULT 0,
  valor_final       NUMERIC(10,2) GENERATED ALWAYS AS (valor - COALESCE(valor_desconto, 0)) STORED,
  vencimento        DATE,
  status            TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN (
    'pendente', 'pago', 'parcialmente_pago', 'cancelado', 'vencido'
  )),
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: pagamentos
-- Pagamentos recebidos vinculados a cobranças
-- ============================================================
CREATE TABLE IF NOT EXISTS pagamentos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  cobranca_id       UUID NOT NULL REFERENCES cobrancas(id) ON DELETE RESTRICT,
  paciente_id       UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
  valor             NUMERIC(10,2) NOT NULL,
  forma_pagamento   TEXT NOT NULL CHECK (forma_pagamento IN (
    'dinheiro', 'cartao_credito', 'cartao_debito', 'pix',
    'transferencia', 'convenio', 'boleto', 'outro'
  )),
  parcelas          INT DEFAULT 1,
  data_pagamento    DATE NOT NULL,
  comprovante_url   TEXT,
  observacoes       TEXT,
  registrado_por    UUID REFERENCES usuarios(id),
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: previsoes_faltas
-- Previsões de falta geradas pelo sistema inteligente
-- ============================================================
CREATE TABLE IF NOT EXISTS previsoes_faltas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  consulta_id       UUID NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  paciente_id       UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  probabilidade_falta NUMERIC(5,4),            -- 0.0 a 1.0
  fatores           JSONB DEFAULT '{}',         -- fatores que influenciaram a previsão
  acao_tomada       TEXT,                       -- ação preventiva realizada
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: bloqueios_agenda
-- Bloqueios de horários na agenda dos médicos
-- ============================================================
CREATE TABLE IF NOT EXISTS bloqueios_agenda (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  medico_id         UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  data_hora_inicio  TIMESTAMPTZ NOT NULL,
  data_hora_fim     TIMESTAMPTZ NOT NULL,
  motivo            TEXT,
  recorrente        BOOLEAN DEFAULT false,
  regra_recorrencia JSONB,                      -- regra de recorrência se aplicável
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: notificacoes
-- Notificações internas do sistema para os usuários
-- ============================================================
CREATE TABLE IF NOT EXISTS notificacoes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  usuario_id        UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo            TEXT NOT NULL,
  mensagem          TEXT NOT NULL,
  tipo              TEXT NOT NULL DEFAULT 'info' CHECK (tipo IN ('info', 'alerta', 'erro', 'sucesso')),
  lida              BOOLEAN DEFAULT false,
  lida_em           TIMESTAMPTZ,
  link              TEXT,                       -- link para navegar ao clicar
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================

-- clinicas
CREATE INDEX IF NOT EXISTS idx_clinicas_slug ON clinicas(slug);
CREATE INDEX IF NOT EXISTS idx_clinicas_ativo ON clinicas(ativo);

-- usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_clinica ON usuarios(clinica_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil ON usuarios(perfil);

-- medicos
CREATE INDEX IF NOT EXISTS idx_medicos_clinica ON medicos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_medicos_ativo ON medicos(ativo, clinica_id);

-- pacientes
CREATE INDEX IF NOT EXISTS idx_pacientes_clinica ON pacientes(clinica_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_nome ON pacientes(clinica_id, nome);
CREATE INDEX IF NOT EXISTS idx_pacientes_telefone ON pacientes(telefone);
CREATE INDEX IF NOT EXISTS idx_pacientes_email ON pacientes(email);
CREATE INDEX IF NOT EXISTS idx_pacientes_status ON pacientes(clinica_id, status);
CREATE INDEX IF NOT EXISTS idx_pacientes_ultimo_atendimento ON pacientes(clinica_id, ultimo_atendimento);

-- consultas
CREATE INDEX IF NOT EXISTS idx_consultas_clinica ON consultas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_consultas_paciente ON consultas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_consultas_medico ON consultas(medico_id);
CREATE INDEX IF NOT EXISTS idx_consultas_data ON consultas(clinica_id, data_hora_inicio);
CREATE INDEX IF NOT EXISTS idx_consultas_status ON consultas(clinica_id, status);
CREATE INDEX IF NOT EXISTS idx_consultas_data_status ON consultas(clinica_id, data_hora_inicio, status);

-- mensagens
CREATE INDEX IF NOT EXISTS idx_mensagens_clinica ON mensagens(clinica_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_paciente ON mensagens(paciente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_status ON mensagens(clinica_id, status);
CREATE INDEX IF NOT EXISTS idx_mensagens_criado_em ON mensagens(clinica_id, criado_em);

-- cobrancas
CREATE INDEX IF NOT EXISTS idx_cobrancas_clinica ON cobrancas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_paciente ON cobrancas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_status ON cobrancas(clinica_id, status);
CREATE INDEX IF NOT EXISTS idx_cobrancas_vencimento ON cobrancas(clinica_id, vencimento);

-- pagamentos
CREATE INDEX IF NOT EXISTS idx_pagamentos_clinica ON pagamentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_cobranca ON pagamentos(cobranca_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data ON pagamentos(clinica_id, data_pagamento);

-- campanhas
CREATE INDEX IF NOT EXISTS idx_campanhas_clinica ON campanhas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_status ON campanhas(clinica_id, status);

-- ============================================================
-- FUNÇÕES E TRIGGERS
-- ============================================================

-- Função para atualizar o campo atualizado_em automaticamente
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas com atualizado_em
CREATE OR REPLACE TRIGGER tr_clinicas_atualizado_em
  BEFORE UPDATE ON clinicas
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE OR REPLACE TRIGGER tr_usuarios_atualizado_em
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE OR REPLACE TRIGGER tr_medicos_atualizado_em
  BEFORE UPDATE ON medicos
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE OR REPLACE TRIGGER tr_pacientes_atualizado_em
  BEFORE UPDATE ON pacientes
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE OR REPLACE TRIGGER tr_consultas_atualizado_em
  BEFORE UPDATE ON consultas
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE OR REPLACE TRIGGER tr_mensagens_atualizado_em
  BEFORE UPDATE ON mensagens
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE OR REPLACE TRIGGER tr_campanhas_atualizado_em
  BEFORE UPDATE ON campanhas
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE OR REPLACE TRIGGER tr_cobrancas_atualizado_em
  BEFORE UPDATE ON cobrancas
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE OR REPLACE TRIGGER tr_pagamentos_atualizado_em
  BEFORE UPDATE ON pagamentos
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

-- Função para atualizar total_consultas e ultimo_atendimento em pacientes
CREATE OR REPLACE FUNCTION atualizar_dados_paciente()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS DISTINCT FROM 'concluido') THEN
    UPDATE pacientes
    SET
      total_consultas = total_consultas + 1,
      ultimo_atendimento = NEW.data_hora_inicio
    WHERE id = NEW.paciente_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_consultas_atualizar_paciente
  AFTER UPDATE ON consultas
  FOR EACH ROW EXECUTE FUNCTION atualizar_dados_paciente();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Isolamento Multi-Tenant
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_consulta ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags_pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE automacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE previsoes_faltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloqueios_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: retorna clinica_id do usuário logado
CREATE OR REPLACE FUNCTION obter_clinica_id_usuario()
RETURNS UUID AS $$
  SELECT clinica_id FROM usuarios WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Função auxiliar: verifica se usuário é administrador
CREATE OR REPLACE FUNCTION eh_administrador()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND perfil = 'administrador'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Políticas RLS - usuários só veem dados da própria clínica
DROP POLICY IF EXISTS "usuarios_propria_clinica" ON usuarios;
CREATE POLICY "usuarios_propria_clinica" ON usuarios
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

DROP POLICY IF EXISTS "medicos_propria_clinica" ON medicos;
CREATE POLICY "medicos_propria_clinica" ON medicos
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

DROP POLICY IF EXISTS "salas_propria_clinica" ON salas;
CREATE POLICY "salas_propria_clinica" ON salas
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

DROP POLICY IF EXISTS "tipos_consulta_propria_clinica" ON tipos_consulta;
CREATE POLICY "tipos_consulta_propria_clinica" ON tipos_consulta
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

DROP POLICY IF EXISTS "pacientes_propria_clinica" ON pacientes;
CREATE POLICY "pacientes_propria_clinica" ON pacientes
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

DROP POLICY IF EXISTS "tags_propria_clinica" ON tags_pacientes;
CREATE POLICY "tags_propria_clinica" ON tags_pacientes
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

DROP POLICY IF EXISTS "consultas_propria_clinica" ON consultas;
CREATE POLICY "consultas_propria_clinica" ON consultas
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

DROP POLICY IF EXISTS "historico_propria_clinica" ON historico_consultas;
CREATE POLICY "historico_propria_clinica" ON historico_consultas
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

DROP POLICY IF EXISTS "automacoes_propria_clinica" ON automacoes;
CREATE POLICY "automacoes_propria_clinica" ON automacoes
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

DROP POLICY IF EXISTS "mensagens_propria_clinica" ON mensagens;
CREATE POLICY "mensagens_propria_clinica" ON mensagens
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

DROP POLICY IF EXISTS "campanhas_propria_clinica" ON campanhas;
CREATE POLICY "campanhas_propria_clinica" ON campanhas
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

DROP POLICY IF EXISTS "cobrancas_propria_clinica" ON cobrancas;
CREATE POLICY "cobrancas_propria_clinica" ON cobrancas
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

DROP POLICY IF EXISTS "pagamentos_propria_clinica" ON pagamentos;
CREATE POLICY "pagamentos_propria_clinica" ON pagamentos
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

DROP POLICY IF EXISTS "previsoes_propria_clinica" ON previsoes_faltas;
CREATE POLICY "previsoes_propria_clinica" ON previsoes_faltas
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

DROP POLICY IF EXISTS "bloqueios_propria_clinica" ON bloqueios_agenda;
CREATE POLICY "bloqueios_propria_clinica" ON bloqueios_agenda
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

DROP POLICY IF EXISTS "notificacoes_proprio_usuario" ON notificacoes;
CREATE POLICY "notificacoes_proprio_usuario" ON notificacoes
  FOR ALL USING (usuario_id = auth.uid());

-- Permitir acesso público para leitura de clínicas via slug (agendamento online)
DROP POLICY IF EXISTS "clinicas_leitura_publica" ON clinicas;
CREATE POLICY "clinicas_leitura_publica" ON clinicas
  FOR SELECT USING (ativo = true);

-- ============================================================
-- TABELA: LISTA DE ESPERA
-- ============================================================

CREATE TABLE IF NOT EXISTS lista_espera (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id              UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id             UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id               UUID REFERENCES medicos(id) ON DELETE SET NULL,
  tipo_consulta_id        UUID REFERENCES tipos_consulta(id) ON DELETE SET NULL,
  data_preferida          DATE,
  horario_preferido_inicio TIME,
  horario_preferido_fim   TIME,
  prioridade              SMALLINT NOT NULL DEFAULT 2 CHECK (prioridade BETWEEN 1 AND 3),
  duracao_minutos         SMALLINT NOT NULL DEFAULT 30,
  status                  TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando','notificado','encaixado','desistiu','expirado')),
  observacoes             TEXT,
  notificado_em           TIMESTAMPTZ,
  encaixado_em            TIMESTAMPTZ,
  consulta_encaixada_id   UUID REFERENCES consultas(id) ON DELETE SET NULL,
  criado_em               TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lista_espera_clinica ON lista_espera(clinica_id);
CREATE INDEX IF NOT EXISTS idx_lista_espera_paciente ON lista_espera(paciente_id);
CREATE INDEX IF NOT EXISTS idx_lista_espera_status ON lista_espera(clinica_id, status);

CREATE OR REPLACE TRIGGER atualizar_lista_espera_em
  BEFORE UPDATE ON lista_espera
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

ALTER TABLE lista_espera ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lista_espera_propria_clinica" ON lista_espera;
CREATE POLICY "lista_espera_propria_clinica" ON lista_espera
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

-- ============================================================
-- TABELA: EXECUCOES DE AUTOMACOES
-- ============================================================

CREATE TABLE IF NOT EXISTS execucoes_automacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automacao_id    UUID NOT NULL REFERENCES automacoes(id) ON DELETE CASCADE,
  clinica_id      UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id     UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  consulta_id     UUID REFERENCES consultas(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'agendada'
                    CHECK (status IN ('agendada','concluida','erro','cancelada')),
  executar_em     TIMESTAMPTZ,
  executado_em    TIMESTAMPTZ,
  resultado       JSONB,
  contexto        JSONB,
  erro_mensagem   TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_execucoes_automacoes_clinica   ON execucoes_automacoes(clinica_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_automacoes_status    ON execucoes_automacoes(status, executar_em);
CREATE INDEX IF NOT EXISTS idx_execucoes_automacoes_automacao ON execucoes_automacoes(automacao_id);

ALTER TABLE execucoes_automacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "execucoes_automacoes_propria_clinica" ON execucoes_automacoes;
CREATE POLICY "execucoes_automacoes_propria_clinica" ON execucoes_automacoes
  FOR ALL USING (clinica_id = obter_clinica_id_usuario());

-- Colunas extras em consultas (caso não existam)
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS origem              TEXT DEFAULT 'manual';
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS chegou_em           TIMESTAMPTZ;
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS lembrete_enviado_em TIMESTAMPTZ;

-- Indices extras resolvidos
