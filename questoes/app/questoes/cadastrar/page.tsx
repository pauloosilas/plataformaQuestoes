import { getCurrentUser } from "@/lib/auth";
import { listDisciplines } from "@/lib/disciplines";
import { redirect } from "next/navigation";
import QuestionManager from "./question-manager";

export const instant = false;

export default async function RegisterQuestionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  let disciplines: Awaited<ReturnType<typeof listDisciplines>>;
  try {
    disciplines = await listDisciplines();
  } catch (error) {
    console.error("Falha ao carregar disciplinas para o cadastro de questões:", error);
    return (
      <main className="manager-page">
        <header className="manager-topbar">
          <a className="manager-brand" href="/"><span>✳</span> Trilha <small>ESTUDOS</small></a>
          <a className="manager-back" href="/">← <span>Voltar ao painel</span></a>
        </header>
        <div className="manager-content">
          <section className="manager-card"><h1>Não foi possível carregar as disciplinas</h1><p>Verifique a conexão com o MongoDB e tente novamente.</p></section>
        </div>
      </main>
    );
  }

  return <QuestionManager disciplines={disciplines} />;
}
