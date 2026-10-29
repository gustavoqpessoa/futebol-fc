// Tactics.js — os 15 modelos de jogo do estudo "As Grandes Revoluções Táticas do Futebol".
// Cada modelo vira PARÂMETROS numéricos (0..1) que influenciam de verdade:
//   - a SIMULAÇÃO (expectativa de gols, posse) na carreira
//   - a IA no jogo 3D (linha defensiva, pressão, ritmo, postura ofensiva)
// Campos:
//   off   = intenção ofensiva        press = intensidade de pressão
//   def   = solidez defensiva        line  = altura da linha defensiva
//   tempo = ritmo/verticalidade      poss  = tendência de posse
//   width = uso da largura
export const TACTICS = [
  { key: 'wm',          name: 'WM (Chapman)',            coach: 'Herbert Chapman',   off: 0.50, def: 0.58, press: 0.35, line: 0.45, tempo: 0.45, poss: 0.50, width: 0.55,
    desc: 'Equilíbrio clássico entre defesa e ataque; base da organização tática moderna.' },
  { key: '424',         name: '4-2-4 Brasileiro',        coach: 'Seleção 1958',      off: 0.82, def: 0.35, press: 0.45, line: 0.55, tempo: 0.62, poss: 0.55, width: 0.75,
    desc: 'Talento + amplitude e criatividade ofensiva. Muitos gols, defesa exposta.' },
  { key: 'total',       name: 'Futebol Total',           coach: 'Michels / Cruyff',  off: 0.72, def: 0.60, press: 0.85, line: 0.80, tempo: 0.70, poss: 0.72, width: 0.70,
    desc: 'Ocupação dinâmica de espaços, pressão alta e compactação total.' },
  { key: 'libero',      name: 'Líbero Moderno',          coach: 'Beckenbauer',       off: 0.52, def: 0.72, press: 0.42, line: 0.48, tempo: 0.50, poss: 0.62, width: 0.55,
    desc: 'Zagueiro como primeiro construtor; sólido e com saída limpa.' },
  { key: 'catenaccio',  name: 'Catenaccio',              coach: 'Helenio Herrera',   off: 0.35, def: 0.92, press: 0.30, line: 0.25, tempo: 0.48, poss: 0.35, width: 0.40,
    desc: 'Defesa extremamente organizada + contra-ataque. Difícil de furar.' },
  { key: 'sacchismo',   name: 'Sacchismo',               coach: 'Arrigo Sacchi',     off: 0.60, def: 0.72, press: 0.88, line: 0.82, tempo: 0.66, poss: 0.60, width: 0.60,
    desc: 'Marcação por zona, linha alta, compactação e pressão coletiva.' },
  { key: 'posicao',     name: 'Jogo de Posição',         coach: 'Cruyff',            off: 0.60, def: 0.62, press: 0.62, line: 0.62, tempo: 0.55, poss: 0.80, width: 0.72,
    desc: 'Ocupação racional dos espaços, triângulos e amplitude.' },
  { key: 'guardiola',   name: 'Evolução de Guardiola',   coach: 'Pep Guardiola',     off: 0.70, def: 0.64, press: 0.72, line: 0.70, tempo: 0.58, poss: 0.86, width: 0.72,
    desc: 'Superioridades numérica/posicional, estruturas 3+2, controle do espaço.' },
  { key: 'tikitaka',    name: 'Tiki-Taka',               coach: 'Barcelona',         off: 0.66, def: 0.56, press: 0.66, line: 0.66, tempo: 0.48, poss: 0.92, width: 0.70,
    desc: 'Usar o passe para mover o adversário e abrir espaços. Posse extrema.' },
  { key: 'lavolpe',     name: 'Saída Lavolpiana',        coach: 'Ricardo La Volpe',  off: 0.55, def: 0.62, press: 0.50, line: 0.55, tempo: 0.50, poss: 0.76, width: 0.60,
    desc: 'Construção com superioridade desde a primeira linha (volante recua).' },
  { key: 'false9',      name: 'Falso 9',                 coach: 'Messi / Guardiola', off: 0.74, def: 0.50, press: 0.55, line: 0.60, tempo: 0.60, poss: 0.76, width: 0.62,
    desc: 'Atacante que sai da área cria dilemas de marcação e espaços.' },
  { key: 'gegen',       name: 'Gegenpressing',           coach: 'Jürgen Klopp',      off: 0.74, def: 0.62, press: 0.96, line: 0.76, tempo: 0.82, poss: 0.64, width: 0.66,
    desc: 'A perda da bola é o 1º momento de pressão para recuperar rápido.' },
  { key: 'vertical',    name: 'Futebol Vertical',        coach: 'José Mourinho',     off: 0.60, def: 0.76, press: 0.45, line: 0.40, tempo: 0.86, poss: 0.40, width: 0.55,
    desc: 'Transições rápidas e eficiência acima da posse. Letal no contra-ataque.' },
  { key: 'invertidos',  name: 'Laterais Invertidos',     coach: 'Guardiola',         off: 0.66, def: 0.72, press: 0.66, line: 0.60, tempo: 0.55, poss: 0.80, width: 0.55,
    desc: 'Laterais no centro + rest defense: protegido mesmo atacando.' },
  { key: 'relacionismo',name: 'Relacionismo',            coach: 'Fernando Diniz',    off: 0.70, def: 0.48, press: 0.60, line: 0.62, tempo: 0.55, poss: 0.84, width: 0.50,
    desc: 'Aproximações constantes e relações entre jogadores, não zonas rígidas.' },
];

const _byKey = {};
TACTICS.forEach((t) => (_byKey[t.key] = t));
export function tacticByKey(k) { return _byKey[k] || TACTICS[0]; }
export const DEFAULT_TACTIC = 'wm';

// Modificadores derivados usados pela simulação.
export function simModifiers(t) {
  const tc = t || TACTICS[0];
  // attack (quanto o time cria); solidity >1 concede menos, <1 concede mais
  const attack = 0.72 + tc.off * 0.85 + tc.tempo * 0.20;
  const solidity = 0.68 + tc.def * 0.80 + tc.press * 0.20 - tc.line * 0.22;
  return { attack, solidity, poss: tc.poss };
}

// Expectativa de gols (lambda de Poisson) do time A contra o time B.
// strA/strB = força média do 11; homeAdv = bônus de mando aplicado a A.
export function expectedGoals(strA, tacA, strB, tacB, homeAdv = 0) {
  const ma = simModifiers(tacA), mb = simModifiers(tacB);
  const possA = ma.poss / (ma.poss + mb.poss); // ~0.5, enviesado por quem tem mais posse
  const strDiff = (strA + homeAdv - strB) * 0.06;
  const lam = (1.0 + strDiff) * (ma.attack / mb.solidity) * (0.70 + possA * 0.62);
  return Math.max(0.15, lam);
}

// Modificadores para a IA no jogo 3D (deslocamentos/multiplicadores).
export function gameModifiers(t) {
  const tc = t || TACTICS[0];
  return {
    lineShift: (tc.line - 0.5) * 16,   // metros: empurra a base dos jogadores p/ frente/trás
    pressExtra: tc.press,              // 0..1 -> quantos jogadores extras pressionam
    tempoMul: 0.92 + tc.tempo * 0.20,  // multiplica a velocidade do time
    attackPush: (tc.off - 0.5) * 10,   // metros extras de subida com posse
    widthMul: 0.85 + tc.width * 0.35,  // espalhamento lateral
  };
}
