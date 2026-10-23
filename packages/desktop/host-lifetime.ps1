function Test-MurasameHostExit($Lifetime, $HostState, [datetime]$Now) {
    # Closing to the tray removes the window but keeps the host process alive.
    if ($HostState.hostAlive) { $Lifetime.seen = $true; $Lifetime.missingSince = $null; return $false }
    if (!$Lifetime.seen) { return $false }
    if ($null -eq $Lifetime.missingSince) { $Lifetime.missingSince = $Now }
    return ($Now - $Lifetime.missingSince).TotalSeconds -ge 1.5
}
