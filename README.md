# DevCentral

Painel pessoal para acesso rapido a projetos e ferramentas de desenvolvimento.

## Funcionalidades

- Busca e filtros (todos, publicos, restritos, desbloqueados)
- Cadastro de novos links diretamente pelo portal
- Auto-preenchimento de nome/descricao/tags a partir da URL
- Configuracao de visibilidade (publico ou restrito)
- Senha para projetos restritos (SHA-256)
- Edicao e remocao de projetos personalizados

## Arquivos

- `index.html`: estrutura da pagina
- `styles.css`: identidade visual e responsividade
- `app.js`: logica de cadastro, filtros e acesso
- `projects.json`: projetos iniciais

## Como adicionar projetos

1. Abra o portal
2. Clique em `Configuracoes` > `Incluir link`
3. Cole a URL e clique em `Preencher`
4. Defina `Publico` ou `Restrito`
5. Salve

Projetos adicionados ficam salvos no navegador (localStorage).

## Deploy no Render

1. Suba esta pasta para um repositorio no GitHub
2. Render -> `New` -> `Static Site`
3. Conecte o repositorio
4. Build command: vazio
5. Publish directory: `.`
6. Clique em `Create Static Site`

## Observacao de seguranca

A protecao por senha e client-side (SHA-256), ideal para uso pessoal e organizacao interna.
