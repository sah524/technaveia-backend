# 🚀 TechNaVeia — Backend API

API RESTful da plataforma **TechNaVeia**, responsável por autenticação, gerenciamento de pedidos, orçamentos, chat, pagamentos e painel administrativo. Construída com Node.js, Express e Prisma.

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Execução](#instalação-e-execução)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Endpoints da API](#endpoints-da-api)
- [Banco de Dados](#banco-de-dados)
- [Deploy](#deploy)
- [Melhorias Futuras](#melhorias-futuras)

## Sobre o Projeto

Backend da plataforma TechNaVeia — um marketplace de serviços técnicos que conecta clientes a profissionais. A API gerencia:

- Autenticação e autorização (JWT)
- Cadastro e moderação de técnicos
- Criação e acompanhamento de pedidos
- Orçamentos detalhados
- Chat entre cliente e técnico
- Sistema financeiro (transações, saques)
- Notificações
- Painel administrativo

## Tecnologias

| Tecnologia | Versão | Descrição |
|---|---|---|
| Node.js | >= 18 | Runtime JavaScript |
| Express | 4.18 | Framework web |
| TypeScript | 5.3 | Tipagem estática |
| Prisma | 6.19 | ORM e migrations |
| PostgreSQL | — | Banco de dados relacional |
| JWT | 9.x | Autenticação por tokens |
| bcryptjs | 2.4 | Hash de senhas |
| Nodemon | 3.x | Hot reload em desenvolvimento |

## Arquitetura

```
src/
├── controllers/          # Lógica de negócio das rotas
│   ├── admin.controller.ts
│   ├── auth.controller.ts
│   ├── chat.controller.ts
│   ├── finance.controller.ts
│   ├── pedido.controller.ts
│   └── tecnico.controller.ts
├── middlewares/          # Middleware de autenticação
│   └── auth.middleware.ts
├── routes/              # Definição de rotas
│   ├── admin.routes.ts
│   ├── auth.routes.ts
│   ├── chat.routes.ts
│   ├── finance.routes.ts
│   ├── notification.routes.ts
│   ├── orcamento.routes.ts
│   ├── pedido.routes.ts
│   ├── tecnico.routes.ts
│   └── user.routes.ts
├── utils/               # Utilitários
├── app.ts               # Configuração do Express (middlewares, rotas)
└── server.ts            # Ponto de entrada (listen)

prisma/
├── schema.prisma        # Schema do banco de dados
└── migrations/          # Histórico de migrations
```

## Pré-requisitos

- **Node.js** >= 18.x
- **npm** ou **yarn**
- **PostgreSQL** (local ou hospedado — ex: Supabase, Neon, Render)

## Instalação e Execução

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd technaveia-backend

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# 4. Gere o Prisma Client
npx prisma generate

# 5. Execute as migrations do banco
npx prisma migrate dev

# 6. Inicie o servidor em modo desenvolvimento
npm run dev
```

O servidor estará rodando em `http://localhost:3000`.

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz com:

```env
# Servidor
PORT=3000
NODE_ENV=development

# Banco de Dados
DATABASE_URL=postgresql://usuario:senha@localhost:5432/technaveia

# JWT
JWT_SECRET=sua-chave-secreta-aqui
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=sua-chave-refresh-aqui
JWT_REFRESH_EXPIRES_IN=30d

# CORS
ALLOWED_ORIGIN=*
```

| Variável | Descrição |
|---|---|
| `PORT` | Porta do servidor (padrão: 3000) |
| `NODE_ENV` | Ambiente (development/production) |
| `DATABASE_URL` | Connection string do PostgreSQL |
| `JWT_SECRET` | Chave secreta para assinar tokens JWT |
| `JWT_EXPIRES_IN` | Tempo de expiração do access token |
| `JWT_REFRESH_SECRET` | Chave secreta para refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | Tempo de expiração do refresh token |
| `ALLOWED_ORIGIN` | Origens permitidas no CORS |

## Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia com nodemon (hot reload) |
| `npm run build` | Gera Prisma Client + compila TypeScript |
| `npm start` | Executa o build de produção (`dist/server.js`) |
| `npm run db:migrate` | Executa migrations pendentes |
| `npm run db:push` | Sincroniza schema sem criar migration |
| `npm run db:studio` | Abre o Prisma Studio (GUI do banco) |

## Endpoints da API

Todas as rotas estão prefixadas com `/v1`.

| Prefixo | Descrição |
|---|---|
| `GET /health` | Health check do servidor |
| `/v1/auth` | Autenticação (login, registro, refresh token, recuperação de senha) |
| `/v1/users` | Gerenciamento de perfil e endereços |
| `/v1/technicians` | Cadastro, serviços e perfil do técnico |
| `/v1/orders` | Criação e acompanhamento de pedidos |
| `/v1/budgets` | Orçamentos (envio, aceite, recusa) |
| `/v1/conversations` | Chat (conversas e mensagens) |
| `/v1/finance` | Transações, saldo e saques do técnico |
| `/v1/notifications` | Notificações do usuário |
| `/v1/admin` | Painel administrativo (moderação, métricas) |

## Banco de Dados

O schema Prisma define os seguintes modelos principais:

- **Usuario** — Usuários do sistema (cliente, técnico, admin)
- **Tecnico** — Perfil estendido do técnico com especialidades e documentos
- **Servico** — Serviços oferecidos pelos técnicos
- **Pedido** — Solicitações de serviço dos clientes
- **Orcamento** — Orçamentos enviados pelos técnicos
- **Agendamento** — Agenda de atendimentos
- **Avaliacao** — Avaliações dos clientes sobre os técnicos
- **Pagamento** — Registros de pagamento
- **Transacao / Saque** — Sistema financeiro do técnico
- **Conversa / Mensagem** — Chat entre usuários
- **Notificacao** — Notificações push/in-app
- **Cupom** — Cupons de desconto
- **Cidade / Endereco** — Localização

### Comandos úteis do Prisma

```bash
# Visualizar o banco no navegador
npx prisma studio

# Resetar o banco (CUIDADO: apaga todos os dados)
npx prisma migrate reset

# Criar nova migration
npx prisma migrate dev --name nome-da-migration
```

## Deploy

A API está configurada para deploy no **Render**:

1. Conecte o repositório ao Render
2. Configure o build command: `npm run build`
3. Configure o start command: `npm start`
4. Adicione as variáveis de ambiente no painel
5. Configure o banco PostgreSQL (Render, Supabase ou Neon)

## Melhorias Futuras

- [ ] **WebSocket** — Chat em tempo real com Socket.IO
- [ ] **Upload de arquivos** — Integração com S3/Cloudinary para fotos e documentos
- [ ] **Gateway de pagamento** — Integração com Stripe ou Mercado Pago
- [ ] **Rate limiting** — Proteção contra abuso com express-rate-limit
- [ ] **Validação de entrada** — Zod ou Joi para validação de request bodies
- [ ] **Documentação da API** — Swagger/OpenAPI para documentação interativa
- [ ] **Testes automatizados** — Testes unitários e de integração com Jest/Vitest
- [ ] **Cache** — Redis para cache de consultas frequentes
- [ ] **Fila de jobs** — BullMQ para processamento assíncrono (emails, notificações)
- [ ] **Logs estruturados** — Winston ou Pino para logging em produção
- [ ] **CI/CD** — Pipeline de testes e deploy automático (GitHub Actions)
- [ ] **Soft delete** — Exclusão lógica em vez de física
- [ ] **Paginação** — Paginação cursor-based nas listagens
- [ ] **Auditoria** — Log de ações administrativas
- [ ] **2FA** — Autenticação de dois fatores para admins

👥 Equipe de desenvolvimento

Desenvolvido por estudantes da UCB (Universidade Católica de Brasília):

Lia Costa (https://github.com/LiaCost)
Sarah Silva (https://github.com/sah524)
Taís Barbosa (https://github.com/TaisBds) 
Andressa Castro (https://github.com/AndressaCst)

## 📄 Licença

Projeto privado — Todos os direitos reservados.
