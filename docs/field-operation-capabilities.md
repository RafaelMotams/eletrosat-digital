# Recursos de campo avaliados

| Área | Estado atual verificável | Limite importante |
|---|---|---|
| Sincronização offline | A fila IndexedDB conserva OS e fotos que falham, inclusive itens interrompidos em sincronização. O banner informa pendências e erros. | Não deve remover a cópia local antes da confirmação do servidor. |
| Rota | A rota diária usa escolas selecionadas e coordenadas disponíveis; o mapa oferece navegação externa quando há coordenadas. | A ordem administrativa/agendamento não deve ser sobrescrita automaticamente sem um fluxo explícito. |
| Impedimento | A OS oferece o estado de não instalada com motivo registrado, sem exigir foto adicional. | Novos motivos, resposta administrativa e reagendamento exigem contrato de dados e validação por tenant antes de serem adicionados. |
| Diagnóstico web | O navegador consegue informar conectividade e falhas de requisição. | Não pode afirmar diagnóstico de VLAN, DHCP, gateway, portas físicas ou configuração de switch sem integração específica. |

Não foi adicionada telemetria ou teste de rede simulado. Os próximos recursos de impedimento e diagnóstico devem utilizar dados reais, permanecer no escopo do tenant autenticado e ter testes próprios.
