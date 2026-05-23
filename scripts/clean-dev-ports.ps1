# Frees ports used by SCENT Wellness dev (frontend 3000, backend 3001)
$ports = @(3000, 3001)
$pids = [System.Collections.Generic.HashSet[int]]::new()

foreach ($port in $ports) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { [void]$pids.Add($_.OwningProcess) }
}

foreach ($procId in $pids) {
  if ($procId -le 0) { continue }
  try {
    $name = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
    Write-Host "Stopping $name (PID $procId)"
    Stop-Process -Id $procId -Force -ErrorAction Stop
  } catch {
    Write-Host "Could not stop PID $procId : $_"
  }
}

Start-Sleep -Milliseconds 500
Write-Host "Ports 3000 and 3001 should be free."
