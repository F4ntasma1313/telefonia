# NexusCC — Telefonia para Call Centers

Plataforma de telefonia com painel React/Next.js, API REST, Asterisk/WebRTC e Supabase. Versão **0.1.1**. Projeto desenvolvido do zero com referência funcional nas telas de filas e agentes fornecidas pelo solicitante.

## Executar o painel

```bash
npm ci
npm run dev
```

Acesse http://localhost:3000. Sem variáveis do Supabase, o painel abre em **demonstração**, com dados fictícios e alterações somente em memória. A demonstração não faz ligações, não grava áudio e não cria contas reais. Reiniciar/recarregar a aplicação descarta esses dados.

## Operação real

Siga [o guia de instalação](docs/SETUP.md). É necessário configurar um projeto Supabase e uma central Asterisk em Linux com certificado TLS. Chamadas externas dependem de operadora SIP; não existem credenciais, minutos ou números telefônicos incluídos neste repositório.

No Supabase SQL Editor, execute **apenas** `supabase/setup.sql` na instalação inicial. Ele já contém as três migrações. Para conferir o resultado, execute `supabase/verify.sql`; não rode as migrações individuais depois do bundle.

Recursos implementados no código:

- Dashboard de operadores, estados, filas, volume de chamadas e tempo médio.
- Usuários administrador, supervisor e operador, cada um com ramal SIP.
- Filas, vinculação de operadores, campanhas progressivas, mailing CSV e lista de bloqueio.
- Telefone no navegador: registro SIP, atendimento, encerramento, mudo, espera e DTMF.
- Serviço de voz ARI: chamadas recebidas e realizadas, bridge de áudio, gravação e sincronização privada no Supabase Storage.
- API autenticada, tokens revogáveis armazenados por hash, validação de entradas e autorização no servidor.

**Estado de entrega:** o código de telefonia exige homologação ponta a ponta na infraestrutura real. O projeto não deve ser considerado uma central de produção homologada apenas por compilar. Consulte [estado e limitações](docs/STATUS.md) e [testes de aceitação](docs/TESTING.md).

## Documentação

O índice de toda a documentação está em [docs/README.md](docs/README.md).

## Comandos

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run bootstrap
npm run telephony
```

Os dois últimos comandos usam `.env.local`. Nunca publique esse arquivo, credenciais SIP, chaves Supabase ou gravações.
