param([switch]$Disable)
$ErrorActionPreference = 'Stop'
# Installs or removes the Murasame autostart.
#
# Design (2026-10-23 rewrite):
#   Task Scheduler -> MurasameLauncher-*.exe  (WinExe, no console, single instance)
#     -> powershell -CreateNoWindow supervisor.ps1 -DataDir <gpt-data>
#       -> electron companion, shown only while a Codex / Work window exists
#
# The previous version ran a hidden PowerShell directly from the task. Windows
# Terminal is the default console host on this machine, so every restart of that
# hidden console produced a visible "Windows PowerShell" taskbar window that came
# back after every close. The WinExe launcher never creates a console at all.
$murasameRoot = Split-Path -Parent $PSScriptRoot
$murasameData = Join-Path $murasameRoot 'private-assets/gpt-data'
$murasamePlugin = Join-Path $murasameRoot 'dist/gpt-murasame-local'
$murasameScript = Join-Path $murasamePlugin 'desktop/supervisor.ps1'
$murasameTaskName = 'ProjectMurasame-AutoStart'
$murasameRunKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$murasameRunName = 'ProjectMurasame'
$murasamePowerShell = Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
if ($Disable) {
    Stop-ScheduledTask -TaskName $murasameTaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $murasameTaskName -Confirm:$false -ErrorAction SilentlyContinue
    Remove-ItemProperty -LiteralPath $murasameRunKey -Name $murasameRunName -ErrorAction SilentlyContinue
    & $murasamePowerShell -NoProfile -ExecutionPolicy Bypass -File $murasameScript -DataDir $murasameData -Stop
    Write-Output 'Murasame autostart disabled.'
    return
}
if (!(Test-Path -LiteralPath (Join-Path $murasamePlugin 'desktop/supervisor.ps1'))) { throw 'Run npm run build:gpt first; the local plugin build is missing.' }
# Login item from the first design is superseded by the scheduled task.
Remove-ItemProperty -LiteralPath $murasameRunKey -Name $murasameRunName -ErrorAction SilentlyContinue
$murasameLauncher = & (Join-Path $PSScriptRoot 'build-murasame-launcher.ps1') -DataDir $murasameData
if (!$murasameLauncher -or !(Test-Path -LiteralPath $murasameLauncher -PathType Leaf)) { throw 'The windowless launcher is unavailable.' }
$murasameUser = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$murasameAction = New-ScheduledTaskAction -Execute $murasameLauncher -Argument ('--script "' + $murasameScript + '" --data "' + $murasameData + '"') -WorkingDirectory $murasameData
$murasameLogon = New-ScheduledTaskTrigger -AtLogOn -User $murasameUser
# The supervisor exits by design once the Codex / Work host is gone. A windowless
# one-minute repair trigger starts a fresh waiting supervisor; while one is alive
# the launcher simply exits in ~150 ms through its single-instance mutex.
$murasameRepair = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
$murasameSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
$murasamePrincipal = New-ScheduledTaskPrincipal -UserId $murasameUser -LogonType Interactive -RunLevel Limited
Stop-ScheduledTask -TaskName $murasameTaskName -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500
Register-ScheduledTask -TaskName $murasameTaskName -Action $murasameAction -Trigger @($murasameLogon, $murasameRepair) -Settings $murasameSettings -Principal $murasamePrincipal -Force | Out-Null
$murasameRegistered = Get-ScheduledTask -TaskName $murasameTaskName -ErrorAction Stop
$murasameActions = @($murasameRegistered.Actions)
if ($murasameActions.Count -ne 1 -or $murasameActions[0].Execute -ine $murasameLauncher) { throw 'Task Scheduler did not retain the windowless launcher action.' }
Start-ScheduledTask -TaskName $murasameTaskName
$murasameStarted = $false
for ($murasameAttempt = 0; $murasameAttempt -lt 50; $murasameAttempt++) {
    try {
        $murasameLaunched = Get-Content -LiteralPath (Join-Path $murasameData 'launcher-state.json') -Raw -Encoding UTF8 | ConvertFrom-Json
        $murasameWorker = Get-Content -LiteralPath (Join-Path $murasameData 'supervisor-state.json') -Raw -Encoding UTF8 | ConvertFrom-Json
        $murasameLauncherProcess = Get-CimInstance Win32_Process -Filter ('ProcessId=' + [int]$murasameLaunched.pid) -ErrorAction Stop
        $murasameWorkerProcess = Get-CimInstance Win32_Process -Filter ('ProcessId=' + [int]$murasameWorker.pid) -ErrorAction Stop
        if ($murasameLaunched.executable -ieq $murasameLauncher -and
            $murasameLaunched.script -ceq $murasameScript -and
            $murasameLaunched.consoleAttached -eq $false -and
            $murasameWorker.consoleAttached -eq $false -and
            $murasameWorker.pid -eq $murasameLaunched.supervisorPid -and
            $murasameLauncherProcess.ExecutablePath -ieq $murasameLauncher -and
            $murasameWorkerProcess.ParentProcessId -eq $murasameLaunched.pid -and
            (Get-ScheduledTask -TaskName $murasameTaskName -ErrorAction Stop).State -eq 'Running') {
            $murasameStarted = $true; break
        }
    } catch { }
    Start-Sleep -Milliseconds 200
}
if (!$murasameStarted) { throw 'The launcher was registered but its monitor did not start. Check launcher-error.json / supervisor-error.json.' }
Write-Output ('Murasame autostart enabled: windowless launcher + supervisor, no console window. launcher=' + $murasameLauncher)
