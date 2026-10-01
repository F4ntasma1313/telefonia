import { Code2, Download, KeyRound, Plus } from "lucide-react"
import type { ResourcesViewProps } from "@/Typings"
import { contactExample } from "@/features/Resources/Model"

export function IntegrationsView({ app, data }: ResourcesViewProps) {
  const snapshot = app.snapshot
  return (
    <div className="integration-grid">
      <section className="panel resource-card">
        <Code2
          className="accent"
          size={28}
        />
        <h2>Conecte seus sistemas</h2>
        <p>API REST para filas, campanhas, contatos, histórico e lista de bloqueio.</p>
        <div className="code">
          POST /api/v1/contacts
          <br />
          Authorization: Bearer SEU_TOKEN
          <br />
          <br />
          <pre>{contactExample}</pre>
        </div>
        <a
          className="button secondary"
          href="/openapi.json"
          download
        >
          <Download size={17} />
          Baixar especificação OpenAPI
        </a>
        <p>
          Tokens permitem gerenciar mailing, campanhas e filas. Não dão acesso a usuários,
          credenciais SIP ou gravações.
        </p>
      </section>
      <section className="panel resource-card">
        <KeyRound
          className="accent"
          size={28}
        />
        <h2>Tokens de integração</h2>
        <p>Emita um token por sistema. O segredo aparece somente uma vez.</p>
        {snapshot.me?.role === "admin" ? (
          <>
            <form
              className="inline-form"
              onSubmit={data.submitKey}
            >
              <input
                aria-label="Nome da integração"
                name="name"
                placeholder="Ex.: CRM comercial"
                required
                minLength={2}
              />
              <button className="button primary">
                <Plus size={16} />
                Gerar
              </button>
            </form>
            {data.issuedToken && (
              <div
                className="token-output"
                role="status"
              >
                Guarde em local seguro:<code>{data.issuedToken}</code>
              </div>
            )}
            <button
              className="text-button"
              onClick={() => void app.act(data.loadKeys)}
            >
              Carregar tokens
            </button>
            {data.keys.map((key) => (
              <div
                className="key-row"
                key={key.id}
              >
                <span>
                  {key.name}
                  <small>{key.prefix}…</small>
                </span>
                <button
                  disabled={Boolean(key.revoked_at)}
                  className="text-button"
                  onClick={() => void app.act(() => data.revokeKey(key.id))}
                >
                  {key.revoked_at ? "Revogado" : "Revogar"}
                </button>
              </div>
            ))}
          </>
        ) : (
          <p>Apenas administradores podem gerenciar tokens.</p>
        )}
      </section>
    </div>
  )
}
