#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                              NPM-CYCLER                                   ║
# ║                      Script de inicio (run.sh)                            ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  Autor:       686f6c61                                                    ║
# ║  GitHub:      https://github.com/686f6c61                                 ║
# ║  Repositorio: https://github.com/686f6c61/npm-cycler                      ║
# ║  Versión:     1.1.0                                                       ║
# ║  Fecha:       26/11/2025                                                  ║
# ║  Licencia:    MIT                                                         ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  Descripción:                                                             ║
# ║  Script de inicio que verifica dependencias (Node.js, npm) y lanza        ║
# ║  la aplicación principal npm-cycler.js de forma interactiva.              ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  Uso:                                                                     ║
# ║  $ chmod +x run.sh                                                        ║
# ║  $ ./run.sh                                                               ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  Historial de versiones:                                                  ║
# ║  v0.1.0 - 26/11/2025 - Versión inicial                                    ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

# =============================================================================
# LIMPIEZA DE PANTALLA Y BANNER
# =============================================================================

# Limpiar la terminal para una presentación limpia
clear

# Mostrar banner de la aplicación
echo "╔════════════════════════════════════════╗"
echo "║            NPM-CYCLER v0.1             ║"
echo "║    github.com/686f6c61/npm-cycler      ║"
echo "╚════════════════════════════════════════╝"
echo ""

# =============================================================================
# OBTENER DIRECTORIO DEL SCRIPT
# =============================================================================

# Obtener la ruta absoluta del directorio donde está este script
# Esto permite ejecutar el script desde cualquier ubicación
# ${BASH_SOURCE[0]} contiene la ruta del script actual
# dirname extrae el directorio
# cd + pwd resuelve la ruta absoluta (maneja symlinks)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# =============================================================================
# VERIFICACIÓN DE DEPENDENCIAS
# =============================================================================

# -----------------------------------------------------------------------------
# Verificar Node.js
# -----------------------------------------------------------------------------
# command -v: busca si el comando existe en el PATH
# &> /dev/null: redirige stdout y stderr a /dev/null (silencia output)
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    echo "   Instálalo con: sudo apt install nodejs"
    echo ""
    echo "   O visita: https://nodejs.org/"
    exit 1
fi

# -----------------------------------------------------------------------------
# Verificar npm
# -----------------------------------------------------------------------------
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado"
    echo "   Instálalo con: sudo apt install npm"
    echo ""
    echo "   O visita: https://www.npmjs.com/"
    exit 1
fi

# =============================================================================
# MOSTRAR INFORMACIÓN DEL SISTEMA
# =============================================================================

# Mostrar versiones detectadas
# $(comando) ejecuta el comando y sustituye su output
echo "✅ Node.js $(node -v) detectado"
echo "✅ npm $(npm -v) detectado"

# =============================================================================
# VERIFICAR ARCHIVO DE PROXIES
# =============================================================================

# Construir ruta al archivo de proxies
PROXIES_FILE="$SCRIPT_DIR/proxies.txt"

# Verificar si el archivo existe
# -f: verifica si es un archivo regular
if [ -f "$PROXIES_FILE" ]; then
    # Contar proxies válidos (ignorar comentarios y líneas vacías)
    # grep -v '^#': excluir líneas que empiezan con #
    # grep -v '^$': excluir líneas vacías
    # wc -l: contar líneas
    PROXY_COUNT=$(grep -v '^#' "$PROXIES_FILE" | grep -v '^$' | wc -l)

    if [ "$PROXY_COUNT" -gt 0 ]; then
        echo "✅ $PROXY_COUNT proxies disponibles en proxies.txt"
    else
        echo "⚠️  proxies.txt existe pero está vacío"
    fi
else
    echo "⚠️  proxies.txt no encontrado (funcionará sin proxies)"
fi

# =============================================================================
# SEPARADOR VISUAL
# =============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# =============================================================================
# EJECUTAR APLICACIÓN PRINCIPAL
# =============================================================================

# Lanzar npm-cycler.js con Node.js
# Usar ruta absoluta para que funcione desde cualquier directorio
node "$SCRIPT_DIR/npm-cycler.js"
