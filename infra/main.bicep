@description('기본 리전. Japan East 권장.')
param location string = 'japaneast'

@description('리소스 이름 접두사')
param namePrefix string = 'lipcode'

@description('PostgreSQL 관리자 사용자명')
param dbAdminUser string = 'lipcode'

@secure()
@description('PostgreSQL 관리자 비밀번호')
param dbAdminPassword string

@secure()
@description('JWT 서명 시크릿 (강력한 무작위 값 권장)')
param jwtSecret string

var appServicePlanName = '${namePrefix}-plan'
var webAppName = '${namePrefix}-api'
var dbServerName = '${namePrefix}-pg-${uniqueString(resourceGroup().id)}'
var dbName = 'lipcode'

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource web 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      healthCheckPath: '/api/healthz'
      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '22-lts'
        }
        {
          name: 'PORT'
          value: '8080'
        }
        {
          name: 'DATABASE_URL'
          value: 'postgresql://${dbAdminUser}:${dbAdminPassword}@${db.properties.fullyQualifiedDomainName}:5432/${dbName}?sslmode=require'
        }
        {
          name: 'JWT_SECRET'
          value: jwtSecret
        }
        {
          name: 'JWT_EXPIRES_IN'
          value: '7d'
        }
        {
          name: 'COPILOT_BIN'
          value: 'copilot'
        }
        {
          name: 'COPILOT_MODEL'
          value: 'auto'
        }
      ]
    }
  }
}

// Azure Database for PostgreSQL Flexible Server (가장 저렴한 Burstable B1ms)
resource db 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: dbServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: dbAdminUser
    administratorLoginPassword: dbAdminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource dbDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: db
  name: dbName
}

// Azure 내부 서비스 접근 허용
resource dbFirewallAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: db
  name: 'AllowAllAzureIps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

output webAppName string = web.name
output webAppUrl string = 'https://${web.properties.defaultHostName}'
output dbServerFqdn string = db.properties.fullyQualifiedDomainName
