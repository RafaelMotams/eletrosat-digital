# SinalVivo

Sistema inovador de **saúde da conectividade escolar** dentro do Netvius.

## Problema real

Escolas rurais perdem internet e ninguém sabe por dias. Diretores não sabem diagnosticar. Técnicos fazem deslocamentos caros quando a falha é falta de energia ou queda regional do provedor.

## Solução

1. Página pública `/sinal-vivo/:slug` — a escola envia um pulso em um toque
2. Triagem automática (energia → LEDs → vizinhos)
3. Crowdsourcing: 3+ escolas do mesmo município com falha = incidente regional
4. Painel admin `/admin/sinal-vivo` — índice de saúde, silêncios e incidentes
5. Abertura opcional de manutenção só quando a falha parece local

## Como usar

1. No painel, abra **SinalVivo** e copie o link público
2. Envie o link (WhatsApp) para diretores/coordenadores
3. Acompanhe pulsos, silêncios e incidentes no painel
