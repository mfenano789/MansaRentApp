# MansaRent - reusable release APK build (Windows PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File .\build-apk.ps1
# Prereqs (one-time, see product_status.md):
#   1. Portable JDK 17+ in $env:USERPROFILE\.local\share\mansarent-android\jdk-17 (or set JAVA_HOME)
#   2. Android SDK in $env:LOCALAPPDATA\Android\Sdk with platform-tools, platforms;android-35, build-tools;35.0.0
#   3. android\keystore.properties pointing at your release keystore (gitignored, never commit)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# --- Locate Java ---
if (-not $env:JAVA_HOME -or -not (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
  $cand = Get-ChildItem "$env:USERPROFILE\.local\share\mansarent-android" -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "jdk*" } | Sort-Object Name -Descending | Select-Object -First 1
  if ($cand) { $env:JAVA_HOME = $cand.FullName }
}
if (-not $env:JAVA_HOME) { throw "JAVA_HOME not set and no portable JDK found. Install Microsoft OpenJDK 17 (portable zip) into $env:USERPROFILE\.local\share\mansarent-android\jdk-17" }
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path
java -version

# --- Locate Android SDK ---
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk" }
if (-not (Test-Path "$env:ANDROID_HOME\platform-tools")) { throw "Android SDK not found at $env:ANDROID_HOME. Run the SDK setup steps in product_status.md first." }
$bt = Get-ChildItem "$env:ANDROID_HOME\build-tools" -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
if (-not $bt) { throw "No build-tools in SDK. Install via: sdkmanager 'build-tools;35.0.0'" }
$env:Path = "$env:ANDROID_HOME\platform-tools;$($bt.FullName);" + $env:Path

# --- Keystore check (release signing) ---
if (-not (Test-Path "android\keystore.properties")) {
  throw "android\keystore.properties missing. Create it (storeFile/storePassword/keyAlias/keyPassword). It is gitignored - never commit it."
}

# --- Build web + sync + assemble ---
npm.cmd run build
npx.cmd cap sync android
Push-Location android
$buildStart = Get-Date
.\gradlew.bat assembleRelease
if ($LASTEXITCODE -ne 0) { throw "assembleRelease failed (exit $LASTEXITCODE). Fix the error above - the APK was NOT rebuilt." }
Pop-Location

$apk = "android\app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $apk)) { throw "APK not produced at $apk" }
if ((Get-Item $apk).LastWriteTime -lt $buildStart) { throw "APK at $apk is stale (older than this build start). The build did not produce a new APK." }

# --- Verify ---
$apksigner = Join-Path $bt.FullName "apksigner.bat"
& $apksigner verify --print-certs $apk
$aapt = Join-Path $bt.FullName "aapt.exe"
& $aapt dump badging $apk | Select-String "package:|launchable-activity:|sdkVersion:|targetSdkVersion:"
New-Item -ItemType Directory -Force -Path "release" | Out-Null
Copy-Item $apk "release\MansaRent-v1.0.apk" -Force
$hash = (Get-FileHash "release\MansaRent-v1.0.apk" -Algorithm SHA256).Hash
$size = (Get-Item "release\MansaRent-v1.0.apk").Length
Write-Host "APK: $root\release\MansaRent-v1.0.apk"
Write-Host ("SIZE: {0:N0} bytes" -f $size)
Write-Host "SHA256: $hash"
