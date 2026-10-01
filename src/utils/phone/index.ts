export function normalizePhone(value: string): string {
  const trimmed = value.trim()

  if (/^\d{3,6}$/.test(trimmed)) {
    return trimmed
  }

  const digits = trimmed.replace(/[\s().-]/g, "")

  if (!/^\+[1-9]\d{7,14}$/.test(digits)) {
    throw new Error("Use um ramal de 3 a 6 dígitos ou telefone internacional: +5511999999999.")
  }

  return digits
}
