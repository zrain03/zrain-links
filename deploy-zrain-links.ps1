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
