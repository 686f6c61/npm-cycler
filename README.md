# NPM-CYCLER

Herramienta CLI interactiva para automatizar ciclos de instalacion y desinstalacion de paquetes npm con soporte de rotacion de proxies.

## DESCRIPCION

npm-cycler ejecuta ciclos repetidos de `npm install` y `npm uninstall` sobre un paquete especificado. Permite configurar el numero de iteraciones, delays aleatorios entre ciclos y opcionalmente rotar entre multiples proxies HTTP/SOCKS.

## CARACTERISTICAS

- Instalacion/desinstalacion automatizada en ciclos
- Soporte para proxies HTTP, HTTPS y SOCKS4/5
- Rotacion automatica de proxies con fallback si uno falla
- Delays configurables (rango aleatorio) entre iteraciones
- Directorios temporales aislados por iteracion
- Parseo flexible del nombre del paquete (acepta `lodash`, `npm i lodash`, `@scope/pkg`)

## REQUISITOS

- Node.js >= 14.0.0
- npm

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

### FLUJO INTERACTIVO

1. Introduce el nombre del paquete
2. Indica el numero de iteraciones
3. Configura el delay minimo y maximo (segundos)
4. Elige si usar proxies (si hay disponibles)

### EJEMPLO

```
$ ./run.sh

NPM-CYCLER v0.1
github.com/686f6c61/npm-cycler

Paquete: lodash
Numero de iteraciones: 5
Delay minimo: 2
Delay maximo: 10
Usar proxies? (s/n): n
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
├── run.sh           # Lanzador bash
├── proxies.txt      # Lista de proxies
├── package.json     # Metadata del proyecto
└── README.md        # Documentacion
```

## AUTOR

- **686f6c61** - [github.com/686f6c61](https://github.com/686f6c61)

## LICENCIA

MIT License - ver el archivo del repositorio para mas detalles.

## VERSION

v0.1.0 - 26/11/2025
