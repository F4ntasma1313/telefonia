# Instalação e configuração

## 1. Painel local

Requisitos: Node.js 24 LTS, npm e Git. O painel funciona no Windows; a central Asterisk deve operar em Linux (máquina, VM ou servidor). O Docker instalado no computador não estava com o daemon ativo durante o desenvolvimento; não há afirmação de teste de PBX em container.

```bash
git clone https://github.com/F4ntasma1313/telefonia.git
cd telefonia
npm ci
npm run dev
```

Abra `http://127.0.0.1:3000`. Sem Supabase, a demonstração é automática. O modo de demonstração descarta alterações ao recarregar; ele serve para explorar a aplicação e validar os fluxos.

## 2. Supabase

1. Crie um projeto Supabase dedicado a esta aplicação.
2. No SQL Editor, execute `supabase/setup.sql` uma única vez em um banco novo. Ele reúne as migrações em uma transação; regenere com `npm run db:bundle` se alterar os SQLs. Alternativamente, execute cada arquivo de `supabase/migrations` em ordem. Não execute as duas opções nem reaplique a instalação inicial. Não use estas migrações em um projeto com outras aplicações: elas restringem grants do schema público.
3. Copie `.env.example` para `.env.local`.
4. Preencha URL, anon key e service role key do projeto. A service role é segredo exclusivo do servidor.
5. Preencha `BOOTSTRAP_EMAIL`, `BOOTSTRAP_PASSWORD` (12 caracteres ou mais) e `BOOTSTRAP_NAME`.
6. Execute `npm run bootstrap` uma única vez para criar o administrador de ramal 1000.
7. Remova `BOOTSTRAP_PASSWORD` do ambiente e reinicie o painel.

Use a conta criada para entrar. Cadastre a fila de entrada 2000, usuários e vínculos de filas. O bootstrap não cria automaticamente configurações reais de operação.

As variáveis `NEXT_PUBLIC_*` são incorporadas no build do navegador. Configure-as antes de `npm run build`; ao mudar de projeto Supabase, reconstrua a aplicação.

## 3. Asterisk em Linux

Instale Asterisk 20 ou superior, Node.js 24 e os módulos PJSIP, ARI, WebSocket, RTP/ICE, SRTP, WAV e música de espera. Siga o [guia oficial de WebRTC](https://docs.asterisk.org/Configuration/WebRTC/Configuring-Asterisk-for-WebRTC-Clients/).

Copie os arquivos de `infra/asterisk` para `/etc/asterisk`, preservando uma cópia da configuração anterior se já houver central instalada. Este repositório parte de uma instalação nova; não sobrescreva uma central existente sem revisão.

- `http.conf`: HTTP ARI somente em 127.0.0.1:8088; SIP WSS em 8089.
- `pjsip.conf`: transporte WSS e template de endpoint WebRTC.
- `extensions.conf`: browser sem discagem direta; tronco enviado ao Stasis.
- `rtp.conf`: portas RTP 10000–10100 UDP.
- `ari.conf.example`: copie para `ari.conf` e substitua o segredo.

Use certificado TLS confiável do domínio do PBX. Coloque certificado e chave nas localizações indicadas em `http.conf`, com leitura para o usuário Asterisk. Não comite certificados/chaves privados.

Crie o usuário de serviço `nexuscc`, grupo `asterisk`, e a pasta `/etc/asterisk/generated` pertencente a `nexuscc:asterisk`, modo 0750. O worker escreve o arquivo de endpoints com modo 0640; o processo Asterisk precisa lê-lo.

Em `.env.local` da máquina Linux:

```dotenv
ARI_URL=http://127.0.0.1:8088/ari
ARI_USERNAME=nexuscc
ARI_PASSWORD=SEGREDO_DO_ARI_CONF
SIP_WSS_URL=wss://pbx.seudominio.com:8089/ws
SIP_DOMAIN=pbx.seudominio.com
ASTERISK_ENDPOINTS_FILE=/etc/asterisk/generated/endpoints.conf
ALLOW_EXTERNAL_CALLS=false
MAX_CONCURRENT_CALLS=5
```

Preencha também as variáveis Supabase. O worker e a aplicação devem usar o mesmo banco; a aplicação precisa de `SIP_WSS_URL` e `SIP_DOMAIN` para entregar o endereço de registro ao operador.

Execute `npm run telephony`. A primeira execução provisiona os endpoints. Novos usuários aparecem em até 30 segundos. Verifique no console Asterisk:

```text
http show status
ari show users
pjsip show endpoints
pjsip show contacts
```

## 4. Rede e áudio

- Navegador precisa de HTTPS (ou localhost no desenvolvimento) para microfone.
- Libere WSS 8089 para os operadores; não exponha ARI 8088.
- Configure firewall/RTP, IP público, redes locais e parâmetros de NAT conforme o servidor.
- Se houver NAT restritivo, adicione STUN/TURN próprio e configure ICE no cliente SIP.js. A configuração padrão não inclui TURN.
- A faixa RTP inicial atende ao piloto, não representa dimensionamento para grande call center.
- Teste áudio bidirecional com dois navegadores/contas em redes relevantes para a operação.

No Windows, o painel pode usar ARI de um Linux remoto apenas por rede privada/VPN; o worker deve rodar no host que compartilha a configuração do Asterisk. Não expor ARI publicamente para facilitar o teste.

## 5. Teste interno sem tarifa

1. Cadastre dois usuários, por exemplo ramais 1000 e 1001.
2. Entre em dois perfis de navegador ou dois computadores.
3. Abra “Meu telefone” e “Conectar ramal” em ambos. Permita o microfone ao atender.
4. No primeiro, disque 1001. Atenda a chamada de retorno no primeiro e depois no segundo.
5. Verifique áudio, mudo, espera, DTMF, encerramento, histórico e gravação.

O primeiro operador é chamado antes do destino. Isso é intencional no fluxo progressivo.

Para exercitar uma entrada de fila sem operadora, um administrador do PBX pode originar uma chamada de teste no console Asterisk usando `Local/2000@internal-queue-test` com uma aplicação de áudio. Essa validação local não substitui um teste de entrada pelo tronco real.

## 6. Operadora SIP

Contrate um tronco e um número somente quando estiver pronto para testar a rede pública. Copie `carrier.conf.example` para `carrier.conf` e substitua todos os campos conforme a operadora. Ajuste codecs, autenticação, registro e identificação por IP com a documentação dela.

O template `from-carrier` envia entradas à fila 2000; adapte o mapeamento do DID. Configure `ASTERISK_TRUNK=carrier`, identificação de origem autorizada e `ALLOW_EXTERNAL_CALLS=true` no worker **e** na API. Reinicie ambos. Use limites de crédito da operadora durante o piloto.

## 7. Execução contínua

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run start
```

Use proxy HTTPS para o Next.js, limite de corpo HTTP e rate limiting. Para o worker, adapte `infra/systemd/nexuscc-telephony.service` ao caminho de Node/npm instalado. O exemplo pressupõe o projeto em `/opt/nexuscc`, usuário `nexuscc`, grupo `asterisk` e `.env.local` protegido nesse diretório. O `tsx` é necessário em runtime para esse processo; não omita dependências de desenvolvimento nessa modalidade de instalação.

Monitore falhas do serviço, uso de disco, objetos no Storage, chamadas presas e despesas da operadora. Defina backup do banco, retenção das gravações e alertas antes da produção.

## Variáveis

| Variável                              | Uso                                                 |
| ------------------------------------- | --------------------------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL              | URL pública do projeto, navegador e servidor        |
| NEXT_PUBLIC_SUPABASE_ANON_KEY         | Chave pública de acesso ao Auth                     |
| SUPABASE_SERVICE_ROLE_KEY             | Acesso administrativo exclusivamente no servidor    |
| SIP_WSS_URL / SIP_DOMAIN              | Destino de registro SIP                             |
| ARI_URL / ARI_USERNAME / ARI_PASSWORD | Controle privado do PBX                             |
| ASTERISK_TRUNK                        | Nome do endpoint do tronco                          |
| OUTBOUND_CALLER_ID                    | Identificação de origem aprovada pela operadora     |
| ALLOW_EXTERNAL_CALLS                  | Habilita rede pública; padrão false                 |
| MAX_CONCURRENT_CALLS                  | Limite inicial, padrão 5, máximo do software 50     |
| ASTERISK_ENDPOINTS_FILE               | Arquivo gerado de ramais no host do worker          |
| BOOTSTRAP_*                           | Usadas somente na criação do primeiro administrador |
