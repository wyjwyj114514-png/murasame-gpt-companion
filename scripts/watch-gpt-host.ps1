param([switch]$Stop, [switch]$Probe)
$ErrorActionPreference = 'Stop'
$murasameRoot = Split-Path -Parent $PSScriptRoot
$murasameData = Join-Path $murasameRoot 'private-assets/gpt-data'
$murasameLauncher = Join-Path $murasameRoot 'outputs/Project-Murasame-GPT-local-0.2.0/electron.exe'
$murasameHasher = [Security.Cryptography.SHA256]::Create()
$murasameHash = [BitConverter]::ToString($murasameHasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($murasameRoot.ToLowerInvariant()))).Replace('-', '').Substring(0,24)
$murasameHasher.Dispose()
$murasameStopName = 'Local\MurasameHostAutoStartStop-' + $murasameHash
if ($Stop) {
    try { $murasameSignal = [Threading.EventWaitHandle]::OpenExisting($murasameStopName); [void]$murasameSignal.Set(); $murasameSignal.Dispose() } catch [Threading.WaitHandleCannotBeOpenedException] {}
    return
}
Add-Type -TypeDefinition (Get-Content -LiteralPath (Join-Path $murasameRoot 'dist/gpt-murasame-local/desktop/WindowApi.cs') -Raw)
if ($Probe) { $murasameHost = [WhaleWindows]::Probe(); @{hostAlive=$murasameHost.hostAlive;hostPid=$murasameHost.hostPid} | ConvertTo-Json -Compress; return }
if (!(Test-Path -LiteralPath $murasameLauncher)) { throw 'Murasame launcher is missing.' }
$murasameFresh = $false
$murasameMutex = [Threading.Mutex]::new($true, ('Local\MurasameHostAutoStart-' + $murasameHash), [ref]$murasameFresh)
if (!$murasameFresh) { $murasameMutex.Dispose(); return }
$murasameStop = [Threading.EventWaitHandle]::new($false,[Threading.EventResetMode]::ManualReset,$murasameStopName)
[void]$murasameStop.Reset()
. (Join-Path $PSScriptRoot 'host-autostart-policy.ps1')
$murasameState = @{launched=$false;missingSince=$null}
$murasameStateFile = Join-Path $murasameData 'host-autostart-state.json'
New-Item -ItemType Directory -Force -Path $murasameData | Out-Null
try {
    @{pid=$PID;startedAt=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $murasameStateFile -Encoding UTF8
    do {
        $murasameHost = [WhaleWindows]::Probe()
        if (Test-MurasameAutoLaunch $murasameState $murasameHost.hostAlive ([DateTime]::UtcNow) $murasameHost.hostPid) {
            try {
                Start-Process -FilePath $murasameLauncher -WorkingDirectory $murasameRoot -WindowStyle Hidden | Out-Null
                Add-Content -LiteralPath (Join-Path $murasameData 'host-autostart.log') -Value (([DateTime]::UtcNow.ToString('o')) + ' Host detected; requested companion launch.')
            } catch {
                Add-Content -LiteralPath (Join-Path $murasameData 'host-autostart.log') -Value (([DateTime]::UtcNow.ToString('o')) + ' Companion launch failed.')
            }
        }
    } while (!$murasameStop.WaitOne(2000))
} finally {
    Remove-Item -LiteralPath $murasameStateFile -ErrorAction SilentlyContinue
    $murasameStop.Dispose();$murasameMutex.ReleaseMutex();$murasameMutex.Dispose()
}
