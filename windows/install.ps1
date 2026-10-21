# Rejestruje mostek (native messaging host) miedzy rozszerzeniem DDG Alias + KeePassXC
# a programem KeePassXC. Uruchom przez install.bat (bez uprawnien administratora).

$ErrorActionPreference = 'Stop'
$HostName = 'com.kacperpe.ddg_alias'
$ExtId    = 'gkgcncciehcfledgfenglkkmgoodkbmm'

Write-Host ''
Write-Host '== DDG Alias + KeePassXC: instalacja mostka ==' -ForegroundColor Cyan

# 1. Znajdz keepassxc-proxy.exe
$candidates = @(
  "$env:ProgramFiles\KeePassXC\keepassxc-proxy.exe",
  "${env:ProgramFiles(x86)}\KeePassXC\keepassxc-proxy.exe",
  "$env:LOCALAPPDATA\Programs\KeePassXC\keepassxc-proxy.exe",
  "$env:LOCALAPPDATA\KeePassXC\keepassxc-proxy.exe",
  "$env:USERPROFILE\scoop\apps\keepassxc\current\keepassxc-proxy.exe"
)
$cmd = Get-Command keepassxc-proxy.exe -ErrorAction SilentlyContinue
if ($cmd) { $candidates = @($cmd.Source) + $candidates }
$proxy = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $proxy) {
  Write-Host 'Nie znalazlem keepassxc-proxy.exe w typowych miejscach.' -ForegroundColor Yellow
  $dir = Read-Host 'Podaj folder, w ktorym jest zainstalowany KeePassXC (np. D:\Programy\KeePassXC)'
  $proxy = Join-Path $dir.Trim('"') 'keepassxc-proxy.exe'
  if (-not (Test-Path $proxy)) { throw "Brak pliku: $proxy" }
}
Write-Host "KeePassXC proxy: $proxy"

# 2. Zapisz manifest hosta
$dir = Join-Path $env:LOCALAPPDATA 'DDGAliasKeePassXC'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$manifestPath = Join-Path $dir "$HostName.json"
$manifest = [ordered]@{
  name            = $HostName
  description     = 'DDG Alias + KeePassXC bridge'
  path            = $proxy
  type            = 'stdio'
  allowed_origins = @("chrome-extension://$ExtId/")
}
$json = $manifest | ConvertTo-Json
[IO.File]::WriteAllText($manifestPath, $json, (New-Object Text.UTF8Encoding $false))
Write-Host "Manifest: $manifestPath"

# 3. Wpisy w rejestrze dla przegladarek opartych na Chromium
$browsers = @(
  @{ Name = 'Chrome';   Key = 'Software\Google\Chrome\NativeMessagingHosts' },
  @{ Name = 'Edge';     Key = 'Software\Microsoft\Edge\NativeMessagingHosts' },
  @{ Name = 'Brave';    Key = 'Software\BraveSoftware\Brave-Browser\NativeMessagingHosts' },
  @{ Name = 'Vivaldi';  Key = 'Software\Vivaldi\NativeMessagingHosts' },
  @{ Name = 'Chromium'; Key = 'Software\Chromium\NativeMessagingHosts' }
)
foreach ($b in $browsers) {
  $path = "HKCU:\$($b.Key)\$HostName"
  New-Item -Path $path -Force | Out-Null
  Set-Item -Path $path -Value $manifestPath
  Write-Host ("Zarejestrowano dla: " + $b.Name)
}

Write-Host ''
Write-Host 'Gotowe!' -ForegroundColor Green
Write-Host '1. W KeePassXC: Narzedzia > Ustawienia > Integracja z przegladarka > Wlacz integracje.'
Write-Host '2. Zrestartuj przegladarke.'
Write-Host '3. W opcjach rozszerzenia kliknij "Polacz z KeePassXC" i zatwierdz w KeePassXC.'
Write-Host ''
