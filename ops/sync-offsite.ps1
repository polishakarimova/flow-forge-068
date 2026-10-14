param([string]$Destination='C:\Users\polin\CodexBackups\Карта контента')
$ErrorActionPreference='Stop'
$taskKey=Join-Path $env:USERPROFILE '.ssh\sobralis_deploy'
New-Item -ItemType Directory -Path $Destination -Force | Out-Null
$taskLock=Join-Path $Destination '.sync.lock'
$taskHandle=[System.IO.File]::Open($taskLock,'OpenOrCreate','ReadWrite','None')
try {
 $taskLines=& ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -i $taskKey root@5.42.111.195 'find /opt/kartakontenta-backups/encrypted -maxdepth 1 -type f -name "karta-*.aes" -printf "%f\n"'
 if($LASTEXITCODE -ne 0){throw 'Не удалось прочитать список резервных копий'}
 foreach($taskName in $taskLines){
  if($taskName -notmatch '^karta-[0-9TZ-]+\.aes$'){throw 'Неожиданное имя архива'}
  $taskTarget=Join-Path $Destination $taskName
  $taskExpected=(& ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -i $taskKey root@5.42.111.195 ('cat /opt/kartakontenta-backups/encrypted/'+$taskName+'.sha256')).Trim()
  if($LASTEXITCODE -ne 0 -or $taskExpected -notmatch '^[a-f0-9]{64}$'){throw 'Не удалось проверить контрольную сумму'}
  if(!(Test-Path -LiteralPath $taskTarget)-or (Get-FileHash -LiteralPath $taskTarget -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskExpected){
   $taskTemp=Join-Path $Destination ($taskName+'.'+[guid]::NewGuid().ToString('N')+'.part')
   & scp -q -o BatchMode=yes -o StrictHostKeyChecking=yes -i $taskKey ('root@5.42.111.195:/opt/kartakontenta-backups/encrypted/'+$taskName) $taskTemp
   if($LASTEXITCODE -ne 0 -or (Get-FileHash -LiteralPath $taskTemp -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskExpected){throw 'Ошибка переноса или контрольной суммы'}
   Move-Item -LiteralPath $taskTemp -Destination $taskTarget -Force
  }
 }
 $taskRecovery=Join-Path $Destination 'Ключ восстановления.dpapi'
 if(!(Test-Path -LiteralPath $taskRecovery)){
  Add-Type -AssemblyName System.Security
  $taskEncoded=(& ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -i $taskKey root@5.42.111.195 'base64 -w0 /etc/kartakontenta/backup.key') -join ''
  if($LASTEXITCODE -ne 0){throw 'Не удалось получить ключ восстановления'}
  $taskBytes=[Convert]::FromBase64String($taskEncoded)
  if($taskBytes.Length -ne 32){throw 'Неверный ключ восстановления'}
  $taskProtected=[System.Security.Cryptography.ProtectedData]::Protect($taskBytes,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)
  [System.IO.File]::WriteAllBytes($taskRecovery,$taskProtected);[Array]::Clear($taskBytes,0,$taskBytes.Length);$taskEncoded=$null
 }
 [System.IO.File]::WriteAllText((Join-Path $Destination 'Статус копирования.json'),(@{ok=$true;at=(Get-Date).ToUniversalTime().ToString('o');archives=@($taskLines).Count}|ConvertTo-Json))
}catch {
 [System.IO.File]::WriteAllText((Join-Path $Destination 'Статус копирования.json'),(@{ok=$false;at=(Get-Date).ToUniversalTime().ToString('o');error=$_.Exception.Message}|ConvertTo-Json));throw
}finally{$taskHandle.Dispose()}
