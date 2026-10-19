import { getCurrentUser } from "@/lib/auth";
import { listDisciplines } from "@/lib/disciplines";
import { listQuestionTopicSummaries } from "@/lib/questions";
import Dashboard from "./dashboard";
import LoginScreen from "./login-screen";

export const instant = false;

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) return <LoginScreen />;

  let disciplines: Awaited<ReturnType<typeof listDisciplines>>;
  let questionTopics: Awaited<ReturnType<typeof listQuestionTopicSummaries>>;
  try {
    [disciplines, questionTopics] = await Promise.all([listDisciplines(), listQuestionTopicSummaries()]);
  } catch (error) {
    console.error("Falha ao carregar disciplinas ou assuntos do MongoDB:", error);
    return (
      <main className="database-error-page">
        <section className="database-error-card">
          <span className="database-error-icon" aria-hidden="true">!</span>
          <p className="database-error-eyebrow">CONEXÃO INDISPONÍVEL</p>
          <h1>Não foi possível carregar suas disciplinas</h1>
          <p>Confira a conexão com o MongoDB Atlas, a resolução DNS e se o cluster está ativo. Depois, tente novamente.</p>
          <a href="/">Tentar novamente</a>
        </section>
      </main>
    );
  }
  return <Dashboard disciplines={disciplines} questionTopics={questionTopics} />;
}
