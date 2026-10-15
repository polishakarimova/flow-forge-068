$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'offsite-process.ps1')
$binary=Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
function Invoke-Fixture([string]$Code,[int]$TimeoutMs=15000) {
 $encoded=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Code))
 return Invoke-KartaNativeProcess -FilePath $binary -Arguments @('-NoProfile','-NonInteractive','-EncodedCommand',$encoded) -TimeoutMs $TimeoutMs
}
if((Invoke-Fixture '[Console]::Out.Write([Console]::In.ReadToEnd().Length)').Trim() -ne '0'){throw 'stdin_not_closed'}
try{[void](Invoke-Fixture '[Console]::Error.Write("private-fixture-value"); exit 7');throw 'failure_not_detected'}catch{if($_.Exception.Message -ne 'native_process_failed_7'){throw}}
$marker=Join-Path ([IO.Path]::GetTempPath()) ('karta-process-'+[guid]::NewGuid().ToString('N')+'.txt')
try {
 $code='[IO.File]::WriteAllText('''+$marker.Replace("'","''")+''',[string]$PID); Start-Sleep -Seconds 30'
 try{[void](Invoke-Fixture $code 10000);throw 'timeout_not_detected'}catch{if($_.Exception.Message -ne 'native_process_timeout'){throw}}
 if(Test-Path -LiteralPath $marker){$fixtureId=[int][IO.File]::ReadAllText($marker);if(Get-Process -Id $fixtureId -ErrorAction SilentlyContinue){throw 'timed_out_process_still_running'}}else{throw 'fixture_did_not_start'}
}finally{if(Test-Path -LiteralPath $marker){Remove-Item -LiteralPath $marker}}
$archives=@(@{Name='karta-2026-10-15T03-20-03-723Z.aes'},@{Name='karta-2026-10-14T23-18-01-054Z.aes'})
if((Select-KartaLatestArchive $archives).Name -ne 'karta-2026-10-15T03-20-03-723Z.aes'){throw 'latest_archive_not_selected'}
Write-Output '4 native process and archive checks passed'
