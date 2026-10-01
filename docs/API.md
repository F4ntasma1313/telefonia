# API REST v1

Base: `/api/v1`. Contrato OpenAPI: [public/openapi.json](../public/openapi.json). JSON em todas as operações. API própria; não replica automaticamente o contrato Vonix.

## Autenticação

Envie `Authorization: Bearer TOKEN`.

- Sessão de usuário: access token emitido pelo Supabase Auth.
- Integração: token `nexuscc_...` emitido por administrador no painel. O token permite filas, campanhas, mailing, bloqueios e leitura de chamadas. Não pode criar usuários, obter SIP/gravações ou iniciar chamada manual em nome de operador.

Limite: 180 requisições/minuto por usuário ou token autenticado; exceder retorna 429. Configure também proteção no proxy para requisições não autenticadas. Respostas incluem `X-Request-Id`; erros incluem `request_id`.

## Endpoints

| Método     | Caminho                                                            | Operação                                                               |
| ---------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| GET        | `/snapshot`                                                        | Snapshot do painel, filtrado pelo perfil, máximo 500 chamadas/contatos |
| GET        | `/queues`, `/campaigns`, `/contacts`, `/calls`, `/denylist`        | Listagem paginada, 100 itens, `?page=1`                                |
| GET        | `/queues/{id}`, `/campaigns/{id}`, `/contacts/{id}`, `/calls/{id}` | Listagem filtrada pelo ID                                              |
| POST       | `/agents`                                                          | Criar usuário Auth, perfil e ramal; somente admin                      |
| PATCH      | `/agents/{id}`                                                     | Alterar vínculos de filas ou ativação; somente admin                   |
| POST       | `/queues`                                                          | Criar fila                                                             |
| PATCH      | `/queues/{id}`                                                     | Atualizar nome, número, timeout ou ativação                            |
| POST       | `/campaigns`                                                       | Criar campanha em rascunho                                             |
| PATCH      | `/campaigns/{id}`                                                  | Estado running, paused ou completed                                    |
| POST       | `/contacts`                                                        | Um contato ou array até 1.000; ignora duplicados da campanha           |
| POST       | `/denylist`                                                        | Bloquear novas discagens de um número                                  |
| POST       | `/calls`                                                           | Solicitar chamada no próprio ramal; somente sessão de usuário          |
| PATCH      | `/calls/{id}`                                                      | Registrar `disposition` (resultado do atendimento)                     |
| POST       | `/presence`                                                        | Heartbeat; status available, paused ou offline, se não estiver ocupado |
| GET        | `/sip`                                                             | Endereço WSS e credencial do próprio ramal                             |
| GET        | `/recordings/{callId}`                                             | URL assinada por 60s, com autorização                                  |
| GET / POST | `/keys`                                                            | Listar/emitir token; somente admin                                     |
| DELETE     | `/keys/{id}`                                                       | Revogar token; somente admin                                           |

`GET /api/health` é público e confirma apenas que a aplicação HTTP está atendendo. A saúde do worker aparece no snapshot, baseada no heartbeat.

## Exemplos

Criar fila:

```json
{ "name": "Comercial", "number": "2000", "timeout": 120, "active": true }
```

Criar usuário:

```json
{
  "name": "Operador",
  "email": "operador@example.com",
  "password": "SENHA_FORTE_DE_12_OU_MAIS",
  "role": "operator",
  "extension": "1001",
  "queue_ids": ["UUID_DA_FILA"]
}
```

Criar campanha:

```json
{
  "name": "Prospecção",
  "queue_id": "UUID_DA_FILA",
  "max_attempts": 3,
  "start_hour": 9,
  "end_hour": 18
}
```

Importar contatos:

```json
[
  { "name": "Contato A", "phone": "+5511999999999", "campaign_id": "UUID_DA_CAMPANHA" },
  { "name": "Contato B", "phone": "+5521999999999", "campaign_id": "UUID_DA_CAMPANHA" }
]
```

Retorno: `{"imported":2,"duplicates":0}`. A importação não altera nome, estado ou tentativas de um contato já existente.

Solicitar chamada:

```json
{ "phone": "1001", "idempotency_key": "UUID_V4_UNICO" }
```

Reenvie a mesma chave somente ao repetir a mesma solicitação. Operador precisa estar disponível com presença recente; a central precisa estar conectada. A rede pública precisa estar habilitada no ambiente. Tokens de integração não têm acesso a essa operação.

Listagem paginada:

```json
{ "data": [], "page": 1, "total": 0, "page_size": 100 }
```

## Restrições

- Telefones externos exigem código do país e `+`; ramais aceitam 3 a 6 dígitos.
- Senhas iniciais: mínimo de 12 caracteres.
- Importação: até 1.000 contatos e corpo máximo de 1 MB.
- Tentativas por campanha: 1–10; horários: 0–24, final maior que inicial.
- Timeout de fila: 15–600 segundos.
- Não há endpoint de exclusão de histórico ou usuários; desative usuários/filas para preservar os registros.

## Erros

Formato: `{"error":"Mensagem","request_id":"UUID"}`.

| Código | Significado                                                                 |
| ------ | --------------------------------------------------------------------------- |
| 400    | JSON malformado                                                             |
| 401    | Ausência de autenticação, sessão inválida ou token revogado                 |
| 403    | Perfil sem permissão                                                        |
| 404    | Recurso/arquivo indisponível                                                |
| 405    | Operação não suportada                                                      |
| 409    | Duplicidade, conflito, operador indisponível ou telefonia externa bloqueada |
| 413    | Corpo excedeu limite                                                        |
| 422    | Falha de schema/validação                                                   |
| 429    | Limite de requisições                                                       |
| 503    | Serviço/configuração indisponível                                           |
