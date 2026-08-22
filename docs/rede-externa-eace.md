# Rede Externa e Assistente Técnico EACE

## Objetivo

O módulo separa a rede externa (o link que chega à escola) da execução da rede interna. O painel administrativo importa e classifica evidências; o aplicativo do técnico mostra o estado da rede e, quando classificada, a foto do roteador/modem de referência.

## Organização recomendada das pastas

Use o INEP para evitar escolas homônimas:

```text
Rede Externa/
  29000001 - Escola Municipal São José/
    fachada.jpg
    roteador-onu.jpg
    entrada-drop.jpg
    teste-speedtest.png
  29000002 - Escola Estadual Maria da Luz/
    ...
```

O sistema prioriza INEP exato, depois nome exato e, por último, similaridade conservadora. Associações incertas ficam na fila de revisão. A categoria é sugerida pelo caminho/nome, mas o administrador pode corrigir a classificação. Uma foto só aparece como “Roteador/Modem” para o técnico depois de receber essa categoria.

## Fontes de entrada

- pasta selecionada no navegador;
- ZIP (entradas armazenadas ou Deflate, com proteção contra travessia de caminho e limites de descompactação);
- fotos avulsas;
- árvore de uma pasta do Google Drive compartilhada com a conta de serviço.

Arquivos que não forem reconhecidos pelo conteúdo como imagem são recusados. JPG/JPEG, PNG, WebP, GIF, BMP, TIFF, HEIC/HEIF, AVIF e DNG são reconhecidos; a pré-visualização depende do suporte do navegador. O envio manual é limitado a 9 MB por foto devido ao limite HTTP atual; a sincronização do Drive aceita até 25 MB por foto.

## Google Drive

Variáveis já utilizadas pelo servidor:

- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_DRIVE_FOLDER_ID` (continua sendo o destino do exportador de fotos de OS existente)

Para a Rede Externa, o ID da pasta de leitura é salvo por tenant no painel. Compartilhe essa pasta com `GOOGLE_CLIENT_EMAIL`; a leitura é recursiva e não altera o conteúdo do Drive. Cada sincronização processa um lote para evitar estouro de tempo. Arquivos são identificados por ID/horário de modificação e conteúdo SHA-256.

## Base de conhecimento do assistente

O assistente usa uma base pública versionada e não trata regras internas da executora como norma oficial. Ele deve:

- separar observação, hipótese e evidência ausente;
- apresentar de duas a quatro opções quando houver alternativas;
- classificar a origem de cada orientação;
- pedir projeto/POP vigente, manual ou responsável técnico quando a decisão depender deles;
- não inventar medição, modelo, distância, credencial, condição elétrica ou detalhe não visível na foto.

Fontes públicas incorporadas:

- [Portal institucional da EACE](https://eace.org.br/)
- [RFP pública da EACE hospedada pela Anatel](https://sistemas.anatel.gov.br/anexar-api/publico/anexos/download/b44c4425146c21f812fca346425f07c9)
- [Documento público complementar de rede de acesso e testes](https://sistemas.anatel.gov.br/anexar-api/publico/anexos/download/19ab1bd88ee38fbcecb0bbb55592b5c6)

## Implantação

1. Aplicar a migração `0020_rede_externa_eace`.
2. Confirmar as credenciais do armazenamento já exigidas pelo projeto.
3. Configurar a conta de serviço do Google Drive e compartilhar a pasta de origem.
4. No painel, abrir **Rede Externa**, salvar o link da pasta, verificar e sincronizar.
5. Revisar associações incertas e classificar explicitamente a foto de roteador/modem.
6. Validar no aplicativo com um técnico atribuído à escola.

Fotos, caminhos e observações ficam isolados por tenant. O técnico só consulta escolas atribuídas a ele.
