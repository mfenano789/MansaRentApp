@echo off
chcp 65001 >nul
title MansaRent - construction de l'APK Android
cd /d "%~dp0"
echo.
echo  ==========================================
echo    MansaRent - construction de l'APK Android
echo  ==========================================
echo.

rem ---- Java (celui fourni avec Android Studio) ----
if defined JAVA_HOME if exist "%JAVA_HOME%\bin\java.exe" goto java_ok
for %%D in ("%ProgramFiles%\Android\Android Studio\jbr" "%LOCALAPPDATA%\Programs\Android Studio\jbr" "%ProgramFiles%\Android\Android Studio\jre") do (
  if exist "%%~D\bin\java.exe" set "JAVA_HOME=%%~D"
)
if not defined JAVA_HOME goto no_studio
if not exist "%JAVA_HOME%\bin\java.exe" goto no_studio
:java_ok
echo  [OK] Java : %JAVA_HOME%

rem ---- SDK Android ----
if defined ANDROID_HOME if exist "%ANDROID_HOME%\platform-tools" goto sdk_ok
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
if not exist "%ANDROID_HOME%\platform-tools" goto no_sdk
:sdk_ok
echo  [OK] SDK Android : %ANDROID_HOME%
set "PATH=%JAVA_HOME%\bin;%PATH%"

rem Retenir ces chemins pour les prochaines fois (nouveau terminal)
setx JAVA_HOME "%JAVA_HOME%" >nul
setx ANDROID_HOME "%ANDROID_HOME%" >nul
echo sdk.dir=%ANDROID_HOME:\=\\%> android\local.properties

echo.
echo  [1/3] Construction de l'application...
call npm run build:mobile || goto failed
echo.
echo  [2/3] Copie dans le projet Android...
call npx cap sync android || goto failed
echo.
echo  [3/3] Creation de l'APK (5 a 10 min la premiere fois)...
pushd android
call gradlew.bat assembleDebug || (popd & goto failed)
popd

copy /y "android\app\build\outputs\apk\debug\app-debug.apk" "MansaRent.apk" >nul
echo.
echo  ==========================================
echo    TERMINE : MansaRent.apk
echo    %CD%\MansaRent.apk
echo  ==========================================
echo  Envoyez ce fichier sur Google Drive (partage : "Tous les utilisateurs
echo  disposant du lien") pour obtenir un lien de telechargement.
explorer /select,"%CD%\MansaRent.apk"
goto end

:no_studio
echo  [!] Java introuvable : Android Studio n'est pas installe.
echo      1. Installez-le : https://developer.android.com/studio
echo      2. Ouvrez-le une fois et terminez l'assistant (Next...).
echo      3. Relancez ce fichier.
start "" https://developer.android.com/studio
goto end

:no_sdk
echo  [!] SDK Android introuvable.
echo      Ouvrez Android Studio une fois et terminez l'assistant
echo      (il telecharge le SDK), puis relancez ce fichier.
goto end

:failed
echo.
echo  [X] La construction a echoue. Copiez les messages ci-dessus a Claude.

:end
echo.
pause
