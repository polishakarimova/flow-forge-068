function ConvertTo-KartaNativeArgument([string]$Value) {
 return '"' + [regex]::Replace([regex]::Replace($Value, '(\\*)"', '$1$1\"'), '(\\+)$', '$1$1') + '"'
}
function Select-KartaLatestArchive($Archives) {
 return $Archives | Sort-Object { $_.Name } | Select-Object -Last 1
}
function Invoke-KartaNativeProcess {
 param([string]$FilePath, [string[]]$Arguments, [int]$TimeoutMs = 45000)
 $start = New-Object System.Diagnostics.ProcessStartInfo
 $start.FileName = $FilePath
 $start.Arguments = (($Arguments | ForEach-Object { ConvertTo-KartaNativeArgument $_ }) -join ' ')
 $start.UseShellExecute = $false
 $start.CreateNoWindow = $true
 $start.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
 $start.RedirectStandardInput = $true
 $start.RedirectStandardOutput = $true
 $start.RedirectStandardError = $true
 $process = New-Object System.Diagnostics.Process
 $process.StartInfo = $start
 try {
  [void]$process.Start()
  $process.StandardInput.Close()
  $stdout = $process.StandardOutput.ReadToEndAsync()
  $stderr = $process.StandardError.ReadToEndAsync()
  if (!$process.WaitForExit($TimeoutMs)) {
   $process.Kill()
   [void]$process.WaitForExit(5000)
   throw 'native_process_timeout'
  }
  $output = $stdout.GetAwaiter().GetResult()
  [void]$stderr.GetAwaiter().GetResult()
  if ($process.ExitCode -ne 0) { throw ('native_process_failed_' + $process.ExitCode) }
  return $output
 } finally { $process.Dispose() }
}
