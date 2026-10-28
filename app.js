import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ════════════════════════════════════════════════════════════════
   SECOND HEART — sheet-metal case configurator
   All units in millimetres.
   Sheet frame: the flat blank lies in XY, +Z = inside of the case.
   The root is rotated so the outside faces up while flat and the
   walls fold downwards around the mainboard.
   ════════════════════════════════════════════════════════════════ */

const T = 1.0;          // sheet thickness
const CORK_T = 5.0;     // cork sheet & pad thickness
const STANDOFF = CORK_T;// board rests on cork base pad
const PCB = 1.6;
const FEET = CORK_T;    // cork feet skewered onto bent metal foot prongs
const MARGIN = 6;       // board → wall clearance
const TOPCLEAR = 6;     // clearance above tallest part
const LIP = 6;          // front lip on bottom plate (below PCB level)
const TAB = 10;         // corner tabs
const R = 3;            // small outer radius
const CLAMP_W = 14;     // width of side metal clamps holding mainboard
const CLAMP_LIP = 4.5;  // top lip of metal clamp folding over PCB edge
const FOOT_W = 8;       // width of bent metal foot prong
const FOOT_LEN = 4.2;   // length of bent metal foot prong skewering cork

const SIDE_NAMES = { front: 'Vorne', back: 'Hinten', left: 'Links', right: 'Rechts' };

const FINISH = {
  alu:   { n: 'Aluminium roh', css: 'linear-gradient(135deg,#e4e4e2,#a9a9a6)', c: 0xc9c9c6, m: .85, r: .36, e: 0x2e2e2e },
  white: { n: 'Weiß',          css: '#f4f4f1', c: 0xf1f1ee, m: .04, r: .55, e: 0x9a9a98 },
  black: { n: 'Anthrazit',     css: '#38383a', c: 0x3a3a3d, m: .25, r: .55, e: 0xdcdcdc },
  red:   { n: 'Koralle / Terrakotta', css: '#c95d53', c: 0xbf5349, m: .12, r: .58, e: 0xf2f2f0 },
};

const STEPS = 5;

const S = {
  L: 240, B: 160, Hc: 20,
  ioSides: { front: false, back: true, left: true, right: false },
  tile: '8',
  finish: 'alu', vents: 'dots',
  text: '2ndHeart', engr: 'top', font: 'pixel',
  fold: 1, board: true, step: 0,
};

/* ───────── renderer / scene ───────── */
const canvas = document.getElementById('c');
const view = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.debug.checkShaderErrors = false;
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.9;

const camera = new THREE.PerspectiveCamera(32, 1, 5, 20000);
camera.position.set(420, 380, 520);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 120;
controls.maxDistance = 3000;
controls.target.set(0, 20, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d9d4, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(-260, 620, 320);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.radius = 6;
sun.shadow.bias = -0.0004;
Object.assign(sun.shadow.camera, { left: -500, right: 500, top: 500, bottom: -500, near: 10, far: 2000 });
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(4000, 4000),
  new THREE.ShadowMaterial({ opacity: 0.13 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

/* ───────── materials ───────── */
const caseMat = new THREE.MeshStandardMaterial();
const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: .16 });
const bendMat = new THREE.LineDashedMaterial({ color: 0xd71921, dashSize: 4, gapSize: 3, transparent: true });
const engrMat = new THREE.MeshStandardMaterial({
  transparent: true, roughness: .85, metalness: .1, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
});
function makeCorkTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#bc9162';
  ctx.fillRect(0, 0, 256, 256);
  const colors = ['#9e7244', '#865c32', '#cfa676', '#a87c4f', '#754e28', '#d6b084'];
  let seed = 42;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 3200; i++) {
    ctx.fillStyle = colors[i % colors.length];
    const x = rnd() * 256, y = rnd() * 256;
    const rx = 0.8 + rnd() * 2.6, ry = 0.6 + rnd() * 1.8;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.05, 0.05);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const corkTex = makeCorkTexture();
const corkMat = new THREE.MeshStandardMaterial({
  map: corkTex,
  bumpMap: corkTex,
  bumpScale: 0.35,
  roughness: 0.9,
  metalness: 0.0,
});
const corkFrameMat = corkMat.clone();
corkFrameMat.transparent = true;
const corkEdgeMat = new THREE.LineBasicMaterial({ color: 0x5a3b1c, transparent: true, opacity: 0.38 });
const corkFrameEdgeMat = new THREE.LineBasicMaterial({ color: 0x5a3b1c, transparent: true, opacity: 0.38 });
const boardPcbMat = new THREE.MeshStandardMaterial({
  color: 0xeef3f8,
  emissive: 0xc8d4e0,
  emissiveIntensity: 0.22,
  transparent: true,
  opacity: 0.42,
  roughness: 0.7,
  metalness: 0.05,
  depthWrite: false,
});
const boardFill = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xdce3ec,
  emissiveIntensity: 0.32,
  transparent: true,
  opacity: 0.68,
  roughness: 0.5,
  metalness: 0.08,
  depthWrite: false,
});
const boardAccentMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xe8eef5,
  emissiveIntensity: 0.42,
  transparent: true,
  opacity: 0.82,
  roughness: 0.35,
  metalness: 0.18,
  depthWrite: false,
});
const boardEdge = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.68,
  depthWrite: false,
});
const boardOutlineMat = new THREE.LineBasicMaterial({
  color: 0x4a5d73,
  transparent: true,
  opacity: 0.40,
  depthWrite: false,
});
const boardDetailEdge = new THREE.LineBasicMaterial({
  color: 0x8c9bae,
  transparent: true,
  opacity: 0.42,
  depthWrite: false,
});

function applyFinish() {
  const f = FINISH[S.finish];
  caseMat.color.setHex(f.c);
  caseMat.metalness = f.m;
  caseMat.roughness = f.r;
  engrMat.color.setHex(f.e);
  edgeMat.opacity = S.finish === 'black' ? .4 : .16;
  edgeMat.color.setHex(S.finish === 'black' ? 0x6e6e72 : 0x000000);
}

/* ───────── 2D helpers ───────── */
function rr(p, x0, y0, x1, y1, [bl, br, tr, tl], segs = 16) {
  const pts = [];
  const corner = (cx, cy, r, a0, a1) => {
    if (!r) { pts.push([cx, cy]); return; }
    for (let i = 0; i <= segs; i++) {
      const a = a0 + (a1 - a0) * (i / segs);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x1 - br, y0 + br, br, -Math.PI / 2, 0);
  corner(x1 - tr, y1 - tr, tr, 0, Math.PI / 2);
  corner(x0 + tl, y1 - tl, tl, Math.PI / 2, Math.PI);
  corner(x0 + bl, y0 + bl, bl, Math.PI, Math.PI * 1.5);
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

/** Builds clean CAD boundary & sharp-corner edges for an extruded 2D shape without any flat-face triangulation lines. */
function shapeEdges(shape, depth, curveSegments = 16, rotX = 0, cosThresh = 0.5) {
  const { shape: outer, holes } = shape.extractPoints(curveSegments);
  const verts = [];
  const addLoop = (raw) => {
    const loop = [];
    for (let i = 0; i < raw.length; i++) {
      const p = raw[i];
      const prev = loop[loop.length - 1];
      if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 1e-4) loop.push(p);
    }
    if (loop.length > 1 && Math.hypot(loop[0].x - loop[loop.length - 1].x, loop[0].y - loop[loop.length - 1].y) <= 1e-4) {
      loop.pop();
    }
    const n = loop.length;
    if (n < 3) return;
    for (let i = 0; i < n; i++) {
      const a = loop[i], b = loop[(i + 1) % n];
      verts.push(a.x, a.y, 0, b.x, b.y, 0);
      verts.push(a.x, a.y, depth, b.x, b.y, depth);
      const prev = loop[(i - 1 + n) % n];
      const dx1 = a.x - prev.x, dy1 = a.y - prev.y, l1 = Math.hypot(dx1, dy1) || 1;
      const dx2 = b.x - a.x, dy2 = b.y - a.y, l2 = Math.hypot(dx2, dy2) || 1;
      if ((dx1 * dx2 + dy1 * dy2) / (l1 * l2) < cosThresh) {
        verts.push(a.x, a.y, 0, a.x, a.y, depth);
      }
    }
  };
  addLoop(outer);
  holes.forEach(addLoop);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  if (rotX) geo.rotateX(rotX);
  return geo;
}
const circ = (x, y, r, n = 28) => {
  const p = new THREE.Path();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    i ? p.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)) : p.moveTo(x + r, y);
  }
  p.closePath();
  return p;
};
const slot = (cx, cy, w, h, r) => rr(new THREE.Path(), cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, [r, r, r, r], 12);

/** Vent holes inside a rectangle. */
function vents(x0, y0, x1, y1, type, maxN = 260) {
  const out = [];
  const w = x1 - x0, h = y1 - y0;
  if (w < 12 || h < 8 || type === 'none') return out;
  if (type === 'dots') {
    let p = Math.max(6, Math.sqrt((w * h) / maxN));
    const nx = Math.floor(w / p) + 1, ny = Math.floor(h / p) + 1;
    const ox = x0 + (w - (nx - 1) * p) / 2, oy = y0 + (h - (ny - 1) * p) / 2;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) out.push(circ(ox + i * p, oy + j * p, 1.6, 20));
  } else {
    const sh = 3, pitch = 8;
    const ny = Math.max(1, Math.floor((h - sh) / pitch) + 1);
    const oy = y0 + (h - (ny - 1) * pitch) / 2;
    const segs = Math.max(1, Math.round(w / 70));
    const gap = 6, sw = (w - gap * (segs - 1)) / segs;
    for (let j = 0; j < ny; j++) for (let s = 0; s < segs; s++)
      out.push(slot(x0 + s * (sw + gap) + sw / 2, oy + j * pitch, sw, sh, sh / 2));
  }
  return out;
}

const rectHole = (x0, y0, x1, y1) => {
  const p = new THREE.Path();
  p.moveTo(x0, y0);
  p.lineTo(x1, y0);
  p.lineTo(x1, y1);
  p.lineTo(x0, y1);
  p.closePath();
  return p;
};

/** Laser-cut break-out grid of snap-off metal tiles ("Ausbrech-Plättchen"). */
function breakoutGrid(x0, y0, x1, y1, pitch = 8) {
  const out = [];
  const w = x1 - x0, h = y1 - y0;
  if (w < 16 || h < 6) return out;
  const nx = Math.max(2, Math.round(w / pitch));
  const ny = Math.max(2, Math.round(h / Math.min(pitch, 7.5)));
  const dx = w / nx, dy = h / ny;
  const kerf = 1.0, bridge = 0.95; // bridge > kerf/2 keeps every slot disjoint
  for (let j = 0; j <= ny; j++) {
    const yc = y0 + j * dy;
    for (let i = 0; i < nx; i++) {
      const xa = x0 + i * dx + bridge, xb = x0 + (i + 1) * dx - bridge;
      if (xb > xa + 0.5) out.push(rectHole(xa, yc - kerf / 2, xb, yc + kerf / 2));
    }
  }
  for (let i = 0; i <= nx; i++) {
    const xc = x0 + i * dx;
    for (let j = 0; j < ny; j++) {
      const ya = y0 + j * dy + bridge, yb = y0 + (j + 1) * dy - bridge;
      if (yb > ya + 0.5) out.push(rectHole(xc - kerf / 2, ya, xc + kerf / 2, yb));
    }
  }
  return out;
}

/* ───────── build state ───────── */
let root = null, boardGroup = null, corkGroup = null;
let panels = [], hinges = [], folds = {}, decals = [];
let corkAnim = null;

function dims() {
  const comp = Math.max(S.Hc, 14);
  const W = S.L + 2 * MARGIN + 2 * T;
  const D = S.B + 2 * MARGIN + 2 * T;
  const H = T + STANDOFF + PCB + comp + TOPCLEAR + T;
  return { W, D, H, comp };
}

function addPanel(parent, shape, holes, tag) {
  shape.holes.push(...holes);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 4 });
  const mesh = new THREE.Mesh(geo, caseMat);
  mesh.castShadow = mesh.receiveShadow = true;
  const edges = new THREE.LineSegments(shapeEdges(shape, T, 4), edgeMat);
  mesh.add(edges);
  parent.add(mesh);
  panels.push({ mesh, shape, tag });
  return mesh;
}

/** Hinge along local X at (x,y); the flap extends along local +Y after rotZ. */
function hinge(parent, x, y, rotZ, len, list) {
  const h = new THREE.Group();
  h.position.set(x, y, 0);
  h.rotation.z = rotZ;
  parent.add(h);
  const f = new THREE.Group();
  h.add(f);
  const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-len / 2, 0, T + 0.15), new THREE.Vector3(len / 2, 0, T + 0.15)]);
  const line = new THREE.Line(lg, bendMat);
  line.computeLineDistances();
  h.add(line);
  hinges.push({ h, len });
  folds[list].push(f);
  return f;
}
const flapShape = (w, h, r = R) => rr(new THREE.Shape(), -w / 2, 0, w / 2, h, [0, 0, r, r]);

/** Tapered metal spike shape for bent-down foot prongs that skewer the cork feet. */
function footProngShape(w, len) {
  const p = new THREE.Shape();
  const tw = w * 0.58, shoulder = len * 0.42;
  p.moveTo(-w / 2, 0);
  p.lineTo(w / 2, 0);
  p.lineTo(w / 2, shoulder);
  p.lineTo(tw / 2, len);
  p.lineTo(-tw / 2, len);
  p.lineTo(-w / 2, shoulder);
  p.closePath();
  return p;
}

/* ───────── mainboard ───────── */
function buildBoard(d) {
  const g = new THREE.Group();
  const e = S.L, dp = S.B, comp = d.comp;

  const addMesh = (geo, mat = boardFill, edge = boardEdge, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (edge) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), edge));
    m.renderOrder = 5;
    g.add(m);
    return m;
  };
  const box = (w, h, z_, x, z, y0 = PCB, mat = boardFill, edge = boardEdge) =>
    addMesh(new THREE.BoxGeometry(w, h, z_), mat, edge, x, y0 + h / 2, z);
  const cyl = (r, h, x, z, y0 = PCB, axis = 'y', mat = boardFill, edge = boardEdge, segs = 24) => {
    const geo = new THREE.CylinderGeometry(r, r, h, segs);
    if (axis === 'z') geo.rotateX(Math.PI / 2);
    if (axis === 'x') geo.rotateZ(Math.PI / 2);
    return addMesh(geo, mat, edge, x, axis === 'y' ? y0 + h / 2 : y0, z);
  };

  // 1. Detailed PCB substrate with corner mounting holes & circuit trace bus lines
  {
    const pcbShape = rr(new THREE.Shape(), -e / 2, -dp / 2, e / 2, dp / 2, [2.5, 2.5, 2.5, 2.5]);
    const mx = e / 2 - 5.5, mz = dp / 2 - 5.5;
    [[-mx, -mz], [mx, -mz], [-mx, mz], [mx, mz]].forEach(([hx, hz]) => {
      pcbShape.holes.push(circ(hx, hz, 1.8, 16));
      // Annular mounting ring on top of PCB
      const ring = new THREE.RingGeometry(1.9, 3.4, 20);
      ring.rotateX(-Math.PI / 2);
      const rm = new THREE.Mesh(ring, boardAccentMat);
      rm.position.set(hx, PCB + 0.04, -hz);
      rm.renderOrder = 5;
      g.add(rm);
    });
    const pcbGeo = new THREE.ExtrudeGeometry(pcbShape, { depth: PCB, bevelEnabled: false, curveSegments: 5 });
    pcbGeo.rotateX(-Math.PI / 2);
    const pcbMesh = addMesh(pcbGeo, boardPcbMat, null, 0, 0, 0);
    pcbMesh.add(new THREE.LineSegments(shapeEdges(pcbShape, PCB, 5, -Math.PI / 2), boardOutlineMat));
  }

  // 2. Radial Blower Cooling Fan + Fin Stack + Dual Heatpipes
  const fr = Math.min(e, dp) * 0.175;
  const fx = e * 0.21, fz = -dp * 0.14;
  const fanH = Math.min(comp, 9.5);
  {
    // Blower housing with circular intake cutout
    const shroudShape = new THREE.Shape();
    shroudShape.absarc(0, 0, fr, 0, Math.PI * 2, false);
    shroudShape.holes.push(circ(0, 0, fr * 0.72, 24));
    const shroudGeo = new THREE.ExtrudeGeometry(shroudShape, { depth: fanH, bevelEnabled: false, curveSegments: 24 });
    shroudGeo.rotateX(-Math.PI / 2);
    const shroudMesh = addMesh(shroudGeo, boardFill, null, fx, PCB, fz);
    shroudMesh.add(new THREE.LineSegments(shapeEdges(shroudShape, fanH, 24, -Math.PI / 2), boardEdge));

    // Base plate under fan + central motor rotor hub + 11 angled impeller blades
    cyl(fr * 0.96, 0.8, fx, fz, PCB, 'y', boardPcbMat, null, 24);
    cyl(fr * 0.28, fanH * 0.82, fx, fz, PCB + 0.8, 'y', boardAccentMat, boardEdge, 20);
    const bladeCount = 11;
    const bladeLen = fr * 0.40;
    const bladeH = fanH * 0.65;
    for (let i = 0; i < bladeCount; i++) {
      const a = (i / bladeCount) * Math.PI * 2;
      const br = fr * 0.47;
      const bGeo = new THREE.BoxGeometry(bladeLen, bladeH, 0.65);
      const bm = addMesh(
        bGeo,
        boardAccentMat,
        boardDetailEdge,
        fx + Math.cos(a) * br,
        PCB + 0.8 + bladeH / 2,
        fz + Math.sin(a) * br
      );
      bm.rotation.y = -a + 0.48;
    }
  }

  // Fin stack (array of individual cooling fins along right/exhaust side of fan)
  const finW = Math.min(13, e * 0.08);
  const finX = Math.min(fx + fr + finW / 2 + 1.5, e / 2 - finW / 2 - CLAMP_LIP - 1.5);
  const finSpanZ = fr * 1.85;
  const finCount = Math.max(8, Math.min(15, Math.floor(finSpanZ / 3.2)));
  // Top & bottom collector plates + individual fins
  box(finW, 0.8, finSpanZ, finX, fz, PCB, boardAccentMat, boardEdge);
  box(finW, 0.8, finSpanZ, finX, fz, PCB + comp - 0.8, boardAccentMat, boardEdge);
  for (let i = 0; i < finCount; i++) {
    const zPos = fz - finSpanZ / 2 + (i / (finCount - 1)) * finSpanZ;
    box(finW - 0.6, comp - 1.6, 0.55, finX, zPos, PCB + 0.8, boardFill, boardDetailEdge);
  }

  // 3. CPU / SoC BGA Package, Mirror Die, Coldplate & VRM Power Delivery (Chokes + Caps)
  const cpuX = -e * 0.03, cpuZ = -dp * 0.14;
  const cpuW = Math.min(26, e * 0.14), cpuD = Math.min(24, dp * 0.16);
  // BGA substrate + main CPU silicon die + companion I/O die + retention bracket
  box(cpuW, 1.1, cpuD, cpuX, cpuZ, PCB, boardFill, boardEdge);
  box(cpuW * 0.52, 1.2, cpuD * 0.42, cpuX - cpuW * 0.1, cpuZ, PCB + 1.1, boardAccentMat, boardEdge);
  box(cpuW * 0.24, 1.2, cpuD * 0.36, cpuX + cpuW * 0.22, cpuZ, PCB + 1.1, boardAccentMat, boardEdge);
  // Dual flat heatpipes routing from CPU coldplate to the heatsink fin stack
  const hpLen = Math.max(12, finX - cpuX + 4);
  const hpCenterX = (cpuX + finX) / 2;
  box(hpLen, 1.6, 4.2, hpCenterX, fz - 3.2, PCB + 2.4, boardAccentMat, boardEdge);
  box(hpLen, 1.6, 4.2, hpCenterX, fz + 3.2, PCB + 2.4, boardAccentMat, boardEdge);

  // VRM Phase Chokes (row of inductors next to CPU) + Cylindrical Polymer Capacitors
  const vrmCount = 5;
  for (let i = 0; i < vrmCount; i++) {
    const vx = cpuX - cpuW / 2 + 2.5 + i * ((cpuW - 5) / (vrmCount - 1));
    box(3.8, 2.4, 3.8, vx, cpuZ - cpuD / 2 - 4.2, PCB, boardAccentMat, boardDetailEdge);
    cyl(1.5, 2.8, vx, cpuZ - cpuD / 2 - 8.2, PCB, 'y', boardFill, boardDetailEdge, 14);
  }

  // 4. Dual SO-DIMM RAM Sockets, Retention Latches & Populated RAM Modules with DRAM ICs
  const ramW = Math.min(66, e * 0.31);
  const ramD = 20;
  const ramX = -e * 0.26;
  for (let i = 0; i < 2; i++) {
    const rz = -dp * 0.28 + i * 24;
    const hBase = PCB + i * 1.8;
    // Socket connector strip + left/right metal retention latches
    box(ramW + 3, 2.8, 3.4, ramX, rz - ramD / 2 + 1.7, hBase, boardAccentMat, boardEdge);
    box(1.8, 2.2, ramD, ramX - ramW / 2 - 1.1, rz, hBase, boardAccentMat, boardDetailEdge);
    box(1.8, 2.2, ramD, ramX + ramW / 2 + 1.1, rz, hBase, boardAccentMat, boardDetailEdge);
    // SO-DIMM module PCB
    box(ramW, 1.1, ramD - 2.5, ramX, rz + 1.0, hBase + 1.2, boardFill, boardEdge);
    // 4 DRAM IC chips per module
    const chipW = (ramW - 12) / 4;
    for (let c = 0; c < 4; c++) {
      const cx = ramX - ramW / 2 + 4 + chipW / 2 + c * (chipW + 1.3);
      box(chipW, 0.9, (ramD - 6) * 0.55, cx, rz + 1.2, hBase + 2.3, boardAccentMat, boardDetailEdge);
    }
  }

  // 5. M.2 2280 NVMe SSD with Socket, Controller, NAND Flash Chips & Standoff Screw
  const ssdW = Math.min(76, e * 0.31), ssdD = Math.min(22, dp * 0.15);
  const ssdX = -e * 0.25, ssdZ = dp * 0.22;
  // M.2 edge socket on right end + mounting boss & screw on left end
  box(4.2, 3.2, ssdD, ssdX + ssdW / 2 - 2.1, ssdZ, PCB, boardAccentMat, boardEdge);
  cyl(2.4, 2.0, ssdX - ssdW / 2 + 1.5, ssdZ, PCB, 'y', boardAccentMat, boardEdge, 16);
  // SSD PCB stick + controller IC + 2 NAND flash packages
  box(ssdW - 3, 1.0, ssdD - 1, ssdX, ssdZ, PCB + 2.0, boardFill, boardEdge);
  box(7, 1.0, 7, ssdX + ssdW * 0.24, ssdZ, PCB + 3.0, boardAccentMat, boardDetailEdge);
  box(13, 1.1, ssdD * 0.62, ssdX - ssdW * 0.02, ssdZ, PCB + 3.0, boardAccentMat, boardDetailEdge);
  box(13, 1.1, ssdD * 0.62, ssdX - ssdW * 0.26, ssdZ, PCB + 3.0, boardAccentMat, boardDetailEdge);
  cyl(1.8, 0.6, ssdX - ssdW / 2 + 1.5, ssdZ, PCB + 3.0, 'y', boardAccentMat, boardEdge, 14);

  // 6. M.2 2230 Wi-Fi / Bluetooth Card + CMOS Coin-Cell Battery + Embedded Controller ICs
  const wifiX = e * 0.02, wifiZ = dp * 0.23;
  box(3.5, 2.6, 16, wifiX - 9, wifiZ, PCB, boardAccentMat, boardEdge);
  box(20, 0.9, 15, wifiX, wifiZ, PCB + 1.6, boardFill, boardEdge);
  box(11, 1.2, 11, wifiX + 2, wifiZ, PCB + 2.5, boardAccentMat, boardDetailEdge);
  // CR2032 CMOS Coin-Cell Battery
  cyl(8.5, 2.6, e * 0.18, dp * 0.20, PCB, 'y', boardAccentMat, boardEdge, 24);
  // Super-IO / EC Chip & Audio Codec Chip
  box(11, 1.4, 11, e * 0.04, dp * 0.05, PCB, boardAccentMat, boardEdge);
  box(7, 1.2, 7, e * 0.16, dp * 0.05, PCB, boardAccentMat, boardEdge);

  // 7. Recognizable I/O Connector Housings on Active Edges (kept clear of center side clamps)
  const usbA = (x, z, rotY = 0) => {
    const pg = new THREE.Group();
    pg.position.set(x, PCB, z);
    pg.rotation.y = rotY;
    const shell = new THREE.Mesh(new THREE.BoxGeometry(13, 6.2, 11), boardAccentMat);
    shell.position.y = 3.1;
    shell.add(new THREE.LineSegments(new THREE.EdgesGeometry(shell.geometry), boardEdge));
    const tongue = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.4, 9), boardFill);
    tongue.position.set(0, 3.6, -1.2);
    tongue.add(new THREE.LineSegments(new THREE.EdgesGeometry(tongue.geometry), boardDetailEdge));
    pg.add(shell, tongue);
    g.add(pg);
  };
  const usbC = (x, z, rotY = 0) => {
    const pg = new THREE.Group();
    pg.position.set(x, PCB, z);
    pg.rotation.y = rotY;
    const shell = new THREE.Mesh(new THREE.BoxGeometry(8.6, 3.2, 7.5), boardAccentMat);
    shell.position.y = 1.6;
    shell.add(new THREE.LineSegments(new THREE.EdgesGeometry(shell.geometry), boardEdge));
    pg.add(shell);
    g.add(pg);
  };
  const rj45 = (x, z, rotY = 0) => {
    const pg = new THREE.Group();
    pg.position.set(x, PCB, z);
    pg.rotation.y = rotY;
    const body = new THREE.Mesh(new THREE.BoxGeometry(15.5, 11.5, 13.5), boardAccentMat);
    body.position.y = 5.75;
    body.add(new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), boardEdge));
    const cav = new THREE.Mesh(new THREE.BoxGeometry(11.5, 7.5, 4), boardFill);
    cav.position.set(0, 5.2, -5.2);
    cav.add(new THREE.LineSegments(new THREE.EdgesGeometry(cav.geometry), boardDetailEdge));
    pg.add(body, cav);
    g.add(pg);
  };
  const hdmi = (x, z, rotY = 0) => {
    const pg = new THREE.Group();
    pg.position.set(x, PCB, z);
    pg.rotation.y = rotY;
    const body = new THREE.Mesh(new THREE.BoxGeometry(14.5, 5.5, 10.5), boardAccentMat);
    body.position.y = 2.75;
    body.add(new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), boardEdge));
    pg.add(body);
    g.add(pg);
  };
  const dcJack = (x, z, rotY = 0) => {
    const pg = new THREE.Group();
    pg.position.set(x, PCB, z);
    pg.rotation.y = rotY;
    const body = new THREE.Mesh(new THREE.BoxGeometry(9.5, 8.5, 11.5), boardAccentMat);
    body.position.y = 4.25;
    body.add(new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), boardEdge));
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 12, 16).rotateX(Math.PI / 2), boardFill);
    pin.position.set(0, 4.25, -0.5);
    pin.add(new THREE.LineSegments(new THREE.EdgesGeometry(pin.geometry, 25), boardDetailEdge));
    pg.add(body, pin);
    g.add(pg);
  };
  const audioJack = (x, z, rotY = 0) => {
    const pg = new THREE.Group();
    pg.position.set(x, PCB, z);
    pg.rotation.y = rotY;
    const body = new THREE.Mesh(new THREE.BoxGeometry(6.5, 5.0, 9.5), boardFill);
    body.position.y = 2.5;
    body.add(new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), boardEdge));
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3.0, 16).rotateX(Math.PI / 2), boardAccentMat);
    barrel.position.set(0, 2.5, -5.5);
    barrel.add(new THREE.LineSegments(new THREE.EdgesGeometry(barrel.geometry, 25), boardEdge));
    pg.add(body, barrel);
    g.add(pg);
  };

  if (S.ioSides.back) {
    dcJack(-e * 0.36, -dp / 2 + 6, 0);
    rj45(-e * 0.24, -dp / 2 + 7, 0);
    hdmi(-e * 0.11, -dp / 2 + 5.5, 0);
    usbA(e * 0.16, -dp / 2 + 5.5, 0);
    usbC(e * 0.28, -dp / 2 + 4, 0);
  }
  if (S.ioSides.front) {
    usbC(-e * 0.26, dp / 2 - 4, Math.PI);
    usbA(-e * 0.14, dp / 2 - 5.5, Math.PI);
    audioJack(e * 0.20, dp / 2 - 6, Math.PI);
  }
  if (S.ioSides.left) {
    usbC(-e / 2 + 4, -dp * 0.30, Math.PI / 2);
    hdmi(-e / 2 + 5.5, -dp * 0.16, Math.PI / 2);
    usbA(-e / 2 + 5.5, dp * 0.17, Math.PI / 2);
    audioJack(-e / 2 + 6, dp * 0.31, Math.PI / 2);
  }
  if (S.ioSides.right) {
    usbA(e / 2 - 5.5, -dp * 0.26, -Math.PI / 2);
    usbA(e / 2 - 5.5, dp * 0.17, -Math.PI / 2);
    usbC(e / 2 - 4, dp * 0.30, -Math.PI / 2);
  }

  g.position.set(0, FEET + T + STANDOFF, 0);
  g.updateMatrix();
  g.visible = S.board;
  return { g };
}

/* ───────── die-cut cork sheet & parts ───────── */
function buildCork(d, footCoords) {
  const g = new THREE.Group();
  const { W, H } = d;
  const wallH = H - T;
  const e = S.L, dp = S.B;

  const corkW = e + 28;
  const corkD = dp + 54;
  // Position the flat cork sheet beside the unfolded metal blank (on the left, -X)
  const sheetX = -(W / 2 + wallH + corkW / 2 + 24);
  const sheetZ = 0;
  const padOffV = 11; // pad center v in sheet 2D coords
  const cfW = 18, cfD = 14, cfR = 3.5;

  const addCorkMesh = (shape, isFrame = false) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: CORK_T, bevelEnabled: false, curveSegments: 5 });
    const mesh = new THREE.Mesh(geo, isFrame ? corkFrameMat : corkMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.castShadow = mesh.receiveShadow = true;
    const edges = new THREE.LineSegments(shapeEdges(shape, CORK_T, 5), isFrame ? corkFrameEdgeMat : corkEdgeMat);
    mesh.add(edges);
    g.add(mesh);
    return mesh;
  };

  // 1. Cork carrier frame ("Stanzbogen / Korkplatte" with die-cut openings)
  const frameShape = rr(new THREE.Shape(), -corkW / 2, -corkD / 2, corkW / 2, corkD / 2, [4, 4, 4, 4]);
  const kerf = 1.0;
  frameShape.holes.push(
    rr(new THREE.Path(), -(e / 2 + kerf), padOffV - (dp / 2 + kerf), e / 2 + kerf, padOffV + (dp / 2 + kerf), [2.5, 2.5, 2.5, 2.5])
  );
  const footSheetPos = footCoords.map((_, i) => {
    const u = (i - 1.5) * 24;
    const v = -(corkD / 2 - 14);
    frameShape.holes.push(
      rr(new THREE.Path(), u - (cfW / 2 + kerf), v - (cfD / 2 + kerf), u + (cfW / 2 + kerf), v + (cfD / 2 + kerf), [cfR + 0.5, cfR + 0.5, cfR + 0.5, cfR + 0.5])
    );
    return { u, v };
  });
  const frameMesh = addCorkMesh(frameShape, true);

  // 2. Mainboard Cork Base Pad (insulating bed on the bottom plate)
  const padShape = rr(new THREE.Shape(), -e / 2, -dp / 2, e / 2, dp / 2, [2, 2, 2, 2]);
  const padVents = vents(-e / 2 + 24, -dp * 0.18, e / 2 - 24, dp * 0.18, S.vents, 120);
  padShape.holes.push(...padVents);
  const padMesh = addCorkMesh(padShape, false);

  // 3. Four pre-punched Cork Foot Pads with central skewer slot for the bent metal prongs
  const slotW = FOOT_W + 0.6, slotD = T + 0.6;
  const footMeshes = footCoords.map(([fx, fy], i) => {
    const fs = rr(new THREE.Shape(), -cfW / 2, -cfD / 2, cfW / 2, cfD / 2, [cfR, cfR, cfR, cfR]);
    fs.holes.push(rectHole(-slotW / 2, -slotD / 2, slotW / 2, slotD / 2));
    const m = addCorkMesh(fs, false);
    const { u, v } = footSheetPos[i];
    return {
      mesh: m,
      shape: fs,
      u, v,
      startX: sheetX + u,
      startZ: sheetZ - v,
      // When the metal foot prong at (fx, fy + FOOT_LEN/2) bends -90°, its center in world Z is -(fy + FOOT_LEN/2 - T/2)
      targetX: fx,
      targetZ: -(fy + FOOT_LEN / 2 - T / 2),
    };
  });

  return {
    g,
    frameMesh,
    frameShape,
    padMesh,
    padShape,
    padOffV,
    footMeshes,
    sheetX,
    sheetZ,
    corkW,
    corkD,
  };
}

/* ───────── engraving texture ───────── */
function makeEngraving(text, maxW, hMM, onWall = false) {
  const isPixel = S.font === 'pixel';
  const fam = isPixel ? '500 130px "Geist Pixel Grid"' : '500 120px "Geist Mono"';
  const spacing = isPixel ? '8px' : '12px';
  const c = document.createElement('canvas');
  let ctx = c.getContext('2d');
  ctx.font = fam;
  if ('letterSpacing' in ctx) ctx.letterSpacing = spacing;
  const tw = Math.ceil(ctx.measureText(text).width) + 40;
  c.width = tw; c.height = 170;
  ctx = c.getContext('2d');
  ctx.font = fam;
  if ('letterSpacing' in ctx) ctx.letterSpacing = spacing;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, c.width / 2, c.height / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  let h = hMM, w = h * (c.width / c.height);
  if (w > maxW) { h *= maxW / w; w = maxW; }
  const mat = engrMat.clone();
  mat.map = tex;
  mat.color = engrMat.color; // shared colour
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  if (onWall) m.rotation.y = Math.PI;
  else m.rotation.x = Math.PI; // face outside (-z) and read left-to-right
  m.position.z = -0.06;
  decals.push({ m, text, h, w });
  return m;
}

/* ───────── case build ───────── */
function build() {
  if (root) {
    root.traverse(o => { o.geometry?.dispose(); if (o.material?.map) { o.material.map.dispose(); o.material.dispose(); } });
    scene.remove(root);
  }
  if (boardGroup) { boardGroup.traverse(o => o.geometry?.dispose()); scene.remove(boardGroup); }
  if (corkGroup) { corkGroup.traverse(o => o.geometry?.dispose()); scene.remove(corkGroup); }

  panels = []; hinges = []; decals = [];
  folds = { feet: [], clampBase: [], clampTop: [], tabs: [], fb: [], side: [], top: [], lip: [] };
  root = new THREE.Group();
  root.rotation.x = -Math.PI / 2;    // bottom plate lies in XZ: +X=right, +Y=back(-Z), +Z=up(+Y)
  root.position.y = FEET;
  scene.add(root);

  const d = dims();
  const { W, D, H } = d;
  const text = S.text.trim();
  const engr = text ? S.engr : null;

  const B = buildBoard(d);
  boardGroup = B.g;
  scene.add(boardGroup);

  const footCoords = [
    [-W / 2 + 18, -D / 2 + 16],
    [-W / 2 + 18,  D / 2 - 16],
    [ W / 2 - 18, -D / 2 + 16],
    [ W / 2 - 18,  D / 2 - 16],
  ];

  corkAnim = buildCork(d, footCoords);
  corkGroup = corkAnim.g;
  scene.add(corkGroup);

  /* bottom plate (centre of the blank — stationary base with stamped clamps & feet) */
  {
    const bh = [];
    const e = S.L, dp = S.B;
    const riserH = T + STANDOFF + PCB;
    const clampTotal = riserH + CLAMP_LIP;
    const kerf = 0.8;

    // 1. Cutouts & hinges for the 4 side metal clamps that fix the mainboard on the cork pad
    // Left clamp (-X edge, folds inward +X)
    bh.push(rectHole(-e / 2, -(CLAMP_W / 2 + kerf), -e / 2 + clampTotal + kerf, CLAMP_W / 2 + kerf));
    // Right clamp (+X edge, folds inward -X)
    bh.push(rectHole(e / 2 - clampTotal - kerf, -(CLAMP_W / 2 + kerf), e / 2, CLAMP_W / 2 + kerf));
    // Front clamp (-Y edge, folds inward +Y)
    bh.push(rectHole(-(CLAMP_W / 2 + kerf), -dp / 2, CLAMP_W / 2 + kerf, -dp / 2 + clampTotal + kerf));
    // Back clamp (+Y edge, folds inward -Y)
    bh.push(rectHole(-(CLAMP_W / 2 + kerf), dp / 2 - clampTotal - kerf, CLAMP_W / 2 + kerf, dp / 2));

    const clampSpecs = [
      [-e / 2, 0, -Math.PI / 2],
      [ e / 2, 0,  Math.PI / 2],
      [0, -dp / 2, 0],
      [0,  dp / 2, Math.PI],
    ];
    clampSpecs.forEach(([cx, cy, rz]) => {
      const cf = hinge(root, cx, cy, rz, CLAMP_W, 'clampBase');
      addPanel(cf, rr(new THREE.Shape(), -CLAMP_W / 2, 0, CLAMP_W / 2, riserH, [0, 0, 0, 0]), [], 'clampBase');
      const lf = hinge(cf, 0, riserH, 0, CLAMP_W, 'clampTop');
      addPanel(lf, flapShape(CLAMP_W, CLAMP_LIP, 2), [], 'clampTop');
    });

    // 2. Cutouts & hinges for the 4 bent metal foot prongs (skewering the pre-punched cork feet)
    footCoords.forEach(([fx, fy]) => {
      bh.push(rectHole(fx - (FOOT_W / 2 + kerf), fy - FOOT_LEN / 2 - kerf, fx + (FOOT_W / 2 + kerf), fy + FOOT_LEN / 2));
      const ff = hinge(root, fx, fy + FOOT_LEN / 2, Math.PI, FOOT_W, 'feet');
      addPanel(ff, footProngShape(FOOT_W, FOOT_LEN), [], 'foot');
    });

    // 3. Vents under the board (kept inside the clamp cutouts)
    bh.push(...vents(-e / 2 + 24, -dp * 0.18, e / 2 - 24, dp * 0.18, S.vents, 120));

    addPanel(root, rr(new THREE.Shape(), -W / 2, -D / 2, W / 2, D / 2, [0, 0, 0, 0]), bh, 'bottom');
  }

  const wallH = H - T;
  const ymid = wallH / 2;
  const tabLen = wallH - 6;

  // On every wall, local y=0 is at the bottom plate and y=wallH is at the top lid
  const ioHoles = (side, spanW) => {
    if (!S.ioSides[side]) return [];
    const y0 = STANDOFF;
    const gridH = Math.min(Math.max(13, S.Hc * 0.72), wallH - LIP - y0 - 2);
    const y1 = y0 + gridH;
    return breakoutGrid(-(spanW / 2 - 22), y0, spanW / 2 - 22, y1, +S.tile);
  };

  /* front + back walls with corner tabs */
  const fbW = W - 2 * T;
  const lipScrewX = fbW / 2 - 14;
  const addTabs = (f) => {
    [[fbW / 2, -Math.PI / 2], [-fbW / 2, Math.PI / 2]].forEach(([x, rz]) => {
      const tf = hinge(f, x, ymid, rz, tabLen, 'tabs');
      addPanel(tf, flapShape(tabLen, TAB, 2), [circ(tabLen / 4, TAB / 2, 1.7), circ(-tabLen / 4, TAB / 2, 1.7)], 'tab');
    });
  };

  // front wall (root −Y → world +Z), folds UP (+90°)
  {
    const f = hinge(root, 0, -D / 2, Math.PI, fbW, 'fb');
    const holes = [...ioHoles('front', fbW), circ(lipScrewX, wallH - LIP / 2, 1.7), circ(-lipScrewX, wallH - LIP / 2, 1.7)];
    addPanel(f, flapShape(fbW, wallH), holes, 'front');
    addTabs(f);
    if (engr === 'front') {
      const m = makeEngraving(text, fbW - 30, Math.min(9, (wallH - LIP) * .45), true);
      m.position.set(0, (wallH - LIP) / 2, -0.06);
      f.add(m);
    }
  }

  // back wall (root +Y → world −Z), folds UP (+90°) and carries top lid + front lip
  {
    const f = hinge(root, 0, D / 2, 0, fbW, 'fb');
    addPanel(f, rr(new THREE.Shape(), -fbW / 2, 0, fbW / 2, wallH, [0, 0, 0, 0]), ioHoles('back', fbW), 'back');
    addTabs(f);

    // top lid (der Deckel) hinges from the top of the back wall and folds forward over the case
    const tf = hinge(f, 0, wallH, 0, fbW, 'top');
    const th = [...vents(8, 14, W / 2 - 14, D - 14, S.vents)];
    const topMesh = addPanel(tf, flapShape(W, D + T), th, 'top');
    let topDecal = null;
    if (engr === 'top') {
      const m = makeEngraving(text, W / 2 - 26, 10, false);
      const g = m.geometry.parameters;
      m.position.set(-W / 2 + 14 + g.width / 2, 14 + g.height / 2, -0.06);
      tf.add(m);
      topDecal = m;
    }
    tf.userData = { topMesh, topDecal };

    // front lip hinges down from the front edge of the top lid (over the outside of the front wall)
    const lw = W - 2 * R - 2;
    const lf = hinge(tf, 0, D + T, 0, lw, 'lip');
    addPanel(lf, flapShape(lw, LIP, 2), [circ(lipScrewX, LIP / 2, 1.7), circ(-lipScrewX, LIP / 2, 1.7)], 'lip');
  }

  /* side walls (fold UP +90° from left/right edges of bottom plate) */
  const tabHolesSide = () => {
    const out = [];
    const dx = D / 2 - T - TAB / 2;
    [dx, -dx].forEach(lx => [ymid - tabLen / 4, ymid + tabLen / 4].forEach(ly => out.push(circ(lx, ly, 1.7))));
    return out;
  };
  [['right', W / 2, -Math.PI / 2], ['left', -W / 2, Math.PI / 2]].forEach(([side, x, rz]) => {
    const f = hinge(root, x, 0, rz, D, 'side');
    const holes = [...ioHoles(side, D), ...tabHolesSide()];
    const engrHere = engr === 'side' && side === 'right';
    if (!S.ioSides[side] && !engrHere) holes.push(...vents(-D / 2 + 24, wallH * .3, D / 2 - 24, wallH * .72, S.vents, 120));
    addPanel(f, flapShape(D, wallH), holes, side);
    if (engrHere) {
      const m = makeEngraving(text, D - 40, Math.min(9, wallH * .4), true);
      m.position.set(0, wallH / 2, -0.06);
      f.add(m);
    }
  });

  applyFold(S.fold);
  updateReadout();
}

/* ───────── folding & assembly choreography ───────── */
const ease = (t, a, b) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

function applyFold(t) {
  const A = Math.PI / 2;

  // Phase 1 (0.00 -> 0.22): Bend metal feet (-90°), clamp risers (+90°), and wall corner tabs (+90°)
  const footBend = ease(t, 0.04, 0.22);
  const clampUp = ease(t, 0.04, 0.22);
  const tabFold = ease(t, 0.04, 0.20);
  folds.feet.forEach(f => f.rotation.x = -A * footBend);
  folds.clampBase.forEach(f => f.rotation.x = A * clampUp);
  folds.tabs.forEach(f => {
    f.rotation.x = A * tabFold;
    f.position.z = T * tabFold;
  });

  // Lift bottom plate as metal feet bend down, then press down onto cork feet (0.31 -> 0.44)
  const liftUp = ease(t, 0.04, 0.26);
  const pressFoot = ease(t, 0.31, 0.44);
  const rootY = liftUp * (FEET + 6) - pressFoot * 6;
  root.position.y = rootY;

  // Phase 2 (0.02 -> 0.44): Pop cork parts out of cork sheet, skewer cork feet, and place cork base pad
  if (corkAnim) {
    const { frameMesh, padMesh, padOffV, footMeshes, sheetX, sheetZ } = corkAnim;
    const pop = ease(t, 0.02, 0.16);

    // Cork carrier frame ("Stanzbogen") stays beside metal blank, then gently fades away once empty
    const frameFade = ease(t, 0.44, 0.64);
    frameMesh.position.set(sheetX - frameFade * 28, 0, sheetZ);
    corkFrameMat.opacity = 1 - frameFade;
    corkFrameEdgeMat.opacity = 0.38 * (1 - frameFade);
    frameMesh.visible = frameFade < 0.995;

    // Mainboard cork pad pops up out of cork sheet and arcs onto the metal bottom plate
    const padMove = ease(t, 0.15, 0.42);
    const padStartX = sheetX;
    const padStartZ = sheetZ - padOffV;
    const px = THREE.MathUtils.lerp(padStartX, 0, padMove);
    const pz = THREE.MathUtils.lerp(padStartZ, 0, padMove);
    const pyLift = pop * (1 - padMove) * 20 + Math.sin(padMove * Math.PI) * 32;
    const pyBase = THREE.MathUtils.lerp(0, rootY + T, padMove);
    padMesh.position.set(px, pyBase + pyLift, pz);

    // 4 slotted cork feet pop out of sheet, slide under the 4 bent metal prongs, and press/skewer up
    const footMove = ease(t, 0.14, 0.31);
    footMeshes.forEach(fm => {
      const fx = THREE.MathUtils.lerp(fm.startX, fm.targetX, footMove);
      const fz = THREE.MathUtils.lerp(fm.startZ, fm.targetZ, footMove);
      const fyPop = pop * (1 - footMove) * 16 + Math.sin(footMove * Math.PI) * 14;
      const fyPress = pressFoot * (rootY - FEET);
      fm.mesh.position.set(fx, fyPop + fyPress, fz);
    });
  }

  // Phase 3 (0.38 -> 0.64): Mainboard appears & lowers onto the cork base pad, then metal clamp lips fold (-90°) over PCB
  if (boardGroup) {
    const boardFade = ease(t, 0.38, 0.45);
    const boardDrop = ease(t, 0.38, 0.54);
    const hoverY = (1 - boardDrop) * 60;
    boardGroup.position.set(0, rootY + T + STANDOFF + hoverY, 0);
    boardPcbMat.opacity = 0.42 * boardFade;
    boardFill.opacity = 0.68 * boardFade;
    boardAccentMat.opacity = 0.82 * boardFade;
    boardEdge.opacity = 0.68 * boardFade;
    boardDetailEdge.opacity = 0.42 * boardFade;
    boardOutlineMat.opacity = 0.40 * boardFade;
    boardGroup.visible = S.board && boardFade > 0.005;
  }
  const clampLock = ease(t, 0.50, 0.64);
  folds.clampTop.forEach(f => f.rotation.x = -A * clampLock);

  // Phase 4 (0.62 -> 1.00): Fold outer case walls, top lid, and front lip
  folds.fb.forEach(f => f.rotation.x = A * ease(t, 0.62, 0.78));
  folds.side.forEach(f => f.rotation.x = A * ease(t, 0.70, 0.86));
  const topFold = ease(t, 0.82, 0.95);
  folds.top.forEach(f => {
    f.rotation.x = A * topFold;
    if (f.userData?.topMesh) f.userData.topMesh.position.z = -T * topFold;
    if (f.userData?.topDecal) f.userData.topDecal.position.z = -0.06 - T * topFold;
  });
  folds.lip.forEach(f => f.rotation.x = A * ease(t, 0.93, 1.00));

  bendMat.opacity = 1 - ease(t, 0, 0.15);
  root.updateMatrixWorld(true);
}

/* ───────── flat-pattern / specs ───────── */
function computeNet() {
  const prev = S.fold;
  applyFold(0);
  const inv = root.matrixWorld.clone().invert();
  const loops = [], bends = [], texts = [], corkLoops = [];
  let area = 0;
  const bb = new THREE.Box2();
  const tmp = new THREE.Vector3();
  for (const { mesh, shape } of panels) {
    const m = new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld);
    const pts = shape.extractPoints(4);
    area += Math.abs(THREE.ShapeUtils.area(pts.shape));
    pts.holes.forEach(h => area -= Math.abs(THREE.ShapeUtils.area(h)));
    [pts.shape, ...pts.holes].forEach((loop, i) => {
      const l = loop.map(v => { tmp.set(v.x, v.y, 0).applyMatrix4(m); return [tmp.x, tmp.y]; });
      if (i === 0) l.forEach(([x, y]) => bb.expandByPoint(new THREE.Vector2(x, y)));
      loops.push(l);
    });
  }
  for (const { h, len } of hinges) {
    const m = new THREE.Matrix4().multiplyMatrices(inv, h.matrixWorld);
    const a = new THREE.Vector3(-len / 2, 0, 0).applyMatrix4(m), b = new THREE.Vector3(len / 2, 0, 0).applyMatrix4(m);
    bends.push([a.x, a.y, b.x, b.y]);
  }
  for (const { m: dm, text, h } of decals) {
    const m = new THREE.Matrix4().multiplyMatrices(inv, dm.matrixWorld);
    const c = new THREE.Vector3().applyMatrix4(m), x = new THREE.Vector3(1, 0, 0).applyMatrix4(m);
    texts.push({ x: c.x, y: c.y, a: Math.atan2(x.y - c.y, x.x - c.x) * 180 / Math.PI, text, h });
  }
  // Include die-cut cork sheet in net & SVG export
  if (corkAnim) {
    const { frameShape, padShape, padOffV, footMeshes, sheetX, sheetZ } = corkAnim;
    const addCorkShape = (sh, ox, oy) => {
      const pts = sh.extractPoints(4);
      [pts.shape, ...pts.holes].forEach(loop => {
        const l = loop.map(v => [ox + v.x, oy + v.y]);
        l.forEach(([x, y]) => bb.expandByPoint(new THREE.Vector2(x, y)));
        corkLoops.push(l);
      });
    };
    addCorkShape(frameShape, sheetX, -sheetZ);
    addCorkShape(padShape, sheetX, -sheetZ + padOffV);
    footMeshes.forEach(fm => addCorkShape(fm.shape, sheetX + fm.u, -sheetZ + fm.v));
  }
  applyFold(prev);
  return { loops, bends, texts, corkLoops, bb, area };
}

function exportSVG() {
  const { loops, bends, texts, corkLoops, bb } = computeNet();
  const pad = 10;
  const x0 = bb.min.x - pad, y0 = bb.min.y - pad, w = bb.max.x - bb.min.x + 2 * pad, h = bb.max.y - bb.min.y + 2 * pad;
  const f = n => n.toFixed(2);
  const paths = loops.map(l => `M${l.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`).join('');
  const corkPaths = corkLoops.map(l => `M${l.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`).join('');
  const fam = S.font === 'pixel' ? 'Geist Pixel Grid' : 'Geist Mono';
  const weight = '500';
  const spacing = S.font === 'pixel' ? 'letter-spacing="0.04em"' : 'letter-spacing="0.08em"';
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}mm" height="${f(h)}mm" viewBox="${f(x0)} ${f(y0)} ${f(w)} ${f(h)}">
  <!-- 2ndHeart · ${S.L}×${S.B} mainboard · ${T} mm aluminium + ${CORK_T} mm cork · black = metal cut, red = bend (90°), brown = cork die-cut, blue = engrave -->
  <g id="cut" fill="none" stroke="#000" stroke-width="0.2" fill-rule="evenodd"><path d="${paths}"/></g>
  <g id="cork-cut" fill="none" stroke="#8b5a2b" stroke-width="0.25" fill-rule="evenodd"><path d="${corkPaths}"/></g>
  <g id="bend" stroke="#d71921" stroke-width="0.2" stroke-dasharray="3 2">${bends.map(([a, b, c, d]) => `<line x1="${f(a)}" y1="${f(b)}" x2="${f(c)}" y2="${f(d)}"/>`).join('')}</g>
  <g id="engrave" fill="#0057ff" font-family="${fam}" font-weight="${weight}" ${spacing} text-anchor="middle" dominant-baseline="central">${texts.map(t => `<text x="${f(t.x)}" y="${f(t.y)}" font-size="${f(t.h * .7)}" transform="rotate(${f(t.a)} ${f(t.x)} ${f(t.y)})">${t.text.replace(/[<&>]/g, '')}</text>`).join('')}</g>
</svg>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  a.download = `2ndheart_${S.L}x${S.B}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ───────── UI ───────── */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const steps = $$('.step');
let dirty = false;
const invalidate = () => { dirty = true; };

function updateReadout() {
  const { W, D, H } = dims();
  $('#readout').textContent = `${Math.round(W)} × ${Math.round(D)} × ${Math.round(H)} MM`;
}

function setRangeFill(r) {
  r.style.setProperty('--p', `${((r.value - r.min) / (r.max - r.min)) * 100}%`);
}

// dimension inputs
$$('[data-k]').forEach(el => {
  const k = el.dataset.k;
  el.value = S[k];
  if (el.type === 'range') setRangeFill(el);
  const commit = (v, final) => {
    const min = +el.min, max = +el.max;
    if (Number.isNaN(v)) return;
    const c = Math.min(max, Math.max(min, Math.round(v)));
    if (!final && (v < min || v > max)) return;
    S[k] = c;
    $$(`[data-k="${k}"]`).forEach(o => { if (o !== el || final) o.value = c; if (o.type === 'range') setRangeFill(o); });
    invalidate();
    fitSoon();
  };
  el.addEventListener('input', () => commit(+el.value, el.type === 'range'));
  el.addEventListener('change', () => commit(+el.value, true));
});

// segmented controls
function seg(id, key, after) {
  const root_ = $(id);
  const sync = () => root_.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === S[key]));
  root_.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    S[key] = b.dataset.v; sync(); after?.(); invalidate();
  });
  sync();
  return sync;
}
seg('#tileSeg', 'tile');
seg('#ventSeg', 'vents');
const syncEngr = seg('#engrSeg', 'engr');
seg('#fontSeg', 'font');

// multi-select IO break-out sides
const ioSidesEl = $('#ioSides');
function syncIOSides() {
  ioSidesEl.querySelectorAll('.chip').forEach(b => {
    const on = !!S.ioSides[b.dataset.side];
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
    const dot = b.querySelector('b');
    if (dot) dot.textContent = on ? '●' : '○';
  });
}
ioSidesEl.addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  const side = b.dataset.side;
  S.ioSides[side] = !S.ioSides[side];
  syncIOSides();
  syncEngrOptions();
  invalidate();
});
syncIOSides();

// finish
const swEl = $('#swatches');
Object.entries(FINISH).forEach(([k, f]) => {
  const b = document.createElement('button');
  b.className = 'sw'; b.style.background = f.css; b.dataset.v = k; b.title = f.n;
  b.setAttribute('aria-label', f.n);
  b.onclick = () => { S.finish = k; syncFinish(); };
  swEl.appendChild(b);
});
function syncFinish() {
  swEl.querySelectorAll('.sw').forEach(b => b.classList.toggle('on', b.dataset.v === S.finish));
  $('#finishName').textContent = '· ' + FINISH[S.finish].n;
  applyFinish();
}
syncFinish();

// engraving
const engrText = $('#engrText');
engrText.value = S.text;
engrText.addEventListener('input', () => { S.text = engrText.value; syncEngrOptions(); invalidate(); });
function syncEngrOptions() {
  const has = !!S.text.trim();
  $('#engrOpts').hidden = !has;
  const allowed = { top: true, front: !S.ioSides.front, side: !S.ioSides.right };
  $$('#engrSeg button').forEach(b => {
    const isAllowed = allowed[b.dataset.v];
    b.disabled = !isAllowed;
    b.title = isAllowed ? '' : 'Durch Anschlüsse belegt';
  });
  if (!allowed[S.engr]) S.engr = 'top';
  syncEngr();
}
syncEngrOptions();

// steps
const dotsEl = $('#dots');
for (let i = 0; i < STEPS; i++) {
  const b = document.createElement('button');
  b.setAttribute('aria-label', `Schritt ${i + 1}`);
  b.onclick = () => goStep(i);
  dotsEl.appendChild(b);
}
function goStep(i) {
  S.step = Math.max(0, Math.min(STEPS - 1, i));
  steps.forEach((s, j) => s.hidden = j !== S.step);
  $('#stepNo').textContent = String(S.step + 1).padStart(2, '0');
  $('#stepTitle').textContent = steps[S.step].dataset.title;
  [...dotsEl.children].forEach((b, j) => { b.classList.toggle('cur', j === S.step); b.classList.toggle('done', j < S.step); });
  $('#prevBtn').style.visibility = S.step === 0 ? 'hidden' : 'visible';
  const last = S.step === STEPS - 1;
  $('#nextLbl').textContent = last ? 'Bestellen' : 'Weiter';
  $('#nextBtn').classList.toggle('final', last);
  if (last) renderSpecs();
  // show what matters for the step
  if (S.step === 1) { setFold(1, true); }
  if (S.step === 3 && S.engr === 'top') setFold(1, true);
}
$('#prevBtn').onclick = () => goStep(S.step - 1);
$('#nextBtn').onclick = () => S.step === STEPS - 1 ? toast('2ndHeart ist noch ein Konzept — danke ♥') : goStep(S.step + 1);

function renderSpecs() {
  if (dirty) { build(); dirty = false; }
  const { W, D, H } = dims();
  const net = computeNet();
  const metalW = W + 2 * (H - T), metalH = 2 * D + 2 * (H - T) + LIP;
  const corkW = S.L + 28, corkD = S.B + 54;
  const grams = net.area * T * 0.00268;
  const activeSides = Object.entries(S.ioSides).filter(([, v]) => v).map(([k]) => SIDE_NAMES[k]);
  const ioSummary = activeSides.length ? `${activeSides.join(', ')} (${S.tile} mm)` : 'Keine';
  const rows = [
    ['Gehäuse', `${Math.round(W)}×${Math.round(D)}×${Math.round(H)}`, true],
    ['Alu-Platte', `${Math.round(metalW)} × ${Math.round(metalH)} × ${T.toFixed(1)} mm`],
    ['Kork-Platte', `${Math.round(corkW)} × ${Math.round(corkD)} × ${CORK_T.toFixed(0)} mm`],
    ['Farbe', FINISH[S.finish].n],
    ['Gewicht', `≈ ${Math.round(grams)} g Alu + Kork`],
    ['Mainboard-Halt', 'Korkbett + 4 × Biege-Klammer'],
    ['Standfüße', '4 × Biege-Dorn + Steck-Kork'],
    ['IO-Raster', ioSummary],
  ];
  if (S.text.trim()) rows.splice(4, 0, ['Gravur', S.text.trim()]);
  $('#specs').innerHTML = rows.map(([k, v, big]) => `<dt>${k}</dt><dd${big ? ' class="big"' : ''}>${v}</dd>`).join('');
}
$('#svgBtn').onclick = exportSVG;

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

// board toggle
$('#boardBtn').onclick = e => {
  S.board = !S.board;
  e.currentTarget.classList.toggle('is-on', S.board);
  e.currentTarget.setAttribute('aria-pressed', S.board);
  if (root) applyFold(S.fold);
};

// fold slider + play
const foldEl = $('#fold'), foldOut = $('#foldOut'), playBtn = $('#playBtn');
let foldTarget = null, playing = false;
const ICON_PLAY = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>';
function setFold(t, animate = false) {
  if (animate) { foldTarget = t; return; }
  S.fold = t;
  foldEl.value = Math.round(t * 1000);
  setRangeFill(foldEl);
  foldOut.textContent = String(Math.round(t * 100)).padStart(3, '0');
  if (root) applyFold(t);
  fitDist = idealDist();
}
foldEl.addEventListener('input', () => { foldTarget = null; stopPlay(); setFold(foldEl.value / 1000); });
function stopPlay() { playing = false; playBtn.innerHTML = ICON_PLAY; }
playBtn.onclick = () => {
  if (playing) { stopPlay(); foldTarget = null; return; }
  playing = true; playBtn.innerHTML = ICON_PAUSE;
  foldTarget = S.fold > 0.5 ? 0 : 1;
};

/* ───────── camera fit ───────── */
let fitDist = null, fitTimer;
function idealDist() {
  const { W, D, H } = dims();
  const unfold = 1 - ease(S.fold, 0.2, 0.6);
  const corkExtra = unfold * (S.L + 52) * 0.72;
  const span = Math.max(W + 2 * H + corkExtra, 2 * D + 2 * H + LIP, 260);
  const aspect = camera.aspect;
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const fitH = span / 2 / Math.tan(vfov / 2);
  const fitW = span / 2 / (Math.tan(vfov / 2) * aspect);
  return Math.max(fitH, fitW) * 0.95;
}
function fitSoon() { clearTimeout(fitTimer); fitTimer = setTimeout(() => { fitDist = idealDist(); }, 120); }
function resetView() {
  const dir = new THREE.Vector3(0.55, 0.62, 0.78).normalize();
  const { H } = dims();
  const unfold = 1 - ease(S.fold, 0.25, 0.58);
  const tx = corkAnim ? corkAnim.sheetX * 0.34 * unfold : 0;
  controls.target.set(tx, H * 0.4, 0);
  camera.position.copy(dir.multiplyScalar(idealDist())).add(controls.target);
  fitDist = null;
}
$('#resetBtn').onclick = resetView;
controls.addEventListener('start', () => { fitDist = null; });

/* ───────── loop ───────── */
function resize() {
  const w = view.clientWidth, h = view.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(view);

const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (dirty) { build(); dirty = false; }

  if (foldTarget !== null) {
    const speed = playing ? 0.22 : 0.9;
    const dir = Math.sign(foldTarget - S.fold);
    let next = S.fold + dir * speed * dt;
    if ((dir > 0 && next >= foldTarget) || (dir < 0 && next <= foldTarget) || dir === 0) {
      next = foldTarget;
      if (playing) { foldTarget = foldTarget === 1 ? 0 : 1; } else foldTarget = null;
    }
    setFold(next);
  }

  if (fitDist !== null) {
    const { H } = dims();
    const unfold = 1 - ease(S.fold, 0.25, 0.58);
    const tx = corkAnim ? corkAnim.sheetX * 0.34 * unfold : 0;
    const off = camera.position.clone().sub(controls.target);
    const len = off.length();
    const nl = THREE.MathUtils.lerp(len, fitDist, 0.12);
    controls.target.x = THREE.MathUtils.lerp(controls.target.x, tx, 0.12);
    controls.target.y = THREE.MathUtils.lerp(controls.target.y, H * 0.4, 0.12);
    camera.position.copy(controls.target).add(off.setLength(nl));
    if (Math.abs(nl - fitDist) < 0.8 && Math.abs(controls.target.x - tx) < 0.8) fitDist = null;
  }

  controls.update();
  try {
    renderer.render(scene, camera);
  } catch (err) {
    // protect render loop from transient context restores
  }
  requestAnimationFrame(loop);
}

/* ───────── boot ───────── */
(async () => {
  resize();
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('500 40px "Geist Pixel Grid"'),
        document.fonts.load('400 40px "Geist Mono"')
      ]),
      new Promise(r => setTimeout(r, 2500)),
    ]);
  } catch { /* fonts optional */ }
  applyFinish();
  build();
  setFold(1);
  goStep(0);
  resetView();
  loop();
  if (location.search.includes('debug')) setTimeout(() => console.log('DBG', panels.length, JSON.stringify(renderer.info.render), camera.position.toArray().map(Math.round), view.clientWidth, view.clientHeight, root.position.y), 1500);
})();
