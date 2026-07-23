// Infraestrutura do portal PMNH & Amigos (FUT7)
// Provisiona: Conta de Armazenamento (dados) + Azure Static Web App (site + API gerenciada)
// Implante no escopo de um Resource Group.

@description('Prefixo para nomear os recursos.')
param baseName string = 'pmnhfut7'

@description('Região da Conta de Armazenamento.')
param location string = resourceGroup().location

@description('Região do Static Web App (Free). Opções comuns: eastus2, centralus, westus2, eastasia, westeurope.')
param swaLocation string = 'eastus2'

var storageName = take(toLower('${baseName}sa${uniqueString(resourceGroup().id)}'), 24)

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: '${baseName}-swa'
  location: swaLocation
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

var storageConn = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

resource swaSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: swa
  name: 'appsettings'
  properties: {
    AZURE_STORAGE_CONNECTION_STRING: storageConn
  }
}

output staticWebAppName string = swa.name
output staticWebAppHostname string = swa.properties.defaultHostname
output storageAccountName string = storage.name
