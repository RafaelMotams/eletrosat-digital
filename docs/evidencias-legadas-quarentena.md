# Evidências legadas sem vínculo operacional

## Decisão de segurança

As evidências legadas de OS sem registro operacional correspondente não recebem `tenantId` por inferência. Em vez disso, permanecem **retidas em quarentena** e bloqueadas pelo proxy de armazenamento até uma reconciliação manual auditável.

Essa decisão evita associar uma imagem ao cliente errado e impede que uma chave legada seja usada para contornar o isolamento de tenant. A aplicação mantém acesso apenas às evidências cuja OS ou manutenção vinculada confirma o tenant.

## Resultado da auditoria inicial

| Conjunto | Situação | Tratamento |
|---|---|---|
| Fotos de manutenção com vínculo | Tenant preenchido a partir da manutenção correspondente | Acesso autenticado por tenant e posse |
| Fotos de OS com vínculo | Tenant preenchido a partir da OS correspondente | Acesso autenticado por tenant e posse |
| Fotos de OS sem vínculo operacional | Chaves no padrão legado `os-fotos/` | Quarentena; URL negada pelo proxy |

## Próxima decisão necessária

Não há exclusão automática. Uma eventual reconciliação exigirá uma fonte externa de vínculo autorizada, consulta por lote, registro de auditoria e validação antes de liberar ou descartar qualquer evidência.
