import { handleApi } from "@/features/Api/Controller"

async function handler(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return handleApi(request, path)
}

export const GET = handler
export const POST = handler
export const PATCH = handler
export const DELETE = handler
export const runtime = "nodejs"
