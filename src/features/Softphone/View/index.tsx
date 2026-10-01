import { Headset, MicOff, Pause, Phone, PhoneOff, X } from "lucide-react"
import type { useSoftphone } from "../Controller"
import type { Ref } from "react"

export function SoftphoneView({
  data,
  audioRef,
  extension
}: {
  data: Omit<ReturnType<typeof useSoftphone>, "audioRef">
  audioRef: Ref<HTMLAudioElement>
  extension?: string
}) {
  return (
    <>
      <audio
        ref={audioRef}
        autoPlay
      />
      <button
        className="softphone-launch button primary"
        onClick={() => data.setOpen(!data.open)}
      >
        <Headset size={19} />
        Meu telefone{data.connected && <i className="dot" />}
      </button>
      {data.open && (
        <section
          className="softphone panel"
          aria-label="Telefone do operador"
        >
          <div className="panel-heading">
            <h2>Ramal {extension ?? "—"}</h2>
            <button
              className="icon-button"
              aria-label="Fechar telefone"
              onClick={() => data.setOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <span className={`badge ${data.connected ? "available" : "offline"}`}>
            {data.connected ? "Conectado" : "Desconectado"}
          </span>
          {!data.connected ? (
            <>
              <p>Conecte seu ramal para receber chamadas no navegador.</p>
              <button
                className="button primary"
                disabled={data.busy}
                onClick={() => void data.perform(data.connect)}
              >
                Conectar ramal
              </button>
            </>
          ) : (
            <>
              <label>
                Número ou ramal
                <input
                  placeholder="+55 11 99999-9999"
                  value={data.phone}
                  onChange={(event) => data.setPhone(event.target.value)}
                />
              </label>
              <div className="keypad">
                {"123456789*0#".split("").map((value) => (
                  <button
                    key={value}
                    onClick={() => void data.perform(() => data.digit(value))}
                  >
                    {value}
                  </button>
                ))}
              </div>
              {data.incoming ? (
                <>
                  <p className="incoming">Chamada recebida</p>
                  <button
                    className="button primary"
                    disabled={data.busy}
                    onClick={() => void data.perform(data.answer)}
                  >
                    <Phone size={17} />
                    Atender
                  </button>
                </>
              ) : (
                !data.inCall && (
                  <button
                    className="button primary"
                    disabled={data.busy || !data.phone}
                    onClick={() => void data.perform(data.dial)}
                  >
                    <Phone size={17} />
                    Ligar
                  </button>
                )
              )}
              {data.inCall && (
                <div className="actions">
                  <button
                    className="button secondary"
                    onClick={() => void data.perform(data.toggleMute)}
                  >
                    <MicOff size={17} />
                    {data.muted ? "Ativar mic." : "Mudo"}
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => void data.perform(data.toggleHold)}
                  >
                    <Pause size={17} />
                    {data.held ? "Retomar" : "Espera"}
                  </button>
                </div>
              )}
              {(data.inCall || data.incoming) && (
                <button
                  className="button danger"
                  onClick={() => void data.perform(data.hangup)}
                >
                  <PhoneOff size={17} />
                  Encerrar
                </button>
              )}
              <button
                className="button secondary"
                disabled={data.inCall || data.incoming || data.busy}
                onClick={() => void data.perform(data.togglePause)}
              >
                {data.paused ? "Ficar disponível" : "Entrar em pausa"}
              </button>
              <button
                className="text-button"
                onClick={() => void data.perform(data.disconnect)}
              >
                Desconectar ramal
              </button>
            </>
          )}
          {data.error && (
            <p
              className="error"
              role="alert"
            >
              {data.error}
            </p>
          )}
        </section>
      )}
    </>
  )
}
