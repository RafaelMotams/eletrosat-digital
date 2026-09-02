# Radar de Prontidão de Visita

## O problema real

Em instalação e manutenção de internet em escolas públicas, o desperdício mais
caro não é a instalação difícil: é a **viagem perdida**. O técnico dirige dezenas
de quilômetros até uma escola rural e volta sem concluir nada porque:

- a escola estava fechada, em férias, em reforma ou desativada;
- não havia contato para confirmar que alguém abriria o portão;
- o endereço estava incompleto e não havia coordenada para navegar;
- a escola não tinha técnico responsável ativo;
- faltava material na mochila para os pontos de acesso previstos.

Cada ocorrência custa combustível, um dia de equipe e prazo de contrato. Antes
desta funcionalidade, o sistema só registrava o desfecho **depois** da viagem:
o motivo de não instalação era preenchido no retorno, quando o custo já ocorreu.

Os dados necessários para prever quase todos esses casos já existiam no banco,
espalhados entre escolas, atribuições, ordens de serviço, manutenção e estoque.
O que faltava era cruzá-los antes do deslocamento.

## O que o sistema faz

O Radar avalia cada visita pendente e responde uma pergunta objetiva: **se a
equipe saísse hoje, esta visita terminaria em instalação?**

Cada visita recebe uma classificação, uma pontuação de 0 a 100 e a lista de
pendências, sempre com a ação corretiva e o responsável por ela:

| Classificação | Significado |
| --- | --- |
| Não saia ainda | Há impedimento: a viagem terminaria sem instalação |
| Confirme antes | Há risco que ainda dá tempo de resolver por telefone |
| Pronta | Localização, contato, responsável e material conferidos |

### Sinais avaliados

| Código | Severidade | Origem do dado |
| --- | --- | --- |
| `impedimento_registrado` | Impedimento | Motivo de não instalação da escola ou da OS |
| `localizacao_desconhecida` | Impedimento | Sem coordenada válida **e** sem endereço navegável |
| `sem_tecnico` / `tecnico_inativo` | Impedimento | Atribuição e cadastro do técnico |
| `material_insuficiente` | Impedimento | Saldo de AP do técnico contra APs previstos |
| `sem_georreferencia` | Alerta | Latitude e longitude da escola |
| `endereco_incompleto` | Alerta | Endereço da escola |
| `sem_contato` | Alerta | Telefone e WhatsApp da escola |
| `escopo_indefinido` | Alerta | Quantidade de APs prevista |
| `visita_sem_desfecho` | Alerta | OS aberta há mais dias que o limite |
| `municipio_reincidente` | Alerta | Taxa de não instalação do município |
| `material_nao_rastreado` | Informativo | Catálogo de estoque sem AP identificado |
| `manutencao_pendente` | Informativo | Manutenções abertas na mesma escola |

Coordenada `0,0` é tratada como resíduo de importação, não como localização.
Sem GPS, mas com endereço completo, a visita é apenas alerta; faltando os dois,
vira impedimento, porque aí não há como chegar.

### Cobertura de material da rota

A conferência por escola não basta: a mochila pode atender cada visita
isoladamente e não cobrir a soma da rota. O Radar soma os APs previstos de todas
as visitas planejadas do técnico e compara com o saldo em posse dele.

## Decisões de projeto

**Nada de estimativa financeira inventada.** O painel mostra contagens
verificáveis (visitas bloqueadas, deslocamentos evitáveis, APs faltantes), não
uma economia estimada em reais que o sistema não tem como comprovar.

**Ausência de registro não é ausência de material.** O saldo de AP só é afirmado
para técnicos que já receberam material rastreado. Quem nunca teve movimentação
aparece como "não rastreado" — caso contrário, toda empresa que ainda não usa o
módulo de estoque veria a carteira inteira bloqueada por falso positivo.

**Identificação de AP é heurística explícita.** A categoria do material tem
prioridade; nome e código só valem com "AP" isolado, para não confundir com
"grampo" ou "papel". A regra está isolada em `identificarMaterialAp` e coberta
por teste.

**Sem migração de banco.** A funcionalidade só lê dados existentes. Não há
tabela nova, coluna nova nem alteração de fluxo operacional.

## Onde está no código

| Camada | Arquivo |
| --- | --- |
| Motor de decisão (puro) | `shared/prontidaoVisita.ts` |
| Testes do motor | `server/prontidaoVisita.test.ts` |
| API e correlação das fontes | `server/routers/prontidao.ts` |
| Testes de autorização e correlação | `server/routers/prontidao.authorization.test.ts` |
| Painel do gestor | `client/src/pages/admin/Prontidao.tsx` |
| Conferência do técnico | `client/src/pages/tecnico/Prontidao.tsx` |

O motor não faz E/S: recebe os dados já isolados por tenant e devolve a
avaliação. Isso mantém a regra de negócio verificável sem banco e permite que o
cliente reaproveite os mesmos tipos para renderizar a explicação.

## Isolamento e permissões

- `prontidao.painel` usa `tenantAdminProcedure`: exige sessão do painel e opera
  apenas sobre `ctx.tenantId`. Por ser consulta, o perfil visualizador tem
  acesso de leitura, como nos demais relatórios.
- `prontidao.minhasVisitas` usa `tecnicoProcedure` e filtra pelo `tecnicoId` da
  sessão assinada, sem aceitar identificador vindo do cliente.
- Todas as consultas filtram por `tenantId`, inclusive os `join` de técnico e
  material.

## Limites conhecidos

- A conferência do técnico exige conexão: ela depende do estado atual da empresa
  e não é calculada offline.
- Calendário escolar, feriados municipais e condição de estrada não são
  avaliados, porque o sistema não tem esses dados.
- A reincidência por município só é considerada com amostra mínima de escolas,
  para não transformar coincidência em alerta.

## Evolução possível

1. Registrar o desfecho real da visita contra a previsão do Radar, medindo a
   precisão de cada sinal ao longo do tempo.
2. Permitir que o tenant ajuste pesos e limiares, hoje fixos no motor.
3. Disparar a conferência automaticamente na véspera da rota, quando o canal de
   notificação for reativado.
