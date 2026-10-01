import { useLogin } from "./Controller"
import { LoginView } from "./View"

export function Login({ onDemo }: { onDemo: () => void }) {
  return (
    <LoginView
      controller={useLogin()}
      onDemo={onDemo}
    />
  )
}
