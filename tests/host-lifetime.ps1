. (Join-Path $PSScriptRoot '../packages/desktop/host-lifetime.ps1')
$life = @{seen=$false;missingSince=$null}
$now = [datetime]'2026-10-22T00:00:00Z'
function Check($state,$seconds,$expected) {
    if ((Test-MurasameHostExit $life $state $now.AddSeconds($seconds)) -ne $expected) { throw "Unexpected host exit decision at $seconds" }
}
Check @{hostAlive=$false;window='0'} 0 $false
Check @{hostAlive=$true;window='1';visible=$true} 1 $false
Check @{hostAlive=$true;window='1';visible=$false} 4 $false
Check @{hostAlive=$true;window='0'} 5 $false
Check @{hostAlive=$true;window='1'} 6 $false
Check @{hostAlive=$true;window='0'} 7 $false
Check @{hostAlive=$true;window='0'} 8 $false
Check @{hostAlive=$true;window='0'} 9 $false
Check @{hostAlive=$true;window='0'} 600 $false
Check @{hostAlive=$true;window='2';visible=$true} 601 $false
Check @{hostAlive=$false;window='0'} 602 $false
Check @{hostAlive=$true;window='0'} 603 $false
Check @{hostAlive=$false;window='0'} 604 $false
Check @{hostAlive=$false;window='0'} 606 $true
$life = @{seen=$true;missingSince=$null}
Check @{hostAlive=$false;window='0'} 10 $false
Check @{hostAlive=$false;window='0'} 12 $true
Write-Output 'Host lifetime checks passed'
