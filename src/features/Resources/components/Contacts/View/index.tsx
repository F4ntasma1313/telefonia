import { FileUp } from "lucide-react"
import { labels } from "@/features/Console/Model"
import type { ResourcesViewProps } from "@/Typings"

export function ContactsView({ app, data }: ResourcesViewProps) {
  return (
    <>
      <div className="panel import-bar">
        <div>
          <h2>Importar mailing</h2>
          <p>CSV com colunas nome,telefone · +55DDDNUMERO · até 1.000 linhas</p>
        </div>
        <select
          aria-label="Campanha do mailing"
          value={data.campaignId}
          onChange={(event) => data.setCampaignId(event.target.value)}
        >
          <option value="">Escolha a campanha</option>
          {data.campaignOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
        <label className="button secondary upload">
          <FileUp size={17} />
          Importar CSV
          <input
            aria-label="Arquivo de mailing CSV"
            type="file"
            accept=".csv,text/csv"
            onChange={data.upload}
          />
        </label>
      </div>
      <section className="panel table-scroll">
        <table>
          <thead>
            <tr>
              <th>Contato</th>
              <th>Telefone</th>
              <th>Status</th>
              <th>Tentativas</th>
              <th>Bloqueio</th>
            </tr>
          </thead>
          <tbody>
            {data.contacts.map((contact) => (
              <tr key={contact.id}>
                <td>
                  <strong>{contact.name}</strong>
                </td>
                <td className="mono">{contact.phone}</td>
                <td>
                  <span className={`badge ${contact.status}`}>{labels[contact.status]}</span>
                </td>
                <td>{contact.attempts}</td>
                <td>
                  <button
                    disabled={contact.status === "blocked"}
                    className="text-button"
                    onClick={() =>
                      void app.act(() =>
                        app.mutate(
                          "denylist",
                          "POST",
                          { phone: contact.phone },
                          "Número bloqueado para novas discagens."
                        )
                      )
                    }
                  >
                    Não ligar
                  </button>
                </td>
              </tr>
            ))}
            {!data.contacts.length && (
              <tr>
                <td
                  colSpan={5}
                  className="empty"
                >
                  Nenhum contato encontrado. Importe um mailing ou adicione um contato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  )
}
