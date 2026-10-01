# Banco e armazenamento

Para instalar pelo SQL Editor, execute apenas `supabase/setup.sql`; ele reúne os arquivos de `supabase/migrations` em ordem. Em seguida, execute `supabase/verify.sql` para confirmar o estado do banco sem alterá-lo. Não execute o bundle e as migrações individuais no mesmo banco. O schema é destinado a um projeto Supabase dedicado ao NexusCC; a instalação restringe permissões do schema público.

| Tabela            | Responsabilidade                                                          |
| ----------------- | ------------------------------------------------------------------------- |
| `agents`          | Perfil ligado a `auth.users`, ramal único, papel, presença e filas        |
| `sip_credentials` | Senha gerada de cada ramal, somente servidor                              |
| `queues`          | Nome, número de entrada único, tempo máximo de espera e ativação          |
| `campaigns`       | Fila, estado, máximo de tentativas e janela horária                       |
| `contacts`        | Mailing, telefone, tentativas e próxima tentativa                         |
| `calls`           | Histórico, direção, operador, timestamps, tabulação e caminho de gravação |
| `denylist`        | Números bloqueados para novas chamadas                                    |
| `api_keys`        | Nome, prefixo e SHA-256 do token; nunca o segredo completo                |
| `audit_events`    | Ator, ação, identificador do recurso e horário                            |
| `worker_health`   | Presença e lease do processo de telefonia                                 |
| `rate_limits`     | Janela e contador de requisições por ator autenticado                     |

## Integridade

Ramais e números de filas aceitam 3 a 6 dígitos. Telefones externos usam formato internacional com `+`, de 8 a 15 dígitos. O formato é validado na fronteira e em constraints para contatos.

O par `(campaign_id, phone)` é único; importações repetidas ignoram duplicidades. Cada operador pode ter somente uma chamada viva no histórico, garantido por índice parcial único.

Vínculos de fila em `agents.queue_ids` são arrays de UUIDs; a API valida os IDs existentes. Não há exclusão de filas no contrato inicial; desative-as para preservar referências históricas.

## Funções transacionais

- `reserve_agent`: reserva o operador disponível há mais tempo, com heartbeat recente, usando `FOR UPDATE SKIP LOCKED`.
- `enqueue_call`: insere chamada manual e reserva operador em uma transação. Repetição da mesma chave de idempotência retorna o registro anterior para o mesmo solicitante.
- `claim_campaign_contact`: reserva contato elegível e operador da fila, incrementa tentativas e cria chamada.
- `claim_manual_call`: retira uma chamada manual pendente para execução.
- `finish_call`: finaliza uma única vez, libera operador e atualiza a próxima tentativa do contato.
- `acquire_worker_lease`: aquisição/renovação exclusiva do processo de telefonia.
- `reserve_destination`: reserva o destino interno e vincula à chamada em transação.
- `consume_rate_limit`: aplica 180 requisições/minuto por ator autenticado.

As funções operacionais são executáveis somente pela service role. Contas autenticadas não alteram essas tabelas diretamente.

## Gravações

O áudio fica no bucket privado `recordings`. A tabela `calls` guarda o caminho, não o binário. O serviço grava em WAV no Asterisk, envia ao Storage, atualiza o registro e só então remove a cópia local. Uma falha mantém a cópia no PBX para nova tentativa.

Limite inicial: 100 MB por arquivo; chamadas ativas são encerradas pelo worker após uma hora. Arquivos acima do limite ficam retidos para recuperação manual. A aplicação entrega URLs assinadas com duração de 60 segundos após verificar acesso.

Retenção automática, exportação de backups e políticas de expurgo precisam ser definidas antes de produção. Não apague gravações sem relacionar a remoção à tabela `calls`.
