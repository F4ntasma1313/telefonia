# Documentação do projeto

Documentação da versão **0.1.1**, iniciada em 1 de outubro de 2026. Este diretório acompanha a implementação; alterações de contratos, fluxos ou infraestrutura devem atualizar o documento correspondente na mesma tarefa.

| Documento                          | Conteúdo                                         |
| ---------------------------------- | ------------------------------------------------ |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Organização MVC, tecnologias e responsabilidades |
| [DATABASE.md](DATABASE.md)         | Tabelas, relações, funções e armazenamento       |
| [verify.sql](../supabase/verify.sql) | Verificação da instalação do Supabase            |
| [API.md](API.md)                   | Autenticação, endpoints, payloads e erros        |
| [TELEPHONY.md](TELEPHONY.md)       | Fluxos de voz, filas, discador e gravação        |
| [SETUP.md](SETUP.md)               | Preparação local e instalação em Linux           |
| [SECURITY.md](SECURITY.md)         | Permissões, segredos e proteção de acesso        |
| [COSTS.md](COSTS.md)               | Estratégia de baixo custo e recursos necessários |
| [TESTING.md](TESTING.md)           | Verificações automatizadas e homologação real    |
| [STATUS.md](STATUS.md)             | Entregas, dependências externas e limitações     |

## Referências de produto

As capturas fornecidas pelo usuário orientaram os contextos: dashboard de filas, estado dos operadores, ramal, chamadas, gerenciamento e integração. Não foram copiados dados pessoais das capturas para a demonstração.

A página `https://lopescredit.vonixcc.com.br/v1/api-docs/contatos-discador` não ficou acessível durante o desenvolvimento. A API do NexusCC é própria, documentada em `public/openapi.json`; não há alegação de compatibilidade com a API Vonix.

## Histórico

Consulte também [CHANGELOG.md](../CHANGELOG.md). A versão inicial é 0.1.0 porque o workspace não continha projeto nem versão anterior.
