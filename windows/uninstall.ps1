# Usuwa mostek DDG Alias + KeePassXC (wpisy w rejestrze i manifest).
$HostName = 'com.kacperpe.ddg_alias'
$keys = @(
  'Software\Google\Chrome\NativeMessagingHosts',
  'Software\Microsoft\Edge\NativeMessagingHosts',
  'Software\BraveSoftware\Brave-Browser\NativeMessagingHosts',
  'Software\Vivaldi\NativeMessagingHosts',
  'Software\Chromium\NativeMessagingHosts'
)
foreach ($k in $keys) {
  $p = "HKCU:\$k\$HostName"
  if (Test-Path $p) { Remove-Item -Path $p -Force; Write-Host "Usunieto: $p" }
}
$dir = Join-Path $env:LOCALAPPDATA 'DDGAliasKeePassXC'
if (Test-Path $dir) { Remove-Item -Recurse -Force $dir; Write-Host "Usunieto: $dir" }
Write-Host 'Gotowe.'
