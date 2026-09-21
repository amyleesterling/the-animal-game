/**
 * Original, deterministic Cape porcupine study model. No generated meshes or
 * third-party textures are used. Repository-authored geometry and textures;
 * this script does not select a distribution license for the project.
 *
 * node scripts/build-cape-porcupine.mjs [--render]
 * --render uses the project's installed Playwright/Chrome for five review views.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { createServer } from "node:http";

const scriptPath = fileURLToPath(import.meta.url);
const rootPath = resolve(dirname(scriptPath), "..");
const outputPath = resolve(rootPath, "generated/authored-porcupine");
const groups = new Map();
let seed = 234813;
const random = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const vector = (values) => new THREE.Vector3(...values);

function add(
  geometry,
  material,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
) {
  const transform = new THREE.Object3D();
  transform.position.set(...position);
  transform.scale.set(...scale);
  transform.rotation.set(...rotation);
  transform.updateMatrix();
  geometry.applyMatrix4(transform.matrix);
  if (!groups.has(material)) groups.set(material, []);
  groups.get(material).push(geometry);
}
function ellipsoid(material, position, scale, detail = [16, 10]) {
  add(new THREE.SphereGeometry(1, ...detail), material, position, scale);
}
function tapered(from, to, radius, material, tip = 0, sides = 6) {
  const start = vector(from),
    end = vector(to);
  const geometry = new THREE.CylinderGeometry(
    tip,
    radius,
    start.distanceTo(end),
    sides,
    1,
    false,
  );
  const transform = new THREE.Matrix4().compose(
    start.clone().add(end).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      end.sub(start).normalize(),
    ),
    new THREE.Vector3(1, 1, 1),
  );
  geometry.applyMatrix4(transform);
  if (!groups.has(material)) groups.set(material, []);
  groups.get(material).push(geometry);
}

// A complete body exists beneath the quills. +Z is the animal's nose direction.
ellipsoid(0, [0, 0.43, -0.035], [0.29, 0.28, 0.49], [24, 14]);
ellipsoid(0, [0, 0.39, 0.32], [0.23, 0.235, 0.29]);
ellipsoid(0, [0, 0.365, 0.565], [0.172, 0.187, 0.238]);
ellipsoid(0, [0, 0.303, 0.723], [0.125, 0.117, 0.133]);
ellipsoid(1, [0, 0.319, 0.834], [0.052, 0.035, 0.022], [12, 8]);
// Short rounded tail, with a small fan of hollow-looking pale rattle quills.
ellipsoid(0, [0, 0.3, -0.535], [0.115, 0.095, 0.18]);

// Four separate sturdy legs and broad short feet remain below the quill skirt.
for (const side of [-1, 1]) {
  for (const rear of [false, true]) {
    const x = side * (rear ? 0.21 : 0.19);
    const z = (rear ? -0.3 : 0.33) + side * 0.022;
    ellipsoid(0, [x, 0.18, z], [0.078, 0.17, 0.087], [12, 8]);
    ellipsoid(1, [x, 0.047, z + 0.041], [0.079, 0.046, 0.119], [12, 8]);
    for (let toe = -1; toe <= 1; toe++) {
      ellipsoid(
        1,
        [x + toe * 0.035, 0.032, z + 0.127],
        [0.02, 0.025, 0.049],
        [8, 5],
      );
      tapered(
        [x + toe * 0.035, 0.036, z + 0.155],
        [x + toe * 0.035, 0.023, z + 0.19],
        0.01,
        2,
        0.002,
        5,
      );
    }
  }
  // Small rodent ears and restrained dark eyes, not cartoon eye globes.
  ellipsoid(0, [side * 0.144, 0.491, 0.49], [0.056, 0.069, 0.032], [12, 8]);
  ellipsoid(3, [side * 0.147, 0.496, 0.517], [0.034, 0.044, 0.007], [10, 7]);
  ellipsoid(1, [side * 0.141, 0.414, 0.638], [0.018, 0.019, 0.014], [12, 8]);
  ellipsoid(0, [side * 0.15, 0.438, 0.628], [0.026, 0.013, 0.024], [10, 6]);
  // A few fine whiskers leave the broad muzzle shape readable.
  for (let whisker = 0; whisker < 3; whisker++)
    tapered(
      [side * 0.09, 0.32 - whisker * 0.012, 0.754],
      [
        side * (0.21 + whisker * 0.016),
        0.32 - whisker * 0.014,
        0.805 - whisker * 0.033,
      ],
      0.0015,
      2,
      0.0002,
      3,
    );
}

// Banded quills sprout from the upper torso, never replacing the torso or legs.
// Row/angle variation fans the tips backward and upward over the rounded rump.
for (let row = 0; row < 14; row++) {
  const along = row / 13;
  const z = 0.33 - along * 0.76;
  const torsoFactor = Math.sqrt(Math.max(0.35, 1 - ((z + 0.035) / 0.57) ** 2));
  for (let column = 0; column < 19; column++) {
    const angle = ((column / 18) * 2 - 1) * 1.32 + (random() - 0.5) * 0.1;
    const from = [
      Math.sin(angle) * 0.285 * torsoFactor,
      0.43 + Math.cos(angle) * 0.255 * torsoFactor,
      z + (random() - 0.5) * 0.042,
    ];
    const length = 0.22 + along * 0.27 + random() * 0.12;
    const direction = new THREE.Vector3(
      Math.sin(angle) * (0.75 + along * 0.18),
      Math.cos(angle) * 0.75,
      -0.45 - along * 0.85,
    ).normalize();
    const to = vector(from).addScaledVector(direction, length);
    tapered(from, to.toArray(), 0.008 + random() * 0.0035, 4, 0.0003, 5);
  }
}
// Long, finer crest bristles sweep backward from the nape, with cream tips.
for (let i = 0; i < 42; i++) {
  const side = (random() - 0.5) * 0.2;
  const z = 0.32 + random() * 0.18;
  tapered(
    [side, 0.55 + random() * 0.05, z],
    [side * 2.0, 0.79 + random() * 0.17, z - 0.25 - random() * 0.16],
    0.0035,
    i % 4 === 0 ? 2 : 4,
    0.0002,
    4,
  );
}
for (let i = 0; i < 18; i++) {
  const angle = (i / 18) * Math.PI * 2;
  const from = [Math.cos(angle) * 0.068, 0.3 + Math.sin(angle) * 0.045, -0.635];
  tapered(
    from,
    [from[0] * 1.5, from[1] + 0.025, -0.8 - random() * 0.07],
    0.006,
    4,
    0.0018,
    5,
  );
}

// Tiny original PNGs; GLTFLoader requires real decoded base-color maps.
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function png(width, height, pixel) {
  const chunk = (type, bytes) => {
    const tag = Buffer.from(type),
      length = Buffer.alloc(4),
      checksum = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    checksum.writeUInt32BE(crc32(Buffer.concat([tag, bytes])));
    return Buffer.concat([length, tag, bytes, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      rows.set([...pixel(x, y), 255], offset);
    }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const bodyTexture = png(16, 16, () => {
  const grain = Math.round(random() * 12);
  return [65 + grain, 59 + grain, 49 + grain];
});
const whiteTexture = png(1, 1, () => [255, 255, 255]);
const quillTexture = png(2, 128, (_x, y) => {
  const v = 1 - y / 127;
  const pale = v > 0.89 || (v > 0.23 && v < 0.4) || (v > 0.59 && v < 0.74);
  return pale ? [233, 225, 204] : [39, 38, 33];
});

const buffers = [],
  views = [],
  accessors = [];
let byteLength = 0;
function view(bytes, target) {
  const data = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const index = views.length;
  views.push({
    buffer: 0,
    byteOffset: byteLength,
    byteLength: data.length,
    ...(target ? { target } : {}),
  });
  buffers.push(data);
  byteLength += data.length;
  const padding = Buffer.alloc(-byteLength & 3);
  buffers.push(padding);
  byteLength += padding.length;
  return index;
}
function accessor(array, type, componentType, target, min, max) {
  const index = accessors.length;
  accessors.push({
    bufferView: view(array, target),
    componentType,
    count: array.length / { SCALAR: 1, VEC2: 2, VEC3: 3 }[type],
    type,
    ...(min ? { min, max } : {}),
  });
  return index;
}
let triangles = 0,
  vertices = 0;
const bounds = new THREE.Box3();
const primitives = [];
for (const [material, geometries] of groups) {
  const geometry = mergeGeometries(geometries);
  geometries.forEach((item) => item.dispose());
  geometry.computeBoundingBox();
  bounds.union(geometry.boundingBox);
  const attributes = {};
  for (const [name, key, type] of [
    ["position", "POSITION", "VEC3"],
    ["normal", "NORMAL", "VEC3"],
    ["uv", "TEXCOORD_0", "VEC2"],
  ]) {
    const array = new Float32Array(geometry.getAttribute(name).array);
    attributes[key] = accessor(
      array,
      type,
      5126,
      34962,
      name === "position" ? geometry.boundingBox.min.toArray() : undefined,
      name === "position" ? geometry.boundingBox.max.toArray() : undefined,
    );
  }
  const indices = new Uint32Array(geometry.index.array);
  primitives.push({
    attributes,
    indices: accessor(indices, "SCALAR", 5125, 34963),
    material,
  });
  triangles += indices.length / 3;
  vertices += geometry.getAttribute("position").count;
  geometry.dispose();
}
if (triangles > 15000) throw new Error(`Too many triangles: ${triangles}`);
const images = [bodyTexture, whiteTexture, quillTexture].map((bytes) => ({
  bufferView: view(bytes),
  mimeType: "image/png",
}));
const paletteMaterial = (name, color, texture = 1) => ({
  name,
  pbrMetallicRoughness: {
    baseColorFactor: [...color, 1],
    baseColorTexture: { index: texture },
    metallicFactor: 0,
    roughnessFactor: 0.92,
  },
});
const model = {
  asset: {
    version: "2.0",
    generator: "Sophia's Wild World authored Cape porcupine builder",
    copyright:
      "Repository-authored model generated from original geometry; no third-party mesh. Source: scripts/build-cape-porcupine.mjs",
  },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ name: "Cape porcupine, +Z forward", mesh: 0 }],
  meshes: [{ name: "Complete torso, four legs and banded quills", primitives }],
  materials: [
    paletteMaterial("Dark coarse body fur", [1, 1, 1], 0),
    paletteMaterial("Nose, eyes and feet", [0.09, 0.087, 0.074]),
    paletteMaterial("Warm horn and pale bristles", [0.48, 0.43, 0.34]),
    paletteMaterial("Inner ears", [0.22, 0.17, 0.135]),
    paletteMaterial("Alternating cream and black quill bands", [1, 1, 1], 2),
  ],
  textures: images.map((_image, source) => ({ source, sampler: 0 })),
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
  images,
  accessors,
  bufferViews: views,
  buffers: [{ byteLength }],
};
const json = Buffer.from(JSON.stringify(model)),
  jsonPad = Buffer.alloc(-json.length & 3, 32);
const jsonChunk = Buffer.concat([json, jsonPad]),
  binary = Buffer.concat(buffers);
const header = Buffer.alloc(12),
  jsonHeader = Buffer.alloc(8),
  binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + jsonChunk.length + binary.length, 8);
jsonHeader.writeUInt32LE(jsonChunk.length);
jsonHeader.writeUInt32LE(0x4e4f534a, 4);
binHeader.writeUInt32LE(binary.length);
binHeader.writeUInt32LE(0x004e4942, 4);
const glb = Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binary]);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
await mkdir(outputPath, { recursive: true });
await writeFile(resolve(outputPath, "cape-porcupine.glb"), glb);
const receipt = {
  schemaVersion: 1,
  id: "cape-porcupine",
  sourceScript: "scripts/build-cape-porcupine.mjs",
  sourceScriptSha256: hash(await readFile(scriptPath)),
  file: "cape-porcupine.glb",
  bytes: glb.length,
  sha256: hash(glb),
  authored: true,
  authorship:
    "Original procedural geometry and textures authored for Sophia's Wild World using the project's Three.js geometry primitives; no Meshy geometry, photographs, or third-party texture artwork.",
  textureProvenance:
    "Original deterministic 16x16 fur-grain PNG, 1x1 white palette PNG, and 2x128 alternating black-and-cream quill-band PNG generated by the source script. No external image inputs.",
  forwardAxis: "+z",
  triangles,
  vertices,
  bounds: {
    min: bounds.min.toArray(),
    max: bounds.max.toArray(),
    size: bounds.getSize(new THREE.Vector3()).toArray(),
  },
  animationClips: 0,
  skeletal: false,
};
await writeFile(
  resolve(outputPath, "manifest.json"),
  JSON.stringify(receipt, null, 2) + "\n",
);
console.log(JSON.stringify(receipt, null, 2));

if (process.argv.includes("--render")) {
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Cape porcupine model review</title><style>html,body{margin:0;background:#e8decb;color:#263b2f;font:16px/1.4 system-ui}canvas{display:block}aside{position:absolute;top:18px;left:24px}h1{font-size:24px;margin:0 0 4px}p{margin:0}</style><aside><h1>Authored Cape porcupine</h1><p id="view">Model review</p></aside><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script><script type="module">
  import * as THREE from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xe8decb);
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.append(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xfff2d8,0x736d58,3));const sun=new THREE.DirectionalLight(0xffe6c4,3.1);sun.position.set(3,5,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:1,far:12});sun.shadow.normalBias=.008;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xcadbed,.8);fill.position.set(-3,2,-2);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xd6c9ae,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.003;floor.receiveShadow=true;scene.add(floor);
  const gltf=await new GLTFLoader().loadAsync('/cape-porcupine.glb');gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(gltf.scene);
  const box=new THREE.Box3().setFromObject(gltf.scene);const target=box.getCenter(new THREE.Vector3());const camera=new THREE.PerspectiveCamera(37,innerWidth/innerHeight,.01,50);
  window.setReviewView=(name)=>{const v={front:[0,.55,3.6],back:[0,.55,-3.6],left:[-3.6,.55,0],right:[3.6,.55,0],hero:[2.7,1.3,3]}[name];camera.position.copy(target).add(new THREE.Vector3(...v));camera.lookAt(target);camera.updateMatrixWorld(true);document.querySelector('#view').textContent=name+' view · original geometry and textures';renderer.render(scene,camera);};window.setReviewView('hero');document.body.dataset.ready='true';
  </script></html>`;
  await writeFile(resolve(outputPath, "review.html"), html);
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, "http://localhost").pathname;
      let path;
      if (pathname === "/") path = resolve(outputPath, "review.html");
      else if (pathname === "/cape-porcupine.glb")
        path = resolve(outputPath, "cape-porcupine.glb");
      else if (pathname.startsWith("/node_modules/three/"))
        path = resolve(rootPath, `.${pathname}`);
      else {
        response.writeHead(404).end();
        return;
      }
      if (!path.startsWith(rootPath + sep))
        throw new Error("Invalid review path");
      response.setHeader(
        "Content-Type",
        path.endsWith(".html")
          ? "text/html"
          : path.endsWith(".js")
            ? "text/javascript"
            : "model/gltf-binary",
      );
      response.end(await readFile(path));
    } catch {
      response.writeHead(500).end();
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const { chromium } = await import("@playwright/test");
  let browser;
  try {
    browser = await chromium.launch({
      channel: "chrome",
      headless: true,
      args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader"],
    });
    const page = await browser.newPage({
      viewport: { width: 900, height: 780 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForSelector('body[data-ready="true"]');
    for (const name of ["front", "back", "left", "right", "hero"]) {
      await page.evaluate((view) => window.setReviewView(view), name);
      await page.screenshot({ path: resolve(outputPath, `${name}.png`) });
    }
    if (errors.length) throw new Error(errors.join("\n"));
    console.log(
      "PASS: actual GLB rendered in Chrome from all four cardinal angles and a three-quarter view; no page errors.",
    );
  } finally {
    await browser?.close();
    await new Promise((done) => server.close(done));
  }
}
