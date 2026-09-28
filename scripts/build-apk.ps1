$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not $env:JAVA_HOME) { $env:JAVA_HOME = 'C:\android\jdk' }
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = 'C:\android\sdk' }
if (-not (Test-Path "$env:JAVA_HOME\bin\java.exe")) { throw "Не найден JDK: $env:JAVA_HOME" }
if (-not (Test-Path "$env:ANDROID_HOME\platforms")) { throw "Не найден Android SDK: $env:ANDROID_HOME" }
if (-not (Test-Path "$root\android\keystore.properties")) {
    Write-Warning 'Нет android\keystore.properties, APK соберётся без подписи. См. android\keystore.properties.example'
}

$work = $root
$drive = $null
if ($root -match '[^\x00-\x7F]') {
    $drive = @('X:', 'Y:', 'Z:', 'W:') | Where-Object { -not (Test-Path "$_\") } | Select-Object -First 1
    subst $drive $root
    $work = "$drive\"
}
if (-not $env:GRADLE_USER_HOME -and ($env:USERPROFILE -match '[^\x00-\x7F]')) { $env:GRADLE_USER_HOME = 'C:\android\gradle' }
if (-not $env:ANDROID_USER_HOME -and ($env:USERPROFILE -match '[^\x00-\x7F]')) { $env:ANDROID_USER_HOME = 'C:\android\.android' }

try {
    Push-Location $work
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw 'cap sync завершился с ошибкой' }

    Push-Location android
    .\gradlew.bat assembleRelease --no-daemon
    if ($LASTEXITCODE -ne 0) { throw 'Сборка Gradle завершилась с ошибкой' }
    Pop-Location

    $version = (Get-Content package.json -Raw | ConvertFrom-Json).version
    New-Item -ItemType Directory -Force dist | Out-Null
    $apk = "dist\finny-pet-$version.apk"
    Copy-Item android\app\build\outputs\apk\release\app-release.apk $apk -Force
    Write-Host "Готово: $root\$apk"
}
finally {
    Pop-Location
    if ($drive) { subst $drive /D }
}
