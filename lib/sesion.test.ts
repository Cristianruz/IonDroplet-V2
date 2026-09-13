// Pruebas de la sesión del lado del teléfono.
// Esto NO es el candado (ése está en el backend); es lo que decide cuándo
// mandar a /entrar sin esperar a que el backend conteste 401.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { expiraEn, sesionVigente, type Sesion } from './sesion.ts'

function base64url(objeto: object): string {
  return Buffer.from(JSON.stringify(objeto)).toString('base64url')
}

function tokenQueVence(enMs: number): string {
  const exp = Math.floor((Date.now() + enMs) / 1000)
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({ sub: 'a@b.com', exp })}.firma`
}

function sesion(token: string): Sesion {
  return { token, email: 'a@b.com', nombre: 'A', foto: null }
}

test('lee la fecha de vencimiento del token', () => {
  const token = tokenQueVence(3_600_000)
  const vence = expiraEn(token)
  assert.ok(vence !== null && Math.abs(vence - (Date.now() + 3_600_000)) < 2000)
})

test('un token mal formado no tiene fecha', () => {
  for (const malo of ['', 'uno.dos', 'a.b.c', `x.${base64url({ sin: 'exp' })}.y`, 'a.!!!.c']) {
    assert.equal(expiraEn(malo), null, malo)
  }
})

test('sin sesión, vencida o a punto de vencer: no está vigente', () => {
  assert.equal(sesionVigente(null), false)
  assert.equal(sesionVigente(sesion(tokenQueVence(-1000))), false)
  // Vence en 30 s: con el margen de un minuto ya se pide entrar de nuevo.
  assert.equal(sesionVigente(sesion(tokenQueVence(30_000))), false)
  assert.equal(sesionVigente(sesion('basura')), false)
})

test('un token con horas por delante está vigente', () => {
  assert.equal(sesionVigente(sesion(tokenQueVence(6 * 3_600_000))), true)
})
