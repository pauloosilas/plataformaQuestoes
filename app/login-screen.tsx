"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

function BookMark() {
  return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" /><path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20M8 7h8" /></svg>;
}

function ArrowIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(result.message ?? "Não foi possível entrar. Tente novamente.");
        return;
      }

      router.refresh();
    } catch {
      setError("Não foi possível conectar. Verifique sua conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-showcase" aria-label="Boas-vindas à Trilha Estudos">
        <a className="login-brand" href="/">
          <span className="login-brand-mark"><BookMark /></span>
          <span className="login-brand-copy"><strong>Trilha</strong><small>ESTUDOS</small></span>
        </a>
        <div className="login-showcase-copy">
          <span className="login-eyebrow"><span /> UM ESPAÇO PARA VOCÊ</span>
          <h1>Seu próximo passo<br />começa <em>aqui.</em></h1>
          <p>Aprenda no seu ritmo, uma questão de cada vez.<br />Seu caminho de estudos espera por você.</p>
        </div>
        <div className="login-illustration" aria-hidden="true">
          <div className="login-orbit login-orbit-one" /><div className="login-orbit login-orbit-two" />
          <div className="login-book"><span /><span /><span /><span /></div>
          <span className="login-sparkle login-sparkle-one">✳</span><span className="login-sparkle login-sparkle-two">✦</span><span className="login-sparkle login-sparkle-three">·</span>
        </div>
        <div className="login-showcase-footer"><span>CONSTÂNCIA VALE MAIS DO QUE PRESSA</span><span>01 <i>/ 04</i></span></div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-form-heading"><span className="login-form-icon"><BookMark /></span><span className="login-form-overline">BEM-VINDO DE VOLTA</span><h2>Entre na sua conta</h2><p>Continue de onde sua curiosidade parou.</p></div>
          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="username">Usuário</label>
            <input id="username" name="username" autoComplete="username" autoCapitalize="none" value={username} onChange={(event) => setUsername(event.target.value)} required />
            <div className="password-label-row"><label htmlFor="password">Senha</label></div>
            <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Digite sua senha" value={password} onChange={(event) => setPassword(event.target.value)} required />
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={submitting}>{submitting ? "Entrando..." : "Entrar na minha conta"}<ArrowIcon /></button>
          </form>
          
          <div className="login-privacy"><span className="privacy-lock">▣</span> Seus dados de acesso são protegidos.</div>
        </div>
        <footer className="login-footer"><span>Feito para aprender com leveza.</span><span>© TRILHA ESTUDOS</span></footer>
      </section>
    </main>
  );
}
