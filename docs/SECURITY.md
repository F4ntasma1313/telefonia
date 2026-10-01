# Segurança e acesso

## Perfis

| Recurso                              | Administrador   | Supervisor      | Operador                 | Token API            |
| ------------------------------------ | --------------- | --------------- | ------------------------ | -------------------- |
| Operação geral                       | Sim             | Sim             | Somente próprio contexto | Listagens permitidas |
| Criar/desativar usuários             | Sim             | Não             | Não                      | Não                  |
| Gerenciar filas, campanhas e mailing | Sim             | Sim             | Não                      | Sim                  |
| Emitir/revogar tokens                | Sim             | Não             | Não                      | Não                  |
| Credencial SIP                       | Somente própria | Somente própria | Somente própria          | Não                  |
| Solicitar discagem manual            | Próprio ramal   | Próprio ramal   | Próprio ramal            | Não                  |
| Gravações                            | Todas           | Todas           | Próprias                 | Não                  |

A API valida o JWT com Supabase Auth e consulta o perfil ativo em cada solicitação. Esconder botões não é o controle de segurança: a autorização é executada no servidor.

## Segredos

- `SUPABASE_SERVICE_ROLE_KEY` e `ARI_PASSWORD` são somente servidor.
- Arquivos `.env*`, configurações geradas de ramais e certificados não entram no Git.
- Senhas de usuários pertencem ao Supabase Auth.
- Senhas SIP precisam ser recuperáveis para provisionar endpoints e registrar o navegador; estão isoladas em tabela sem acesso direto de clientes.
- Tokens de API aleatórios de 256 bits são persistidos por SHA-256. O token original aparece somente na emissão.

## Banco e mídia

RLS habilitado em todas as tabelas da aplicação, sem políticas permissivas ao cliente. A API usa service role após autorização. Storage privado e links temporários após checagem de acesso.

HTTPS e WSS são necessários na operação pública. ARI HTTP deve ficar na interface local ou em rede privada; nunca expor porta 8088 à internet. Restrinja SIP 5060 aos endereços da operadora e permita RTP somente conforme o desenho de rede.

## Limites desta versão

Produto de organização única. Tokens têm um conjunto fixo de permissões de integração; não há escopos individuais por token. Auditoria básica registra mutações, sem captura de payloads sensíveis. Autenticação multifator, política de retenção e gestão de incidentes precisam ser definidas para produção.

Instale a API atrás de proxy com limite de corpo e limitação de requisições. Não exponha diretamente o servidor de desenvolvimento. Ative os controles de autenticação e rate limiting disponíveis no Supabase para login.

A API também aplica limite compartilhado em banco de 180 requisições/minuto por usuário ou token autenticado. A proteção de requisições anônimas e do endpoint de login continua dependendo do proxy/Supabase.

Gravações e mailing contêm dados pessoais. Defina base de tratamento, comunicação aos participantes, prazo de retenção e acesso apropriados à sua organização antes da operação real. Esta documentação não substitui análise jurídica específica.
