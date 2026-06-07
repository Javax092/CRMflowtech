# FlowCRM

CRM comercial da FlowtechAM para controlar leads, evitar duplicidade, acompanhar negociações e organizar follow-ups.

## Stack

- Next.js 15, React, TypeScript e Tailwind CSS
- Prisma ORM com PostgreSQL
- Zod para validação
- Login administrativo simples por cookie

## Instalação

```bash
npm install
cp .env.example .env
```

Para ambiente local, o `.env` deve conter:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crmflowtech?schema=public"
AUTH_SECRET="crm-flowtech-local-secret-32-caracteres"
ADMIN_EMAIL="admin@flowtecham.com"
ADMIN_PASSWORD="admin123"
```

## Banco de dados

Use PostgreSQL local com:

- usuário: `postgres`
- senha: `postgres`
- porta: `5432`
- banco: `crmflowtech`

Se o banco ainda não existir, crie com um destes comandos:

```bash
createdb crmflowtech
```

ou:

```bash
psql -U postgres -c "CREATE DATABASE crmflowtech;"
```

Depois rode:

```bash
npx prisma validate
npx prisma migrate dev
npx prisma generate
npm run prisma:seed
```

O seed cria leads fictícios e scripts comerciais para teste.

Se houver erro de conexão com PostgreSQL, verifique:

- se o PostgreSQL está rodando
- se a senha do usuário `postgres` é `postgres`
- se a porta configurada é `5432`
- se o banco `crmflowtech` existe

## Rodar

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Login

Use as credenciais definidas no `.env`. Em desenvolvimento, se não configurar variáveis:

- E-mail: `admin@flowtecham.com`
- Senha: `admin123`

## Uso

- Dashboard: métricas do funil, follow-ups do dia e taxa de conversão.
- Leads: CRUD completo com ações rápidas, WhatsApp, Instagram e mensagem copiada.
- Anti-duplicidade: bloqueia possíveis duplicados por WhatsApp, Instagram, e-mail e empresa normalizados.
- Kanban: arraste leads entre as etapas do funil.
- Follow-ups: listas de atrasados, hoje e semana.
- Scripts: modelos com `{{nome}}`, `{{empresa}}`, `{{segmento}}`, `{{demo}}` e `{{servico}}`.
- Relatórios: volume mensal, respostas, fechamentos, receita e melhores origens/segmentos.
