"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function DisciplineManager() {
  const [name, setName] = useState("");
  const [subitem, setSubitem] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSaving(true);

    try {
      const response = await fetch("/api/disciplines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subitem }),
      });
      const result = (await response.json()) as { message?: string };
      setError(!response.ok);
      setMessage(result.message ?? "Não foi possível cadastrar o item.");

      if (response.ok) {
        if (subitem.trim()) setSubitem("");
        else setName("");
      }
    } catch {
      setError(true);
      setMessage("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="manager-page">
      <header className="manager-topbar">
        <Link className="manager-brand" href="/" prefetch={false}><span>✳</span> Trilha <small>ESTUDOS</small></Link>
        <Link className="manager-back" href="/" prefetch={false}>← <span>Voltar ao painel</span></Link>
      </header>

      <div className="manager-content">
        <div className="eyebrow"><span className="eyebrow-dot" /> ORGANIZE SEU PLANO DE ESTUDOS</div>
        <div className="manager-heading"><div><h1>Disciplinas</h1><p>Adicione matérias e organize os assuntos do seu jeito.</p></div><span className="manager-heading-mark">✳</span></div>

        <section className="manager-card">
          <div className="manager-card-heading"><span className="manager-card-icon">＋</span><div><h2>Novo cadastro</h2><p>Crie um item ou adicione um subitem a um item existente.</p></div></div>

          <form className="manager-form" onSubmit={handleSubmit}>
            <label htmlFor="discipline-name">Item <span>obrigatório</span></label>
            <input id="discipline-name" name="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Ciências da Natureza" maxLength={80} minLength={2} required />
            <small className="field-hint">Para criar outro subitem, informe novamente o nome do item existente.</small>

            <label htmlFor="subitem-name">Subitem <span>opcional</span></label>
            <input id="subitem-name" name="subitem" value={subitem} onChange={(event) => setSubitem(event.target.value)} placeholder="Ex.: Biologia" maxLength={80} minLength={2} />
            <small className="field-hint">Sem subitem, será criado somente o item principal.</small>

            {message && <div className={`manager-message ${error ? "manager-error" : "manager-success"}`} role={error ? "alert" : "status"}>{message}</div>}

            <button className="manager-submit" type="submit" disabled={saving}>{saving ? "Salvando..." : "Cadastrar disciplina"}<span>→</span></button>
          </form>
        </section>

        <div className="manager-note"><span>✦</span><p>Os cadastros aparecem automaticamente no menu lateral após salvar.</p></div>
        <footer className="page-footer"><span>Feito para aprender com leveza.</span><span>UM DIA DE CADA VEZ <span className="footer-spark">✳</span></span></footer>
      </div>
    </main>
  );
}
