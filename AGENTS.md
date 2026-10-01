<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# NexusCC — regras do projeto

- TypeScript estrito, sem any. Componentes e módulos organizados por contexto em Model, Controller e View. Arquivos internos devem usar index.ts ou index.tsx.
- Model contém dados e schemas; Controller contém regras, estado e transformação; View contém apresentação. Entradas do framework permanecem finas.
- DTOs e interfaces pertencem exclusivamente a src/Typings/dtos e src/Typings/interfaces. Não crie Typings dentro de features.
- Integrações externas pertencem a services; comportamento React reutilizável pertence a hooks.
- Código com duas posições de indentação, aspas duplas, sem ponto e vírgula, blocos expandidos. Não adicione comentários explicativos sem solicitação.
- Antes de editar, inspecione estrutura, dependências e git status. Preserve alterações locais; nunca use comandos destrutivos sem autorização.
- Em nova tarefa e repositório limpo, atualize main com git pull origin main e crie branch feature/frontend, feature/backend, fix/frontend ou fix/backend conforme o contexto. Não desenvolva diretamente em main.
- Atualize docs em toda alteração funcional e use SemVer, um incremento por tarefa. Sincronize package.json, lockfile, versão exibida e CHANGELOG.md.
- Execute typecheck, lint, testes relevantes e build. Revise git status antes da entrega.
- Nunca publique segredos, .env.local, configurações geradas de ramais ou gravações. Não alegue homologação de voz sem teste real.
