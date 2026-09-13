// Una prueba que lee el código en vez de correrlo.
//
// Toda llamada al backend tiene que pasar por apiFetch, que es la que pone el
// token. Un fetch directo a la API funcionaba antes, pero ahora el backend lo
// rechaza con 401 y la pantalla se queda vacía sin decir por qué. Si alguien
// agrega uno, aquí se nota antes del pitch.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const RAIZ = join(import.meta.dirname, '..')
const CARPETAS = ['app', 'components', 'hooks', 'lib']

// Los únicos que pueden llamar a fetch contra la API, y por qué:
const PERMITIDOS: Record<string, string> = {
  'lib/api.ts': 'es apiFetch',
  'app/entrar/page.tsx': 'pide el token; todavía no hay sesión que mandar',
}

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap(nombre => {
    const ruta = join(carpeta, nombre)
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.(ts|tsx)$/.test(nombre) && !nombre.endsWith('.test.ts') ? [ruta] : []
  })
}

const fuentes = CARPETAS.flatMap(c => archivos(join(RAIZ, c))).map(ruta => ({
  ruta: relative(RAIZ, ruta).split(sep).join('/'),
  codigo: readFileSync(ruta, 'utf8'),
}))

test('ningún archivo llama a la API con fetch directo', () => {
  const culpables = fuentes
    .filter(f => !(f.ruta in PERMITIDOS))
    .filter(f => /(?<![A-Za-z])fetch\(/.test(f.codigo) && /API_URL|['"`]\/api\//.test(f.codigo))
    .map(f => f.ruta)
  assert.deepEqual(culpables, [], 'Usa apiFetch en lugar de fetch')
})

test('la pantalla de entrar solo llama a /api/auth/google', () => {
  const entrar = fuentes.find(f => f.ruta === 'app/entrar/page.tsx')
  assert.ok(entrar, 'falta app/entrar/page.tsx')
  const rutas = [...entrar.codigo.matchAll(/\/api\/[a-z/]+/g)].map(m => m[0])
  assert.deepEqual([...new Set(rutas)], ['/api/auth/google'])
})

test('no se inyecta HTML crudo más que el script fijo del tema', () => {
  const conHtml = fuentes.filter(f => f.codigo.includes('dangerouslySetInnerHTML')).map(f => f.ruta)
  assert.deepEqual(conHtml, ['app/layout.tsx'])
  const layout = fuentes.find(f => f.ruta === 'app/layout.tsx')!.codigo
  // Tiene que ser una constante del archivo, nunca algo que venga de datos.
  assert.match(layout, /dangerouslySetInnerHTML=\{\{ __html: TEMA_SIN_PARPADEO \}\}/)
})
