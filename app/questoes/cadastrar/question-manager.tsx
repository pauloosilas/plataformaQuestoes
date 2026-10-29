"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Discipline = { name: string; subitems: string[] };
type ExistingTopic = { key: string; title: string };

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
  const [existingTopics, setExistingTopics] = useState<ExistingTopic[]>([]);
  const [selectedTopicKey, setSelectedTopicKey] = useState("");
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedDiscipline = useMemo(
    () => disciplines.find((discipline) => discipline.name === disciplineName),
    [disciplines, disciplineName],
  );

  useEffect(() => {
    if (!disciplineName || (selectedDiscipline?.subitems.length && !subitem)) {
      setExistingTopics([]);
      setSelectedTopicKey("");
      setTopicsLoading(false);
      setTopicsError("");
      return;
    }

    const controller = new AbortController();
    async function loadTopics() {
      setTopicsLoading(true);
      setTopicsError("");
      setSelectedTopicKey("");
      try {
        const params = new URLSearchParams({ discipline: disciplineName, subitem });
        const response = await fetch(`/api/questions?${params.toString()}`, { signal: controller.signal });
        const result = (await response.json()) as { topics?: ExistingTopic[]; message?: string };
        if (!response.ok) throw new Error(result.message ?? "Não foi possível carregar os assuntos cadastrados.");
        setExistingTopics(result.topics ?? []);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setExistingTopics([]);
        setTopicsError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os assuntos cadastrados.");
      } finally {
        if (!controller.signal.aborted) setTopicsLoading(false);
      }
    }

    void loadTopics();
    return () => controller.abort();
  }, [disciplineName, selectedDiscipline, subitem]);

  function selectTopic(topic: ExistingTopic) {
    let questions = [{
      question: "Assinale a alternativa correta.",
      options: ["A - primeira alternativa", "B - segunda alternativa", "C - terceira alternativa", "D - quarta alternativa", "E - quinta alternativa"],
      correct: 1,
      explanation: "Explique por que a alternativa está correta.",
    }];

    if (selectedTopicKey === topic.key) {
      try {
        const parsed = JSON.parse(topicsJson) as { topics?: Record<string, { questions?: typeof questions }> };
        const currentQuestions = parsed.topics?.[topic.key]?.questions;
        if (currentQuestions) questions = currentQuestions;
      } catch {
        // Keep a valid question template if the current JSON is being edited.
      }
    }

    setSelectedTopicKey(topic.key);
    setTopicsJson(JSON.stringify({ topics: { [topic.key]: { title: topic.title, questions } } }, null, 2));
    setMessage("");
  }

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
      if (response.ok) {
        try {
          const parsed = JSON.parse(topicsJson) as { topics?: Record<string, { title?: string }> };
          const savedTopics = Object.entries(parsed.topics ?? {}).flatMap(([key, topic]) => typeof topic.title === "string" ? [{ key, title: topic.title }] : []);
          setExistingTopics((current) => {
            const merged = new Map(current.map((topic) => [topic.key, topic]));
            savedTopics.forEach((topic) => merged.set(topic.key, topic));
            return [...merged.values()].sort((left, right) => left.title.localeCompare(right.title, "pt-BR"));
          });
        } catch {
          // The API has already validated and saved the submitted JSON.
        }
      }
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
                <select id="question-discipline" value={disciplineName} onChange={(event) => { setDisciplineName(event.target.value); setSubitem(""); setTopicsJson(exampleJson); }} required>
                  <option value="" disabled>Selecione uma disciplina</option>
                  {disciplines.map((discipline) => <option key={discipline.name} value={discipline.name}>{discipline.name}</option>)}
                </select>
              </div>

              {selectedDiscipline?.subitems.length ? <div className="question-field">
                <label htmlFor="question-subitem">Subitem <span>obrigatório</span></label>
                <select id="question-subitem" value={subitem} onChange={(event) => { setSubitem(event.target.value); setTopicsJson(exampleJson); }} required>
                  <option value="" disabled>Selecione um subitem</option>
                  {selectedDiscipline.subitems.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div> : <div className="question-target-note"><span>✦</span><p>Esta disciplina não tem subitens. O lote será associado diretamente a ela.</p></div>}
            </div>

            {selectedDiscipline && (!selectedDiscipline.subitems.length || subitem) && <section className="existing-topics-picker" aria-labelledby="existing-topics-title">
              <div className="existing-topics-heading"><div><h3 id="existing-topics-title">Assuntos cadastrados</h3><p>Selecione um assunto para usar sua chave no JSON.</p></div>{!topicsLoading && <span>{existingTopics.length}</span>}</div>
              {topicsLoading ? <p className="existing-topics-feedback" role="status">Carregando assuntos...</p>
                : topicsError ? <p className="existing-topics-feedback existing-topics-error" role="alert">{topicsError}</p>
                  : existingTopics.length ? <div className="existing-topics-list">
                    {existingTopics.map((topic) => <button type="button" key={topic.key} className={`existing-topic-button ${selectedTopicKey === topic.key ? "existing-topic-selected" : ""}`} aria-pressed={selectedTopicKey === topic.key} onClick={() => selectTopic(topic)}>
                      <strong>{topic.title}</strong><code>{topic.key}</code>
                    </button>)}
                  </div> : <p className="existing-topics-feedback">Nenhum assunto cadastrado para esta seleção.</p>}
            </section>}

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
