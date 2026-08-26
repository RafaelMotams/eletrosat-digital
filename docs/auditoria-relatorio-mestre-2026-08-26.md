# Auditoria de aderência — Relatório Mestre

**Data:** 26/08/2026  
**Escopo:** evolução do Netvius a partir do relatório anexado, sem reescrita e sem alterar dados produtivos nesta etapa.

## Decisões de compatibilidade

O relatório anexado usa a denominação histórica **Eletrosat Digital**, mas a decisão posterior do produto estabelece **Netvius** como marca pública única. Portanto, a implementação preservará Netvius na experiência pública, painéis e exportações. A referência antiga permanece somente onde for necessária à leitura de histórico técnico, não à interface.

Também não serão reativadas integrações com WhatsApp, e-mail, Google Drive, cobrança ou provedores externos. Essas integrações exigem autorização, credenciais e configuração própria; o produto manterá os fluxos internos sem depender delas.

## Estado confirmado

| Área | Evidência no código | Situação |
|---|---|---|
| Sessões de painel e técnico | Sessões assinadas, persistentes e revogáveis já existem no servidor | Revalidar consistência da interface e remover identidade de storage local |
| Isolamento de manutenção | Router modular de manutenção usa tenant da sessão e laudo já é delimitado por tenant | Cobrir novamente fotos e helpers por testes de acesso cruzado |
| Evidências de OS | Upload usa higienização de imagem e chaves por tenant | Simplificar contrato e tabela legada para somente mapa de calor |
| Conclusão da OS | Interface já restringe a categoria visível a mapa de calor | Cliente e servidor ainda admitem observação opcional e código legado de categorias extras |
| Aplicativo técnico | Rotas, offline e sincronização já existem | Há leitura de identidade técnica no localStorage a substituir gradualmente pela sessão validada |
| Assistente | Base técnica versionada TP-Link/Intelbras e assistência contextual existem | Falta rota autônoma com conversa, imagem privada, fontes e política unificada |
| Admin e Master | Isolamento e restrições operacionais do Master já foram reforçados | Consolidar UX, capacidades e ciclo seguro de arquivamento de tenant |

## Prioridade de execução

1. Corrigir o contrato de conclusão de OS em cliente e servidor, preservando a fila offline.
2. Remover a leitura de identidade/autorização do localStorage, sem remover a persistência local isolada de rota e rascunho necessária ao uso em campo.
3. Criar o Assistente Técnico independente usando somente fontes aprovadas e arquivos privados temporários.
4. Expandir os ajustes operacionais, auditoria e qualidade com testes de isolamento antes de cada migração compatível.

## Limitações a tratar honestamente

A separação física de bases por tenant foi apenas projetada no P3 anterior: nenhuma migração produtiva de dados será executada sem inventário, backup validado, reconciliação e aprovação explícita. Não se alegará atualização em tempo real enquanto a tela usar atualização periódica.
