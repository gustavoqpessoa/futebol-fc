// Stadium.js — campo, linhas, gols com rede, arquibancada, luzes e céu.
import * as THREE from 'three';
import { FIELD } from './Constants.js';

export function buildStadium(scene) {
  const { HALF_L, HALF_W, GOAL_W, GOAL_H, GOAL_DEPTH } = FIELD;

  // ----- Céu em degradê -----
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 16; skyCanvas.height = 256;
  const sg = skyCanvas.getContext('2d');
  const grad = sg.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#060b1c'); grad.addColorStop(0.55, '#0f2148'); grad.addColorStop(1, '#20407a');
  sg.fillStyle = grad; sg.fillRect(0, 0, 16, 256);
  sg.fillStyle = 'rgba(255,255,255,.6)';
  for (let i = 0; i < 40; i++) sg.fillRect(Math.random() * 16, Math.random() * 90, 1, 1);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  scene.fog = new THREE.Fog(0x123056, 60, 130);

  // ----- Luzes -----
  scene.add(new THREE.HemisphereLight(0xbfd6ff, 0x24401f, 0.5));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.15);
  sun.position.set(-18, 34, -12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 120 });
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  // Refletores nos cantos
  [[-HALF_L - 4, -HALF_W - 4], [-HALF_L - 4, HALF_W + 4], [HALF_L + 4, -HALF_W - 4], [HALF_L + 4, HALF_W + 4]].forEach((c) => {
    const sp = new THREE.SpotLight(0xfdfbf2, 0.25, 120, Math.PI / 5, 0.5, 1);
    sp.position.set(c[0], 26, c[1]); sp.target.position.set(0, 0, 0);
    scene.add(sp, sp.target);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 26, 8), new THREE.MeshStandardMaterial({ color: 0x2a3446 }));
    pole.position.set(c[0], 13, c[1]); scene.add(pole);
    const box = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.6), new THREE.MeshStandardMaterial({ color: 0xdddddd, emissive: 0xfff6da, emissiveIntensity: 0.7 }));
    box.position.set(c[0], 26, c[1]); scene.add(box);
  });

  // ----- Gramado (listras + textura fosca) -----
  const gc = document.createElement('canvas'); gc.width = 1024; gc.height = 640;
  const g = gc.getContext('2d');
  const stripes = 16, sw = gc.width / stripes;
  for (let i = 0; i < stripes; i++) { g.fillStyle = i % 2 ? '#20863a' : '#1b7532'; g.fillRect(i * sw, 0, sw, gc.height); }
  for (let n = 0; n < 3000; n++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * gc.width, Math.random() * gc.height, 2, 2); }
  const grassTex = new THREE.CanvasTexture(gc); grassTex.colorSpace = THREE.SRGBColorSpace; grassTex.anisotropy = 8;
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(HALF_L * 2 + 8, HALF_W * 2 + 6),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1, metalness: 0 }));
  grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; scene.add(grass);

  // ----- Linhas -----
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const L = (x, z, w, l) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), lineMat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); scene.add(m); };
  const T = 0.16;
  L(0, 0, T, HALF_W * 2); L(-HALF_L, 0, T, HALF_W * 2); L(HALF_L, 0, T, HALF_W * 2);
  L(0, -HALF_W, HALF_L * 2, T); L(0, HALF_W, HALF_L * 2, T);
  const ring = new THREE.Mesh(new THREE.RingGeometry(5, 5.16, 48), lineMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; scene.add(ring);
  [-1, 1].forEach((s) => { L(s * (HALF_L - 5), 0, T, 16); L(s * (HALF_L - 2.5), 8, 5, T); L(s * (HALF_L - 2.5), -8, 5, T); });

  // ----- Gols com rede (grid) -----
  [-1, 1].forEach((side) => {
    const grp = new THREE.Group();
    const pm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.15 });
    const post = new THREE.CylinderGeometry(0.08, 0.08, GOAL_H, 12);
    const p1 = new THREE.Mesh(post, pm); p1.position.set(0, GOAL_H / 2, -GOAL_W / 2);
    const p2 = new THREE.Mesh(post, pm); p2.position.set(0, GOAL_H / 2, GOAL_W / 2);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, GOAL_W, 12), pm);
    bar.rotation.x = Math.PI / 2; bar.position.set(0, GOAL_H, 0);
    [p1, p2, bar].forEach((m) => { m.castShadow = true; grp.add(m); });
    // Rede semi-transparente (grid de linhas)
    const netMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 });
    const pts = [];
    for (let i = 0; i <= GOAL_W; i += 0.7) pts.push(0, 0, -GOAL_W / 2 + i, -side * GOAL_DEPTH, 0, -GOAL_W / 2 + i, -side * GOAL_DEPTH, GOAL_H, -GOAL_W / 2 + i, 0, GOAL_H, -GOAL_W / 2 + i);
    for (let h = 0; h <= GOAL_H; h += 0.6) pts.push(-side * GOAL_DEPTH, h, -GOAL_W / 2, -side * GOAL_DEPTH, h, GOAL_W / 2);
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    grp.add(new THREE.LineSegments(ng, netMat));
    grp.position.x = side * HALF_L; scene.add(grp);
  });

  // ----- Arquibancada de concreto (degraus) -----
  const concrete = new THREE.MeshStandardMaterial({ color: 0x454d5e, roughness: 1 });
  const crowdSpots = []; // posições base dos torcedores (para o InstancedMesh)
  const mkStand = (w, d, x, z, ry, face) => {
    const s = new THREE.Group();
    for (let t = 0; t < 5; t++) {
      const y = 0.8 + t * 1.1, dz = face * (-d * 0.5 + 1 + t * (d / 5));
      const step = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d / 5 + 0.2), concrete);
      step.position.set(0, y, dz); s.add(step);
      // marca posições de torcedores (transformadas pelo group)
      const cos = Math.cos(ry), sin = Math.sin(ry);
      for (let i = 0; i < w * 0.35; i++) {
        const lx = (Math.random() - 0.5) * w, lz = dz + (Math.random() - 0.5) * (d / 5);
        crowdSpots.push({ x: x + lx * cos + lz * sin, y: y + 1.0, z: z - lx * sin + lz * cos });
      }
    }
    s.position.set(x, 0, z); s.rotation.y = ry; scene.add(s);
  };
  mkStand(HALF_L * 2 + 20, 12, 0, -HALF_W - 8, 0, -1);
  mkStand(HALF_L * 2 + 20, 12, 0, HALF_W + 8, Math.PI, -1);
  mkStand(HALF_W * 2 + 14, 12, -HALF_L - 8, 0, Math.PI / 2, -1);
  mkStand(HALF_W * 2 + 14, 12, HALF_L + 8, 0, -Math.PI / 2, -1);

  // ----- Torcida animada (InstancedMesh de bonecos) -----
  const N = crowdSpots.length;
  const crowdGeo = THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.16, 0.3, 3, 6) : new THREE.BoxGeometry(0.3, 0.6, 0.3);
  const crowd = new THREE.InstancedMesh(crowdGeo, new THREE.MeshStandardMaterial({ roughness: 0.9 }), N);
  const pal = [0xe64d4d, 0x4d80e6, 0xf2d94d, 0xe8e8f0, 0x5ccf7a, 0xe6912e];
  const dummy = new THREE.Object3D(); const color = new THREE.Color();
  const scales = new Array(N);
  for (let i = 0; i < N; i++) {
    const p = crowdSpots[i]; scales[i] = 0.9 + Math.random() * 0.4;
    dummy.position.set(p.x, p.y, p.z); dummy.scale.setScalar(scales[i]); dummy.updateMatrix();
    crowd.setMatrixAt(i, dummy.matrix); crowd.setColorAt(i, color.setHex(pal[(Math.random() * pal.length) | 0]));
  }
  crowd.instanceMatrix.needsUpdate = true; if (crowd.instanceColor) crowd.instanceColor.needsUpdate = true;
  scene.add(crowd);

  const baseY = crowdSpots.map((p) => p.y);
  function updateCrowd(time) { // animação senoidal no Y (torcida vibrando)
    for (let i = 0; i < N; i++) {
      const p = crowdSpots[i];
      dummy.position.set(p.x, baseY[i] + Math.sin(time * 3 + i) * 0.12, p.z);
      dummy.scale.setScalar(scales[i]); dummy.updateMatrix(); crowd.setMatrixAt(i, dummy.matrix);
    }
    crowd.instanceMatrix.needsUpdate = true;
  }
  return { updateCrowd };
}
