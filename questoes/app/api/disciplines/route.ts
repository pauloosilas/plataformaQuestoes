import { getCurrentUser } from "@/lib/auth";
import { addDiscipline } from "@/lib/disciplines";



export async function POST(request: Request) {
  if (!(await getCurrentUser())) {
    return Response.json({ message: "Entre para cadastrar disciplinas." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Não foi possível ler os dados do formulário." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("name" in body)) {
    return Response.json({ message: "Informe o nome do item." }, { status: 400 });
  }

  const { name } = body;
  const subitem = "subitem" in body ? body.subitem : undefined;
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
    return Response.json({ message: "O item deve ter entre 2 e 80 caracteres." }, { status: 400 });
  }

  if (subitem !== undefined && subitem !== "" && (typeof subitem !== "string" || subitem.trim().length < 2 || subitem.trim().length > 80)) {
    return Response.json({ message: "O subitem deve ter entre 2 e 80 caracteres." }, { status: 400 });
  }

  const normalizedItem = name.trim().normalize("NFC").toLocaleLowerCase("pt-BR");
  const cleanSubitem = typeof subitem === "string" ? subitem.trim() : "";
  if (cleanSubitem && normalizedItem === cleanSubitem.normalize("NFC").toLocaleLowerCase("pt-BR")) {
    return Response.json({ message: "O subitem deve ter um nome diferente do item." }, { status: 400 });
  }

  let created: boolean;
  try {
    created = await addDiscipline(name, cleanSubitem || undefined);
  } catch (error) {
    console.error("Falha ao salvar disciplina no MongoDB:", error);
    return Response.json(
      { message: "Não foi possível conectar ao banco de dados. Verifique a conexão do MongoDB e tente novamente." },
      { status: 503 },
    );
  }
  if (!created) {
    return Response.json({ message: cleanSubitem ? "Esse subitem já está cadastrado nesse item." : "Esse item já está cadastrado." }, { status: 409 });
  }

  return Response.json({ message: cleanSubitem ? "Item e subitem cadastrados com sucesso." : "Item cadastrado com sucesso." }, { status: 201 });
}
