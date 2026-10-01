import {
  Activity,
  ChevronDown,
  Code2,
  Database,
  Headset,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Phone,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Users,
  X
} from "lucide-react"
import Link from "next/link"
import { sections } from "../Model"
import { Dashboard } from "@/features/Dashboard"
import { Resources } from "@/features/Resources"
import { Softphone } from "@/features/Softphone"
import { Login } from "@/features/Login"
import type { ConsoleController, Entity } from "@/Typings"

const icons = {
  dashboard: LayoutDashboard,
  agents: Users,
  queues: ListFilter,
  campaigns: Radio,
  contacts: Database,
  calls: Phone,
  integrations: Code2,
  settings: Settings
}
const descriptions = {
  dashboard: "Acompanhe as pessoas e as conversas que movem sua operação.",
  agents: "Pessoas, permissões e ramais em um só lugar.",
  queues: "Organize a distribuição de chamadas da sua equipe.",
  campaigns: "Conecte seus operadores às próximas oportunidades.",
  contacts: "Organize seus contatos e abasteça as campanhas.",
  calls: "Histórico, resultados de atendimento e gravações.",
  integrations: "Integre sua central ao CRM e a outros sistemas.",
  settings: "Conectividade e preparação da sua infraestrutura."
}

export function ConsoleView({ controller: app }: { controller: ConsoleController }) {
  if (!app.ready) {
    return <div className="loading-screen">Carregando sua central…</div>
  }

  if (!app.demo && !app.authenticated) {
    return <Login onDemo={() => app.setDemo(true)} />
  }

  const active = sections.find((item) => item.id === app.section)!
  const canCreate =
    ["agents", "queues", "campaigns", "contacts"].includes(app.section) &&
    (app.section !== "agents" || app.snapshot.me?.role === "admin") &&
    app.snapshot.me?.role !== "operator"

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link
          className="brand"
          href="/"
          aria-label="NexusCC Call Center"
        >
          <span className="brand-mark">
            <Headset size={24} />
          </span>
          <strong>
            Nexus<span>CC</span>
          </strong>
        </Link>
        <div className="workspace-name">
          <span className="workspace-icon">N</span>
          <span>
            Minha central<small>Workspace principal</small>
          </span>
          <ChevronDown size={15} />
        </div>
        <nav aria-label="Menu principal">
          {sections.map((item, index) => {
            const Icon = icons[item.id]
            const visible =
              app.snapshot.me?.role !== "operator" ||
              ["dashboard", "calls", "settings"].includes(item.id)

            return (
              visible && (
                <div key={item.id}>
                  {(index === 0 || sections[index - 1].group !== item.group) && (
                    <div className="nav-group">{item.group}</div>
                  )}
                  <button
                    aria-label={item.label}
                    title={item.label}
                    className={`nav-item ${app.section === item.id ? "selected" : ""}`}
                    onClick={() => app.navigate(item.id)}
                  >
                    <Icon size={19} />
                    <span>{item.label}</span>
                    {item.id === "dashboard" && <span className="live-dot" />}
                  </button>
                </div>
              )
            )
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection-card">
            <span>
              <Activity size={17} />
              Central {app.snapshot.worker_online ? "conectada" : "não conectada"}
            </span>
            <small>
              {app.demo
                ? "Explore com dados de exemplo"
                : "Verifique a configuração da telefonia"}
            </small>
          </div>
          <div className="profile">
            <span className="avatar">{app.snapshot.me?.name[0] ?? "N"}</span>
            <span>
              {app.snapshot.me?.name ?? "Minha conta"}
              <small>Ramal {app.snapshot.me?.extension ?? "—"}</small>
            </span>
            <button
              aria-label="Sair"
              className="icon-button"
              onClick={() => void app.logout()}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Central de atendimento<span>/</span>
            <strong>{active.label}</strong>
          </div>
          <div className="topbar-actions">
            <span className={`badge ${app.demo ? "paused" : "available"}`}>
              {app.demo ? "Ambiente de demonstração" : "Operação real"}
            </span>
            <span className="version">v0.1.1</span>
          </div>
        </header>
        <main className="content">
          {app.demo && (
            <div className="demo-banner">
              <span>
                <strong>Demonstração interativa</strong> · Dados fictícios, alterações
                temporárias e chamadas desativadas.
              </span>
              <button onClick={() => app.navigate("settings")}>Configurar operação</button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <span className="eyebrow">{active.group}</span>
              <h1>{active.label}</h1>
              <p>{descriptions[app.section]}</p>
            </div>
            <div className="actions">
              {app.section === "dashboard" ? (
                <select
                  aria-label="Filtrar por fila"
                  value={app.queueFilter}
                  onChange={(event) => app.setQueueFilter(event.target.value)}
                >
                  <option value="">Todas as filas</option>
                  {app.snapshot.queues.map((queue) => (
                    <option
                      key={queue.id}
                      value={queue.id}
                    >
                      {queue.name}
                    </option>
                  ))}
                </select>
              ) : (
                canCreate && (
                  <button
                    className="button primary"
                    onClick={() => app.setDialog(app.section as Entity)}
                  >
                    <Plus size={18} />
                    {
                      {
                        agents: "Novo usuário",
                        queues: "Nova fila",
                        campaigns: "Nova campanha",
                        contacts: "Novo contato"
                      }[app.section as Entity]
                    }
                  </button>
                )
              )}
              <button
                className="icon-button refresh"
                aria-label="Atualizar dados"
                onClick={() => void app.refresh()}
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
          {app.error && (
            <div
              className="error alert"
              role="alert"
            >
              {app.error}
            </div>
          )}
          {app.notice && (
            <div
              className="success alert"
              role="status"
            >
              <span>{app.notice}</span>
              <button
                className="icon-button"
                aria-label="Fechar aviso"
                onClick={() => app.setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {["agents", "contacts", "calls"].includes(app.section) && (
            <div className="search-bar">
              <Search size={18} />
              <input
                aria-label="Buscar registros"
                placeholder="Buscar por nome, número ou ramal…"
                value={app.search}
                onChange={(event) => app.setSearch(event.target.value)}
              />
            </div>
          )}
          {app.loading ? (
            <div className="panel empty">Carregando operação…</div>
          ) : (
            <>
              {app.section === "dashboard" && (
                <Dashboard
                  snapshot={app.snapshot}
                  queueFilter={app.queueFilter}
                />
              )}
              <Resources controller={app} />
            </>
          )}
          <footer className="page-footer">
            <span>NexusCC · Sua operação, conectada.</span>
            <span>
              {app.demo ? "Dados ilustrativos" : "Painel atualizado a cada 5 segundos"}
            </span>
          </footer>
        </main>
      </div>
      <Softphone app={app} />
    </div>
  )
}
