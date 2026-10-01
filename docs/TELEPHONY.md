# Telefonia

## Ramais

O cadastro cria usuário Auth, perfil e segredo SIP aleatório. O worker consulta os cadastros, gera `endpoints.conf` e solicita reload de `res_pjsip.so`. Atualização em até 30 segundos. O navegador busca somente sua própria credencial em `/api/v1/sip` e registra via WSS.

O telefone deve permanecer aberto em uma sessão autenticada. A presença é renovada a cada 10 segundos enquanto registrado. Operadores sem heartbeat por 45 segundos deixam de ser elegíveis à distribuição.

## Chamada realizada

1. Operador conecta o ramal e informa número internacional ou ramal.
2. API verifica sessão, bloqueio, estado e chave de idempotência.
3. Banco reserva o operador e cria a chamada pendente.
4. Worker cria uma bridge e chama primeiro o ramal do operador.
5. Ao atender, o worker chama o destino; o agente precisa atender sua própria chamada de retorno.
6. Com as duas pernas atendidas, a bridge inicia gravação e o registro passa a ativo.
7. Encerrar qualquer perna fecha ambas; banco registra encerramento e libera o operador.

Chamadas externas estão bloqueadas por padrão (`ALLOW_EXTERNAL_CALLS=false`). O contexto SIP do navegador não permite discagem direta, impedindo contornar a validação HTTP. O timeout de cada origem é de 25 segundos.

## Chamada recebida

O tronco entrega ao contexto `from-carrier`, que executa `Stasis(nexuscc,incoming,2000)`. O valor `2000` deve corresponder ao número da fila cadastrada; configure rotas diferentes para cada DID.

O worker atende a chamada, cria bridge, toca música de espera e procura operadores da fila por maior tempo disponível. Se não houver operador, aguarda até o timeout da fila. Desistência/timeout registra abandono. Nesta versão, falha do primeiro ramal selecionado encerra a tentativa de atendimento; redistribuição entre vários agentes após não atendimento é uma evolução pendente.

## Campanhas

Progressivas, com um contato por operador reservado. Campanhas são executadas na janela configurada em horário de São Paulo, todos os dias. Cada contato admite tentativas limitadas, com intervalo de 15 minutos nas falhas. Números bloqueados não entram na seleção.

Máximo padrão: cinco chamadas simultâneas; ajuste `MAX_CONCURRENT_CALLS` após dimensionar o servidor e o tronco. Pausar campanha interrompe a seleção de novos contatos e preserva chamadas já iniciadas. O esgotamento do mailing não encerra automaticamente a campanha; o estado pode ser alterado via API.

Antes de campanhas reais, configure as janelas operacionais e uma lista de bloqueio adequadas à sua operação. Ainda não há feriados, regras por UF, AMD ou discagem preditiva.

## Falhas

O worker exige conexão ARI e Supabase ao iniciar. Perda da conexão ARI ou lease interrompe o serviço. A unidade systemd reinicia após 35 segundos. Reinicialização marca sessões anteriores interrompidas como falhas; não promete preservar conversas em andamento.

A recuperação também cancela solicitações que ainda estavam pendentes, para evitar discagens inesperadas após reinício. Entradas durante inicialização são rejeitadas até o worker ficar pronto.

O serviço sincroniza gravações periodicamente e reaproveita arquivos locais após reinício. Os logs são JSON e incluem identificador de chamada quando aplicável, sem credenciais.

## Referências técnicas

- [Asterisk WebRTC](https://docs.asterisk.org/Configuration/WebRTC/Configuring-Asterisk-for-WebRTC-Clients/)
- [ARI Channels](https://docs.asterisk.org/Latest_API/API_Documentation/Asterisk_REST_Interface/Channels_REST_API/)
- [ARI Bridges](https://docs.asterisk.org/Latest_API/API_Documentation/Asterisk_REST_Interface/Bridges_REST_API/)
- [Gravação ARI](https://docs.asterisk.org/Configuration/Interfaces/Asterisk-REST-Interface-ARI/Introduction-to-ARI-and-Media-Manipulation/ARI-and-Media-Part-1-Recording/)
- [SIP.js SimpleUser](https://sipjs.com/guides/simple-user/)
