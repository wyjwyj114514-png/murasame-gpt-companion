function Test-MurasameAutoLaunch($State, [bool]$HostAlive, [datetime]$Now, [int]$HostPid = 0) {
    if (!$HostAlive) {
        if ($null -eq $State.missingSince) { $State.missingSince = $Now }
        if (($Now - $State.missingSince).TotalSeconds -ge 1.5) { $State.launched = $false }
        return $false
    }
    $State.missingSince = $null
    if ($HostPid -ne 0 -and $State.hostPid -ne $HostPid) { $State.launched = $false }
    $State.hostPid = $HostPid
    if ($State.launched) { return $false }
    $State.launched = $true
    return $true
}
