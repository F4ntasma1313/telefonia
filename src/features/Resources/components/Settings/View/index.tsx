import { Radio, ShieldCheck } from "lucide-react"
import type { ResourcesViewProps } from "@/Typings"

export function SettingsView({ app }: ResourcesViewProps) {
  const snapshot = app.snapshot
  return (
    <div className="integration-grid">
      <section className="panel resource-card">
        <Radio
          size={28}
          className="accent"
        />
        <h2>Sua central de telefonia</h2>
        <p>Asterisk + WebRTC + Supabase</p>
        <div className="setup-row">
          <span>Banco e autenticação</span>
          <span className={`badge ${app.demo ? "paused" : "available"}`}>
            {app.demo ? "Demonstração" : "Conectado"}
          </span>
        </div>
        <div className="setup-row">
          <span>Serviço de telefonia</span>
          <span className={`badge ${snapshot.worker_online ? "available" : "offline"}`}>
            {snapshot.worker_online ? "Online" : "Desconectado"}
          </span>
        </div>
        <div className="setup-row">
          <span>Versão</span>
          <b>0.1.1</b>
        </div>
        <p>
          O guia de instalação está em docs/SETUP.md no projeto. Configure o Supabase, inicie o
          Asterisk e o serviço de telefonia antes de conectar seu ramal.
        </p>
      </section>
      <section className="panel resource-card">
        <ShieldCheck
          size={28}
          className="accent"
        />
        <h2>Comece com baixo custo</h2>
        <ul className="setup-list">
          <li>Ramais internos em uma central própria, sem cobrança por minuto.</li>
          <li>Gravações em bucket privado; reprodução por links temporários.</li>
          <li>
            Operadores acessam seus próprios registros. Supervisores acompanham a operação.
          </li>
          <li>Chamadas para a rede telefônica exigem operadora SIP, número e créditos.</li>
          <li>Hospedagem, internet e armazenamento podem gerar custos. Monitore o consumo.</li>
        </ul>
      </section>
    </div>
  )
}
