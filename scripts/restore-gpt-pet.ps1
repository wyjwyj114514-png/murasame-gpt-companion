$ErrorActionPreference = 'Stop'
$murasameRoot = Split-Path -Parent $PSScriptRoot
$murasamePreviousNodeMode = $env:ELECTRON_RUN_AS_NODE
$murasameData = Join-Path $murasameRoot 'private-assets/gpt-data'
New-Item -ItemType Directory -Force -Path $murasameData | Out-Null
try {
    $env:ELECTRON_RUN_AS_NODE = '1'
    $murasameRecover = Start-Process -FilePath (Join-Path $murasameRoot 'outputs/Project-Murasame-GPT-local-0.2.0/electron.exe') -ArgumentList ('"' + (Join-Path $PSScriptRoot 'restore-gpt-pet.mjs') + '"') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $murasameData 'recovery-output.log') -RedirectStandardError (Join-Path $murasameData 'recovery-error.log')
    # Wait only for the recovery command, not its long-lived GUI descendants.
    [void]$murasameRecover.Handle
    $murasameRecover.WaitForExit()
    if ($murasameRecover.ExitCode -ne 0) { throw 'Murasame recovery failed.' }
} catch {
    Add-Type -AssemblyName System.Windows.Forms
    [void][System.Windows.Forms.MessageBox]::Show("小丛雨暂时未能恢复。请先打开 GPT，再双击找回快捷方式。`n错误记录：" + (Join-Path $murasameData 'recovery-error.log'), '找回小丛雨')
    exit 1
} finally { $env:ELECTRON_RUN_AS_NODE = $murasamePreviousNodeMode }
