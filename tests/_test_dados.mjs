// _test_dados.mjs — sanidade do dado que o jogo mostra.
//
// Erros de dado são os que o Gustavo encontra jogando: dois jogadores com o mesmo
// nome no elenco, clube sem goleiro, jogador valendo zero no mercado. Este teste
// varre os 38 mil jogadores e cobra que nada disso exista.
import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';

const bruto = JSON.parse(fs.readFileSync('./public/players.json', 'utf8'));
const ds = hydrateDataset(bruto);
let falhas = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : '  XX  ') + m); if (!c) falhas++; };

const todos = ds.clubs.flatMap((c) => c.squad);
ok(todos.length > 30000, `${todos.length.toLocaleString('pt-BR')} jogadores no mundo`);
ok(!todos.some((p) => p.idade < 15 || p.idade > 45), 'nenhuma idade fora de 15 a 45 anos');
ok(!todos.some((p) => p.forca < 35 || p.forca > 99), 'nenhum overall fora de 35 a 99');
ok(!todos.some((p) => p.potencial < p.forca), 'ninguém com potencial abaixo do overall');
ok(!todos.some((p) => !p.sub), 'todo jogador tem posição detalhada');
ok(!todos.some((p) => !(p.valorMercado > 0)), 'ninguém vale zero no mercado');

let semGol = 0, repetidos = 0, curtos = 0;
for (const c of ds.clubs) {
  if (!c.squad.some((p) => (p.sub || p.posicao) === 'GOL')) semGol++;
  if (c.squad.length < 20) curtos++;
  const vistos = new Set();
  for (const p of c.squad) { if (vistos.has(p.nome)) repetidos++; vistos.add(p.nome); }
}
ok(semGol === 0, `${semGol} clubes sem goleiro`);
ok(curtos === 0, `${curtos} clubes com menos de 20 jogadores`);
ok(repetidos === 0, `${repetidos} jogadores com nome repetido no próprio elenco`);

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
