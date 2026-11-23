/**
 * Trazo 2.0 · la constelación en 3D (three.js). Se carga aparte, solo al abrir el Mapa, y dibuja lo que arma
 * `constelacion-datos`: la espiral como una cinta (lo que ya pasó, encendido), una estrella por bloque, el punto de hoy y
 * polvo de fondo para dar profundidad. La cámara gira sola muy despacio; se arrastra para girar y se pellizca para acercar.
 * Sin movimiento (prefers-reduced-motion) queda quieta y solo se redibuja cuando la tocás.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, Line, Mesh, NormalBlending, PerspectiveCamera, Points, Scene, ShaderMaterial, Vector3, WebGLRenderer } from 'three';
import { SUBE, puntoEn, type Colores, type Constelacion, type Estrella } from './constelacion-datos';

export type Vista = 'ahora' | 'todo';
export interface OpcionesEscena {
  lienzo: HTMLCanvasElement;
  /** La caja de la escena: da el tamaño y recibe los gestos. */
  caja: HTMLElement;
  /** Donde van los rótulos (HTML encima del lienzo). */
  capa: HTMLElement;
  datos: Constelacion;
  colores: Colores;
  vista: Vista;
  quieto: boolean;
  onElegir: (e: Estrella) => void;
  onListo: () => void;
  onPerdida: () => void;
}
export interface Escena {
  ver(v: Vista): void;
  poner(datos: Constelacion, colores: Colores): void;
  destruir(): void;
}

const FOV = 38;
const TAN = Math.tan((FOV * Math.PI) / 360);
/** El dibujo de cada estrella ocupa tres veces su radio: el resto es halo. */
const HALO = 3;
const TIPO = { futuro: 0, curso: 1, hecho: 2, sol: 3, hoy: 4, polvo: 5 } as const;

const VERT_PUNTOS = /* glsl */ `
attribute vec3 aColor;
attribute float aTam;
attribute float aTipo;
attribute float aBrillo;
attribute float aAlerta;
attribute float aFase;
uniform float uEscala;
uniform float uTiempo;
uniform float uTope;
varying vec3 vColor;
varying float vTipo;
varying float vBrillo;
varying float vAlerta;
varying float vFase;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float late = 1.0 + 0.07 * sin(uTiempo * 1.3 + aFase * 6.2832);
  gl_PointSize = min(uTope, aTam * 2.0 * ${HALO.toFixed(1)} * uEscala * late / max(0.1, -mv.z));
  vColor = aColor; vTipo = aTipo; vBrillo = aBrillo; vAlerta = aAlerta; vFase = aFase;
}`;

const FRAG_PUNTOS = /* glsl */ `
uniform float uClaro;
uniform float uTiempo;
uniform vec3 uTinta;
uniform vec3 uCritico;
varying vec3 vColor;
varying float vTipo;
varying float vBrillo;
varying float vAlerta;
varying float vFase;
const float N = ${(1 / HALO).toFixed(4)};
void main() {
  float d = length(gl_PointCoord * 2.0 - 1.0);
  if (d > 1.0) discard;
  float aa = fwidth(d) * 1.2;
  float nucleo = 1.0 - smoothstep(N - aa, N + aa, d);
  float halo = pow(1.0 - d, 2.6);
  vec3 c = vColor;
  // cuerpo: lo que tapa (el disco). luz: el halo, que suma. aro: un anillo fino. tono: cuánto brilla el disco.
  float cuerpo = 0.0, luz = 0.0, aro = 0.0, tono = 1.0, peso = 1.0;
  if (vTipo > 4.5) {
    luz = pow(1.0 - d, 1.5) * vBrillo;
  } else if (vTipo > 3.5) {
    // Hoy: una mira (un punto y un aro, para no confundirla con una estrella hecha) y una onda que se abre.
    float f = fract(uTiempo * 0.45);
    float r = mix(N * 1.3, 0.96, f);
    float onda = (1.0 - smoothstep(0.0, aa * 2.0 + 0.03, abs(d - r))) * (1.0 - f) * 0.8;
    float mira = 1.0 - smoothstep(0.0, aa * 1.5 + 0.02, abs(d - N * 1.12));
    cuerpo = 1.0 - smoothstep(N * 0.5 - aa, N * 0.5 + aa, d);
    aro = max(mira, onda); luz = halo * 0.6;
    // En claro, la mira va en tinta (el amarillo solo no se lee sobre el papel).
    if (uClaro > 0.5) c = mix(c, uTinta, max(mira, onda) * (1.0 - cuerpo) * 0.9);
  } else if (vTipo > 2.5) {
    // El centro: de donde sale todo.
    cuerpo = nucleo; luz = halo * 0.5;
  } else {
    float hecho = step(1.5, vTipo);
    float fuerza = max(hecho, vBrillo);
    cuerpo = nucleo;
    peso = mix(0.5, 1.0, fuerza);
    tono = mix(0.5, 1.0, fuerza) * mix(0.8, 1.14, 1.0 - min(1.0, d / N));
    luz = halo * fuerza * mix(0.45, 0.85, hecho);
    // En claro, lo hecho (amarillo) lleva borde de tinta para que se lea.
    if (uClaro > 0.5 && hecho > 0.5) c = mix(c, uTinta, smoothstep(N - aa * 3.0 - 0.03, N - aa, d) * nucleo * 0.85);
    // El que corre hoy: un aro fino alrededor.
    if (hecho < 0.5 && vTipo > 0.5 && vBrillo > 0.99) aro = (1.0 - smoothstep(0.0, aa * 1.5 + 0.012, abs(d - N * 1.55))) * 0.9;
    // Vencido: aro rojo.
    if (vAlerta > 0.5) {
      float rojo = 1.0 - smoothstep(0.0, aa * 1.5 + 0.016, abs(d - N * 1.5));
      c = mix(c, uCritico, rojo);
      aro = max(aro, rojo);
    }
  }
  vec3 s = linearToOutputTexel(vec4(c, 1.0)).rgb;
  if (uClaro > 0.5) {
    // Claro: tinta sobre papel. El disco, lleno; el halo, apenas.
    float a = max(max(cuerpo * peso, aro), luz * 0.28);
    gl_FragColor = vec4(s * a, a);
  } else {
    // Oscuro: el disco tapa lo que tiene detrás y el halo suma luz.
    gl_FragColor = vec4(s * (cuerpo * tono + (luz + aro) * (1.0 - cuerpo)), cuerpo * 0.94);
  }
}`;

const VERT_CINTA = /* glsl */ `
attribute vec3 aColor;
attribute float aT;
attribute float aLado;
attribute vec2 aRadial;
uniform float uHoy;
uniform float uAncho;
varying vec3 vColor;
varying float vT;
void main() {
  float pasado = 1.0 - step(uHoy, aT);
  float ancho = uAncho * mix(1.0, 1.6, pasado);
  vec3 p = position + vec3(aRadial.x, 0.0, aRadial.y) * aLado * ancho;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  vColor = aColor; vT = aT;
}`;

const FRAG_CINTA = /* glsl */ `
uniform float uHoy;
uniform float uPasado;
uniform float uFuturo;
varying vec3 vColor;
varying float vT;
void main() {
  float pasado = 1.0 - smoothstep(uHoy - 0.003, uHoy + 0.003, vT);
  gl_FragColor = vec4(vColor, mix(uFuturo, uPasado, pasado));
  #include <colorspace_fragment>
}`;

/** Azar con semilla: el polvo cae siempre en el mismo lugar. */
function azar(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Rotulo { el: HTMLElement; pos: Vector3; tipo: 'fase' | 'estrella' | 'ahora' | 'sobre' | 'hoy'; bajo: number; w: number; h: number; x: number; y: number; ver: boolean }

export function crearEscena(o: OpcionesEscena): Escena {
  const { lienzo, caja, capa } = o;
  const renderer = new WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);

  const escena = new Scene();
  const camara = new PerspectiveCamera(FOV, 1, 0.1, 400);
  let datos = o.datos;
  let colores = o.colores;
  let ancho = 1, alto = 1;

  const matPuntos = new ShaderMaterial({
    vertexShader: VERT_PUNTOS, fragmentShader: FRAG_PUNTOS, transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true,
    uniforms: { uEscala: { value: 1 }, uTiempo: { value: 0 }, uTope: { value: 256 }, uClaro: { value: 0 }, uTinta: { value: new Color() }, uCritico: { value: new Color() } },
  });
  const uniCinta = { uHoy: { value: 0 }, uAncho: { value: 0.03 }, uPasado: { value: 0.8 }, uFuturo: { value: 0.3 } };
  const matCinta = new ShaderMaterial({ vertexShader: VERT_CINTA, fragmentShader: FRAG_CINTA, transparent: true, depthTest: false, depthWrite: false, side: DoubleSide, uniforms: uniCinta });
  const matHilo = new ShaderMaterial({ vertexShader: VERT_CINTA, fragmentShader: FRAG_CINTA, transparent: true, depthTest: false, depthWrite: false, uniforms: uniCinta });

  const cinta = new Mesh(new BufferGeometry(), matCinta);
  const hilo = new Line(new BufferGeometry(), matHilo);
  const puntos = new Points(new BufferGeometry(), matPuntos);
  [cinta, hilo, puntos].forEach((x, i) => { x.frustumCulled = false; x.renderOrder = i; escena.add(x); });

  // ── La cámara: gira alrededor de un punto; `meta` es a dónde va, `cam` dónde está. ──
  const cam = { theta: 0, phi: 0.02, dist: 30, obj: new Vector3() };
  const meta = { theta: 0, phi: 0.02, dist: 30, obj: new Vector3() };
  const encaje = (radio: number) => radio / (TAN * Math.min(1, ancho / alto));
  /** La distancia para que entre un disco de ese radio, acostado, visto con esa inclinación. */
  const encajeDisco = (radio: number, phi: number) => Math.max(radio / (TAN * (ancho / alto)), (radio * Math.max(0.35, Math.cos(phi))) / TAN) * 1.05;
  const centro = () => new Vector3(0, (SUBE * datos.total) / 2, 0);
  const limites = () => ({ min: encaje(1.5), max: encaje(datos.radioMax * 1.3) });
  let vista: Vista = o.vista;

  function apuntar(v: Vista, alInstante = false) {
    vista = v;
    if (v === 'todo') {
      meta.obj.copy(centro());
      meta.phi = ancho < alto ? 0.6 : 0.95;
      meta.dist = encajeDisco(datos.radioMax + 0.3, meta.phi);
    } else {
      const p = datos.enCurso ? puntoEn(datos.hoy) : (datos.estrellas[0] ?? puntoEn(0));
      meta.obj.set(p.x, p.y, p.z);
      meta.phi = 1.0;
      meta.dist = encaje(3.1);
      // La cámara se para del lado de afuera: adelante queda hoy, y atrás, el resto del plan.
      const hacia = Math.atan2(p.x, p.z) + 0.5;
      meta.theta = cam.theta + Math.atan2(Math.sin(hacia - cam.theta), Math.cos(hacia - cam.theta));
    }
    if (alInstante) { cam.theta = meta.theta; cam.phi = meta.phi; cam.dist = meta.dist; cam.obj.copy(meta.obj); }
    quietoDesde = performance.now();
    sucio = true;
  }

  // ── Los datos: cinta, hilo y puntos. ──
  let rotulos: Rotulo[] = [];
  let sobre: Rotulo | null = null;
  const tmp = new Vector3();

  function poner(d: Constelacion, c: Colores) {
    datos = d; colores = c;
    const col = (css: string) => new Color(c.areas[css] ?? c.tinta2);
    const trazo = new Color(c.trazo);
    const tinta = new Color(c.tinta);

    // La cinta: dos vértices por muestra de la espiral, con el color del bloque que pasa por ahí.
    const porVuelta = 120;
    const n = Math.max(1, Math.round(d.total * porVuelta));
    const pos = new Float32Array((n + 1) * 2 * 3), color = new Float32Array((n + 1) * 2 * 3), ts = new Float32Array((n + 1) * 2), lado = new Float32Array((n + 1) * 2), radial = new Float32Array((n + 1) * 2 * 2);
    const hPos = new Float32Array((n + 1) * 3), hColor = new Float32Array((n + 1) * 3), hT = new Float32Array(n + 1);
    const indices: number[] = [];
    let k = 0;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * d.total;
      while (k < d.estrellas.length - 1 && d.estrellas[k].hasta <= t) k++;
      const e = d.estrellas[k];
      const cc = e ? col(e.area) : tinta;
      const p = puntoEn(t);
      for (let s = 0; s < 2; s++) {
        const j = i * 2 + s;
        pos.set([p.x, p.y, p.z], j * 3); color.set([cc.r, cc.g, cc.b], j * 3);
        ts[j] = t; lado[j] = s ? 1 : -1; radial.set([Math.cos(p.a), Math.sin(p.a)], j * 2);
      }
      hPos.set([p.x, p.y, p.z], i * 3); hColor.set([cc.r, cc.g, cc.b], i * 3); hT[i] = t;
      if (i < n) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const gc = new BufferGeometry();
    gc.setAttribute('position', new BufferAttribute(pos, 3)); gc.setAttribute('aColor', new BufferAttribute(color, 3));
    gc.setAttribute('aT', new BufferAttribute(ts, 1)); gc.setAttribute('aLado', new BufferAttribute(lado, 1)); gc.setAttribute('aRadial', new BufferAttribute(radial, 2));
    gc.setIndex(indices);
    cinta.geometry.dispose(); cinta.geometry = gc;
    const gh = new BufferGeometry();
    gh.setAttribute('position', new BufferAttribute(hPos, 3)); gh.setAttribute('aColor', new BufferAttribute(hColor, 3)); gh.setAttribute('aT', new BufferAttribute(hT, 1));
    gh.setAttribute('aLado', new BufferAttribute(new Float32Array(n + 1), 1)); gh.setAttribute('aRadial', new BufferAttribute(new Float32Array((n + 1) * 2), 2));
    hilo.geometry.dispose(); hilo.geometry = gh;
    uniCinta.uHoy.value = d.enCurso || d.hoy > 0 ? d.hoy : -1;
    uniCinta.uFuturo.value = c.claro ? 0.4 : 0.34;
    uniCinta.uPasado.value = c.claro ? 1 : 0.72;

    // Los puntos: estrellas, el centro, hoy y el polvo.
    const POLVO = c.claro ? 120 : 240;
    const total = d.estrellas.length + 2 + POLVO;
    const pp = new Float32Array(total * 3), pc = new Float32Array(total * 3), tam = new Float32Array(total), tipo = new Float32Array(total), brillo = new Float32Array(total), alerta = new Float32Array(total), fase = new Float32Array(total);
    let i = 0;
    const punto = (x: number, y: number, z: number, cc: Color, t: number, tp: number, b = 1, al = 0, f = 0) => {
      pp.set([x, y, z], i * 3); pc.set([cc.r, cc.g, cc.b], i * 3); tam[i] = t; tipo[i] = tp; brillo[i] = b; alerta[i] = al; fase[i] = f; i++;
    };
    const rnd = azar(7);
    for (let j = 0; j < POLVO; j++) {
      const r = d.radioMax * (0.5 + rnd() * 2.2), a = rnd() * Math.PI * 2, y = (rnd() - 0.5) * d.radioMax * 1.6;
      punto(r * Math.cos(a), y, r * Math.sin(a), tinta, 0.012 + rnd() * 0.022, TIPO.polvo, (c.claro ? 0.16 : 0.3) + rnd() * 0.35, 0, rnd());
    }
    punto(0, 0, 0, tinta, c.claro ? 0.13 : 0.2, TIPO.sol);
    for (const e of d.estrellas) {
      const hecho = e.estado === 'hecho';
      const b = e.ahora ? 1 : e.trabajo > 0 ? 0.85 : e.estado === 'pausado' ? 0.4 : 0.62;
      punto(e.x, e.y, e.z, hecho ? trazo : col(e.area), e.tam, hecho ? TIPO.hecho : e.ahora || e.trabajo > 0 ? TIPO.curso : TIPO.futuro, b, e.estado === 'vencido' ? 1 : 0, (e.t * 0.37) % 1);
    }
    if (d.enCurso) { const p = puntoEn(d.hoy); punto(p.x, p.y, p.z, trazo, 0.13, TIPO.hoy); } else punto(0, 0, 0, trazo, 0, TIPO.polvo, 0);
    const gp = new BufferGeometry();
    gp.setAttribute('position', new BufferAttribute(pp, 3)); gp.setAttribute('aColor', new BufferAttribute(pc, 3)); gp.setAttribute('aTam', new BufferAttribute(tam, 1));
    gp.setAttribute('aTipo', new BufferAttribute(tipo, 1)); gp.setAttribute('aBrillo', new BufferAttribute(brillo, 1)); gp.setAttribute('aAlerta', new BufferAttribute(alerta, 1)); gp.setAttribute('aFase', new BufferAttribute(fase, 1));
    puntos.geometry.dispose(); puntos.geometry = gp;

    const mezcla = c.claro ? NormalBlending : AdditiveBlending;
    for (const m of [matCinta, matHilo]) { m.blending = mezcla; m.needsUpdate = true; }
    matPuntos.uniforms.uClaro.value = c.claro ? 1 : 0;
    (matPuntos.uniforms.uTinta.value as Color).set(c.tinta);
    (matPuntos.uniforms.uCritico.value as Color).set(c.critico);

    // Los rótulos: las fases (donde empieza cada vuelta), los bloques de la fase que corre y el que señalás.
    capa.textContent = '';
    rotulos = [];
    const rotulo = (tipoR: Rotulo['tipo'], texto: string, p: { x: number; y: number; z: number }, bajo: number) => {
      const el = document.createElement('span');
      el.className = `cs-rotulo ${tipoR}`;
      el.textContent = texto;
      capa.appendChild(el);
      const r: Rotulo = { el, pos: new Vector3(p.x, p.y, p.z), tipo: tipoR, bajo, w: el.offsetWidth, h: el.offsetHeight, x: NaN, y: NaN, ver: false };
      rotulos.push(r);
      return r;
    };
    const faseHoy = d.ahora?.fase ?? 0;
    for (const e of d.estrellas) if (e.ahora) rotulo('ahora', e.nombre, e, e.tam);
    if (d.enCurso) rotulo('hoy', 'hoy', puntoEn(d.hoy), 0.13);
    sobre = rotulo('sobre', '', { x: 0, y: 0, z: 0 }, 0);
    for (const e of d.estrellas) if (e.fase === faseHoy && !e.ahora) rotulo('estrella', e.nombre, e, e.tam);
    const orden = [...d.vueltas].sort((a, b) => Math.abs(a.t - faseHoy) - Math.abs(b.t - faseHoy));
    for (const v of orden) rotulo('fase', v.corto, puntoEn(v.t - 0.012), 0);
    sucio = true;
  }

  // ── El tamaño. ──
  function medir() {
    const r = caja.getBoundingClientRect();
    ancho = Math.max(1, Math.round(r.width)); alto = Math.max(1, Math.round(r.height));
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
    matPuntos.uniforms.uEscala.value = (alto * dpr) / (2 * TAN);
    matPuntos.uniforms.uTope.value = 220 * dpr;
    sucio = true;
  }

  // ── Elegir una estrella: la más cercana al dedo. ──
  function aPantalla(v: Vector3) {
    tmp.copy(v).project(camara);
    return { x: (tmp.x * 0.5 + 0.5) * ancho, y: (-tmp.y * 0.5 + 0.5) * alto, fuera: tmp.z > 1 || tmp.z < -1 };
  }
  const v3 = new Vector3();
  function estrellaEn(x: number, y: number): Estrella | null {
    let mejor: Estrella | null = null;
    let dMin = Infinity;
    for (const e of datos.estrellas) {
      const p = aPantalla(v3.set(e.x, e.y, e.z));
      if (p.fuera) continue;
      const lejos = camara.position.distanceTo(v3);
      const radio = (e.tam * alto) / (2 * TAN * lejos);
      const dd = Math.hypot(p.x - x, p.y - y);
      if (dd < Math.max(22, radio + 10) && dd < dMin) { dMin = dd; mejor = e; }
    }
    return mejor;
  }

  // ── Los gestos. ──
  const dedos = new Map<number, { x: number; y: number }>();
  let toque = { x: 0, y: 0, t: 0, movido: false };
  let pellizco = 0;
  let quietoDesde = performance.now();
  let impulso = 0;
  const local = (e: { clientX: number; clientY: number }) => { const r = caja.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const acercar = (factor: number) => { const l = limites(); meta.dist = Math.max(l.min, Math.min(l.max, meta.dist * factor)); quietoDesde = performance.now(); sucio = true; };
  const distDedos = () => { const [a, b] = [...dedos.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };

  function abajo(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { caja.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
    if (dedos.size === 1) toque = { x: e.clientX, y: e.clientY, t: performance.now(), movido: false };
    if (dedos.size === 2) { pellizco = distDedos(); toque.movido = true; }
    impulso = 0;
  }
  function mover(e: PointerEvent) {
    const d = dedos.get(e.pointerId);
    if (!d) {
      if (e.pointerType === 'mouse') senalar(estrellaEn(local(e).x, local(e).y));
      return;
    }
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    d.x = e.clientX; d.y = e.clientY;
    if (dedos.size === 2) {
      const ahora = distDedos();
      if (pellizco > 0 && ahora > 0) acercar(pellizco / ahora);
      pellizco = ahora;
      return;
    }
    if (!toque.movido && Math.hypot(e.clientX - toque.x, e.clientY - toque.y) < 7) return;
    toque.movido = true;
    const giro = -dx * 0.0055;
    meta.theta += giro; cam.theta += giro;
    impulso = giro;
    if (e.pointerType === 'mouse') { meta.phi = Math.max(0.12, Math.min(1.32, meta.phi - dy * 0.0045)); cam.phi = meta.phi; }
    quietoDesde = performance.now();
    sucio = true;
  }
  function arriba(e: PointerEvent) {
    if (!dedos.delete(e.pointerId)) return;
    pellizco = 0;
  }
  /** Elegir va en el clic (no al soltar): si la hoja se abriera antes, el clic que viene después la cerraría. */
  function clic(e: MouseEvent) {
    if (toque.movido || e.detail === 0) return;
    const p = local(e);
    const est = estrellaEn(p.x, p.y);
    if (est) o.onElegir(est);
  }
  function cancelar(e: PointerEvent) { dedos.delete(e.pointerId); pellizco = 0; }
  function rueda(e: WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    acercar(Math.exp(e.deltaY * 0.01));
  }
  function tecla(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { meta.theta += e.key === 'ArrowLeft' ? -0.35 : 0.35; }
    else if (e.key === '+' || e.key === '=') acercar(0.8);
    else if (e.key === '-') acercar(1.25);
    else return;
    e.preventDefault();
    quietoDesde = performance.now();
    sucio = true;
  }
  function salir() { senalar(null); }
  let senalada: Estrella | null = null;
  function senalar(e: Estrella | null) {
    if (e === senalada || !sobre) return;
    senalada = e;
    caja.style.cursor = e ? 'pointer' : '';
    if (e && !(e.ahora)) { sobre.el.textContent = e.nombre; sobre.pos.set(e.x, e.y, e.z); sobre.bajo = e.tam; sobre.w = sobre.el.offsetWidth; sobre.h = sobre.el.offsetHeight; }
    sucio = true;
  }

  caja.addEventListener('pointerdown', abajo);
  caja.addEventListener('pointermove', mover);
  caja.addEventListener('pointerup', arriba);
  caja.addEventListener('click', clic);
  caja.addEventListener('pointercancel', cancelar);
  caja.addEventListener('pointerleave', salir);
  caja.addEventListener('wheel', rueda, { passive: false });
  caja.addEventListener('keydown', tecla);

  // ── Los rótulos siguen a sus puntos; si dos se pisan, queda el más importante. ──
  function ubicarRotulos() {
    const puestos: { x0: number; y0: number; x1: number; y1: number }[] = [];
    const cerca = cam.dist < encaje(3.1) * 2.1;
    // Hoy y la estrella que corre no se tapan con ningún rótulo.
    const hoyP = datos.enCurso ? (() => { const q = puntoEn(datos.hoy); return aPantalla(v3.set(q.x, q.y, q.z)); })() : null;
    if (hoyP && !hoyP.fuera) puestos.push({ x0: hoyP.x - 9, y0: hoyP.y - 9, x1: hoyP.x + 9, y1: hoyP.y + 9 });
    if (datos.ahora) { const q = aPantalla(v3.set(datos.ahora.x, datos.ahora.y, datos.ahora.z)); puestos.push({ x0: q.x - 10, y0: q.y - 10, x1: q.x + 10, y1: q.y + 10 }); }
    for (const r of rotulos) {
      let ver = r.tipo === 'fase' || r.tipo === 'ahora' || r.tipo === 'hoy' || (r.tipo === 'estrella' && cerca) || (r.tipo === 'sobre' && !!senalada && !senalada.ahora);
      let x = 0, y = 0;
      if (ver) {
        const p = aPantalla(r.pos);
        const lejos = camara.position.distanceTo(r.pos);
        const radio = r.bajo ? (r.bajo * alto) / (2 * TAN * lejos) : 0;
        x = p.x - r.w / 2; y = r.tipo === 'fase' ? p.y - r.h / 2 : p.y + radio + 5;
        if (r.tipo === 'fase') x = p.x - r.w - 6;
        // El rótulo del que corre va del lado contrario a hoy, para no taparlo.
        if (r.tipo === 'ahora') y = hoyP && hoyP.y >= p.y ? p.y - radio * 1.6 - 8 - r.h : p.y + radio * 1.6 + 8;
        // "hoy" va del lado contrario a la estrella que corre.
        if (r.tipo === 'hoy') { const q = datos.ahora ? aPantalla(v3.set(datos.ahora.x, datos.ahora.y, datos.ahora.z)) : null; y = q && q.y > p.y ? p.y - radio * 1.5 - 5 - r.h : p.y + radio * 1.5 + 5; }
        if (p.fuera || x < 2 || y < 2 || x + r.w > ancho - 2 || y + r.h > alto - 2) ver = false;
        else if (puestos.some((q) => x < q.x1 + 4 && x + r.w > q.x0 - 4 && y < q.y1 + 2 && y + r.h > q.y0 - 2)) ver = false;
        else puestos.push({ x0: x, y0: y, x1: x + r.w, y1: y + r.h });
      }
      if (ver !== r.ver) { r.ver = ver; r.el.classList.toggle('ver', ver); }
      if (ver && !(Math.abs(x - r.x) <= 0.2 && Math.abs(y - r.y) <= 0.2)) { r.x = x; r.y = y; r.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`; }
    }
  }

  // ── El cuadro. ──
  let sucio = true;
  let visible = true;
  let vivo = true;
  let raf = 0;
  let antes = performance.now();
  let ultimoDibujo = 0;
  let primero = true;
  const t0 = performance.now();

  function cuadro() {
    if (!vivo) return;
    raf = requestAnimationFrame(cuadro);
    // Un solo reloj: el de performance.now() (el del cuadro puede ser otro).
    const ahora = performance.now();
    if (!visible || document.hidden) { antes = ahora; return; }
    const dt = Math.min(0.05, (ahora - antes) / 1000);
    antes = ahora;
    const tocando = dedos.size > 0;
    // Inercia al soltar y giro lento cuando nadie toca.
    if (!o.quieto && !tocando && Math.abs(impulso) > 0.0002) { meta.theta += impulso; impulso *= Math.exp(-dt * 5); sucio = true; }
    const solo = !o.quieto && !tocando && ahora - quietoDesde > 2600;
    if (solo) meta.theta += dt * 0.03;
    // Con movimiento reducido la cámara no vuela: salta a donde va (Hoy, Todo, las flechas, al soltar o al cambiar el tamaño).
    const k = o.quieto ? 1 : 1 - Math.exp(-dt * 3.4);
    const falta = Math.abs(meta.theta - cam.theta) + Math.abs(meta.phi - cam.phi) + Math.abs(meta.dist - cam.dist) / 10 + cam.obj.distanceTo(meta.obj);
    const volando = falta > 0.0006;
    if (volando) {
      cam.theta += (meta.theta - cam.theta) * (tocando ? 1 : k); cam.phi += (meta.phi - cam.phi) * k; cam.dist += (meta.dist - cam.dist) * k; cam.obj.lerp(meta.obj, k);
    }
    // Quieta (o sin movimiento): no hace falta redibujar. Sola, alcanza con 30 cuadros por segundo.
    if (o.quieto && !volando && !sucio) return;
    if (!volando && !sucio && !tocando && ahora - ultimoDibujo < 32) return;
    ultimoDibujo = ahora;
    sucio = false;
    const s = Math.sin(cam.phi);
    camara.position.set(cam.obj.x + cam.dist * s * Math.sin(cam.theta), cam.obj.y + cam.dist * Math.cos(cam.phi), cam.obj.z + cam.dist * s * Math.cos(cam.theta));
    camara.lookAt(cam.obj);
    camara.updateMatrixWorld();
    matPuntos.uniforms.uTiempo.value = o.quieto ? 0 : (ahora - t0) / 1000;
    renderer.render(escena, camara);
    ubicarRotulos();
    if (primero) {
      primero = false;
      o.onListo();
      // Arranca igual que el mapa plano (de arriba) y vuela a la vista elegida.
      window.setTimeout(() => { if (vivo) apuntar(vista, o.quieto); }, o.quieto ? 0 : 420);
    }
  }

  const perdida = (e: Event) => { e.preventDefault(); o.onPerdida(); };
  lienzo.addEventListener('webglcontextlost', perdida);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { medir(); if (!primero) apuntar(vista); }) : null;
  ro?.observe(caja);
  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([x]) => { visible = x.isIntersecting; }) : null;
  io?.observe(caja);

  medir();
  poner(datos, colores);
  // El primer cuadro: de arriba y entero, como el mapa plano que está debajo.
  cam.obj.copy(centro()); meta.obj.copy(cam.obj);
  cam.dist = meta.dist = encaje(datos.radioMax + 0.9);
  raf = requestAnimationFrame(cuadro);

  return {
    ver: (v) => apuntar(v),
    poner, // sin volver a apuntar: si estabas mirando otra parte, te quedás ahí
    destruir() {
      vivo = false;
      cancelAnimationFrame(raf);
      ro?.disconnect(); io?.disconnect();
      caja.removeEventListener('pointerdown', abajo); caja.removeEventListener('pointermove', mover); caja.removeEventListener('pointerup', arriba); caja.removeEventListener('click', clic);
      caja.removeEventListener('pointercancel', cancelar); caja.removeEventListener('pointerleave', salir); caja.removeEventListener('wheel', rueda); caja.removeEventListener('keydown', tecla);
      lienzo.removeEventListener('webglcontextlost', perdida);
      caja.style.cursor = '';
      capa.textContent = '';
      for (const x of [cinta, hilo, puntos]) x.geometry.dispose();
      for (const m of [matPuntos, matCinta, matHilo]) m.dispose();
      renderer.dispose();
      renderer.forceContextLoss(); // el navegador da pocos contextos: se devuelve al salir
    },
  };
}
