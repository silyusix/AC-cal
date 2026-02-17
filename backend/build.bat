@echo off
set local

echo =================================================
echo (1/3) Building Frontend Application...
echo =================================================
echo.

REM Navigate to the frontend directory
cd ..\frontend

REM Install dependencies (if needed) and build the project
echo Running npm install...
call npm install
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend 'npm install' failed. Please check for errors above.
    goto :error
)

echo Running npm run build...
call npm run build
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend 'npm run build' failed. Please check for errors above.
    goto :error
)

echo.
echo Frontend build successful.
echo.


echo =================================================
echo (2/3) Packaging Backend Application...
echo =================================================
echo.

REM Navigate back to the backend directory
cd ..\backend

REM Run PyInstaller using the .spec file to include the frontend files
echo Running pyinstaller with main.spec...
pyinstaller main.spec
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend packaging with PyInstaller failed. Please check for errors above.
    goto :error
)

echo.
echo Backend packaging successful.
echo.


echo =================================================
echo (3/3) Build Complete!
echo =================================================
echo.
echo The packaged application is in the 'backend\dist\main' folder.
echo You can run main.exe from inside that folder.
echo.
goto :end

:error
echo.
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
echo BUILD FAILED. Please review the error messages.
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
echo.

:end
pause