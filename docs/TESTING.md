# Testes e homologação

## Automatizados

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Os testes de banco usam PGlite (Postgres em processo) e executam as migrações reais, com schemas Auth/Storage mínimos para representar as dependências Supabase. Não substituem um teste com Supabase hospedado.

Cobertura inicial:

- Normalização de ramal/E.164 e rejeição de entrada SIP maliciosa.
- Validação de usuários, campanhas, contatos e idempotency key.
- Negação de permissão administrativa a operador.
- Repetição de chamada idempotente sem duplicidade.
- Reserva/liberação de operador e destino interno.
- Bloqueio de números da denylist.
- Seleção de contatos, tentativas, atraso de retry e esgotamento.
- Grants/RLS bloqueando acesso direto de usuários às credenciais e funções.
- Exclusividade de worker e limite de API.

O teste em processo não demonstra concorrência entre instâncias reais do Postgres nem mídia SIP. Os locks e índices devem ser exercitados em staging com múltiplos clientes antes de aumentar a carga.

## Navegador

Os testes em `tests/e2e` exercitam a demonstração local. Use o comando documentado no `package.json` com o painel em execução. Asserções e capturas não comprovam funcionamento de telefonia real.

```bash
npm run dev
npm run test:e2e
```

O navegador padrão dos testes é Microsoft Edge em modo headless. Em outro sistema, instale o navegador escolhido pelo Playwright e ajuste `PLAYWRIGHT_CHANNEL` ou a configuração. No ambiente de desenvolvimento foram verificados desktop 1440×1000 e celular 390×844, com cadastro de fila, usuário, campanha, importação com duplicidade, bloqueio de contato e rejeição explícita de conexão de voz na demonstração.

## Registro da verificação local

- 10 testes de regras e banco passaram, incluindo a consulta read-only `supabase/verify.sql`.
- 2 testes de navegador passaram, incluindo ausência de rolagem horizontal da página em celular.
- TypeScript, ESLint e build de produção verificados durante a implementação.
- Supabase Auth respondeu HTTP 200 com a URL e a chave pública fornecidas pelo usuário.
- Migrações no Supabase remoto, conta administrativa, PBX, tronco e mídia real dependem da configuração externa; não foram validados pelos testes locais.

## Aceitação de voz obrigatória no ambiente final

1. Criar dois operadores e registrar seus ramais, confirmar `pjsip show contacts`.
2. Testar chamada interna com áudio em ambos os sentidos.
3. Testar rejeição, ocupado, não atendimento, mudo, espera e DTMF.
4. Encerrar em cada lado e verificar liberação de ambos os ramais.
5. Ouvir o arquivo enviado ao bucket privado e verificar registro no histórico.
6. Negar acesso à gravação de outro operador e acesso anônimo ao bucket.
7. Receber chamada via tronco, aguardar na fila e atender.
8. Exceder timeout de fila e verificar abandono.
9. Executar campanha com dois contatos, pausar e verificar que não há novas originações.
10. Repetir requisições com a mesma chave e confirmar uma única discagem.
11. Bloquear contato e verificar ausência de nova tentativa.
12. Interromper rede/worker, reiniciar e conferir histórico, estado dos operadores e recuperação de gravações.
13. Testar em redes externas com NAT; introduzir TURN se necessário.
14. Testar limites do tronco, concorrência e duração de chamadas com carga autorizada.

Sem completar essas etapas, a telefonia deve permanecer em piloto e `ALLOW_EXTERNAL_CALLS=false`, exceto nos testes autorizados.
