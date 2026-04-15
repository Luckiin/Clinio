-- ============================================================
-- CLINIO - Migration: Módulo de CRM Completo
-- Tabelas para CRM, comunicação, chatbot e campanhas
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- TABELA: interacoes_paciente
-- Registro manual de interações da equipe com pacientes
-- ============================================================
CREATE TABLE IF NOT EXISTS interacoes_paciente (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id    UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id   UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  usuario_id    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo_interacao TEXT NOT NULL CHECK (tipo_interacao IN (
    'ligacao', 'whatsapp', 'email', 'presencial', 'anotacao', 'outro'
  )),
  descricao     TEXT NOT NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interacoes_paciente_clinica ON interacoes_paciente(clinica_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_paciente_paciente ON interacoes_paciente(paciente_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_paciente_criado ON interacoes_paciente(criado_em DESC);

-- ============================================================
-- TABELA: tags_paciente
-- Tags para segmentação de pacientes
-- ============================================================
CREATE TABLE IF NOT EXISTS tags_paciente (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id  UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL,
  cor         TEXT NOT NULL DEFAULT '#3B82F6',
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clinica_id, paciente_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_tags_paciente_clinica ON tags_paciente(clinica_id);
CREATE INDEX IF NOT EXISTS idx_tags_paciente_paciente ON tags_paciente(paciente_id);
CREATE INDEX IF NOT EXISTS idx_tags_paciente_tag ON tags_paciente(tag);

-- ============================================================
-- TABELA: oportunidades_paciente
-- Oportunidades de retorno e follow-up
-- ============================================================
CREATE TABLE IF NOT EXISTS oportunidades_paciente (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id            UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id           UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  usuario_responsavel_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo_oportunidade     TEXT NOT NULL CHECK (tipo_oportunidade IN (
    'retorno_consulta', 'tratamento_incompleto', 'avaliacao_pendente',
    'renovacao_procedimento', 'indicacao', 'reativacao', 'outro'
  )),
  descricao             TEXT NOT NULL,
  data_retorno_prevista DATE,
  status                TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN (
    'aberta', 'em_contato', 'convertida', 'cancelada'
  )),
  prioridade            TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN (
    'baixa', 'media', 'alta'
  )),
  valor_estimado        NUMERIC(10,2),
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oportunidades_clinica ON oportunidades_paciente(clinica_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_paciente ON oportunidades_paciente(paciente_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_status ON oportunidades_paciente(status);
CREATE INDEX IF NOT EXISTS idx_oportunidades_data ON oportunidades_paciente(data_retorno_prevista);

-- ============================================================
-- TABELA: etapas_funil_paciente
-- Funil de relacionamento com pacientes (útil para estéticas)
-- ============================================================
CREATE TABLE IF NOT EXISTS etapas_funil_paciente (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id  UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  etapa       TEXT NOT NULL CHECK (etapa IN (
    'interessado', 'avaliacao_marcada', 'avaliacao_realizada',
    'tratamento_iniciado', 'tratamento_em_andamento', 'tratamento_finalizado',
    'fidelizado', 'perdido'
  )),
  observacao  TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clinica_id, paciente_id)
);

CREATE INDEX IF NOT EXISTS idx_funil_clinica ON etapas_funil_paciente(clinica_id);
CREATE INDEX IF NOT EXISTS idx_funil_etapa ON etapas_funil_paciente(etapa);

-- ============================================================
-- TABELA: pontuacao_paciente
-- Pontuação de relacionamento (calculada automaticamente)
-- ============================================================
CREATE TABLE IF NOT EXISTS pontuacao_paciente (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id            UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id           UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  pontuacao_total       INT NOT NULL DEFAULT 0,
  pontos_consultas      INT NOT NULL DEFAULT 0,
  pontos_valor_gasto    INT NOT NULL DEFAULT 0,
  pontos_fidelidade     INT NOT NULL DEFAULT 0,
  pontos_indicacoes     INT NOT NULL DEFAULT 0,
  nivel                 TEXT NOT NULL DEFAULT 'bronze' CHECK (nivel IN (
    'bronze', 'prata', 'ouro', 'diamante'
  )),
  calculado_em          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clinica_id, paciente_id)
);

CREATE INDEX IF NOT EXISTS idx_pontuacao_clinica ON pontuacao_paciente(clinica_id);
CREATE INDEX IF NOT EXISTS idx_pontuacao_total ON pontuacao_paciente(pontuacao_total DESC);

-- ============================================================
-- TABELA: conversas
-- Conversas com pacientes via WhatsApp, email, etc.
-- ============================================================
CREATE TABLE IF NOT EXISTS conversas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id  UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  canal       TEXT NOT NULL DEFAULT 'whatsapp' CHECK (canal IN (
    'whatsapp', 'email', 'sms', 'chat_interno'
  )),
  status      TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN (
    'ativa', 'resolvida', 'arquivada'
  )),
  ultima_mensagem_em  TIMESTAMPTZ,
  total_mensagens     INT NOT NULL DEFAULT 0,
  nao_lidas           INT NOT NULL DEFAULT 0,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversas_clinica ON conversas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_conversas_paciente ON conversas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_conversas_ultima ON conversas(ultima_mensagem_em DESC);
CREATE INDEX IF NOT EXISTS idx_conversas_status ON conversas(status);

-- ============================================================
-- TABELA: mensagens_conversa
-- Mensagens dentro de cada conversa
-- ============================================================
CREATE TABLE IF NOT EXISTS mensagens_conversa (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversa_id     UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  paciente_id     UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo_mensagem   TEXT NOT NULL CHECK (tipo_mensagem IN ('enviada', 'recebida', 'sistema')),
  conteudo        TEXT NOT NULL,
  tipo_conteudo   TEXT NOT NULL DEFAULT 'texto' CHECK (tipo_conteudo IN (
    'texto', 'imagem', 'audio', 'documento', 'template'
  )),
  status_mensagem TEXT NOT NULL DEFAULT 'enviada' CHECK (status_mensagem IN (
    'enviada', 'entregue', 'lida', 'falhou'
  )),
  mensagem_whatsapp_id TEXT,          -- ID da mensagem no WhatsApp Business API
  lida            BOOLEAN NOT NULL DEFAULT false,
  data_envio      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_conversa ON mensagens_conversa(conversa_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_paciente ON mensagens_conversa(paciente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_data ON mensagens_conversa(data_envio DESC);
CREATE INDEX IF NOT EXISTS idx_mensagens_tipo ON mensagens_conversa(tipo_mensagem);

-- ============================================================
-- TABELA: whatsapp_integrations
-- Configuração da integração WhatsApp por clínica (multi-tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_integrations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  access_token        TEXT NOT NULL,
  phone_number_id     TEXT NOT NULL,
  business_account_id TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id),
  UNIQUE(phone_number_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_integrations_company ON whatsapp_integrations(company_id);

-- ============================================================
-- TABELA: integrations
-- Estrutura genérica para integrações externas por clínica
-- ============================================================
CREATE TABLE IF NOT EXISTS integrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  config      JSONB NOT NULL DEFAULT '{}'::jsonb,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, type)
);

CREATE INDEX IF NOT EXISTS integrations_company_idx ON integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_integrations_company_type ON integrations(company_id, type);

-- ============================================================
-- TABELA: fluxos_chatbot
-- Definição de fluxos de automação do chatbot
-- ============================================================
CREATE TABLE IF NOT EXISTS fluxos_chatbot (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id  UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  gatilho     TEXT NOT NULL,            -- palavra-chave ou evento que ativa o fluxo
  nos         JSONB NOT NULL DEFAULT '[]',  -- array de nós do fluxo (perguntas, respostas, ações)
  ativo       BOOLEAN NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_clinica ON fluxos_chatbot(clinica_id);

-- ============================================================
-- TABELA: campanhas_crm
-- Campanhas de marketing e comunicação segmentadas
-- (Extende a tabela campanhas existente com CRM)
-- ============================================================
CREATE TABLE IF NOT EXISTS campanhas_crm (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id           UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome                 TEXT NOT NULL,
  descricao            TEXT,
  tipo                 TEXT NOT NULL DEFAULT 'marketing' CHECK (tipo IN (
    'marketing', 'reativacao', 'promocional', 'informativa', 'aniversario', 'retorno'
  )),
  canal                TEXT NOT NULL DEFAULT 'whatsapp' CHECK (canal IN (
    'whatsapp', 'email', 'sms'
  )),
  mensagem_template    TEXT NOT NULL,
  -- Segmentação
  filtro_tags          TEXT[],                    -- tags dos pacientes
  filtro_status        TEXT[],                    -- status dos pacientes
  filtro_dias_sem_consulta INT,                   -- inativos há X dias
  filtro_tipo_procedimento TEXT,                  -- realizaram determinado procedimento
  filtro_cidade        TEXT,
  filtro_sexo          TEXT,
  filtro_idade_min     INT,
  filtro_idade_max     INT,
  -- Agendamento
  agendada_para        TIMESTAMPTZ,
  status               TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN (
    'rascunho', 'agendada', 'enviando', 'concluida', 'cancelada', 'pausada'
  )),
  -- Métricas
  total_destinatarios  INT NOT NULL DEFAULT 0,
  total_enviadas       INT NOT NULL DEFAULT 0,
  total_entregues      INT NOT NULL DEFAULT 0,
  total_lidas          INT NOT NULL DEFAULT 0,
  total_respostas      INT NOT NULL DEFAULT 0,
  criado_por           UUID REFERENCES usuarios(id),
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campanhas_crm_clinica ON campanhas_crm(clinica_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_crm_status ON campanhas_crm(status);

-- ============================================================
-- TABELA: envios_campanha_crm
-- Registro de cada envio individual de campanha
-- ============================================================
CREATE TABLE IF NOT EXISTS envios_campanha_crm (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id  UUID NOT NULL REFERENCES campanhas_crm(id) ON DELETE CASCADE,
  paciente_id  UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN (
    'pendente', 'enviada', 'entregue', 'lida', 'respondida', 'falhou'
  )),
  data_envio   TIMESTAMPTZ,
  data_leitura TIMESTAMPTZ,
  erro         TEXT,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_envios_campanha ON envios_campanha_crm(campanha_id);
CREATE INDEX IF NOT EXISTS idx_envios_paciente ON envios_campanha_crm(paciente_id);

-- ============================================================
-- TRIGGERS: atualizar timestamps automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_oportunidades_timestamp') THEN
    CREATE TRIGGER trg_oportunidades_timestamp
      BEFORE UPDATE ON oportunidades_paciente
      FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_conversas_timestamp') THEN
    CREATE TRIGGER trg_conversas_timestamp
      BEFORE UPDATE ON conversas
      FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_campanhas_crm_timestamp') THEN
    CREATE TRIGGER trg_campanhas_crm_timestamp
      BEFORE UPDATE ON campanhas_crm
      FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
  END IF;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Multi-tenant isolation
-- ============================================================
ALTER TABLE interacoes_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE oportunidades_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE etapas_funil_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE pontuacao_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_conversa ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxos_chatbot ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas_crm ENABLE ROW LEVEL SECURITY;
ALTER TABLE envios_campanha_crm ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: service_role tem acesso total (padrão para Next.js com chave service_role)
-- Usamos DROP POLICY IF EXISTS + CREATE para idempotência (pode re-executar sem erro)
DO $$
DECLARE
  tabelas TEXT[] := ARRAY[
    'interacoes_paciente',
    'tags_paciente',
    'oportunidades_paciente',
    'etapas_funil_paciente',
    'pontuacao_paciente',
    'conversas',
    'mensagens_conversa',
    'whatsapp_integrations',
    'integrations',
    'fluxos_chatbot',
    'campanhas_crm',
    'envios_campanha_crm'
  ];
  nomes TEXT[] := ARRAY[
    'service_role acesso total interacoes',
    'service_role acesso total tags',
    'service_role acesso total oportunidades',
    'service_role acesso total funil',
    'service_role acesso total pontuacao',
    'service_role acesso total conversas',
    'service_role acesso total mensagens',
    'service_role acesso total whatsapp_integrations',
    'service_role acesso total integrations',
    'service_role acesso total chatbot',
    'service_role acesso total campanhas_crm',
    'service_role acesso total envios_campanha'
  ];
  i INT;
BEGIN
  FOR i IN 1..array_length(tabelas, 1) LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I',
      nomes[i], tabelas[i]
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      nomes[i], tabelas[i]
    );
  END LOOP;
END;
$$;

-- ============================================================
-- FUNÇÃO: calcular pontuação de paciente
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_pontuacao_paciente(p_clinica_id UUID, p_paciente_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_consultas INT;
  v_valor_total     NUMERIC;
  v_meses_cliente   INT;
  v_pontos_consultas INT;
  v_pontos_valor    INT;
  v_pontos_fidelidade INT;
  v_pontuacao_total INT;
  v_nivel           TEXT;
BEGIN
  -- Contar consultas realizadas
  SELECT COUNT(*) INTO v_total_consultas
  FROM consultas
  WHERE clinica_id = p_clinica_id
    AND paciente_id = p_paciente_id
    AND status = 'concluido';

  -- Valor total gasto
  SELECT COALESCE(SUM(valor_final), 0) INTO v_valor_total
  FROM cobrancas
  WHERE clinica_id = p_clinica_id
    AND paciente_id = p_paciente_id
    AND status = 'pago';

  -- Meses como cliente
  SELECT COALESCE(
    EXTRACT(MONTH FROM AGE(NOW(), MIN(criado_em)))::INT +
    (EXTRACT(YEAR FROM AGE(NOW(), MIN(criado_em)))::INT * 12),
    0
  ) INTO v_meses_cliente
  FROM pacientes
  WHERE id = p_paciente_id;

  -- Calcular pontos
  v_pontos_consultas := v_total_consultas * 10;
  v_pontos_valor := FLOOR(v_valor_total / 100)::INT;  -- 1 ponto a cada R$100
  v_pontos_fidelidade := v_meses_cliente * 5;          -- 5 pontos por mês de relacionamento

  v_pontuacao_total := v_pontos_consultas + v_pontos_valor + v_pontos_fidelidade;

  -- Determinar nível
  v_nivel := CASE
    WHEN v_pontuacao_total >= 500 THEN 'diamante'
    WHEN v_pontuacao_total >= 200 THEN 'ouro'
    WHEN v_pontuacao_total >= 50  THEN 'prata'
    ELSE 'bronze'
  END;

  -- Upsert na tabela de pontuação
  INSERT INTO pontuacao_paciente (
    clinica_id, paciente_id,
    pontuacao_total, pontos_consultas, pontos_valor_gasto, pontos_fidelidade,
    nivel, calculado_em
  ) VALUES (
    p_clinica_id, p_paciente_id,
    v_pontuacao_total, v_pontos_consultas, v_pontos_valor, v_pontos_fidelidade,
    v_nivel, NOW()
  )
  ON CONFLICT (clinica_id, paciente_id)
  DO UPDATE SET
    pontuacao_total    = EXCLUDED.pontuacao_total,
    pontos_consultas   = EXCLUDED.pontos_consultas,
    pontos_valor_gasto = EXCLUDED.pontos_valor_gasto,
    pontos_fidelidade  = EXCLUDED.pontos_fidelidade,
    nivel              = EXCLUDED.nivel,
    calculado_em       = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VIEWS ÚTEIS PARA O CRM
-- ============================================================

-- View: pacientes inativos (sem consulta há mais de 90 dias)
CREATE OR REPLACE VIEW v_pacientes_inativos AS
SELECT
  p.id,
  p.clinica_id,
  p.nome,
  p.telefone,
  p.telefone_whatsapp,
  p.email,
  p.status,
  MAX(c.data_hora_inicio) AS ultima_consulta,
  EXTRACT(DAY FROM NOW() - MAX(c.data_hora_inicio))::INT AS dias_sem_consulta,
  COUNT(c.id) AS total_consultas
FROM pacientes p
LEFT JOIN consultas c ON c.paciente_id = p.id
  AND c.status NOT IN ('cancelado', 'faltou')
WHERE p.status = 'ativo'
GROUP BY p.id, p.clinica_id, p.nome, p.telefone, p.telefone_whatsapp, p.email, p.status
HAVING MAX(c.data_hora_inicio) < NOW() - INTERVAL '90 days'
   OR MAX(c.data_hora_inicio) IS NULL;

-- View: radar de oportunidades automático
CREATE OR REPLACE VIEW v_radar_oportunidades AS
SELECT
  p.id AS paciente_id,
  p.clinica_id,
  p.nome AS paciente_nome,
  p.telefone,
  p.telefone_whatsapp,
  ult.tipo_consulta_nome AS ultimo_procedimento,
  ult.data_hora_inicio AS data_ultimo_procedimento,
  EXTRACT(DAY FROM NOW() - ult.data_hora_inicio)::INT AS dias_desde_ultimo,
  'retorno_consulta' AS tipo_oportunidade,
  CASE
    WHEN EXTRACT(DAY FROM NOW() - ult.data_hora_inicio) > 365 THEN 'alta'
    WHEN EXTRACT(DAY FROM NOW() - ult.data_hora_inicio) > 180 THEN 'media'
    ELSE 'baixa'
  END AS prioridade
FROM pacientes p
INNER JOIN LATERAL (
  SELECT c.data_hora_inicio, tc.nome AS tipo_consulta_nome
  FROM consultas c
  LEFT JOIN tipos_consulta tc ON tc.id = c.tipo_consulta_id
  WHERE c.paciente_id = p.id
    AND c.status = 'concluido'
  ORDER BY c.data_hora_inicio DESC
  LIMIT 1
) ult ON true
WHERE p.status = 'ativo'
  AND EXTRACT(DAY FROM NOW() - ult.data_hora_inicio) >= 90;
