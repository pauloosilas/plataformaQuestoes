import { getCurrentUser } from "@/lib/auth";
import { listDisciplines } from "@/lib/disciplines";
import { getQuestionTopic, saveQuestionTopics, type Question, type TopicImport } from "@/lib/questions";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseQuestion(value: unknown, topicTitle: string, index: number): Question {
  if (!isRecord(value)) throw new Error(`A questão ${index + 1} de “${topicTitle}” deve ser um objeto.`);

  const { question, options, correct, explanation } = value;
  if (typeof question !== "string" || question.trim().length < 2 || question.length > 20_000) {
    throw new Error(`O enunciado ${index + 1} de “${topicTitle}” deve ter entre 2 e 20.000 caracteres.`);
  }
  if (!Array.isArray(options) || options.length < 2 || options.length > 10 || options.some((option) => typeof option !== "string" || !option.trim())) {
    throw new Error(`A questão ${index + 1} de “${topicTitle}” deve ter de 2 a 10 alternativas preenchidas.`);
  }
  if (!Number.isInteger(correct) || (correct as number) < 0 || (correct as number) >= options.length) {
    throw new Error(`O campo “correct” da questão ${index + 1} de “${topicTitle}” deve ser o índice de uma alternativa existente, começando em 0.`);
  }
  if (typeof explanation !== "string" || explanation.length > 30_000) {
    throw new Error(`O campo “explanation” da questão ${index + 1} de “${topicTitle}” deve ser um texto com até 30.000 caracteres.`);
  }

  return { question: question.trim(), options: options.map((option) => option.trim()), correct: correct as number, explanation };
}

function parseTopics(json: string): TopicImport[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("O JSON está inválido. Confira vírgulas, aspas e chaves.");
  }

  if (!isRecord(parsed)) throw new Error("O JSON deve ser um objeto com a propriedade “topics”.");
  const topicMap = "topics" in parsed ? parsed.topics : parsed;
  if (!isRecord(topicMap)) throw new Error("A propriedade “topics” deve conter um objeto de assuntos.");

  const entries = Object.entries(topicMap);
  if (!entries.length || entries.length > 100) throw new Error("Informe de 1 a 100 assuntos por envio.");

  return entries.map(([key, rawTopic]) => {
    if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(key)) {
      throw new Error(`A chave “${key}” deve usar apenas letras minúsculas sem acento, números e sublinhados (ex.: colocacao_pronominal).`);
    }
    if (!isRecord(rawTopic)) throw new Error(`O assunto “${key}” deve ser um objeto.`);

    const { title, questions } = rawTopic;
    if (typeof title !== "string" || title.trim().length < 2 || title.trim().length > 120) {
      throw new Error(`O assunto “${key}” precisa de um título entre 2 e 120 caracteres.`);
    }
    if (!Array.isArray(questions) || !questions.length || questions.length > 500) {
      throw new Error(`O assunto “${title}” deve conter de 1 a 500 questões.`);
    }

    return { key, title: title.trim(), questions: questions.map((question, index) => parseQuestion(question, title, index)) };
  });
}

export async function GET(request: Request) {
  if (!(await getCurrentUser())) {
    return Response.json({ message: "Entre para visualizar as questões." }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const disciplineName = searchParams.get("discipline")?.trim() ?? "";
  const subitemName = searchParams.get("subitem")?.trim() ?? "";
  const key = searchParams.get("key") ?? "";
  if (!disciplineName || !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(key)) {
    return Response.json({ message: "Disciplina ou assunto inválido." }, { status: 400 });
  }

  try {
    const disciplines = await listDisciplines();
    const discipline = disciplines.find((item) => item.name === disciplineName);
    if (!discipline) return Response.json({ message: "A disciplina não foi encontrada." }, { status: 404 });
    if (discipline.subitems.length && !discipline.subitems.includes(subitemName)) {
      return Response.json({ message: "O subitem não pertence a essa disciplina." }, { status: 400 });
    }
    if (!discipline.subitems.length && subitemName) {
      return Response.json({ message: "Essa disciplina não possui subitens." }, { status: 400 });
    }

    const topic = await getQuestionTopic(discipline.name, subitemName, key);
    if (!topic) return Response.json({ message: "Esse assunto não foi encontrado." }, { status: 404 });

    return Response.json({ topic });
  } catch (error) {
    console.error("Falha ao buscar questões no MongoDB:", error);
    return Response.json({ message: "Não foi possível carregar as questões. Verifique a conexão e tente novamente." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await getCurrentUser())) {
    return Response.json({ message: "Entre para cadastrar questões." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Não foi possível ler os dados enviados." }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.discipline !== "string" || typeof body.topicsJson !== "string") {
    return Response.json({ message: "Selecione uma disciplina e informe o JSON dos assuntos." }, { status: 400 });
  }
  if (body.topicsJson.length > 2_000_000) {
    return Response.json({ message: "O arquivo JSON ultrapassa o limite de 2 MB." }, { status: 413 });
  }
  if (body.subitem !== undefined && typeof body.subitem !== "string") {
    return Response.json({ message: "O subitem selecionado é inválido." }, { status: 400 });
  }

  let topics: TopicImport[];
  try {
    topics = parseTopics(body.topicsJson);
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "O JSON das questões é inválido." }, { status: 400 });
  }

  try {
    const disciplines = await listDisciplines();
    const discipline = disciplines.find((item) => item.name === body.discipline);
    if (!discipline) return Response.json({ message: "A disciplina selecionada não existe mais." }, { status: 400 });

    const subitem = typeof body.subitem === "string" ? body.subitem : "";
    if (discipline.subitems.length && !discipline.subitems.includes(subitem)) {
      return Response.json({ message: "Selecione um subitem válido para essa disciplina." }, { status: 400 });
    }
    if (!discipline.subitems.length && subitem) {
      return Response.json({ message: "Essa disciplina não possui subitens." }, { status: 400 });
    }

    const result = await saveQuestionTopics(discipline.name, subitem, topics);
    return Response.json({ message: `${result.topics} assunto(s) e ${result.questions} questão(ões) salvos com sucesso.`, ...result }, { status: 201 });
  } catch (error) {
    console.error("Falha ao salvar questões no MongoDB:", error);
    return Response.json({ message: "Não foi possível salvar no banco de dados. Verifique a conexão e tente novamente." }, { status: 503 });
  }
}
