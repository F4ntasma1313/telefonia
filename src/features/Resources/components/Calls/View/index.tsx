import { Play } from "lucide-react"
import { labels } from "@/features/Console/Model"
import type { ResourcesViewProps } from "@/Typings"

export function CallsView({ app, data }: ResourcesViewProps) {
  return (
    <>
      {data.audioUrl && (
        <div className="panel audio-panel">
          <strong>Reproduzir gravação</strong>
          <audio
            controls
            autoPlay
            src={data.audioUrl}
          />
        </div>
      )}
      <section className="panel table-scroll">
        <table>
          <thead>
            <tr>
              <th>Chamada / data</th>
              <th>Operador</th>
              <th>Direção</th>
              <th>Duração</th>
              <th>Status</th>
              <th>Gravação</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {data.calls.map((call) => (
              <tr key={call.id}>
                <td>
                  <strong className="mono">{call.phone}</strong>
                  <small>{call.date}</small>
                </td>
                <td>{call.agentName}</td>
                <td>{call.direction === "inbound" ? "Recebida" : "Realizada"}</td>
                <td>{call.duration}</td>
                <td>
                  <span className={`badge ${call.status}`}>{labels[call.status]}</span>
                </td>
                <td>
                  <button
                    className="text-button"
                    disabled={!call.recording_path}
                    onClick={() => void app.act(() => data.playRecording(call.id))}
                  >
                    <Play size={14} />
                    {call.recording_path ? "Ouvir" : "Indisponível"}
                  </button>
                </td>
                <td>
                  <button
                    className="text-button"
                    onClick={() => data.setDispositionId(call.id)}
                  >
                    {call.disposition ?? "Classificar"}
                  </button>
                </td>
              </tr>
            ))}
            {!data.calls.length && (
              <tr>
                <td
                  colSpan={7}
                  className="empty"
                >
                  Nenhuma chamada registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      <p className="footnote">
        Até 500 registros recentes no painel. Para histórico completo, use a API paginada.
        Gravações disponíveis após o processamento.
      </p>
    </>
  )
}
