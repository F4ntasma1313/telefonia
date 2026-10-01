import { Headset } from "lucide-react"
import type { useLogin } from "../Controller"

export function LoginView({
  controller,
  onDemo
}: {
  controller: ReturnType<typeof useLogin>
  onDemo: () => void
}) {
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand">
          <span className="brand-mark">
            <Headset size={25} />
          </span>
          <strong>
            Nexus<span>CC</span>
          </strong>
        </div>
        <span className="eyebrow">SUA OPERAÇÃO, CONECTADA</span>
        <h1>Entre na central</h1>
        <p>Use a conta fornecida pelo administrador.</p>
        <form onSubmit={controller.submit}>
          <label>
            E-mail
            <input
              autoComplete="username"
              type="email"
              name="email"
              required
            />
          </label>
          <label>
            Senha
            <input
              autoComplete="current-password"
              type="password"
              name="password"
              required
            />
          </label>
          {controller.error && (
            <p
              className="error"
              role="alert"
            >
              {controller.error}
            </p>
          )}
          <button
            className="button primary"
            disabled={controller.busy}
          >
            {controller.busy ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <button
          className="text-button"
          onClick={onDemo}
        >
          Explorar demonstração sem realizar ligações
        </button>
      </section>
    </main>
  )
}
