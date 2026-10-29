// Game.js — CORE de jogabilidade: ímã de posse (dribble lock), saída de bola
// (lateral/tiro de meta/escanteio), gol com reset, IA por zona + anti-empilhamento,
// goleiro que agarra, passe rápido rasteiro. Times vêm do menu (config).
import * as THREE from 'three';
import { FIELD, PLAYER, BALL } from './Constants.js';
import { tacticByKey, gameModifiers } from './Tactics.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clash = (a, b) => { const dr = ((a >> 16) & 255) - ((b >> 16) & 255), dg = ((a >> 8) & 255) - ((b >> 8) & 255), db = (a & 255) - (b & 255); return Math.sqrt(dr * dr + dg * dg + db * db) < 130; };

const POSSESS_R = 2.4;   // raio para pegar/manter a posse (mais fácil de dominar a bola)
const STEAL_R = 1.15;    // adversário mais perto que isso rouba (desarme)
const ANCHOR = 0.7;      // bola fica à frente do pé

export class Game {
  constructor(physics, scene, factory, homeCfg, awayCfg) {
    this.physics = physics; this.scene = scene; this.factory = factory;
    this.ball = physics.ball;
    this.homeCfg = homeCfg; this.awayCfg = awayCfg;
    this.players = [];
    this.controlled = null; this.owner = null;
    this.scoreHome = 0; this.scoreAway = 0;
    this.time = 240;
    this.charge = 0; this.charging = false;
    this.ballFree = 0; this.freeze = 0; this.deadballProtect = 0; this.setTeam = null;
    this.lastTouch = 'home';
    this.homeSpeedMul = homeCfg.speedMul || 1; this.awaySpeedMul = awayCfg.speedMul || 1; // força -> velocidade
    // ---- TÁTICAS: cada time adota um modelo de jogo que muda linha, ritmo, pressão e subida ----
    this.homeTac = tacticByKey(homeCfg.tactic); this.awayTac = tacticByKey(awayCfg.tactic);
    this.homeMod = gameModifiers(this.homeTac); this.awayMod = gameModifiers(this.awayTac);
    this.onScore = () => {}; this.onMessage = () => {}; this.onEnd = () => {}; this._ended = false;
    this._buildTeams();
    this._buildMarkers();
    this._kickoff('home');
  }

  _buildMarkers() {
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.66, 28), new THREE.MeshBasicMaterial({ color: 0x5effa0, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.03; this.scene.add(this.ring);
    const shape = new THREE.Shape(); shape.moveTo(0, -0.35); shape.lineTo(0.9, 0); shape.lineTo(0, 0.35); shape.closePath();
    this.aim = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0x5effa0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    this.aim.rotation.x = -Math.PI / 2; this.aimG = new THREE.Group(); this.aimG.add(this.aim); this.scene.add(this.aimG);
  }

  _formation(team) {
    const s = team === 'home' ? -1 : 1; // 4-4-2, 11 jogadores
    return [
      { x: s * 42, z: 0, role: 'gk' },
      { x: s * 30, z: -20, role: 'df' }, { x: s * 30, z: -7, role: 'df' }, { x: s * 30, z: 7, role: 'df' }, { x: s * 30, z: 20, role: 'df' },
      { x: s * 16, z: -18, role: 'mf' }, { x: s * 16, z: -6, role: 'mf' }, { x: s * 16, z: 6, role: 'mf' }, { x: s * 16, z: 18, role: 'mf' },
      { x: s * 5, z: -8, role: 'fw' }, { x: s * 5, z: 8, role: 'fw' },
    ];
  }

  _buildTeams() {
    // uniforme reserva se as cores baterem
    let homeShirt = this.homeCfg.primary, homeShort = this.homeCfg.secondary;
    let awayShirt = this.awayCfg.primary, awayShort = this.awayCfg.secondary;
    if (clash(homeShirt, awayShirt)) { awayShirt = 0xf2f2f2; awayShort = 0x1a2740; }
    const build = (team, cfg, shirt, short) => {
      this._formation(team).forEach((f, i) => {
        const body = this.physics.createPlayerBody(f.x, f.z);
        const name = cfg.roster[i] || ('Jog ' + (i + 1));
        const vis = this.factory.create(shirt, short, f.role === 'gk', name);
        this.scene.add(vis.group);
        this.players.push({ body, vis, team, role: f.role, name, base: { x: f.x, z: f.z }, face: { x: team === 'home' ? 1 : -1, z: 0 }, cool: 0 });
      });
    };
    build('home', this.homeCfg, homeShirt, homeShort);
    build('away', this.awayCfg, awayShirt, awayShort);
    this.controlled = this.players.find((p) => p.team === 'home' && p.role === 'mf');
  }

  home() { return this.players.filter((p) => p.team === 'home'); }
  away() { return this.players.filter((p) => p.team === 'away'); }
  outfield(list) { return list.filter((p) => p.role !== 'gk'); }
  nearest(list, x, z) { let b = null, bd = 1e9; for (const p of list) { const d = (p.body.position.x - x) ** 2 + (p.body.position.z - z) ** 2; if (d < bd) { bd = d; b = p; } } return b; }
  distBall(p) { return Math.hypot(p.body.position.x - this.ball.position.x, p.body.position.z - this.ball.position.z); }

  // Troca para o jogador de linha MAIS PRÓXIMO da bola (excluindo o atual)
  switchPlayer() {
    const outs = this.outfield(this.home()).filter((p) => p !== this.controlled);
    let best = null, bd = 1e9;
    for (const p of outs) { const d = this.distBall(p); if (d < bd) { bd = d; best = p; } }
    if (best) { this.controlled = best; this._manual = 80; }
  }

  shootDown() { this.charging = true; }
  // CHUTE: funciona em movimento; soma a velocidade da corrida; força/elevação pela barra
  shootUp() {
    if (this.controlled && (this.owner === this.controlled || this.distBall(this.controlled) < 2.6)) {
      const c = this.controlled, sp = this.charge * 100, dir = c.face, m = Math.hypot(dir.x, dir.z) || 1;
      const speed = 8 + sp * 0.32;      // base + (shotPower)
      const vy = 2 + sp * 0.09;         // elevação proporcional
      this._lastShotPower = sp;
      // velocidade final = impulso do chute + velocidade do jogador (chute em corrida)
      this.ball.velocity.set(dir.x / m * speed + c.body.velocity.x * 0.5, vy, dir.z / m * speed + c.body.velocity.z * 0.5);
      this._releaseFrom(c, 14, 'home'); c.vis.update(0.001, 8, true);
    }
    this.charging = false; this.charge = 0;
  }

  // PASSE ASSISTIDO: trava no companheiro mais alinhado dentro de um cone de 60°
  pass() {
    if (!this.controlled) return;
    if (this.owner !== this.controlled && this.distBall(this.controlled) > 2.6) return;
    const c = this.controlled, fm = Math.hypot(c.face.x, c.face.z) || 1, fx = c.face.x / fm, fz = c.face.z / fm;
    const mates = this.outfield(this.home()).filter((p) => p !== c);
    const COS60 = Math.cos(Math.PI / 3); // metade do cone de 60°
    let best = null, bs = -1e9;
    for (const mt of mates) {
      const dx = mt.body.position.x - c.body.position.x, dz = mt.body.position.z - c.body.position.z, d = Math.hypot(dx, dz) || 1;
      if (d > 40) continue;
      const align = (fx * dx + fz * dz) / d;   // 1 = perfeitamente na direção do olhar
      if (align < COS60) continue;             // fora do cone -> ignora
      const sc = align * 2 - d * 0.02;
      if (sc > bs) { bs = sc; best = mt; }
    }
    if (!best) { best = mates.map((m) => [m, this.distBall(m)]).sort((a, b) => a[1] - b[1])[0][0]; } // ninguém no cone -> mais próximo
    const dx = best.body.position.x - this.ball.position.x, dz = best.body.position.z - this.ball.position.z, d = Math.hypot(dx, dz) || 1;
    const speed = clamp(12 + d * 0.55, 12, 26);  // forte o suficiente p/ chegar aos pés
    this.ball.velocity.set(dx / d * speed, 0.25, dz / d * speed);
    this._releaseFrom(c, 10, 'home'); c.vis.update(0.001, 8, true);
    this._manual = 40; this.controlled = best; // já assume o recebedor
  }

  // DESARME/BOTE (B): rouba se pegar a bola; falta/pênalti se acertar o adversário antes
  tackle() {
    if (!this.controlled || this.owner === this.controlled) return;
    const db = this.distBall(this.controlled);
    if (db < 1.5) { this.owner = this.controlled; this.lastTouch = 'home'; this._manual = 30; return; } // bote limpo
    if (this.owner && this.owner.team === 'away') {
      const opp = this.owner, dopp = Math.hypot(opp.body.position.x - this.controlled.body.position.x, opp.body.position.z - this.controlled.body.position.z);
      if (dopp < 1.7) this._awardFoul('home', opp.body.position.x, opp.body.position.z); // acertou as pernas -> falta
    }
  }

  _awardFoul(byTeam, x, z) {
    const fouled = byTeam === 'home' ? 'away' : 'home';
    const ownGoalX = byTeam === 'home' ? -FIELD.HALF_L : FIELD.HALF_L;
    const inBox = Math.abs(x - ownGoalX) < 10 && Math.abs(z) < 18;
    if (inBox) this._setPiece('PÊNALTI!', fouled, byTeam === 'home' ? -FIELD.HALF_L + 8 : FIELD.HALF_L - 8, 0);
    else this._setPiece('FALTA', fouled, clamp(x, -FIELD.HALF_L + 4, FIELD.HALF_L - 4), clamp(z, -FIELD.HALF_W + 3, FIELD.HALF_W - 3));
  }

  _releaseFrom(player, freeFrames, team) { this.ballFree = freeFrames; this.owner = null; player.cool = 10; this.lastTouch = team; if (this.deadballProtect > 0) this.deadballProtect = Math.min(this.deadballProtect, 6); }

  _camAxes(camera) {
    const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, 1); f.normalize();
    return { fx: f.x, fz: f.z, rx: -f.z, rz: f.x };
  }

  update(dt, controls, camera) {
    this._dt = dt;
    if (this.ballFree > 0) this.ballFree--;
    if (this._manual > 0) this._manual--;
    for (const p of this.players) if (p.cool > 0) p.cool--;

    // ---- Congelamento (gol / cobrança): mantém tudo parado por ~1s ----
    if (this.freeze > 0) {
      this.freeze -= dt;
      if (this.owner) { const a = this.owner; this.ball.position.set(a.body.position.x + a.face.x * ANCHOR, BALL.R, a.body.position.z + a.face.z * ANCHOR); this.ball.velocity.set(0, 0, 0); }
      this._sync(dt); return;
    }
    if (this.deadballProtect > 0) this.deadballProtect--;

    // charge da força
    if (this.charging && this.controlled && this.distBall(this.controlled) < 1.6) this.charge = Math.min(1, this.charge + dt * 1.6);

    // Controlado = dono da bola (se for do nosso time) OU o mais próximo da jogada
    if (this._manual <= 0) {
      const homeOwner = (this.owner && this.owner.team === 'home' && this.owner.role !== 'gk') ? this.owner : null;
      if (homeOwner) this.controlled = homeOwner;
      else this.controlled = this.nearest(this.outfield(this.home()), this.ball.position.x, this.ball.position.z) || this.controlled;
    }

    // ---- Movimento (controlado + IA por zona + anti-empilhamento) ----
    const mv = controls.moveVector(); const ax = this._camAxes(camera);
    const wx = ax.rx * mv.x + ax.fx * mv.y, wz = ax.rz * mv.x + ax.fz * mv.y, wmag = Math.hypot(wx, wz);
    const maxSp = (controls.sprinting() ? PLAYER.SPRINT : PLAYER.SPEED) * this.homeSpeedMul * this.homeMod.tempoMul;
    for (const p of this.players) {
      let tx = 0, tz = 0;
      const mul = (p.team === 'home' ? this.homeSpeedMul * this.homeMod.tempoMul : this.awaySpeedMul * this.awayMod.tempoMul);
      if (p === this.controlled) {
        if (wmag > 0.15) { tx = wx / wmag * maxSp; tz = wz / wmag * maxSp; p.face = { x: wx / wmag, z: wz / wmag }; }
      } else {
        const t = this._aiTarget(p);
        const dx = t.x - p.body.position.x, dz = t.z - p.body.position.z, d = Math.hypot(dx, dz) || 1;
        const maxAi = (p.role === 'gk' ? (p._gkFast ? PLAYER.SPEED * 1.15 : PLAYER.SPEED * 0.9) : PLAYER.SPEED * 0.95) * mul;
        const sp = Math.min(maxAi, d * 3); tx = dx / d * sp; tz = dz / d * sp;
        if (d > 0.4) p.face = { x: dx / d, z: dz / d };
        const team = p.team === 'home' ? this.home() : this.away();
        for (const o of team) { if (o === p) continue; const rx = p.body.position.x - o.body.position.x, rz = p.body.position.z - o.body.position.z, rd = Math.hypot(rx, rz); if (rd > 0.01 && rd < 3.2) { const f = (3.2 - rd) / 3.2 * 4; tx += rx / rd * f; tz += rz / rd * f; } }
      }
      const v = p.body.velocity, k = Math.min(1, PLAYER.ACCEL * dt); v.x += (tx - v.x) * k; v.z += (tz - v.z) * k;
      const pos = p.body.position; pos.x = clamp(pos.x, -FIELD.HALF_L + 0.4, FIELD.HALF_L - 0.4); pos.z = clamp(pos.z, -FIELD.HALF_W + 0.4, FIELD.HALF_W - 0.4);
      if (!isFinite(pos.x) || !isFinite(pos.z)) { pos.set(p.base.x, PLAYER.R, p.base.z); v.set(0, 0, 0); }
    }

    // ---- ÍMÃ DE POSSE ----
    this._possession(dt);
    // IA pode cometer falta sobre você (te dá tiro livre / pênalti)
    if (this.owner && this.owner.team === 'home' && this.owner.role !== 'gk' && this.deadballProtect <= 0) {
      const opp = this.nearest(this.outfield(this.away()), this.ball.position.x, this.ball.position.z);
      if (opp && Math.hypot(opp.body.position.x - this.owner.body.position.x, opp.body.position.z - this.owner.body.position.z) < 1.3 && Math.random() < 0.004)
        this._awardFoul('away', this.owner.body.position.x, this.owner.body.position.z);
    }

    // ---- Saída de bola / gol (só quando a bola está livre) ----
    if (!this.owner) { if (this._checkBounds()) { this._sync(dt); return; } }

    // limita velocidade/altura da bola
    const bv = this.ball.velocity, vs = Math.hypot(bv.x, bv.y, bv.z); if (vs > 45) { bv.x *= 45 / vs; bv.y *= 45 / vs; bv.z *= 45 / vs; }
    if (this.ball.position.y > 6) { this.ball.position.y = 6; if (bv.y > 0) bv.y = 0; }

    this.time = Math.max(0, this.time - dt);
    if (this.time <= 0 && !this._ended) { this._ended = true; this.onEnd(this.scoreHome, this.scoreAway); } // apito final
    this._sync(dt);
  }

  dispose() { // remove os meshes desta partida da cena (para começar outra)
    for (const p of this.players) this.scene.remove(p.vis.group);
    this.scene.remove(this.ring); this.scene.remove(this.aimG);
  }

  _possession(dt) {
    if (this.ballFree > 0) { this.owner = null; return; }
    // GOLEIRO: encaixe (raio pequeno). Chute forte -> ESPALMA (não gruda). Canto extremo escapa.
    for (const gk of this.players) {
      if (gk.role !== 'gk') continue;
      const bspeed = Math.hypot(this.ball.velocity.x, this.ball.velocity.z);
      if (this.distBall(gk) < 0.92 && this.ball.position.y < 2.4) {
        if (bspeed > 18) { // ESPALMADA para o lado/escanteio
          const dir = gk.team === 'home' ? 1 : -1;
          this.ball.velocity.set(dir * 7, 3.5, (Math.random() < 0.5 ? -1 : 1) * 13);
          this.owner = null; this.ballFree = 12; this.lastTouch = gk.team; gk.vis.update(0.001, 8, true);
          this.onMessage('Espalmou!', '#cfe8ff'); return;
        }
        this.owner = gk; this.lastTouch = gk.team;
        this.ball.position.set(gk.body.position.x + gk.face.x * 0.5, 0.4, gk.body.position.z + gk.face.z * 0.5);
        this.ball.velocity.set(0, 0, 0);
        gk._hold = (gk._hold || 0) + 1;
        if (gk._hold > 55) { const d = gk.team === 'home' ? 1 : -1; this.ball.velocity.set(d * 16, 3, (Math.random() - 0.5) * 8); this._releaseFrom(gk, 14, gk.team); gk._hold = 0; }
        return;
      } else if (this.distBall(gk) > 1.6) gk._hold = 0;
    }
    // manter/definir dono
    let cand = null, bd = POSSESS_R;
    for (const p of this.players) { if (p.role === 'gk' || p.cool > 0) continue; if (this.deadballProtect > 0 && p.team !== this.setTeam) continue; const d = this.distBall(p); if (d < bd) { bd = d; cand = p; } }
    if (this.owner && this.owner.role !== 'gk' && this.distBall(this.owner) < POSSESS_R && this.owner.cool <= 0) {
      // mantém a posse, a não ser que um ADVERSÁRIO chegue muito perto (desarme)
      const opp = this.nearest(this.owner.team === 'home' ? this.outfield(this.away()) : this.outfield(this.home()), this.ball.position.x, this.ball.position.z);
      if (opp && this.distBall(opp) < STEAL_R && !(this.deadballProtect > 0 && opp.team !== this.setTeam)) cand = opp; else cand = this.owner;
    }
    this.owner = cand;
    if (!cand) return;
    this.lastTouch = cand.team;
    // ÍMÃ: trava a bola 0.6 à frente do pé, com lerp suave; anula forças externas
    const axp = cand.body.position.x + cand.face.x * ANCHOR, azp = cand.body.position.z + cand.face.z * ANCHOR;
    const bp = this.ball.position, bv = this.ball.velocity, kk = Math.min(1, dt * 16);
    bp.x += (axp - bp.x) * kk; bp.z += (azp - bp.z) * kk; bp.y = BALL.R + 0.02;
    bv.set(0, 0, 0); this.ball.angularVelocity.set(0, 0, 0);
    // IA visitante decide
    if (cand.team === 'away') this._awayDecision(cand);
  }

  _awayDecision(carrier) {
    const gx = -FIELD.HALF_L, dGoal = Math.hypot(carrier.body.position.x - gx, carrier.body.position.z);
    const t = this.awayTac;
    const shootP = 0.018 + t.off * 0.03 + t.tempo * 0.012; // vertical/ofensivo chuta mais
    const passP = 0.006 + t.poss * 0.02;                   // posse/tiki-taka troca mais passes
    if (dGoal < 13 && Math.random() < shootP) {
      const aimZ = (Math.random() - 0.5) * FIELD.GOAL_W * 0.7, dx = gx - carrier.body.position.x, dz = aimZ - carrier.body.position.z, m = Math.hypot(dx, dz) || 1;
      this.ball.velocity.set(dx / m * 13, 3, dz / m * 13); this._releaseFrom(carrier, 12, 'away'); carrier.vis.update(0.001, 8, true);
    } else if (Math.random() < passP) {
      const mm = this.outfield(this.away()).filter((x) => x !== carrier), t = mm[(Math.random() * mm.length) | 0];
      const dx = t.body.position.x - carrier.body.position.x, dz = t.body.position.z - carrier.body.position.z, m = Math.hypot(dx, dz) || 1;
      this.ball.velocity.set(dx / m * 11, 0.25, dz / m * 11); this._releaseFrom(carrier, 8, 'away');
    }
  }

  _aiTarget(p) {
    const dir = p.team === 'home' ? 1 : -1, ownGoalX = -dir * FIELD.HALF_L, oppGoalX = dir * FIELD.HALF_L;
    const bx = this.ball.position.x, bz = this.ball.position.z;
    if (p.role === 'gk') {
      const bv = this.ball.velocity, toward = p.team === 'home' ? (bx < -FIELD.HALF_L + 16 && bv.x < -1) : (bx > FIELD.HALF_L - 16 && bv.x > 1);
      if (toward) p._reactT = (p._reactT || 0) + (this._dt || 0.016); else p._reactT = 0;
      p._gkFast = toward && p._reactT > 0.2;  // TEMPO DE REAÇÃO 200ms (chute a queima-roupa faz gol)
      if (!p._gkErrT || p._gkErrT <= 0) { p._gkErr = (Math.random() - 0.5) * 2.2; p._gkErrT = 22; } p._gkErrT--;
      let pz = bz;
      if (p._gkFast) { pz = bz + bv.z * 0.28 + p._gkErr; } // antecipação CURTA + erro -> canto batível
      return { x: ownGoalX + dir * 1.4, z: clamp(pz, -FIELD.GOAL_W / 2 - 0.3, FIELD.GOAL_W / 2 + 0.3) };
    }
    // durante bola parada, o time que não cobra recua
    if (this.deadballProtect > 0 && p.team !== this.setTeam) return { x: (bx + ownGoalX) / 2, z: clamp(p.base.z, -FIELD.HALF_W + 2, FIELD.HALF_W - 2) };
    const owned = this.owner && this.owner.team === p.team;
    if (this.owner === p) return { x: oppGoalX, z: bz * 0.4 };
    const mates = this.outfield(p.team === 'home' ? this.home() : this.away());
    // TÁTICA do time: linha (altura), pressão, subida e largura
    const mod = p.team === 'home' ? this.homeMod : this.awayMod;
    const baseX = clamp(p.base.x + dir * mod.lineShift, -FIELD.HALF_L + 3, FIELD.HALF_L - 3);
    const baseZ = clamp(p.base.z * mod.widthMul, -FIELD.HALF_W + 2, FIELD.HALF_W - 2);
    if (owned) { // sem a bola mas time com posse: sobe conforme a intenção ofensiva do modelo
      return { x: clamp(baseX + dir * (6 + mod.attackPush), -FIELD.HALF_L + 4, FIELD.HALF_L - 4), z: baseZ };
    }
    // defendendo: nº de marcadores que vão à bola depende da pressão (gegen/sacchi pressionam com mais gente)
    const ranked = mates.slice().sort((a, b) => (Math.hypot(a.body.position.x - bx, a.body.position.z - bz)) - (Math.hypot(b.body.position.x - bx, b.body.position.z - bz)));
    const pressers = 1 + (mod.pressExtra > 0.62 ? 1 : 0) + (mod.pressExtra > 0.86 ? 1 : 0);
    if (ranked.indexOf(p) < pressers) return { x: bx, z: bz };
    // demais mantêm a linha/bloco, deslizando um pouco em direção à bola
    return { x: clamp(baseX + (bx - baseX) * 0.28, -FIELD.HALF_L + 2, FIELD.HALF_L - 2), z: clamp(baseZ + (bz - baseZ) * 0.12, -FIELD.HALF_W + 2, FIELD.HALF_W - 2) };
  }

  // ---- Saída de bola ----
  _checkBounds() {
    const b = this.ball.position;
    if (!isFinite(b.x) || !isFinite(b.z)) { this._kickoff('home'); return true; }
    // linha lateral -> arremesso lateral
    if (b.z < -FIELD.HALF_W || b.z > FIELD.HALF_W) {
      const team = this.lastTouch === 'home' ? 'away' : 'home';
      this._setPiece('LATERAL', team, clamp(b.x, -FIELD.HALF_L + 2, FIELD.HALF_L - 2), b.z < 0 ? -FIELD.HALF_W + 0.6 : FIELD.HALF_W - 0.6);
      return true;
    }
    // linha de fundo
    if (b.x > FIELD.HALF_L || b.x < -FIELD.HALF_L) {
      const inGoal = Math.abs(b.z) < FIELD.GOAL_W / 2 && b.y < FIELD.GOAL_H;
      if (b.x > FIELD.HALF_L) { if (inGoal) { this._goal('home'); return true; } if (this.lastTouch === 'home') this._setPiece('TIRO DE META', 'away', FIELD.HALF_L - 4, 0); else this._setPiece('ESCANTEIO', 'home', FIELD.HALF_L - 0.6, b.z < 0 ? -FIELD.HALF_W + 0.6 : FIELD.HALF_W - 0.6); return true; }
      if (b.x < -FIELD.HALF_L) { if (inGoal) { this._goal('away'); return true; } if (this.lastTouch === 'away') this._setPiece('TIRO DE META', 'home', -FIELD.HALF_L + 4, 0); else this._setPiece('ESCANTEIO', 'away', -FIELD.HALF_L + 0.6, b.z < 0 ? -FIELD.HALF_W + 0.6 : FIELD.HALF_W - 0.6); return true; }
    }
    return false;
  }

  _setPiece(label, team, x, z) {
    this.onMessage(label, team === 'home' ? '#54a8ff' : '#ff6b6b');
    this.physics.resetBall(x, z);
    const taker = this.nearest(this.outfield(team === 'home' ? this.home() : this.away()), x, z) || (team === 'home' ? this.home() : this.away())[1];
    taker.body.position.set(x - (team === 'home' ? 1 : -1) * 1.0, PLAYER.R, z); taker.body.velocity.set(0, 0, 0);
    taker.face = { x: team === 'home' ? 1 : -1, z: 0 };
    this.owner = taker; this.setTeam = team; this.deadballProtect = 90; this.ballFree = 0; this.freeze = 0.8;
    if (team === 'home') { this.controlled = taker; this._manual = 160; }
  }

  _kickoff(team) {
    this.players.forEach((p) => { p.body.position.set(p.base.x, PLAYER.R, p.base.z); p.body.velocity.set(0, 0, 0); });
    this.physics.resetBall(0, 0); this.owner = null; this.ballFree = 20; this.setTeam = null; this.deadballProtect = 0;
    this.controlled = this.players.find((p) => p.team === 'home' && p.role === 'mf');
  }

  _goal(team) {
    if (team === 'home') this.scoreHome++; else this.scoreAway++;
    this.onScore(this.scoreHome, this.scoreAway);
    this.onMessage('GOL! ' + (team === 'home' ? this.homeCfg.name : this.awayCfg.name), team === 'home' ? '#54a8ff' : '#ff6b6b');
    this._kickoff(team); this.freeze = 1.3;
  }

  _sync(dt) {
    for (const p of this.players) {
      const pos = p.body.position; p.vis.group.position.set(pos.x, 0, pos.z);
      const tgt = Math.atan2(-p.face.z, p.face.x); let dr = tgt - p.vis.group.rotation.y; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI;
      p.vis.group.rotation.y += dr * Math.min(1, dt * 12);
      const sp = Math.hypot(p.body.velocity.x, p.body.velocity.z); p.vis.update(dt, sp, false);
    }
    if (this.controlled) {
      const c = this.controlled.body.position; this.ring.position.set(c.x, 0.03, c.z);
      this.aimG.position.set(c.x, 0.05, c.z); this.aimG.rotation.y = Math.atan2(-this.controlled.face.z, this.controlled.face.x);
    }
  }
}
