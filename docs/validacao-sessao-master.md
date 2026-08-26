# Validação visual — sessão da Central Master

**Data:** 26 de agosto de 2026  
**Escopo:** validação móvel após a migração do painel Master para sessão por cookie.

A tela de login da Central Master foi verificada em viewport de 390 × 844 px. Os campos, o botão de acesso e os elementos de identidade permanecem legíveis, com espaçamento consistente e sem sobreposição.

A rota do dashboard também foi aberta na mesma sessão de navegador. Como a sessão de teste já possuía credencial ativa, a captura confirmou o carregamento do painel, mas **não constitui prova de acesso sem sessão**. A garantia de negação para sessão de tenant foi coberta pelo teste unitário do middleware `masterProcedure`; a verificação manual de redirecionamento sem cookie exige uma sessão de navegador limpa.
