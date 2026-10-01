import { Users } from "lucide-react"
import type { ResourcesViewProps } from "@/Typings"

export function QueuesView({ app, data }: ResourcesViewProps) {
  return (
    <div className="card-grid">
      {data.queues.map((queue) => (
        <article
          className="panel resource-card"
          key={queue.id}
        >
          <div className="panel-heading">
            <span className="queue-icon">
              <Users size={22} />
            </span>
            <span className={`badge ${queue.active ? "available" : "offline"}`}>
              {queue.active ? "Ativa" : "Inativa"}
            </span>
          </div>
          <h2>{queue.name}</h2>
          <p>Entrada {queue.number}</p>
          <div className="resource-stats">
            <span>
              <b>{queue.members}</b>operadores
            </span>
            <span>
              <b>{queue.timeout}s</b>espera máxima
            </span>
          </div>
          <p>Distribuição por maior tempo disponível</p>
          <button
            className="button secondary"
            onClick={() =>
              void app.act(() =>
                app.mutate(`queues/${queue.id}`, "PATCH", { active: !queue.active })
              )
            }
          >
            {queue.active ? "Desativar fila" : "Ativar fila"}
          </button>
        </article>
      ))}
      {!data.queues.length && <div className="panel empty">Crie uma fila para começar.</div>}
    </div>
  )
}
