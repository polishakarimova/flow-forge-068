param([string]$Destination=(Join-Path $env:USERPROFILE 'CodexBackups\Карта контента'))
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'offsite-process.ps1')
$taskKey=Join-Path $env:USERPROFILE '.ssh\sobralis_deploy'
$taskSsh=Join-Path $env:WINDIR 'System32\OpenSSH\ssh.exe'
$taskScp=Join-Path $env:WINDIR 'System32\OpenSSH\scp.exe'
$taskOptions=@('-o','BatchMode=yes','-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=15','-o','ServerAliveInterval=10','-o','ServerAliveCountMax=2','-i',$taskKey)
$taskStatus=Join-Path $Destination 'Статус копирования.json'
$taskPending=$null
$taskPrevious=$null
function Read-KartaRemote([string]$Command) {
 for($attempt=0;$attempt -lt 3;$attempt++) {
  try { return Invoke-KartaNativeProcess -FilePath $taskSsh -Arguments (@('-n')+$taskOptions+@('root@5.42.111.195',$Command)) }
  catch { if($attempt -eq 2){throw 'Не удалось получить ответ сервера после трёх попыток'} }
 }
}
function Write-KartaCopyStatus($Value) {
 $temporary=$taskStatus+'.'+[guid]::NewGuid().ToString('N')+'.tmp'
 [IO.File]::WriteAllText($temporary,($Value|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
 if(Test-Path -LiteralPath $taskStatus){[IO.File]::Replace($temporary,$taskStatus,($taskStatus+'.previous'))}
 else{[IO.File]::Move($temporary,$taskStatus)}
}
New-Item -ItemType Directory -Path $Destination -Force | Out-Null
try {$taskHandle=[IO.File]::Open((Join-Path $Destination '.sync.lock'),'OpenOrCreate','ReadWrite','None')}
catch [IO.IOException] { Write-Output 'Копирование уже выполняется'; exit 0 }
try {
 if(Test-Path -LiteralPath $taskStatus){try{$taskPrevious=Get-Content -LiteralPath $taskStatus -Raw|ConvertFrom-Json}catch{}}
 $taskMetadata=Read-KartaRemote 'cd /opt/kartakontenta-backups/encrypted && sha256sum karta-*.aes'
 $taskArchives=@()
 foreach($taskLine in ($taskMetadata -split '\r?\n')) {
  if(!$taskLine.Trim()){continue}
  if($taskLine -notmatch '^([a-f0-9]{64})\s+(karta-[0-9TZ-]+\.aes)$'){throw 'Неожиданный список архивов'}
  $taskArchives+=[pscustomobject]@{Name=$Matches[2];Hash=$Matches[1]}
 }
 if(!$taskArchives.Count){throw 'На сервере нет резервных копий'}
 foreach($taskArchive in $taskArchives) {
  $taskTarget=Join-Path $Destination $taskArchive.Name
  if(Test-Path -LiteralPath $taskTarget) {
   if((Get-FileHash -LiteralPath $taskTarget -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskArchive.Hash){throw 'Существующая копия отличается; файл сохранён для проверки'}
  }else {
   $taskPending=$taskTarget+'.'+[guid]::NewGuid().ToString('N')+'.part'
   [void](Invoke-KartaNativeProcess -FilePath $taskScp -Arguments (@('-B','-q')+$taskOptions+@(('root@5.42.111.195:/opt/kartakontenta-backups/encrypted/'+$taskArchive.Name),$taskPending)) -TimeoutMs 120000)
   if((Get-FileHash -LiteralPath $taskPending -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskArchive.Hash){throw 'Контрольная сумма копии не совпала'}
   [IO.File]::Move($taskPending,$taskTarget)
   $taskPending=$null
  }
 }
 Add-Type -AssemblyName System.Security
 $taskRecovery=Join-Path $Destination 'Ключ восстановления.dpapi'
 if(!(Test-Path -LiteralPath $taskRecovery)) {
  $taskEncoded=Read-KartaRemote 'base64 -w0 /etc/kartakontenta/backup.key'
  $taskBytes=[Convert]::FromBase64String($taskEncoded.Trim())
  try {
   if($taskBytes.Length -ne 32){throw 'Неверный ключ восстановления'}
   $taskProtected=[Security.Cryptography.ProtectedData]::Protect($taskBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
   [IO.File]::WriteAllBytes($taskRecovery,$taskProtected)
  }finally{[Array]::Clear($taskBytes,0,$taskBytes.Length);$taskEncoded=$null}
 }
 $taskClear=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($taskRecovery),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
 try {
  $taskDigest=((Read-KartaRemote 'sha256sum /etc/kartakontenta/backup.key') -split '\s+')[0]
  $taskHasher=[Security.Cryptography.SHA256]::Create()
  try{$taskLocalDigest=[BitConverter]::ToString($taskHasher.ComputeHash($taskClear)).Replace('-','').ToLowerInvariant()}finally{$taskHasher.Dispose()}
  if($taskDigest -notmatch '^[a-f0-9]{64}$' -or $taskLocalDigest -ne $taskDigest){throw 'Ключ восстановления отличается от серверного'}
 }finally{[Array]::Clear($taskClear,0,$taskClear.Length)}
 $taskLatest=Select-KartaLatestArchive $taskArchives
 $taskReceipt=Read-KartaRemote ('/usr/bin/node /opt/kartakontenta/operations/current/offsite-status.mjs --record-success '+$taskLatest.Name+' '+$taskLatest.Hash)
 if($taskReceipt.Trim() -ne 'offsite_receipt_recorded'){throw 'Сервер не подтвердил получение копии'}
 $taskAt=[DateTime]::UtcNow.ToString('o')
 Write-KartaCopyStatus @{ok=$true;at=$taskAt;lastVerifiedAt=$taskAt;archives=$taskArchives.Count;file=$taskLatest.Name;sha256=$taskLatest.Hash;recoveryKeyVerified=$true;serverReceiptRecorded=$true}
 Write-Output ('Резервные копии проверены: '+$taskArchives.Count)
}catch {
 Write-KartaCopyStatus @{ok=$false;at=[DateTime]::UtcNow.ToString('o');error=$_.Exception.Message;lastVerifiedAt=$taskPrevious.lastVerifiedAt;existingCopiesPreserved=$true}
 try{[void](Read-KartaRemote '/usr/bin/node /opt/kartakontenta/operations/current/offsite-status.mjs --record-failure')}catch{}
 throw
}finally {
 if($taskPending -and (Test-Path -LiteralPath $taskPending)){Remove-Item -LiteralPath $taskPending}
 $taskHandle.Dispose()
}
