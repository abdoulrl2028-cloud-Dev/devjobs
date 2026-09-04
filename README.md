# DevJobs

Plataforma pública de vagas de tecnologia para pessoas desenvolvedoras. Frontend em **Next.js + TypeScript**, back-end em **API REST** (rotas de API do Next.js) e layout 100% **responsivo** com **dark mode**.

## Funcionalidades

- 🔎 Lista de vagas com busca por cargo, empresa ou skill
- 📍 Filtro por localização, tipo de vaga e vagas remotas
- 📄 Página de detalhes com requisitos, responsabilidades e benefícios
- ❤️ Favoritar vagas (salvas no dispositivo)
- 🔐 Login com sessão por cookie assinado
- 🌙 Dark mode com detecção automática do sistema
- 📱 Layout responsivo: celular, tablet e desktop

## Tecnologias

- [Next.js](https://nextjs.org) (App Router)
- [TypeScript](https://www.typescriptlang.org)
- API REST (`app/api/*`)
- CSS com variáveis (temas claro/escuro) responsivo

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:3000.

## API REST

| Método | Rota                  | Descrição                              |
| ------ | --------------------- | -------------------------------------- |
| GET    | `/api/jobs`           | Lista vagas (`q`, `location`, `type`, `remote`) |
| GET    | `/api/jobs/:id`       | Detalhes de uma vaga                   |
| GET    | `/api/locations`      | Lista localizações disponíveis         |
| POST   | `/api/auth/login`     | Login (e-mail + senha)                 |
| POST   | `/api/auth/logout`    | Encerra a sessão                        |
| GET    | `/api/auth/me`        | Usuário logado (cookie de sessão)      |

### Conta demo

- `demo@devjobs.com` / `demo123`
- `admin@devjobs.com` / `admin123`

## Deploy

O projeto está publicado na Vercel. `npm run build` faz o build de produção.

> A autenticação usa um segredo para assinar a sessão. Configure a variável de ambiente `AUTH_SECRET` em produção.

## Segurança

- **Headers** de segurança em todas as respostas: CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `HSTS` e `Permissions-Policy`.
- **Rate limiting** por IP na API (Vercel + fallback em memória): `POST /api/auth/login` (5/min, anti brute-force), demais rotas `auth` (30/min) e API geral (120/min, anti scraping).
- **Senhas** com hash `scrypt` + comparação em tempo constante (`timingSafeEqual`) para evitar timing attacks.
- **CSRF**: verificações de `Origin`/`Referer` em `login` e `logout`.
- **Validação de entrada**: formato de e-mail, tamanho de senha, limite de corpo de requisição e parâmetros de consulta com lista de valores permitidos.
- **Cookies de sessão** `httpOnly` + `SameSite=Lax` + `Secure` em produção; atraso constante no login para dificultar brute-force.