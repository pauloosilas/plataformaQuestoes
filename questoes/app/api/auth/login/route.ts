import { authenticateUser, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Não foi possível ler os dados de acesso." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("username" in body) || !("password" in body)) {
    return Response.json({ message: "Informe usuário e senha." }, { status: 400 });
  }

  const { username, password } = body;
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return Response.json({ message: "Informe usuário e senha." }, { status: 400 });
  }

  try {
    const user = await authenticateUser(username, password);
    console.log(user)
    if (!user) {
      return Response.json({ message: "Usuário ou senha incorretos." }, { status: 401 });
    }

    await createSession(user.username);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Falha ao autenticar usuário:", error);
    return Response.json({ message: "Não foi possível acessar sua conta agora. Tente novamente." }, { status: 503 });
  }
}
