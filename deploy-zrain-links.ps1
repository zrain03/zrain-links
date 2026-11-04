<#
Fail / File: deploy-zrain-links.ps1
Pembangun / Developer: Zrain
Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-27
Dikemas kini / Last updated: 2026-11-04
BM: Skrip deployment dengan semakan pra-deploy.
EN: Deployment script with pre-deploy verification.
#>

# Zrain Links production release. Uses Zrain UI from the pinned GitHub
# dependency. Do not bypass a failed sync or test.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Require-Success([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed. Production deployment stopped." }
}

Push-Location (Join-Path $PSScriptRoot 'cloudflare')
try {
  npm install
  Require-Success 'npm install'
  npm run ui:sync
  Require-Success 'Zrain UI sync'
  npm test
  Require-Success 'Cloudflare tests'
  npx wrangler deploy
  Require-Success 'Cloudflare Worker deployment'
} finally {
  Pop-Location
}

firebase deploy --only hosting --project zrain-links
Require-Success 'Firebase Hosting deployment'
Write-Host 'Zrain Links deployment completed. Test the public website and refresh the browser cache.'
