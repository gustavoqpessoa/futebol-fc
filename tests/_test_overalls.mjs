// _test_overalls.mjs — a revisao do Gustavo tem de sobreviver ao pipeline.
//
// Ele abriu a Serie A e corrigiu 325 jogadores na mao: "tinha jogadores totalmente
// desconhecidos, meninos da base com um overall muito grande, e outros meninos da
// base com potencial pequeno". Essa revisao e a ultima palavra e nao pode ser
// desfeita por nenhum passo do pipeline que rode depois.
import fs from 'fs';

const P = JSON.parse(fs.readFileSync('./public/players.json', 'utf8'));
const CORR = JSON.parse(fs.readFileSync('./tools/overalls_manuais.json', 'utf8'));
let falhas = 0;
const ok = (c, m) => { if (!c) { console.log('  XX  ' + m); falhas++; } };

const atual = new Map();
for (const lg of P.leagues) {
  for (const c of lg.clubs) {
    for (const p of c.players) atual.set(`${c.n}|${p[0]}`, { ovr: p[2], pot: p[3], idade: p[4] });
  }
}

let conferidas = 0, sumiram = 0;
for (const [chave, d] of Object.entries(CORR)) {
  const a = atual.get(chave);
  if (!a) { sumiram++; continue; }   // clube renomeado ou jogador transferido: nao e erro
  if (d.overall != null) ok(a.ovr === d.overall, `${chave}: overall ${a.ovr}, o Gustavo pediu ${d.overall}`);
  if (d.potencial != null) ok(a.pot === Math.max(a.ovr, d.potencial),
    `${chave}: potencial ${a.pot}, o Gustavo pediu ${d.potencial}`);
  conferidas++;
}
console.log(`  ${conferidas} correcoes conferidas no jogo (${sumiram} jogadores ja nao estao la)`);

// E a regua dela, aplicada ao resto do Brasil: nenhum garoto brasileiro pode passar
// do teto de overall da idade dele.
const TETO = { 16: 65, 17: 69, 18: 71, 19: 75, 20: 75, 21: 76, 22: 76, 23: 78, 24: 79, 25: 79, 26: 79 };
const acima = [];
for (const lg of P.leagues) {
  if (lg.country !== 'Brasil') continue;
  for (const c of lg.clubs) {
    for (const p of c.players) {
      const t = TETO[p[4]];
      // quem o Gustavo corrigiu na mao pode passar: a palavra dele vale mais
      if (t && p[2] > t && !CORR[`${c.n}|${p[0]}`]) acima.push(`${c.n}/${p[0]} ${p[4]}a ovr ${p[2]} (teto ${t})`);
    }
  }
}
ok(acima.length === 0, `${acima.length} brasileiro(s) acima do teto da idade: ${acima.slice(0, 5).join(', ')}`);

// O potencial nao pode voltar a ser um numero so: eram 76 jovens com 87 cravado.
const pot87 = [];
for (const lg of P.leagues) {
  if (lg.country !== 'Brasil') continue;
  for (const c of lg.clubs) for (const p of c.players) if (p[4] <= 21 && p[3] === 87) pot87.push(p[0]);
}
ok(pot87.length <= 6, `${pot87.length} jovens brasileiros com potencial exatamente 87 (o limite e 6)`);
console.log(`  ${pot87.length} jovens com potencial 87 — eram 76 antes de espalhar`);

// e o potencial nunca fica abaixo do overall
let invertidos = 0;
for (const lg of P.leagues) for (const c of lg.clubs) for (const p of c.players) if (p[3] < p[2]) invertidos++;
ok(invertidos === 0, `${invertidos} jogador(es) com potencial menor que o overall`);

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
