const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  parsePackageName,
  isValidPackageSpec,
  parseStrictInteger,
  getRandomDelay,
  loadProxies,
  buildEnvWithProxy,
  createTempDir,
  removeTempDir,
  runNpmCommand
} = require('../npm-cycler.js');

const CLI_PATH = path.resolve(__dirname, '..', 'npm-cycler.js');

function runCliWithInput(input) {
  return spawnSync(process.execPath, [CLI_PATH], {
    input,
    encoding: 'utf-8',
    timeout: 15000
  });
}

test('parsePackageName: package simple', () => {
  assert.equal(parsePackageName('lodash'), 'lodash');
});

test('parsePackageName: recorta espacios', () => {
  assert.equal(parsePackageName('   lodash   '), 'lodash');
});

test('parsePackageName: elimina prefijo npm i', () => {
  assert.equal(parsePackageName('npm i express'), 'express');
});

test('parsePackageName: elimina prefijo npm install', () => {
  assert.equal(parsePackageName('npm install axios'), 'axios');
});

test('parsePackageName: elimina flag -D', () => {
  assert.equal(parsePackageName('npm install @scope/pkg -D'), '@scope/pkg');
});

test('parsePackageName: elimina flag --save-dev', () => {
  assert.equal(parsePackageName('npm install vite --save-dev'), 'vite');
});

test('parsePackageName: elimina flag -S', () => {
  assert.equal(parsePackageName('npm i chalk -S'), 'chalk');
});

test('parsePackageName: elimina flag --save', () => {
  assert.equal(parsePackageName('npm i react --save'), 'react');
});

test('parsePackageName: elimina flag -g', () => {
  assert.equal(parsePackageName('npm i typescript -g'), 'typescript');
});

test('parsePackageName: elimina flag --global', () => {
  assert.equal(parsePackageName('npm install pnpm --global'), 'pnpm');
});

test('parsePackageName: mantiene scoped con version', () => {
  assert.equal(parsePackageName('npm i @scope/pkg@1.2.3'), '@scope/pkg@1.2.3');
});

test('isValidPackageSpec: acepta simple', () => {
  assert.equal(isValidPackageSpec('lodash'), true);
});

test('isValidPackageSpec: acepta scoped', () => {
  assert.equal(isValidPackageSpec('@scope/pkg'), true);
});

test('isValidPackageSpec: acepta version/range', () => {
  assert.equal(isValidPackageSpec('lodash@latest'), true);
  assert.equal(isValidPackageSpec('@scope/pkg@^1.2.0'), true);
});

test('isValidPackageSpec: rechaza vacío', () => {
  assert.equal(isValidPackageSpec(''), false);
});

test('isValidPackageSpec: rechaza espacios', () => {
  assert.equal(isValidPackageSpec('pkg name'), false);
});

test('isValidPackageSpec: rechaza ampersand', () => {
  assert.equal(isValidPackageSpec('lodash && touch /tmp/pwned'), false);
});

test('isValidPackageSpec: rechaza pipe', () => {
  assert.equal(isValidPackageSpec('lodash | cat'), false);
});

test('isValidPackageSpec: rechaza redirect', () => {
  assert.equal(isValidPackageSpec('lodash > out.txt'), false);
});

test('isValidPackageSpec: rechaza backticks', () => {
  assert.equal(isValidPackageSpec('lodash`id`'), false);
});

test('isValidPackageSpec: rechaza comando completo', () => {
  assert.equal(isValidPackageSpec('npm i lodash'), false);
});

test('isValidPackageSpec: rechaza traversal', () => {
  assert.equal(isValidPackageSpec('../lodash'), false);
});

test('parseStrictInteger: acepta cero', () => {
  assert.equal(parseStrictInteger('0'), 0);
});

test('parseStrictInteger: acepta enteros positivos', () => {
  assert.equal(parseStrictInteger('42'), 42);
});

test('parseStrictInteger: acepta enteros con padding', () => {
  assert.equal(parseStrictInteger('007'), 7);
});

test('parseStrictInteger: rechaza negativos', () => {
  assert.equal(Number.isNaN(parseStrictInteger('-1')), true);
});

test('parseStrictInteger: rechaza decimales', () => {
  assert.equal(Number.isNaN(parseStrictInteger('3.14')), true);
});

test('parseStrictInteger: rechaza texto', () => {
  assert.equal(Number.isNaN(parseStrictInteger('abc')), true);
});

test('parseStrictInteger: rechaza vacío', () => {
  assert.equal(Number.isNaN(parseStrictInteger('')), true);
});

test('getRandomDelay: min=max devuelve valor exacto', () => {
  assert.equal(getRandomDelay(2, 2), 2000);
});

test('getRandomDelay: siempre dentro del rango', () => {
  const minSeconds = 1;
  const maxSeconds = 3;
  for (let i = 0; i < 100; i++) {
    const delay = getRandomDelay(minSeconds, maxSeconds);
    assert.ok(delay >= 1000 && delay <= 3000);
  }
});

test('loadProxies: retorna [] si archivo no existe', () => {
  const missingPath = path.join(os.tmpdir(), `missing-${Date.now()}.txt`);
  assert.deepEqual(loadProxies(missingPath), []);
});

test('loadProxies: parsea ignorando comentarios y vacías', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-cycler-load-'));
  const filePath = path.join(tmpDir, 'proxies.txt');
  fs.writeFileSync(
    filePath,
    [
      '# comentario',
      '',
      '  http://1.2.3.4:80  ',
      'socks5://5.6.7.8:1080',
      '   ',
      '# otro comentario'
    ].join('\n')
  );

  assert.deepEqual(loadProxies(filePath), [
    'http://1.2.3.4:80',
    'socks5://5.6.7.8:1080'
  ]);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('loadProxies: retorna [] cuando readFile falla', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-cycler-load-'));
  const originalLog = console.log;
  console.log = () => {};
  try {
    assert.deepEqual(loadProxies(tmpDir), []);
  } finally {
    console.log = originalLog;
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('buildEnvWithProxy: http setea HTTP_PROXY y HTTPS_PROXY', () => {
  const proxy = 'http://10.0.0.1:8080';
  const env = buildEnvWithProxy(proxy);
  assert.equal(env.HTTP_PROXY, proxy);
  assert.equal(env.HTTPS_PROXY, proxy);
});

test('buildEnvWithProxy: socks setea ALL_PROXY', () => {
  const proxy = 'socks5://10.0.0.2:1080';
  const env = buildEnvWithProxy(proxy);
  assert.equal(env.ALL_PROXY, proxy);
});

test('buildEnvWithProxy: null no setea nuevas vars de proxy', () => {
  const env = buildEnvWithProxy(null);
  assert.notEqual(env, process.env);
  assert.equal(env.HTTP_PROXY, process.env.HTTP_PROXY);
  assert.equal(env.HTTPS_PROXY, process.env.HTTPS_PROXY);
  assert.equal(env.ALL_PROXY, process.env.ALL_PROXY);
});

test('createTempDir/removeTempDir: crea y elimina directorio temporal', () => {
  const originalCwd = process.cwd();
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-cycler-dir-'));
  process.chdir(tmpRoot);

  const dir = createTempDir(7);
  const packageJsonPath = path.join(dir, 'package.json');

  assert.equal(fs.existsSync(dir), true);
  assert.equal(fs.existsSync(packageJsonPath), true);

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  assert.equal(pkg.name, 'temp-project-7');
  assert.equal(pkg.version, '1.0.0');

  removeTempDir(dir);
  assert.equal(fs.existsSync(dir), false);

  process.chdir(originalCwd);
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

test('removeTempDir: no falla si no existe', () => {
  assert.doesNotThrow(() => {
    removeTempDir(path.join(os.tmpdir(), `npm-cycler-not-found-${Date.now()}`));
  });
});

test('runNpmCommand: npm --version ejecuta sin error', () => {
  const result = runNpmCommand(['--version'], { stdio: 'pipe' });
  assert.equal(result.status, 0);
  assert.ok((result.stdout || '').trim().length > 0);
});

test('runNpmCommand: comando inválido lanza error', () => {
  assert.throws(() => runNpmCommand(['definitely-not-a-real-npm-command'], { stdio: 'pipe' }));
});

test('CLI: paquete inválido corta flujo con mensaje', () => {
  const result = runCliWithInput('npm i lodash && touch /tmp/hacked\n');
  const output = `${result.stdout}\n${result.stderr}`;
  assert.match(output, /Formato de paquete inválido/);
});

test('CLI: paquete vacío corta flujo con mensaje', () => {
  const result = runCliWithInput('\n');
  const output = `${result.stdout}\n${result.stderr}`;
  assert.match(output, /Debes especificar un nombre de paquete/);
});

test('CLI: muestra interpretación cuando limpió comando npm i', () => {
  const result = runCliWithInput('npm i lodash\n');
  const output = `${result.stdout}\n${result.stderr}`;
  assert.match(output, /Interpretado como: lodash/);
});
