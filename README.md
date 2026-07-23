# ⚽ PMNH & Amigos (FUT7) — Portal de Ranking

Portal web para controlar o ranking individual do fut7 do **PMNH & Amigos** — *Confusão, Cultura e Ladaia*.
Hospedado no **Azure Static Web Apps** com **leitura pública** e **edição restrita ao administrador**.

> **Regras de pontuação:** Vitória = 4 · Empate = 2 · Derrota = 1. Gols contam só como estatística.

---

## 🗂️ Estrutura do projeto

```
pmnh-fut7-portal/
├─ src/                         # Frontend (site público)
│  ├─ index.html                # App (ranking, goleadores, jogadores, partidas, sorteio, craque, histórico)
│  ├─ logo.png                  # Escudo do time (tartaruga)
│  └─ staticwebapp.config.json  # Rotas, autenticação e proteção de gravação
├─ api/                         # API gerenciada (Azure Functions, Node.js)
│  ├─ data/                     # GET /api/data (público) + POST /api/data (admin)
│  ├─ photo/                    # Upload/serviço de fotos (admin)
│  ├─ vote/                     # Votação do craque do jogo
│  ├─ host.json
│  ├─ package.json
│  └─ local.settings.json.sample
├─ infra/                       # Infraestrutura (Bicep)
│  ├─ main.bicep                # Storage + Static Web App + app settings
│  └─ main.parameters.json
└─ .github/workflows/
   └─ azure-static-web-apps.yml # CI/CD: publica a cada push na branch main
```

## 🧠 Como funciona

- **Público:** vê Ranking, Goleadores, Escalação e Craque — sem login.
- **Admin:** clica em **Entrar**, faz login com **GitHub** e passa a ver as abas/botões de edição.
- Os dados ficam num **único arquivo JSON** (`appdata/db.json`) no Blob Storage, lido por todos e
  gravado **somente** por quem está na lista `ADMINS` (username do GitHub).
- A gravação (`POST /api/data`) é bloqueada pelo Static Web Apps (`allowedRoles: ["authenticated"]`)
  **e** revalidada na própria API (defesa em profundidade).
- **Estado inicial ZERADO:** sem jogadores nem partidas — o admin cadastra tudo pelo portal.

### 👑 Administradores
Lista em **três** lugares (mantenha iguais): `api/data/index.js`, `api/photo/index.js` e o `const ADMINS`
no `src/index.html`. Padrão atual: `["danieiribeiro"]`.

---

## 🚀 Publicação (passo a passo)

### Pré-requisitos
- Conta no GitHub · Assinatura do Azure · [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az`)

### 1) Subir o código para o GitHub
```bash
git init
git add .
git commit -m "Portal PMNH & Amigos"
git branch -M main
git remote add origin https://github.com/danieIribeiro/pmnh-fut7-portal.git
git push -u origin main
```

### 2) Provisionar a infraestrutura (Storage + Static Web App)
```bash
az group create -n rg-pmnh-fut7 -l eastus2

az deployment group create \
  -g rg-pmnh-fut7 \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json
```
Anote o `staticWebAppHostname` da saída (ex.: `pmnhfut7-swa.azurestaticapps.net`).

### 3) Conectar o deploy (GitHub Actions)
1. Portal Azure → seu **Static Web App** → **Manage deployment token** → copie o token.
2. No GitHub → repositório → **Settings → Secrets and variables → Actions → New repository secret**:
   - Nome: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Valor: o token copiado.
3. Faça um push na `main` (ou rode o workflow manualmente). O GitHub Actions builda `src` + `api` e publica.

> A partir daqui, **toda alteração** enviada para a `main` é publicada automaticamente (~1–2 min).
> Pull Requests geram URLs de **preview**.

### 4) Autenticação (GitHub, sem registrar app)
O login usa o provedor **GitHub pré-configurado** do Static Web Apps (`/.auth/login/github`) —
não precisa registrar app no Entra ID. Quem estiver na lista `ADMINS` vira administrador ao logar.

---

## 🔄 Atualizações futuras
Edite os arquivos em `src/` (visual) ou `api/` (lógica), faça commit e `git push`. O Actions republica sozinho.
Para reverter, basta reverter o commit e dar push.

## 🧪 Teste local (opcional)
```bash
npm install -g @azure/static-web-apps-cli
cd api && npm install && cd ..
cp api/local.settings.json.sample api/local.settings.json   # preencha a connection string
swa start src --api-location api
```
Acesse http://localhost:4280. (No modo local o SWA CLI simula o login.)

## 💰 Custos
| Recurso | Plano | Custo/mês |
|---|---|---|
| Static Web Apps | Free | R$ 0 |
| Functions (gerenciada) | Incluída | R$ 0 |
| Blob Storage | Pay-as-you-go | ~R$ 1–5 |
