# Revisão de Segurança — 22 de agosto de 2026

## Controles corrigidos nesta revisão

As operações de tenant agora deixam de usar um segredo JWT previsível como fallback. Em produção, a aplicação exige `JWT_SECRET` configurado e com tamanho mínimo; se esse requisito não for atendido, o servidor falha ao iniciar em vez de aceitar sessões assinadas com uma chave conhecida. Em desenvolvimento e testes, a chave de fallback é aleatória e fica somente em memória.

As sessões de administradores de tenant passaram a usar cookie `HttpOnly`, com expiração de oito horas e validação do administrador e do tenant no servidor. O aplicativo não mantém mais o token administrativo de tenant em `localStorage`, e a exportação de OS utiliza a sessão do cookie. O suporte a cabeçalho Bearer permanece somente como compatibilidade temporária para clientes legados.

Também foram fechados os seguintes controles de autorização: exportação de relatórios sem sessão válida, acesso implícito do OAuth ao tenant padrão, alterações de administradores de outro tenant, alterações/exclusões de planilhas de outro tenant e mutações realizadas por perfis `viewer`.

## Limites e ações externas necessárias

| Tema | Situação | Ação necessária |
|---|---|---|
| Segredos que possam ter sido versionados anteriormente | Não foi reescrito o histórico para preservar a integridade do repositório | Rotacionar JWT, senhas de banco, credenciais de serviços e chaves externas; depois revogar sessões ativas |
| Arquivos locais de banco e consultas antigas | Novos artefatos foram adicionados ao `.gitignore`; arquivos antigos rastreados não foram removidos | Revisar o histórico e remover/invalidar dados sensíveis somente com autorização explícita |
| Sessão de superadmin | Ainda há fluxo legado a migrar para cookie HttpOnly | Migrar painel e login do superadmin antes de eliminar a compatibilidade de token legada |
| Notificação WhatsApp de cadastro | Não implementada sem provedor configurado | Conectar Meta WhatsApp Cloud API, Twilio ou outro provedor aprovado |
| Fotos no armazenamento | As rotas da aplicação validam o tenant, mas a camada de armazenamento ainda usa URLs públicas do provedor | Projetar acesso assinado e autorizado por tenant antes de classificar fotos como confidenciais em repouso |
| Operação sem conexão | O Service Worker mantém interface e rotas já visitadas; o produto não anuncia mais sincronização de fotos ou conclusão de OS sem conexão | Implementar e testar uma fila transacional explícita antes de prometer sincronização offline de mutações |
| Confirmação por email | O fluxo de cadastro é testável por mock, mas a chave Resend atual é um placeholder curto | Configurar uma chave Resend válida e executar um teste controlado de entrega |
| Google Drive | Integração retirada por decisão operacional; nenhum upload ou reenvio ao Drive é mais executado | Fotos existentes permanecem no armazenamento atual; uma futura integração só será criada mediante nova aprovação |

## Validação desta etapa

O TypeScript compilou sem erros e as suítes de segurança, isolamento, cálculo, cadastro e rotas administrativas passaram. Após retirar o Google Drive, a execução integral passou a ter somente um bloqueio externo: a chave Resend de ambiente não está configurada de forma utilizável para confirmação real de email. Esse ponto não foi mascarado nem substituído por simulação.

> Nenhum sistema pode prometer impedir todo ataque. Os controles acima reduzem riscos concretos por meio de autenticação no servidor, autorização por tenant, princípio de menor privilégio, expiração de sessão, auditoria e falha fechada quando dependências críticas não estão disponíveis.
