import { labels } from "@/features/Console/Model"
import type { ResourcesViewProps } from "@/Typings"

export function AgentsView({ app, data }: ResourcesViewProps) {
  const snapshot = app.snapshot
  return (
    <section className="panel table-scroll">
      <table>
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Ramal</th>
            <th>Perfil</th>
            <th>Status</th>
            <th>Filas</th>
            {snapshot.me?.role === "admin" && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {data.agents.map((agent) => (
            <tr key={agent.id}>
              <td>
                <div className="person">
                  <span className="avatar">{agent.name[0]}</span>
                  <div>
                    <strong>{agent.name}</strong>
                    <small>{agent.email}</small>
                  </div>
                </div>
              </td>
              <td className="mono">{agent.extension}</td>
              <td>{labels[agent.role]}</td>
              <td>
                <span className={`badge ${agent.active ? agent.status : "offline"}`}>
                  {agent.active ? labels[agent.status] : "Desativado"}
                </span>
              </td>
              <td>{agent.queue_ids.length}</td>
              {snapshot.me?.role === "admin" && (
                <td>
                  <div className="actions">
                    <button
                      className="text-button"
                      onClick={() => data.setEditingAgent(agent.id)}
                    >
                      Vincular filas
                    </button>
                    <button
                      className="text-button"
                      disabled={agent.id === snapshot.me.id}
                      onClick={() =>
                        void app.act(() =>
                          app.mutate(`agents/${agent.id}`, "PATCH", {
                            active: !agent.active
                          })
                        )
                      }
                    >
                      {agent.active ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
          {!data.agents.length && (
            <tr>
              <td
                colSpan={6}
                className="empty"
              >
                Nenhum usuário encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}
