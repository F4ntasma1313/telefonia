import { CirclePause, Play, Radio } from "lucide-react"
import { labels } from "@/features/Console/Model"
import type { ResourcesViewProps } from "@/Typings"

export function CampaignsView({ app, data }: ResourcesViewProps) {
  return (
    <>
      <div className="info-banner">
        <Radio size={20} />
        <span>
          Discador progressivo: um operador disponível para cada chamada. Horários em Brasília.{" "}
          {app.demo && "Execução de chamadas desativada na demonstração."}
        </span>
      </div>
      <div className="card-grid">
        {data.campaigns.map((campaign) => (
          <article
            className="panel resource-card"
            key={campaign.id}
          >
            <div className="panel-heading">
              <span className="eyebrow">PROGRESSIVO</span>
              <span className={`badge ${campaign.status}`}>{labels[campaign.status]}</span>
            </div>
            <h2>{campaign.name}</h2>
            <p>
              {campaign.queueName} · {campaign.start_hour}h às {campaign.end_hour}h
            </p>
            <div className="resource-stats">
              <span>
                <b>{campaign.total}</b>contatos carregados
              </span>
              <span>
                <b>{campaign.completed}</b>concluídos
              </span>
            </div>
            <div className="progress">
              <div style={{ width: `${campaign.progress}%` }} />
            </div>
            <small>
              {campaign.progress}% concluído · até {campaign.max_attempts} tentativas
            </small>
            <button
              className="button secondary"
              onClick={() =>
                void app.act(() =>
                  app.mutate(`campaigns/${campaign.id}`, "PATCH", {
                    status: campaign.status === "running" ? "paused" : "running"
                  })
                )
              }
            >
              {campaign.status === "running" ? <CirclePause size={17} /> : <Play size={17} />}
              {campaign.status === "running" ? "Pausar campanha" : "Iniciar campanha"}
            </button>
          </article>
        ))}
        {!data.campaigns.length && (
          <div className="panel empty">
            Crie uma fila e uma campanha para importar seu mailing.
          </div>
        )}
      </div>
    </>
  )
}
