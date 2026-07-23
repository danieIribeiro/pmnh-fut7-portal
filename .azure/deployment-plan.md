# Plano de Deployment — Portal PMNH & Amigos (FUT7)

**Status:** Aguardando aprovação do usuário

## Objetivo
Publicar o portal de ranking na Azure com:
- Leitura pública do ranking/goleadores/histórico (sem login).
- Edição restrita ao Admin (apenas o dono), com autenticação real validada pela Azure.
- Custo mensal bem abaixo de R$ 200 (meta: ~R$ 0–5).

## Modo
MODERNIZE — adaptar o app estático (localStorage) para um portal publicado com dados compartilhados.

## Arquitetura escolhida
- **Azure Static Web Apps (plano Free)** — hospeda o frontend estático, HTTPS + CDN inclusos.
- **Autenticação integrada (EasyAuth)** — provedor Entra ID / conta Microsoft. Rotas de edição protegidas; acesso de gravação somente para o usuário Admin.
- **API gerenciada (Azure Functions, Node.js — incluída no Free)** — endpoints REST:
  - `GET /api/data` (público) → lê o estado (jogadores + partidas).
  - `POST /api/data` (somente Admin autenticado) → grava o estado.
- **Azure Table Storage** — armazena o JSON do app (1 registro). Custo de centavos.

## Componentes e mudanças no código
| Componente | Ação |
|---|---|
| `index.html` (público) | Remover botões de edição quando não logado; carregar dados via `GET /api/data`. |
| Área Admin | Edição (jogadores/partidas/gols) visível só após login; grava via `POST /api/data`. |
| `staticwebapp.config.json` | Proteger rotas de admin e `POST /api/data` com `allowedRoles: ["admin"]`; `GET` público. |
| `/api` (Functions Node) | Funções `data` (GET/POST) lendo/gravando no Table Storage via Managed Identity. |
| `infra/` (Bicep) + `azure.yaml` | IaC para SWA + Storage, deploy via `azd`. |

## Segurança
- Login verificado pela Azure (token), não por senha no código.
- Papel `admin` atribuído somente ao seu usuário (convite na SWA).
- Gravação (`POST`) exige papel `admin`; leitura (`GET`) é anônima.
- Acesso ao Storage pela API via Managed Identity (sem chaves no código).

## Custos (estimativa)
| Recurso | Plano | Custo/mês |
|---|---|---|
| Static Web Apps | Free | R$ 0 |
| Functions (gerenciada) | Incluída no Free | R$ 0 |
| Table Storage | Pay-as-you-go | ~R$ 1–5 |
| **Total** | | **~R$ 0–5** |

## Pré-requisitos do usuário
1. Conta GitHub (repositório para o código — SWA faz deploy a partir dele).
2. Assinatura Azure ativa.
3. `azd` (Azure Developer CLI) instalado para o deploy.

## Passos de deployment (resumo)
1. Organizar o projeto na estrutura SWA (frontend + `/api` + `infra` + `azure.yaml`).
2. Subir para um repositório GitHub.
3. `azd up` → provisiona SWA + Storage e publica.
4. No portal Azure, convidar seu usuário com o papel `admin`.
5. Validar: público vê ranking; só você consegue editar após login.
