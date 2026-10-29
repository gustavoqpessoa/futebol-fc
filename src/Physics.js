// Physics.js — mundo cannon-es: chão, paredes, gol, bola e corpos dos jogadores.
import * as CANNON from 'cannon-es';
import { FIELD, BALL, PLAYER } from './Constants.js';

export class Physics {
  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -18, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = false;
    this.world.defaultContactMaterial.friction = 0.2;

    // Materiais para controlar atrito/quique entre elementos
    this.mGround = new CANNON.Material('ground');
    this.mBall = new CANNON.Material('ball');
    this.mPlayer = new CANNON.Material('player');

    this.world.addContactMaterial(new CANNON.ContactMaterial(this.mGround, this.mBall, {
      friction: 0.35, restitution: BALL.RESTITUTION,
    }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.mPlayer, this.mBall, {
      friction: 0.1, restitution: 0.3,
    }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.mPlayer, this.mGround, {
      friction: 0.0, restitution: 0.0,
    }));

    this._buildArena();
    this.ball = this._buildBall();
  }

  _buildArena() {
    // Apenas o chão — SEM paredes: a bola pode sair de campo (lateral/escanteio/tiro de meta
    // são detectados por posição no Game.js). Isso é o que faz o "fora de jogo" existir.
    const ground = new CANNON.Body({ mass: 0, material: this.mGround, shape: new CANNON.Plane() });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(ground);
  }

  _buildBall() {
    const body = new CANNON.Body({
      mass: BALL.MASS, material: this.mBall,
      shape: new CANNON.Sphere(BALL.R),
      position: new CANNON.Vec3(0, BALL.R, 0),
      linearDamping: BALL.LINEAR_DAMPING,
      angularDamping: BALL.ANGULAR_DAMPING,
    });
    this.world.addBody(body);
    return body;
  }

  // Corpo do jogador: esfera com rotação travada (fica em pé), movida por velocidade.
  createPlayerBody(x, z) {
    const body = new CANNON.Body({
      mass: PLAYER.MASS, material: this.mPlayer,
      shape: new CANNON.Sphere(PLAYER.R),
      position: new CANNON.Vec3(x, PLAYER.R, z),
      linearDamping: 0.0,
      fixedRotation: true,
    });
    body.updateMassProperties();
    this.world.addBody(body);
    return body;
  }

  resetBall(x = 0, z = 0) {
    this.ball.position.set(x, BALL.R + 0.05, z);
    this.ball.velocity.set(0, 0, 0);
    this.ball.angularVelocity.set(0, 0, 0);
  }

  step(dt) {
    this.world.step(1 / 60, dt, 4);
  }
}
