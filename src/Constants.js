// Dimensões do mundo (em metros) e constantes de jogo.
export const FIELD = {
  HALF_L: 45,     // metade do comprimento (eixo X) — campo grande p/ 11 contra 11
  HALF_W: 29,     // metade da largura (eixo Z)
  GOAL_W: 7.3,    // largura do gol (eixo Z)
  GOAL_H: 2.44,   // altura do gol
  GOAL_DEPTH: 2,
};

export const BALL = {
  R: 0.15,
  MASS: 0.45,
  LINEAR_DAMPING: 0.35,
  ANGULAR_DAMPING: 0.3,
  RESTITUTION: 0.45,
};

export const PLAYER = {
  R: 0.5,         // raio do corpo físico (cápsula aproximada por esfera)
  HEIGHT: 1.8,
  MASS: 80,
  SPEED: 7.6,     // m/s (campo maior)
  SPRINT: 11.5,
  ACCEL: 16,      // suavização de velocidade
};

// Times disponíveis no menu de seleção (11 nomes cada p/ 11 em campo)
const BR = ['Ederson', 'Danilo', 'Marquinhos', 'Militão', 'Arana', 'Casemiro', 'Bruno', 'Paquetá', 'Raphinha', 'Vini', 'Richarlison'];
const VE = ['Fariñez', 'Osorio', 'Chancellor', 'Angel', 'Aramburu', 'Rincón', 'Cásseres', 'Bello', 'Savarino', 'Machís', 'Rondón'];
const GT = ['Navas', 'Morales', 'Rubín', 'Pinto', 'Lom', 'Ceballos', 'Aparicio', 'Mejía', 'Santis', 'Rodas', 'Oscar'];
const EC = ['Galíndez', 'Preciado', 'Torres', 'Hincapié', 'Estupiñán', 'Caicedo', 'Franco', 'Méndez', 'Plata', 'Valencia', 'Rodríguez'];
export const TEAM_LIST = [
  { key: 'vaidebet',  name: 'Vaidebet',  country: 'Brasil',    primary: 0xf5c518, secondary: 0x111111, roster: BR },
  { key: 'camanbet',  name: 'Camanbet',  country: 'Venezuela', primary: 0x14357e, secondary: 0xd11a2a, roster: VE },
  { key: 'ganaplay',  name: 'Ganaplay',  country: 'Guatemala', primary: 0x35a7e0, secondary: 0xffffff, roster: GT },
  { key: 'betfine',   name: 'Betfine',   country: 'Venezuela', primary: 0x1763d6, secondary: 0xf5c518, roster: VE },
  { key: 'doradobet', name: 'Doradobet', country: 'Equador',   primary: 0xd4af37, secondary: 0x0a0a0a, roster: EC },
  { key: 'ecuabet',   name: 'Ecuabet',   country: 'Equador',   primary: 0xf5c518, secondary: 0x14357e, roster: EC },
];
export function teamByKey(k) { return TEAM_LIST.find((t) => t.key === k) || TEAM_LIST[0]; }

export const MATCH = { DURATION: 240 }; // segundos
