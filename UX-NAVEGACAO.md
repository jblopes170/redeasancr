# Organizacao UX - Setembro de 2026

## Mapa de acesso

- Site publico: Inicio, Eventos, Ranking, Noticias; conta concentrada em um menu.
- Competidor: Meu resumo, Nova inscricao, Inscricoes e pagamentos, Resultados, Suporte.
- Organizacao: sidebar fixa no desktop com Visao geral, Eventos, Inscricoes, Notas ao vivo, Ranking e Financeiro.
- Celular administrativo: gaveta lateral abre os modulos; perfil, financeiro, acessos e site publico ficam no menu de conta.
- Gestao: Publicacoes e Acessos e permissoes (apenas administrador).
- Evento: Resumo, Categorias, Competidores e cavalos, Inscricoes, Financeiro, Planilhas, Configuracoes.
- Notas ao vivo: escolher evento -> etapa -> nota do conjunto -> Salvar ou Enter.

## Comportamentos

- Navegacao publica continua horizontal; administracao usa sidebar responsiva com pagina ativa destacada.
- Header administrativo limpo: marca, atalho de Notas ao vivo, menu unico da conta e botao da gaveta no celular.
- Links de abas usam URL, inclusive os atalhos antigos de inscricoes.
- A pagina de notas nao monta o painel de resumo do evento.
- Ranking detalhado, podio e simulador ficam recolhidos para priorizar os resultados e campos de trabalho.
- No campeonato, as notas e pontos por etapa permanecem na classificacao e no Excel.
- A exclusao do evento fica em Configuracoes, mantendo a confirmacao existente.
- Consolidado financeiro separado da selecao por evento; DRE detalhado sob demanda.
- Tema escuro unificado, contraste dos status corrigido e tabelas principais adaptadas ao celular.

## Verificacao

Executar `node scripts/check-ux.mjs`, `pnpm typecheck`, `pnpm lint` e `pnpm build`.
O teste de navegacao verifica destinos, abas, aliases antigos e identificacao da pagina ativa.
As consultas e gravacoes mantem os contratos do backend existente. Nenhuma migration SQL foi adicionada.
Testes visuais locais realizados no ranking publico, com dados existentes, incluindo modo campeonato e viewport de celular.
Gravacoes autenticadas de notas, pagamentos e inscricoes nao foram simuladas em producao.

## Publicacao

Netlify continua utilizando `pnpm build` e o diretorio `dist`, com fallback de rotas para `index.html`.
A configuracao de Sites e as variaveis de ambiente do Supabase nao foram alteradas.
