@echo off
echo Iniciando el proceso de empaquetado con PyInstaller...

pyinstaller --name CalculadoraEspesores --onefile ^
  --upx-dir "upx-5.0.1-win64" ^
  --add-data "Front;Front" ^
  --add-data "BackAPI/src/api;api" ^
  --add-data "BackAPI/src/services;services" ^
  --add-data ".env;." ^
  --paths "BackAPI/src" ^
  "BackAPI/src/main.py"

echo.
echo Proceso de empaquetado finalizado.
echo El ejecutable se encuentra en la carpeta 'dist'.
pause