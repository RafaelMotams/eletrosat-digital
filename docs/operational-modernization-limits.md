# Limites operacionais da modernização

## Dados e isolamento

O Netvius usa **banco compartilhado com isolamento lógico por tenant**. Consultas e mutações operacionais derivam o `tenantId` da sessão autenticada e não aceitam seleção arbitrária de cliente no navegador. A mudança para bancos físicos separados exigiria uma migração de arquitetura, plano de reversão, nova infraestrutura e autorização explícita; ela não foi executada nesta atualização.

## Fotos do fluxo técnico

No fluxo técnico atual, a conclusão usa exclusivamente a categoria **mapa de calor**. Registros e fotos históricos permanecem preservados; não houve exclusão de objetos nem de dados de clientes. A foto enviada no fluxo de OS permanece vinculada ao tenant e à OS no armazenamento já configurado.

## Integrações externas

WhatsApp, Google Drive e envio de e-mail permanecem **desativados** por decisão do usuário. O aplicativo pode abrir navegação de mapa pelo dispositivo, mas não realiza envio por WhatsApp nem sincronização com Google Drive.

## Diagnóstico de rede

O navegador pode informar conexão, latência até o serviço e falhas de requisição. Ele não consegue determinar com segurança VLAN, DHCP, gateway, portas físicas ou configuração interna de switches sem uma integração específica de rede; o sistema não deve fingir essa capacidade.
