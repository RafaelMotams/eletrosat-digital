# Diagnóstico Incremental — Netvius Enterprise V7

**Fonte da especificação:** arquivo fornecido pelo usuário em `/home/ubuntu/upload/Prompt-Mestre-Netvius-4.md` (5.877 linhas).  
**Data da auditoria:** 25/08/2026.  
**Princípio de execução:** evolução incremental, sem apagar dados existentes e sem reescrever módulos funcionais sem necessidade.

## Diretrizes prioritárias extraídas

| Prioridade | Regra | Critério verificável |
|---|---|---|
| P0 | Nunca misturar dados entre empresas | Sessão define tenant; consultas, mutações, arquivos, relatórios e cache validam o tenant no servidor; testes cruzados falham com `FORBIDDEN` |
| P0 | Master e revenda não acessam dados operacionais do cliente | Não existe personificação direta; telas Master mostram somente controle, planos, status e saúde agregada |
| P0 | Operações do técnico exigem sessão assinada | IDs enviados pelo cliente nunca autorizam acesso; técnico só lê e altera registros próprios |
| P0 | Offline sem duplicidade nem perda | Outbox idempotente, estados de sincronização claros, rascunhos preservados e conflitos não apagados silenciosamente |
| P0 | Conclusão de OS de instalação continua simples | AP instalada, observação e mapa de calor; sem checklist, MAC, materiais ou horário final manual |
| P0 | Manutenção permanece módulo separado | Quilometragem e remuneração de manutenção não alteram o fluxo de instalação |
| P0 | Excel verdadeiro e auditável | `.xlsx` nativo, dados reais, filtros, estilos, fórmulas seguras e tenant validado |
| P0 | Divergências de AP não podem ser compensadas silenciosamente | `AP a menos = MAX(planejada - instalada, 0)`; `AP a mais = MAX(instalada - planejada, 0)`; diferença e percentual separados |
| P1 | Estados completos de interface | Carregando, vazio, erro, offline, conflito, sucesso e permissão negada nas telas críticas |
| P1 | Acessibilidade e desempenho | Cor não é o único indicador; nomes longos não sobrepõem ações; fluxo de campo legível em celular simples |

## Auditoria do estado encontrado

| Domínio | Conformidades atuais | Lacunas confirmadas | Ação incremental |
|---|---|---|---|
| Autenticação de tenant | JWT de revenda, tenant derivado da sessão e testes de isolamento | Banco MySQL/TiDB depende de filtros de aplicação; RBAC ainda é limitado a `admin` e `viewer` | Reforçar políticas deny-by-default e ampliar testes por recurso |
| Central Master | Gestão de tenants, planos, status e administradores | Existia personificação que gerava token operacional de cliente | Remover endpoint e botões de personificação |
| Técnico | Login por email/senha, modo offline e IDs idempotentes | Rotas operacionais aceitavam `tecnicoId` em procedimentos públicos | Criar cookie JWT de técnico e validar técnico/tenant/registro em cada operação |
| Manutenção | Módulo separado, km, remuneração, fotos e IA | Listagem, detalhes, upload e conclusão técnica eram públicos | Exigir sessão assinada e usar prefixo de storage por tenant |
| Arquivos | S3 com URL assinada e `clientId` idempotente | Chaves antigas não possuíam namespace de tenant; Drive usava raiz compartilhada | Prefixar novos objetos e pastas com tenant; preservar caminhos antigos para leitura |
| Offline | IndexedDB, fila, backoff, banner e prevenção de duplicidade | Dados locais ainda não possuem migração criptografada; sincronização depende de fallback do app | Planejar migração versionada sem apagar pendências existentes |
| Relatórios | XLSX nativo, múltiplas abas e bloqueio financeiro de viewer | Faltam AP a menos, AP a mais, diferença e percentual lado a lado | Centralizar cálculo no servidor e refletir UI/Excel |
| Interface | Landing, técnico, revenda e Master possuem identidade consistente | Estados de permissão negada e conflito não são uniformes | Criar componentes de estado reutilizáveis e contratos por tela |

## Correções P0 já iniciadas nesta etapa

1. Foi criado procedimento autenticado específico para técnico com cookie JWT assinado.
2. Login técnico passou a emitir sessão HTTP-only.
3. Consultas de escolas, ordens e ganhos passaram a exigir que o ID solicitado seja o mesmo da sessão.
4. Início, impedimento, conclusão, fotos e mapa de calor passaram a validar técnico, tenant, escola e OS.
5. Chaves de novos uploads de OS e manutenção passaram a usar `tenants/{tenantId}/...`.
6. Rotas técnicas de manutenção passaram a exigir sessão; detalhes e IA aceitam revenda ou técnico somente dentro do tenant autorizado.
7. O endpoint e as ações visuais de personificação foram removidos da Central Master.
8. Testes de regressão foram ampliados para sessão técnica, acesso cruzado e fotos de outro tenant.

## Restrições arquiteturais atuais

O projeto usa MySQL/TiDB com Drizzle. A especificação sugere banco dedicado por empresa ou PostgreSQL com RLS, mas migrar diretamente a produção para outro banco nesta etapa criaria risco elevado. A estratégia segura é manter o schema atual, fechar primeiro todos os caminhos de IDOR e autorização, versionar arquivos por tenant, ampliar testes automatizados e somente então avaliar provisionamento físico por tenant com migração gradual e rollback.

## Próximos portões

O próximo checkpoint deve validar: compilação, testes de sessão técnica, login real, sincronização offline após renovação de sessão, ausência de personificação, isolamento de arquivos novos e compatibilidade do aplicativo existente. Depois disso, seguem segregação do Google Drive, cálculos de AP no relatório e estados de interface.
