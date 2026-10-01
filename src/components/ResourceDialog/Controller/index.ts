import { useState } from "react"
import type { FormEvent, KeyboardEvent } from "react"
import type { ResourceDialogProps } from "@/Typings"

export function useResourceDialog(props: ResourceDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const values = Object.fromEntries(form) as Record<string, string>

    for (const field of props.fields.filter((field) => field.multiple)) {
      values[field.name] = form.getAll(field.name).map(String).join(",")
    }
    setBusy(true)
    setError("")

    try {
      await props.onSave(values)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar.")
    } finally {
      setBusy(false)
    }
  }

  const fields = props.fields.map((field) => ({
    ...field,
    defaultValue: field.multiple
      ? (field.value?.split(",").filter(Boolean) ?? [])
      : (field.value ?? "")
  }))

  function keyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      props.onClose()
      return
    }

    if (event.key !== "Tab") {
      return
    }

    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled])"
      )
    )
    const first = controls[0]
    const last = controls[controls.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return { busy, error, submit, fields, keyDown }
}
