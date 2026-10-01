import { X } from "lucide-react"
import type { ResourceDialogProps } from "@/Typings"
import type { useResourceDialog } from "../Controller"

export function ResourceDialogView({
  props,
  controller
}: {
  props: ResourceDialogProps
  controller: ReturnType<typeof useResourceDialog>
}) {
  return (
    <div className="modal-backdrop">
      <dialog
        open
        aria-modal="true"
        onKeyDown={controller.keyDown}
        aria-labelledby="dialog-title"
        className="modal"
        onCancel={props.onClose}
      >
        <div className="panel-heading">
          <h2 id="dialog-title">{props.title}</h2>
          <button
            className="icon-button"
            aria-label="Fechar"
            onClick={props.onClose}
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={controller.submit}>
          <div className="form-grid">
            {controller.fields.map((field, index) => (
              <label key={field.name}>
                {field.label}
                {field.options ? (
                  <select
                    name={field.name}
                    defaultValue={field.defaultValue}
                    multiple={field.multiple}
                    required={field.required}
                    autoFocus={index === 0}
                  >
                    {!field.multiple && <option value="">Selecione</option>}
                    {field.options.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={field.name}
                    type={field.type ?? "text"}
                    required={field.required}
                    defaultValue={field.value}
                    autoFocus={index === 0}
                  />
                )}
              </label>
            ))}
          </div>
          {controller.error && (
            <p
              className="error"
              role="alert"
            >
              {controller.error}
            </p>
          )}
          <div className="modal-footer">
            <button
              type="button"
              className="button secondary"
              onClick={props.onClose}
            >
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={controller.busy}
            >
              {controller.busy ? "Salvando…" : "Salvar cadastro"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
