# Sistema de Gestão de Ferramentas e Estoque

## Documento de Requisitos Funcionais

### 1. Autenticação de Usuário
- **RF01:** O sistema deve permitir que o usuário realize login informando e-mail e senha.
- **RF02:** O sistema deve validar as credenciais e permitir acesso apenas a usuários cadastrados.
- **RF03:** O sistema deve exibir mensagem de erro caso o login falhe.

### 2. Cadastro de Usuário
- **RF04:** O sistema deve permitir o cadastro de novos usuários, solicitando nome, e-mail e senha.
- **RF05:** O sistema deve impedir o cadastro de usuários com e-mail já existente.
- **RF06:** O sistema deve validar o preenchimento dos campos obrigatórios no cadastro.

### 3. Gestão de Ferramentas (Produtos)
- **RF07:** O sistema deve permitir o cadastro de novas ferramentas, solicitando os seguintes campos:
  - Nome (obrigatório)
  - Marca (obrigatório)
  - Modelo (obrigatório)
  - Tipo de material (opcional)
  - Tamanho (opcional)
  - Peso (opcional)
  - Tensão elétrica (opcional)
  - Quantidade (obrigatório)
  - Estoque mínimo (obrigatório)
- **RF08:** O sistema deve permitir a edição dos dados das ferramentas cadastradas.
- **RF09:** O sistema deve permitir a exclusão de ferramentas.
- **RF10:** O sistema deve listar todas as ferramentas cadastradas em ordem alfabética.
- **RF11:** O sistema deve permitir a busca de ferramentas pelo nome.
- **RF12:** O sistema deve exibir um alerta visual quando a quantidade de uma ferramenta estiver abaixo do estoque mínimo.

### 4. Gestão de Estoque
- **RF13:** O sistema deve permitir registrar movimentações de entrada e saída de ferramentas.
- **RF14:** O sistema deve solicitar os seguintes dados para cada movimentação:
  - Ferramenta
  - Tipo (entrada ou saída)
  - Quantidade
  - Data da movimentação (opcional)
  - Observação (opcional)
- **RF15:** O sistema deve atualizar a quantidade da ferramenta conforme a movimentação registrada.
- **RF16:** O sistema deve exibir um alerta caso, após a movimentação, a quantidade fique abaixo do estoque mínimo.
- **RF17:** O sistema deve listar as ferramentas com suas quantidades e estoques mínimos na tela de gestão de estoque.

### 5. Histórico de Movimentações
- **RF18:** O sistema deve registrar todas as movimentações realizadas, associando cada movimentação ao usuário responsável.

### 6. Usabilidade
- **RF19:** O sistema deve apresentar interface responsiva, moderna e de fácil utilização.
- **RF20:** O sistema deve exibir mensagens de erro e sucesso para as principais ações do usuário.

---

## Casos de Teste Realizados

### CT01 - Login com Usuário Válido
- **ID Requisito Funcional:** RF01
- **Descrição:** Login com usuário válido
- **Precondição:** Usuário já cadastrado
- **Passos:**
  1. Acessar tela de login
  2. Informar e-mail e senha válidos
  3. Clicar em "Entrar"
- **Resultado esperado:** Usuário acessa o sistema e vê a tela inicial

---

### CT02 - Cadastro de Nova Ferramenta com Dados Obrigatórios
- **ID Requisito Funcional:** RF07
- **Descrição:** Cadastro de nova ferramenta com dados obrigatórios
- **Precondição:** Usuário autenticado no sistema
- **Passos:**
  1. Acessar "Cadastro de Ferramenta"
  2. Preencher nome, marca, modelo, quantidade e estoque mínimo
  3. Clicar em "Cadastrar ferramenta"
- **Resultado esperado:** Ferramenta aparece na lista de ferramentas

---

### CT03 - Registrar Saída de Ferramenta
- **ID Requisito Funcional:** RF13
- **Descrição:** Registrar saída de ferramenta
- **Precondição:** Pelo menos uma ferramenta cadastrada
- **Passos:**
  1. Acessar "Gestão de Estoque"
  2. Selecionar ferramenta
  3. Selecionar "Saída"
  4. Informar quantidade
  5. Clicar em "Registrar"
- **Resultado esperado:** Quantidade da ferramenta é reduzida corretamente

### Script  - Estrutura do banco de dados

-- ============================================================
-- 1) CRIAÇÃO DO BANCO 
-- ============================================================

-- CREATE DATABASE saep_db;
-- \c saep_db;

-- ============================================================
-- 2) TABELA: usuarios
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL
);

-- ============================================================
-- 3) TABELA: produtos (Ferramentas e Equipamentos Manuais)
-- ============================================================

CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,

  -- Identificação
  nome VARCHAR(255) NOT NULL,
  marca VARCHAR(255) NOT NULL,
  modelo VARCHAR(255) NOT NULL,

  -- Características específicas
  tipo_material VARCHAR(255),
  tamanho VARCHAR(100),        -- Pode armazenar medidas flexíveis (ex: "30 cm", "12mm")
  peso VARCHAR(50),            -- Peso pode ter diferentes formatos (ex: "2kg", "350g")
  tensao_eletrica VARCHAR(50), -- Ex: 110V / 220V / Bivolt

  -- Controle de estoque
  quantidade INTEGER DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 0
);

-- ============================================================
-- 4) TABELA: movimentacoes (histórico de entrada/saída)
-- ============================================================

CREATE TABLE IF NOT EXISTS movimentacoes (
  id SERIAL PRIMARY KEY,

  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),

  data_movimentacao TIMESTAMP NOT NULL DEFAULT NOW(),
  observacao TEXT
);

-- ============================================================
-- 5) ÍNDICES IMPORTANTES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_produtos_nome
  ON produtos (LOWER(nome));

CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto
  ON movimentacoes (produto_id);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_data
  ON movimentacoes (data_movimentacao DESC);

