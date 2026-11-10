# Pokemon PC Box - Pokedex Nacional

Site estatico para ajudar no acompanhamento de uma Living Dex de Pokemon da 1a ate a 8a geracao, seguindo a ordem da Pokedex Nacional ate o Pokemon #905.

O projeto mostra os Pokemon organizados em boxes no estilo PC, permite consultar informacoes de cada Pokemon e inclui uma checklist separada para marcar quais ja foram capturados.

## Recursos

- Organizacao em boxes com 5 linhas x 6 colunas.
- 905 Pokemon da Pokedex Nacional, da 1a ate a 8a geracao.
- Busca por nome do Pokemon.
- Modal com detalhes do Pokemon selecionado.
- Navegacao pelo modal usando botoes laterais ou setas do teclado.
- Informacoes de tipo, categoria, regiao, linha evolutiva e metodo de obtencao.
- Secao "Onde encontrar este Pokemon?" com locais por regiao.
- Locais de encontro limitados aos 3 mais uteis por regiao para manter a leitura limpa.
- Tratamento especial para linhas iniciais, lendarios, miticos, Ultra Beasts, fosseis e Pokemon bebe, sem confundir esses casos com encontro selvagem comum.
- Checklist de Living Dex em aba separada.
- Checklist organizada em boxes, nao em lista infinita.
- Marcador visual para Pokemon capturados.
- Selecao em lote dos Pokemon visiveis na box atual.
- Progresso salvo automaticamente no navegador.
- Barras de progresso por regiao, com porcentagem capturada e total pendente.
- Exportacao das boxes para XLS.
- Backup e restauracao da checklist em JSON.
- Layout responsivo para desktop e celular.
- Renderizacao otimizada: a pagina principal renderiza apenas a box ativa.
- Modal com carregamento progressivo para abrir mais rapido.
- Aba Tipos com tabela interativa dos 18 tipos e resumos de ataque e defesa.

## Tecnologias

- HTML
- CSS
- JavaScript puro
- PokeAPI
- LocalStorage do navegador

Nao ha framework, build step, bundler ou dependencias instaladas via npm.

## Estrutura do projeto

### `index.html`

Contem a estrutura principal da pagina: navegacao, boxes, checklist e modal de detalhes.

### `styles.css`

Contem os estilos da interface, responsividade, estados visuais e animacoes.

### `app.js`

Contem a logica principal da pagina:

- carregamento da Pokedex;
- navegacao e renderizacao das boxes;
- checklist da Living Dex;
- busca;
- exportacao;
- modal de detalhes, linha evolutiva e locais de captura.

### `type_chart.js` e `type_chart.css`

Contem a tabela de efetividade dos 18 tipos, selecao interativa, modos de ataque/defesa e estilos responsivos. A tabela e criada somente ao abrir a aba Tipos, e os dados ficam incluidos no projeto, sem requisicoes externas durante o uso.

### Aba `Tipos`

Selecione um tipo para consultar suas relacoes. No modo Defesa, o resumo mostra fraquezas (2x), resistencias (metade do dano) e imunidades (0x). No modo Ataque, mostra contra quais tipos o ataque causa dano dobrado, reduzido ou nenhum dano.

A tabela destaca a linha ou coluna correspondente. Os nomes nas linhas selecionam o tipo de ataque; os nomes nas colunas selecionam o tipo de defesa. No celular, o resumo se adapta a largura disponivel e a tabela permite rolagem horizontal e vertical, mantendo os cabecalhos visiveis.

As relacoes seguem a tabela dos jogos principais da 6a a 8a geracao, incluindo Fada. Nao representam as regras antigas da 1a a 5a geracao, Pokemon GO, tipos duplos, habilidades ou efeitos de itens e golpes. As regras continuam iguais mesmo ao consultar um Pokemon de uma geracao anterior.

Referencia: [tabela oficial de tipos Pokemon](https://sg.portal-pokemon.com/game/type-chart/). Os multiplicadores tambem podem ser conferidos nas relacoes de dano da [PokeAPI](https://pokeapi.co/docs/v2#types).


## Como usar a pagina

### Aba `Boxes`

Mostra os Pokemon em ordem da Pokedex Nacional.

Cada box contem ate 30 Pokemon. Use as setas ou as abas `Box 1`, `Box 2`, etc. para navegar.

Ao clicar em um Pokemon, o modal de detalhes e aberto.

### Busca

Use o campo de pesquisa para encontrar um Pokemon pelo nome.

Ao selecionar um resultado, a pagina leva voce ate a box correta e destaca o Pokemon encontrado.

### Modal de detalhes

O modal mostra:

- numero da Pokedex;
- nome;
- tipos;
- descricao;
- regiao;
- categoria;
- linha evolutiva;
- secao "Onde encontrar este Pokemon?".

Para melhorar a fluidez, o modal abre primeiro com os dados principais. A linha evolutiva pode aparecer alguns instantes depois, sem bloquear a abertura da janela. Descricoes sem versao em portugues sao exibidas no idioma fornecido pela PokeAPI; o site nao envia textos para servicos de traducao de terceiros.

Na linha evolutiva, os Pokemon tambem sao clicaveis. Ao clicar em um Pokemon da evolucao, o modal troca para a descricao desse Pokemon, substituindo a descricao que estava aberta.

Atalhos:

- `Esc`: fecha o modal.
- `Seta esquerda`: Pokemon anterior.
- `Seta direita`: proximo Pokemon.

### Onde encontrar este Pokemon?

A secao busca os dados de encontros nos jogos principais e organiza por regiao.

Para evitar excesso de informacao, cada regiao mostra no maximo 3 locais, priorizando locais mais uteis.

Cada local exibe:

- nome do local;
- nivel;
- chance;
- metodo de encontro.

Se o Pokemon nao aparece na natureza, o site mostra uma explicacao breve, por exemplo:

- linhas completas de Pokemon iniciais;
- Pokemon fossil;
- Pokemon obtido por ovo;
- Pokemon de evento;
- presente especial;
- evolucao ou transferencia.

As linhas dos iniciais sao tratadas como obtencao especial. Por exemplo, Charmander, Charmeleon e Charizard nao sao tratados como captura comum na natureza: a pagina indica escolha inicial/presente, evolucao, troca ou transferencia.

Lendarios, miticos, Ultra Beasts e fosseis tambem mostram um painel de obtencao especial. Isso evita que um registro tecnico da API seja exibido como se fosse uma rota comum: a pagina orienta sobre encontro unico, historia, evento, missao, reviver fossil ou transferencia, conforme a categoria.

Quando for evento, o painel tenta indicar o nome do evento ou distribuicao, como `Old Sea Map`, `GS Ball`, `Member Card`, `Liberty Pass` ou `Mystery Gift`.

### Aba `Checklist`

A checklist serve para controlar quais Pokemon voce ja capturou na Living Dex.

Ela tambem usa boxes, mantendo a organizacao visual da pagina principal.

Voce pode:

- filtrar por nome;
- filtrar por geracao;
- filtrar por status;
- selecionar Pokemon individualmente;
- selecionar todos os visiveis;
- confirmar selecionados como capturados;
- marcar selecionados como pendentes;
- baixar um backup JSON da checklist;
- restaurar o progresso de um backup JSON;
- limpar selecao.

O progresso fica salvo no navegador.

O painel **Progresso por região** mostra quantos Pokemon foram capturados, a porcentagem concluida e quantos faltam em cada regiao. Os totais incluem a checklist inteira e nao mudam ao usar filtros. Galar (#810 a #898) e Hisui (#899 a #905) aparecem separadamente no painel. Clique no titulo do painel para recolher ou reabrir as barras.

## Dados salvos no navegador

O site usa `localStorage` para salvar informacoes locais.

Chaves principais usadas:

```text
pokemonLivingDexCaptured
pokemonSpeciesListCache:v3
pokemonApiCache:v3:
pokemonEncounterCache:v3:
```

### `pokemonLivingDexCaptured`

Salva os Pokemon marcados como capturados na checklist.

Os caches de dados externos possuem prazo de validade e limite de entradas para reduzir o uso de armazenamento do navegador.

Se voce limpar os dados do navegador, usar outro navegador ou abrir em outro dispositivo, esses dados podem nao estar disponiveis.

## Dados externos

O site usa dados de:

- PokeAPI: dados de Pokemon, especies, evolucoes e locais de encontro.
- GitHub (repositorio PokeAPI): sprites oficiais e de fallback.

Por isso, algumas funcionalidades precisam de internet para carregar corretamente.

## Exportacao

Na aba `Boxes`, a organizacao das boxes pode ser baixada em:

- `.XLS`

Na aba `Checklist`, o progresso pode ser exportado e importado em:

- `.JSON`

Esses arquivos ajudam a consultar as boxes fora do site e a levar a checklist para outro navegador.

Na checklist, use **Baixar backup JSON** para guardar os IDs dos Pokemon capturados, a data de exportacao e a versao do formato. Pokemon ausentes dessa lista sao considerados pendentes. Para recuperar o progresso em outro navegador ou celular, use **Restaurar backup**, selecione o arquivo `.json` e confirme a substituicao do progresso atual. Um backup vazio e valido e restaura todos como pendentes.

A antiga transferencia em CSV foi substituida pelo backup JSON; arquivos CSV nao sao aceitos nesta opcao. Arquivos invalidos, IDs fora de 1 a 905 e versoes incompativeis sao rejeitados sem alterar o progresso. O backup inclui apenas a checklist, sem caches, filtros ou selecoes temporarias.

## Limitacoes conhecidas

- O projeto cobre Pokemon ate o #905, ou seja, ate a 8a geracao.
- Dados de eventos podem variar entre distribuicoes, regioes e anos.
- A PokeAPI pode nao representar perfeitamente todos os metodos oficiais de obtencao.
- A checklist e salva localmente no navegador, nao em conta online.
- Se APIs externas estiverem fora do ar, detalhes, sprites ou locais podem nao carregar.
- Algumas descricoes podem vir diretamente da PokeAPI quando nao houver texto em portugues.

## Manutencao

Para atualizar o projeto para novas geracoes, sera necessario:

1. Aumentar `TOTAL_POKEMON` em `app.js`.
2. Adicionar novos intervalos em `generationRanges`.
3. Atualizar pokemon_species.js.
4. Revisar encounter_config.js para novos jogos, regioes e eventos.

## Observacoes legais

Pokemon e uma marca registrada da Nintendo, Game Freak e The Pokemon Company.

Este projeto e feito para uso pessoal/educacional e nao e afiliado oficialmente a Nintendo, Game Freak, The Pokemon Company ou PokeAPI.
