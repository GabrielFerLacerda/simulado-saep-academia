// App.jsx — SPA mínima adaptada para Ferramentas (React + axios)
// Entregas: 4 (login), 5 (principal), 6 (cadastro produto), 7 (gestão de estoque)
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const API = axios.create({
  baseURL: "http://localhost:3000",
  timeout: 8000,
});

// util
const notEmpty = (v) => String(v ?? "").trim().length > 0;
const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

export default function App() {
  // -------------------------------
  // estado global simples
  // -------------------------------
  const [view, setView] = useState("login"); // 'login' | 'home' | 'produtos' | 'estoque'
  const [user, setUser] = useState(null); // {id, nome, email}

  // -------------------------------
  // login (4)
  // -------------------------------
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const doLogin = async (e) => {
    e?.preventDefault();
    if (!notEmpty(loginEmail) || !notEmpty(loginSenha)) {
      alert("Informe email e senha.");
      return;
    }
    try {
      const { data } = await API.post("/auth/login", {
        email: loginEmail,
        senha: loginSenha,
      });
      setUser(data);
      setView("home");
      setLoginEmail("");
      setLoginSenha("");
    } catch (err) {
      alert(err?.response?.data?.error || "Falha no login");
    }
  };

  const logout = () => {
    setUser(null);
    setView("login");
  };

  // -------------------------------
  // produtos (6) + uso em estoque (7)
  // -------------------------------
  const [produtos, setProdutos] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [q, setQ] = useState(""); // busca

  // form produto
  const emptyProduto = {
    id: null,
    nome: "",
    marca: "",
    modelo: "",
    tipo_material: "",
    tamanho: "",
    peso: "",
    tensao_eletrica: "",
    quantidade: 0,
    estoque_minimo: 0,
  };
  const [produtoForm, setProdutoForm] = useState(emptyProduto);
  const [editandoId, setEditandoId] = useState(null);

  const carregarProdutos = async (term = q) => {
    setLoadingProdutos(true);
    try {
      const url = notEmpty(term) ? `/produtos?q=${encodeURIComponent(term)}` : "/produtos";
      const { data } = await API.get(url);
      setProdutos(Array.isArray(data) ? data : []);
    } catch (e) {
      alert("Erro ao carregar produtos");
    } finally {
      setLoadingProdutos(false);
    }
  };

  useEffect(() => {
    if (view === "produtos" || view === "estoque") carregarProdutos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const produtosOrdenados = useMemo(() => {
    return [...produtos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  }, [produtos]);

  const limparProdutoForm = () => {
    setProdutoForm(emptyProduto);
    setEditandoId(null);
  };

  const validarProdutoForm = () => {
    const { nome, marca, modelo, quantidade, estoque_minimo } = produtoForm;
    if (!notEmpty(nome)) return "Informe o nome do produto.";
    if (!notEmpty(marca)) return "Informe a marca.";
    if (!notEmpty(modelo)) return "Informe o modelo.";
    if (toInt(quantidade) < 0) return "Quantidade não pode ser negativa.";
    if (toInt(estoque_minimo) < 0) return "Estoque mínimo não pode ser negativo.";
    return null;
  };

  const criarProduto = async () => {
    const msg = validarProdutoForm();
    if (msg) return alert(msg);
    try {
      await API.post("/produtos", {
        nome: produtoForm.nome.trim(),
        marca: produtoForm.marca.trim(),
        modelo: produtoForm.modelo.trim(),
        tipo_material: produtoForm.tipo_material?.trim() || null,
        tamanho: produtoForm.tamanho?.trim() || null,
        peso: produtoForm.peso?.trim() || null,
        tensao_eletrica: produtoForm.tensao_eletrica?.trim() || null,
        quantidade: toInt(produtoForm.quantidade),
        estoque_minimo: toInt(produtoForm.estoque_minimo),
      });
      await carregarProdutos();
      limparProdutoForm();
    } catch (e) {
      alert(e?.response?.data?.error || "Erro ao criar produto");
    }
  };

  const iniciarEdicao = (p) => {
    setEditandoId(p.id);
    setProdutoForm({
      id: p.id,
      nome: p.nome,
      marca: p.marca,
      modelo: p.modelo,
      tipo_material: p.tipo_material || "",
      tamanho: p.tamanho || "",
      peso: p.peso || "",
      tensao_eletrica: p.tensao_eletrica || "",
      quantidade: p.quantidade,
      estoque_minimo: p.estoque_minimo,
    });
  };

  const salvarProduto = async () => {
    if (!editandoId) return;
    const msg = validarProdutoForm();
    if (msg) return alert(msg);
    try {
      await API.put(`/produtos/${editandoId}`, {
        nome: produtoForm.nome.trim(),
        marca: produtoForm.marca.trim(),
        modelo: produtoForm.modelo.trim(),
        tipo_material: produtoForm.tipo_material?.trim() || null,
        tamanho: produtoForm.tamanho?.trim() || null,
        peso: produtoForm.peso?.trim() || null,
        tensao_eletrica: produtoForm.tensao_eletrica?.trim() || null,
        quantidade: toInt(produtoForm.quantidade),
        estoque_minimo: toInt(produtoForm.estoque_minimo),
      });
      await carregarProdutos();
      limparProdutoForm();
    } catch (e) {
      alert(e?.response?.data?.error || "Erro ao salvar produto");
    }
  };

  const excluirProduto = async (id) => {
    if (!window.confirm("Excluir este produto?")) return;
    try {
      await API.delete(`/produtos/${id}`);
      await carregarProdutos();
    } catch (e) {
      alert(e?.response?.data?.error || "Erro ao excluir produto");
    }
  };

  const buscar = async (e) => {
    e?.preventDefault();
    await carregarProdutos(q);
  };

  // -------------------------------
  // gestão de estoque (7)
  // -------------------------------
  const [movProdutoId, setMovProdutoId] = useState("");
  const [movTipo, setMovTipo] = useState("entrada"); // entrada|saida
  const [movQuantidade, setMovQuantidade] = useState("");
  const [movData, setMovData] = useState(""); // date (yyyy-mm-dd)
  const [movObs, setMovObs] = useState("");

  const enviarMovimentacao = async () => {
    if (!user) return alert("Faça login.");
    if (!movProdutoId) return alert("Selecione um produto.");
    if (!["entrada", "saida"].includes(movTipo)) return alert("Tipo inválido.");
    const qtd = toInt(movQuantidade);
    if (!(qtd > 0)) return alert("Informe uma quantidade > 0.");

    try {
      const payload = {
        produto_id: Number(movProdutoId),
        usuario_id: user.id,
        tipo: movTipo,
        quantidade: qtd,
        data_movimentacao: notEmpty(movData) ? new Date(movData).toISOString() : null,
        observacao: notEmpty(movObs) ? movObs.trim() : null,
      };
      const { data } = await API.post("/movimentacoes", payload);
      alert("Movimentação registrada com sucesso.");
      if (data?.produto?.abaixo_do_minimo) {
        alert("⚠️ Estoque abaixo do mínimo para este produto!");
      }
      await carregarProdutos();
      setMovQuantidade("");
      setMovObs("");
    } catch (e) {
      alert(e?.response?.data?.error || "Erro ao registrar movimentação");
    }
  };

  // -------------------------------
  // Render
  // -------------------------------
  return (
    <div className="app-container">
      <h1>Gestão de Ferramentas / Estoque</h1>

      {/* LOGIN (4) */}
      {view === "login" && (
        <section className="form" aria-label="login">
          <h2>Login</h2>
          <div className="input-container">
            <label>Email</label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="ana@example.com"
              required
            />
          </div>
          <div className="input-container">
            <label>Senha</label>
            <input
              type="password"
              value={loginSenha}
              onChange={(e) => setLoginSenha(e.target.value)}
              placeholder="•••••••"
              required
            />
          </div>
          <button onClick={doLogin}>Entrar</button>
        </section>
      )}

      {/* HOME (5) */}
      {view === "home" && (
        <section className="form" aria-label="home">
          <h2>Olá, {user?.nome}</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setView("produtos")}>Cadastro de Ferramenta</button>
            <button onClick={() => setView("estoque")}>Gestão de Estoque</button>
            <button onClick={logout}>Sair</button>
          </div>
        </section>
      )}

      {/* CADASTRO DE PRODUTO (6) */}
      {view === "produtos" && (
        <section className="form" aria-label="produtos">
          <h2>Cadastro de Ferramenta</h2>

          {/* busca */}
          <form onSubmit={buscar} style={{ width: "100%", display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Buscar por nome (ex.: furadeira)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit">Buscar</button>
            <button type="button" onClick={() => { setQ(""); carregarProdutos(""); }}>
              Limpar
            </button>
          </form>

          {/* form criar/editar */}
          <div style={{ width: "100%", display: "grid", gap: 8 }}>
            <div className="input-container">
              <label>Nome</label>
              <input
                type="text"
                value={produtoForm.nome}
                onChange={(e) => setProdutoForm((s) => ({ ...s, nome: e.target.value }))}
                placeholder='ex.: "Furadeira Bosch"'
                required
              />
            </div>
            <div className="input-container">
              <label>Marca</label>
              <input
                type="text"
                value={produtoForm.marca}
                onChange={(e) => setProdutoForm((s) => ({ ...s, marca: e.target.value }))}
                placeholder='ex.: "Bosch"'
                required
              />
            </div>
            <div className="input-container">
              <label>Modelo</label>
              <input
                type="text"
                value={produtoForm.modelo}
                onChange={(e) => setProdutoForm((s) => ({ ...s, modelo: e.target.value }))}
                placeholder='ex.: "GSR 1000"'
                required
              />
            </div>
            <div className="input-container">
              <label>Tipo de Material</label>
              <input
                type="text"
                value={produtoForm.tipo_material}
                onChange={(e) => setProdutoForm((s) => ({ ...s, tipo_material: e.target.value }))}
                placeholder='ex.: "Aço"'
              />
            </div>
            <div className="input-container">
              <label>Tamanho</label>
              <input
                type="text"
                value={produtoForm.tamanho}
                onChange={(e) => setProdutoForm((s) => ({ ...s, tamanho: e.target.value }))}
                placeholder='ex.: "Médio"'
              />
            </div>
            <div className="input-container">
              <label>Peso</label>
              <input
                type="text"
                value={produtoForm.peso}
                onChange={(e) => setProdutoForm((s) => ({ ...s, peso: e.target.value }))}
                placeholder='ex.: "1.5kg"'
              />
            </div>
            <div className="input-container">
              <label>Tensão Elétrica</label>
              <input
                type="text"
                value={produtoForm.tensao_eletrica}
                onChange={(e) => setProdutoForm((s) => ({ ...s, tensao_eletrica: e.target.value }))}
                placeholder='ex.: "220V"'
              />
            </div>
            <div className="input-container">
              <label>Quantidade</label>
              <input
                type="number"
                value={produtoForm.quantidade}
                onChange={(e) => setProdutoForm((s) => ({ ...s, quantidade: e.target.value }))}
                min={0}
              />
            </div>
            <div className="input-container">
              <label>Estoque mínimo</label>
              <input
                type="number"
                value={produtoForm.estoque_minimo}
                onChange={(e) => setProdutoForm((s) => ({ ...s, estoque_minimo: e.target.value }))}
                min={0}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {editandoId ? (
                <>
                  <button type="button" onClick={salvarProduto}>Salvar alterações</button>
                  <button type="button" onClick={limparProdutoForm}>Cancelar</button>
                </>
              ) : (
                <button type="button" onClick={criarProduto}>Cadastrar ferramenta</button>
              )}
              <button type="button" onClick={() => setView("home")}>Voltar</button>
            </div>
          </div>

          {/* listagem */}
          <div style={{ width: "100%", marginTop: 10 }}>
            {loadingProdutos && <p>Carregando...</p>}
            {!loadingProdutos && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Marca</th>
                    <th>Modelo</th>
                    <th>Tipo</th>
                    <th>Tamanho</th>
                    <th>Peso</th>
                    <th>Tensão</th>
                    <th>Qtd</th>
                    <th>Mín</th>
                    <th>Alerta</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {produtosOrdenados.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nome}</td>
                      <td>{p.marca}</td>
                      <td>{p.modelo}</td>
                      <td>{p.tipo_material}</td>
                      <td>{p.tamanho}</td>
                      <td>{p.peso}</td>
                      <td>{p.tensao_eletrica}</td>
                      <td style={{ textAlign: "center" }}>{p.quantidade}</td>
                      <td style={{ textAlign: "center" }}>{p.estoque_minimo}</td>
                      <td style={{ textAlign: "center" }}>
                        {p.quantidade < p.estoque_minimo ? "⚠️" : "—"}
                      </td>
                      <td style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button type="button" onClick={() => iniciarEdicao(p)}>Editar</button>
                        <button type="button" onClick={() => excluirProduto(p.id)}>Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {produtosOrdenados.length === 0 && (
                    <tr><td colSpan={11}>Nenhuma ferramenta.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* GESTÃO DE ESTOQUE (7) */}
      {view === "estoque" && (
        <section className="form" aria-label="estoque">
          <h2>Gestão de Estoque</h2>

          {/* listagem alfabética */}
          <div style={{ width: "100%" }}>
            <h3>Ferramentas (ordem alfabética)</h3>
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {produtosOrdenados.map((p) => (
                <li key={p.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ width: "30%" }}>{p.nome}</span>
                  <span>Marca: <b>{p.marca}</b></span>
                  <span>Modelo: <b>{p.modelo}</b></span>
                  <span>Qtd: <b>{p.quantidade}</b></span>
                  <span>Mín: <b>{p.estoque_minimo}</b></span>
                  <span>{p.quantidade < p.estoque_minimo ? "⚠️ Baixo" : ""}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* formulário de movimentação */}
          <div style={{ width: "100%", marginTop: 10 }}>
            <h3>Registrar movimentação</h3>
            <div className="input-container">
              <label>Ferramenta</label>
              <select
                value={movProdutoId}
                onChange={(e) => setMovProdutoId(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 5, border: "1px solid #ccc" }}
              >
                <option value="">Selecione...</option>
                {produtosOrdenados.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome} ({p.marca} - {p.modelo})</option>
                ))}
              </select>
            </div>

            <div className="input-container">
              <label>Tipo</label>
              <div style={{ display: "flex", gap: 10 }}>
                <label><input type="radio" name="tipo" value="entrada" checked={movTipo === "entrada"} onChange={(e) => setMovTipo(e.target.value)} /> Entrada</label>
                <label><input type="radio" name="tipo" value="saida" checked={movTipo === "saida"} onChange={(e) => setMovTipo(e.target.value)} /> Saída</label>
              </div>
            </div>

            <div className="input-container">
              <label>Quantidade</label>
              <input
                type="number"
                min={1}
                value={movQuantidade}
                onChange={(e) => setMovQuantidade(e.target.value)}
                placeholder="Ex.: 5"
              />
            </div>

            <div className="input-container">
              <label>Data da movimentação</label>
              <input
                type="date"
                value={movData}
                onChange={(e) => setMovData(e.target.value)}
              />
            </div>

            <div className="input-container">
              <label>Observação (opcional)</label>
              <input
                type="text"
                value={movObs}
                onChange={(e) => setMovObs(e.target.value)}
                placeholder="Ex.: retirada para manutenção"
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={enviarMovimentacao}>Registrar</button>
              <button type="button" onClick={() => setView("home")}>Voltar</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}