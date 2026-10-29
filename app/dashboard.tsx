"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Discipline = { name: string; subitems: string[] };
type QuestionTopic = { discipline: string; normalizedDiscipline: string; normalizedSubitem: string; key: string; title: string; questionCount: number };
type QuizQuestion = { question: string; options: string[]; correct: number; explanation: string };
type QuizTopic = { key: string; title: string; questions: QuizQuestion[] };

const disciplineStyles: Record<string, { icon: string; color: string }> = {
  Português: { icon: "Aa", color: "lavender" },
  Matemática: { icon: "＋", color: "mint" },
  "Raciocínio Lógico": { icon: "◇", color: "peach" },
  Contagem: { icon: "CT", color: "sky" },
};
const palette = ["lavender", "mint", "peach", "sky"];

function normalizeName(value: string) {
  return value.trim().normalize("NFC").toLocaleLowerCase("pt-BR");
}

function shuffledIndices(length: number) {
  const indices = Array.from({ length }, (_, index) => index);
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
  }
  return indices;
}

const allowedQuestionTags = new Set([
  "br", "hr", "u", "strong", "b", "em", "i", "p", "div", "span",
  "ul", "ol", "li", "blockquote", "sup", "sub", "small", "code", "pre", "mark", "s", "del",
]);
const voidQuestionTags = new Set(["br", "hr"]);
const blockedQuestionTags = new Set(["script", "style", "iframe", "object", "embed", "svg", "math", "template"]);

function escapeHtmlText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeQuestionMarkup(markup: string): string {
  const document = new DOMParser().parseFromString(markup, "text/html");

  function serialize(node: Node): string {
    if (node.nodeType === 3) return escapeHtmlText(node.textContent ?? "");
    if (node.nodeType !== 1) return "";

    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    if (blockedQuestionTags.has(tag)) return "";

    const content = Array.from(element.childNodes, serialize).join("");
    if (!allowedQuestionTags.has(tag)) return content;
    if (voidQuestionTags.has(tag)) return `<${tag}>`;

    // Rebuild tags without attributes so event handlers, URLs and inline styles cannot run.
    return `<${tag}>${content}</${tag}>`;
  }

  return Array.from(document.body.childNodes, serialize).join("");
}

function QuestionMarkup({ html, className }: { html: string; className: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeQuestionMarkup(html) }} />;
}

function styleFor(discipline: Discipline, index: number) {
  return disciplineStyles[discipline.name] ?? { icon: discipline.name.slice(0, 2).toLocaleUpperCase("pt-BR"), color: palette[index % palette.length] };
}

const disciplineColors: Record<string, string> = {
  Português: "lavender",
  Matemática: "mint",
  "Raciocínio Lógico": "peach",
  "Código de Posturas": "sky",
  "Código de Obras": "sky",
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const shared = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "home") return <svg {...shared}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg>;
  if (name === "book") return <svg {...shared}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" /><path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20M8 7h8" /></svg>;
  if (name === "chart") return <svg {...shared}><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 5-6" /></svg>;
  if (name === "building") return <svg {...shared}><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 9h.01M15 9h.01M9 12h.01M15 12h.01" /></svg>;
  if (name === "search") return <svg {...shared}><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.3 4.3" /></svg>;
  if (name === "moon") return <svg {...shared}><path d="M20.8 14.2A8.5 8.5 0 0 1 9.8 3.2a8.7 8.7 0 1 0 11 11z" /></svg>;
  if (name === "sun") return <svg {...shared}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>;
  if (name === "menu") return <svg {...shared}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
  if (name === "arrow") return <svg {...shared}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
  if (name === "chevron") return <svg {...shared}><path d="m9 18 6-6-6-6" /></svg>;
  if (name === "sparkle") return <svg {...shared}><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></svg>;
  return <svg {...shared}><path d="M12 3v18M3 12h18" /></svg>;
}

export default function Home({ disciplines, questionTopics }: { disciplines: Discipline[]; questionTopics: QuestionTopic[] }) {
  const router = useRouter();
  const [active, setActive] = useState("Início");
  const [openDiscipline, setOpenDiscipline] = useState("Contagem");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleTopics, setVisibleTopics] = useState(questionTopics);
  const [deleteCandidate, setDeleteCandidate] = useState<QuestionTopic | null>(null);
  const [deleteSubitem, setDeleteSubitem] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [quiz, setQuiz] = useState<QuizTopic | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [randomMode, setRandomMode] = useState(false);
  const [questionOrder, setQuestionOrder] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const activeSubitemParent = disciplines.find((discipline) => discipline.subitems.includes(active));
  const activeDisciplineName = activeSubitemParent?.name ?? active;
  const activeSubitemName = activeSubitemParent ? active : "";
  const topics = visibleTopics.filter((topic) =>
    topic.normalizedDiscipline === normalizeName(activeDisciplineName)
    && topic.normalizedSubitem === normalizeName(activeSubitemName),
  );

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("trilha-theme");
    if (savedTheme === "dark") setDarkMode(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    window.localStorage.setItem("trilha-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  function navigate(label: string) {
    setActive(label);
    setSelectedTopic("");
    setQuiz(null);
    setQuizError("");
    setQuestionIndex(0);
    setQuestionOrder([]);
    setAnswers({});
    setQuery("");
    setMobileOpen(false);
  }

  async function openTopic(topic: QuestionTopic) {
    setSelectedTopic(topic.title);
    setQuiz(null);
    setQuizError("");
    setQuizLoading(true);
    setQuestionIndex(0);
    setQuestionOrder([]);
    setAnswers({});

    const params = new URLSearchParams({
      discipline: activeDisciplineName,
      subitem: activeSubitemName,
      key: topic.key,
    });

    try {
      const response = await fetch(`/api/questions?${params.toString()}`);
      const result = (await response.json()) as { topic?: QuizTopic; message?: string };
      if (!response.ok || !result.topic) throw new Error(result.message ?? "Não foi possível carregar esse assunto.");
      setQuiz(result.topic);
      setQuestionOrder(randomMode
        ? shuffledIndices(result.topic.questions.length)
        : result.topic.questions.map((_, index) => index));
    } catch (error) {
      setQuizError(error instanceof Error ? error.message : "Não foi possível carregar as questões. Tente novamente.");
    } finally {
      setQuizLoading(false);
    }
  }

  function closeQuiz() {
    setQuiz(null);
    setQuizError("");
    setSelectedTopic("");
    setQuestionIndex(0);
    setQuestionOrder([]);
    setAnswers({});
  }

  function changeRandomMode(enabled: boolean) {
    setRandomMode(enabled);
    if (!quiz) return;

    const currentQuestion = questionOrder[questionIndex] ?? questionIndex;
    const nextOrder = enabled
      ? shuffledIndices(quiz.questions.length)
      : quiz.questions.map((_, index) => index);
    setQuestionOrder(nextOrder);
    const nextPosition = nextOrder.indexOf(currentQuestion);
    setQuestionIndex(nextPosition >= 0 ? nextPosition : 0);
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  }

  async function removeTopic() {
    if (!deleteCandidate) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/questions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discipline: deleteCandidate.discipline, subitem: deleteSubitem, key: deleteCandidate.key }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Não foi possível remover as questões.");
      setVisibleTopics((current) => current.filter((topic) => !(
        topic.normalizedDiscipline === deleteCandidate.normalizedDiscipline
        && topic.normalizedSubitem === deleteCandidate.normalizedSubitem
        && topic.key === deleteCandidate.key
      )));
      setDeleteCandidate(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Não foi possível remover as questões.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="app-shell">
      {mobileOpen && <button className="sidebar-scrim" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="#inicio" onClick={() => navigate("Início")}>
          <span className="brand-mark"><Icon name="book" size={22} /></span>
          <span className="brand-copy"><strong>Trilha</strong><small>ESTUDOS</small></span>
        </a>

        <div className="side-label">MENU PRINCIPAL</div>
        <nav className="side-nav" aria-label="Navegação principal">
          <button className={`nav-item ${active === "Início" ? "selected" : ""}`} onClick={() => navigate("Início")}><Icon name="home" /><span>Início</span></button>
          <div className="side-label subjects-label">MATÉRIAS</div>
          {disciplines.map((discipline, index) => {
            const style = styleFor(discipline, index);
            const hasSubitems = discipline.subitems.length > 0;
            const isCurrent = active === discipline.name || discipline.subitems.includes(active);

            if (!hasSubitems) {
              return <button key={discipline.name} className={`nav-item ${active === discipline.name ? "selected" : ""}`} onClick={() => navigate(discipline.name)}>
                <span className={`nav-icon ${style.color}`}>{style.icon}</span><span>{discipline.name}</span>
              </button>;
            }

            return <div key={discipline.name}>
              <button className={`nav-item ${isCurrent ? "selected" : ""}`} aria-expanded={openDiscipline === discipline.name} onClick={() => { setOpenDiscipline(openDiscipline === discipline.name ? "" : discipline.name); navigate(discipline.name); }}>
                <span className={`nav-icon ${style.color}`}>{style.icon}</span><span>{discipline.name}</span><span className={`nav-chevron ${openDiscipline === discipline.name ? "turned" : ""}`}><Icon name="chevron" size={15} /></span>
              </button>
              {openDiscipline === discipline.name && <div className="subnav">{discipline.subitems.map((item) => <button key={item} className={`subnav-item ${active === item ? "sub-selected" : ""}`} onClick={() => navigate(item)}><span className="subnav-dot" />{item}</button>)}</div>}
            </div>;
          })}
          <Link className={`nav-item manage-nav-item ${active === "Gerenciar disciplinas" ? "selected" : ""}`} href="/disciplinas" onClick={() => setMobileOpen(false)}><span className="nav-icon manage-nav-icon">＋</span><span>Gerenciar disciplinas</span></Link>
          <Link className="nav-item manage-nav-item manage-questions-nav-item" href="/questoes/cadastrar" onClick={() => setMobileOpen(false)}><span className="nav-icon manage-nav-icon">↥</span><span>Cadastrar questões</span></Link>
        </nav>

        <div className="sidebar-bottom">
          <div className="focus-card"><div className="focus-icon"><Icon name="sparkle" size={17} /></div><strong>Um passo de cada vez</strong><p>Pequenos estudos, grandes conquistas.</p><div className="focus-progress"><span /></div><small>Seu ritmo, seu caminho.</small></div>
          <div className="profile"><div className="avatar">P</div><div className="profile-copy"><strong>Meu espaço</strong><span>Estudante</span></div><button className="sign-out" onClick={signOut}>Sair</button></div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Abrir menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Icon name="menu" /></button>
          <div className="breadcrumbs"><span>Meu espaço</span><Icon name="chevron" size={14} /><strong>{active}</strong></div>
          <label className="search-box"><Icon name="search" size={18} /><input aria-label={active === "Início" ? "Buscar matéria" : "Buscar assunto"} placeholder={active === "Início" ? "Buscar matéria..." : "Buscar assunto..."} value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></label>
          <button className="theme-toggle" type="button" onClick={() => setDarkMode(!darkMode)} aria-label={darkMode ? "Ativar tema claro" : "Ativar tema escuro"} title={darkMode ? "Ativar tema claro" : "Ativar tema escuro"}><Icon name={darkMode ? "sun" : "moon"} size={17} /><span>{darkMode ? "Claro" : "Escuro"}</span></button>
          <div className="top-avatar" aria-label="Perfil">P</div>
        </header>

        <div className="page-content">
          {active === "Início" ? <>
          <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> SEU CANTINHO DE APRENDIZADO</div><h1>Olá, estudante <span>✳</span></h1><p className="welcome-subtitle">Que tal aprender algo novo hoje?</p></div><div className="date-chip"><span className="date-dot" /> SUA JORNADA CONTINUA</div></section>

          <section className="hero-card"><div className="hero-content"><div className="hero-kicker"><span>✦</span> UM BOM COMEÇO</div><h2>Todo grande caminho<br />começa com <em>uma questão.</em></h2><p>Escolha uma matéria e transforme alguns minutos<br className="desktop-break" /> em mais confiança para o seu futuro.</p><button className="hero-button" onClick={() => navigate("Português")}>Explorar matérias <Icon name="arrow" size={17} /></button></div><div className="hero-art" aria-hidden="true"><div className="art-sun" /><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-book"><span /><span /><span /><span /></div><div className="art-star star-one">✳</div><div className="art-star star-two">✦</div><div className="art-orbit-dot" /></div><div className="hero-index">01 <span> / 04</span></div></section>

          <section className="subjects-section"><div className="section-heading"><div><div className="eyebrow section-eyebrow">POR ONDE VAMOS?</div><h2>Suas matérias</h2></div><span className="section-count">{disciplines.length} áreas para explorar</span></div>
            <div className="subject-grid">
              {disciplines.filter((discipline) => discipline.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))).map((discipline, index) => {
                const style = styleFor(discipline, index);
                const destination = discipline.subitems[0] ?? discipline.name;
                return <button className="subject-card" key={discipline.name} onClick={() => { if (discipline.subitems.length) setOpenDiscipline(discipline.name); navigate(destination); }}><div className="subject-card-top"><span className={`subject-icon ${style.color}`}>{style.icon}</span><span className="card-arrow"><Icon name="arrow" size={17} /></span></div><div className="subject-number">{String(index + 1).padStart(2, "0")} — DISCIPLINA</div><h3>{discipline.name}</h3><p>{discipline.subitems.length ? `${discipline.subitems.length} subitens` : "Conteúdos de estudo"} <span>·</span> no seu ritmo</p><div className="card-bottom"><span>{discipline.subitems.length ? "Ver primeiro assunto" : "Ver assuntos"}</span><span className="card-underline" /></div></button>;
              })}
            </div>
          </section>

          <section className="lower-row"><div className="tip-card"><div className="tip-icon">✳</div><div><span className="tip-label">LEMBRETE AMIGO</span><p>Constância vale mais do que pressa.<br /><strong>Você está no caminho certo.</strong></p></div><span className="tip-decoration">〰</span></div><div className="quote-card"><span className="quote-mark">“</span><p>O aprendizado é uma jornada,<br />não uma linha de chegada.</p><span className="quote-credit">UM DIA DE CADA VEZ</span></div></section>

          <footer className="page-footer"><span>Feito para aprender com leveza.</span><span>UM DIA DE CADA VEZ <span className="footer-spark">✳</span></span></footer>
          </> : <DisciplinePage
            name={active}
            topics={topics}
            color={disciplineColors[active] ?? "sky"}
            query={query}
            selectedTopic={selectedTopic}
            quiz={quiz}
            quizLoading={quizLoading}
            quizError={quizError}
            questionIndex={questionIndex}
            questionOrder={questionOrder}
            randomMode={randomMode}
            answers={answers}
            deleteCandidate={deleteCandidate}
            deleteLoading={deleteLoading}
            deleteError={deleteError}
            onOpenTopic={openTopic}
            onRequestDelete={(topic) => { setDeleteCandidate(topic); setDeleteSubitem(activeSubitemName); setDeleteError(""); }}
            onCancelDelete={() => { if (!deleteLoading) { setDeleteCandidate(null); setDeleteError(""); } }}
            onConfirmDelete={removeTopic}
            onSelectAnswer={(answer) => {
              const originalIndex = questionOrder[questionIndex] ?? questionIndex;
              setAnswers((current) => ({ ...current, [originalIndex]: answer }));
            }}
            onQuestionChange={setQuestionIndex}
            onRandomModeChange={changeRandomMode}
            onCloseQuiz={closeQuiz}
          />}
        </div>
      </main>
    </div>
  );
}

function DisciplinePage({
  name,
  topics,
  color,
  query,
  selectedTopic,
  quiz,
  quizLoading,
  quizError,
  questionIndex,
  questionOrder,
  randomMode,
  answers,
  deleteCandidate,
  deleteLoading,
  deleteError,
  onOpenTopic,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onSelectAnswer,
  onQuestionChange,
  onRandomModeChange,
  onCloseQuiz,
}: {
  name: string;
  topics: QuestionTopic[];
  color: string;
  query: string;
  selectedTopic: string;
  quiz: QuizTopic | null;
  quizLoading: boolean;
  quizError: string;
  questionIndex: number;
  questionOrder: number[];
  randomMode: boolean;
  answers: Record<number, number>;
  deleteCandidate: QuestionTopic | null;
  deleteLoading: boolean;
  deleteError: string;
  onOpenTopic: (topic: QuestionTopic) => void;
  onRequestDelete: (topic: QuestionTopic) => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onSelectAnswer: (answer: number) => void;
  onQuestionChange: (index: number) => void;
  onRandomModeChange: (enabled: boolean) => void;
  onCloseQuiz: () => void;
}) {
  const filteredTopics = topics.filter((topic) => topic.title.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  const originalQuestionIndex = questionOrder[questionIndex] ?? questionIndex;
  const currentQuestion = quiz?.questions[originalQuestionIndex];
  const selectedAnswer = answers[originalQuestionIndex];
  const answered = selectedAnswer !== undefined;
  const answeredCount = quiz ? quiz.questions.reduce((count, _, index) => count + (answers[index] !== undefined ? 1 : 0), 0) : 0;
  const isLastQuestion = quiz ? questionIndex === quiz.questions.length - 1 : false;

  return (
    <section className="discipline-page">
      <div className="eyebrow"><span className="eyebrow-dot" /> SUA PRÓXIMA SESSÃO DE ESTUDOS</div>
      <div className="discipline-heading">
        <div><h1>{name}</h1><p>Escolha um assunto para começar a estudar.</p></div>
        <span className="discipline-badge">{filteredTopics.length} {filteredTopics.length === 1 ? "assunto" : "assuntos"}</span>
      </div>

      {quizLoading && <div className="topics-empty quiz-loading" role="status"><span className="quiz-spinner" />Carregando questões de “{selectedTopic}”...</div>}
      {!quizLoading && quizError && <div className="quiz-error" role="alert"><p>{quizError}</p><button type="button" onClick={onCloseQuiz}>Voltar aos assuntos</button></div>}

      {!quizLoading && quiz && currentQuestion && <section className="question-session" aria-label={`Questões de ${quiz.title}`}>
        <div className="question-session-top"><button type="button" className="quiz-back-button" onClick={onCloseQuiz}>← <span>Voltar aos assuntos</span></button><span>{quiz.title}</span></div>
        <div className="question-progress-heading"><span>QUESTÃO {String(questionIndex + 1).padStart(2, "0")}</span><span>{answeredCount} de {quiz.questions.length} respondidas</span></div>
        <div className="question-progress-track" role="progressbar" aria-label="Questões respondidas" aria-valuemin={0} aria-valuemax={quiz.questions.length} aria-valuenow={answeredCount}><span style={{ width: `${(answeredCount / quiz.questions.length) * 100}%` }} /></div>
        <article className="question-content">
          <div className="question-mode-row">
            <span className="question-mode-copy" id="random-mode-label"><strong>Modo aleatório</strong><small>Embaralhar a ordem das questões</small></span>
            <button type="button" role="switch" aria-checked={randomMode} aria-labelledby="random-mode-label" className={`mode-switch ${randomMode ? "mode-switch-on" : ""}`} onClick={() => onRandomModeChange(!randomMode)}>
              <span className="mode-switch-thumb" />
            </button>
          </div>
          <QuestionMarkup className="question-title" html={currentQuestion.question} />
          <div className="question-options" role="group" aria-label="Alternativas">
            {currentQuestion.options.map((option, index) => {
              const isCorrect = answered && index === currentQuestion.correct;
              const isWrongSelection = answered && selectedAnswer === index && index !== currentQuestion.correct;
              return <button
                type="button"
                key={`${index}-${option}`}
                className={`question-option ${isCorrect ? "option-correct" : ""} ${isWrongSelection ? "option-wrong" : ""} ${answered ? "option-answered" : ""}`}
                onClick={() => { if (!answered) onSelectAnswer(index); }}
                disabled={answered}
                aria-pressed={selectedAnswer === index}
              ><span className="option-letter">{String.fromCharCode(65 + index)}</span><QuestionMarkup className="option-text" html={option} /><span className="option-result" aria-hidden="true">{isCorrect ? "✓" : isWrongSelection ? "×" : ""}</span></button>;
            })}
          </div>

          {answered && <section className="question-explanation" aria-live="polite">
            <div className="explanation-heading"><span>✦</span><h3>Explicação</h3></div>
            <QuestionMarkup className="question-explanation-text" html={currentQuestion.explanation} />
          </section>}
        </article>
        <div className="question-navigation">
          <button type="button" className="question-previous" onClick={() => onQuestionChange(questionIndex - 1)} disabled={questionIndex === 0}>← <span>Anterior</span></button>
          <button type="button" className="question-next" onClick={() => isLastQuestion ? onCloseQuiz() : onQuestionChange(questionIndex + 1)}>
            <span>{isLastQuestion ? "Concluir" : "Próxima questão"}</span>{isLastQuestion ? "✓" : <Icon name="arrow" size={16} />}
          </button>
        </div>
      </section>}

      {!quizLoading && !quizError && !quiz && filteredTopics.length > 0 ? <div className="topic-grid">
        {filteredTopics.map((topic, index) => <article className={`topic-card ${selectedTopic === topic.title ? "topic-selected" : ""}`} key={topic.key}>
          <button type="button" className="topic-delete" aria-label={`Remover todas as questões de ${topic.title}`} title="Remover assunto e questões" onClick={() => onRequestDelete(topic)}>×</button>
          <button type="button" className="topic-card-open" onClick={() => onOpenTopic(topic)}>
            <div className="topic-card-top"><span className={`topic-icon ${color}`}>{String(index + 1).padStart(2, "0")}</span></div>
            <span className="topic-label">ASSUNTO {String(index + 1).padStart(2, "0")}</span>
            <h2>{topic.title}</h2>
            <p>{topic.questionCount} {topic.questionCount === 1 ? "questão cadastrada" : "questões cadastradas"}</p>
            <span className="topic-action">Selecionar assunto <Icon name="arrow" size={15} /></span>
          </button>
        </article>)}
      </div> : null}
      {!quizLoading && !quizError && !quiz && filteredTopics.length === 0 ? <div className="topics-empty">{topics.length ? `Nenhum assunto encontrado para “${query}”.` : "Ainda não há assuntos cadastrados para esta disciplina."}</div> : null}

      {deleteCandidate && <div className="delete-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancelDelete(); }}>
        <section className="delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
          <div className="delete-dialog-icon" aria-hidden="true">×</div>
          <h2 id="delete-dialog-title">Remover assunto?</h2>
          <p id="delete-dialog-description">Deseja realmente remover <strong>{deleteCandidate.title}</strong> e todas as questões cadastradas nele? Essa ação não pode ser desfeita.</p>
          {deleteError && <p className="delete-dialog-error" role="alert">{deleteError}</p>}
          <div className="delete-dialog-actions">
            <button type="button" className="delete-cancel" onClick={onCancelDelete} disabled={deleteLoading}>Cancelar</button>
            <button type="button" className="delete-confirm" onClick={onConfirmDelete} disabled={deleteLoading}>{deleteLoading ? "Removendo..." : "Remover questões"}</button>
          </div>
        </section>
      </div>}

      <footer className="page-footer"><span>Feito para aprender com leveza.</span><span>UM DIA DE CADA VEZ <span className="footer-spark">✳</span></span></footer>
    </section>
  );
}
