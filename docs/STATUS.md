# Estado da versão 0.1.1

## Implementado

- Estrutura TypeScript MVC por contexto, contratos globais e camada de serviços.
- Painel de operação com métricas derivadas dos registros carregados, filas e operadores.
- Login Supabase, perfis, cadastro de usuários e geração de ramais.
- Gestão de filas, vínculos de operadores, campanhas e importação CSV.
- Lista de bloqueio e classificação de chamadas.
- API REST, tokens revogáveis e especificação OpenAPI.
- Softphone SIP.js com registro, atendimento, encerramento, mute, hold e DTMF.
- Worker ARI com bridges, recebimento, saída, discador progressivo e gravações.
- SQL com reserva transacional, idempotência e lease de worker.
- Configurações de referência Asterisk e systemd.
- Demonstração isolada, com dados fictícios em memória.

## Depende de configuração externa

- Criar projeto Supabase, aplicar migrações, configurar chaves e criar administrador.
- Instalar Asterisk em Linux e configurar TLS, rede, NAT e eventualmente TURN.
- Configurar operador SIP e DID para chamadas com a rede telefônica.
- Conectar headsets/microfones e validar áudio bidirecional.
- Definir hospedagem, backups, monitoramento e retenção das gravações.

## Não incluído nesta versão

- Discador preditivo, detecção de secretária eletrônica, URA gráfica, transferência assistida e conferência.
- Escuta/sussurro de supervisão, tarifador, billing, WhatsApp/chat e módulos de frequência/ranking das referências.
- Multiempresa, múltiplas centrais, alta disponibilidade e recuperação transparente de conversas.
- Calendário de feriados/regras regionais de campanha e relatórios históricos ilimitados no painel.
- Provisionamento automático de conta Supabase, operadora ou servidor pago.
- Compatibilidade binária/contratual com Vonix.

## Homologação

Typecheck, lint, testes automatizados e build são verificações locais. Mesmo aprovados, não equivalem a testes reais de voz. Sem Supabase, PBX e tronco configurados nesta sessão, não foi possível validar chamadas reais, áudio ou uploads contra o ambiente final. Consulte [TESTING.md](TESTING.md).
