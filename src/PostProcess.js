// PostProcess.js — pipeline de imagem estilo EA FC: Bloom + SSAO + DoF (Bokeh).
// Tudo com fallback: se algo falhar, cai no render normal para não quebrar o jogo.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export class PostProcess {
  constructor(renderer, scene, camera, opts = {}) {
    this.enabled = false;
    this.renderer = renderer; this.scene = scene; this.camera = camera;
    try {
      const size = new THREE.Vector2(); renderer.getSize(size);
      this.composer = new EffectComposer(renderer);
      this.composer.addPass(new RenderPass(scene, camera));

      if (opts.ssao !== false) {
        this.ssao = new SSAOPass(scene, camera, size.x, size.y); // sombras de contato (pés no chão)
        this.ssao.kernelRadius = 0.6; this.ssao.minDistance = 0.002; this.ssao.maxDistance = 0.08;
        this.composer.addPass(this.ssao);
      }
      this.bloom = new UnrealBloomPass(size, 0.35, 0.6, 0.9); // brilho dos refletores/linhas
      this.composer.addPass(this.bloom);

      if (opts.dof !== false) {
        this.bokeh = new BokehPass(scene, camera, { focus: 22, aperture: 0.00018, maxblur: 0.006 }); // desfoque de fundo
        this.composer.addPass(this.bokeh);
      }
      this.composer.addPass(new OutputPass());
      this.enabled = true;
    } catch (e) {
      console.warn('[PostProcess] desativado (fallback render normal):', e.message);
      this.enabled = false;
    }
  }

  setSize(w, h) { if (this.composer) this.composer.setSize(w, h); if (this.ssao) this.ssao.setSize(w, h); }

  render() {
    if (this.enabled && this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
