"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

type Discipline = { name: string; subitems: string[] };

const exampleJson = `{
  "topics": {
    "colocacao_pronominal": {
      "title": "Colocação Pronominal",
      "questions": [
        {
          "question": "Assinale a alternativa correta.",
          "options": [
            "A - primeira alternativa",
            "B - segunda alternativa",
            "C - terceira alternativa",
            "D - quarta alternativa",
            "E - quinta alternativa"
          ],
          "correct": 1,
          "explanation": "Explique por que a alternativa está correta."
        }
      ]
    }
  }
}`;

export default function QuestionManager({ disciplines }: { disciplines: Discipline[] }) {
  const [disciplineName, setDisciplineName] = useState(disciplines[0]?.name ?? "");
  const [subitem, setSubitem] = useState("");
  const [topicsJson, setTopicsJson] = useState(exampleJson);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedDiscipline = useMemo(
    () => disciplines.find((discipline) => discipline.name === disciplineName),
    [disciplines, disciplineName],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSaving(true);

    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discipline: disciplineName, subitem, topicsJson }),
      });
      const result = (await response.json()) as { message?: string };
      setError(!response.ok);
      setMessage(result.message ?? "Não foi possível salvar as questões.");
    } catch {
      setError(true);
      setMessage("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="manager-page question-manager-page">
      <header className="manager-topbar">
        <Link className="manager-brand" href="/"><span>✳</span> Trilha <small>ESTUDOS</small></Link>
        <div className="manager-header-actions">
          <Link className="manager-back" href="/disciplinas">＋ <span>Disciplinas</span></Link>
          <Link className="manager-back" href="/">← <span>Voltar ao painel</span></Link>
        </div>
      </header>

      <div className="manager-content question-manager-content">
        <div className="eyebrow"><span className="eyebrow-dot" /> MONTE SEU BANCO DE QUESTÕES</div>
        <div className="manager-heading"><div><h1>Cadastrar questões</h1><p>Importe vários assuntos e questões em um único envio.</p></div><span className="manager-heading-mark">✳</span></div>

        <section className="manager-card question-manager-card">
          <div className="manager-card-heading"><span className="manager-card-icon">↥</span><div><h2>Novo lote</h2><p>Escolha onde o conteúdo será organizado e cole seus dados em JSON.</p></div></div>

          <form className="manager-form question-form" onSubmit={handleSubmit}>
            <div className="question-target-grid">
              <div className="question-field">
                <label htmlFor="question-discipline">Disciplina <span>obrigatória</span></label>
                <select id="question-discipline" value={disciplineName} onChange={(event) => { setDisciplineName(event.target.value); setSubitem(""); }} required>
                  <option value="" disabled>Selecione uma disciplina</option>
                  {disciplines.map((discipline) => <option key={discipline.name} value={discipline.name}>{discipline.name}</option>)}
                </select>
              </div>

              {selectedDiscipline?.subitems.length ? <div className="question-field">
                <label htmlFor="question-subitem">Subitem <span>obrigatório</span></label>
                <select id="question-subitem" value={subitem} onChange={(event) => setSubitem(event.target.value)} required>
                  <option value="" disabled>Selecione um subitem</option>
                  {selectedDiscipline.subitems.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div> : <div className="question-target-note"><span>✦</span><p>Esta disciplina não tem subitens. O lote será associado diretamente a ela.</p></div>}
            </div>

            <label htmlFor="questions-json">Assuntos e questões <span>JSON</span></label>
            <textarea id="questions-json" className="questions-json-input" value={topicsJson} onChange={(event) => setTopicsJson(event.target.value)} spellCheck={false} required aria-describedby="questions-json-hint" />
            <small id="questions-json-hint" className="field-hint">Cole um objeto no formato <code>{'{ "topics": { ... } }'}</code>. O campo <code>correct</code> usa índice começando em zero: <code>0</code> é a primeira alternativa.</small>

            {message && <div className={`manager-message ${error ? "manager-error" : "manager-success"}`} role={error ? "alert" : "status"}>{message}</div>}
            <button className="manager-submit" type="submit" disabled={saving || !disciplines.length || !disciplineName || Boolean(selectedDiscipline?.subitems.length && !subitem)}>
              {saving ? "Salvando lote..." : "Salvar questões"}<span>→</span>
            </button>
          </form>
        </section>

        <div className="manager-note question-manager-note"><span>✦</span><p>Use uma chave única para cada assunto, como <code>colocacao_pronominal</code>. Se a mesma chave já existir nessa disciplina e subitem, o assunto será atualizado com o lote enviado.</p></div>

        <details className="question-format-details">
          <summary>Ver exemplo do formato JSON</summary>
          <pre>{exampleJson}</pre>
        </details>
        <footer className="page-footer"><span>Feito para aprender com leveza.</span><span>UM DIA DE CADA VEZ <span className="footer-spark">✳</span></span></footer>
      </div>
    </main>
  );
}
