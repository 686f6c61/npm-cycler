# NPM-CYCLER

Herramienta CLI interactiva para automatizar ciclos de instalacion y desinstalacion de paquetes npm con soporte de rotacion de proxies.

## DESCRIPCION

npm-cycler ejecuta ciclos repetidos de `npm install` y `npm uninstall` sobre un paquete especificado. Permite configurar el numero de iteraciones, delays aleatorios entre ciclos y opcionalmente rotar entre multiples proxies HTTP/SOCKS.

## CARACTERISTICAS

- Instalacion/desinstalacion automatizada en ciclos
- Soporte para proxies HTTP, HTTPS y SOCKS4/5
- Rotacion automatica de proxies con fallback si uno falla
- Test de proxies en paralelo (10 simultaneos) con filtrado automatico
- Delays configurables (rango aleatorio) entre iteraciones
- Directorios temporales aislados por iteracion
- Parseo flexible del nombre del paquete (acepta `lodash`, `npm i lodash`, `@scope/pkg`)

## CAPTURAS

### Test de proxies en paralelo

![Test de proxies](asssets/01%20test%20proxies.png)

### Ejecucion de npm-cycler

![npm-cycler en ejecucion](asssets/02%20npm%20cycler.png)

## REQUISITOS

- Node.js >= 14.0.0
- npm
- curl (para test de proxies)

## INSTALACION

```bash
git clone https://github.com/686f6c61/npm-cycler.git
cd npm-cycler
chmod +x run.sh
```

## USO

```bash
./run.sh
```

O directamente:

```bash
node npm-cycler.js
```

### TEST DE PROXIES

Puedes testear y filtrar proxies funcionales antes de usarlos:

```bash
./run.sh --test-proxies
./run.sh -t
```

O cuando inicias el script, te preguntara si quieres testear los proxies primero.

### FLUJO INTERACTIVO

1. El script pregunta si quieres testear los proxies (si hay disponibles)
2. Introduce el nombre del paquete
3. Indica el numero de iteraciones
4. Configura el delay minimo y maximo (segundos)
5. Elige si usar proxies

### EJEMPLO

```
$ ./run.sh

NPM-CYCLER v0.2
github.com/686f6c61/npm-cycler

Node.js v22.21.0 detectado
npm 11.6.2 detectado
100 proxies disponibles en proxies.txt

Testear proxies antes de continuar? (s/n): s

TEST DE PROXIES EN PARALELO

Testeando 100 proxies (10 en paralelo)...

proxies.txt actualizado con 23 proxies funcionales
```

## CONFIGURACION DE PROXIES

Edita el archivo `proxies.txt` y anade un proxy por linea:

```
http://ip:puerto
http://usuario:password@ip:puerto
socks5://ip:puerto
```

El script prueba cada proxy antes de usarlo. Si falla, pasa al siguiente. Si todos fallan, aborta la ejecucion.

## ESTRUCTURA DEL PROYECTO

```
npm-cycler/
├── npm-cycler.js    # Script principal
├── run.sh           # Lanzador bash con test de proxies
├── proxies.txt      # Lista de proxies
├── package.json     # Metadata del proyecto
├── asssets/         # Capturas de pantalla
└── README.md        # Documentacion
```

## AUTOR

- **686f6c61** - [github.com/686f6c61](https://github.com/686f6c61)

## LICENCIA

MIT License - ver el archivo del repositorio para mas detalles.

## VERSION

v0.2.0 - 26/11/2025

### CHANGELOG

- v0.2.0: Test de proxies en paralelo, pregunta interactiva para testear
- v0.1.0: Version inicial con ciclos y rotacion de proxies
