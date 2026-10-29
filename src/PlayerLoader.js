// PlayerLoader.js — cria os jogadores.
// Padrão: modelo procedural articulado (cabeça, tronco, braços c/ cotovelo, pernas c/ joelho, chuteira).
// Opcional: se existir /models/player.glb (ex.: export do Mixamo), carrega com GLTFLoader + AnimationMixer.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PLAYER } from './Constants.js';

function shade(hex, amt) {
  let r = (hex >> 16) & 255, gg = (hex >> 8) & 255, bl = hex & 255;
  const f = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((f - r) * p) + r; gg = Math.round((f - gg) * p) + gg; bl = Math.round((f - bl) * p) + bl;
  return (r << 16) | (gg << 8) | bl;
}

// ---------- Modelo procedural ----------
function buildProcedural(shirtCol, shortCol, isGK) {
  const g = new THREE.Group();
  const S = 0.5; // escala global (modelo ~1.8m)
  const shirt = new THREE.MeshStandardMaterial({ color: isGK ? 0x1fd0a0 : shirtCol, roughness: 0.7 });
  const arm = new THREE.MeshStandardMaterial({ color: shade(isGK ? 0x1fd0a0 : shirtCol, -0.05), roughness: 0.7 });
  const shortM = new THREE.MeshStandardMaterial({ color: shortCol, roughness: 0.85 });
  const sockM = new THREE.MeshStandardMaterial({ color: isGK ? 0x1fd0a0 : shirtCol, roughness: 0.9 });
  const skinM = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.6 });
  const bootM = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.4 });

  const leg = (z) => {
    const hip = new THREE.Group(); hip.position.set(0, 0.9 * S, z);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * S, 0.11 * S, 0.45 * S, 8), shortM); thigh.position.y = -0.22 * S; thigh.castShadow = true; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.45 * S; hip.add(knee);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * S, 0.08 * S, 0.45 * S, 8), sockM); shin.position.y = -0.22 * S; shin.castShadow = true; knee.add(shin);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.3 * S, 0.11 * S, 0.22 * S), bootM); boot.position.set(0.07 * S, -0.46 * S, 0); boot.castShadow = true; knee.add(boot);
    return { hip, knee };
  };
  const legL = leg(-0.14 * S), legR = leg(0.14 * S); g.add(legL.hip, legR.hip);

  const armF = (z) => {
    const sh = new THREE.Group(); sh.position.set(0, 1.7 * S, z);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * S, 0.07 * S, 0.4 * S, 7), arm); up.position.y = -0.2 * S; up.castShadow = true; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.4 * S; sh.add(el);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * S, 0.05 * S, 0.34 * S, 7), skinM); fore.position.y = -0.17 * S; fore.castShadow = true; el.add(fore);
    return { sh, el };
  };
  const armL = armF(-0.36 * S), armR = armF(0.36 * S); g.add(armL.sh, armR.sh);

  const torsoG = new THREE.Group(); torsoG.position.y = 1.35 * S; g.add(torsoG);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * S, 0.32 * S, 0.8 * S, 12), shirt); torso.castShadow = true; torsoG.add(torso);
  const headG = new THREE.Group(); headG.position.y = 1.9 * S; g.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22 * S, 14, 10), skinM); head.castShadow = true; headG.add(head);

  g.userData = { legL, legR, armL, armR, torsoG, headG, phase: Math.random() * 6, kick: 0, proc: true };
  return g;
}

function animateProcedural(g, dt, speed, kickTrigger) {
  const u = g.userData;
  if (kickTrigger) u.kick = 1;
  u.phase += (0.5 + speed * 1.1) * dt * 7;
  const amp = Math.min(1, speed / 5), sw = Math.sin(u.phase) * amp;
  u.legL.hip.rotation.z = sw; u.legR.hip.rotation.z = -sw;
  u.legL.knee.rotation.z = -Math.max(0, -Math.sin(u.phase)) * 1.2 * amp;
  u.legR.knee.rotation.z = -Math.max(0, Math.sin(u.phase)) * 1.2 * amp;
  u.armL.sh.rotation.z = -sw * 0.7; u.armR.sh.rotation.z = sw * 0.7;
  u.armL.el.rotation.z = -0.35; u.armR.el.rotation.z = -0.35;
  const lean = 0.1 + Math.min(0.25, speed * 0.04);
  u.torsoG.rotation.z = -lean + Math.sin(u.phase * 2) * 0.02 * amp;
  u.headG.rotation.z = -lean * 0.4;
  if (u.kick > 0) { u.kick = Math.max(0, u.kick - dt * 4.5); const k = u.kick; u.legR.hip.rotation.z = -1.5 * k; u.legR.knee.rotation.z = -0.3 * k; }
}

// Etiqueta de nome (sprite que sempre encara a câmera)
function makeLabel(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d'); x.font = 'bold 30px Segoe UI, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.85)'; x.strokeText(text, 128, 32); x.fillStyle = '#fff'; x.fillText(text, 128, 32);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  s.scale.set(2.4, 0.6, 1); s.position.y = 2.35; return s;
}

// ---------- Fábrica ----------
export class PlayerFactory {
  constructor() { this.gltf = null; this.clips = null; }

  // Tenta carregar um GLB opcional. Retorna true se conseguiu.
  async tryLoad(url = 'models/player.glb') {
    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url);
      this.gltf = gltf; this.clips = gltf.animations || [];
      console.log('[PlayerFactory] GLB carregado com', this.clips.length, 'animações');
      return true;
    } catch (e) {
      console.log('[PlayerFactory] Sem GLB (usando modelo procedural). Coloque um .glb do Mixamo em public/models/player.glb para ativar.');
      return false;
    }
  }

  create(shirtCol, shortCol, isGK, name) {
    if (this.gltf) {
      // Clona o modelo GLB e prepara o AnimationMixer.
      const src = this.gltf.scene;
      const group = src.clone(true);
      group.traverse((o) => {
        if (o.isMesh) { o.castShadow = true; o.material = o.material.clone(); if (!isGK) o.material.color = new THREE.Color(shirtCol).lerp(o.material.color, 0.35); }
      });
      // Ajusta altura ~1.8m
      const box = new THREE.Box3().setFromObject(group); const h = box.max.y - box.min.y || 1;
      const s = 1.8 / h; group.scale.setScalar(s);
      if (name) group.add(makeLabel(name));
      const mixer = new THREE.AnimationMixer(group);
      const byName = {};
      for (const c of this.clips) byName[c.name.toLowerCase()] = c;
      const pick = (...names) => { for (const n of names) if (byName[n]) return byName[n]; return this.clips[0]; };
      const actions = {
        idle: mixer.clipAction(pick('idle', 'survey')),
        run: mixer.clipAction(pick('run', 'running', 'walk', 'walking')),
      };
      Object.values(actions).forEach((a) => a && a.play());
      if (actions.run) actions.run.weight = 0;
      if (actions.idle) actions.idle.weight = 1;
      return {
        group, mixer, actions, _state: 'idle',
        update(dt, speed) {
          mixer.update(dt);
          const running = speed > 1.5;
          if (actions.run && actions.idle) {
            const tr = running ? 1 : 0;
            actions.run.weight += (tr - actions.run.weight) * Math.min(1, dt * 8);
            actions.idle.weight = 1 - actions.run.weight;
            actions.run.timeScale = Math.max(0.6, speed / 5);
          }
        },
      };
    }
    // Procedural
    const group = buildProcedural(shirtCol, shortCol, isGK);
    if (name) group.add(makeLabel(name));
    return { group, mixer: null, update(dt, speed, kick) { animateProcedural(group, dt, speed, kick); } };
  }
}
