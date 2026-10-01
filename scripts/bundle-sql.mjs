import { readFile, readdir, writeFile } from "node:fs/promises"

const directory = "supabase/migrations"
const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort()
const migrations = await Promise.all(
  files.map((file) => readFile(`${directory}/${file}`, "utf8"))
)
await writeFile("supabase/setup.sql", `begin;\n\n${migrations.join("\n\n")}\n\ncommit;\n`)
console.log("supabase/setup.sql gerado a partir das migrações.")
