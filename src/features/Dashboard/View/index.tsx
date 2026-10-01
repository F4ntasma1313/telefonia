import { Activity, Clock3, Headphones, PhoneCall, Users } from "lucide-react"
import { labels } from "@/features/Console/Model"
import type { DashboardController } from "@/Typings"

export function DashboardView({ data }: { data: DashboardController }) {
  return (
    <>
      <div className="metric-grid">
        <article className="metric">
          <span>
            Total de chamadas
            <PhoneCall size={18} />
          </span>
          <strong>{data.calls.length}</strong>
          <small>Chamadas na janela carregada</small>
        </article>
        <article className="metric">
          <span>
            Operadores online
            <Users size={18} />
          </span>
          <strong>
            {data.online}
            <em> / {data.agents.length}</em>
          </strong>
          <small>
            <i className="dot" /> {data.available} disponíveis para atender
          </small>
        </article>
        <article className="metric">
          <span>
            Taxa de conclusão
            <Activity size={18} />
          </span>
          <strong>
            {data.completionRate}
            <em>%</em>
          </strong>
          <small>
            {data.completed} concluídas · {data.abandoned} abandonadas
          </small>
        </article>
        <article className="metric">
          <span>
            Tempo médio de atendimento
            <Clock3 size={18} />
          </span>
          <strong>{data.average}</strong>
          <small>Considera chamadas finalizadas</small>
        </article>
      </div>
      <div className="overview-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Volume de chamadas</h2>
              <p>Distribuição nas últimas 10 horas</p>
            </div>
            <div className="legend">
              <span>
                <i className="dot" />
                Concluídas
              </span>
              <span>
                <i className="dot gray" />
                Não atendidas
              </span>
            </div>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label="Gráfico de chamadas por hora"
          >
            {data.chart.map((bar) => (
              <div
                className="bar-column"
                key={bar.label}
                title={`${bar.label}: ${bar.completed} concluídas, ${bar.missed} não atendidas`}
              >
                <div className="bar-track">
                  <div
                    className="bar missed"
                    style={{ height: `${(bar.missed / data.peak) * 100}%` }}
                  />
                  <div
                    className="bar"
                    style={{ height: `${(bar.completed / data.peak) * 100}%` }}
                  />
                </div>
                <span>{bar.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel team-panel">
          <div className="panel-heading">
            <h2>Agora na operação</h2>
            <Headphones size={19} />
          </div>
          <div className="availability">
            <strong>{data.available}</strong>
            <span>operadores disponíveis</span>
          </div>
          <div className="status-track">
            <div
              style={{ width: `${(data.available / Math.max(data.agents.length, 1)) * 100}%` }}
            />
            <div
              className="busy"
              style={{ width: `${(data.busy / Math.max(data.agents.length, 1)) * 100}%` }}
            />
          </div>
          <div className="status-row">
            <span>
              <i className="dot" />
              Disponíveis
            </span>
            <b>{data.available}</b>
          </div>
          <div className="status-row">
            <span>
              <i className="dot blue" />
              Em atendimento
            </span>
            <b>{data.busy}</b>
          </div>
          <div className="status-row">
            <span>
              <i className="dot amber" />
              Em pausa
            </span>
            <b>{data.paused}</b>
          </div>
          <div className="status-row">
            <span>
              <i className="dot gray" />
              Desconectados
            </span>
            <b>{data.agents.length - data.online}</b>
          </div>
        </section>
      </div>
      <div className="section-heading">
        <div>
          <h2>
            Filas em operação <span className="count">{data.queues.length}</span>
          </h2>
          <p>Distribuição por maior tempo disponível · atualização a cada 5 segundos</p>
        </div>
      </div>
      {data.queueCards.map((queue) => (
        <section
          className="panel queue-panel"
          key={queue.id}
        >
          <div className="queue-header">
            <div className="queue-title">
              <span className="queue-icon">
                <Headphones size={21} />
              </span>
              <div>
                <h3>{queue.name}</h3>
                <small>
                  Entrada {queue.number} · espera máxima {queue.timeout}s
                </small>
              </div>
              <span className={`badge ${queue.active ? "available" : "offline"}`}>
                {queue.active ? "Ativa" : "Inativa"}
              </span>
            </div>
            <div className="queue-numbers">
              <span>
                <b>{queue.agents.length}</b> operadores
              </span>
              <span>
                <b>{queue.calls.length}</b> chamadas
              </span>
              <span>
                <b>{queue.waiting}</b> em espera
              </span>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Operador</th>
                  <th>Ramal</th>
                  <th>Chamadas</th>
                  <th>Perfil</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.agents.map((agent) => (
                  <tr key={agent.id}>
                    <td>
                      <div className="person">
                        <span className="avatar">{agent.name.slice(0, 1)}</span>
                        <strong>{agent.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="extension">◉ {agent.extension}</span>
                    </td>
                    <td>{queue.calls.filter((call) => call.agent_id === agent.id).length}</td>
                    <td>{labels[agent.role]}</td>
                    <td>
                      <span className={`badge ${agent.status}`}>
                        <i />
                        {labels[agent.status]}
                      </span>
                    </td>
                  </tr>
                ))}
                {!queue.agents.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="empty"
                    >
                      Nenhum operador vinculado a esta fila.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {!data.queues.length && (
        <div className="panel empty">
          Crie sua primeira fila e vincule os operadores para acompanhar a operação.
        </div>
      )}
    </>
  )
}
