// _test_ligas_estaveis.mjs — nenhuma liga muda de tamanho sozinha.
//
// Em cinco temporadas simuladas, a primeira divisão dos Estados Unidos foi de 30
// clubes para ZERO e a segunda foi para 55. O motivo era uma linha: nos países sem
// acesso e rebaixamento o número de clubes que descem é zero, e `slice(-0)` em
// JavaScript devolve o array INTEIRO — ou seja, a liga toda era rebaixada de uma vez.
import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';
import { CareerManager } from '../src/career/careerManager.js';

const ds = hydrateDataset(JSON.parse(fs.readFileSync('./public/players.json', 'utf8')));
let falhas = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : '  XX  ') + m); if (!c) falhas++; };

const m = new CareerManager(ds);
m.selectClub(ds.clubs.find((c) => c.name === 'Corinthians').id);
const antes = {};
m.competitions().forEach((c) => { antes[c.name] = c.clubIds.length; });

for (let s = 0; s < 5; s++) {
  const s0 = m.season;
  let g = 0;
  while (m.season === s0 && g++ < 900) m.simulateUserResult();
  m._seasonJustEnded = false;
}

const mudaram = m.competitions().filter((c) => c.clubIds.length !== antes[c.name])
  .map((c) => `${c.name}: ${antes[c.name]} → ${c.clubIds.length}`);
ok(mudaram.length === 0, `${mudaram.length} liga(s) mudaram de tamanho em 5 temporadas`
  + (mudaram.length ? ': ' + mudaram.slice(0, 4).join(', ') : ''));

const repetidos = m.competitions().filter((c) => new Set(c.clubIds).size !== c.clubIds.length);
ok(repetidos.length === 0, 'nenhuma liga com clube repetido');

const onde = new Map(); let dobrados = 0;
for (const c of m.competitions()) for (const id of c.clubIds) { if (onde.has(id)) dobrados++; onde.set(id, c.name); }
ok(dobrados === 0, `${dobrados} clubes em duas ligas ao mesmo tempo`);

const sem = m.competitions().filter((c) => c.clubIds.length < 4);
ok(sem.length === 0, `${sem.length} liga(s) com menos de 4 clubes`);

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
