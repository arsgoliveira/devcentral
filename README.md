# Portal Central Hidromares

Portal estatico com um unico link para acessar dashboards e projetos da equipe de TI.

## O que esta pronto

- Busca e filtros (todos, publicos, restritos, desbloqueados)
- Cadastro simples de novos links no proprio portal
- Auto-preenchimento de nome/descricao/tags a partir da URL
- Configuracao de visibilidade (publico ou restrito)
- Senha simples para projeto restrito
- Edicao rapida de projetos pelo botao `Configurar`
- Remocao de projetos personalizados

## Arquivos

- `index.html`: estrutura da pagina
- `styles.css`: identidade visual e responsividade
- `app.js`: logica de cadastro, filtros e acesso
- `projects.json`: projetos iniciais

## Como manter projetos

1. Abra o portal
2. Clique em `Incluir link`
3. Cole a URL
4. Clique em `Preencher automatico`
5. Defina `Publico` ou `Restrito`
6. Salve

Projetos adicionados pelo painel ficam salvos no navegador (localStorage).

## Deploy no Netlify

### Manual (mais rapido)

1. Netlify -> `Add new site` -> `Deploy manually`
2. Arraste a pasta inteira deste projeto

### Via Git (recomendado)

1. Suba esta pasta para um repositorio
2. Netlify -> `Add new site` -> `Import from Git`
3. Build command: vazio
4. Publish directory: `/`

## Observacao de seguranca

A protecao por senha aqui e client-side (simples), ideal para organizacao interna.
Para controle mais forte, o proximo passo e adicionar autenticao real (ex.: Supabase Auth).