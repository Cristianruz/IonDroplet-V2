// Diorama 3D de parcela — IonDroplet
// Web component <parcela-diorama>. Sale del diseño "Parcela 3D" (Claude Design).
//
// three va empaquetado desde node_modules, no de un CDN: en el campo no hay
// internet. Este archivo se carga con import() dinámico sólo desde /parcela,
// así que Inicio no paga su peso.
//
// Todo lo que se pinta es DATO o se dice que falta:
//   - color de la tierra = humedad medida contra el punto de riego;
//   - plantas = etapa capturada (en gris si no la hay, no se inventa);
//   - agua = pumpState del aparato; partículas doradas = orden al ionizador;
//   - pulso del sensor = una lectura nueva (atributo "lectura"), no un bucle;
//   - tubería = tipo de sistema capturado; si falta, sólo la manguera madre.
import * as THREE from 'three';

const ETAPAS = ['siembra', 'crecimiento', 'floracion', 'fruto', 'cosecha', 'descanso'];

const COL = {
  secaTop: 0xcdae80, bienTop: 0x7d5c3c, mojTop: 0x4e3a28,
  secaLado: 0xb4946c, bienLado: 0x674b32, mojLado: 0x3e2d1e,
  grieta: 0x8a6c47, charco: 0x2e6d8f,
  tronco: 0x6d5439, hoja: 0x3d7a37, hojaClara: 0x51964a, hojaOtono: 0xb08a2a,
  amento: 0xc2cf86, nuezVerde: 0x7f9c45, nuezMadura: 0x8a6438,
  flor: 0xf4f1e3, chileVerde: 0x4f8f3a, chileRojo: 0xbe3a2b,
  manzanaRoja: 0xc4362c, manzanaVerde: 0x86a83f, florRosa: 0xf2d7de,
  tallo: 0x5d8c3a, espiga: 0xc9a84c, mazorca: 0xd8b63f, seco: 0xb59a4e,
  tubo: 0x33393d, agua: 0x2f9be0, metal: 0xa9b2b7,
  verde: 0x1f7a3d, palo: 0x98a1a6, apagado: 0x6d7a74, oro: 0xd6a533,
  gris: 0xa3aca7, piedra: 0x9c958a,
};

// ── Cielo y clima ─────────────────────────────────────────────────────────
// El cielo sale de la HORA del teléfono y del clima de ESTE momento que manda
// Open-Meteo (código WMO, lluvia en mm, viento en km/h). Nada se inventa: si
// no llegó el clima, queda un día despejado a la hora real.
//
// Tres paletas de tres paradas (arriba, en medio, horizonte) que se mezclan:
// despejado ↔ nublado según las nubes, un tinte cálido al amanecer y al
// atardecer, y la noche según qué tan arriba está el sol.
const PALETA = {
  dia:     [0x7cc4ec, 0xbfe3f5, 0xe9f4e6],
  nublado: [0x8f9fab, 0xb7c2c9, 0xd9dedb],
  ocaso:   [0x6a86b8, 0xf2b98c, 0xf8dcaa],
  noche:   [0x0e1a2e, 0x1f2f47, 0x34433e],
};
const AMANECER = 6.6, ANOCHECER = 19.3; // horas, Chihuahua en otoño

// Lo que dice el código WMO del clima de ahora.
function leerClima(codigo, mm, viento) {
  const c = Number.isFinite(codigo) ? codigo : -1;
  const llueveCodigo = (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95;
  const nubes = c < 0 ? (mm > 0.1 ? 1 : 0)
    : c === 0 ? 0 : c === 1 ? 0.2 : c === 2 ? 0.5 : c === 3 ? 0.85 : 1;
  // Intensidad 0..1: con milímetros manda el dato; sin ellos, el código dice
  // si es llovizna (51-57) o lluvia de verdad.
  const lluvia = mm > 0.1 ? clamp(0.18 + mm / 7, 0.18, 1)
    : llueveCodigo ? (c <= 57 ? 0.22 : 0.45) : 0;
  return {
    nubes, lluvia,
    niebla: c === 45 || c === 48,
    tormenta: c >= 95,
    viento: Number.isFinite(viento) ? Math.max(0, viento) : 6,
  };
}

// Qué tan arriba está el sol (grados) a una hora decimal; negativo de noche.
function alturaSol(hora) {
  if (hora >= AMANECER && hora <= ANOCHECER) {
    return 64 * Math.sin(Math.PI * (hora - AMANECER) / (ANOCHECER - AMANECER));
  }
  const fuera = hora < AMANECER ? AMANECER - hora : hora - ANOCHECER;
  return -15 * Math.min(fuera, 6);
}

const hex = c => '#' + c.getHexString();

function mezclaPaleta(nubes, ocaso, luz) {
  return [0, 1, 2].map(i => {
    const c = new THREE.Color(PALETA.dia[i]).lerp(new THREE.Color(PALETA.nublado[i]), nubes);
    c.lerp(new THREE.Color(PALETA.ocaso[i]), ocaso * 0.8 * (1 - nubes * 0.65));
    return new THREE.Color(PALETA.noche[i]).lerp(c, luz);
  });
}

// Estrellas: puntitos de CSS sobre el degradado; solo de noche y sin nubes.
const ESTRELLAS = [[12, 9], [27, 18], [41, 6], [58, 14], [72, 8], [86, 20], [19, 31], [64, 27], [93, 5], [50, 24], [8, 22], [35, 13]]
  .map(([x, y], i) => `radial-gradient(${i % 3 ? 1 : 1.6}px ${i % 3 ? 1 : 1.6}px at ${x}% ${y}%, rgba(255,255,255,ALFA), transparent)`)
  .join(',');

// ── Texturas pintadas en un canvas (sin descargar imágenes) ──
function texturaTerrones() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const x = cv.getContext('2d');
  x.fillStyle = 'rgb(236,234,230)'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    const v = 170 + Math.random() * 85, r = 0.5 + Math.random() * 2.2;
    x.fillStyle = `rgba(${v},${v * 0.97},${v * 0.92},${0.35 + Math.random() * 0.4})`;
    x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, r * 1.4, r, Math.random() * 3, 0, 7); x.fill();
  }
  // Terrones: manchas más oscuras, como tierra removida.
  for (let i = 0; i < 70; i++) {
    const v = 150 + Math.random() * 40;
    x.fillStyle = `rgba(${v},${v * 0.95},${v * 0.88},0.45)`;
    x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 5, 2 + Math.random() * 3, Math.random() * 3, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// El corte del suelo a los lados: capa de arriba más oscura y subsuelo con
// piedritas. Es dibujo, no medición: no dice hasta dónde llegó el agua.
function texturaCorte() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
  const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgb(200,196,190)'); g.addColorStop(0.32, 'rgb(212,208,201)');
  g.addColorStop(0.36, 'rgb(244,240,232)'); g.addColorStop(1, 'rgb(250,246,238)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 64);
  for (let i = 0; i < 90; i++) {
    const y = 26 + Math.random() * 38, v = 200 + Math.random() * 55;
    x.fillStyle = `rgba(${v},${v * 0.97},${v * 0.92},0.8)`;
    x.beginPath(); x.ellipse(Math.random() * 128, y, 0.8 + Math.random() * 1.8, 0.6 + Math.random(), 0, 0, 7); x.fill();
  }
  for (let i = 0; i < 6; i++) {
    x.strokeStyle = 'rgba(160,150,140,0.25)'; x.lineWidth = 0.6;
    const y = 30 + i * 6 + Math.random() * 3;
    x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(40, y + 2, 80, y - 2, 128, y + 1); x.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({
  color, roughness: o.roughness ?? 0.85, metalness: o.metalness ?? 0,
  flatShading: o.flat ?? false, transparent: o.transparent ?? false,
  opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide,
});

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeIO = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// Valor de una curva de 6 claves (una por etapa) en una etapa fraccionaria.
function curva(kf, s) {
  const i = clamp(Math.floor(s), 0, 5), j = clamp(i + 1, 0, 5);
  return lerp(kf[i], kf[j], s - i);
}

// ── Plantas ───────────────────────────────────────────────────────────────
// Cada planta: grupo con userData.partes = [{g, kf}] y userData.crec = [6].
// "kf" es la presencia de esa parte en cada etapa; se interpola y se aplica
// como escala, de ahí sale el morph brote → hoja → flor → fruto.

function parte(padre, kf) {
  const g = new THREE.Group();
  padre.add(g);
  padre.userData.partes.push({ g, kf });
  return g;
}

function esfera(r, material, seg = 1) {
  return new THREE.Mesh(new THREE.IcosahedronGeometry(r, seg), material);
}

function nogal(M) {
  const t = new THREE.Group();
  t.userData = { partes: [], follaje: [], crec: [0.40, 0.58, 0.86, 1.0, 1.0, 0.94] };

  const base = parte(t, [1, 1, 1, 1, 1, 1]);
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.17, 1.55, 8), M.tronco);
  tronco.position.y = 0.77; tronco.castShadow = true; base.add(tronco);
  [[0.5, 0.4], [-0.55, 1.9], [0.35, 3.1], [-0.4, 4.7]].forEach(([inc, rot], i) => {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 0.85, 6), M.tronco);
    r.position.set(0, 1.35 + i * 0.12, 0);
    r.rotation.set(0, rot, inc);
    r.translateY(0.42);
    base.add(r);
  });

  const plantula = parte(t, [1, 0.25, 0, 0, 0, 0]);
  [-1, 1].forEach(s => {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.24, 7, 5), M.hojaClara);
    h.scale.set(1, 0.32, 0.6);
    h.position.set(s * 0.22, 1.45, 0);
    h.rotation.z = s * 0.4;
    plantula.add(h);
  });

  const COPA = [[0, 2.12, 0, 0.62], [0.55, 1.86, 0.2, 0.48], [-0.52, 1.9, -0.18, 0.5],
                [0.18, 1.82, -0.55, 0.45], [-0.2, 1.84, 0.55, 0.44], [0, 2.42, 0.05, 0.38]];

  const hojas = parte(t, [0, 1, 1, 1, 0.35, 0]);
  COPA.forEach(([x, y, z, r], i) => {
    const m = esfera(r, i % 2 ? M.hoja : M.hojaClara);
    m.position.set(x, y, z); m.castShadow = true; hojas.add(m);
  });
  t.userData.follaje.push(hojas);

  const otono = parte(t, [0, 0, 0, 0, 1, 0]);
  COPA.forEach(([x, y, z, r]) => {
    const m = esfera(r * 0.93, M.otono);
    m.position.set(x, y, z); otono.add(m);
  });
  t.userData.follaje.push(otono);

  const amentos = parte(t, [0, 0, 1, 0.15, 0, 0]);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.025, 0.6, 5), M.amento);
    m.position.set(Math.cos(a) * 0.74, 1.5, Math.sin(a) * 0.64);
    m.rotation.z = Math.cos(a) * 0.25;
    amentos.add(m);
  }

  const verdes = parte(t, [0, 0, 0, 1, 0.3, 0]);
  const maduras = parte(t, [0, 0, 0, 0, 1, 0]);
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * Math.PI * 2 + 0.3, r = 0.55 + (i % 3) * 0.12;
    const p = [Math.cos(a) * r, 1.72 + (i % 4) * 0.16, Math.sin(a) * r * 0.9];
    const v = esfera(0.1, M.nuezVerde); v.position.set(...p); verdes.add(v);
    const n = esfera(0.1, M.nuezMadura); n.position.set(...p); maduras.add(n);
  }
  return t;
}

function chile(M) {
  const t = new THREE.Group();
  t.userData = { partes: [], follaje: [], crec: [0.20, 0.62, 0.88, 1.0, 1.0, 0.66] };

  const base = parte(t, [1, 1, 1, 1, 1, 1]);
  const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.62, 6), M.tallo);
  tallo.position.y = 0.31; tallo.castShadow = true; base.add(tallo);

  const hojas = parte(t, [0.35, 1, 1, 1, 0.9, 0.3]);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    const h = esfera(0.19 + (i % 2) * 0.05, i % 2 ? M.hoja : M.hojaClara);
    h.scale.set(1, 0.6, 1);
    h.position.set(Math.cos(a) * 0.2, 0.5 + (i % 3) * 0.12, Math.sin(a) * 0.2);
    h.castShadow = true; hojas.add(h);
  }
  t.userData.follaje.push(hojas);

  const FR = [[0.22, 0.52, 0.1], [-0.2, 0.46, -0.14], [0.05, 0.62, -0.22], [-0.12, 0.66, 0.2]];
  const flores = parte(t, [0, 0, 1, 0.2, 0, 0]);
  FR.forEach(p => { const f = esfera(0.065, M.flor, 0); f.position.set(...p); flores.add(f); });
  const cv = parte(t, [0, 0, 0, 1, 0.4, 0]);
  const cr = parte(t, [0, 0, 0, 0, 1, 0.22]);
  FR.forEach(p => {
    for (const [g, m] of [[cv, M.chileVerde], [cr, M.chileRojo]]) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.28, 6), m);
      c.position.set(p[0], p[1] - 0.14, p[2]); c.rotation.x = Math.PI; g.add(c);
    }
  });
  return t;
}

function maiz(M) {
  const t = new THREE.Group();
  t.userData = { partes: [], follaje: [], crec: [0.16, 0.56, 0.92, 1.0, 1.0, 0.45] };

  const base = parte(t, [1, 1, 1, 1, 1, 1]);
  const caña = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 1.5, 6), M.tallo);
  caña.position.y = 0.75; caña.castShadow = true; base.add(caña);

  const hojas = parte(t, [0.45, 1, 1, 1, 0.45, 0.12]);
  const secas = parte(t, [0, 0, 0, 0, 0.85, 0.6]);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + i * 0.4;
    for (const [g, m] of [[hojas, i % 2 ? M.hoja : M.hojaClara], [secas, M.seco]]) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.42, 7, 4), m);
      h.scale.set(0.28, 0.14, 1);
      h.position.set(Math.cos(a) * 0.3, 0.45 + i * 0.16, Math.sin(a) * 0.3);
      h.rotation.set(0, -a, 0.55);
      h.castShadow = true; g.add(h);
    }
  }
  t.userData.follaje.push(hojas, secas);

  const espiga = parte(t, [0, 0, 1, 1, 1, 0.25]);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const e = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.4, 5), M.espiga);
    e.position.set(Math.cos(a) * 0.09, 1.66, Math.sin(a) * 0.09);
    e.rotation.z = Math.cos(a) * 0.3; espiga.add(e);
  }
  const mz = parte(t, [0, 0, 0, 1, 1, 0]);
  [[0.13, 0.86, 0.05, 0.5], [-0.12, 1.06, -0.06, -0.5]].forEach(([x, y, z, r]) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.34, 7), M.mazorca);
    m.position.set(x, y, z); m.rotation.z = r; mz.add(m);
  });
  return t;
}

function manzano(M) {
  const t = new THREE.Group();
  t.userData = { partes: [], follaje: [], crec: [0.34, 0.56, 0.84, 1.0, 1.0, 0.92] };

  const base = parte(t, [1, 1, 1, 1, 1, 1]);
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 1.05, 8), M.tronco);
  tronco.position.y = 0.52; tronco.castShadow = true; base.add(tronco);
  [[0.62, 0.7], [-0.62, 2.4], [0.5, 4.0], [-0.5, 5.4]].forEach(([inc, rot], i) => {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.085, 0.8, 6), M.tronco);
    r.position.set(0, 0.98 + i * 0.1, 0);
    r.rotation.set(0, rot, inc);
    r.translateY(0.4);
    base.add(r);
  });

  const plantula = parte(t, [1, 0.2, 0, 0, 0, 0]);
  [-1, 1].forEach(s => {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), M.hojaClara);
    h.scale.set(1, 0.3, 0.62);
    h.position.set(s * 0.2, 1.02, 0);
    h.rotation.z = s * 0.45;
    plantula.add(h);
  });

  // Copa más baja y redonda que la del nogal: se distinguen de lejos.
  const COPA = [[0, 1.62, 0, 0.66], [0.6, 1.44, 0.16, 0.5], [-0.58, 1.46, -0.16, 0.52],
                [0.14, 1.42, -0.58, 0.47], [-0.16, 1.44, 0.58, 0.46]];

  const hojas = parte(t, [0, 1, 1, 1, 0.75, 0]);
  COPA.forEach(([x, y, z, r], i) => {
    const m = esfera(r, i % 2 ? M.hoja : M.hojaClara);
    m.position.set(x, y, z); m.castShadow = true; hojas.add(m);
  });
  t.userData.follaje.push(hojas);

  const otono = parte(t, [0, 0, 0, 0, 0.35, 0]);
  COPA.forEach(([x, y, z, r]) => {
    const m = esfera(r * 0.9, M.otono);
    m.position.set(x, y, z); otono.add(m);
  });
  t.userData.follaje.push(otono);

  const FRUTA = [];
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + 0.4, r = 0.5 + (i % 3) * 0.14;
    FRUTA.push([Math.cos(a) * r, 1.3 + (i % 4) * 0.17, Math.sin(a) * r * 0.9]);
  }

  const flores = parte(t, [0, 0, 1, 0.18, 0, 0]);
  FRUTA.forEach(p => {
    const f = esfera(0.085, M.florRosa, 0);
    f.position.set(...p); flores.add(f);
  });
  const verdes = parte(t, [0, 0, 0, 1, 0.25, 0]);
  const rojas = parte(t, [0, 0, 0, 0, 1, 0]);
  FRUTA.forEach(p => {
    const v = esfera(0.1, M.manzanaVerde); v.position.set(...p); verdes.add(v);
    const r = esfera(0.115, M.manzanaRoja); r.position.set(...p); rojas.add(r);
  });

  // En cosecha ya hay fruta en el suelo: detalle que cuenta la etapa.
  const caidas = parte(t, [0, 0, 0, 0, 1, 0.3]);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + 1.1;
    const m = esfera(0.1, M.manzanaRoja);
    m.position.set(Math.cos(a) * (0.7 + (i % 2) * 0.3), 0.09, Math.sin(a) * (0.6 + (i % 3) * 0.2));
    m.scale.y = 0.82;
    caidas.add(m);
  }
  return t;
}

function generico(M) {
  const t = new THREE.Group();
  t.userData = { partes: [], follaje: [], crec: [0.25, 0.6, 0.85, 1, 1, 0.55] };
  const base = parte(t, [1, 1, 1, 1, 1, 1]);
  const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.4, 6), M.tallo);
  tallo.position.y = 0.2; base.add(tallo);
  const hojas = parte(t, [0.4, 1, 1, 1, 0.85, 0.3]);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const h = esfera(0.2, i % 2 ? M.hoja : M.hojaClara);
    h.scale.set(1, 0.55, 1);
    h.position.set(Math.cos(a) * 0.18, 0.4 + (i % 2) * 0.1, Math.sin(a) * 0.18);
    h.castShadow = true; hojas.add(h);
  }
  t.userData.follaje.push(hojas);
  const fruto = parte(t, [0, 0, 0.5, 1, 1, 0]);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2;
    const f = esfera(0.07, M.nuezVerde);
    f.position.set(Math.cos(a) * 0.19, 0.46, Math.sin(a) * 0.19); fruto.add(f);
  }
  return t;
}

const CULTIVOS = {
  nogal:   { build: nogal,   hileras: 2, porHilera: 3, escala: 1.0 },
  chile:   { build: chile,   hileras: 4, porHilera: 7, escala: 1.0 },
  maiz:    { build: maiz,    hileras: 4, porHilera: 7, escala: 1.0 },
  alfalfa: { build: generico, hileras: 5, porHilera: 9, escala: 0.8 },
  manzana: { build: manzano, hileras: 3, porHilera: 4, escala: 0.95 },
  frijol:  { build: generico, hileras: 4, porHilera: 7, escala: 0.9 },
  avena:   { build: generico, hileras: 5, porHilera: 9, escala: 0.8 },
  algodon: { build: generico, hileras: 4, porHilera: 7, escala: 0.95 },
  otro:    { build: generico, hileras: 4, porHilera: 6, escala: 1.0 },
};

const SISTEMAS = ['goteo', 'aspersion', 'gravedad'];
// "Aspersión" o "aspersion", "Goteo"... Lo que no se reconoce es "no capturado".
function sistemaDe(v) {
  const t = String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return SISTEMAS.includes(t) ? t : '';
}

// Posiciones de las fichas vecinas en la vista de campo.
const XS_VECINAS = [-14.6, 14.6];

function coloresTierra(hum, umbral) {
  if (!Number.isFinite(hum)) return { top: 0x8d8a80, lado: 0x76736b };
  if (hum < umbral) return { top: COL.secaTop, lado: COL.secaLado };
  if (hum > 75) return { top: COL.mojTop, lado: COL.mojLado };
  return { top: COL.bienTop, lado: COL.bienLado };
}

// ── Componente ────────────────────────────────────────────────────────────

class ParcelaDiorama extends HTMLElement {
  static get observedAttributes() {
    return ['cultivo', 'etapa', 'preview', 'humedad', 'umbral', 'sistema', 'regando',
            'ionizando', 'clima', 'sensor', 'hileras', 'capturada', 'superficie',
            'modo', 'vecinas', 'lectura', 'codigo', 'lluvia', 'viento', 'hora'];
  }

  constructor() {
    super();
    this.est = {
      cultivo: 'nogal', etapa: 'floracion', preview: '', humedad: 34, umbral: 40,
      sistema: 'goteo', regando: 'no', ionizando: 'no', clima: 'soleado',
      sensor: 'activo', hileras: 0, capturada: 'si', superficie: 'si',
      modo: 'parcela', vecinas: '[]', lectura: '',
      // Clima de ESTE momento (Open-Meteo): código WMO, mm de lluvia, km/h.
      // "hora" solo existe para probar; sin ella manda el reloj del teléfono.
      codigo: '', lluvia: '', viento: '', hora: '',
    };
    // Lo que el agua deja: se acumula al llover o regar y se seca despacio.
    this.mojadoLluvia = 0; this.mojadoRiego = 0; this.avanceSurco = 0;
    this.rayo = 0; this.siguienteRayo = 3;
    this.visible = true;
    this.pulsoDesde = -99;
    this.tgtX = 0; this.tgtXObj = 0;
    this.sVis = 2; this.sObj = 2; this.tMorph = 1;
    this.az = -0.72; this.el = 0.62; this.zoom = 1;
    this.azObj = this.az; this.elObj = this.el; this.zoomObj = 1;
    this.reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  attributeChangedCallback(n, _o, v) {
    this.est[n] = v ?? '';
    if (!this.listo || !this.renderer) return;
    // La tubería sigue a las hileras: si cambian, se vuelve a tender.
    if (n === 'cultivo' || n === 'hileras') { this.sembrar(); this.riegoGeom(); }
    if (n === 'sistema') this.riegoGeom();
    if (n === 'vecinas') this.quitarVecinas();
    if (n === 'lectura' && v) this.pulsoDesde = this.t || 0;
    if (n === 'capturada') this.grisear();
    if (n === 'etapa' || n === 'preview') this.pedirEtapa();
    if (n === 'clima' || n === 'codigo' || n === 'lluvia' || n === 'viento' || n === 'hora') this.cielo();
    if (n === 'modo' || n === 'vecinas') this.aplicarModo();
    this.sucio = true;
    if (this.reducido) this.frame(0);
  }

  connectedCallback() {
    // React puede desmontar y volver a montar el mismo nodo (modo estricto en
    // desarrollo): al desconectarse se limpia todo y aquí se arranca de cero.
    if (this.listo) return;
    this.style.display = 'block';
    this.style.position = 'absolute';
    this.style.inset = '0';
    this.style.overflow = 'hidden';
    this.cielo();
    this.init();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this.ro?.disconnect();
    this.io?.disconnect();
    if (this._alCambiarVista) document.removeEventListener('visibilitychange', this._alCambiarVista);
    clearInterval(this._relojQuieto);
    this.scene?.traverse(o => { if (o.isMesh) o.geometry?.dispose(); });
    if (this.M) Object.values(this.M).forEach(m => { m.map?.dispose(); m.dispose?.(); });
    this.salpicones?.forEach(s => s.material.dispose());
    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.vecinas = null;
    this.campo = null;
    this.riego = null;
    this.listo = false;
    this.replaceChildren();
  }

  // Hora decimal de ahora (o la de prueba, si se pasó "hora").
  horaActual() {
    const h = parseFloat(this.est.hora);
    if (Number.isFinite(h)) return ((h % 24) + 24) % 24;
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }

  climaActual() {
    const E = this.est;
    const mm = parseFloat(E.lluvia), codigo = parseInt(E.codigo, 10), viento = parseFloat(E.viento);
    // Si solo llegó el atributo viejo "clima", se traduce a un código.
    if (!Number.isFinite(codigo) && !Number.isFinite(mm)) {
      return leerClima(E.clima === 'lluvia' ? 61 : E.clima === 'nublado' ? 3 : 0, 0, viento);
    }
    return leerClima(codigo, Number.isFinite(mm) ? mm : 0, viento);
  }

  // El cielo (degradado de CSS detrás del lienzo) y lo que necesitan las luces.
  cielo() {
    const hora = this.horaT = this.horaActual();
    const cl = this.cl = this.climaActual();
    const alt = this.altSol = alturaSol(hora);
    const luz = this.luz = clamp((alt + 6) / 14, 0, 1);
    const ocaso = clamp(1 - Math.abs(alt - 3) / 11, 0, 1);
    const nubes = this.nubesEf = Math.max(cl.nubes, cl.lluvia > 0 ? 0.9 : 0, cl.niebla ? 1 : 0);
    const [a, b, c] = mezclaPaleta(nubes, ocaso, luz);
    this.colorHorizonte = c;
    let fondo = `linear-gradient(175deg,${hex(a)} 0%,${hex(b)} 48%,${hex(c)} 100%)`;
    const estrellas = (1 - luz * 1.6) * (1 - nubes);
    if (estrellas > 0.05) fondo = ESTRELLAS.replaceAll('ALFA', (0.85 * estrellas).toFixed(2)) + ',' + fondo;
    this.style.background = fondo;
  }

  init() {
    let R;
    try { R = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch (e) { this.respaldo2D(); return; }
    if (!R || !R.getContext()) { this.respaldo2D(); return; }
    this.renderer = R;
    R.setPixelRatio(Math.min(1.75, devicePixelRatio || 1));
    R.shadowMap.enabled = true;
    // Sombras de orilla suave: con el sol bajo se alargan y no se ven cortadas.
    R.shadowMap.type = THREE.PCFSoftShadowMap;
    R.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
    this.appendChild(R.domElement);

    // El relámpago: una capa blanca encima que destella y se apaga.
    const destello = this.destello = document.createElement('div');
    destello.style.cssText = 'position:absolute;inset:0;background:#ffffff;opacity:0;pointer-events:none';
    this.appendChild(destello);

    const sc = this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-7, 7, 5, -5, 0.1, 100);

    const hemi = this.hemi = new THREE.HemisphereLight(0xdfefff, 0x6f5a3e, 1.5);
    sc.add(hemi);
    const sol = this.sol = new THREE.DirectionalLight(0xfff4de, 2.1);
    sol.position.set(6, 10, 5);
    sol.castShadow = true;
    const fino = (this.clientWidth || 360) > 520;
    sol.shadow.mapSize.set(fino ? 2048 : 1024, fino ? 2048 : 1024);
    sol.shadow.radius = 3;
    const d = 9;
    Object.assign(sol.shadow.camera, { left: -d, right: d, top: d, bottom: -d, near: 1, far: 40 });
    sol.shadow.bias = -0.0015;
    sc.add(sol);
    this.cielo();

    this.M = {
      tierraTop: mat(COL.bienTop, { roughness: 1 }),
      tierraLado: mat(COL.bienLado, { roughness: 1 }),
      bed: mat(COL.bienTop, { roughness: 1 }),
      grieta: mat(COL.grieta, { roughness: 1, transparent: true, opacity: 0 }),
      charco: mat(COL.charco, { roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0 }),
      tronco: mat(COL.tronco, { roughness: 0.95 }),
      hoja: mat(COL.hoja, { flat: true }), hojaClara: mat(COL.hojaClara, { flat: true }),
      otono: mat(COL.hojaOtono, { flat: true }), amento: mat(COL.amento),
      nuezVerde: mat(COL.nuezVerde, { flat: true }), nuezMadura: mat(COL.nuezMadura, { flat: true }),
      flor: mat(COL.flor), chileVerde: mat(COL.chileVerde, { flat: true }),
      chileRojo: mat(COL.chileRojo, { flat: true }), tallo: mat(COL.tallo),
      manzanaRoja: mat(COL.manzanaRoja, { flat: true }), manzanaVerde: mat(COL.manzanaVerde, { flat: true }),
      florRosa: mat(COL.florRosa),
      espiga: mat(COL.espiga), mazorca: mat(COL.mazorca, { flat: true }), seco: mat(COL.seco, { flat: true }),
      tubo: mat(COL.tubo, { roughness: 0.6 }),
      agua: mat(COL.agua, { roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.9 }),
      metal: mat(COL.metal, { roughness: 0.35, metalness: 0.6 }),
      verde: mat(COL.verde, { roughness: 0.6 }),
      palo: mat(COL.palo, { roughness: 0.5, metalness: 0.3 }),
      apagado: mat(COL.apagado), oro: mat(COL.oro, { roughness: 0.3, metalness: 0.5, transparent: true, opacity: 0.95 }),
      gris: mat(COL.gris, { transparent: true, opacity: 0.42 }),
      piedra: mat(COL.piedra, { flat: true }),
      pulso: new THREE.MeshBasicMaterial({ color: COL.verde, transparent: true, opacity: 0 }),
      // Pasto seco de la orilla (cada mata trae su propio tono).
      pasto: mat(0xffffff, { flat: true, roughness: 0.9 }),
      // La mancha de tierra mojada bajo cada gotero: más oscura y con brillo.
      mancha: mat(0x2c2017, { roughness: 0.35, transparent: true, opacity: 0 }),
      surcoAgua: mat(COL.agua, { roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0 }),
      lluvia: new THREE.MeshBasicMaterial({ color: 0xd9e8f3, transparent: true, opacity: 0.55, depthWrite: false }),
      ledOn: new THREE.MeshBasicMaterial({ color: 0x5cff9a }),
      ledOff: new THREE.MeshBasicMaterial({ color: 0x55605a }),
      sombraNube: new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
    };
    this.M.mancha.depthWrite = false;
    this.M.mancha.polygonOffset = true;
    this.M.mancha.polygonOffsetFactor = -2;
    // Terrones arriba y el corte del suelo a los lados: dibujo, no dato. El
    // color que los tiñe sigue siendo la humedad medida.
    const terrones = texturaTerrones();
    this.M.tierraTop.map = terrones;
    this.M.tierraTop.map.repeat.set(5, 3.4);
    const camaTex = terrones.clone();
    camaTex.repeat.set(9, 0.9); camaTex.needsUpdate = true;
    this.M.bed.map = camaTex;
    const corte = texturaCorte();
    corte.repeat.set(7, 1);
    this.M.tierraLado.map = corte;

    this.terreno();
    this.equipo();
    this.sembrar();
    this.riegoGeom();
    this.pedirEtapa();
    this.aplicarModo();
    this.sVis = this.sObj;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this);
    this.resize();
    this.orbita();
    this.listo = true;

    if (this.reducido) {
      this.frame(0);
      // Sin animación, el cielo igual sigue a la hora: se redibuja cada minuto.
      this._relojQuieto = setInterval(() => { this.cielo(); this.frame(0); }, 60000);
    } else {
      // Fuera de pantalla o con la pestaña oculta no se dibuja nada: el
      // celular no gasta batería en una escena que nadie ve.
      this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.ritmo(); });
      this.io.observe(this);
      this._alCambiarVista = () => this.ritmo();
      document.addEventListener('visibilitychange', this._alCambiarVista);
      this.ritmo();
    }
  }

  // Arranca o detiene el ciclo de dibujo según si alguien ve la escena.
  ritmo() {
    const ver = this.visible && !document.hidden && !!this.renderer;
    if (ver && !this._raf) {
      let prev = performance.now();
      const loop = t => {
        this._raf = requestAnimationFrame(loop);
        const dt = Math.min(0.05, (t - prev) / 1000); prev = t;
        this.frame(dt);
      };
      this._raf = requestAnimationFrame(loop);
    } else if (!ver && this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }

  // ── Vista de campo: las parcelas vecinas como fichas 3D ──
  // Se construyen la primera vez que se pide el mapa: la pantalla de una
  // sola parcela no paga ese costo.
  // "vecinas" es JSON: [{ cultivo, etapa, humedad, umbral }], hasta dos.
  // La tierra de cada ficha lleva el color de SU humedad medida; sin lectura
  // va en gris. Sin etapa capturada sus plantas también van en gris.
  datosVecinas() {
    try {
      const l = JSON.parse(this.est.vecinas || '[]');
      return Array.isArray(l) ? l.slice(0, XS_VECINAS.length) : [];
    } catch { return []; }
  }

  quitarVecinas() {
    if (!this.scene) return;
    if (this.vecinas) {
      this.scene.remove(this.vecinas);
      this.vecinas.traverse(o => { if (o.isMesh) o.geometry?.dispose(); });
      this.vecinas = null;
    }
    this.aplicarModo();
  }

  crearVecinas() {
    if (this.vecinas) return;
    const g = this.vecinas = new THREE.Group();
    this.scene.add(g);
    this.datosVecinas().forEach((d, i) => {
      const p = new THREE.Group();
      p.position.x = XS_VECINAS[i]; p.userData.idx = i;
      const hum = d.humedad === null || d.humedad === undefined ? NaN : Number(d.humedad);
      const tono = coloresTierra(hum, Number(d.umbral) || 40);
      const mt = mat(tono.top, { roughness: 1 }), ml = mat(tono.lado, { roughness: 1 });
      const caja = new THREE.Mesh(new THREE.BoxGeometry(this.W, 0.62, this.D), [ml, ml, mt, ml, ml, ml]);
      caja.position.y = -0.31; caja.receiveShadow = true; p.add(caja);
      const orilla = new THREE.Mesh(new THREE.BoxGeometry(this.W + 0.5, 0.1, this.D + 0.5), this.M.piedra);
      orilla.position.y = -0.67; p.add(orilla);

      const c = CULTIVOS[d.cultivo] || CULTIVOS.otro;
      const iEtapa = ETAPAS.indexOf(String(d.etapa || '').toLowerCase());
      const s = iEtapa < 0 ? 2 : iEtapa;
      const hil = 3, por = 4, paso = this.D / (hil + 0.6);
      for (let r = 0; r < hil; r++) {
        const z = (r - (hil - 1) / 2) * paso;
        for (let j = 0; j < por; j++) {
          const x = (j - (por - 1) / 2) * ((this.W - 2.2) / (por - 1));
          const pl = c.build(this.M);
          pl.position.set(x, 0.02, z);
          pl.scale.setScalar(curva(pl.userData.crec, s) * c.escala);
          pl.userData.partes.forEach(({ g: pg, kf }) => {
            const v = curva(kf, s); pg.visible = v > 0.015; pg.scale.setScalar(v);
          });
          if (iEtapa < 0) pl.traverse(o => { if (o.isMesh) { o.material = this.M.gris; o.castShadow = false; } });
          p.add(pl);
        }
      }
      g.add(p);
    });
  }

  aplicarModo() {
    if (!this.renderer) return;
    const mapa = this.est.modo === 'mapa';
    const n = this.datosVecinas().length;
    if (mapa && n > 0) this.crearVecinas();
    if (this.vecinas) this.vecinas.visible = mapa && n > 0;
    this.tgtXObj = 0;
    this.fitW = (mapa && n > 0 ? 20.8 : this.W / 2 + 0.6);
    if (this.reducido) { this.tgtX = 0; this.frame(0); }
  }

  // Zoom animado a una parcela: -2 = todo el campo, -1 = la mía, 0/1 = vecinas.
  enfocar(i) {
    if (!this.renderer) return;
    if (i === -2) { this.tgtXObj = 0; this.fitW = this.datosVecinas().length > 0 ? 20.8 : this.W / 2 + 0.6; }
    else { this.tgtXObj = i < 0 ? 0 : (XS_VECINAS[i] ?? 0); this.fitW = this.W / 2 + 0.6; }
    if (this.reducido) { this.tgtX = this.tgtXObj; this.frame(0); }
  }

  // Respaldo para equipos sin WebGL: l\u00e1mina isom\u00e9trica plana, hecha con
  // transformaciones CSS. No anima nada y dice lo que es.
  respaldo2D() {
    this.listo = true;
    const hum = parseFloat(this.est.humedad), umbral = parseFloat(this.est.umbral) || 40;
    const tono = !Number.isFinite(hum) ? '#8d8a80' : hum < umbral ? '#c2a173' : hum > 75 ? '#4e3a28' : '#7d5c3c';
    this.replaceChildren();
    const cont = document.createElement('div');
    cont.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center';
    const plato = document.createElement('div');
    plato.style.cssText = 'width:62%;aspect-ratio:3/2;background:' + tono +
      ';transform:rotateX(58deg) rotateZ(-38deg);box-shadow:0 26px 40px rgba(19,40,61,.35);' +
      'display:grid;grid-template-rows:repeat(4,1fr);gap:6%;padding:8%;box-sizing:border-box';
    for (let i = 0; i < 4; i++) {
      const h = document.createElement('div');
      h.style.cssText = 'background:rgba(19,40,61,.16);border-radius:4px;';
      plato.appendChild(h);
    }
    const nota = document.createElement('p');
    nota.textContent = 'Vista fija: este equipo no puede dibujar la parcela en 3D.';
    nota.style.cssText = 'position:absolute;left:12px;right:12px;bottom:10px;margin:0;font:600 12.5px system-ui,sans-serif;color:#13283d;background:rgba(255,255,255,.92);border-radius:14px;padding:8px 10px;text-align:center';
    cont.appendChild(plato);
    this.appendChild(cont);
    this.appendChild(nota);
  }

  // Terreno, camas de siembra y textura de humedad (grietas / charcos).
  terreno() {
    const g = this.suelo = new THREE.Group();
    this.scene.add(g);

    const W = 11.4, D = 7.8, H = 0.62;
    const caja = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [
      this.M.tierraLado, this.M.tierraLado, this.M.tierraTop,
      this.M.tierraLado, this.M.tierraLado, this.M.tierraLado,
    ]);
    caja.position.y = -H / 2;
    caja.receiveShadow = true;
    g.add(caja);

    // Orilla de pasto seco: da escala de juguete sin pretender ser un dato.
    const orilla = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.1, D + 0.5), this.M.piedra);
    orilla.position.y = -H - 0.05; g.add(orilla);

    this.grietas = new THREE.Group(); g.add(this.grietas);
    for (let i = 0; i < 30; i++) {
      const l = 0.5 + Math.random() * 1.5;
      const m = new THREE.Mesh(new THREE.BoxGeometry(l, 0.02, 0.035), this.M.grieta);
      m.position.set((Math.random() - 0.5) * (W - 1), 0.012, (Math.random() - 0.5) * (D - 1));
      m.rotation.y = Math.random() * Math.PI;
      this.grietas.add(m);
    }
    this.charcos = new THREE.Group(); g.add(this.charcos);
    for (let i = 0; i < 9; i++) {
      const r = 0.3 + Math.random() * 0.5;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 12), this.M.charco);
      m.position.set((Math.random() - 0.5) * (W - 1.6), 0.014, (Math.random() - 0.5) * (D - 1.6));
      m.scale.z = 0.7;
      this.charcos.add(m);
    }
    this.W = W; this.D = D;

    // La orilla viva: matas de pasto seco y piedritas alrededor de la base.
    // Un solo dibujo para todas (InstancedMesh): cuestan casi nada.
    const puntoOrilla = () => {
      const P = 2 * (W + D);
      let s = Math.random() * P;
      const fuera = 0.04 + Math.random() * 0.2;
      if (s < W) return [s - W / 2, D / 2 + fuera];
      s -= W; if (s < D) return [W / 2 + fuera, s - D / 2];
      s -= D; if (s < W) return [W / 2 - s, -D / 2 - fuera];
      s -= W; return [-W / 2 - fuera, D / 2 - s];
    };
    const mata = new THREE.ConeGeometry(0.05, 0.26, 4); mata.translate(0, 0.13, 0);
    const N_MATAS = 170;
    const matas = this.matas = new THREE.InstancedMesh(mata, this.M.pasto, N_MATAS);
    this.matasBase = [];
    const tono = new THREE.Color();
    for (let i = 0; i < N_MATAS; i++) {
      const [x, z] = puntoOrilla();
      this.matasBase.push({ x, z, esc: 0.6 + Math.random() * 0.8, giro: Math.random() * 3, fase: Math.random() * 6 });
      tono.setHSL(0.17 + Math.random() * 0.06, 0.32 + Math.random() * 0.15, 0.36 + Math.random() * 0.14);
      matas.setColorAt(i, tono);
    }
    matas.castShadow = true;
    g.add(matas);
    this.moverMatas(0, 0);

    const piedra = new THREE.IcosahedronGeometry(0.07, 0);
    const piedras = new THREE.InstancedMesh(piedra, this.M.piedra, 44);
    const o = new THREE.Object3D();
    for (let i = 0; i < 44; i++) {
      const [x, z] = puntoOrilla();
      o.position.set(x, -0.6, z);
      o.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      const e = 0.6 + Math.random() * 1.1; o.scale.set(e * 1.3, e * 0.6, e);
      o.updateMatrix(); piedras.setMatrixAt(i, o.matrix);
    }
    piedras.receiveShadow = true;
    g.add(piedras);
  }

  // El pasto se mece con el viento real (km/h); sin animación queda quieto.
  moverMatas(t, viento) {
    if (!this.matas) return;
    const o = this._o ||= new THREE.Object3D();
    const amp = 0.05 + viento * 0.006;
    this.matasBase.forEach((m, i) => {
      o.position.set(m.x, -0.62, m.z);
      const balanceo = this.reducido ? 0 : Math.sin(t * (1.1 + viento * 0.05) + m.fase) * amp;
      o.rotation.set(balanceo * 0.4, m.giro, balanceo);
      o.scale.set(m.esc, m.esc * (0.8 + (i % 5) * 0.12), m.esc);
      o.updateMatrix(); this.matas.setMatrixAt(i, o.matrix);
    });
    this.matas.instanceMatrix.needsUpdate = true;
  }

  cfg() {
    const c = CULTIVOS[this.est.cultivo] || CULTIVOS.otro;
    const pedidas = parseInt(this.est.hileras, 10);
    const hil = pedidas > 0 ? clamp(pedidas, 1, c.hileras + 3) : c.hileras;
    return { ...c, hileras: c.build === nogal ? Math.min(hil, 3) : hil };
  }

  // Camas + plantas.
  sembrar() {
    if (this.campo) { this.scene.remove(this.campo); }
    const c = this.cfg();
    const campo = this.campo = new THREE.Group();
    this.scene.add(campo);
    this.plantas = [];

    const zs = [];
    const paso = this.D / (c.hileras + 0.6);
    for (let i = 0; i < c.hileras; i++) zs.push((i - (c.hileras - 1) / 2) * paso);
    this.zs = zs;

    const camas = this.camas = new THREE.Group(); campo.add(camas);
    zs.forEach(z => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(this.W - 0.9, 0.16, paso * 0.52), this.M.bed);
      b.position.set(0, 0.08, z); b.receiveShadow = true; b.castShadow = true;
      camas.add(b);
    });

    zs.forEach(z => {
      for (let i = 0; i < c.porHilera; i++) {
        const x = (i - (c.porHilera - 1) / 2) * ((this.W - 1.6) / Math.max(1, c.porHilera - 1));
        const p = c.build(this.M);
        p.position.set(x, 0.16, z);
        p.rotation.y = (Math.random() - 0.5) * 0.7;
        p.userData.esc = c.escala * (0.92 + Math.random() * 0.16);
        campo.add(p);
        this.plantas.push(p);
      }
    });
    this.grisear();
  }

  grisear() {
    const gris = this.est.capturada === 'no';
    this.plantas.forEach(p => p.traverse(o => {
      if (!o.isMesh) return;
      if (gris) { o.userData.m0 ||= o.material; o.material = this.M.gris; o.castShadow = false; }
      else if (o.userData.m0) { o.material = o.userData.m0; o.castShadow = true; }
    }));
  }

  // Bomba, tubería madre, sensor, ionizador.
  equipo() {
    const g = this.eq = new THREE.Group();
    this.scene.add(g);

    const bomba = new THREE.Group();
    bomba.position.set(-6.1, 0, 3.0);
    const losa = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 1.1), this.M.piedra);
    losa.position.y = 0.06; bomba.add(losa);
    const caja = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.6, 0.7), this.M.verde);
    caja.position.y = 0.42; caja.castShadow = true; bomba.add(caja);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 12), this.M.metal);
    motor.rotation.z = Math.PI / 2; motor.position.set(0.1, 0.78, 0); motor.castShadow = true; bomba.add(motor);
    const luz = this.luzBomba = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6),
      new THREE.MeshBasicMaterial({ color: COL.apagado }));
    luz.position.set(-0.36, 0.56, 0.36); bomba.add(luz);
    g.add(bomba);

    // Manguera madre: de la bomba al borde del campo.
    const madre = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 6.4, 8), this.M.tubo);
    madre.rotation.x = Math.PI / 2;
    madre.position.set(-5.35, 0.24, 0.1);
    g.add(madre);
    const codo = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.9, 8), this.M.tubo);
    codo.rotation.z = Math.PI / 2; codo.position.set(-5.75, 0.24, 2.9); g.add(codo);
    this.madreY = 0.24; this.madreX = -5.35;

    // Sensor clavado en la tierra.
    const s = this.sensorG = new THREE.Group();
    s.position.set(-2.2, 0, 0.2);
    const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.85, 6), this.M.palo);
    palo.position.y = 0.42; s.add(palo);
    const cab = this.sensorCab = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.14), this.M.verde);
    cab.position.y = 0.94; cab.castShadow = true; s.add(cab);
    const ring = this.pulso = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 20), this.M.pulso);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; s.add(ring);
    // El foquito del sensor: encendido mientras manda lecturas. De noche es
    // lo único que brilla en el campo.
    const led = this.ledSensor = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), this.M.ledOn);
    led.position.set(0.09, 0.98, 0.075); s.add(led);
    g.add(s);

    // Partículas de ionización (orden enviada, no confirmación).
    this.ion = new THREE.Group(); g.add(this.ion);
    this.ionP = [];
    for (let i = 0; i < 16; i++) {
      const m = esfera(0.055, this.M.oro, 0);
      m.userData.t = Math.random();
      m.userData.x = -5.35 + (Math.random() - 0.5) * 0.5;
      m.userData.z = (Math.random() - 0.5) * 5.6;
      this.ion.add(m); this.ionP.push(m);
    }
    this.ion.visible = false;

    // Lluvia: cientos de hilos en un solo dibujo. Cuántos caen depende de
    // los milímetros de ahora; la inclinación, del viento.
    this.N_LLUVIA = 520;
    const hilo = new THREE.CylinderGeometry(0.0075, 0.0075, 0.5, 3);
    const lluvia = this.lluviaIM = new THREE.InstancedMesh(hilo, this.M.lluvia, this.N_LLUVIA);
    lluvia.frustumCulled = false;
    lluvia.count = 0;
    this.scene.add(lluvia);
    this.gotasLl = Array.from({ length: this.N_LLUVIA }, () => ({
      x: (Math.random() - 0.5) * 14, y: Math.random() * 8.5, z: (Math.random() - 0.5) * 9.4,
      v: 10.5 + Math.random() * 4,
    }));

    // Salpicones: un anillo que se abre y se borra donde cae una gota (de la
    // lluvia o del gotero).
    this.salpicones = [];
    const aro = new THREE.RingGeometry(0.03, 0.045, 14);
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(aro, new THREE.MeshBasicMaterial({ color: 0xeaf4fb, transparent: true, opacity: 0, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.visible = false; m.userData.vida = 1;
      this.scene.add(m); this.salpicones.push(m);
    }

    // Sombras de nubes que cruzan el campo con el viento. Las nubes no se
    // dibujan (taparían la vista): solo proyectan su sombra.
    this.nubesG = new THREE.Group(); this.scene.add(this.nubesG);
    const bola = new THREE.SphereGeometry(1, 10, 7);
    for (let i = 0; i < 7; i++) {
      const n = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const b = new THREE.Mesh(bola, this.M.sombraNube);
        b.scale.set(1.3 + Math.random() * 0.9, 0.3, 0.9 + Math.random() * 0.6);
        b.position.set((j - 1.5) * 1.2, Math.random() * 0.25, (Math.random() - 0.5) * 1.1);
        b.castShadow = true; n.add(b);
      }
      n.position.set(-17 + i * 5.3 + Math.random() * 2, 6.2, (Math.random() - 0.5) * 9);
      n.userData.vel = 0.7 + Math.random() * 0.5;
      this.nubesG.add(n);
    }
  }

  // Altura de la tierra donde cae algo: arriba de una cama o entre camas.
  alturaSuelo(z) {
    const medio = (this.D / ((this.zs?.length || 1) + 0.6)) * 0.26;
    return (this.zs || []).some(zc => Math.abs(z - zc) < medio) ? 0.165 : 0.006;
  }

  salpicar(x, y, z, tam = 1) {
    const s = this.salpicones.find(m => m.userData.vida >= 1);
    if (!s) return;
    s.position.set(x, y + 0.004, z);
    s.userData.vida = 0; s.userData.tam = tam;
    s.visible = true;
  }

  // Tubería / aspersores / surcos según el sistema de riego.
  riegoGeom() {
    if (this.riego) this.scene.remove(this.riego);
    const g = this.riego = new THREE.Group();
    this.scene.add(g);
    this.emisores = []; this.gotas = []; this.flujo = []; this.surcos = []; this.manchas = []; this.cabezas = [];
    const sis = sistemaDe(this.est.sistema);
    const zs = this.zs || [0];

    if (sis === 'goteo' || sis === 'aspersion') {
      zs.forEach(z => {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, this.W - 0.9, 6), this.M.tubo);
        t.rotation.z = Math.PI / 2; t.position.set(0, 0.28, z); g.add(t);
      });
    }

    if (sis === 'goteo') {
      const disco = new THREE.CircleGeometry(0.46, 22);
      zs.forEach(z => {
        for (let i = 0; i < 6; i++) {
          const x = -4.4 + i * 1.76;
          const e = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.1, 6), this.M.metal);
          e.position.set(x, 0.22, z); g.add(e);
          this.emisores.push([x, 0.2, z]);
          // La mancha de tierra mojada que crece bajo el gotero mientras riega.
          const m = new THREE.Mesh(disco, this.M.mancha);
          m.rotation.x = -Math.PI / 2; m.position.set(x, 0.1615, z);
          m.scale.set(1, 0.72, 1); m.visible = false;
          g.add(m); this.manchas.push(m);
        }
      });
      // Una gota por gotero (y algunas de más, desfasadas): se hincha en la
      // boquilla, cae y salpica.
      const n = Math.max(1, this.emisores.length) * 2;
      for (let i = 0; i < Math.min(48, n); i++) {
        const m = esfera(0.045, this.M.agua, 1);
        m.visible = false; m.userData.t = Math.random(); g.add(m); this.gotas.push(m);
      }
    } else if (sis === 'aspersion') {
      zs.forEach(z => {
        for (let i = 0; i < 3; i++) {
          const x = -3.4 + i * 3.4;
          const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.8, 6), this.M.palo);
          p.position.set(x, 0.62, z); g.add(p);
          // Cabeza de aspersor de impacto: gira mientras riega.
          const c = new THREE.Group(); c.position.set(x, 1.02, z);
          c.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), this.M.metal));
          const brazo = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 5), this.M.metal);
          brazo.rotation.z = Math.PI / 2 - 0.35; brazo.position.set(0.11, 0.04, 0); c.add(brazo);
          g.add(c); this.cabezas.push(c);
          this.emisores.push([x, 1.02, z]);
        }
      });
      for (let i = 0; i < 90; i++) {
        const m = esfera(0.038, this.M.agua, 0);
        m.visible = false;
        m.userData = { t: Math.random(), chorro: i % 3, d: Math.random() };
        g.add(m); this.gotas.push(m);
      }
    } else if (sis === 'gravedad') { // lámina de agua que avanza por el surco
      this.surcos = [];
      const largo = this.W - 1.2;
      for (let i = 0; i < zs.length - 1; i++) {
        const z = (zs[i] + zs[i + 1]) / 2;
        const caja = new THREE.BoxGeometry(largo, 0.05, 0.4);
        caja.translate(largo / 2, 0, 0); // crece desde la bomba hacia el fondo
        const s = new THREE.Mesh(caja, this.M.surcoAgua);
        s.position.set(-largo / 2, 0.03, z); s.scale.x = 0.001; s.visible = false;
        g.add(s); this.surcos.push(s);
      }
      for (let i = 0; i < 14; i++) {
        const m = esfera(0.07, this.M.agua, 0);
        m.visible = false; m.userData.t = Math.random(); g.add(m); this.gotas.push(m);
      }
    }

    // Flujo por la manguera madre.
    for (let i = 0; i < 10; i++) {
      const m = esfera(0.07, this.M.agua, 0);
      m.visible = false; m.userData.t = i / 10; g.add(m); this.flujo.push(m);
    }
  }

  pedirEtapa() {
    const p = this.est.preview;
    const id = (p && p !== '') ? p : this.est.etapa;
    const i = ETAPAS.indexOf((id || '').toLowerCase());
    const nuevo = i < 0 ? 1 : i;
    if (nuevo === this.sObj) return;
    this.sDesde = this.sVis; this.sObj = nuevo; this.tMorph = this.reducido ? 1 : 0;
  }

  // ── Interacción: arrastre, rueda, botones ──
  orbita() {
    const el = this.renderer.domElement;
    let px = 0, py = 0, activo = false;
    const puntos = new Map();
    let dist0 = 0, zoom0 = 1;

    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId);
      puntos.set(e.pointerId, [e.clientX, e.clientY]);
      if (puntos.size === 1) { activo = true; px = e.clientX; py = e.clientY; }
      if (puntos.size === 2) {
        const [a, b] = [...puntos.values()];
        dist0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = this.zoomObj;
      }
    });
    el.addEventListener('pointermove', e => {
      if (!puntos.has(e.pointerId)) return;
      puntos.set(e.pointerId, [e.clientX, e.clientY]);
      if (puntos.size === 2) {
        const [a, b] = [...puntos.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        this.zoomObj = clamp(zoom0 * (d / dist0), 0.6, 2.6);
      } else if (activo) {
        this.azObj -= (e.clientX - px) * 0.008;
        this.elObj = clamp(this.elObj - (e.clientY - py) * 0.005, 0.18, 1.32);
        px = e.clientX; py = e.clientY;
      }
      if (this.reducido) this.frame(0);
    });
    const fin = e => { puntos.delete(e.pointerId); if (!puntos.size) activo = false; };
    el.addEventListener('pointerup', fin);
    el.addEventListener('pointercancel', fin);
    el.addEventListener('wheel', e => {
      e.preventDefault();
      this.zoomObj = clamp(this.zoomObj * (e.deltaY > 0 ? 0.92 : 1.08), 0.6, 2.6);
      if (this.reducido) this.frame(0);
    }, { passive: false });
  }

  girar(d) { if (!this.renderer) return; this.azObj += d; if (this.reducido) { this.az = this.azObj; this.frame(0); } }
  acercar(f) { if (!this.renderer) return; this.zoomObj = clamp(this.zoomObj * f, 0.6, 2.6); if (this.reducido) { this.zoom = this.zoomObj; this.frame(0); } }
  reiniciar() {
    if (!this.renderer) return;
    this.azObj = -0.72; this.elObj = 0.62; this.zoomObj = 1;
    if (this.reducido) { this.az = this.azObj; this.el = this.elObj; this.zoom = 1; this.frame(0); }
  }

  resize() {
    const w = this.clientWidth || 360, h = this.clientHeight || 280;
    this.renderer.setSize(w, h, false);
    this.vw = w; this.vh = h;
    this.aplicarCamara();
  }

  aplicarCamara() {
    const c = this.cam, r = 18;
    c.position.set(Math.sin(this.az) * Math.cos(this.el) * r + this.tgtX, Math.sin(this.el) * r,
                   Math.cos(this.az) * Math.cos(this.el) * r);
    c.lookAt(this.tgtX, 0.6, 0);
    c.updateMatrixWorld();

    // Encuadre: se proyectan las esquinas del terreno para que la parcela
    // entre completa en cualquier ángulo, sin recortes al girar.
    const W = this.fitW ?? ((this.W || 11.4) / 2 + 0.6), D = (this.D || 7.8) / 2 + 0.6;
    let mx = 0, my = 0;
    const v = new THREE.Vector3();
    for (const x of [this.tgtX - W, this.tgtX + W]) for (const y of [-0.8, 3.2]) for (const z of [-D, D]) {
      v.set(x, y, z).applyMatrix4(c.matrixWorldInverse);
      mx = Math.max(mx, Math.abs(v.x)); my = Math.max(my, Math.abs(v.y));
    }
    const aspecto = (this.vw || 1) / (this.vh || 1);
    let ancho = mx * 2, alto = my * 2;
    if (ancho / alto < aspecto) ancho = alto * aspecto; else alto = ancho / aspecto;
    ancho /= this.zoom; alto /= this.zoom;
    c.left = -ancho / 2; c.right = ancho / 2; c.top = alto / 2; c.bottom = -alto / 2;
    c.updateProjectionMatrix();
  }

  // ── Frame ──
  frame(dt) {
    const E = this.est;
    const hum = parseFloat(E.humedad);
    const umbral = parseFloat(E.umbral) || 40;
    const hayHum = Number.isFinite(hum);
    const regando = E.regando === 'si';
    const sensorOn = E.sensor === 'activo';
    const quieto = this.reducido;

    this.t = (this.t || 0) + dt;
    // El cielo sigue a la hora: se recalcula cada medio minuto.
    this.tCielo = (this.tCielo || 0) + dt;
    if (this.tCielo > 30) { this.tCielo = 0; this.cielo(); }
    const cl = this.cl || leerClima(NaN, 0, NaN);
    const nubes = this.nubesEf ?? 0;
    const luz = this.luz ?? 1;

    // Cámara suave.
    const k = quieto ? 1 : 1 - Math.pow(0.001, dt);
    this.az = lerp(this.az, this.azObj, k);
    this.el = lerp(this.el, this.elObj, k);
    this.zoom = lerp(this.zoom, this.zoomObj, k);
    this.tgtX = lerp(this.tgtX, this.tgtXObj, k * 0.55);
    this.aplicarCamara();

    // Lo que el agua deja en la superficie. Se moja rápido y se seca despacio.
    const sis = sistemaDe(E.sistema);
    if (quieto) {
      this.mojadoLluvia = cl.lluvia > 0 ? 1 : 0;
      this.mojadoRiego = regando ? 1 : 0;
      this.avanceSurco = regando ? 1 : 0;
    } else {
      this.mojadoLluvia = cl.lluvia > 0
        ? Math.min(1, this.mojadoLluvia + dt * (0.03 + cl.lluvia * 0.07))
        : Math.max(0, this.mojadoLluvia - dt * 0.004);
      this.mojadoRiego = regando
        ? Math.min(1, this.mojadoRiego + dt * 0.22)
        : Math.max(0, this.mojadoRiego - dt * 0.015);
      this.avanceSurco = regando ? Math.min(1, this.avanceSurco + dt * 0.16) : this.avanceSurco;
      if (!regando && this.mojadoRiego === 0) this.avanceSurco = 0;
    }
    // La aspersión moja todo el campo; el goteo, solo sus manchas.
    const brillo = Math.max(this.mojadoLluvia, sis === 'aspersion' ? this.mojadoRiego * 0.8 : 0);

    // Color de la tierra: dato medido. El agua de encima solo la oscurece un
    // poco y le da brillo; el tono lo sigue mandando la humedad del sensor.
    const cSeca = new THREE.Color(COL.secaTop), cBien = new THREE.Color(COL.bienTop), cMoj = new THREE.Color(COL.mojTop);
    let top, lado, sequedad = 0, empape = 0;
    if (!hayHum) {
      top = new THREE.Color(0x8d8a80); lado = new THREE.Color(0x76736b);
    } else if (hum < umbral) {
      // El semáforo es categórico: abajo del punto de riego la tierra YA se ve
      // seca; qué tan seca es lo que gradúa.
      sequedad = clamp(0.55 + 0.45 * (1 - hum / Math.max(1, umbral)), 0, 1);
      top = cBien.clone().lerp(cSeca, sequedad);
      lado = new THREE.Color(COL.bienLado).lerp(new THREE.Color(COL.secaLado), sequedad);
    } else {
      empape = clamp((hum - 75) / 25, 0, 1);
      top = cBien.clone().lerp(cMoj, empape);
      lado = new THREE.Color(COL.bienLado).lerp(new THREE.Color(COL.mojLado), empape);
    }
    top.multiplyScalar(1 - 0.13 * brillo);
    const kc = quieto ? 1 : 1 - Math.pow(0.004, dt); // ~500 ms de transición
    this.M.tierraTop.color.lerp(top, kc);
    this.M.bed.color.lerp(top.clone().multiplyScalar(0.93), kc);
    this.M.tierraLado.color.lerp(lado, kc);
    this.M.tierraTop.roughness = this.M.bed.roughness = lerp(1, 0.5, brillo);
    // Mojada por arriba, la tierra seca ya no se ve agrietada.
    this.M.grieta.opacity = lerp(this.M.grieta.opacity, sequedad * 0.85 * (1 - brillo), kc);
    this.M.grieta.visible = this.M.grieta.opacity > 0.02;
    // Charcos: tierra empapada (dato) o lluvia fuerte que ya se juntó.
    const charcoLluvia = this.mojadoLluvia * clamp((cl.lluvia - 0.45) * 2.2, 0, 1) * 0.7;
    this.M.charco.opacity = lerp(this.M.charco.opacity, Math.max(empape * 0.8, charcoLluvia), kc);
    this.M.charco.visible = this.M.charco.opacity > 0.02;
    // Hojas con agua encima: más oscuras y con brillo.
    for (const m of [this.M.hoja, this.M.hojaClara, this.M.otono]) m.roughness = lerp(0.85, 0.42, this.mojadoLluvia);

    // Morph de etapa.
    if (this.tMorph < 1) {
      this.tMorph = Math.min(1, this.tMorph + dt / 0.9);
      this.sVis = lerp(this.sDesde ?? this.sObj, this.sObj, easeIO(this.tMorph));
    } else this.sVis = this.sObj;

    // Viento real: más fuerte, más rápido y más amplio el vaivén, con rachas.
    const v = cl.viento;
    const amp = quieto ? 0 : 0.008 + v * 0.0019;
    const vel = 0.7 + v * 0.03;
    const racha = 0.6 + 0.4 * Math.sin(this.t * 0.23 + 1.3) * Math.sin(this.t * 0.11);
    // Hojas caídas con tierra seca; se recuperan al regar.
    const caida = sequedad * 0.42 * (regando ? 0.45 : 1);
    this.plantas.forEach(p => {
      const esc = curva(p.userData.crec, this.sVis) * p.userData.esc;
      p.scale.setScalar(esc);
      p.userData.partes.forEach(({ g, kf }) => {
        const val = curva(kf, this.sVis);
        g.visible = val > 0.015;
        g.scale.setScalar(val);
      });
      const fase = this.t * vel + p.position.x * 0.6 + p.position.z;
      const brisa = amp * racha * Math.sin(fase);
      const temblor = amp * 0.35 * Math.sin(fase * 2.7 + 1.1); // hojas sueltas
      p.userData.follaje.forEach(f => {
        f.position.y = -caida * 0.22;
        f.rotation.z = caida * 0.12 + brisa + temblor;
        f.rotation.x = brisa * 0.55;
      });
    });
    this.moverMatas(this.t, quieto ? 0 : v);

    // ── Agua del riego ──
    this.flujo.forEach(m => {
      m.visible = regando;
      if (!regando) return;
      m.userData.t = (m.userData.t + dt * 0.55) % 1;
      m.position.set(this.madreX, this.madreY, lerp(2.9, -3.1, m.userData.t));
    });
    if (sis === 'goteo') {
      const n = Math.max(1, this.emisores.length);
      this.gotas.forEach((m, i) => {
        m.visible = regando;
        if (!regando) return;
        const e = this.emisores[i % n];
        const antes = m.userData.t;
        m.userData.t = quieto ? 0.5 : (m.userData.t + dt * 0.7) % 1;
        const t = m.userData.t;
        if (t < 0.62) { // se hincha en la boquilla
          m.position.set(e[0], e[1] - 0.012, e[2]);
          m.scale.set(0.35 + t, 0.35 + t * 1.35, 0.35 + t);
        } else {        // cae (con aceleración) hasta la cama
          const f = (t - 0.62) / 0.38;
          m.position.set(e[0], lerp(e[1] - 0.03, 0.17, f * f), e[2]);
          m.scale.set(0.8, 1.35, 0.8);
        }
        if (!quieto && t < antes) this.salpicar(e[0], 0.165, e[2], 0.55);
      });
      // La mancha crece mientras riega y se seca después.
      const w = this.mojadoRiego;
      this.manchas.forEach((m, i) => {
        m.visible = w > 0.01;
        const s = 0.32 + 0.68 * w + Math.sin(i * 1.7) * 0.05 * w;
        m.scale.set(s, s * 0.72, s);
      });
      this.M.mancha.opacity = 0.55 * w;
    } else if (sis === 'aspersion') {
      this.giroAsp = (this.giroAsp || 0) + (quieto ? 0 : dt * 1.15);
      this.cabezas.forEach(c => { c.rotation.y = this.giroAsp; });
      const n = Math.max(1, this.emisores.length);
      this.gotas.forEach((m, i) => {
        m.visible = regando;
        if (!regando) return;
        const e = this.emisores[Math.floor(i / 3) % n];
        m.userData.t = quieto ? m.userData.d : (m.userData.t + dt * 0.85) % 1;
        const t = m.userData.t;
        // Tres chorros por cabeza que giran con ella; cada gota describe un
        // arco que termina en la tierra.
        const a = this.giroAsp + m.userData.chorro * (Math.PI * 2 / 3) - t * 0.35 + (m.userData.d - 0.5) * 0.25;
        const r = t * (1.35 + m.userData.d * 0.45);
        const x = e[0] + Math.cos(a) * r, z = e[2] + Math.sin(a) * r;
        m.position.set(x, lerp(e[1] + 0.04, this.alturaSuelo(z), t) + Math.sin(t * Math.PI) * 0.5, z);
      });
    } else if (sis === 'gravedad') {
      const w = this.mojadoRiego;
      (this.surcos || []).forEach((s, i) => {
        s.visible = w > 0.01;
        s.scale.x = Math.max(0.001, clamp(this.avanceSurco * 1.15 - i * 0.07, 0, 1));
      });
      this.M.surcoAgua.opacity = 0.82 * Math.min(1, w * 1.4) * (0.94 + (quieto ? 0 : 0.06 * Math.sin(this.t * 3)));
      this.gotas.forEach(m => {
        m.visible = regando;
        if (!regando) return;
        m.userData.t = (m.userData.t + dt * 0.35) % 1;
        m.position.set(lerp(-4.8, -4.8 + 9.6 * this.avanceSurco, m.userData.t), 0.1, this.zs?.[0] ?? 0);
      });
    }
    this.luzBomba.material.color.set(regando ? COL.agua : COL.apagado);

    // Ionización: la partícula es la orden enviada.
    this.ion.visible = E.ionizando === 'si';
    if (this.ion.visible) {
      this.ionP.forEach(m => {
        m.userData.t = (m.userData.t + dt * 0.18) % 1;
        m.position.set(m.userData.x + Math.sin(this.t + m.userData.z) * 0.25,
                       0.2 + m.userData.t * 2.1, m.userData.z);
        m.scale.setScalar(1 - m.userData.t * 0.6);
      });
    }

    // Sensor: un pulso por cada lectura nueva que llega (1.1 s, ease-out),
    // no un latido decorativo. El foquito dice si está mandando lecturas.
    this.sensorCab.material = sensorOn ? this.M.verde : this.M.apagado;
    this.ledSensor.material = sensorOn ? this.M.ledOn : this.M.ledOff;
    const dp = this.t - this.pulsoDesde;
    if (sensorOn && !quieto && dp >= 0 && dp < 1.1) {
      const p = 1 - Math.pow(1 - dp / 1.1, 3);
      this.pulso.visible = true;
      this.pulso.scale.setScalar(1 + p * 2.4);
      this.M.pulso.opacity = (1 - p) * 0.55;
    } else { this.pulso.visible = false; }

    // ── Lluvia ──
    const activas = Math.round(this.N_LLUVIA * cl.lluvia);
    const im = this.lluviaIM;
    im.count = activas;
    im.visible = activas > 0;
    if (activas > 0) {
      const vx = v * 0.085; // el viento empuja la gota de lado
      const o = this._o2 ||= new THREE.Object3D();
      const largo = 0.75 + cl.lluvia * 0.7;
      this.M.lluvia.opacity = 0.32 + cl.lluvia * 0.3;
      for (let i = 0; i < activas; i++) {
        const d = this.gotasLl[i];
        if (!quieto) {
          d.y -= d.v * dt; d.x += vx * dt;
          const piso = this.alturaSuelo(d.z);
          if (d.y < piso) {
            if (Math.abs(d.x) < this.W / 2 && Math.abs(d.z) < this.D / 2 && Math.random() < 0.3) this.salpicar(d.x, piso, d.z, 1);
            d.y = 7.5 + Math.random() * 1.5;
            d.x = (Math.random() - 0.5) * 14 - vx * 0.7;
            d.z = (Math.random() - 0.5) * 9.4;
          }
        }
        o.position.set(d.x, d.y, d.z);
        o.rotation.set(0, 0, Math.atan2(vx, d.v));
        o.scale.set(1, largo, 1);
        o.updateMatrix();
        im.setMatrixAt(i, o.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    }
    this.salpicones.forEach(s => {
      if (s.userData.vida >= 1) return;
      s.userData.vida = quieto ? 1 : s.userData.vida + dt / 0.42;
      const vida = Math.min(1, s.userData.vida);
      // Se abre rápido y se borra: una corona de agua, no un círculo fijo.
      s.scale.setScalar((1 + Math.sqrt(vida) * 3.2) * s.userData.tam);
      s.material.opacity = 0.42 * (1 - vida) * (1 - vida);
      if (vida >= 1) s.visible = false;
    });

    // ── Nubes: su sombra cruza el campo empujada por el viento ──
    const nNubes = Math.round(this.nubesG.children.length * clamp(nubes * 1.15, 0, 1));
    this.nubesG.children.forEach((n, i) => {
      n.visible = i < nNubes && luz > 0.15;
      if (quieto) return;
      n.position.x += n.userData.vel * (0.18 + v * 0.028) * dt;
      if (n.position.x > 17) n.position.x = -17;
    });

    // ── Luz: sol o luna según la hora; las nubes y la lluvia la apagan ──
    const alt = this.altSol ?? 45;
    const tDia = clamp(((this.horaT ?? 12) - AMANECER) / (ANOCHECER - AMANECER), 0, 1);
    const kl = quieto ? 1 : 1 - Math.pow(0.02, dt);
    const destino = this._dest ||= { pos: new THREE.Vector3(), color: new THREE.Color() };
    let intensidad;
    if (alt > -2) {
      const elev = Math.max(alt, 5) * Math.PI / 180, R = 16;
      destino.pos.set(Math.cos(Math.PI * tDia) * R * Math.cos(elev), R * Math.sin(elev), 6);
      destino.color.set(0xffa860).lerp(new THREE.Color(0xfff4de), clamp(alt / 28, 0, 1));
      intensidad = 2.3 * clamp(alt / 22, 0.14, 1) * (1 - 0.66 * nubes) * (1 - 0.2 * cl.lluvia) * clamp(luz * 1.4, 0, 1);
    } else {
      destino.pos.set(-5, 12, 7);
      destino.color.set(0x9cb6ff);
      // Luz de luna: de noche se ve que es de noche, pero el color de la
      // tierra (el dato) se sigue distinguiendo.
      intensidad = 0.8 * (1 - 0.5 * nubes) * (1 - luz);
    }
    this.sol.position.lerp(destino.pos, kl);
    this.sol.color.lerp(destino.color, kl);
    this.sol.intensity = lerp(this.sol.intensity, intensidad, kl);
    this.hemi.color.lerp(new THREE.Color(0x5a72a3).lerp(new THREE.Color(0xdfefff), luz).lerp(new THREE.Color(0xc5ced4), nubes * luz * 0.7), kl);
    this.hemi.groundColor.lerp(new THREE.Color(0x3a332a).lerp(new THREE.Color(0x6f5a3e), luz), kl);
    let hemiI = lerp(1.05, 1.45 + 0.32 * nubes, luz);

    // Tormenta: un relámpago de vez en cuando (nunca con movimiento reducido).
    if (cl.tormenta && !quieto) {
      this.siguienteRayo -= dt;
      if (this.siguienteRayo < 0) { this.rayo = 1; this.siguienteRayo = 5 + Math.random() * 9; }
    }
    this.rayo = Math.max(0, this.rayo - dt * 3.5);
    hemiI += this.rayo * 2.6;
    this.hemi.intensity = lerp(this.hemi.intensity, hemiI, this.rayo > 0 ? 1 : kl);
    if (this.destello) this.destello.style.opacity = (this.rayo * 0.4).toFixed(3);

    // Niebla: el fondo del campo se pierde en el color del horizonte.
    if (cl.niebla) {
      if (!this.scene.fog) this.scene.fog = new THREE.Fog(0xd5dbdc, 11, 33);
      if (this.colorHorizonte) this.scene.fog.color.copy(this.colorHorizonte);
    } else if (this.scene.fog) this.scene.fog = null;

    this.renderer.render(this.scene, this.cam);
  }
}

if (!customElements.get('parcela-diorama')) customElements.define('parcela-diorama', ParcelaDiorama);
window.ParcelaDioramaListo = true;
