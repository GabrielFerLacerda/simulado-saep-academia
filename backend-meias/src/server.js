// ======================================================================
// server.js — Backend COMPLETO baseado no briefing de Ferramentas
// ======================================================================

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  user: 'postgres',
  password: 'senai',
  host: 'localhost',
  port: 5432,
  database: 'saep_db',
});

app.use(cors());
app.use(express.json());

// utils
const ok = (res, data) => res.json(data);
const fail = (res, err, code = 500) => {
  console.error(err);
  res.status(code).json({
    error: typeof err === 'string' ? err : 'Erro interno no servidor',
  });
};

// ======================================================================
// HEALTHCHECK
// ======================================================================
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    ok(res, { status: 'ok' });
  } catch (e) {
    fail(res, e);
  }
});

// ======================================================================
// USUÁRIOS
// ======================================================================

// cadastro
app.post('/usuarios', async (req, res) => {
  const { nome, email, senha } = req.body || {};
  if (!nome || !email || !senha)
    return fail(res, 'Campos obrigatórios: nome, email, senha', 400);

  try {
    const q = `
      INSERT INTO usuarios (nome, email, senha)
      VALUES ($1,$2,$3)
      RETURNING id, nome, email
    `;
    const r = await pool.query(q, [nome, email, senha]);
    ok(res, r.rows[0]);
  } catch (e) {
    if (String(e?.message).includes('unique'))
      return fail(res, 'E-mail já cadastrado', 409);

    fail(res, e);
  }
});

// login
app.post('/auth/login', async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return fail(res, 'Informe email e senha', 400);

  try {
    const r = await pool.query(
      'SELECT id, nome, email FROM usuarios WHERE email=$1 AND senha=$2',
      [email, senha]
    );
    if (r.rows.length === 0) return fail(res, 'Credenciais inválidas', 401);

    ok(res, r.rows[0]);
  } catch (e) {
    fail(res, e);
  }
});

// ======================================================================
// PRODUTOS (Ferramentas com características específicas)
// ======================================================================

// LISTAR PRODUTOS
app.get('/produtos', async (req, res) => {
  const q = (req.query.q || '').trim();
  const hasQ = q.length > 0;

  const sql = `
    SELECT id, nome, marca, modelo, tipo_material, tamanho, peso,
           tensao_eletrica, quantidade, estoque_minimo,
           (quantidade < estoque_minimo) AS abaixo_do_minimo
      FROM produtos
      ${hasQ ? 'WHERE LOWER(nome) LIKE LOWER($1)' : ''}
     ORDER BY nome ASC
  `;

  try {
    const r = await pool.query(sql, hasQ ? [`%${q}%`] : []);
    ok(res, r.rows);
  } catch (e) {
    fail(res, e);
  }
});

// PEGAR UM PRODUTO
app.get('/produtos/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `
      SELECT id, nome, marca, modelo, tipo_material, tamanho, peso,
             tensao_eletrica, quantidade, estoque_minimo,
             (quantidade < estoque_minimo) AS abaixo_do_minimo
        FROM produtos
       WHERE id=$1
     `,
      [req.params.id]
    );

    if (!r.rows.length) return fail(res, 'Produto não encontrado', 404);

    ok(res, r.rows[0]);
  } catch (e) {
    fail(res, e);
  }
});

// CRIAR PRODUTO
app.post('/produtos', async (req, res) => {
  const {
    nome,
    marca,
    modelo,
    tipo_material,
    tamanho,
    peso,
    tensao_eletrica,
    quantidade = 0,
    estoque_minimo = 0,
  } = req.body || {};

  if (!nome || !marca || !modelo)
    return fail(res, 'Campos obrigatórios: nome, marca, modelo', 400);

  try {
    const r = await pool.query(
      `
      INSERT INTO produtos
        (nome, marca, modelo, tipo_material, tamanho, peso, tensao_eletrica,
         quantidade, estoque_minimo)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id, nome, marca, modelo, tipo_material, tamanho, peso,
                tensao_eletrica, quantidade, estoque_minimo
      `,
      [
        nome,
        marca,
        modelo,
        tipo_material || null,
        tamanho || null,
        peso || null,
        tensao_eletrica || null,
        Number(quantidade) || 0,
        Number(estoque_minimo) || 0,
      ]
    );

    ok(res, r.rows[0]);
  } catch (e) {
    fail(res, e);
  }
});

// ATUALIZAR PRODUTO
app.put('/produtos/:id', async (req, res) => {
  const {
    nome,
    marca,
    modelo,
    tipo_material,
    tamanho,
    peso,
    tensao_eletrica,
    quantidade,
    estoque_minimo,
  } = req.body || {};

  try {
    const r = await pool.query(
      `
      UPDATE produtos
         SET nome = COALESCE($1, nome),
             marca = COALESCE($2, marca),
             modelo = COALESCE($3, modelo),
             tipo_material = COALESCE($4, tipo_material),
             tamanho = COALESCE($5, tamanho),
             peso = COALESCE($6, peso),
             tensao_eletrica = COALESCE($7, tensao_eletrica),
             quantidade = COALESCE($8, quantidade),
             estoque_minimo = COALESCE($9, estoque_minimo)
       WHERE id=$10
     RETURNING *
      `,
      [
        nome ?? null,
        marca ?? null,
        modelo ?? null,
        tipo_material ?? null,
        tamanho ?? null,
        peso ?? null,
        tensao_eletrica ?? null,
        quantidade ?? null,
        estoque_minimo ?? null,
        req.params.id,
      ]
    );

    if (!r.rows.length) return fail(res, 'Produto não encontrado', 404);

    ok(res, r.rows[0]);
  } catch (e) {
    fail(res, e);
  }
});

// DELETAR PRODUTO
app.delete('/produtos/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM produtos WHERE id=$1 RETURNING id', [
      req.params.id,
    ]);

    if (!r.rows.length) return fail(res, 'Produto não encontrado', 404);

    ok(res, { message: 'Produto deletado com sucesso' });
  } catch (e) {
    fail(res, e);
  }
});

// ======================================================================
// MOVIMENTAÇÕES (Entrada e Saída)
// ======================================================================

// CRIAR MOVIMENTAÇÃO
app.post('/movimentacoes', async (req, res) => {
  const {
    produto_id,
    usuario_id,
    tipo,
    quantidade,
    data_movimentacao,
    observacao,
  } = req.body || {};

  if (!produto_id || !usuario_id || !tipo || !quantidade)
    return fail(
      res,
      'Campos obrigatórios: produto_id, usuario_id, tipo, quantidade',
      400
    );

  if (!['entrada', 'saida'].includes(String(tipo).toLowerCase()))
    return fail(res, "tipo deve ser 'entrada' ou 'saida'", 400);

  const delta =
    String(tipo).toLowerCase() === 'entrada'
      ? +Math.abs(quantidade)
      : -Math.abs(quantidade);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const up = await client.query(
      `
      UPDATE produtos
         SET quantidade = quantidade + $1
       WHERE id=$2
    RETURNING *
      `,
      [delta, produto_id]
    );

    if (!up.rows.length) {
      await client.query('ROLLBACK');
      client.release();
      return fail(res, 'Produto não encontrado', 404);
    }

    const ins = await client.query(
      `
      INSERT INTO movimentacoes
        (produto_id, usuario_id, tipo, quantidade, data_movimentacao, observacao)
      VALUES ($1,$2,$3,$4,COALESCE($5, NOW()),$6)
      RETURNING *
      `,
      [
        produto_id,
        usuario_id,
        String(tipo).toLowerCase(),
        Math.abs(quantidade),
        data_movimentacao || null,
        observacao || null,
      ]
    );

    await client.query('COMMIT');
    client.release();

    ok(res, {
      movimento: ins.rows[0],
      produto: {
        ...up.rows[0],
        abaixo_do_minimo: up.rows[0].quantidade < up.rows[0].estoque_minimo,
      },
    });
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    client.release();
    fail(res, e);
  }
});

// HISTÓRICO
app.get('/movimentacoes', async (req, res) => {
  const { produto_id } = req.query;
  const has = !!produto_id;

  const sql = `
    SELECT m.*, 
           p.nome AS produto_nome,
           u.nome AS responsavel_nome
      FROM movimentacoes m
      JOIN produtos p ON p.id = m.produto_id
      JOIN usuarios u ON u.id = m.usuario_id
     ${has ? 'WHERE m.produto_id = $1' : ''}
     ORDER BY m.data_movimentacao DESC
  `;

  try {
    const r = await pool.query(sql, has ? [produto_id] : []);
    ok(res, r.rows);
  } catch (e) {
    fail(res, e);
  }
});

// ======================================================================
// START
// ======================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Servidor rodando corretamente na porta ${PORT}`)
);

