param([string]$DataDir)
$ErrorActionPreference = 'Stop'
# Builds the windowless (WinExe) launcher used by the Murasame autostart.
# The launcher starts desktop\supervisor.ps1 with CreateNoWindow and keeps it
# inside a kill-on-close job object, so autostart never creates a console or a
# Windows Terminal window in the taskbar.
function Get-MurasameDigest([string]$Path) {
    $murasameStream = [IO.File]::OpenRead($Path)
    $murasameHasher = [Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($murasameHasher.ComputeHash($murasameStream)).Replace('-', '').ToLowerInvariant() }
    finally { $murasameHasher.Dispose(); $murasameStream.Dispose() }
}
$murasameRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (!$DataDir) { $DataDir = Join-Path $murasameRoot 'private-assets/gpt-data' }
$DataDir = [IO.Path]::GetFullPath($DataDir)
$murasameSource = Join-Path $murasameRoot 'dist/gpt-murasame-local/desktop/WhaleLauncher.cs'
if (!(Test-Path -LiteralPath $murasameSource -PathType Leaf)) { throw 'WhaleLauncher.cs is missing from dist/gpt-murasame-local/desktop.' }
$murasameHash = Get-MurasameDigest $murasameSource
$murasameNative = Join-Path $DataDir 'native'
New-Item -ItemType Directory -Path $murasameNative -Force | Out-Null
$murasameExe = Join-Path $murasameNative ('MurasameLauncher-' + $murasameHash.Substring(0,20) + '.exe')
$murasameDigestFile = $murasameExe + '.sha256'
function Test-MurasameGuiExecutable([string]$Path) {
    $murasameStream = [IO.File]::OpenRead($Path)
    $murasameReader = [IO.BinaryReader]::new($murasameStream)
    try {
        if ($murasameReader.ReadUInt16() -ne 0x5a4d) { return $false }
        $murasameStream.Position = 0x3c; $murasamePE = $murasameReader.ReadInt32()
        $murasameStream.Position = $murasamePE
        if ($murasameReader.ReadUInt32() -ne 0x4550) { return $false }
        $murasameStream.Position = $murasamePE + 24 + 68
        return $murasameReader.ReadUInt16() -eq 2
    } finally { $murasameReader.Dispose(); $murasameStream.Dispose() }
}
if (Test-Path -LiteralPath $murasameExe -PathType Leaf) {
    if (!(Test-MurasameGuiExecutable $murasameExe) -or !(Test-Path -LiteralPath $murasameDigestFile) -or (Get-MurasameDigest $murasameExe) -cne (Get-Content -LiteralPath $murasameDigestFile -Raw).Trim()) { throw 'Existing launcher failed integrity validation.' }
    Write-Output $murasameExe; return
}
$murasameCompiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (!(Test-Path -LiteralPath $murasameCompiler -PathType Leaf)) { throw 'The Windows .NET Framework C# compiler is unavailable.' }
$murasameTemp = Join-Path $murasameNative ('MurasameLauncher-' + [guid]::NewGuid().ToString('N') + '.exe')
$murasameStart = [Diagnostics.ProcessStartInfo]::new()
$murasameStart.FileName = $murasameCompiler
$murasameStart.Arguments = '/nologo /target:winexe /platform:x64 /optimize+ /reference:System.Web.Extensions.dll /out:"' + $murasameTemp + '" "' + $murasameSource + '"'
$murasameStart.UseShellExecute = $false
$murasameStart.CreateNoWindow = $true
$murasameStart.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
$murasameStart.RedirectStandardOutput = $true
$murasameStart.RedirectStandardError = $true
$murasameCompilerProcess = [Diagnostics.Process]::new(); $murasameCompilerProcess.StartInfo = $murasameStart
try {
    [void]$murasameCompilerProcess.Start()
    $murasameOutput = $murasameCompilerProcess.StandardOutput.ReadToEndAsync()
    $murasameError = $murasameCompilerProcess.StandardError.ReadToEndAsync()
    $murasameCompilerProcess.WaitForExit()
    if ($murasameCompilerProcess.ExitCode -ne 0) { throw ('Launcher compilation failed: ' + $murasameOutput.GetAwaiter().GetResult() + $murasameError.GetAwaiter().GetResult()) }
    if (!(Test-MurasameGuiExecutable $murasameTemp)) { throw 'Compiler output is not a Windows GUI executable.' }
    Move-Item -LiteralPath $murasameTemp -Destination $murasameExe
    (Get-MurasameDigest $murasameExe) | Set-Content -LiteralPath $murasameDigestFile -Encoding ascii
} finally {
    $murasameCompilerProcess.Dispose()
    if (Test-Path -LiteralPath $murasameTemp -PathType Leaf) { Remove-Item -LiteralPath $murasameTemp }
}
Write-Output $murasameExe
