# Dashboard de análise de vendas

Dashboard didático para explorar faturamento mensal, categorias e regiões usando HTML, CSS e JavaScript. Não usa servidor, banco de dados, framework ou etapa de compilação.

## Como abrir

Abra `public/index.html` no navegador. A página já contém os 200 registros fictícios usados na demonstração; por isso, a primeira visualização funciona também ao abrir o arquivo diretamente, sem buscar o CSV no disco.

Chart.js 4.4.8 e Papa Parse 5.4.1 são carregados de CDNs com versões fixadas. É necessária uma conexão com a internet para exibir os gráficos, importar CSV e exportar os dados. A fonte tipográfica preferida também vem do Google Fonts; sem conexão, o navegador usa fontes locais de reserva. Os dados carregados pelo usuário são lidos e tratados localmente no navegador; não são enviados a um servidor.

## Base demonstrativa

`public/dados-exemplo.csv` contém os mesmos 200 registros fictícios incorporados em `public/script.js`: vendas de produto único, entre janeiro e dezembro de 2025. Os dados são inventados para a atividade e não descrevem resultados de uma empresa real.

| Coluna | Descrição |
| --- | --- |
| `id_venda` | Identificador da venda. IDs repetidos representam itens da mesma venda e contam como uma venda nos indicadores. |
| `data` | Data no formato `AAAA-MM-DD`. |
| `produto` | Nome do produto vendido. |
| `categoria` | Categoria do produto. |
| `regiao` | Região associada à venda. |
| `quantidade` | Unidades do produto naquela linha. |
| `preco_unitario` | Preço por unidade, como número sem símbolo de moeda. |

## Indicadores e tratamento

- **Faturamento por linha:** `quantidade × preco_unitario`.
- **Faturamento total:** soma do faturamento por linha após os filtros de período, categoria e região.
- **Quantidade de vendas:** contagem de `id_venda` distintos nas linhas filtradas.
- **Unidades vendidas:** soma de `quantidade` nas linhas filtradas.
- **Ticket médio:** faturamento total dividido pela quantidade de vendas únicas; se não houver venda, o resultado é R$ 0,00.

O conjunto demonstrativo permite conferir os cálculos: 200 registros, 200 vendas únicas, 458 unidades, R$ 10.049,60 de faturamento e ticket médio de R$ 50,25 (valor não arredondado: R$ 50,248). As duas primeiras linhas somam R$ 56,70 e 3 unidades.

Ao importar, o dashboard exige `id_venda`, `data`, `quantidade` e `preco_unitario`. As colunas `produto`, `categoria` e `regiao` são usadas nas comparações; se estiverem ausentes ou vazias, as linhas são mantidas e classificadas como “Não informado”. Quantidade ou preço iguais a zero são valores válidos; campos numéricos vazios não são tratados como zero. Linhas sem ID, com data inválida ou com quantidade/preço ausentes ou inválidos são descartadas para não inventar valores. A interface informa a contagem de descartes por motivo e os campos descritivos ausentes. Quando mais de um problema ocorre na mesma linha, a interface registra apenas o primeiro motivo para que as contagens não se sobreponham.

Linhas repetidas não são removidas: cada linha continua representando um item. IDs repetidos contam como uma única venda, conforme a fórmula do indicador.

O arquivo original `vendas_hamburgueria.csv`, na raiz, foi preservado. Ele tem 1.367 linhas e 12 colunas; não possui `regiao`, portanto, ao importá-lo, todas as linhas são mantidas com região “Não informado”. A coluna `avaliacao` tem 136 valores vazios e não é usada nos indicadores. O dashboard não o seleciona automaticamente: a demonstração fictícia é carregada primeiro.

## Usar uma base própria

1. Clique em **Importar CSV** e escolha um arquivo `.csv` no dispositivo.
2. Inclua os cabeçalhos `id_venda`, `data`, `quantidade` e `preco_unitario`. Para tabelas e comparações completas, inclua também `produto`, `categoria` e `regiao`.
3. Use datas válidas em `AAAA-MM-DD` e valores numéricos para quantidade e preço. O separador decimal pode ser ponto ou vírgula; campos com vírgulas devem seguir as regras usuais de CSV e estar entre aspas.
4. Aplique período, categoria e região. A pesquisa afeta a tabela; os filtros de período, categoria e região atualizam cartões, gráficos e tabela. A exportação inclui as linhas visíveis da tabela depois dos filtros e da pesquisa.

## Publicar pelo GitHub no Render

Envie o projeto ao GitHub e crie um serviço **Static Site** no Render conectado ao repositório:

- **Tipo de serviço:** Static Site.
- **Branch:** selecione a branch que contém este projeto.
- **Root Directory:** deixe vazio.
- **Build Command:** `echo "Site pronto"`.
- **Publish Directory:** `public`.

Salve/crie o serviço. O Render publicará os arquivos estáticos de `public/`; não é necessário instalar dependências nem compilar o projeto.

## Arquivos

- `AGENTS.md`: orientações do projeto.
- `README.md`: este guia.
- `public/index.html`: estrutura da página.
- `public/styles.css`: estilos responsivos.
- `public/script.js`: dados iniciais, leitura, validação, filtros, cálculos e gráficos.
- `public/dados-exemplo.csv`: base fictícia para abrir ou importar.
