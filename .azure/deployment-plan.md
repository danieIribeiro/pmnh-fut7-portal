# Azure Deployment Plan

> **Status:** Deployed

Generated: 2026-10-16

---

## 1. Project Overview

**Goal:** Reativar o portal PMNH & Amigos com todas as funcionalidades e reconectar a API ao Storage existente, preservando integralmente jogadores, partidas, placares, gols, ranking, escalacoes, fotos, votacoes e craques.

**Path:** Restore existing production deployment

---

## 2. Requirements

| Attribute | Value |
|-----------|-------|
| Classification | Production |
| Scale | Small |
| Budget | Cost-Optimized |
| Subscription | PRD (`0c711df8-3150-425d-836e-c79869fc901d`) - confirmado pelo usuario |
| Location | `eastus2` - confirmado pelo usuario |
| Resource Group | `rg-pmnh-fut7` (existente) |

---

## 3. Components Detected

| Component | Type | Technology | Path |
|-----------|------|------------|------|
| Portal | Frontend | HTML/CSS/JavaScript | `src/` |
| Data API | API | Azure Functions Node.js | `api/data/` |
| Photo API | API | Azure Functions Node.js | `api/photo/` |
| Infrastructure | IaC | Bicep | `infra/` |
| CI/CD | Deployment | GitHub Actions | `.github/workflows/azure-static-web-apps.yml` |

---

## 4. Recipe Selection

**Selected:** Bicep + GitHub Actions

**Rationale:** O projeto ja possui IaC funcional que declara Azure Static Web Apps Free e a conta de Storage existente. O Bicep recria apenas a hospedagem ausente e reaplica a conexao com o mesmo Storage. O workflow publica frontend e API com o novo token da SWA.

---

## 5. Architecture

| Component | Azure Service | SKU |
|-----------|---------------|-----|
| Frontend + API gerenciada | Azure Static Web Apps | Free |
| Estado persistente e fotos | Azure Blob Storage existente `pmnhfut7sag5qneq5t3jg72` | Standard_LRS |
| Autenticacao | Static Web Apps EasyAuth / GitHub | Incluida |

O Bicep usa o mesmo `baseName`, Resource Group e `uniqueString`, portanto resolve para a conta de Storage existente. O `AZURE_STORAGE_CONNECTION_STRING` da nova SWA sera configurado para essa conta. Nenhum blob sera excluido ou reinicializado.

---

## 6. Provisioning Limit Checklist

| Resource Type | Number to Deploy | Total After Deployment | Limit/Quota | Notes |
|---------------|------------------|------------------------|-------------|-------|
| `Microsoft.Web/staticSites` Free | 1 | 2 | 10 por assinatura | Quota CLI nao expoe Static Web Apps; limite confirmado na documentacao oficial Microsoft. Inventario atual: 1 SWA (`idososfc-swa`). |
| `Microsoft.Storage/storageAccounts` | 0 novas | Sem alteracao | N/A para esta restauracao | Conta existente ativa; `appdata/db.json` confirmado. |

**Status:** All resources within limits.

---

## 7. Execution Checklist

### Phase 1: Planning
- [x] Analyze workspace
- [x] Gather requirements
- [x] Confirm subscription and location with user
- [x] Prepare resource inventory
- [x] Fetch quotas and validate capacity
- [x] Scan codebase
- [x] Select recipe
- [x] Plan architecture
- [x] User approved restoration and Azure context

### Phase 2: Execution
- [x] Review existing infrastructure and application configuration
- [x] Confirm Storage and `appdata/db.json` exist
- [x] Confirm GitHub Actions workflow exists
- [x] Update plan status to Ready for Validation

### Phase 3: Validation
- [x] Invoke azure-validate skill
- [x] Bicep build passes
- [x] Bicep what-if changes only expected resources/settings
- [x] JavaScript syntax passes
- [x] Static role/auth configuration reviewed
- [x] Record validation proof below
- [x] Update plan status to Validated

### Phase 4: Deployment
- [x] Invoke azure-deploy skill
- [x] Back up `appdata/db.json`
- [x] Recreate Azure Static Web App
- [x] Update GitHub deployment token
- [x] Run GitHub Actions deployment
- [x] Verify homepage, API data/history and authentication endpoints
- [x] Report deployed endpoint URL
- [x] Update plan status to Deployed

---

## 8. Validation Proof

| Check | Command Run | Result | Timestamp |
|-------|-------------|--------|-----------|
| Azure authentication | `az account show` | Pass - subscription PRD confirmed | 2026-10-16 |
| Bicep compilation | `az bicep build --file infra/main.bicep --stdout` | Pass | 2026-10-16 |
| Bicep lint | `az bicep lint --file infra/main.bicep` | Pass - no diagnostics | 2026-10-16 |
| ARM validation | `az deployment group validate ...` | Pass - Succeeded | 2026-10-16 |
| Change preview | `az deployment group what-if ...` | Pass - create SWA/appsettings; no deletes; Storage deploy-in-place | 2026-10-16 |
| API JavaScript | `node --check api/data/index.js` and `api/photo/index.js` | Pass | 2026-10-16 |
| Frontend JavaScript | Extract inline script + `node --check` | Pass | 2026-10-16 |
| Authentication/roles | Review `src/staticwebapp.config.json` and API admin checks | Pass - EasyAuth plus server-side admin allowlist | 2026-10-16 |
| Static RBAC review | Review `infra/main.bicep` | Pass - no managed identity; Storage access intentionally uses SWA app setting connection string | 2026-10-16 |
| Azure policy | `az policy assignment list` | Pass - only Azure Arc policy; no conflict with SWA/Storage | 2026-10-16 |

**Validated by:** azure-validate skill
**Validation timestamp:** 2026-10-16

---

## 9. Files

| File | Purpose | Status |
|------|---------|--------|
| `.azure/deployment-plan.md` | Deployment source of truth | Ready for Validation |
| `infra/main.bicep` | SWA Free + existing Storage wiring | Existing |
| `infra/main.parameters.json` | `pmnhfut7`, `eastus2` | Existing |
| `.github/workflows/azure-static-web-apps.yml` | Publish frontend and API | Existing |
| `src/staticwebapp.config.json` | Routing and write authentication | Existing |

---

## 10. Next Steps

Deployment completed successfully.

- URL: `https://nice-glacier-079611a0f.3.azurestaticapps.net`
- Homepage: HTTP 200 with PMNH & Amigos branding
- Data API: HTTP 200, 46 players and 11 matches
- EasyAuth: HTTP 200
- Anonymous write: blocked with HTTP 401
- Storage app setting: present
- Database SHA256 before/after: `81C5F0E3D3EB2620D64D32CD79C2A28BED5C6C09B8CBB4BEA27AC072E218E5C6`
- Backup: `PMNH-db-backup-2026-10-16.json`
