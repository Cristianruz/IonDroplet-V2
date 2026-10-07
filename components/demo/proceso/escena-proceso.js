// "Así riega IonDroplet": la escena 3D del recorrido (/proceso).
//
// Un campo de chile con su línea de goteo y, en una losa a un lado, el equipo:
// el depósito transparente con las dos varillas de ionización adentro, la
// bomba, la caja de control (ESP32 y relé) y la computadora que decide. La
// cámara sigue la historia del guion (lib/demo/guion-proceso.ts): el sensor,
// la señal por wifi, el clic del relé, las burbujas en las varillas, el agua
// que corre por la tubería y la gota que moja la tierra junto a la raíz, vista
// en el corte del suelo.
//
// Mismo estilo que el diorama del cultivo (juguete de bajo polígono, sombras
// suaves, cielo de día). Es una ilustración del proceso: no lee datos reales.
//
// Uso: const e = crearEscenaProceso(div); e.dibujar(momento, dt, momentoAnterior); e.destruir()
import * as THREE from 'three';
import { CLIC_RELE as CLIC, SUELTA_RELE as SUELTA, PUNTO_RIEGO as PUNTO } from '../../../lib/demo/guion-proceso';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const suave = p => p * p * (3 - 2 * p);
const tramo = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
/** La parte fraccionaria, siempre entre 0 y 1 (también con números negativos). */
const vuelta = x => ((x % 1) + 1) % 1;

const COL = {
  secaTop: 0xcdae80, bienTop: 0x7d5c3c, lado: 0x6f5236,
  hoja: 0x3d7a37, hojaClara: 0x51964a, tallo: 0x5d8c3a, chileRojo: 0xbe3a2b, chileVerde: 0x4f8f3a,
  piedra: 0x9c958a, verde: 0x1f7a3d, metal: 0xa9b2b7, tubo: 0x2f3a40, agua: 0x2f9be0, aguaViva: 0x3fb4ff,
  oro: 0xf2c14e, chispa: 0xffd54a, mojado: 0x3a2a1c, caja: 0xe9e6df, tinta: 0x13283d,
};

// ── Geometría del mundo ────────────────────────────────────────────────────
// Campo: x de -4.6 a 6, z de -2.6 a 3 (el corte del suelo mira hacia +z).
// Losa del equipo: x de -10.2 a -4.9.
const CAMPO = { x0: -4.6, x1: 6.0, z0: -2.6, z1: 3.0, fondo: -1.5 };
const HILERAS = [-1.4, 0.6, 2.5];
const PLANTAS_X = [-3.6, -1.85, -0.1, 1.65, 3.4, 5.15];
const HEROE = { x: 1.65, z: 2.5 };
const GOTERO_HEROE = new THREE.Vector3(1.95, 0.07, 2.5);
const SENSOR = new THREE.Vector3(3.0, 0, 2.66);
const TANQUE = new THREE.Vector3(-8.6, 0, 0.6);
const VARILLAS_X = [-8.85, -8.35];
const BOMBA = new THREE.Vector3(-6.6, 0, 0.6);
const CAJA = new THREE.Vector3(-9.4, 0, 2.3);
const MESA = new THREE.Vector3(-6.3, 0, 2.35);
const ANTENA_SENSOR = new THREE.Vector3(3.0, 1.0, 2.66);
const ANTENA_CAJA = new THREE.Vector3(-9.4, 2.4, 2.3);

// Recorrido del agua hasta el gotero de la planta del frente. El guion dice
// qué fracción ya recorrió ("frente").
const RUTA_HEROE = [
  [-8.6, 0.9, 0.6], [-8.2, 0.35, 0.6], [-7.75, 0.3, 0.6], [-6.95, 0.3, 0.6],
  [-6.6, 0.38, 0.6], [-6.3, 0.62, 0.6], [-4.9, 0.62, 0.6], [-4.6, 0.07, 0.6],
  [-4.45, 0.07, 0.6], [-4.45, 0.07, 2.5], [1.95, 0.07, 2.5],
];

class Polilinea {
  constructor(puntos, desde = 0) {
    this.p = puntos.map(a => (a.isVector3 ? a.clone() : new THREE.Vector3(...a)));
    this.d = [0];
    for (let i = 1; i < this.p.length; i++) this.d.push(this.d[i - 1] + this.p[i].distanceTo(this.p[i - 1]));
    this.L = this.d[this.d.length - 1];
    // A qué distancia del depósito empieza (para las ramas).
    this.desde = desde;
  }
  en(dist, out = new THREE.Vector3()) {
    const s = clamp(dist, 0, this.L);
    let i = 1;
    while (i < this.d.length - 1 && this.d[i] < s) i++;
    const a = this.d[i - 1], b = this.d[i];
    return out.lerpVectors(this.p[i - 1], this.p[i], b > a ? (s - a) / (b - a) : 0);
  }
}

// ── Texturas pintadas (sin descargar nada) ─────────────────────────────────
function texturaTerrones() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const x = cv.getContext('2d');
  x.fillStyle = 'rgb(236,234,230)'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    const v = 170 + Math.random() * 85, r = 0.5 + Math.random() * 2.2;
    x.fillStyle = `rgba(${v},${v * 0.97},${v * 0.92},${0.35 + Math.random() * 0.4})`;
    x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, r * 1.4, r, Math.random() * 3, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(5, 3);
  return t;
}

// El corte del suelo: capa de arriba más oscura, subsuelo con piedritas.
function texturaCorte() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 160;
  const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 160);
  g.addColorStop(0, '#7a5a3a'); g.addColorStop(0.3, '#8a6a48'); g.addColorStop(0.34, '#a0825e'); g.addColorStop(1, '#b49572');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 160);
  for (let i = 0; i < 900; i++) {
    const y = 50 + Math.random() * 110, v = 150 + Math.random() * 60;
    x.fillStyle = `rgba(${v},${v * 0.85},${v * 0.66},0.7)`;
    x.beginPath(); x.ellipse(Math.random() * 1024, y, 1 + Math.random() * 3, 0.8 + Math.random() * 1.6, 0, 0, 7); x.fill();
  }
  for (let i = 0; i < 7; i++) {
    x.strokeStyle = 'rgba(70,50,30,0.18)'; x.lineWidth = 1.2;
    const y = 55 + i * 15 + Math.random() * 4;
    x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(300, y + 4, 700, y - 4, 1024, y + 2); x.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Raíces de la hilera del frente y las paletas del sensor, en el corte.
function texturaRaices() {
  const W = 2048, H = 290; // el corte mide 10.6 × 1.5
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const aX = v => (v - CAMPO.x0) / (CAMPO.x1 - CAMPO.x0) * W;
  const aY = v => (-v) / (-CAMPO.fondo) * H;
  const rama = (x0, y0, ang, largo, grosor, nivel) => {
    if (nivel > 4 || largo < 4) return;
    const x1 = x0 + Math.cos(ang) * largo, y1 = y0 + Math.sin(ang) * largo;
    x.strokeStyle = `rgba(240,226,196,${0.95 - nivel * 0.12})`; x.lineWidth = grosor; x.lineCap = 'round';
    x.beginPath(); x.moveTo(x0, y0);
    x.quadraticCurveTo((x0 + x1) / 2 + (Math.random() - 0.5) * largo * 0.4, (y0 + y1) / 2, x1, y1); x.stroke();
    const n = nivel < 2 ? 3 : 2;
    for (let i = 0; i < n; i++) rama(x1, y1, ang + (Math.random() - 0.5) * 1.3, largo * (0.55 + Math.random() * 0.2), grosor * 0.62, nivel + 1);
  };
  for (const px of PLANTAS_X) {
    const cx = aX(px);
    for (let i = 0; i < 4; i++) rama(cx, 2, Math.PI / 2 + (i - 1.5) * 0.45, 44 + Math.random() * 20, 5, 0);
  }
  // Las dos paletas del sensor capacitivo, metidas en la tierra.
  const sx = aX(SENSOR.x);
  x.fillStyle = 'rgba(28,92,58,0.95)';
  x.fillRect(sx - 14, 0, 28, aY(-0.55));
  x.fillStyle = 'rgba(232,197,90,0.9)';
  x.fillRect(sx - 9, aY(-0.12), 18, 6);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Una etiqueta que mira siempre a la cámara: píldora blanca con letra marina.
// Miden lo mismo en pantalla de cerca o de lejos (sin atenuar por distancia):
// "alto" va en unidades a un metro de la cámara; 0.024 ≈ 3.7 % del alto.
function etiqueta(texto, { alto = 0.024, color = '#13283d', fondo = 'rgba(255,255,255,0.95)' } = {}) {
  const cv = document.createElement('canvas');
  const x = cv.getContext('2d');
  const fuente = '700 44px "Figtree Variable", "Segoe UI", system-ui, sans-serif';
  x.font = fuente;
  const ancho = Math.ceil(x.measureText(texto).width) + 56;
  cv.width = ancho; cv.height = 76;
  x.font = fuente;
  x.fillStyle = fondo;
  x.beginPath(); x.roundRect(2, 2, ancho - 4, 72, 36); x.fill();
  x.strokeStyle = 'rgba(19,40,61,0.12)'; x.lineWidth = 2; x.stroke();
  x.fillStyle = color; x.textBaseline = 'middle';
  x.fillText(texto, 28, 40);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, opacity: 0, sizeAttenuation: false }));
  s.scale.set(alto * ancho / 76, alto, 1);
  s.renderOrder = 20;
  return s;
}

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({
  color, roughness: o.roughness ?? 0.85, metalness: o.metalness ?? 0, flatShading: o.flat ?? false,
  transparent: o.transparent ?? false, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide,
  depthWrite: o.depthWrite ?? true, emissive: o.emissive ?? 0x000000,
});

function chile(M) {
  const t = new THREE.Group();
  const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.62, 6), M.tallo);
  tallo.position.y = 0.31; tallo.castShadow = true; t.add(tallo);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    const h = new THREE.Mesh(new THREE.IcosahedronGeometry(0.19 + (i % 2) * 0.05, 1), i % 2 ? M.hoja : M.hojaClara);
    h.scale.set(1, 0.6, 1);
    h.position.set(Math.cos(a) * 0.2, 0.5 + (i % 3) * 0.12, Math.sin(a) * 0.2);
    h.castShadow = true; t.add(h);
  }
  [[0.22, 0.52, 0.1], [-0.2, 0.46, -0.14], [0.05, 0.62, -0.22], [-0.12, 0.66, 0.2]].forEach((p, i) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.28, 6), i % 3 ? M.chileRojo : M.chileVerde);
    c.position.set(p[0], p[1] - 0.14, p[2]); c.rotation.x = Math.PI; t.add(c);
  });
  return t;
}

// Un tramo recto de tubo entre dos puntos.
function tubo(a, b, r, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), 12, 1, true), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

function cable(puntos, r, material) {
  const curva = new THREE.CatmullRomCurve3(puntos.map(p => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curva, 48, r, 6, false), material);
  m.castShadow = true;
  return { malla: m, curva };
}

// ── La escena ──────────────────────────────────────────────────────────────

export function crearEscenaProceso(contenedor) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  contenedor.appendChild(renderer.domElement);
  contenedor.style.background = 'linear-gradient(175deg,#7cc4ec 0%,#bfe3f5 48%,#e9f4e6 100%)';

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 200);

  escena.add(new THREE.HemisphereLight(0xdfefff, 0x6f5a3e, 1.45));
  const sol = new THREE.DirectionalLight(0xfff4e0, 1.9);
  sol.position.set(4, 14, 9);
  sol.target.position.set(-2, 0, 0.5);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -12, right: 9, top: 7, bottom: -7, near: 1, far: 40 });
  sol.shadow.bias = -0.0005;
  escena.add(sol, sol.target);

  const M = {
    tallo: mat(COL.tallo, { flat: true }), hoja: mat(COL.hoja, { flat: true }), hojaClara: mat(COL.hojaClara, { flat: true }),
    chileRojo: mat(COL.chileRojo, { flat: true }), chileVerde: mat(COL.chileVerde, { flat: true }),
    piedra: mat(COL.piedra), verde: mat(COL.verde, { roughness: 0.6 }), metal: mat(COL.metal, { roughness: 0.35, metalness: 0.6 }),
    tuboClaro: mat(0xa9bcc6, { transparent: true, opacity: 0.3, roughness: 0.2, depthWrite: false }),
    linea: mat(0x46535a, { transparent: true, opacity: 0.34, roughness: 0.25, depthWrite: false }),
    agua: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    gota: mat(COL.agua, { roughness: 0.1 }),
    tierraTop: mat(COL.secaTop, { roughness: 1 }), tierraLado: mat(COL.lado, { roughness: 1 }),
    corte: mat(0xffffff, { roughness: 1 }),
    mancha: mat(COL.mojado, { transparent: true, opacity: 0, roughness: 0.35, depthWrite: false }),
    caja: mat(COL.caja, { roughness: 0.5 }), oscuro: mat(0x26303a, { roughness: 0.6 }),
    rojo: mat(0xc0392b, { roughness: 0.5 }), negro: mat(0x1d2226, { roughness: 0.5 }),
    madera: mat(0x9a7652), placa: mat(0x1c5c3a, { roughness: 0.5 }), rele: mat(0x2d6fd0, { roughness: 0.4 }),
  };
  M.tierraTop.map = texturaTerrones();
  M.corte.map = texturaCorte();

  // ── Suelo del campo, con su corte al frente ──
  const ancho = CAMPO.x1 - CAMPO.x0, hondo = CAMPO.z1 - CAMPO.z0;
  const suelo = new THREE.Mesh(new THREE.BoxGeometry(ancho, -CAMPO.fondo, hondo),
    [M.tierraLado, M.tierraLado, M.tierraTop, M.tierraLado, M.corte, M.tierraLado]);
  suelo.position.set((CAMPO.x0 + CAMPO.x1) / 2, CAMPO.fondo / 2, (CAMPO.z0 + CAMPO.z1) / 2);
  suelo.receiveShadow = true;
  escena.add(suelo);

  // Lo que el agua moja, visto en el corte: un bulbo bajo el gotero del frente.
  const formaBulbo = new THREE.Shape();
  formaBulbo.absellipse(0, 0, 1, 1, Math.PI, Math.PI * 2, false, 0);
  const bulbos = [0.95, 0.62].map((k, i) => {
    const b = new THREE.Mesh(new THREE.ShapeGeometry(formaBulbo, 40),
      new THREE.MeshStandardMaterial({ color: i ? 0x2b3b48 : 0x3a3029, transparent: true, opacity: 0, roughness: 0.3, depthWrite: false }));
    b.position.set(GOTERO_HEROE.x, -0.003, CAMPO.z1 + 0.003 + i * 0.001);
    b.userData.k = k;
    b.renderOrder = 3 + i;
    escena.add(b);
    return b;
  });
  const raices = new THREE.Mesh(new THREE.PlaneGeometry(ancho, -CAMPO.fondo),
    new THREE.MeshBasicMaterial({ map: texturaRaices(), transparent: true, depthWrite: false }));
  raices.position.set((CAMPO.x0 + CAMPO.x1) / 2, CAMPO.fondo / 2, CAMPO.z1 + 0.006);
  raices.renderOrder = 6;
  escena.add(raices);

  // ── Losa del equipo ──
  const losa = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.35, 4.6), M.piedra);
  losa.position.set(-7.55, -0.175, 0.7); losa.receiveShadow = true; escena.add(losa);

  // ── Plantas ──
  for (const z of HILERAS) {
    for (const x of PLANTAS_X) {
      const p = chile(M);
      p.position.set(x, 0, z);
      p.rotation.y = Math.random() * Math.PI * 2;
      p.scale.setScalar(1.12);
      escena.add(p);
    }
  }

  // ── Depósito transparente con las varillas adentro ──
  const tanque = new THREE.Group();
  tanque.position.copy(TANQUE);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.08, 32), M.oscuro);
  base.position.y = 0.04; base.receiveShadow = true; tanque.add(base);
  const aguaTanque = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 1.4, 32),
    mat(0x2f8fd0, { transparent: true, opacity: 0.32, roughness: 0.15, depthWrite: false }));
  aguaTanque.position.y = 0.08 + 0.7; aguaTanque.renderOrder = 1; tanque.add(aguaTanque);
  const superficie = new THREE.Mesh(new THREE.CircleGeometry(0.82, 40),
    mat(0x8fd0f5, { transparent: true, opacity: 0.45, roughness: 0.05, depthWrite: false }));
  superficie.rotation.x = -Math.PI / 2; superficie.position.y = 1.48; superficie.renderOrder = 2; tanque.add(superficie);
  const pared = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 1.9, 40, 1, true),
    mat(0xdfeef5, { transparent: true, opacity: 0.2, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  pared.position.y = 0.08 + 0.95; pared.renderOrder = 4; tanque.add(pared);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.03, 8, 40), M.metal);
  aro.rotation.x = Math.PI / 2; aro.position.y = 1.98; tanque.add(aro);
  escena.add(tanque);

  const varillas = VARILLAS_X.map((x, i) => {
    const g = new THREE.Group();
    g.position.set(x, 0, TANQUE.z);
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.8, 10), M.metal);
    v.position.y = 1.15; v.castShadow = true; g.add(v);
    const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 12), i === 0 ? M.rojo : M.negro);
    tapa.position.y = 2.1; g.add(tapa);
    // El resplandor de la corriente: solo con el relé cerrado.
    const brillo = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.25, 14, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    brillo.position.y = 0.78; brillo.renderOrder = 5; g.add(brillo);
    escena.add(g);
    return { g, brillo };
  });

  // Burbujas que suben de las varillas y chispas doradas (la ionización).
  const N_BURBUJAS = 80, N_IONES = 56;
  const burbujas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.024, 0),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), N_BURBUJAS);
  const datosBurbujas = Array.from({ length: N_BURBUJAS }, (_, i) => ({ v: i % 2, a: Math.random() * 7, f: Math.random(), r: 0.05 + Math.random() * 0.04, vel: 0.35 + Math.random() * 0.3 }));
  const iones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.02, 0),
    new THREE.MeshBasicMaterial({ color: COL.oro, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }), N_IONES);
  const datosIones = Array.from({ length: N_IONES }, () => ({ a: Math.random() * 7, r: 0.12 + Math.random() * 0.55, y: 0.3 + Math.random() * 1.05, w: 0.6 + Math.random() * 0.9 }));
  burbujas.renderOrder = 3; iones.renderOrder = 3;
  // Las nubes de partículas se mueven por toda la escena: three calcula su
  // esfera de recorte una sola vez (con todo escondido al empezar) y después
  // las daría por fuera de cámara. Se dibujan siempre.
  burbujas.frustumCulled = false; iones.frustumCulled = false;
  escena.add(burbujas, iones);

  // ── Bomba ──
  const bomba = new THREE.Group();
  bomba.position.copy(BOMBA);
  const cuerpoBomba = new THREE.Group();
  const caja = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.5), M.verde);
  caja.position.y = 0.26; caja.castShadow = true; cuerpoBomba.add(caja);
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.44, 14), M.metal);
  motor.rotation.z = Math.PI / 2; motor.position.set(0.05, 0.56, 0); motor.castShadow = true; cuerpoBomba.add(motor);
  const luzBomba = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0x55605a }));
  luzBomba.position.set(-0.2, 0.38, 0.26); cuerpoBomba.add(luzBomba);
  bomba.add(cuerpoBomba);
  escena.add(bomba);

  // ── Tubería: depósito → bomba → principal → líneas de goteo ──
  const rutaHeroe = new Polilinea(RUTA_HEROE);
  const ramaDesde = rutaHeroe.d[8]; // donde la principal llega al campo
  const rutas = [
    rutaHeroe,
    new Polilinea([[-4.45, 0.07, 0.6], [CAMPO.x1 - 0.2, 0.07, 0.6]], ramaDesde),
    new Polilinea([[-4.45, 0.07, 0.6], [-4.45, 0.07, -1.4], [CAMPO.x1 - 0.2, 0.07, -1.4]], ramaDesde),
    new Polilinea([GOTERO_HEROE, [CAMPO.x1 - 0.2, 0.07, 2.5]], rutaHeroe.L),
  ];
  for (const r of rutas) {
    for (let i = 1; i < r.p.length; i++) {
      // Lo que va en el campo es manguera de goteo; lo del equipo, tubo.
      const enCampo = r.p[i].y < 0.1 && r.p[i - 1].y < 0.1;
      const t = tubo(r.p[i - 1], r.p[i], enCampo ? 0.06 : 0.075, enCampo ? M.linea : M.tuboClaro);
      t.renderOrder = 4;
      escena.add(t);
    }
  }

  // Las gotas de agua dentro de la tubería; una de cada cuatro, dorada: va ionizada.
  const ESPACIO = 0.17;
  const particulas = [];
  rutas.forEach((r, ri) => { for (let d = 0; d < r.L; d += ESPACIO) particulas.push({ r: ri, d0: d }); });
  const agua = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 1), M.agua, particulas.length);
  const cAgua = new THREE.Color(COL.aguaViva), cIon = new THREE.Color(COL.oro);
  particulas.forEach((q, i) => agua.setColorAt(i, i % 4 === 0 ? cIon : cAgua));
  agua.instanceColor.needsUpdate = true;
  agua.frustumCulled = false;
  escena.add(agua);
  const punta = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x4ec1ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  punta.renderOrder = 6; escena.add(punta);

  // ── Goteros, gotas, salpicones y manchas de tierra mojada ──
  const goteros = [];
  const discoMancha = new THREE.CircleGeometry(0.42, 24);
  const anillo = new THREE.RingGeometry(0.05, 0.08, 20);
  for (const z of HILERAS) {
    for (const x of PLANTAS_X) {
      const pos = new THREE.Vector3(x + 0.3, 0.07, z);
      const e = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.09, 8), M.metal);
      e.position.copy(pos); escena.add(e);
      const heroe = Math.abs(x + 0.3 - GOTERO_HEROE.x) < 0.01 && z === 2.5;
      const gota = new THREE.Mesh(new THREE.IcosahedronGeometry(heroe ? 0.085 : 0.06, 1), M.gota);
      gota.visible = false; escena.add(gota);
      const mancha = new THREE.Mesh(discoMancha, M.mancha);
      mancha.rotation.x = -Math.PI / 2; mancha.position.set(pos.x, 0.004, z); mancha.scale.set(0.3, 0.3, 0.3);
      mancha.renderOrder = 2; escena.add(mancha);
      const salpicon = new THREE.Mesh(anillo, new THREE.MeshBasicMaterial({ color: 0xd9eef8, transparent: true, opacity: 0, depthWrite: false }));
      salpicon.rotation.x = -Math.PI / 2; salpicon.position.set(pos.x, 0.008, z); escena.add(salpicon);
      // A qué distancia del depósito queda este gotero, por su línea.
      const ruta = z === 2.5 ? (pos.x <= GOTERO_HEROE.x ? rutas[0] : rutas[3]) : z === 0.6 ? rutas[1] : rutas[2];
      const dist = z === 2.5 && pos.x <= GOTERO_HEROE.x
        ? rutaHeroe.d[9] + (pos.x - (-4.45))
        : ruta.desde + (z === -1.4 ? 2 : 0) + (pos.x - (z === 2.5 ? GOTERO_HEROE.x : -4.45));
      goteros.push({ pos, gota, mancha, salpicon, dist, fase: Math.random(), cayo: false, heroe: pos.distanceTo(GOTERO_HEROE) < 0.01 });
    }
  }

  // ── Sensor de humedad con su nodo wifi ──
  const sensor = new THREE.Group();
  sensor.position.copy(SENSOR);
  const paleta = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.025), M.placa);
  paleta.position.y = 0.2; paleta.castShadow = true; sensor.add(paleta);
  const nodo = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), M.caja);
  nodo.position.y = 0.54; nodo.castShadow = true; sensor.add(nodo);
  const antenaS = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6), M.oscuro);
  antenaS.position.set(0.1, 0.8, 0); sensor.add(antenaS);
  const ledSensor = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0x5cff9a }));
  ledSensor.position.set(-0.08, 0.56, 0.055); sensor.add(ledSensor);
  escena.add(sensor);

  // ── Caja de control (ESP32 + relé) y la computadora ──
  const control = new THREE.Group();
  control.position.copy(CAJA);
  const poste = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 0.1), M.oscuro);
  poste.position.y = 0.65; poste.castShadow = true; control.add(poste);
  const gabinete = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.62, 0.3), M.caja);
  gabinete.position.y = 1.6; gabinete.castShadow = true; control.add(gabinete);
  // Por la ventanita se ven la placa y el relé.
  const placa = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.02), M.placa);
  placa.position.set(-0.14, 1.62, 0.16); control.add(placa);
  const rele = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.06), M.rele);
  rele.position.set(0.2, 1.6, 0.17); control.add(rele);
  const ledRele = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: 0xd9483b }));
  ledRele.position.set(0.2, 1.78, 0.17); control.add(ledRele);
  const antenaC = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 6), M.oscuro);
  antenaC.position.set(0.3, 2.15, 0); control.add(antenaC);
  escena.add(control);

  const mesa = new THREE.Group();
  mesa.position.copy(MESA);
  const tabla = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.75), M.madera);
  tabla.position.y = 0.75; tabla.castShadow = true; tabla.receiveShadow = true; mesa.add(tabla);
  for (const [x, z] of [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]]) {
    const pata = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), M.madera);
    pata.position.set(x, 0.375, z); pata.castShadow = true; mesa.add(pata);
  }
  const teclado = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.03, 0.46), M.oscuro);
  teclado.position.set(0, 0.79, 0.08); mesa.add(teclado);
  const lienzoPantalla = document.createElement('canvas'); lienzoPantalla.width = 640; lienzoPantalla.height = 420;
  const texPantalla = new THREE.CanvasTexture(lienzoPantalla); texPantalla.colorSpace = THREE.SRGBColorSpace;
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.43), new THREE.MeshBasicMaterial({ map: texPantalla }));
  const marco = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.47, 0.02), M.oscuro);
  const tapaLaptop = new THREE.Group();
  tapaLaptop.add(marco); pantalla.position.z = 0.011; tapaLaptop.add(pantalla);
  tapaLaptop.position.set(0, 1.0, -0.15); tapaLaptop.rotation.x = -0.22;
  mesa.add(tapaLaptop);
  escena.add(mesa);

  // ── Cables: corriente a la bomba y a las varillas, USB a la computadora ──
  const cables = [
    cable([[-9.3, 1.32, 2.3], [-9.0, 0.06, 2.0], [-7.3, 0.06, 1.0], [-6.75, 0.3, 0.75]], 0.022, M.rojo),
    cable([[-9.3, 1.32, 2.3], [-9.5, 0.9, 1.6], [-9.2, 2.3, 0.9], [VARILLAS_X[0], 2.16, TANQUE.z]], 0.022, M.rojo),
    cable([[-9.5, 1.32, 2.3], [-9.8, 0.9, 1.5], [-9.0, 2.45, 0.7], [VARILLAS_X[1], 2.16, TANQUE.z]], 0.022, M.negro),
    cable([[-9.1, 1.4, 2.3], [-8.6, 0.06, 2.5], [-7.0, 0.06, 2.6], [-6.65, 0.79, 2.45], [-6.4, 0.8, 2.4]], 0.016, M.oscuro),
  ];
  cables.forEach(c => escena.add(c.malla));
  // La corriente: chispitas amarillas que corren por los cables de fuerza.
  const N_CHISPAS = 30;
  const chispas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.03, 0),
    new THREE.MeshBasicMaterial({ color: COL.chispa, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), N_CHISPAS);
  chispas.frustumCulled = false;
  escena.add(chispas);

  // ── La señal del sensor: una bolita de luz que viaja a la caja ──
  const arco = new THREE.QuadraticBezierCurve3(ANTENA_SENSOR.clone(), new THREE.Vector3(-3.2, 4.4, 3.6), ANTENA_CAJA.clone());
  const usb = cables[3].curva;
  const senal = new THREE.Group();
  const nucleo = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), new THREE.MeshBasicMaterial({ color: 0xe8fbff }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0x4ec1df, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  senal.add(nucleo, halo); senal.visible = false; escena.add(senal);
  const estela = Array.from({ length: 8 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06 * (1 - i / 10), 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0.5 * (1 - i / 8), blending: THREE.AdditiveBlending, depthWrite: false }));
    m.visible = false; escena.add(m); return m;
  });
  // Ondas de wifi saliendo de la antena del sensor.
  const ondas = [0, 1, 2].map(() => {
    const o = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 32),
      new THREE.MeshBasicMaterial({ color: 0x4ec1df, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    o.position.copy(ANTENA_SENSOR); escena.add(o); return o;
  });
  const destelloRele = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.16, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  destelloRele.position.set(CAJA.x + 0.2, 1.78, CAJA.z + 0.2); escena.add(destelloRele);

  // ── Etiquetas ──
  const lbl = {
    sensor: etiqueta('Sensor de humedad'), caja: etiqueta('Caja de control: ESP32 y relé'),
    compu: etiqueta('Computadora'), mas: etiqueta('Varilla +', { color: '#a3261b' }), menos: etiqueta('Varilla −'),
    deposito: etiqueta('Depósito'), bomba: etiqueta('Bomba'), gotero: etiqueta('Gotero'), raiz: etiqueta('Raíz'),
    mojada: etiqueta('Tierra mojada', { color: '#1d4f8a' }),
    lectura: null,
  };
  lbl.sensor.position.set(SENSOR.x, 1.35, SENSOR.z);
  lbl.caja.position.set(CAJA.x, 2.75, CAJA.z);
  lbl.compu.position.set(MESA.x, 1.45, MESA.z);
  lbl.mas.position.set(VARILLAS_X[0] - 0.25, 2.45, TANQUE.z);
  lbl.menos.position.set(VARILLAS_X[1] + 0.25, 2.45, TANQUE.z);
  lbl.deposito.position.set(TANQUE.x, 2.75, TANQUE.z);
  lbl.bomba.position.set(BOMBA.x, 1.15, BOMBA.z);
  lbl.gotero.position.set(GOTERO_HEROE.x + 0.15, 0.6, GOTERO_HEROE.z + 0.2);
  lbl.raiz.position.set(HEROE.x - 0.55, -0.55, CAMPO.z1 + 0.05);
  lbl.mojada.position.set(GOTERO_HEROE.x + 0.75, -0.35, CAMPO.z1 + 0.05);
  Object.values(lbl).forEach(s => s && escena.add(s));
  // Qué etiquetas se ven en cada paso.
  const ETIQUETAS_POR_PASO = {
    inicio: ['sensor', 'deposito', 'caja'],
    mide: ['sensor'], avisa: ['sensor', 'caja'], decide: ['caja', 'compu'],
    ioniza: ['mas', 'menos', 'deposito'], bomba: ['bomba'], viaja: [], gotea: ['gotero', 'raiz', 'mojada'],
    apaga: ['sensor', 'caja'], final: [],
  };

  // La lectura flotando sobre el sensor.
  let lecturaTexto = '';
  function ponerLectura(h, umbralTexto) {
    const texto = `${h.toFixed(1)}%`;
    if (texto === lecturaTexto) return;
    lecturaTexto = texto;
    if (lbl.lectura) { escena.remove(lbl.lectura); lbl.lectura.material.map.dispose(); lbl.lectura.material.dispose(); }
    const seco = h < umbralTexto;
    lbl.lectura = etiqueta(texto, { alto: 0.03, color: seco ? '#8a4d00' : '#1f6b3d' });
    lbl.lectura.position.set(SENSOR.x, 1.75, SENSOR.z);
    lbl.lectura.material.opacity = 1;
    escena.add(lbl.lectura);
  }

  // La pantalla de la computadora: lo que decide, con los números.
  let pantallaClave = '';
  function pintarPantalla(m, punto) {
    const estado = m.rele ? 'REGANDO' : (m.humedad < punto && (m.paso === 'decide')) ? 'REGAR' : 'ESPERAR';
    const clave = `${m.humedad.toFixed(1)}|${estado}`;
    if (clave === pantallaClave) return;
    pantallaClave = clave;
    const x = lienzoPantalla.getContext('2d');
    x.fillStyle = '#f6f4ef'; x.fillRect(0, 0, 640, 420);
    x.fillStyle = '#13283d'; x.fillRect(0, 0, 640, 70);
    x.fillStyle = '#ffffff'; x.font = '700 34px "Figtree Variable", "Segoe UI", sans-serif';
    x.textBaseline = 'middle'; x.fillText('IonDroplet', 28, 36);
    x.fillStyle = '#4a5a6a'; x.font = '600 30px "Figtree Variable", "Segoe UI", sans-serif';
    x.fillText('Humedad', 28, 125); x.fillText('Punto de riego', 28, 205);
    x.fillStyle = '#13283d'; x.font = '800 54px "Figtree Variable", "Segoe UI", sans-serif';
    x.fillText(`${m.humedad.toFixed(1)}%`, 330, 125); x.fillText(`${punto}%`, 330, 205);
    const color = estado === 'ESPERAR' ? '#26794a' : '#2f6fd6';
    x.fillStyle = color; x.beginPath(); x.roundRect(28, 270, 584, 110, 24); x.fill();
    x.fillStyle = '#ffffff'; x.font = '800 52px "Figtree Variable", "Segoe UI", sans-serif';
    x.textAlign = 'center'; x.fillText(estado === 'REGANDO' ? 'Regando' : estado === 'REGAR' ? 'Regar ahora' : 'No hace falta regar', 320, 326);
    x.textAlign = 'left';
    texPantalla.needsUpdate = true;
  }

  // ── Cámara: una pose por paso, y una transición suave entre pasos ──
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const CENTRO = v(-2.2, 0.2, 0.6);

  function orbita(az, R, H, centro = CENTRO) {
    return { pos: v(centro.x + Math.sin(az) * R, centro.y + H, centro.z + Math.cos(az) * R), mira: centro.clone() };
  }
  function entrePoses(a, b, k) {
    return { pos: a.pos.clone().lerp(b.pos, k), mira: a.mira.clone().lerp(b.mira, k) };
  }

  function pose(m) {
    const p = m.avance;
    switch (m.paso) {
      case 'inicio': return orbita(lerp(0.62, 0.32, p), 15.5, 7.2);
      case 'mide': return { pos: v(6.9, 2.4, 8.8).lerp(v(6.1, 1.9, 7.7), suave(p)), mira: v(2.5, 0.15, 2.7) };
      case 'avisa': {
        const s = suave(tramo(p, 0.1, 0.85));
        const b = arco.getPoint(s);
        return { pos: v(b.x + 4.6, b.y + 1.7, b.z + 7.6), mira: b };
      }
      case 'decide': return { pos: v(-4.6, 2.9, 7.6).lerp(v(-5.3, 2.5, 6.6), suave(p)), mira: v(-7.9, 1.05, 2.1) };
      case 'ioniza': {
        const a = { pos: v(-6.0, 3.6, 5.0), mira: v(-8.4, 1.0, 0.7) };
        const b = { pos: v(-7.35, 1.9, 2.9), mira: v(-8.55, 0.9, 0.6) };
        return entrePoses(a, b, suave(tramo(p, 0, 0.75)));
      }
      case 'bomba': return { pos: v(-4.7, 2.9, 2.2).lerp(v(-5.1, 2.4, 1.8), suave(p)), mira: v(-6.8, 0.35, 0.45) };
      case 'viaja': {
        const d = m.frente * rutaHeroe.L;
        const lider = rutaHeroe.en(Math.max(0, d - 0.25), tmp.clone());
        const adelante = rutaHeroe.en(d + 0.6, tmp2.clone());
        return { pos: v(lider.x - 1.6, lider.y + 2.7, lider.z + 2.9), mira: adelante };
      }
      case 'gotea': return { pos: v(3.9, 1.05, 6.6).lerp(v(3.3, 0.75, 5.7), suave(p)), mira: v(1.95, -0.2, 2.85) };
      case 'apaga': {
        const a = { pos: v(5.6, 1.7, 7.9), mira: v(2.4, -0.05, 2.8) };
        const b = orbita(0.5, 13, 5.4, v(-2.6, 0.3, 1.2));
        return entrePoses(a, b, suave(tramo(p, 0.4, 1)));
      }
      case 'final': return orbita(lerp(0.5, 0.78, p), 13 + 3 * suave(p), 5.4 + 2 * suave(p), v(-2.6, 0.3, 1.2));
      default: return orbita(0.4, 15, 7);
    }
  }

  // ── Dibujo de un cuadro ──
  let t = 0;
  let flujo = 0;
  const dummy = new THREE.Object3D();
  const colorSeco = new THREE.Color(COL.secaTop), colorBien = new THREE.Color(COL.bienTop);

  function opacidad(material, objetivo, dt, rapidez = 4) {
    material.opacity = lerp(material.opacity, objetivo, 1 - Math.exp(-rapidez * dt));
  }

  function dibujar(m, dt, anterior) {
    t += dt;
    const p = m.avance;

    // Cámara (con transición de 1.4 s desde donde terminó el paso anterior).
    let cam = pose(m);
    const enPaso = p * m.duracion;
    if (anterior && enPaso < 1.4) cam = entrePoses(pose(anterior), cam, suave(enPaso / 1.4));
    camara.position.copy(cam.pos);
    camara.lookAt(cam.mira);

    // Etiquetas del paso.
    const visibles = ETIQUETAS_POR_PASO[m.paso] || [];
    for (const [k, s] of Object.entries(lbl)) {
      if (!s || k === 'lectura') continue;
      opacidad(s.material, visibles.includes(k) ? 1 : 0, dt);
    }
    ponerLectura(m.humedad, PUNTO);
    pintarPantalla(m, PUNTO);

    // Color de la tierra: seco abajo del punto; bien cuando lo pasa.
    const k = m.humedad >= PUNTO ? 1 : 0;
    M.tierraTop.color.lerp(k ? colorBien : colorSeco, 1 - Math.exp(-1.5 * dt));

    // Sensor: foquito que parpadea con cada lectura y ondas de wifi.
    ledSensor.material.color.set(Math.sin(t * 6) > 0.2 ? 0x5cff9a : 0x2c6b46);
    const fuerteWifi = m.paso === 'mide' || m.paso === 'avisa' || (m.paso === 'apaga' && p < 0.35);
    ondas.forEach((o, i) => {
      const f = vuelta(t * 0.8 + i / 3);
      o.scale.setScalar(1 + f * 2.6);
      o.quaternion.copy(camara.quaternion);
      o.material.opacity = (fuerteWifi ? 0.55 : 0.15) * (1 - f);
    });

    // La señal: sensor → caja (avisa y al final del riego), compu → caja (decide).
    let senalEn = null;
    if (m.paso === 'avisa') {
      const s = tramo(p, 0.1, 0.85);
      if (s > 0 && s < 1) senalEn = { curva: arco, s: suave(s) };
    } else if (m.paso === 'decide') {
      const s = tramo(p, 0.3, CLIC);
      if (s > 0 && s < 1) senalEn = { curva: usb, s: 1 - suave(s) };
    } else if (m.paso === 'apaga') {
      const s = tramo(p, 0.02, 0.3);
      if (s > 0 && s < 1) senalEn = { curva: arco, s: suave(s) };
    }
    senal.visible = !!senalEn;
    estela.forEach((e, i) => {
      e.visible = !!senalEn;
      if (senalEn) e.position.copy(senalEn.curva.getPoint(clamp(senalEn.s - (senalEn.curva === usb ? -1 : 1) * (i + 1) * 0.012, 0, 1)));
    });
    if (senalEn) {
      senal.position.copy(senalEn.curva.getPoint(senalEn.s));
      halo.scale.setScalar(1 + 0.25 * Math.sin(t * 12));
    }

    // Relé: foquito verde cerrado, rojo abierto; destello al hacer clic.
    ledRele.material.color.set(m.rele ? 0x3ddc84 : 0xd9483b);
    const clic = (m.paso === 'decide' && p >= CLIC && p < CLIC + 0.12) || (m.paso === 'apaga' && p >= SUELTA && p < SUELTA + 0.12);
    if (clic) {
      const f = m.paso === 'decide' ? (p - CLIC) / 0.12 : (p - SUELTA) / 0.12;
      destelloRele.scale.setScalar(1 + f * 6);
      destelloRele.material.opacity = 0.9 * (1 - f);
      destelloRele.quaternion.copy(camara.quaternion);
    } else destelloRele.material.opacity = 0;

    // Corriente por los cables de fuerza.
    chispas.visible = m.rele;
    if (m.rele) {
      for (let i = 0; i < N_CHISPAS; i++) {
        const c = cables[i % 3].curva;
        const s = vuelta(t * 0.55 + Math.floor(i / 3) / (N_CHISPAS / 3));
        dummy.position.copy(c.getPoint(s)); dummy.scale.setScalar(1); dummy.updateMatrix();
        chispas.setMatrixAt(i, dummy.matrix);
      }
      chispas.instanceMatrix.needsUpdate = true;
    }

    // Varillas: brillo, burbujas y chispas doradas mientras hay corriente.
    varillas.forEach((vv, i) => {
      vv.brillo.material.opacity = m.rele ? 0.22 + 0.12 * Math.sin(t * 9 + i * 2) : 0;
    });
    burbujas.visible = m.rele;
    iones.visible = m.rele;
    if (m.rele) {
      datosBurbujas.forEach((b, i) => {
        const f = vuelta(b.f + t * b.vel * 0.5);
        const x = VARILLAS_X[b.v] + Math.cos(b.a + t * 2) * b.r;
        const z = TANQUE.z + Math.sin(b.a + t * 2) * b.r;
        dummy.position.set(x, 0.3 + f * 1.15, z); dummy.scale.setScalar(0.6 + f * 0.8); dummy.updateMatrix();
        burbujas.setMatrixAt(i, dummy.matrix);
      });
      burbujas.instanceMatrix.needsUpdate = true;
      datosIones.forEach((q, i) => {
        const a = q.a + t * q.w;
        dummy.position.set(TANQUE.x + Math.cos(a) * q.r, q.y + Math.sin(t * 1.3 + q.a) * 0.08, TANQUE.z + Math.sin(a) * q.r * 0.8);
        dummy.scale.setScalar(0.8 + 0.4 * Math.sin(t * 7 + i)); dummy.updateMatrix();
        iones.setMatrixAt(i, dummy.matrix);
      });
      iones.instanceMatrix.needsUpdate = true;
    }

    // Bomba: vibra y prende su foquito.
    cuerpoBomba.position.set(m.rele ? Math.sin(t * 70) * 0.008 : 0, m.rele ? Math.sin(t * 53) * 0.006 : 0, 0);
    luzBomba.material.color.set(m.rele ? COL.agua : 0x55605a);

    // Agua en la tubería: avanza mientras corre y se queda quieta al apagar.
    // Ya en el gotero del frente, la línea entera está llena.
    const llegada = m.frente >= 1 ? Infinity : m.frente * rutaHeroe.L;
    const corre = m.rele ? 1.5 : 0;
    flujo += corre * dt;
    particulas.forEach((q, i) => {
      const r = rutas[q.r];
      const hasta = llegada - r.desde;
      const d = vuelta((q.d0 + flujo) / r.L) * r.L;
      // En la rama del frente que sigue después del gotero, el agua llega un poco después.
      if (hasta <= 0 || d > hasta) { dummy.scale.setScalar(0); dummy.position.set(0, -50, 0); }
      else { r.en(d, dummy.position); dummy.scale.setScalar(1); }
      dummy.updateMatrix();
      agua.setMatrixAt(i, dummy.matrix);
    });
    agua.instanceMatrix.needsUpdate = true;
    const avanza = m.rele && m.frente > 0 && m.frente < 1;
    punta.material.opacity = lerp(punta.material.opacity, avanza ? 0.55 + 0.15 * Math.sin(t * 10) : 0, 1 - Math.exp(-6 * dt));
    if (avanza) rutaHeroe.en(m.frente * rutaHeroe.L, punta.position);

    // Goteros: la gota se hincha, cae y salpica; la mancha crece con el riego.
    for (const g of goteros) {
      const lleno = llegada >= g.dist;
      const gotea = m.rele && lleno && (m.paso === 'viaja' || m.paso === 'gotea' || m.paso === 'apaga');
      g.gota.visible = gotea;
      if (gotea) {
        const f = vuelta(g.fase + t * 0.85);
        if (f < 0.6) { g.gota.position.set(g.pos.x, g.pos.y - 0.03, g.pos.z); g.gota.scale.setScalar(0.4 + f); }
        else { const c = (f - 0.6) / 0.4; g.gota.position.set(g.pos.x, lerp(g.pos.y - 0.05, 0.01, c * c), g.pos.z); g.gota.scale.set(0.8, 1.3, 0.8); }
        if (f > 0.97 && !g.cayo) { g.cayo = true; g.salpicaDesde = t; }
        if (f < 0.5) g.cayo = false;
      }
      const ds = t - (g.salpicaDesde ?? -9);
      g.salpicon.material.opacity = ds < 0.5 ? 0.8 * (1 - ds / 0.5) : 0;
      g.salpicon.scale.setScalar(1 + ds * 6);
      const w = m.mojado;
      g.mancha.scale.setScalar(0.3 + 0.75 * w);
    }
    M.mancha.opacity = 0.55 * m.mojado;
    bulbos.forEach(b => {
      const w = m.mojado;
      const k2 = b.userData.k * (0.2 + 0.8 * w);
      b.scale.set(0.9 * k2, 0.75 * k2, 1);
      b.material.opacity = (b.userData.k > 0.9 ? 0.42 : 0.5) * Math.min(1, w * 2);
    });

    renderer.render(escena, camara);
  }
  function medir() {
    const w = contenedor.clientWidth || 960, h = contenedor.clientHeight || 540;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(medir);
  ro.observe(contenedor);
  medir();

  function destruir() {
    ro.disconnect();
    escena.traverse(o => {
      if (o.isMesh || o.isSprite) {
        o.geometry?.dispose();
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach(mm => { mm?.map?.dispose(); mm?.dispose?.(); });
      }
    });
    renderer.forceContextLoss();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { dibujar, destruir };
}
