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

const CIELO = {
  soleado: 'linear-gradient(175deg,#8fd0f0 0%,#c6e7f5 48%,#e7f3e4 100%)',
  nublado: 'linear-gradient(175deg,#9fb0bb 0%,#c2ccd2 50%,#dfe4e0 100%)',
  lluvia: 'linear-gradient(175deg,#6e7f8d 0%,#93a3ad 50%,#bcc6c3 100%)',
  noche: 'linear-gradient(175deg,#16233a 0%,#27384f 55%,#3d4a4a 100%)',
};

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
            'modo', 'vecinas', 'lectura'];
  }

  constructor() {
    super();
    this.est = {
      cultivo: 'nogal', etapa: 'floracion', preview: '', humedad: 34, umbral: 40,
      sistema: 'goteo', regando: 'no', ionizando: 'no', clima: 'soleado',
      sensor: 'activo', hileras: 0, capturada: 'si', superficie: 'si',
      modo: 'parcela', vecinas: '[]', lectura: '',
    };
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
    if (n === 'clima') this.cielo();
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
    this.ro?.disconnect();
    this.scene?.traverse(o => { if (o.isMesh) o.geometry?.dispose(); });
    if (this.M) Object.values(this.M).forEach(m => m.dispose?.());
    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.vecinas = null;
    this.campo = null;
    this.riego = null;
    this.listo = false;
    this.replaceChildren();
  }

  cielo() {
    this.style.background = CIELO[this.est.clima] || CIELO.soleado;
  }

  init() {
    let R;
    try { R = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch (e) { this.respaldo2D(); return; }
    if (!R || !R.getContext()) { this.respaldo2D(); return; }
    this.renderer = R;
    R.setPixelRatio(Math.min(1.75, devicePixelRatio || 1));
    R.shadowMap.enabled = true;
    R.shadowMap.type = THREE.PCFShadowMap;
    R.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
    this.appendChild(R.domElement);

    const sc = this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-7, 7, 5, -5, 0.1, 100);

    sc.add(new THREE.HemisphereLight(0xdfefff, 0x6f5a3e, 1.5));
    const sol = this.sol = new THREE.DirectionalLight(0xfff4de, 2.1);
    sol.position.set(6, 10, 5);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    const d = 9;
    Object.assign(sol.shadow.camera, { left: -d, right: d, top: d, bottom: -d, near: 1, far: 30 });
    sol.shadow.bias = -0.002;
    sc.add(sol);

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
    };

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

    if (this.reducido) { this.frame(0); }
    else {
      let prev = performance.now();
      const loop = t => {
        this._raf = requestAnimationFrame(loop);
        const dt = Math.min(0.05, (t - prev) / 1000); prev = t;
        this.frame(dt);
      };
      this._raf = requestAnimationFrame(loop);
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
      ';transform:rotateX(58deg) rotateZ(-38deg);box-shadow:0 26px 40px rgba(22,60,45,.35);' +
      'display:grid;grid-template-rows:repeat(4,1fr);gap:6%;padding:8%;box-sizing:border-box';
    for (let i = 0; i < 4; i++) {
      const h = document.createElement('div');
      h.style.cssText = 'background:rgba(0,0,0,.16);border-radius:3px';
      plato.appendChild(h);
    }
    const nota = document.createElement('p');
    nota.textContent = 'Vista fija: este equipo no puede dibujar la parcela en 3D.';
    nota.style.cssText = 'position:absolute;left:12px;right:12px;bottom:10px;margin:0;font:600 12.5px system-ui,sans-serif;color:#111418;background:rgba(255,255,255,.9);border-radius:10px;padding:8px 10px;text-align:center';
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

    // Lluvia.
    this.lluvia = new THREE.Group(); this.scene.add(this.lluvia);
    this.gotasL = [];
    const gl = new THREE.CylinderGeometry(0.012, 0.012, 0.42, 4);
    const gm = new THREE.MeshBasicMaterial({ color: 0xbcd9ec, transparent: true, opacity: 0.6 });
    for (let i = 0; i < 70; i++) {
      const m = new THREE.Mesh(gl, gm);
      m.position.set((Math.random() - 0.5) * 12, Math.random() * 7, (Math.random() - 0.5) * 8);
      this.lluvia.add(m); this.gotasL.push(m);
    }
    this.lluvia.visible = false;
  }

  // Tubería / aspersores / surcos según el sistema de riego.
  riegoGeom() {
    if (this.riego) this.scene.remove(this.riego);
    const g = this.riego = new THREE.Group();
    this.scene.add(g);
    this.emisores = []; this.gotas = []; this.flujo = []; this.surcos = [];
    const sis = sistemaDe(this.est.sistema);
    const zs = this.zs || [0];

    if (sis === 'goteo' || sis === 'aspersion') {
      zs.forEach(z => {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, this.W - 0.9, 6), this.M.tubo);
        t.rotation.z = Math.PI / 2; t.position.set(0, 0.28, z); g.add(t);
      });
    }

    if (sis === 'goteo') {
      zs.forEach(z => {
        for (let i = 0; i < 6; i++) {
          const x = -4.4 + i * 1.76;
          const e = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.1, 6), this.M.metal);
          e.position.set(x, 0.22, z); g.add(e);
          this.emisores.push([x, 0.2, z]);
        }
      });
      for (let i = 0; i < 26; i++) {
        const m = esfera(0.05, this.M.agua, 0);
        m.visible = false; m.userData.t = Math.random(); g.add(m); this.gotas.push(m);
      }
    } else if (sis === 'aspersion') {
      zs.forEach(z => {
        for (let i = 0; i < 3; i++) {
          const x = -3.4 + i * 3.4;
          const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.8, 6), this.M.palo);
          p.position.set(x, 0.62, z); g.add(p);
          const c = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), this.M.metal);
          c.position.set(x, 1.02, z); g.add(c);
          this.emisores.push([x, 1.02, z]);
        }
      });
      for (let i = 0; i < 44; i++) {
        const m = esfera(0.045, this.M.agua, 0);
        m.visible = false;
        m.userData = { t: Math.random(), a: Math.random() * Math.PI * 2 };
        g.add(m); this.gotas.push(m);
      }
    } else if (sis === 'gravedad') { // lámina de agua en los surcos
      this.surcos = [];
      for (let i = 0; i < zs.length - 1; i++) {
        const z = (zs[i] + zs[i + 1]) / 2;
        const s = new THREE.Mesh(new THREE.BoxGeometry(this.W - 1.2, 0.05, 0.4), this.M.agua);
        s.position.set(0, 0.03, z); s.visible = false; g.add(s); this.surcos.push(s);
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

    // Cámara suave.
    const k = this.reducido ? 1 : 1 - Math.pow(0.001, dt);
    this.az = lerp(this.az, this.azObj, k);
    this.el = lerp(this.el, this.elObj, k);
    this.zoom = lerp(this.zoom, this.zoomObj, k);
    this.tgtX = lerp(this.tgtX, this.tgtXObj, k * 0.55);
    this.aplicarCamara();

    // Color de la tierra: dato medido.
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
    const kc = this.reducido ? 1 : 1 - Math.pow(0.004, dt); // ~500 ms de transición
    this.M.tierraTop.color.lerp(top, kc);
    this.M.bed.color.lerp(top.clone().multiplyScalar(0.93), kc);
    this.M.tierraLado.color.lerp(lado, kc);
    this.M.grieta.opacity = lerp(this.M.grieta.opacity, sequedad * 0.85, kc);
    this.M.grieta.visible = this.M.grieta.opacity > 0.02;
    this.M.charco.opacity = lerp(this.M.charco.opacity, empape * 0.8, kc);
    this.M.charco.visible = this.M.charco.opacity > 0.02;

    // Morph de etapa.
    if (this.tMorph < 1) {
      this.tMorph = Math.min(1, this.tMorph + dt / 0.9);
      this.sVis = lerp(this.sDesde ?? this.sObj, this.sObj, easeIO(this.tMorph));
    } else this.sVis = this.sObj;

    // Hojas caídas con tierra seca; se recuperan al regar.
    const caida = sequedad * 0.42 * (regando ? 0.45 : 1);
    this.plantas.forEach(p => {
      const esc = curva(p.userData.crec, this.sVis) * p.userData.esc;
      p.scale.setScalar(esc);
      p.userData.partes.forEach(({ g, kf }) => {
        const v = curva(kf, this.sVis);
        g.visible = v > 0.015;
        g.scale.setScalar(v);
      });
      const brisa = this.reducido ? 0 : Math.sin((this.t || 0) * 0.7 + p.position.x * 0.6 + p.position.z) * 0.018;
      p.userData.follaje.forEach(f => {
        f.position.y = -caida * 0.22;
        f.rotation.z = caida * 0.12 + brisa;
        f.rotation.x = brisa * 0.6;
      });
    });

    this.t = (this.t || 0) + dt;

    // Agua.
    const vis = regando;
    this.flujo.forEach(m => {
      m.visible = vis;
      if (!vis) return;
      m.userData.t = (m.userData.t + dt * 0.55) % 1;
      m.position.set(this.madreX, this.madreY, lerp(2.9, -3.1, m.userData.t));
    });
    const sis = sistemaDe(E.sistema);
    if (sis === 'goteo') {
      this.gotas.forEach((m, i) => {
        m.visible = vis;
        if (!vis) return;
        const e = this.emisores[i % Math.max(1, this.emisores.length)];
        m.userData.t = (m.userData.t + dt * 1.5) % 1;
        m.position.set(e[0], lerp(e[1], 0.19, m.userData.t), e[2]);
        m.scale.setScalar(lerp(1, 0.3, Math.max(0, m.userData.t - 0.75) * 4));
      });
    } else if (sis === 'aspersion') {
      this.gotas.forEach((m, i) => {
        m.visible = vis;
        if (!vis) return;
        const e = this.emisores[i % Math.max(1, this.emisores.length)];
        m.userData.t = (m.userData.t + dt * 0.9) % 1;
        const t = m.userData.t, a = m.userData.a + this.t * 0.8;
        const rr = t * 1.5;
        m.position.set(e[0] + Math.cos(a) * rr, e[1] + Math.sin(t * Math.PI) * 0.85 - t * 0.2,
                       e[2] + Math.sin(a) * rr);
      });
    } else if (sis === 'gravedad') {
      (this.surcos || []).forEach((s, i) => {
        s.visible = vis;
        if (vis) s.scale.x = 0.6 + 0.4 * Math.min(1, this.t * 0.4 + i * 0.05);
      });
      this.gotas.forEach(m => {
        m.visible = vis;
        if (!vis) return;
        m.userData.t = (m.userData.t + dt * 0.35) % 1;
        m.position.set(lerp(-4.8, 4.8, m.userData.t), 0.1, this.zs?.[0] ?? 0);
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
    // no un latido decorativo.
    this.sensorCab.material = sensorOn ? this.M.verde : this.M.apagado;
    const dp = (this.t || 0) - this.pulsoDesde;
    if (sensorOn && !this.reducido && dp >= 0 && dp < 1.1) {
      const p = 1 - Math.pow(1 - dp / 1.1, 3);
      this.pulso.visible = true;
      this.pulso.scale.setScalar(1 + p * 2.4);
      this.M.pulso.opacity = (1 - p) * 0.55;
    } else { this.pulso.visible = false; }

    // Clima.
    const lluvia = E.clima === 'lluvia';
    this.lluvia.visible = lluvia;
    if (lluvia) this.gotasL.forEach(m => {
      m.position.y -= dt * 9;
      if (m.position.y < 0) m.position.y = 7 + Math.random() * 2;
    });
    const nub = E.clima === 'soleado' ? 1 : E.clima === 'nublado' ? 0.55 : 0.4;
    this.sol.intensity = lerp(this.sol.intensity, 2.1 * nub, this.reducido ? 1 : kc);

    this.renderer.render(this.scene, this.cam);
  }
}

if (!customElements.get('parcela-diorama')) customElements.define('parcela-diorama', ParcelaDiorama);
window.ParcelaDioramaListo = true;
