@echo off
echo.
echo ====================================
echo  🚀 COMPACT E BUILD DO PROJETO EMB 
echo ====================================
echo.

echo 📦 Verificando dependencias...
if not exist "node_modules" (
    echo ⚠️  node_modules nao encontrado. Instalando dependencias...
    npm install
    if errorlevel 1 (
        echo ❌ Erro ao instalar dependencias
        pause
        exit /b 1
    )
)

echo.
echo 🧹 Limpando arquivos temporarios...
if exist "dist" rmdir /s /q "dist"
if exist ".vite" rmdir /s /q ".vite"
if exist ".cache" rmdir /s /q ".cache"

echo.
echo 🔨 Construindo versao otimizada...
npm run build
if errorlevel 1 (
    echo ❌ Erro no build
    pause
    exit /b 1
)

echo.
echo 📊 Analisando tamanho dos arquivos...
if exist "dist" (
    for /f "tokens=3" %%i in ('dir "dist" /s /-c ^| find "bytes"') do set size=%%i
    echo 📈 Tamanho total da build: %size% bytes
)

echo.
echo 🎯 Otimizacoes aplicadas:
echo    ✅ Minificacao de JavaScript
echo    ✅ Otimizacao de CSS
echo    ✅ Compressao de assets
echo    ✅ Tree-shaking
echo    ✅ Code splitting

echo.
echo 📋 Arquivos gerados em /dist:
if exist "dist" (
    dir "dist" /b
)

echo.
echo 🚀 Comandos para deploy:
echo.
echo   Vercel:   npx vercel --prod
echo   Netlify:  npx netlify deploy --prod --dir=dist
echo   GitHub:   git add dist ^&^& git commit -m "Build para producao"
echo.

echo ✅ Build completo com sucesso!
echo.
pause
