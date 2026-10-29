// Camera.js — câmera de transmissão ESTÁVEL: segue o ponto médio (jogador + bola)
// com um offset fixo (atrás e acima), sempre enquadrando o campo. À prova de "voo".
import * as THREE from 'three';
import { FIELD } from './Constants.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class TVCamera {
  constructor(aspect) {
    this.cam = new THREE.PerspectiveCamera(52, aspect, 0.1, 300);
    this.cam.position.set(0, 15, -18);
    this._look = new THREE.Vector3(0, 0.5, 2);
    this.cam.lookAt(this._look);
  }

  resize(aspect) { this.cam.aspect = aspect; this.cam.updateProjectionMatrix(); }

  update(playerPos, ballPos, dt) {
    // alvo = média jogador + bola, protegido contra NaN e limitado ao campo
    let tx = (playerPos.x + ballPos.x) / 2;
    let tz = (playerPos.z + ballPos.z) / 2;
    if (!isFinite(tx)) tx = 0;
    if (!isFinite(tz)) tz = 0;
    tx = clamp(tx, -FIELD.HALF_L + 4, FIELD.HALF_L - 4);
    tz = clamp(tz, -FIELD.HALF_W + 2, FIELD.HALF_W - 2);

    // FOV suave conforme a distância entre jogador e bola
    let dist = Math.hypot(playerPos.x - ballPos.x, playerPos.z - ballPos.z);
    if (!isFinite(dist)) dist = 0;
    const targetFov = clamp(50 + dist * 0.7, 50, 58);
    this.cam.fov += (targetFov - this.cam.fov) * Math.min(1, dt * 3);
    this.cam.updateProjectionMatrix();

    // posição desejada: offset FIXO atrás e acima do alvo (enquadra o campo de lado)
    const desired = new THREE.Vector3(tx, 15, tz - 17);
    const k = 1 - Math.pow(0.015, dt); // lerp suave (~0.06/frame a 60fps)
    this.cam.position.lerp(desired, k);

    // olha para um pouco à frente do alvo, quase no chão
    this._look.x += (tx - this._look.x) * k;
    this._look.z += ((tz + 2) - this._look.z) * k;
    this._look.y = 0.6;
    this.cam.lookAt(this._look);
  }
}
