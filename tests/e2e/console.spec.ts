import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  const demo = page.getByRole("button", {
    name: "Explorar demonstração sem realizar ligações"
  })
  await Promise.race([
    demo.waitFor({ state: "visible" }),
    page.getByRole("heading", { name: "Visão da operação" }).waitFor({ state: "visible" })
  ])

  if (await demo.isVisible()) {
    await demo.click()
  }
})

test("dashboard e cadastros em demonstração", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await expect(page.getByRole("heading", { name: "Visão da operação" })).toBeVisible()
  await expect(
    page.getByRole("cell", { name: "Ana Martins", exact: false }).first()
  ).toBeVisible()
  await page.screenshot({ path: "test-results/dashboard-desktop.png", fullPage: true })
  await page.getByRole("button", { name: "Filas de atendimento", exact: true }).click()
  await page.getByRole("button", { name: "Nova fila", exact: true }).click()
  await page.getByLabel("Nome da fila").fill("Cobrança QA")
  await page.getByLabel("Número de entrada").fill("2003")
  await page.getByRole("button", { name: "Salvar cadastro" }).click()
  await expect(page.getByRole("heading", { name: "Cobrança QA" })).toBeVisible()
  await page.getByRole("button", { name: "Operadores e usuários", exact: true }).click()
  await page.getByRole("button", { name: "Novo usuário", exact: true }).click()
  await page.getByLabel("Nome completo").fill("Operador QA")
  await page.getByLabel("E-mail", { exact: true }).fill("qa@example.com")
  await page.getByLabel("Senha inicial").fill("qa-test-password-2026")
  await page.getByLabel("Ramal (3 a 6 dígitos)", { exact: true }).fill("1010")
  await page.getByLabel("Perfil de acesso").selectOption("operator")
  await page.getByLabel("Fila inicial").selectOption({ label: "Cobrança QA" })
  await page.getByRole("button", { name: "Salvar cadastro" }).click()
  await expect(page.getByText("qa@example.com")).toBeVisible()
  await page.getByRole("button", { name: "Discador e campanhas", exact: true }).click()
  await page.getByRole("button", { name: "Nova campanha", exact: true }).click()
  await page.getByLabel("Nome da campanha").fill("Campanha QA")
  await page.getByLabel("Fila de operadores").selectOption({ label: "Cobrança QA" })
  await page.getByRole("button", { name: "Salvar cadastro" }).click()
  await expect(page.getByRole("heading", { name: "Campanha QA" })).toBeVisible()
  await page.getByRole("button", { name: "Mailing", exact: true }).click()
  await page
    .getByRole("combobox", { name: "Campanha do mailing" })
    .selectOption({ label: "Campanha QA" })
  await page.getByLabel("Arquivo de mailing CSV").setInputFiles({
    name: "contatos.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "nome,telefone\nContato QA,+5511998887777\nContato duplicado,+5511998887777"
    )
  })
  await expect(page.getByText("1 contatos importados; 1 duplicados ignorados.")).toBeVisible()
  await expect(page.getByRole("cell", { name: "Contato QA", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Não ligar", exact: true }).click()
  await expect(page.getByRole("cell", { name: "Bloqueado", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Meu telefone" }).click()
  await page.getByRole("button", { name: "Conectar ramal", exact: true }).click()
  await expect(
    page.getByText("A demonstração não conecta chamadas.", { exact: false })
  ).toBeVisible()
  expect(errors).toEqual([])
})

test("layout móvel sem rolagem horizontal da página", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole("heading", { name: "Visão da operação" })).toBeVisible()
  await expect(
    page.getByRole("cell", { name: "Ana Martins", exact: false }).first()
  ).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  )
  expect(overflow).toBe(false)
  await page.screenshot({ path: "test-results/dashboard-mobile.png", fullPage: true })
})
