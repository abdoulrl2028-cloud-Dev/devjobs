# DevJobs

Plataforma pública de vagas de tecnologia para pessoas desenvolvedoras. Frontend em **Next.js + TypeScript**, back-end em **API REST** (rotas de API do Next.js) e layout 100% **responsivo** com **dark mode**.

## Funcionalidades

- 🔎 Lista de vagas com busca por cargo, empresa ou skill
- 📍 Filtro por localização, tipo de vaga, vagas remotas e patrocinadas
- 📄 Página de detalhes com requisitos, responsabilidades e benefícios + contagem de visualizações
- ❤️ Favoritar vagas (com sincronização no banco para usuários logados)
- 🔐 Login com sessão por cookie assinado e cadastro (candidato ou empresa)
- 💼 **Portal da empresa**: publicar vagas, planos de destaque, pagamentos (Stripe ou modo demo), métricas e candidaturas
- 🧠 **Banco de talentos** (planos Pro/Empresa) e perfil público de candidatos
- 🛡️ **Painel administrativo**: moderação de vagas, usuários, empresas e receita
- 🌙 Dark mode com detecção automática do sistema
- 📱 Layout responsivo: celular, tablet e desktop

## Planos

| Plano     | Preço    | Vagas | Validade | Recursos |
| --------- | -------- | ----- | -------- | -------- |
| Grátis    | R$ 0     | 1     | 15 dias  | Vaga simples |
| Destaque  | R$ 49    | 1     | 30 dias  | Badge de destaque |
| Pro       | R$ 149   | 5     | 30 dias  | + Banco de talentos |
| Empresa   | R$ 299/mês | Ilimitadas | Mensal | Tudo + suporte prioritário |

## Tecnologias

- [Next.js](https://nextjs.org) (App Router)
- [TypeScript](https://www.typescriptlang.org)
- API REST (`app/api/*`)
- Banco de dados portável: **SQLite** (`node:sqlite`) no dev, **Postgres** em produção
- [Stripe](https://stripe.com) para pagamentos (com modo de demonstração)
- CSS com variáveis (temas claro/escuro) responsivo

## Rodando localmente

Requer **Node.js 22+**.

```bash
npm install
npm run dev
```

Acesse http://localhost:3000.

Sem `DATABASE_URL`, o app usa SQLite (`./data/devjobs.db`), criado e popularizado automaticamente na primeira execução (migrações + seed).

### Pagamentos

Sem chave do Stripe, os pagamentos rodam em **modo demo**: o checkout é "aprovado" imediatamente. Para testar o fluxo real, defina `STRIPE_SECRET_KEY` (e `STRIPE_WEBHOOK_SECRET` para receber webhooks) no `.env.local`. Veja `.env.example`.

### Contas demo (criadas pelo seed)

- `demo@devjobs.com` / `talento123` — candidata (Ana Souza)
- `empresa@devjobs.com` / `empresa123` — empresa (StartupX, plano Empresa)
- `admin@devjobs.com` / `admin123` — administrador
- Banco de talentos: `talento1@devjobs.com` … `talento7@devjobs.com` / `talento123`

## API REST

| Método | Rota                      | Descrição                              |
| ------ | ------------------------- | -------------------------------------- |
| GET    | `/api/jobs`               | Lista vagas (`q`, `location`, `type`, `remote`) |
| GET    | `/api/jobs/:id`           | Detalhes de uma vaga                   |
| GET    | `/api/jobs/sponsored`     | Vagas patrocinadas                     |
| GET    | `/api/locations`          | Localizações disponíveis               |
| POST   | `/api/auth/login`         | Login (e-mail + senha)                 |
| POST   | `/api/auth/logout`        | Encerra a sessão                        |
| GET    | `/api/auth/me`            | Usuário logado (cookie de sessão)      |
| POST   | `/api/register`           | Cadastro de candidato ou empresa       |
| POST   | `/api/jobs/:id/apply`     | Candidatar-se a uma vaga (candidato)   |
| GET/POST/DELETE | `/api/favorites`  | Favoritos do usuário logado           |
| GET/POST | `/api/company/jobs`     | Vagas da empresa + publicar vaga        |
| GET    | `/api/company/stats`      | Métricas e pagamentos da empresa        |
| GET    | `/api/talents`            | Banco de talentos (Pro/Empresa)        |
| GET    | `/api/admin/summary`      | Resumo de receita e métricas (admin)   |

## Segurança

- **Headers** de segurança em todas as respostas: CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `HSTS` e `Permissions-Policy`.
- **Rate limiting** por IP na API (Vercel + fallback em memória): `POST /api/auth/login` e `/api/register` (5/min), demais rotas `auth` (30/min) e API geral (120/min).
- **Senhas** com hash `scrypt` + comparação em tempo constante (`timingSafeEqual`).
- **CSRF**: verificações de `Origin`/`Referer` em `login` e `logout`.
- **Validação de entrada**: formato de e-mail, tamanho de senha, limite de corpo de requisição e parâmetros de consulta com lista de valores permitidos.
- **Cookies de sessão** `httpOnly` + `SameSite=Lax` + `Secure` em produção; atraso constante no login para dificultar brute-force.
- **Autorização**: rotas de empresa, admin e talentos exigem sessão e papel (role) adequados.

## Deploy

O projeto está publicado na Vercel. Deploy manual: `vercel --prod --yes`.

Em produção, configure:
- `AUTH_SECRET` (obrigatório)
- `DATABASE_URL` (Postgres — SQLite não é persistente em serverless)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (quando ativar cobrança real)