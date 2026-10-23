param([switch]$Attached)
$ErrorActionPreference = 'Stop'
$murasameRoot = Split-Path -Parent $PSScriptRoot
if (!$Attached) {
    $murasameLauncher = Join-Path $murasameRoot 'outputs/Project-Murasame-GPT-local-0.2.0/electron.exe'
    if (!(Test-Path -LiteralPath $murasameLauncher)) { throw 'Build the local GUI launcher first: node scripts/package-gpt-launcher.mjs' }
    Start-Process -FilePath $murasameLauncher -WorkingDirectory $murasameRoot -WindowStyle Hidden
    return
}
Set-Location -LiteralPath $murasameRoot
& node (Join-Path $PSScriptRoot 'start-gpt.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Murasame launcher failed; see private-assets/gpt-data/launcher.log' }
