# NTMR Ranking - Campeonato de Rédeas

Sistema web completo para cadastro de notas, inscrições e ranking do campeonato equestre modalidade Rédeas.

## Stack

- React + TypeScript + Vite
- TanStack Router
- TanStack Query
- Supabase (Auth + Postgres + RLS)
- TailwindCSS
- shadcn/ui
- sonner (toasts)
- lucide-react (ícones)

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Projeto Supabase criado
- (Opcional) Supabase CLI para aplicar migrations local/remoto

## Instalação

```bash
pnpm install
```

## Variáveis de ambiente

Crie o arquivo `.env` na raiz:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Você também pode copiar de `.env.example`.

## Rodando o projeto

```bash
pnpm dev
```

Build de produção:

```bash
pnpm build
```

Validação TypeScript:

```bash
pnpm typecheck
```

## Migrations Supabase

As migrations estão em:

- `supabase/migrations/202605220001_init_ntmr.sql`
- `supabase/migrations/202605240001_levels_optional_points_ranking.sql`
- `supabase/migrations/202605240002_championship_min_two_stages.sql`
- `supabase/migrations/202607110001_access_invites.sql`
- `supabase/migrations/202607110002_complete_entry_directory.sql`
- `supabase/migrations/202607110003_member_content_workflow.sql`
- `supabase/migrations/202607110004_public_event_lifecycle.sql`
- `supabase/migrations/202607120001_official_ntmr_categories.sql`
- `supabase/migrations/202607120002_registration_request_levels.sql`
- `supabase/migrations/202607120003_financial_dre_cashflow.sql`
- `supabase/migrations/202605220002_seed_ntmr_sample.sql`
- Guia SQL em ordem (copiar/colar no SQL Editor): `supabase/manual/setup-step-by-step.sql`

### Aplicar com Supabase CLI

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

### Aplicar manualmente

Cole os SQLs no editor SQL do Supabase, **nesta ordem exata**:

1. `202605220001_init_ntmr.sql`
2. `202605240001_levels_optional_points_ranking.sql`
3. `202605240002_championship_min_two_stages.sql`
4. `202607110001_access_invites.sql`
5. `202607110002_complete_entry_directory.sql`
6. `202607110003_member_content_workflow.sql`
7. `202607110004_public_event_lifecycle.sql`
8. `202607120001_official_ntmr_categories.sql`
9. `202607120002_registration_request_levels.sql`
10. `202607120003_financial_dre_cashflow.sql`
11. `202605220002_seed_ntmr_sample.sql` (opcional, somente para dados de teste)

Se o banco principal já está configurado, execute apenas os SQLs novos necessários. Para corrigir categorias em eventos existentes, rode `supabase/manual/fix-categorias-oficiais-ntmr.sql`. Para habilitar níveis separados nas solicitações públicas, rode `supabase/manual/fix-inscricoes-niveis-separados.sql`.

Para habilitar a aba Financeiro, fluxo de caixa e DRE em um banco já configurado, execute `supabase/manual/setup-financeiro-dre.sql`.

## Criar primeiro usuário admin

1. Faça login com um usuário comum pela tela `/login`.
2. No Supabase SQL Editor, execute:

```sql
update public.profiles
set role = 'admin'
where email = 'seu-email@dominio.com';
```

3. Faça logout e login novamente.

## Permitir novo cadastro no site

No Supabase Dashboard:

1. Vá em `Authentication` -> `Providers` -> `Email`.
2. Deixe `Enable Email provider` ativado.
3. Deixe `Confirm email` conforme sua preferência:
   - ativado: usuário precisa confirmar o e-mail antes de entrar;
   - desativado: usuário entra logo após criar conta.
4. Novos cadastros entram como perfil `user`. Para liberar painel, altere para `admin` ou `judge` em `/admin/access`.

## Regras principais implementadas

- Perfis: `admin`, `judge`, `user`
- Etapas válidas: `1`, `2`, `3`
- Níveis válidos quando aplicável: `N1`, `N2`, `N3`, `N4`
- Categorias oficiais sem nível: `Amador Principiante`, `Amador Master`, `Aberto Principiante`, `Jovem Principiante`, `Pré Futurity`, `Potro do Futuro`
- Categorias oficiais com nível: `Aberto`, `Amador`, `Futurity`
- Em categorias com nível, a inscrição permite selecionar vários níveis elegíveis para a mesma passada
- A tela de lançamento mostra uma linha por passada, e a nota salva vale para todos os níveis selecionados daquela inscrição
- Ranking por etapa separado por categoria + nível
- Ranking em tela cumulativa: `N1`, `N1 + N2`, `N1 + N2 + N3`, `N1 + N2 + N3 + N4`
- Ranking final do campeonato por pontos da planilha NTMR: `25, 18, 15, 12, 10, 8, 6, 4, 2, 1`
- Empate resolvido por maior pontuação e depois nome do competidor
- Juiz só lança/edita própria nota em evento ativo
- Admin gerencia tudo
- Público vê ranking ao vivo e resultados de eventos ativos, finalizados e publicados
- Usuário comum solicita inscrições, acompanha aprovações e envia sugestões em `/minha-area`
- Administrador aprova inscrições, responde sugestões e publica notícias
- Administrador controla entradas, saídas, pendências, fluxo de caixa e DRE por evento
- Exclusão de evento exige confirmação pelo nome e remove os dados operacionais vinculados em cascata

## Reiniciar servidor local

Quando alterar `.env`, sempre reinicie o servidor:

1. No terminal onde o `pnpm dev` está rodando, pressione `Ctrl + C`
2. No mesmo terminal, rode novamente:

```bash
pnpm dev
```

## Importação/Exportação Excel

A aba **Importar/Exportar** oferece:

- Download de modelo Excel `.xlsx` por tipo
- Upload de Excel `.xlsx`/`.xls` com pré-visualização
- Validação de colunas obrigatórias
- Erros por linha no processamento
- Importação para: competidores, cavalos, categorias, inscrições e notas
- Compatibilidade com CSV antigo, caso alguma base já esteja nesse formato

As exportações das telas de competidores, cavalos, inscrições, notas e ranking são geradas em Excel `.xlsx` com cabeçalhos/colunas.

## Base de testes da planilha oficial

A migration `202605220002_seed_ntmr_sample.sql` inclui dados iniciais inspirados na planilha:

`PLANILHA OFICIAL NTMR_Ajustada (1).xlsm`

Com exemplos de:

- Competidores
- Cavalos
- Categorias
- Inscrições por etapa
- Notas (quando já existir perfil com role `admin` ou `judge`)

Também foram gerados CSVs de apoio a partir da planilha em:

- `samples/csv/competidores_ntmr.csv`
- `samples/csv/cavalos_ntmr.csv`
- `samples/csv/inscricoes_ntmr_exemplo.csv`

## Rotas principais

- `/` - página pública com eventos publicados
- `/login` - autenticação
- `/reset-password` - recuperação e redefinição de senha
- `/minha-area` - inscrições, sugestões e resultados do usuário
- `/events/$eventId` - ranking público do evento
- `/admin` - painel administrativo (admin/juiz)
- `/admin/events/$eventId` - gestão completa do evento
- `/admin/requests` - aprovação de inscrições e atendimento (admin)
- `/admin/content` - notícias e publicações (admin)
- `/admin/access` - gerenciamento de acessos (admin)

## Publicar grátis para testar em outro computador

### Opção 1 (mais fácil): Netlify Drop

1. Gere a versão de produção:

```bash
pnpm build
```

2. Acesse: `https://app.netlify.com/drop`
3. Arraste a pasta `dist` para a página.
4. Copie o link `https://...netlify.app` gerado.

Importante: para manter o mesmo link nas próximas versões, faça login gratuito no Netlify antes do upload.

### Atualizar o projeto `redeasancr` no Netlify por deploy manual

1. Rode `pnpm build` no projeto.
2. Abra `https://app.netlify.com/projects/redeasancr/deploys`.
3. Na área de deploy manual, arraste a pasta `dist` ou o arquivo `redeasancr-netlify.zip`.
4. Aguarde aparecer `Published`. O endereço existente do site será mantido.

As migrations do Supabase não são executadas pelo Netlify. Rode os SQLs novos no Supabase antes de testar inscrições, sugestões e publicações no site publicado.

### Opção 2: Netlify com GitHub (recomendado)

Se o projeto estiver conectado ao repositório `github.com/jblopes170/redeasancr`, não envie o arquivo `.zip` para o GitHub. O Netlify não descompacta esse arquivo automaticamente.

Suba para o GitHub os arquivos fonte do projeto, incluindo:

- `src/`
- `public/`
- `supabase/`
- `index.html`
- `package.json`
- `pnpm-lock.yaml`
- `vite.config.ts`
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- `netlify.toml`
- `.env.example`

Não suba:

- `.env`
- `node_modules/`
- `dist/`
- `redeasancr-netlify.zip`

No Netlify, em `Build & deploy`, use:

- Branch: `principal`
- Build command: `pnpm build`
- Publish directory: `dist`

O arquivo `netlify.toml` já deixa esses valores configurados. Depois de subir os arquivos fonte para o GitHub, cada novo commit na branch `principal` gera um deploy automático no Netlify.

Em `Environment variables`, cadastre:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Opção 3: Vercel (com GitHub)

1. Suba este projeto no GitHub.
2. Em `https://vercel.com/new`, importe o repositório.
3. Framework: `Vite`.
4. Build command: `pnpm build`
5. Output directory: `dist`
6. Deploy.

O arquivo `vercel.json` já foi incluído para evitar erro de rota ao atualizar páginas internas (`/admin`, `/events/...`).

## Ajuste obrigatório no Supabase após publicar

No Supabase Dashboard:

1. Vá em `Authentication` -> `URL Configuration`.
2. Em `Site URL`, coloque a URL pública do deploy (ex.: `https://seu-site.netlify.app`).
3. Em `Redirect URLs`, adicione:
   - `https://seu-site.netlify.app`
   - `https://seu-site.netlify.app/login`
   - `https://seu-site.netlify.app/reset-password`

Sem isso, login e recuperação de senha podem falhar fora do `localhost`.
