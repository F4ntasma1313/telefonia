import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "NexusCC | Central de atendimento",
  description: "Gestão de telefonia, operadores, filas e campanhas.",
  icons: { icon: "/favicon.svg" }
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
