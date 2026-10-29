// _test_bandeiras.mjs — todo jogador com nacionalidade tem bandeira.
//
// O Gustavo viu o Zakaria Labyad, do Corinthians, sem nacionalidade na tela: "ele e
// marroquino, so que voce simplesmente nao colocou". O dado sempre esteve la — o que
// faltava era a BANDEIRA. Marrocos, Nigeria, Gana, Bosnia e outros 100 paises nao
// estavam no mapa, e o codigo, de proposito, nao desenha nada quando nao conhece o
// pais (bandeira branca seria afirmar de onde a pessoa e sem saber).
// Eram 1.739 jogadores sem bandeira nenhuma.
import fs from 'fs';
import { bandeiraDoJogador } from '../src/career/paises.js';

const P = JSON.parse(fs.readFileSync('./public/players.json', 'utf8'));
let falhas = 0;
const ok = (c, m) => { if (!c) { console.log('  XX  ' + m); falhas++; } };

const faltam = {};
let comNac = 0, semNac = 0;
for (const lg of P.leagues) {
  for (const c of lg.clubs) {
    for (const p of c.players) {
      const nac = p[10];
      if (!nac) { semNac++; continue; }
      comNac++;
      if (!bandeiraDoJogador(nac)) faltam[nac] = (faltam[nac] || 0) + 1;
    }
  }
}
const nomes = Object.keys(faltam);
ok(nomes.length === 0,
  `${nomes.length} nacionalidade(s) sem bandeira, em ${Object.values(faltam).reduce((a, b) => a + b, 0)} jogadores: `
  + nomes.slice(0, 12).join(', '));
console.log(`  ${comNac} jogadores com nacionalidade, todos com bandeira`);
// Jogador SEM nacionalidade no dado e outra coisa, e e de proposito: sao nomes reais
// cuja nacionalidade nao foi achada em fonte nenhuma, e inventar a nacionalidade de
// uma pessoa real e pior do que nao mostrar nada. Esses ficam sem bandeira mesmo. O
// teste so vigia para o numero nao CRESCER.
ok(semNac <= 3100, `${semNac} jogadores sem nacionalidade no dado (o limite e 3100)`);
console.log(`  ${semNac} sem nacionalidade em fonte nenhuma — ficam sem bandeira de proposito`);

// e o caso que o Gustavo apontou
ok(bandeiraDoJogador('Marrocos') === '🇲🇦', `Marrocos: "${bandeiraDoJogador('Marrocos')}"`);
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
