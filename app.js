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
const BEND_SLOT_D = 1.8;  // half-depth of bend relief slots on main walls (3.6 mm total slot width when flat)
const LIP_SLOT_D = 1.2;   // half-depth of bend relief slots on front lip
const TAB_SLOT_D = 1.4;   // half-depth of bend relief slots on corner screw tabs
const CLAMP_SLOT_D = 0.9; // half-depth of bend relief slot on mainboard clamps

const SIDE_NAMES = { front: 'Vorne', back: 'Hinten', left: 'Links', right: 'Rechts' };

const FINISH = {
  alu:   { n: 'Aluminium roh', css: 'linear-gradient(135deg,#e4e4e2,#a9a9a6)', c: 0xc9c9c6, m: .85, r: .36, e: 0x2e2e2e },
  white: { n: 'Weiß',          css: '#f4f4f1', c: 0xf1f1ee, m: .04, r: .55, e: 0x9a9a98 },
  black: { n: 'Anthrazit',     css: '#38383a', c: 0x3a3a3d, m: .25, r: .55, e: 0xdcdcdc },
  red:   { n: 'Koralle / Terrakotta', css: '#c95d53', c: 0xbf5349, m: .12, r: .58, e: 0xf2f2f0 },
};

const STEPS = 6;

const LAPTOP_PRESETS = [
  // Framework
  { id: 'fw-solo',       brand: 'Framework', model: 'Framework Mainboard (Standalone)', L: 165, B: 140, Hc: 16 },
  { id: 'fw-13-amd',     brand: 'Framework', model: 'Framework Laptop 13 (Ryzen 7040)', L: 178, B: 152, Hc: 16 },
  { id: 'fw-13-intel',   brand: 'Framework', model: 'Framework Laptop 13 (Core Ultra)', L: 178, B: 152, Hc: 16 },
  { id: 'fw-13-11gen',   brand: 'Framework', model: 'Framework Laptop 13 (11th/12th Gen)', L: 176, B: 150, Hc: 15 },
  { id: 'fw-16-main',    brand: 'Framework', model: 'Framework Laptop 16 (Mainboard)', L: 198, B: 165, Hc: 19 },
  { id: 'fw-16-gpu',     brand: 'Framework', model: 'Framework Laptop 16 (+ Bay)', L: 235, B: 195, Hc: 26 },
  { id: 'fw-12',         brand: 'Framework', model: 'Framework Laptop 12 (2-in-1)', L: 165, B: 145, Hc: 14 },

  // Lenovo (ThinkPad / IdeaPad / Legion)
  { id: 'tp-x1-nano',    brand: 'Lenovo', model: 'ThinkPad X1 Nano', L: 172, B: 150, Hc: 13 },
  { id: 'tp-x1-tablet',  brand: 'Lenovo', model: 'ThinkPad X1 Tablet', L: 158, B: 142, Hc: 12 },
  { id: 'tp-x280',       brand: 'Lenovo', model: 'ThinkPad X280 / X390 / X13', L: 185, B: 158, Hc: 14 },
  { id: 'tp-x270',       brand: 'Lenovo', model: 'ThinkPad X260 / X270', L: 192, B: 165, Hc: 18 },
  { id: 'tp-x1c-g6',     brand: 'Lenovo', model: 'ThinkPad X1 Carbon Gen 6 / 7', L: 198, B: 162, Hc: 13 },
  { id: 'tp-x1c-g10',    brand: 'Lenovo', model: 'ThinkPad X1 Carbon Gen 10 / 11', L: 195, B: 160, Hc: 13 },
  { id: 'tp-t14-g4',     brand: 'Lenovo', model: 'ThinkPad T14 Gen 3 / Gen 4', L: 205, B: 172, Hc: 16 },
  { id: 'tp-t490',       brand: 'Lenovo', model: 'ThinkPad T490 / T14 Gen 1–2', L: 212, B: 175, Hc: 17 },
  { id: 'tp-t480s',      brand: 'Lenovo', model: 'ThinkPad T480s / T490s', L: 210, B: 172, Hc: 15 },
  { id: 'tp-t480',       brand: 'Lenovo', model: 'ThinkPad T480 / T470', L: 218, B: 178, Hc: 18 },
  { id: 'tp-e14',        brand: 'Lenovo', model: 'ThinkPad E14 / L14', L: 212, B: 174, Hc: 18 },
  { id: 'len-yoga7',     brand: 'Lenovo', model: 'Yoga Slim 7 / 7i (14")', L: 196, B: 162, Hc: 14 },
  { id: 'len-ideapad5',  brand: 'Lenovo', model: 'IdeaPad 5 Pro 14"', L: 202, B: 168, Hc: 16 },
  { id: 'tp-p52',        brand: 'Lenovo', model: 'ThinkPad P52 / P53 / P15', L: 254, B: 215, Hc: 26 },
  { id: 'len-legion5',   brand: 'Lenovo', model: 'Legion 5 / 5 Pro (16")', L: 268, B: 225, Hc: 28 },

  // Dell
  { id: 'dell-lat-7200',   brand: 'Dell', model: 'Latitude 7200 2-in-1', L: 162, B: 146, Hc: 13 },
  { id: 'dell-xps13-9310', brand: 'Dell', model: 'XPS 13 (9300 / 9310 / 9315)', L: 182, B: 156, Hc: 13 },
  { id: 'dell-xps13-9360', brand: 'Dell', model: 'XPS 13 (9350 / 9360 / 9370)', L: 188, B: 158, Hc: 14 },
  { id: 'dell-lat-5420',   brand: 'Dell', model: 'Latitude 5420 / 5430 / 5440', L: 208, B: 174, Hc: 19 },
  { id: 'dell-lat-7490',   brand: 'Dell', model: 'Latitude 7480 / 7490 / 7400', L: 212, B: 176, Hc: 18 },
  { id: 'dell-insp-15',    brand: 'Dell', model: 'Inspiron 15 (3511 / 5510)', L: 226, B: 188, Hc: 19 },
  { id: 'dell-xps15-9520', brand: 'Dell', model: 'XPS 15 (9500 / 9520 / 9530)', L: 224, B: 186, Hc: 19 },
  { id: 'dell-xps15-9570', brand: 'Dell', model: 'XPS 15 (9560 / 9570 / 7590)', L: 232, B: 192, Hc: 20 },
  { id: 'dell-prec-5550',  brand: 'Dell', model: 'Precision 5540 / 5550 / 5570', L: 230, B: 190, Hc: 21 },
  { id: 'dell-g15',        brand: 'Dell', model: 'Dell G15 / Alienware m15', L: 265, B: 222, Hc: 28 },

  // HP
  { id: 'hp-elite-x2',   brand: 'HP', model: 'Elite x2 G4 / G8', L: 160, B: 144, Hc: 13 },
  { id: 'hp-spectre-14', brand: 'HP', model: 'Spectre x360 13" / 14"', L: 186, B: 158, Hc: 14 },
  { id: 'hp-envy-13',    brand: 'HP', model: 'Envy 13 / Envy x360 15"', L: 194, B: 164, Hc: 16 },
  { id: 'hp-eb-845-g10', brand: 'HP', model: 'EliteBook 845 G9 / G10 (Ryzen)', L: 202, B: 168, Hc: 16 },
  { id: 'hp-eb-840-g8',  brand: 'HP', model: 'EliteBook 840 G7 / G8 / G9', L: 204, B: 170, Hc: 16 },
  { id: 'hp-eb-840-g5',  brand: 'HP', model: 'EliteBook 840 G5 / G6', L: 212, B: 176, Hc: 17 },
  { id: 'hp-probook-450', brand: 'HP', model: 'ProBook 440 / 450 G8–G10', L: 218, B: 182, Hc: 19 },
  { id: 'hp-pavilion-15', brand: 'HP', model: 'Pavilion 15 / HP 15s', L: 225, B: 188, Hc: 19 },
  { id: 'hp-omen-16',    brand: 'HP', model: 'OMEN 16 / Victus 16', L: 262, B: 220, Hc: 27 },

  // ASUS
  { id: 'asus-ally',     brand: 'ASUS', model: 'ROG Ally / Z1 Extreme', L: 145, B: 132, Hc: 16 },
  { id: 'asus-flow-z13', brand: 'ASUS', model: 'ROG Flow Z13', L: 168, B: 148, Hc: 17 },
  { id: 'asus-zen-14',   brand: 'ASUS', model: 'Zenbook 14 OLED (UX3402)', L: 198, B: 168, Hc: 14 },
  { id: 'asus-zen-duo',  brand: 'ASUS', model: 'Zenbook Pro / Duo 14', L: 212, B: 178, Hc: 18 },
  { id: 'asus-vivo-15',  brand: 'ASUS', model: 'Vivobook 15 / 16 (X1502)', L: 222, B: 184, Hc: 18 },
  { id: 'asus-g14',      brand: 'ASUS', model: 'ROG Zephyrus G14 (GA402)', L: 218, B: 184, Hc: 22 },
  { id: 'asus-g16',      brand: 'ASUS', model: 'ROG Zephyrus G16 / M16', L: 248, B: 210, Hc: 24 },
  { id: 'asus-tuf-a15',  brand: 'ASUS', model: 'TUF Gaming A15 / F15', L: 254, B: 214, Hc: 26 },
  { id: 'asus-strix-15', brand: 'ASUS', model: 'ROG Strix G15 / Scar 16', L: 266, B: 224, Hc: 29 },

  // Acer
  { id: 'acer-swift-3',  brand: 'Acer', model: 'Swift 3 / Swift Go 14', L: 202, B: 168, Hc: 15 },
  { id: 'acer-swift-x',  brand: 'Acer', model: 'Swift X 14 (SFX14)', L: 208, B: 174, Hc: 18 },
  { id: 'acer-aspire-5', brand: 'Acer', model: 'Aspire 5 (A515-56)', L: 222, B: 185, Hc: 19 },
  { id: 'acer-aspire-3', brand: 'Acer', model: 'Aspire 3 (A315)', L: 220, B: 182, Hc: 19 },
  { id: 'acer-nitro-5',  brand: 'Acer', model: 'Nitro 5 / Nitro 16', L: 258, B: 218, Hc: 28 },
  { id: 'acer-predator', brand: 'Acer', model: 'Predator Helios Neo 16', L: 268, B: 226, Hc: 30 },

  // MSI
  { id: 'msi-modern-14', brand: 'MSI', model: 'Modern 14 / Prestige 14', L: 198, B: 166, Hc: 16 },
  { id: 'msi-prestige-16', brand: 'MSI', model: 'Prestige 16 / Creator Z16', L: 235, B: 196, Hc: 20 },
  { id: 'msi-stealth-15', brand: 'MSI', model: 'GS66 Stealth / Stealth 15M', L: 246, B: 206, Hc: 22 },
  { id: 'msi-katana-15', brand: 'MSI', model: 'Katana GF66 / Cyborg 15', L: 254, B: 214, Hc: 26 },
  { id: 'msi-raider',    brand: 'MSI', model: 'GE76 / Raider GE68 HX', L: 272, B: 228, Hc: 30 },

  // Razer
  { id: 'razer-stealth', brand: 'Razer', model: 'Razer Blade Stealth 13', L: 188, B: 158, Hc: 15 },
  { id: 'razer-14',      brand: 'Razer', model: 'Razer Blade 14 (Ryzen)', L: 216, B: 182, Hc: 20 },
  { id: 'razer-15',      brand: 'Razer', model: 'Razer Blade 15 Advanced', L: 238, B: 198, Hc: 21 },
  { id: 'razer-16',      brand: 'Razer', model: 'Razer Blade 16 Pro', L: 256, B: 215, Hc: 24 },

  // Microsoft Surface
  { id: 'surf-go',       brand: 'Microsoft', model: 'Surface Go 2 / 3', L: 148, B: 132, Hc: 11 },
  { id: 'surf-pro-8',    brand: 'Microsoft', model: 'Surface Pro 7 / 8 / 9', L: 165, B: 144, Hc: 11 },
  { id: 'surf-lap-3',    brand: 'Microsoft', model: 'Surface Laptop 3 / 4 / 5 (13.5")', L: 188, B: 162, Hc: 13 },
  { id: 'surf-studio',   brand: 'Microsoft', model: 'Surface Laptop Studio', L: 208, B: 178, Hc: 18 },
  { id: 'surf-lap-15',   brand: 'Microsoft', model: 'Surface Laptop 5 (15")', L: 214, B: 182, Hc: 14 },

  // Samsung
  { id: 'sam-book3-pro', brand: 'Samsung', model: 'Galaxy Book3 / Book4 Pro 14"', L: 192, B: 162, Hc: 12 },
  { id: 'sam-book3-360', brand: 'Samsung', model: 'Galaxy Book3 360 16"', L: 215, B: 180, Hc: 13 },
  { id: 'sam-book-ultra', brand: 'Samsung', model: 'Galaxy Book4 Ultra 16"', L: 236, B: 196, Hc: 18 },

  // Huawei / Honor
  { id: 'hua-xpro',      brand: 'Huawei', model: 'MateBook X Pro (3:2)', L: 188, B: 158, Hc: 13 },
  { id: 'hua-d14',       brand: 'Huawei', model: 'MateBook D14 / 14s', L: 204, B: 170, Hc: 16 },
  { id: 'hua-magicbook', brand: 'Huawei', model: 'Honor MagicBook 14', L: 206, B: 172, Hc: 16 },

  // Tuxedo / Schenker / Clevo
  { id: 'tux-pulse-14',  brand: 'Tuxedo', model: 'TUXEDO Pulse 14 / InfinityBook 14', L: 204, B: 170, Hc: 16 },
  { id: 'tux-ibp-16',    brand: 'Tuxedo', model: 'InfinityBook Pro 16 / Schenker VIA', L: 228, B: 190, Hc: 18 },
  { id: 'tux-stellar-16', brand: 'Tuxedo', model: 'TUXEDO Stellaris 16 / XMG NEO 16', L: 262, B: 220, Hc: 28 },
];

const S = {
  L: 240, B: 160, Hc: 20,
  presetId: null,
  ioSides: { front: false, back: true, left: true, right: false },
  tile: '8',
  pwrType: '12', pwrX: 214, pwrY: 22,
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

const pwrIconMat = new THREE.MeshStandardMaterial({
  color: 0x3b2310,
  roughness: 0.85,
  metalness: 0.0,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
});
const pwrHitMat = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
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
function rr(p, x0, y0, x1, y1, [bl, br, tr, tl], segs = 8, edgeSlots = null) {
  const pts = [];
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const corner = (cx, cy, r, a0, a1) => {
    if (!r) { pts.push([cx, cy]); return; }
    for (let i = 0; i <= segs; i++) {
      const a = a0 + (a1 - a0) * (i / segs);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x1 - br, y0 + br, br, -Math.PI / 2, 0);
  if (edgeSlots?.right) {
    const { slots, d } = edgeSlots.right;
    for (const [sa, sb] of slots) {
      const ya = my + sa, yb = my + sb;
      pts.push([x1, ya], [x1 - d, ya], [x1 - d, yb], [x1, yb]);
    }
  }
  corner(x1 - tr, y1 - tr, tr, 0, Math.PI / 2);
  if (edgeSlots?.top) {
    const { slots, d } = edgeSlots.top;
    for (let i = slots.length - 1; i >= 0; i--) {
      const [sa, sb] = slots[i];
      const xa = mx + sa, xb = mx + sb;
      pts.push([xb, y1], [xb, y1 - d], [xa, y1 - d], [xa, y1]);
    }
  }
  corner(x0 + tl, y1 - tl, tl, Math.PI / 2, Math.PI);
  if (edgeSlots?.left) {
    const { slots, d } = edgeSlots.left;
    for (let i = slots.length - 1; i >= 0; i--) {
      const [sa, sb] = slots[i];
      const ya = my + sa, yb = my + sb;
      pts.push([x0, yb], [x0 + d, yb], [x0 + d, ya], [x0, ya]);
    }
  }
  corner(x0 + bl, y0 + bl, bl, Math.PI, Math.PI * 1.5);
  if (edgeSlots?.bottom) {
    const { slots, d } = edgeSlots.bottom;
    for (const [sa, sb] of slots) {
      const xa = mx + sa, xb = mx + sb;
      pts.push([xa, y0], [xa, y0 + d], [xb, y0 + d], [xb, y0]);
    }
  }
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

/** Generates symmetric rectangular slot intervals [sa, sb] along a bend edge of length w, leaving narrow hinge bridges ("Scharniere"). */
function hingeSlots(w, { endB = 5.2, bridgeW = 5.2, targetSlot = 18, keepSolid = [] } = {}) {
  const inner = w - 2 * endB;
  if (inner < 6) return [];
  const n = Math.max(1, Math.round((inner + bridgeW) / (targetSlot + bridgeW)));
  const sw = (inner - (n - 1) * bridgeW) / n;
  let slots = [];
  for (let i = 0; i < n; i++) {
    const a = -w / 2 + endB + i * (sw + bridgeW);
    slots.push([a, a + sw]);
  }
  for (const { x: kx, halfW } of keepSolid) {
    const k0 = kx - halfW, k1 = kx + halfW;
    const next = [];
    for (const [a, b] of slots) {
      if (b <= k0 || a >= k1) {
        next.push([a, b]);
      } else {
        if (k0 - a >= 4.0) next.push([a, k0]);
        if (b - k1 >= 4.0) next.push([k1, b]);
      }
    }
    slots = next;
  }
  return slots;
}

/** Generates bend relief slots for corner screw tabs while keeping solid hinge bridges aligned with the two screw holes at ±tabLen/4. */
function tabHingeSlots(tabLen) {
  const slots = [];
  const midHalf = Math.min(tabLen * 0.13, tabLen / 4 - 3.6);
  if (midHalf >= 1.8) slots.push([-midHalf, midHalf]);
  const outStart = tabLen / 4 + 3.6;
  const outEnd = tabLen / 2 - 3.8;
  if (outEnd - outStart >= 3.2) {
    slots.unshift([-outEnd, -outStart]);
    slots.push([outStart, outEnd]);
  }
  return slots;
}

/** Computes the remaining solid metal hinge bridge intervals [b0, b1] along [-w/2, w/2] given slot intervals. */
function hingeBridges(w, slots = []) {
  const bridges = [];
  let cur = -w / 2;
  for (const [a, b] of slots) {
    if (a > cur + 1e-3) bridges.push([cur, a]);
    cur = b;
  }
  if (w / 2 > cur + 1e-3) bridges.push([cur, w / 2]);
  return bridges;
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
const circ = (x, y, r, n = 16) => {
  const p = new THREE.Path();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    i ? p.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)) : p.moveTo(x + r, y);
  }
  p.closePath();
  return p;
};
const slot = (cx, cy, w, h, r) => rr(new THREE.Path(), cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, [r, r, r, r], 6);

/** Vent holes inside a rectangle, with optional circular keepOut collar { x, y, r }. */
function vents(x0, y0, x1, y1, type, maxN = 260, keepOut = null) {
  const out = [];
  const w = x1 - x0, h = y1 - y0;
  if (w < 12 || h < 8 || type === 'none') return out;
  if (type === 'dots') {
    let p = Math.max(6, Math.sqrt((w * h) / maxN));
    const nx = Math.floor(w / p) + 1, ny = Math.floor(h / p) + 1;
    const ox = x0 + (w - (nx - 1) * p) / 2, oy = y0 + (h - (ny - 1) * p) / 2;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const cx = ox + i * p, cy = oy + j * p;
        if (keepOut && Math.hypot(cx - keepOut.x, cy - keepOut.y) < keepOut.r + 1.6) continue;
        out.push(circ(cx, cy, 1.6, 10));
      }
    }
  } else {
    const sh = 3, pitch = 8;
    const ny = Math.max(1, Math.floor((h - sh) / pitch) + 1);
    const oy = y0 + (h - (ny - 1) * pitch) / 2;
    const segs = Math.max(1, Math.round(w / 70));
    const gap = 6, sw = (w - gap * (segs - 1)) / segs;
    for (let j = 0; j < ny; j++) {
      const cy = oy + j * pitch;
      for (let s = 0; s < segs; s++) {
        const cx = x0 + s * (sw + gap) + sw / 2;
        if (!keepOut) {
          out.push(slot(cx, cy, sw, sh, sh / 2));
          continue;
        }
        const sx0 = cx - sw / 2, sx1 = cx + sw / 2;
        const dy = Math.abs(cy - keepOut.y);
        const rad = keepOut.r + sh / 2;
        if (dy >= rad) {
          out.push(slot(cx, cy, sw, sh, sh / 2));
        } else {
          const dx = Math.sqrt(rad * rad - dy * dy) + sh / 2;
          const k0 = keepOut.x - dx, k1 = keepOut.x + dx;
          if (sx1 <= k0 || sx0 >= k1) {
            out.push(slot(cx, cy, sw, sh, sh / 2));
          } else {
            if (k0 - sx0 >= 6) out.push(slot((sx0 + k0) / 2, cy, k0 - sx0, sh, sh / 2));
            if (sx1 - k1 >= 6) out.push(slot((k1 + sx1) / 2, cy, sx1 - k1, sh, sh / 2));
          }
        }
      }
    }
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
let topLidGroup = null, pwrHitMesh = null, boardPwrGroup = null;

// Shared unit geometries for fast mainboard & component instantiation (never disposed)
const markShared = (geo) => { geo.userData.shared = true; return geo; };
const UNIT_BOX_GEO = markShared(new THREE.BoxGeometry(1, 1, 1));
const UNIT_BOX_EDGES = markShared(new THREE.EdgesGeometry(UNIT_BOX_GEO, 28));
const UNIT_CYL_Y_GEO = markShared(new THREE.CylinderGeometry(1, 1, 1, 18));
const UNIT_CYL_Y_EDGES = markShared(new THREE.EdgesGeometry(UNIT_CYL_Y_GEO, 28));
const UNIT_CYL_Z_GEO = markShared(new THREE.CylinderGeometry(1, 1, 1, 16).rotateX(Math.PI / 2));
const UNIT_CYL_Z_EDGES = markShared(new THREE.EdgesGeometry(UNIT_CYL_Z_GEO, 25));
const UNIT_RING_GEO = markShared(new THREE.RingGeometry(1.9, 3.4, 16).rotateX(-Math.PI / 2));

function pwrMargin() {
  const d = S.pwrType === 'none' ? 12 : +S.pwrType;
  return Math.ceil(d / 2 + 4);
}

function clampPwr() {
  const m = pwrMargin();
  S.pwrX = Math.round(Math.min(S.L - m, Math.max(m, S.pwrX)));
  S.pwrY = Math.round(Math.min(S.B - m, Math.max(m, S.pwrY)));
}

/** Builds the invisible 3D hit target on the top lid at local (tx, ty) for direct 3D dragging. */
function buildPowerHitTarget(tx, ty, holeR) {
  const pg = new THREE.Group();
  pg.position.set(tx, ty, 0);
  const hitGeo = new THREE.CylinderGeometry(holeR + 6.5, holeR + 6.5, 10, 16);
  hitGeo.rotateX(Math.PI / 2);
  hitGeo.translate(0, 0, -1.0);
  pwrHitMesh = new THREE.Mesh(hitGeo, pwrHitMat);
  pg.add(pwrHitMesh);
  return pg;
}

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
function hinge(parent, x, y, rotZ, len, list, slots = []) {
  const h = new THREE.Group();
  h.position.set(x, y, 0);
  h.rotation.z = rotZ;
  parent.add(h);
  const f = new THREE.Group();
  h.add(f);
  const bridges = hingeBridges(len, slots);
  const pts = [];
  for (const [b0, b1] of bridges) {
    pts.push(new THREE.Vector3(b0, 0, T + 0.15), new THREE.Vector3(b1, 0, T + 0.15));
  }
  const lg = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.LineSegments(lg, bendMat);
  line.computeLineDistances();
  h.add(line);
  hinges.push({ h, len, bridges });
  folds[list].push(f);
  return f;
}
const flapShape = (w, h, r = R, edgeSlots = null) => rr(new THREE.Shape(), -w / 2, 0, w / 2, h, [0, 0, r, r], 16, edgeSlots);

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
  const box = (w, h, z_, x, z, y0 = PCB, mat = boardFill, edge = boardEdge, parent = g) => {
    const m = new THREE.Mesh(UNIT_BOX_GEO, mat);
    m.scale.set(w, h, z_);
    m.position.set(x, y0 + h / 2, z);
    if (edge) m.add(new THREE.LineSegments(UNIT_BOX_EDGES, edge));
    m.renderOrder = 5;
    parent.add(m);
    return m;
  };
  const cyl = (r, h, x, z, y0 = PCB, axis = 'y', mat = boardFill, edge = boardEdge, _segs = 18, parent = g) => {
    const isZ = axis === 'z';
    const m = new THREE.Mesh(isZ ? UNIT_CYL_Z_GEO : UNIT_CYL_Y_GEO, mat);
    if (isZ) m.scale.set(r, r, h);
    else m.scale.set(r, h, r);
    m.position.set(x, axis === 'y' ? y0 + h / 2 : y0, z);
    if (edge) m.add(new THREE.LineSegments(isZ ? UNIT_CYL_Z_EDGES : UNIT_CYL_Y_EDGES, edge));
    m.renderOrder = 5;
    parent.add(m);
    return m;
  };

  // 1. Detailed PCB substrate with corner mounting holes & circuit trace bus lines
  {
    const pcbShape = rr(new THREE.Shape(), -e / 2, -dp / 2, e / 2, dp / 2, [2.5, 2.5, 2.5, 2.5]);
    const mx = e / 2 - 5.5, mz = dp / 2 - 5.5;
    [[-mx, -mz], [mx, -mz], [-mx, mz], [mx, mz]].forEach(([hx, hz]) => {
      pcbShape.holes.push(circ(hx, hz, 1.8, 12));
      // Annular mounting ring on top of PCB
      const rm = new THREE.Mesh(UNIT_RING_GEO, boardAccentMat);
      rm.position.set(hx, PCB + 0.04, -hz);
      rm.renderOrder = 5;
      g.add(rm);
    });
    const pcbGeo = new THREE.ExtrudeGeometry(pcbShape, { depth: PCB, bevelEnabled: false, curveSegments: 4 });
    pcbGeo.rotateX(-Math.PI / 2);
    const pcbMesh = addMesh(pcbGeo, boardPcbMat, null, 0, 0, 0);
    pcbMesh.add(new THREE.LineSegments(shapeEdges(pcbShape, PCB, 4, -Math.PI / 2), boardOutlineMat));
  }

  // 2. Radial Blower Cooling Fan + Fin Stack + Dual Heatpipes
  const fr = Math.min(e, dp) * 0.175;
  const fx = e * 0.21, fz = -dp * 0.14;
  const fanH = Math.min(comp, 9.5);
  {
    // Blower housing with circular intake cutout
    const shroudShape = new THREE.Shape();
    shroudShape.absarc(0, 0, fr, 0, Math.PI * 2, false);
    shroudShape.holes.push(circ(0, 0, fr * 0.72, 18));
    const shroudGeo = new THREE.ExtrudeGeometry(shroudShape, { depth: fanH, bevelEnabled: false, curveSegments: 18 });
    shroudGeo.rotateX(-Math.PI / 2);
    const shroudMesh = addMesh(shroudGeo, boardFill, null, fx, PCB, fz);
    shroudMesh.add(new THREE.LineSegments(shapeEdges(shroudShape, fanH, 18, -Math.PI / 2), boardEdge));

    // Base plate under fan + central motor rotor hub + 11 angled impeller blades
    cyl(fr * 0.96, 0.8, fx, fz, PCB, 'y', boardPcbMat, null, 18);
    cyl(fr * 0.28, fanH * 0.82, fx, fz, PCB + 0.8, 'y', boardAccentMat, boardEdge, 18);
    const bladeCount = 11;
    const bladeLen = fr * 0.40;
    const bladeH = fanH * 0.65;
    for (let i = 0; i < bladeCount; i++) {
      const a = (i / bladeCount) * Math.PI * 2;
      const br = fr * 0.47;
      const bm = box(
        bladeLen,
        bladeH,
        0.65,
        fx + Math.cos(a) * br,
        fz + Math.sin(a) * br,
        PCB + 0.8,
        boardAccentMat,
        boardDetailEdge
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
    pg.position.set(x, 0, z);
    pg.rotation.y = rotY;
    box(13, 6.2, 11, 0, 0, PCB, boardAccentMat, boardEdge, pg);
    box(10.5, 1.4, 9, 0, -1.2, PCB + 2.9, boardFill, boardDetailEdge, pg);
    g.add(pg);
  };
  const usbC = (x, z, rotY = 0) => {
    const pg = new THREE.Group();
    pg.position.set(x, 0, z);
    pg.rotation.y = rotY;
    box(8.6, 3.2, 7.5, 0, 0, PCB, boardAccentMat, boardEdge, pg);
    g.add(pg);
  };
  const rj45 = (x, z, rotY = 0) => {
    const pg = new THREE.Group();
    pg.position.set(x, 0, z);
    pg.rotation.y = rotY;
    box(15.5, 11.5, 13.5, 0, 0, PCB, boardAccentMat, boardEdge, pg);
    box(11.5, 7.5, 4, 0, -5.2, PCB + 1.45, boardFill, boardDetailEdge, pg);
    g.add(pg);
  };
  const hdmi = (x, z, rotY = 0) => {
    const pg = new THREE.Group();
    pg.position.set(x, 0, z);
    pg.rotation.y = rotY;
    box(14.5, 5.5, 10.5, 0, 0, PCB, boardAccentMat, boardEdge, pg);
    g.add(pg);
  };
  const dcJack = (x, z, rotY = 0) => {
    const pg = new THREE.Group();
    pg.position.set(x, 0, z);
    pg.rotation.y = rotY;
    box(9.5, 8.5, 11.5, 0, 0, PCB, boardAccentMat, boardEdge, pg);
    cyl(2.6, 12, 0, -0.5, PCB + 4.25, 'z', boardFill, boardDetailEdge, 16, pg);
    g.add(pg);
  };
  const audioJack = (x, z, rotY = 0) => {
    const pg = new THREE.Group();
    pg.position.set(x, 0, z);
    pg.rotation.y = rotY;
    box(6.5, 5.0, 9.5, 0, 0, PCB, boardFill, boardEdge, pg);
    cyl(2.2, 3.0, 0, -5.5, PCB + 2.5, 'z', boardAccentMat, boardEdge, 16, pg);
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

  // 8. Onboard Power Button / Tactile Switch aligned with the top-lid Power Button position
  boardPwrGroup = null;
  if (S.pwrType !== 'none') {
    boardPwrGroup = new THREE.Group();
    boardPwrGroup.position.set(-e / 2 + S.pwrX, 0, -dp / 2 + S.pwrY);
    box(6.8, 2.2, 6.8, 0, 0, PCB, boardAccentMat, boardEdge, boardPwrGroup);
    cyl(2.2, 1.8, 0, 0, PCB + 2.2, 'y', boardFill, boardEdge, 18, boardPwrGroup);
    g.add(boardPwrGroup);
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
    const geo = new THREE.ExtrudeGeometry(shape, { depth: CORK_T, bevelEnabled: false, curveSegments: 4 });
    const mesh = new THREE.Mesh(geo, isFrame ? corkFrameMat : corkMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.castShadow = mesh.receiveShadow = true;
    const edges = new THREE.LineSegments(shapeEdges(shape, CORK_T, 4), isFrame ? corkFrameEdgeMat : corkEdgeMat);
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
  const hasPwr = S.pwrType !== 'none';
  const footSheetPos = footCoords.map((_, i) => {
    const u = hasPwr ? (i - 2) * 22 : (i - 1.5) * 24;
    const v = -(corkD / 2 - 14);
    frameShape.holes.push(
      rr(new THREE.Path(), u - (cfW / 2 + kerf), v - (cfD / 2 + kerf), u + (cfW / 2 + kerf), v + (cfD / 2 + kerf), [cfR + 0.5, cfR + 0.5, cfR + 0.5, cfR + 0.5])
    );
    return { u, v };
  });

  // Die-cut opening in cork carrier sheet for the Cork Power Button ("Kork-Startknopf")
  let pwrCork = null;
  if (hasPwr) {
    const holeR = (+S.pwrType) / 2;
    const flangeR = holeR + 1.6;
    const capR = holeR - 0.15;
    const btnU = 46;
    const btnV = -(corkD / 2 - 14);
    frameShape.holes.push(circ(btnU, btnV, flangeR + kerf, 20));

    // Stepped 5 mm cork button: bottom retaining collar (1.8 mm) + upper button cap (3.2 mm) protruding through top lid
    const btnGroup = new THREE.Group();
    const flangeH = 1.8;
    const flangeShape = new THREE.Shape();
    flangeShape.absarc(0, 0, flangeR, 0, Math.PI * 2, false);
    const flangeGeo = new THREE.ExtrudeGeometry(flangeShape, { depth: flangeH, bevelEnabled: false, curveSegments: 20 });
    const flangeMesh = new THREE.Mesh(flangeGeo, corkMat);
    flangeMesh.castShadow = flangeMesh.receiveShadow = true;
    flangeMesh.add(new THREE.LineSegments(shapeEdges(flangeShape, flangeH, 20), corkEdgeMat));
    btnGroup.add(flangeMesh);

    const capH = CORK_T - flangeH;
    const capShape = new THREE.Shape();
    capShape.absarc(0, 0, capR, 0, Math.PI * 2, false);
    const capGeo = new THREE.ExtrudeGeometry(capShape, { depth: capH, bevelEnabled: false, curveSegments: 20 });
    capGeo.translate(0, 0, flangeH);
    const capMesh = new THREE.Mesh(capGeo, corkMat);
    capMesh.castShadow = capMesh.receiveShadow = true;
    capMesh.add(new THREE.LineSegments(shapeEdges(capShape, capH, 20).translate(0, 0, flangeH), corkEdgeMat));
    btnGroup.add(capMesh);

    // Laser-branded dark Power icon (⏻) on top of the cork Startknopf
    const ringGeo = new THREE.RingGeometry(capR * 0.40, capR * 0.56, 20, 1, Math.PI * 0.72, Math.PI * 1.56);
    ringGeo.translate(0, 0, CORK_T + 0.03);
    btnGroup.add(new THREE.Mesh(ringGeo, pwrIconMat));

    const barGeo = new THREE.PlaneGeometry(capR * 0.16, capR * 0.54);
    barGeo.translate(0, capR * 0.35, CORK_T + 0.03);
    btnGroup.add(new THREE.Mesh(barGeo, pwrIconMat));

    btnGroup.rotation.x = -Math.PI / 2;
    g.add(btnGroup);

    pwrCork = {
      mesh: btnGroup,
      shape: flangeShape,
      capShape,
      u: btnU,
      v: btnV,
      startX: sheetX + btnU,
      startZ: sheetZ - btnV,
      targetX: -e / 2 + S.pwrX,
      targetZ: -dp / 2 + S.pwrY,
      flangeH,
    };
  }

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
    pwrCork,
    sheetX,
    sheetZ,
    corkW,
    corkD,
  };
}

/* ───────── engraving texture (cached by font + text) ───────── */
const engrTexCache = new Map();

function getEngravingTex(text) {
  const key = `${S.font}:${text}`;
  let entry = engrTexCache.get(key);
  if (entry) return entry;
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
  entry = { tex, width: c.width, height: c.height };
  if (engrTexCache.size > 24) {
    const oldestKey = engrTexCache.keys().next().value;
    engrTexCache.get(oldestKey)?.tex.dispose();
    engrTexCache.delete(oldestKey);
  }
  engrTexCache.set(key, entry);
  return entry;
}

function makeEngraving(text, maxW, hMM, onWall = false) {
  const { tex, width, height } = getEngravingTex(text);
  let h = hMM, w = h * (width / height);
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

function disposeGroupGeometries(group, disposeMappedMats = false) {
  if (!group) return;
  group.traverse(o => {
    if (o.geometry && !o.geometry.userData?.shared) o.geometry.dispose();
    if (disposeMappedMats && o.material?.map) o.material.dispose();
  });
}

/* ───────── case build ───────── */
function build() {
  if (root) {
    disposeGroupGeometries(root, true);
    scene.remove(root);
  }
  if (boardGroup) {
    disposeGroupGeometries(boardGroup, false);
    scene.remove(boardGroup);
  }
  if (corkGroup) {
    disposeGroupGeometries(corkGroup, false);
    scene.remove(corkGroup);
  }

  panels = []; hinges = []; decals = [];
  topLidGroup = null; pwrHitMesh = null; boardPwrGroup = null;
  clampPwr();
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

  const wallH = H - T;
  const ymid = wallH / 2;
  const tabLen = wallH - 6;
  const fbW = W - 2 * T;
  const lipScrewX = fbW / 2 - 14;
  const lw = W - 2 * R - 2;

  // Slotted bend-relief patterns ("kleine Rechtecke / Scharniere") so only narrow metal bridges are bent
  const fbSlots = hingeSlots(fbW);
  const sideSlots = hingeSlots(D);
  const lipSlots = hingeSlots(lw, {
    endB: 5.0,
    bridgeW: 5.2,
    targetSlot: 18,
    keepSolid: [{ x: -lipScrewX, halfW: 4.5 }, { x: lipScrewX, halfW: 4.5 }],
  });
  const tabSlots = tabHingeSlots(tabLen);
  const clampSlots = [[-2.2, 2.2]];

  /* bottom plate (centre of the blank — stationary base with stamped clamps & feet) */
  {
    const bh = [];
    const e = S.L, dp = S.B;
    const riserH = T + STANDOFF + PCB;
    const clampTotal = riserH + CLAMP_LIP;
    const kerf = 0.8;

    // 1. Cutouts & hinges for the 4 side metal clamps that fix the mainboard on the cork pad
    // Left clamp (-X edge, folds inward +X)
    bh.push(rr(new THREE.Path(), -e / 2, -(CLAMP_W / 2 + kerf), -e / 2 + clampTotal + kerf, CLAMP_W / 2 + kerf, [0, 0, 0, 0], 4, {
      left: { slots: clampSlots, d: -CLAMP_SLOT_D },
    }));
    // Right clamp (+X edge, folds inward -X)
    bh.push(rr(new THREE.Path(), e / 2 - clampTotal - kerf, -(CLAMP_W / 2 + kerf), e / 2, CLAMP_W / 2 + kerf, [0, 0, 0, 0], 4, {
      right: { slots: clampSlots, d: -CLAMP_SLOT_D },
    }));
    // Front clamp (-Y edge, folds inward +Y)
    bh.push(rr(new THREE.Path(), -(CLAMP_W / 2 + kerf), -dp / 2, CLAMP_W / 2 + kerf, -dp / 2 + clampTotal + kerf, [0, 0, 0, 0], 4, {
      bottom: { slots: clampSlots, d: -CLAMP_SLOT_D },
    }));
    // Back clamp (+Y edge, folds inward -Y)
    bh.push(rr(new THREE.Path(), -(CLAMP_W / 2 + kerf), dp / 2 - clampTotal - kerf, CLAMP_W / 2 + kerf, dp / 2, [0, 0, 0, 0], 4, {
      top: { slots: clampSlots, d: -CLAMP_SLOT_D },
    }));

    const clampSpecs = [
      [-e / 2, 0, -Math.PI / 2],
      [ e / 2, 0,  Math.PI / 2],
      [0, -dp / 2, 0],
      [0,  dp / 2, Math.PI],
    ];
    clampSpecs.forEach(([cx, cy, rz]) => {
      const cf = hinge(root, cx, cy, rz, CLAMP_W, 'clampBase', clampSlots);
      addPanel(cf, rr(new THREE.Shape(), -CLAMP_W / 2, 0, CLAMP_W / 2, riserH, [0, 0, 0, 0], 16, {
        bottom: { slots: clampSlots, d: CLAMP_SLOT_D },
        top: { slots: clampSlots, d: CLAMP_SLOT_D },
      }), [], 'clampBase');
      const lf = hinge(cf, 0, riserH, 0, CLAMP_W, 'clampTop', clampSlots);
      addPanel(lf, flapShape(CLAMP_W, CLAMP_LIP, 2, {
        bottom: { slots: clampSlots, d: CLAMP_SLOT_D },
      }), [], 'clampTop');
    });

    // 2. Cutouts & hinges for the 4 bent metal foot prongs (skewering the pre-punched cork feet)
    footCoords.forEach(([fx, fy]) => {
      bh.push(rectHole(fx - (FOOT_W / 2 + kerf), fy - FOOT_LEN / 2 - kerf, fx + (FOOT_W / 2 + kerf), fy + FOOT_LEN / 2));
      const ff = hinge(root, fx, fy + FOOT_LEN / 2, Math.PI, FOOT_W, 'feet');
      addPanel(ff, footProngShape(FOOT_W, FOOT_LEN), [], 'foot');
    });

    // 3. Vents under the board (kept inside the clamp cutouts)
    bh.push(...vents(-e / 2 + 24, -dp * 0.18, e / 2 - 24, dp * 0.18, S.vents, 120));

    addPanel(root, rr(new THREE.Shape(), -W / 2, -D / 2, W / 2, D / 2, [0, 0, 0, 0], 16, {
      bottom: { slots: fbSlots, d: BEND_SLOT_D },
      top: { slots: fbSlots, d: BEND_SLOT_D },
      right: { slots: sideSlots, d: BEND_SLOT_D },
      left: { slots: sideSlots, d: BEND_SLOT_D },
    }), bh, 'bottom');
  }

  // On every wall, local y=0 is at the bottom plate and y=wallH is at the top lid
  const ioHoles = (side, spanW) => {
    if (!S.ioSides[side]) return [];
    const y0 = STANDOFF;
    const gridH = Math.min(Math.max(13, S.Hc * 0.72), wallH - LIP - y0 - 2);
    const y1 = y0 + gridH;
    return breakoutGrid(-(spanW / 2 - 22), y0, spanW / 2 - 22, y1, +S.tile);
  };

  /* front + back walls with corner tabs */
  const addTabs = (f) => {
    [[fbW / 2, -Math.PI / 2], [-fbW / 2, Math.PI / 2]].forEach(([x, rz]) => {
      const tf = hinge(f, x, ymid, rz, tabLen, 'tabs', tabSlots);
      addPanel(tf, flapShape(tabLen, TAB, 2, {
        bottom: { slots: tabSlots, d: TAB_SLOT_D },
      }), [circ(tabLen / 4, TAB / 2, 1.7), circ(-tabLen / 4, TAB / 2, 1.7)], 'tab');
    });
  };

  // front wall (root −Y → world +Z), folds UP (+90°)
  {
    const f = hinge(root, 0, -D / 2, Math.PI, fbW, 'fb', fbSlots);
    const holes = [...ioHoles('front', fbW), circ(lipScrewX, wallH - LIP / 2, 1.7), circ(-lipScrewX, wallH - LIP / 2, 1.7)];
    addPanel(f, flapShape(fbW, wallH, R, {
      bottom: { slots: fbSlots, d: BEND_SLOT_D },
      right: { slots: tabSlots, d: TAB_SLOT_D },
      left: { slots: tabSlots, d: TAB_SLOT_D },
    }), holes, 'front');
    addTabs(f);
    if (engr === 'front') {
      const m = makeEngraving(text, fbW - 30, Math.min(9, (wallH - LIP) * .45), true);
      m.position.set(0, (wallH - LIP) / 2, -0.06);
      f.add(m);
    }
  }

  // back wall (root +Y → world −Z), folds UP (+90°) and carries top lid + front lip
  {
    const f = hinge(root, 0, D / 2, 0, fbW, 'fb', fbSlots);
    addPanel(f, rr(new THREE.Shape(), -fbW / 2, 0, fbW / 2, wallH, [0, 0, 0, 0], 16, {
      bottom: { slots: fbSlots, d: BEND_SLOT_D },
      top: { slots: fbSlots, d: BEND_SLOT_D },
      right: { slots: tabSlots, d: TAB_SLOT_D },
      left: { slots: tabSlots, d: TAB_SLOT_D },
    }), ioHoles('back', fbW), 'back');
    addTabs(f);

    // top lid (der Deckel) hinges from the top of the back wall and folds forward over the case
    const tf = hinge(f, 0, wallH, 0, fbW, 'top', fbSlots);
    topLidGroup = tf;
    const hasPwr = S.pwrType !== 'none';
    const pwrR = hasPwr ? (+S.pwrType) / 2 : 0;
    const pwrTx = -S.L / 2 + S.pwrX;
    const pwrTy = MARGIN + T + S.pwrY;
    const pwrKeepOut = hasPwr ? { x: pwrTx, y: pwrTy, r: pwrR + 4.0 } : null;
    const th = [...vents(8, 14, W / 2 - 14, D - 14, S.vents, 260, pwrKeepOut)];
    if (hasPwr) {
      th.push(circ(pwrTx, pwrTy, pwrR, 24));
    }
    const topMesh = addPanel(tf, flapShape(W, D + T, R, {
      bottom: { slots: fbSlots, d: BEND_SLOT_D },
      top: { slots: lipSlots, d: LIP_SLOT_D },
    }), th, 'top');
    let topDecal = null;
    if (engr === 'top') {
      const m = makeEngraving(text, W / 2 - 26, 10, false);
      const g = m.geometry.parameters;
      let ex = -W / 2 + 14 + g.width / 2;
      let ey = 14 + g.height / 2;
      if (hasPwr) {
        const padR = pwrR + 5;
        const nearX = Math.max(ex - g.width / 2, Math.min(pwrTx, ex + g.width / 2));
        const nearY = Math.max(ey - g.height / 2, Math.min(pwrTy, ey + g.height / 2));
        if (Math.hypot(pwrTx - nearX, pwrTy - nearY) < padR) {
          const altY = pwrTy + padR + g.height / 2 + 2;
          ey = (altY + g.height / 2 <= D - 12) ? altY : (D - 14 - g.height / 2);
        }
      }
      m.position.set(ex, ey, -0.06);
      tf.add(m);
      topDecal = m;
    }
    let pwrBtnGroup = null;
    if (hasPwr) {
      pwrBtnGroup = buildPowerHitTarget(pwrTx, pwrTy, pwrR);
      tf.add(pwrBtnGroup);
    }
    tf.userData = { topMesh, topDecal, pwrBtnGroup, fbSlots, lipSlots };

    // front lip hinges down from the front edge of the top lid (over the outside of the front wall)
    const lf = hinge(tf, 0, D + T, 0, lw, 'lip', lipSlots);
    addPanel(lf, flapShape(lw, LIP, 2, {
      bottom: { slots: lipSlots, d: LIP_SLOT_D },
    }), [circ(lipScrewX, LIP / 2, 1.7), circ(-lipScrewX, LIP / 2, 1.7)], 'lip');
  }

  /* side walls (fold UP +90° from left/right edges of bottom plate) */
  const tabHolesSide = () => {
    const out = [];
    const dx = D / 2 - T - TAB / 2;
    [dx, -dx].forEach(lx => [ymid - tabLen / 4, ymid + tabLen / 4].forEach(ly => out.push(circ(lx, ly, 1.7))));
    return out;
  };
  [['right', W / 2, -Math.PI / 2], ['left', -W / 2, Math.PI / 2]].forEach(([side, x, rz]) => {
    const f = hinge(root, x, 0, rz, D, 'side', sideSlots);
    const holes = [...ioHoles(side, D), ...tabHolesSide()];
    const engrHere = engr === 'side' && side === 'right';
    if (!S.ioSides[side] && !engrHere) holes.push(...vents(-D / 2 + 24, wallH * .3, D / 2 - 24, wallH * .72, S.vents, 120));
    addPanel(f, flapShape(D, wallH, R, {
      bottom: { slots: sideSlots, d: BEND_SLOT_D },
    }), holes, side);
    if (engrHere) {
      const m = makeEngraving(text, D - 40, Math.min(9, wallH * .4), true);
      m.position.set(0, wallH / 2, -0.06);
      f.add(m);
    }
  });

  applyFold(S.fold);
  updateReadout();
}

/**
 * Fast-path update when only the Power-Button (pwrX, pwrY) is moved:
 * Rebuilds ONLY the top lid panel mesh (hole + vent keep-out) and updates transforms
 * of the 3D hit target, top decal, onboard tactile switch, and cork button without touching
 * the mainboard, cork sheet, bottom plate, or side walls.
 */
function updatePowerButtonFast() {
  if (!root || !topLidGroup || S.pwrType === 'none') {
    build();
    return;
  }
  clampPwr();
  const { W, D } = dims();
  const ud = topLidGroup.userData;
  const pwrR = (+S.pwrType) / 2;
  const pwrTx = -S.L / 2 + S.pwrX;
  const pwrTy = MARGIN + T + S.pwrY;
  const pwrKeepOut = { x: pwrTx, y: pwrTy, r: pwrR + 4.0 };
  const th = [...vents(8, 14, W / 2 - 14, D - 14, S.vents, 260, pwrKeepOut), circ(pwrTx, pwrTy, pwrR, 24)];

  const topShape = flapShape(W, D + T, R, {
    bottom: { slots: ud.fbSlots, d: BEND_SLOT_D },
    top: { slots: ud.lipSlots, d: LIP_SLOT_D },
  });
  topShape.holes.push(...th);

  if (ud.topMesh) {
    disposeGroupGeometries(ud.topMesh, false);
    topLidGroup.remove(ud.topMesh);
  }
  const geo = new THREE.ExtrudeGeometry(topShape, { depth: T, bevelEnabled: false, curveSegments: 4 });
  const newTopMesh = new THREE.Mesh(geo, caseMat);
  newTopMesh.castShadow = newTopMesh.receiveShadow = true;
  newTopMesh.add(new THREE.LineSegments(shapeEdges(topShape, T, 4), edgeMat));
  topLidGroup.add(newTopMesh);
  ud.topMesh = newTopMesh;

  const pEntry = panels.find(p => p.tag === 'top');
  if (pEntry) {
    pEntry.mesh = newTopMesh;
    pEntry.shape = topShape;
  }

  if (ud.pwrBtnGroup) {
    ud.pwrBtnGroup.position.x = pwrTx;
    ud.pwrBtnGroup.position.y = pwrTy;
  }

  if (ud.topDecal) {
    const g = ud.topDecal.geometry.parameters;
    const ex = -W / 2 + 14 + g.width / 2;
    let ey = 14 + g.height / 2;
    const padR = pwrR + 5;
    const nearX = Math.max(ex - g.width / 2, Math.min(pwrTx, ex + g.width / 2));
    const nearY = Math.max(ey - g.height / 2, Math.min(pwrTy, ey + g.height / 2));
    if (Math.hypot(pwrTx - nearX, pwrTy - nearY) < padR) {
      const altY = pwrTy + padR + g.height / 2 + 2;
      ey = (altY + g.height / 2 <= D - 12) ? altY : (D - 14 - g.height / 2);
    }
    ud.topDecal.position.x = ex;
    ud.topDecal.position.y = ey;
  }

  if (boardPwrGroup) {
    boardPwrGroup.position.set(-S.L / 2 + S.pwrX, 0, -S.B / 2 + S.pwrY);
  }
  if (corkAnim?.pwrCork) {
    corkAnim.pwrCork.targetX = -S.L / 2 + S.pwrX;
    corkAnim.pwrCork.targetZ = -S.B / 2 + S.pwrY;
  }

  applyFold(S.fold);
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
  const fbFold = ease(t, 0.62, 0.78);
  const sideFold = ease(t, 0.70, 0.86);
  const topFold = ease(t, 0.82, 0.95);
  folds.fb.forEach(f => f.rotation.x = A * fbFold);
  folds.side.forEach(f => f.rotation.x = A * sideFold);
  folds.top.forEach(f => {
    f.rotation.x = A * topFold;
    if (f.userData?.topMesh) f.userData.topMesh.position.z = -T * topFold;
    if (f.userData?.topDecal) f.userData.topDecal.position.z = -0.06 - T * topFold;
    if (f.userData?.pwrBtnGroup) f.userData.pwrBtnGroup.position.z = -T * topFold;
  });
  folds.lip.forEach(f => f.rotation.x = A * ease(t, 0.93, 1.00));

  bendMat.opacity = 1 - ease(t, 0, 0.15);
  root.updateMatrixWorld(true);

  // Phase 2 (0.02 -> 0.44): Pop cork parts out of cork sheet, skewer cork feet, place cork base pad,
  // and plug the Cork Startknopf directly into the flat top lid so it folds closed together with the lid!
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

    // Stepped Cork Power Button pops out right at the beginning (0.14 -> 0.43) in a high arc well above
    // the bottom plate, hovers over the flat lid hole, plugs straight down, and folds closed with the lid!
    if (corkAnim.pwrCork && topLidGroup) {
      const pc = corkAnim.pwrCork;
      const moveXZ = ease(t, 0.14, 0.36);
      const seatIn = ease(t, 0.36, 0.43);
      const pwrTx = -S.L / 2 + S.pwrX;
      const pwrTy = MARGIN + T + S.pwrY;
      const lidWorldPos = new THREE.Vector3(pwrTx, pwrTy, T + pc.flangeH - T * topFold).applyMatrix4(topLidGroup.matrixWorld);
      const lidWorldRotX = Math.PI / 2 + A * (fbFold + topFold);

      const bx = THREE.MathUtils.lerp(pc.startX, lidWorldPos.x, moveXZ);
      const bz = THREE.MathUtils.lerp(pc.startZ, lidWorldPos.z, moveXZ);
      const startLift = pop * 24;
      const hoverY = lidWorldPos.y + 18 * (1 - seatIn);
      const arcY = Math.sin(moveXZ * Math.PI) * 78;
      const by = THREE.MathUtils.lerp(startLift, hoverY, moveXZ) + arcY;
      pc.mesh.position.set(bx, by, bz);
      pc.mesh.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2, lidWorldRotX, moveXZ);
    }
  }
}

/* ───────── flat-pattern / specs ───────── */
function ptOnSeg(px, py, ax, ay, bx, by, tol = 0.06) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-6) return false;
  const t = ((px - ax) * dx + (py - ay) * dy) / len2;
  if (t < -tol || t > 1 + tol) return false;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) <= tol;
}

function isBendBridgeSeg(p, q, bends) {
  return bends.some(([ax, ay, bx, by]) => ptOnSeg(p[0], p[1], ax, ay, bx, by) && ptOnSeg(q[0], q[1], ax, ay, bx, by));
}

function loopToSvgPath(l, bends) {
  const n = l.length;
  if (n < 2) return '';
  const f = v => v.toFixed(2);
  let d = '';
  let penDown = false;
  for (let i = 0; i < n; i++) {
    const p = l[i], q = l[(i + 1) % n];
    if (isBendBridgeSeg(p, q, bends)) {
      penDown = false;
    } else {
      if (!penDown) {
        d += `M${f(p[0])} ${f(p[1])}`;
        penDown = true;
      }
      d += `L${f(q[0])} ${f(q[1])}`;
    }
  }
  return d;
}

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
  for (const { h, bridges } of hinges) {
    const m = new THREE.Matrix4().multiplyMatrices(inv, h.matrixWorld);
    for (const [b0, b1] of bridges) {
      const a = new THREE.Vector3(b0, 0, 0).applyMatrix4(m), b = new THREE.Vector3(b1, 0, 0).applyMatrix4(m);
      bends.push([a.x, a.y, b.x, b.y]);
    }
  }
  for (const { m: dm, text, h } of decals) {
    const m = new THREE.Matrix4().multiplyMatrices(inv, dm.matrixWorld);
    const c = new THREE.Vector3().applyMatrix4(m), x = new THREE.Vector3(1, 0, 0).applyMatrix4(m);
    texts.push({ x: c.x, y: c.y, a: Math.atan2(x.y - c.y, x.x - c.x) * 180 / Math.PI, text, h });
  }
  // Include die-cut cork sheet in net & SVG export
  if (corkAnim) {
    const { frameShape, padShape, padOffV, footMeshes, pwrCork, sheetX, sheetZ } = corkAnim;
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
    if (pwrCork) {
      addCorkShape(pwrCork.shape, sheetX + pwrCork.u, -sheetZ + pwrCork.v);
      addCorkShape(pwrCork.capShape, sheetX + pwrCork.u, -sheetZ + pwrCork.v);
    }
  }
  applyFold(prev);
  return { loops, bends, texts, corkLoops, bb, area };
}

function exportSVG() {
  const { loops, bends, texts, corkLoops, bb } = computeNet();
  const pad = 10;
  const x0 = bb.min.x - pad, y0 = bb.min.y - pad, w = bb.max.x - bb.min.x + 2 * pad, h = bb.max.y - bb.min.y + 2 * pad;
  const f = n => n.toFixed(2);
  const paths = loops.map(l => loopToSvgPath(l, bends)).join('');
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
let dirty = false, pwrDirty = false;
const invalidate = () => { dirty = true; };
const invalidatePwr = () => { pwrDirty = true; };

function updateReadout() {
  const { W, D, H } = dims();
  $('#readout').textContent = `${Math.round(W)} × ${Math.round(D)} × ${Math.round(H)} MM`;
}

function setRangeFill(r) {
  r.style.setProperty('--p', `${((r.value - r.min) / (r.max - r.min)) * 100}%`);
}

// EINE Dropliste (Marken untereinander -> Klick -> Laptops zur Modellauswahl)
const presetDropdownEl = $('#presetDropdown');
const presetBtnEl = $('#presetBtn');
const presetBtnTextEl = $('#presetBtnText');
const presetMenuEl = $('#presetMenu');

let activeBrand = null; // null = Marken-Liste, string = Laptops dieser Marke
const BRANDS = [...new Set(LAPTOP_PRESETS.map(p => p.brand))];

function syncDimInputs() {
  ['L', 'B', 'Hc'].forEach(k => {
    $$(`[data-k="${k}"]`).forEach(o => {
      o.value = S[k];
      if (o.type === 'range') setRangeFill(o);
    });
  });
}

function updatePresetBtnText() {
  if (!presetBtnTextEl) return;
  const cur = LAPTOP_PRESETS.find(p => p.id === S.presetId);
  if (cur) {
    presetBtnTextEl.textContent = `${cur.brand} · ${cur.model} (${cur.L}×${cur.B}×${cur.Hc})`;
  } else {
    presetBtnTextEl.textContent = 'Laptop-Vorlage wählen…';
  }
}

function renderPresetMenu() {
  if (!presetMenuEl) return;
  presetMenuEl.innerHTML = '';
  presetMenuEl.scrollTop = 0;

  const curPreset = LAPTOP_PRESETS.find(p => p.id === S.presetId);

  // Schritt 1: Marken stehen untereinander zum Durchscrollen
  if (!activeBrand) {
    // Option für eigene Maße
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'preset-item' + (!S.presetId ? ' is-active' : '');
    resetBtn.innerHTML = `
      <span class="preset-item-title">Eigene Maße (keine Vorlage)</span>
      <span class="preset-item-meta">${S.L}×${S.B}×${S.Hc}</span>
    `;
    resetBtn.onclick = () => {
      S.presetId = null;
      updatePresetBtnText();
      closePresetMenu();
    };
    presetMenuEl.appendChild(resetBtn);

    // Alle Marken untereinander
    BRANDS.forEach(brand => {
      const count = LAPTOP_PRESETS.filter(p => p.brand === brand).length;
      const btn = document.createElement('button');
      btn.type = 'button';
      const isCurrentBrand = curPreset?.brand === brand;
      btn.className = 'preset-item' + (isCurrentBrand ? ' is-active' : '');
      btn.innerHTML = `
        <span class="preset-item-title">${brand}</span>
        <span class="preset-item-meta">${count} Modelle ›</span>
      `;
      btn.onclick = (e) => {
        e?.stopPropagation?.();
        activeBrand = brand;
        renderPresetMenu();
      };
      presetMenuEl.appendChild(btn);
    });
    return;
  }

  // Schritt 2: Nach Klick auf Marke -> Liste wird zu den Laptops dieser Marke
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'preset-back-btn';
  backBtn.innerHTML = `<span>‹ Alle Marken</span><span>${activeBrand}</span>`;
  backBtn.onclick = (e) => {
    e?.stopPropagation?.();
    activeBrand = null;
    renderPresetMenu();
  };
  presetMenuEl.appendChild(backBtn);

  const models = LAPTOP_PRESETS.filter(p => p.brand === activeBrand);
  models.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isSelected = p.id === S.presetId;
    btn.className = 'preset-item' + (isSelected ? ' is-active' : '');
    btn.innerHTML = `
      <span class="preset-item-title">${p.model}</span>
      <span class="preset-item-meta">${p.L}×${p.B}×${p.Hc} mm</span>
    `;
    btn.onclick = () => {
      S.presetId = p.id;
      S.L = p.L;
      S.B = p.B;
      S.Hc = p.Hc;
      if (['Framework', 'Lenovo', 'Dell', 'HP', 'Razer', 'Samsung', 'Huawei'].includes(p.brand)) {
        S.pwrX = p.L - 22;
        S.pwrY = 20;
      } else if (['ASUS', 'MSI'].includes(p.brand)) {
        S.pwrX = p.L - 26;
        S.pwrY = 24;
      } else {
        S.pwrX = Math.round(p.L * 0.5);
        S.pwrY = 18;
      }
      clampPwr();
      syncDimInputs();
      syncPwrUI();
      updatePresetBtnText();
      closePresetMenu();
      invalidate();
      fitSoon();
    };
    presetMenuEl.appendChild(btn);
  });
}

function openPresetMenu() {
  if (!presetMenuEl || !presetBtnEl) return;
  activeBrand = null; // beim Öffnen immer mit den Marken starten
  renderPresetMenu();
  presetMenuEl.hidden = false;
  presetBtnEl.setAttribute('aria-expanded', 'true');
}

function closePresetMenu() {
  if (!presetMenuEl || !presetBtnEl) return;
  presetMenuEl.hidden = true;
  presetBtnEl.setAttribute('aria-expanded', 'false');
}

function togglePresetMenu(e) {
  e?.preventDefault?.();
  if (!presetMenuEl) return;
  if (presetMenuEl.hidden) {
    openPresetMenu();
  } else {
    closePresetMenu();
  }
}

if (presetBtnEl) {
  presetBtnEl.onclick = togglePresetMenu;
}

document.addEventListener('pointerdown', (e) => {
  if (presetDropdownEl && !presetDropdownEl.contains(e.target) && presetMenuEl && !presetMenuEl.hidden) {
    closePresetMenu();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && presetMenuEl && !presetMenuEl.hidden) {
    closePresetMenu();
  }
});

closePresetMenu();
updatePresetBtnText();

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
    const changed = S[k] !== c;
    S[k] = c;
    $$(`[data-k="${k}"]`).forEach(o => { if (o !== el || final) o.value = c; if (o.type === 'range') setRangeFill(o); });
    if (!changed) return;
    clampPwr();
    syncPwrUI();
    const match = LAPTOP_PRESETS.find(p => p.L === S.L && p.B === S.B && p.Hc === S.Hc);
    S.presetId = match ? match.id : null;
    updatePresetBtnText();
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
seg('#pwrSeg', 'pwrType', () => { clampPwr(); syncPwrUI(); });
seg('#ventSeg', 'vents', () => syncPwrUI());
const syncEngr = seg('#engrSeg', 'engr');
seg('#fontSeg', 'font');

// Power-Button 2D Top-View Positioner + X/Y inputs + 3D direct dragging
const pwrHintEl = $('#pwrHint');
const pwrOptsEl = $('#pwrOpts');
const pwrNoneMsgEl = $('#pwrNoneMsg');
const pwrPadEl = $('#pwrPad');
const pwrPadVentsEl = $('#pwrPadVents');
const pwrCrossXEl = $('#pwrCrossX');
const pwrCrossYEl = $('#pwrCrossY');
const pwrHandleEl = $('#pwrHandle');
const pwrCoordBadgeEl = $('#pwrCoordBadge');

function syncPwrUI() {
  clampPwr();
  const has = S.pwrType !== 'none';
  if (pwrHintEl) pwrHintEl.textContent = has ? `· Ø ${S.pwrType} mm` : '· Aus';
  if (pwrOptsEl) pwrOptsEl.hidden = !has;
  if (pwrNoneMsgEl) pwrNoneMsgEl.hidden = has;
  if (pwrPadVentsEl) pwrPadVentsEl.hidden = S.vents === 'none';

  const m = pwrMargin();
  const maxX = Math.max(m, S.L - m);
  const maxY = Math.max(m, S.B - m);

  $$('[data-pwr="pwrX"]').forEach(el => {
    el.min = m;
    el.max = maxX;
    el.value = S.pwrX;
    if (el.type === 'range') setRangeFill(el);
  });
  $$('[data-pwr="pwrY"]').forEach(el => {
    el.min = m;
    el.max = maxY;
    el.value = S.pwrY;
    if (el.type === 'range') setRangeFill(el);
  });

  const u = 0.08 + (S.pwrX / S.L) * 0.84;
  const v = 0.11 + (S.pwrY / S.B) * 0.78;
  const pctX = `${(u * 100).toFixed(1)}%`;
  const pctY = `${(v * 100).toFixed(1)}%`;
  if (pwrHandleEl) {
    pwrHandleEl.style.left = pctX;
    pwrHandleEl.style.top = pctY;
  }
  if (pwrCrossXEl) pwrCrossXEl.style.left = pctX;
  if (pwrCrossYEl) pwrCrossYEl.style.top = pctY;
  if (pwrCoordBadgeEl) pwrCoordBadgeEl.textContent = `X ${S.pwrX} · Y ${S.pwrY} mm`;
}

$$('[data-pwr]').forEach(el => {
  const k = el.dataset.pwr;
  const commit = (v, final) => {
    if (Number.isNaN(v)) return;
    const min = +el.min, max = +el.max;
    if (!final && (v < min || v > max)) return;
    const prevX = S.pwrX, prevY = S.pwrY;
    S[k] = Math.round(v);
    clampPwr();
    syncPwrUI();
    if (S.pwrX !== prevX || S.pwrY !== prevY) invalidatePwr();
  };
  el.addEventListener('input', () => commit(+el.value, el.type === 'range'));
  el.addEventListener('change', () => commit(+el.value, true));
});

if (pwrPadEl) {
  let padDragging = false;
  const updateFromPadEvent = (e) => {
    const rect = pwrPadEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const prevX = S.pwrX, prevY = S.pwrY;
    const u = ((e.clientX - rect.left) / rect.width - 0.08) / 0.84;
    const v = ((e.clientY - rect.top) / rect.height - 0.11) / 0.78;
    S.pwrX = Math.round(u * S.L);
    S.pwrY = Math.round(v * S.B);
    clampPwr();
    if (S.pwrX === prevX && S.pwrY === prevY) return;
    syncPwrUI();
    invalidatePwr();
  };
  pwrPadEl.addEventListener('pointerdown', (e) => {
    padDragging = true;
    pwrPadEl.setPointerCapture?.(e.pointerId);
    updateFromPadEvent(e);
  });
  pwrPadEl.addEventListener('pointermove', (e) => {
    if (!padDragging) return;
    updateFromPadEvent(e);
  });
  const stopPadDrag = () => { padDragging = false; };
  pwrPadEl.addEventListener('pointerup', stopPadDrag);
  pwrPadEl.addEventListener('pointercancel', stopPadDrag);
  pwrPadEl.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 5 : 1;
    const prevX = S.pwrX, prevY = S.pwrY;
    if (e.key === 'ArrowLeft') { S.pwrX -= step; }
    else if (e.key === 'ArrowRight') { S.pwrX += step; }
    else if (e.key === 'ArrowUp') { S.pwrY -= step; }
    else if (e.key === 'ArrowDown') { S.pwrY += step; }
    else return;
    e.preventDefault();
    clampPwr();
    if (S.pwrX === prevX && S.pwrY === prevY) return;
    syncPwrUI();
    invalidatePwr();
  });
}
syncPwrUI();

// Direct 3D dragging of the Power-Button on the case top lid
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const dragHit = new THREE.Vector3();
let dragging3DPwr = false;

function updatePointerNDC(e) {
  const rect = canvas.getBoundingClientRect();
  pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

canvas.addEventListener('pointerdown', (e) => {
  if (S.pwrType === 'none' || !pwrHitMesh || !topLidGroup) return;
  updatePointerNDC(e);
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObject(pwrHitMesh, false);
  if (hits.length > 0) {
    dragging3DPwr = true;
    controls.enabled = false;
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture?.(e.pointerId);
    e.stopPropagation();
  }
}, true);

window.addEventListener('pointermove', (e) => {
  if (dragging3DPwr && topLidGroup) {
    updatePointerNDC(e);
    raycaster.setFromCamera(pointerNDC, camera);
    dragPlane.set(new THREE.Vector3(0, 0, 1), 0).applyMatrix4(topLidGroup.matrixWorld);
    if (raycaster.ray.intersectPlane(dragPlane, dragHit)) {
      topLidGroup.worldToLocal(dragHit);
      const prevX = S.pwrX, prevY = S.pwrY;
      S.pwrX = Math.round(dragHit.x + S.L / 2);
      S.pwrY = Math.round(dragHit.y - (MARGIN + T));
      clampPwr();
      if (S.pwrX !== prevX || S.pwrY !== prevY) {
        syncPwrUI();
        invalidatePwr();
      }
    }
    return;
  }
  if (S.pwrType !== 'none' && pwrHitMesh && e.target === canvas) {
    updatePointerNDC(e);
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObject(pwrHitMesh, false);
    canvas.style.cursor = hits.length > 0 ? 'grab' : '';
  }
});

const end3DPwrDrag = () => {
  if (!dragging3DPwr) return;
  dragging3DPwr = false;
  controls.enabled = true;
  canvas.style.cursor = '';
};
window.addEventListener('pointerup', end3DPwrDrag);
window.addEventListener('pointercancel', end3DPwrDrag);

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
  if (S.step === 1 || S.step === 2) { setFold(1, true); }
  if (S.step === 4 && S.engr === 'top') setFold(1, true);
}
$('#prevBtn').onclick = () => goStep(S.step - 1);
$('#nextBtn').onclick = () => S.step === STEPS - 1 ? toast('2ndHeart ist noch ein Konzept — danke ♥') : goStep(S.step + 1);

function renderSpecs() {
  if (dirty) { build(); dirty = false; pwrDirty = false; }
  else if (pwrDirty) { updatePowerButtonFast(); pwrDirty = false; }
  const { W, D, H } = dims();
  const net = computeNet();
  const metalW = W + 2 * (H - T), metalH = 2 * D + 2 * (H - T) + LIP;
  const corkW = S.L + 28, corkD = S.B + 54;
  const grams = net.area * T * 0.00268;
  const activeSides = Object.entries(S.ioSides).filter(([, v]) => v).map(([k]) => SIDE_NAMES[k]);
  const ioSummary = activeSides.length ? `${activeSides.join(', ')} (${S.tile} mm)` : 'Keine';
  const pwrSummary = S.pwrType === 'none' ? 'Keiner' : `Steck-Kork Ø ${S.pwrType} mm (X ${S.pwrX} · Y ${S.pwrY} mm)`;
  const curPreset = LAPTOP_PRESETS.find(p => p.id === S.presetId);
  const rows = [
    ['Gehäuse', `${Math.round(W)}×${Math.round(D)}×${Math.round(H)}`, true],
    ...(curPreset ? [['Board-Modell', `${curPreset.brand} · ${curPreset.model}`]] : []),
    ['Alu-Platte', `${Math.round(metalW)} × ${Math.round(metalH)} × ${T.toFixed(1)} mm`],
    ['Kork-Platte', `${Math.round(corkW)} × ${Math.round(corkD)} × ${CORK_T.toFixed(0)} mm`],
    ['Farbe', FINISH[S.finish].n],
    ['Gewicht', `≈ ${Math.round(grams)} g Alu + Kork`],
    ['Startknopf', pwrSummary],
    ['Biegekanten', 'Schlitz-Scharniere (Handbiegen)'],
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

/* ───────── PWA Service Worker & Install ───────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

let deferredInstallPrompt = null;
const installBtn = $('#installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (installBtn) {
    installBtn.hidden = false;
  }
});

if (installBtn) {
  installBtn.onclick = async () => {
    if (!deferredInstallPrompt) {
      toast('App kann über das Browser-Menü installiert werden');
      return;
    }
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      toast('2ndHeart wird installiert…');
    }
    deferredInstallPrompt = null;
    installBtn.hidden = true;
  };
}

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  if (installBtn) installBtn.hidden = true;
  toast('2ndHeart erfolgreich installiert');
});

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
  if (dirty) { build(); dirty = false; pwrDirty = false; }
  else if (pwrDirty) { updatePowerButtonFast(); pwrDirty = false; }

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
