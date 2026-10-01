import { AgentsView } from "../components/Agents"
import { QueuesView } from "../components/Queues"
import { CampaignsView } from "../components/Campaigns"
import { ContactsView } from "../components/Contacts"
import { CallsView } from "../components/Calls"
import { IntegrationsView } from "../components/Integrations"
import { SettingsView } from "../components/Settings"
import { ResourceDialog } from "@/components/ResourceDialog"
import type { ConsoleController } from "@/Typings"
import type { useResources } from "../Controller"

export function ResourcesView({
  app,
  data
}: {
  app: ConsoleController
  data: ReturnType<typeof useResources>
}) {
  const { section } = app

  return (
    <>
      {section === "agents" && (
        <AgentsView
          app={app}
          data={data}
        />
      )}
      {section === "queues" && (
        <QueuesView
          app={app}
          data={data}
        />
      )}
      {section === "campaigns" && (
        <CampaignsView
          app={app}
          data={data}
        />
      )}
      {section === "contacts" && (
        <ContactsView
          app={app}
          data={data}
        />
      )}
      {section === "calls" && (
        <CallsView
          app={app}
          data={data}
        />
      )}
      {section === "integrations" && (
        <IntegrationsView
          app={app}
          data={data}
        />
      )}
      {section === "settings" && (
        <SettingsView
          app={app}
          data={data}
        />
      )}
      {app.dialog && (
        <ResourceDialog
          title={
            {
              agents: "Novo usuário e ramal",
              queues: "Nova fila",
              campaigns: "Nova campanha",
              contacts: "Novo contato"
            }[app.dialog]
          }
          fields={data.fields[app.dialog]}
          onSave={app.save}
          onClose={() => app.setDialog(null)}
        />
      )}
      {data.editingAgent && (
        <ResourceDialog
          title="Vincular filas ao operador"
          fields={data.membershipFields}
          onSave={data.saveMembership}
          onClose={() => data.setEditingAgent(null)}
        />
      )}
      {data.dispositionId && (
        <ResourceDialog
          title="Classificar chamada"
          fields={[{ name: "disposition", label: "Resultado do atendimento", required: true }]}
          onSave={data.saveDisposition}
          onClose={() => data.setDispositionId(null)}
        />
      )}
    </>
  )
}
