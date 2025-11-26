#!/usr/bin/env node

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                              NPM-CYCLER                                   ║
 * ║              Automatizador de ciclos de instalación NPM                   ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Autor:       686f6c61                                                    ║
 * ║  GitHub:      https://github.com/686f6c61                                 ║
 * ║  Repositorio: https://github.com/686f6c61/npm-cycler                      ║
 * ║  Versión:     1.1.0                                                       ║
 * ║  Fecha:       26/11/2025                                                  ║
 * ║  Licencia:    MIT                                                         ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Descripción:                                                             ║
 * ║  Herramienta CLI interactiva que automatiza ciclos de instalación y       ║
 * ║  desinstalación de paquetes npm. Soporta rotación de proxies HTTP/SOCKS   ║
 * ║  para distribuir las peticiones entre diferentes IPs.                     ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Características:                                                         ║
 * ║  - Instalación/desinstalación automatizada en ciclos                      ║
 * ║  - Soporte para proxies HTTP, HTTPS y SOCKS4/5                            ║
 * ║  - Rotación automática de proxies con fallback                            ║
 * ║  - Delays configurables entre iteraciones                                 ║
 * ║  - Directorios temporales aislados por iteración                          ║
 * ║  - Parseo flexible del nombre del paquete                                 ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Uso:                                                                     ║
 * ║  $ node npm-cycler.js                                                     ║
 * ║  $ ./run.sh                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Historial de versiones:                                                  ║
 * ║  v0.1.0 - 26/11/2025 - Versión inicial: ciclos, proxies, parseo flexible  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

// =============================================================================
// DEPENDENCIAS
// =============================================================================

/**
 * Módulo child_process de Node.js
 * Permite ejecutar comandos del sistema operativo (npm install/uninstall)
 * @see https://nodejs.org/api/child_process.html
 */
const { execSync } = require('child_process');

/**
 * Módulo readline de Node.js
 * Proporciona interfaz para leer input del usuario línea por línea
 * @see https://nodejs.org/api/readline.html
 */
const readline = require('readline');

/**
 * Módulo fs (File System) de Node.js
 * Permite operaciones con el sistema de archivos (crear/eliminar directorios)
 * @see https://nodejs.org/api/fs.html
 */
const fs = require('fs');

/**
 * Módulo path de Node.js
 * Utilidades para trabajar con rutas de archivos y directorios
 * @see https://nodejs.org/api/path.html
 */
const path = require('path');

// =============================================================================
// CONFIGURACIÓN DE READLINE
// =============================================================================

/**
 * Interfaz de readline para interacción con el usuario
 * Configura stdin como entrada y stdout como salida
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// =============================================================================
// FUNCIONES UTILITARIAS
// =============================================================================

/**
 * Envuelve rl.question en una Promise para uso con async/await
 * Facilita el flujo asíncrono del programa
 *
 * @param {string} prompt - Texto a mostrar al usuario
 * @returns {Promise<string>} - Respuesta del usuario
 *
 * @example
 * const nombre = await question('¿Cuál es tu nombre? ');
 */
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

/**
 * Pausa la ejecución durante un tiempo determinado
 * Útil para implementar delays entre iteraciones
 *
 * @param {number} ms - Milisegundos a esperar
 * @returns {Promise<void>}
 *
 * @example
 * await sleep(5000); // Espera 5 segundos
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Genera un delay aleatorio dentro de un rango
 * Añade variabilidad a los tiempos entre iteraciones
 *
 * @param {number} minSeconds - Mínimo de segundos
 * @param {number} maxSeconds - Máximo de segundos
 * @returns {number} - Delay aleatorio en milisegundos
 *
 * @example
 * const delay = getRandomDelay(1, 5); // Entre 1000ms y 5000ms
 */
function getRandomDelay(minSeconds, maxSeconds) {
  const min = minSeconds * 1000;
  const max = maxSeconds * 1000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// =============================================================================
// FUNCIONES DE GESTIÓN DE PROXIES
// =============================================================================

/**
 * Carga la lista de proxies desde un archivo
 * Ignora líneas vacías y comentarios (líneas que empiezan con #)
 *
 * Formatos soportados:
 * - http://ip:puerto
 * - http://usuario:password@ip:puerto
 * - https://ip:puerto
 * - socks4://ip:puerto
 * - socks5://ip:puerto
 *
 * @param {string} filePath - Ruta al archivo de proxies
 * @returns {string[]} - Array de URLs de proxies
 *
 * @example
 * const proxies = loadProxies('./proxies.txt');
 * // Retorna: ['http://1.2.3.4:8080', 'socks5://5.6.7.8:1080']
 */
function loadProxies(filePath) {
  try {
    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return [];
    }

    // Leer y parsear el archivo
    const content = fs.readFileSync(filePath, 'utf-8');
    const proxies = content
      .split('\n')                              // Dividir por líneas
      .map(line => line.trim())                 // Eliminar espacios
      .filter(line => line && !line.startsWith('#')); // Ignorar vacías y comentarios

    return proxies;
  } catch (error) {
    console.log(`⚠️  Error cargando proxies: ${error.message}`);
    return [];
  }
}

/**
 * Verifica si un proxy está funcionando
 * Realiza un ping al registro de npm a través del proxy
 *
 * El test usa el comando 'npm ping' que verifica conectividad
 * con el registro oficial de npm (registry.npmjs.org)
 *
 * @param {string} proxy - URL del proxy a testear
 * @returns {boolean} - true si el proxy funciona, false si no
 *
 * @example
 * if (testProxy('http://1.2.3.4:8080')) {
 *   console.log('Proxy funcionando');
 * }
 */
function testProxy(proxy) {
  try {
    // Clonar variables de entorno actuales
    const env = { ...process.env };

    // Configurar variables de proxy según el tipo
    // SOCKS requiere ALL_PROXY, HTTP/HTTPS usan sus respectivas variables
    if (proxy.startsWith('socks://') || proxy.startsWith('socks5://') || proxy.startsWith('socks4://')) {
      env.ALL_PROXY = proxy;
    } else {
      env.HTTP_PROXY = proxy;
      env.HTTPS_PROXY = proxy;
    }

    // Ejecutar npm ping con timeout de 15 segundos
    execSync('npm ping', {
      env,
      stdio: 'pipe',      // Capturar output sin mostrarlo
      timeout: 15000      // 15 segundos máximo
    });

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Busca un proxy funcional en la lista
 * Implementa rotación circular y fallback automático
 *
 * Algoritmo:
 * 1. Comienza desde startIndex
 * 2. Prueba cada proxy que no haya sido testeado
 * 3. Si funciona, retorna el proxy y su índice
 * 4. Si falla, marca como testeado y continúa
 * 5. Si todos fallan, retorna null
 *
 * @param {string[]} proxies - Lista de proxies disponibles
 * @param {number} startIndex - Índice desde donde empezar a buscar
 * @param {Set<string>} testedProxies - Set de proxies ya probados (fallidos)
 * @returns {Object|null} - {proxy, index} si encuentra uno funcional, null si no
 *
 * @example
 * const tested = new Set();
 * const result = getWorkingProxy(proxies, 0, tested);
 * if (result) {
 *   console.log(`Usando: ${result.proxy}`);
 * }
 */
function getWorkingProxy(proxies, startIndex, testedProxies) {
  // Iterar sobre todos los proxies
  for (let i = 0; i < proxies.length; i++) {
    // Calcular índice con rotación circular
    const index = (startIndex + i) % proxies.length;
    const proxy = proxies[index];

    // Saltar proxies ya testeados (que fallaron)
    if (testedProxies.has(proxy)) {
      continue;
    }

    console.log(`  🔍 Probando proxy: ${proxy}`);

    // Testear el proxy
    if (testProxy(proxy)) {
      console.log(`  ✅ Proxy funcionando`);
      return { proxy, index };
    } else {
      console.log(`  ❌ Proxy no responde, probando siguiente...`);
      testedProxies.add(proxy); // Marcar como fallido
    }
  }

  // Ningún proxy funciona
  return null;
}

// =============================================================================
// FUNCIONES DE GESTIÓN DE DIRECTORIOS TEMPORALES
// =============================================================================

/**
 * Crea un directorio temporal aislado para una iteración
 * Cada iteración tiene su propio directorio para evitar conflictos
 *
 * Estructura creada:
 * temp_install_{iteration}_{timestamp}/
 * └── package.json (mínimo necesario para npm)
 *
 * @param {number} iteration - Número de iteración actual
 * @returns {string} - Ruta absoluta al directorio creado
 *
 * @example
 * const dir = createTempDir(1);
 * // Retorna: '/path/to/temp_install_1_1699999999999'
 */
function createTempDir(iteration) {
  // Generar nombre único con timestamp para evitar colisiones
  const tempDir = path.join(process.cwd(), `temp_install_${iteration}_${Date.now()}`);

  // Crear directorio (recursive: true crea padres si no existen)
  fs.mkdirSync(tempDir, { recursive: true });

  // Crear package.json mínimo requerido por npm
  // Sin este archivo, npm install fallaría
  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    JSON.stringify({ name: `temp-project-${iteration}`, version: '1.0.0' }, null, 2)
  );

  return tempDir;
}

/**
 * Elimina un directorio temporal y todo su contenido
 * Limpieza después de cada iteración para no dejar residuos
 *
 * @param {string} dirPath - Ruta al directorio a eliminar
 *
 * @example
 * removeTempDir('/path/to/temp_install_1_1699999999999');
 */
function removeTempDir(dirPath) {
  // recursive: true elimina contenido, force: true ignora errores si no existe
  fs.rmSync(dirPath, { recursive: true, force: true });
}

// =============================================================================
// FUNCIONES DE INSTALACIÓN/DESINSTALACIÓN
// =============================================================================

/**
 * Instala un paquete npm en un directorio específico
 * Opcionalmente usa un proxy para la conexión
 *
 * @param {string} packageName - Nombre del paquete a instalar
 * @param {string} tempDir - Directorio donde instalar
 * @param {string|null} proxy - URL del proxy (opcional)
 * @returns {Promise<boolean>} - true si la instalación fue exitosa
 *
 * @example
 * const success = await installPackage('lodash', '/tmp/test', 'http://proxy:8080');
 */
async function installPackage(packageName, tempDir, proxy = null) {
  try {
    console.log(`  📦 Instalando ${packageName}...`);

    // Preparar variables de entorno
    const env = { ...process.env };

    // Configurar proxy si se especificó
    if (proxy) {
      if (proxy.startsWith('socks://') || proxy.startsWith('socks5://') || proxy.startsWith('socks4://')) {
        env.ALL_PROXY = proxy;
      } else {
        env.HTTP_PROXY = proxy;
        env.HTTPS_PROXY = proxy;
      }
    }

    // Ejecutar npm install
    execSync(`npm install ${packageName}`, {
      cwd: tempDir,       // Directorio de trabajo
      env,                // Variables de entorno (incluye proxy)
      stdio: 'pipe',      // Capturar output
      timeout: 120000     // 2 minutos timeout
    });

    console.log(`  ✅ Instalado correctamente`);
    return true;
  } catch (error) {
    console.log(`  ❌ Error en instalación: ${error.message}`);
    return false;
  }
}

/**
 * Desinstala un paquete npm de un directorio específico
 * Opcionalmente usa un proxy para la conexión
 *
 * @param {string} packageName - Nombre del paquete a desinstalar
 * @param {string} tempDir - Directorio donde desinstalar
 * @param {string|null} proxy - URL del proxy (opcional)
 * @returns {Promise<boolean>} - true si la desinstalación fue exitosa
 *
 * @example
 * const success = await uninstallPackage('lodash', '/tmp/test', null);
 */
async function uninstallPackage(packageName, tempDir, proxy = null) {
  try {
    console.log(`  🗑️  Desinstalando ${packageName}...`);

    // Preparar variables de entorno
    const env = { ...process.env };

    // Configurar proxy si se especificó
    if (proxy) {
      if (proxy.startsWith('socks://') || proxy.startsWith('socks5://') || proxy.startsWith('socks4://')) {
        env.ALL_PROXY = proxy;
      } else {
        env.HTTP_PROXY = proxy;
        env.HTTPS_PROXY = proxy;
      }
    }

    // Ejecutar npm uninstall
    execSync(`npm uninstall ${packageName}`, {
      cwd: tempDir,       // Directorio de trabajo
      env,                // Variables de entorno
      stdio: 'pipe',      // Capturar output
      timeout: 60000      // 1 minuto timeout
    });

    console.log(`  ✅ Desinstalado correctamente`);
    return true;
  } catch (error) {
    console.log(`  ❌ Error en desinstalación: ${error.message}`);
    return false;
  }
}

// =============================================================================
// FUNCIONES DE PARSEO DE INPUT
// =============================================================================

/**
 * Parsea y limpia el nombre del paquete ingresado por el usuario
 * Acepta múltiples formatos de entrada para mayor flexibilidad
 *
 * Formatos aceptados:
 * - "lodash"                    → "lodash"
 * - "@scope/package"            → "@scope/package"
 * - "npm i lodash"              → "lodash"
 * - "npm install @scope/pkg"    → "@scope/pkg"
 * - "npm i express --save"      → "express"
 * - "npm install axios -D"      → "axios"
 *
 * @param {string} input - Input del usuario
 * @returns {string} - Nombre del paquete limpio
 *
 * @example
 * parsePackageName('npm i lodash --save'); // Retorna: 'lodash'
 * parsePackageName('@angular/core');        // Retorna: '@angular/core'
 */
function parsePackageName(input) {
  // Eliminar espacios al inicio y final
  let cleaned = input.trim();

  // Eliminar "npm i " o "npm install " del inicio (case insensitive)
  cleaned = cleaned.replace(/^npm\s+(i|install)\s+/i, '');

  // Eliminar flags comunes del final
  // -D, --save-dev: dependencia de desarrollo
  // -S, --save: dependencia de producción (default en npm 5+)
  // -g, --global: instalación global
  cleaned = cleaned.replace(/\s+(-D|--save-dev|-S|--save|-g|--global)$/i, '');

  return cleaned.trim();
}

// =============================================================================
// FUNCIÓN PRINCIPAL
// =============================================================================

/**
 * Función principal del programa
 * Orquesta todo el flujo: configuración, iteraciones y reporte final
 *
 * Flujo:
 * 1. Mostrar banner
 * 2. Cargar proxies (si existen)
 * 3. Solicitar parámetros al usuario
 * 4. Ejecutar ciclos de instalación/desinstalación
 * 5. Mostrar resumen final
 */
async function main() {
  // =========================================================================
  // BANNER INICIAL
  // =========================================================================
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          NPM-CYCLER v0.1               ║');
  console.log('║    Automatizador de Instalaciones      ║');
  console.log('║    github.com/686f6c61/npm-cycler      ║');
  console.log('╚════════════════════════════════════════╝\n');

  // =========================================================================
  // CARGA DE PROXIES
  // =========================================================================

  // Buscar archivo de proxies en el mismo directorio que el script
  const proxiesFile = path.join(__dirname, 'proxies.txt');
  const proxies = loadProxies(proxiesFile);

  // Informar al usuario sobre el estado de los proxies
  if (proxies.length > 0) {
    console.log(`📡 ${proxies.length} proxies cargados desde proxies.txt`);
  } else {
    console.log(`📡 No se encontró proxies.txt o está vacío`);
    console.log(`   Funcionando sin proxies (IP directa)\n`);
  }

  // =========================================================================
  // RECOLECCIÓN DE PARÁMETROS
  // =========================================================================

  // Solicitar nombre del paquete
  const rawInput = await question('📦 Paquete (ej: lodash, npm i express, @scope/pkg): ');
  const packageName = parsePackageName(rawInput);

  // Mostrar interpretación si se limpió el input
  if (packageName !== rawInput.trim()) {
    console.log(`   → Interpretado como: ${packageName}`);
  }

  // Validar que se ingresó un paquete
  if (!packageName.trim()) {
    console.log('❌ Debes especificar un nombre de paquete');
    rl.close();
    return;
  }

  // Solicitar número de iteraciones
  const iterations = parseInt(await question('🔢 Número de iteraciones: '), 10);

  // Validar iteraciones
  if (isNaN(iterations) || iterations < 1) {
    console.log('❌ Número de iteraciones inválido');
    rl.close();
    return;
  }

  // Solicitar delays (con valores por defecto)
  const minDelay = parseInt(await question('⏱️  Delay mínimo entre iteraciones (segundos): '), 10) || 1;
  const maxDelay = parseInt(await question('⏱️  Delay máximo entre iteraciones (segundos): '), 10) || 5;

  // Preguntar si usar proxies (solo si hay disponibles)
  let useProxies = false;
  if (proxies.length > 0) {
    const proxyAnswer = await question('🌐 ¿Usar proxies? (s/n): ');
    useProxies = proxyAnswer.toLowerCase() === 's' || proxyAnswer.toLowerCase() === 'si';
  }

  // Cerrar readline (no necesitamos más input)
  rl.close();

  // =========================================================================
  // RESUMEN DE CONFIGURACIÓN
  // =========================================================================

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 Configuración:`);
  console.log(`   Paquete: ${packageName}`);
  console.log(`   Iteraciones: ${iterations}`);
  console.log(`   Delay: ${minDelay}s - ${maxDelay}s`);
  console.log(`   Proxies: ${useProxies ? `Sí (${proxies.length} disponibles)` : 'No'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // =========================================================================
  // EJECUCIÓN DE ITERACIONES
  // =========================================================================

  // Contadores para el resumen final
  let successful = 0;
  let failed = 0;

  // Índice del proxy actual (para rotación)
  let proxyIndex = 0;

  // Flag para abortar si no hay proxies disponibles
  let noProxiesAvailable = false;

  // Bucle principal de iteraciones
  for (let i = 1; i <= iterations; i++) {
    console.log(`\n🔄 Iteración ${i}/${iterations}`);
    console.log('─'.repeat(30));

    // Variable para el proxy de esta iteración
    let currentProxy = null;

    // Obtener proxy funcional si está habilitado
    if (useProxies && !noProxiesAvailable) {
      // Set para trackear proxies fallidos en esta iteración
      const testedProxies = new Set();

      // Buscar un proxy funcional
      const result = getWorkingProxy(proxies, proxyIndex, testedProxies);

      if (result) {
        currentProxy = result.proxy;
        // Avanzar índice para la próxima iteración (rotación)
        proxyIndex = (result.index + 1) % proxies.length;
        console.log(`  🌐 Usando: ${currentProxy}`);
      } else {
        // Ningún proxy funciona - abortar
        console.log(`\n⚠️  ¡NINGÚN PROXY DISPONIBLE!`);
        console.log(`   Todos los proxies fallaron.`);
        console.log(`   Abortando ejecución...\n`);
        noProxiesAvailable = true;
        break;
      }
    }

    // Crear directorio temporal para esta iteración
    const tempDir = createTempDir(i);

    try {
      // Intentar instalar el paquete
      const installed = await installPackage(packageName, tempDir, currentProxy);

      if (installed) {
        // Si la instalación fue exitosa, desinstalar
        await uninstallPackage(packageName, tempDir, currentProxy);
        successful++;
      } else {
        failed++;
      }
    } finally {
      // SIEMPRE limpiar el directorio temporal (éxito o error)
      removeTempDir(tempDir);
      console.log(`  🧹 Directorio temporal eliminado`);
    }

    // Esperar antes de la siguiente iteración (excepto en la última)
    if (i < iterations) {
      const delay = getRandomDelay(minDelay, maxDelay);
      console.log(`  ⏳ Esperando ${(delay / 1000).toFixed(1)}s...`);
      await sleep(delay);
    }
  }

  // =========================================================================
  // RESUMEN FINAL
  // =========================================================================

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║              RESUMEN FINAL             ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  ✅ Exitosas:  ${String(successful).padStart(4)}                    ║`);
  console.log(`║  ❌ Fallidas:  ${String(failed).padStart(4)}                    ║`);
  console.log(`║  📊 Total:     ${String(iterations).padStart(4)}                    ║`);

  // Mostrar advertencia si se abortó por falta de proxies
  if (noProxiesAvailable) {
    console.log(`║  ⚠️  Abortado: Sin proxies disponibles  ║`);
  }

  console.log('╚════════════════════════════════════════╝\n');
}

// =============================================================================
// PUNTO DE ENTRADA
// =============================================================================

/**
 * Ejecutar la función principal
 * Capturar y mostrar errores no manejados
 */
main().catch(console.error);
