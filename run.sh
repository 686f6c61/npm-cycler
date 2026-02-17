#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                              NPM-CYCLER                                   ║
# ║                      Script de inicio (run.sh)                            ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  Autor:       686f6c61                                                    ║
# ║  GitHub:      https://github.com/686f6c61                                 ║
# ║  Repositorio: https://github.com/686f6c61/npm-cycler                      ║
# ║  Versión:     0.3.0                                                       ║
# ║  Fecha:       17/02/2026                                                  ║
# ║  Licencia:    MIT                                                         ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  Descripción:                                                             ║
# ║  Script de inicio que verifica dependencias (Node.js, npm) y lanza        ║
# ║  la aplicación principal npm-cycler.js de forma interactiva.              ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  Uso:                                                                     ║
# ║  $ chmod +x run.sh                                                        ║
# ║  $ ./run.sh              # Ejecutar npm-cycler                            ║
# ║  $ ./run.sh --test-proxies  # Testear y filtrar proxies funcionales       ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  Historial de versiones:                                                  ║
# ║  v0.1.0 - 26/11/2025 - Versión inicial                                    ║
# ║  v0.2.0 - 26/11/2025 - Test de proxies en paralelo                        ║
# ║  v0.3.0 - 17/02/2026 - Seguridad, validaciones y test automatizados       ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

# =============================================================================
# OBTENER DIRECTORIO DEL SCRIPT
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROXIES_FILE="$SCRIPT_DIR/proxies.txt"
PROXIES_WORKING="$SCRIPT_DIR/proxies_working.txt"
TEMP_DIR="$SCRIPT_DIR/.proxy_test_tmp"

# =============================================================================
# FUNCIONES AUXILIARES DE PROXIES
# =============================================================================

# Devuelve únicamente proxies válidos y soportados (http/https/socks4/socks5)
filter_valid_proxies() {
    local input_file="$1"
    awk '
        /^[[:space:]]*#/ { next }
        /^[[:space:]]*$/ { next }
        {
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", $0)
            print
        }
    ' "$input_file" | grep -E '^(https?|socks4|socks5)://'
}

# Cuenta proxies válidos en PROXIES_FILE
count_valid_proxies() {
    if [ ! -f "$PROXIES_FILE" ]; then
        echo "0"
        return
    fi

    local count
    count=$(filter_valid_proxies "$PROXIES_FILE" | wc -l)
    echo "${count//[[:space:]]/}"
}

# =============================================================================
# FUNCION: TEST DE UN PROXY INDIVIDUAL
# =============================================================================
# Testea un proxy haciendo una peticion HTTP simple
# Argumentos:
#   $1 - URL del proxy (http://ip:puerto)
#   $2 - Archivo de salida para proxies funcionales
# Retorna:
#   0 si funciona, 1 si falla

test_single_proxy() {
    local proxy="$1"
    local output_file="$2"
    local timeout=10

    # Usar curl para testear el proxy con una peticion simple
    # -x: usar proxy
    # -s: modo silencioso
    # -o /dev/null: descartar output
    # -w "%{http_code}": mostrar codigo HTTP
    # --connect-timeout: timeout de conexion
    # -m: timeout maximo total
    local http_code=$(curl -x "$proxy" -s -o /dev/null -w "%{http_code}" \
        --connect-timeout $timeout -m $timeout \
        "https://registry.npmjs.org/" 2>/dev/null)

    if [ "$http_code" = "200" ] || [ "$http_code" = "301" ] || [ "$http_code" = "302" ]; then
        echo "$proxy" >> "$output_file"
        echo "  ✅ $proxy"
        return 0
    else
        echo "  ❌ $proxy"
        return 1
    fi
}

# =============================================================================
# FUNCION: TEST DE PROXIES EN PARALELO
# =============================================================================
# Testea multiples proxies en paralelo (de 10 en 10)
# Lee proxies.txt, testea cada uno, y guarda los funcionales en proxies_working.txt

test_proxies_parallel() {
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║       TEST DE PROXIES EN PARALELO      ║"
    echo "╚════════════════════════════════════════╝"
    echo ""

    # Verificar que existe el archivo de proxies
    if [ ! -f "$PROXIES_FILE" ]; then
        echo "❌ No se encontro proxies.txt"
        exit 1
    fi

    # Cargar proxies válidos en array (evita falsos positivos por líneas vacías)
    local proxies=()
    while IFS= read -r proxy; do
        if [ -n "$proxy" ]; then
            proxies+=("$proxy")
        fi
    done < <(filter_valid_proxies "$PROXIES_FILE")
    local total=${#proxies[@]}

    if [ "$total" -eq 0 ]; then
        echo "❌ No hay proxies válidos en proxies.txt"
        echo "   Formatos soportados: http://, https://, socks4://, socks5://"
        exit 1
    fi

    echo "📡 Testeando $total proxies (10 en paralelo)..."
    echo "   Esto puede tardar unos minutos..."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Crear directorio temporal para resultados
    rm -rf "$TEMP_DIR"
    mkdir -p "$TEMP_DIR"

    # Archivo temporal para proxies funcionales
    local temp_working="$TEMP_DIR/working.txt"
    touch "$temp_working"

    # Contador de proxies procesados
    local count=0
    local batch_size=10
    local pids=()

    # Procesar proxies en lotes de 10
    for proxy in "${proxies[@]}"; do
        # Lanzar test en background
        test_single_proxy "$proxy" "$temp_working" &
        pids+=($!)
        ((count++))

        # Cuando llegamos a batch_size, esperar a que terminen
        if [ ${#pids[@]} -ge $batch_size ]; then
            wait "${pids[@]}"
            pids=()
        fi

    done

    # Esperar a los ultimos procesos
    if [ ${#pids[@]} -gt 0 ]; then
        wait "${pids[@]}"
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Contar resultados
    local working=0
    if [ -f "$temp_working" ]; then
        working=$(wc -l < "$temp_working")
    fi

    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║            RESULTADO TEST              ║"
    echo "╠════════════════════════════════════════╣"
    printf "║  Total testeados:  %4d                ║\n" "$total"
    printf "║  ✅ Funcionales:   %4d                ║\n" "$working"
    printf "║  ❌ Fallidos:      %4d                ║\n" "$((total - working))"
    echo "╚════════════════════════════════════════╝"

    if [ "$working" -gt 0 ]; then
        # Copiar proxies funcionales al archivo principal
        # Primero, extraer la cabecera (comentarios) del archivo original
        grep '^#' "$PROXIES_FILE" > "$PROXIES_FILE.new"
        echo "" >> "$PROXIES_FILE.new"
        echo "# Proxies verificados: $(date '+%Y-%m-%d %H:%M:%S')" >> "$PROXIES_FILE.new"
        echo "" >> "$PROXIES_FILE.new"
        cat "$temp_working" >> "$PROXIES_FILE.new"

        # Reemplazar archivo original
        mv "$PROXIES_FILE.new" "$PROXIES_FILE"

        echo ""
        echo "✅ proxies.txt actualizado con $working proxies funcionales"
    else
        echo ""
        echo "⚠️  Ningun proxy funciona. proxies.txt no modificado."
    fi

    # Limpiar temporales
    rm -rf "$TEMP_DIR"

    echo ""
}

# =============================================================================
# FUNCION: MOSTRAR MENU PRINCIPAL
# =============================================================================

show_main_menu() {
    clear

    echo "╔════════════════════════════════════════╗"
    echo "║            NPM-CYCLER v0.3             ║"
    echo "║    github.com/686f6c61/npm-cycler      ║"
    echo "╚════════════════════════════════════════╝"
    echo ""

    # Verificar dependencias
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js no esta instalado"
        echo "   Instalalo con: sudo apt install nodejs"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        echo "❌ npm no esta instalado"
        echo "   Instalalo con: sudo apt install npm"
        exit 1
    fi

    echo "✅ Node.js $(node -v) detectado"
    echo "✅ npm $(npm -v) detectado"

    # Verificar proxies
    if [ -f "$PROXIES_FILE" ]; then
        PROXY_COUNT=$(count_valid_proxies)
        if [ "$PROXY_COUNT" -gt 0 ]; then
            echo "✅ $PROXY_COUNT proxies disponibles en proxies.txt"

            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            read -r -p "🔍 ¿Testear proxies antes de continuar? (s/n): " test_answer
            test_answer=$(printf '%s' "$test_answer" | tr '[:upper:]' '[:lower:]')

            if [ "$test_answer" = "s" ] || [ "$test_answer" = "si" ]; then
                test_proxies_parallel
                echo ""
                echo "Presiona ENTER para continuar..."
                read
                clear
                echo "╔════════════════════════════════════════╗"
                echo "║            NPM-CYCLER v0.3             ║"
                echo "║    github.com/686f6c61/npm-cycler      ║"
                echo "╚════════════════════════════════════════╝"
                echo ""
                echo "✅ Node.js $(node -v) detectado"
                echo "✅ npm $(npm -v) detectado"

                # Recontar proxies despues del test
                PROXY_COUNT=$(count_valid_proxies)
                if [ "$PROXY_COUNT" -gt 0 ]; then
                    echo "✅ $PROXY_COUNT proxies funcionales en proxies.txt"
                else
                    echo "⚠️  No hay proxies funcionales"
                fi
            fi
        else
            echo "⚠️  proxies.txt no tiene proxies validos"
        fi
    else
        echo "⚠️  proxies.txt no encontrado"
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# =============================================================================
# PUNTO DE ENTRADA PRINCIPAL
# =============================================================================

# Verificar argumentos
case "$1" in
    --test-proxies|-t)
        # Modo test de proxies
        test_proxies_parallel
        ;;
    --help|-h)
        echo "Uso: ./run.sh [opcion]"
        echo ""
        echo "Opciones:"
        echo "  (sin argumentos)    Ejecutar npm-cycler"
        echo "  --test-proxies, -t  Testear proxies y filtrar funcionales"
        echo "  --help, -h          Mostrar esta ayuda"
        echo ""
        ;;
    *)
        # Modo normal: ejecutar npm-cycler
        show_main_menu
        node "$SCRIPT_DIR/npm-cycler.js"
        ;;
esac
