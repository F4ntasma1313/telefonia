# Estratégia de custos

## O que pode começar sem mensalidade de licença

Asterisk, SIP.js, React, Next.js e o código deste projeto permitem uma central sem contratação de licença comercial do motor de telefonia. Instalar localmente em um computador disponível permite explorar o painel e testar chamadas entre ramais internos.

Isso não elimina custos de energia, internet, equipamento, manutenção ou tempo de operação. O projeto não inclui contas contratadas nem serviços provisionados.

## Supabase

É possível começar com o plano gratuito, sujeito aos limites vigentes e às condições da conta. Gravações consomem armazenamento e tráfego rapidamente; o plano gratuito não deve ser tratado como armazenamento ilimitado. Verifique os valores atuais em [Supabase Pricing](https://supabase.com/pricing).

WAV mono de 8 kHz e 16 bits usa aproximadamente 0,96 MB/minuto, antes de overhead. Uma hora equivale a aproximadamente 57,6 MB. Essa estimativa depende do formato efetivo gerado pela central; meça amostras reais antes de estimar capacidade.

## Rede telefônica

Para falar com números de telefone comuns é necessário um tronco SIP e, para receber de fora, um DID/número contratado. Tarifas, identificação de origem, canais simultâneos e chamadas para celulares variam por operadora. Não há promessa de chamadas externas gratuitas.

## Implantação sugerida

1. Desenvolvimento local e demonstração: máquina existente.
2. Prova de conceito: Supabase e Asterisk em Linux, dois headsets, dois usuários e chamadas internas.
3. Piloto: servidor com IP público, TLS, configuração de NAT e operadora SIP com limite de gasto.
4. Produção: capacidade dimensionada, backup, monitoramento, retenção e suporte.

Não foram contratados serviços ou gerados custos de telefonia durante a implementação. As chamadas externas ficam desabilitadas por padrão.
