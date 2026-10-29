import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';
import { PlayerCareer } from '../src/career/playerCareer.js';

const ds = hydrateDataset(JSON.parse(fs.readFileSync('public/players.json', 'utf8')));
let subiu = 0, gbNaBaixada = 0, copaNaBaixada = 0, finais = 0, propostas = [], carreiras = 0;

for (let n = 0; n < 6; n++) {
  const pc = new PlayerCareer(ds, { nome: 'T' + n, posicao: 'A', pe: 'R', nacionalidade: 'Brasil' });
  carreiras++;
  if (n === 0) console.log(`começa em: ${pc.clube().name} / ${pc.compDoClube().name}\n`);
  for (let t = 0; t < 12 && !pc.aposentado; t++) {
    while (pc.proximaDecisao()) pc.responderDecisao(0);
    const r = pc.simularTemporada();
    const tier = pc.compDoClube() ? pc.compDoClube().tier : 9;
    if (r.movimento) { subiu++; if (n === 0) console.log(`  ${r.ano} ${r.clube} ${r.movimento.tipo} -> ${r.movimento.para} (${r.posicaoLiga}º)`); }
    if (r.premios.includes('Golden Boy') && tier >= 3) gbNaBaixada++;
    r.finais.forEach((f) => { finais++; if (tier >= 3 && f.venceu) copaNaBaixada++; });
    if (n === 0 && r.finais.length) console.log(`  ${r.ano} FINAL da ${r.finais[0].copa} vs ${r.finais[0].adversario} — ${r.finais[0].placar.join('x')} ${r.finais[0].venceu ? '(campeão)' : '(vice)'}`);
    propostas.push((pc.propostas || []).length);
    pc.avancarTemporada();
  }
}
const media = (a) => (a.reduce((s, v) => s + v, 0) / a.length).toFixed(1);
console.log(`\n=== ${carreiras} carreiras x 12 temporadas ===`);
console.log(`acessos/rebaixamentos: ${subiu} ${subiu > 0 ? '✅ acontece' : '❌ nunca acontece'}`);
console.log(`Golden Boy na 3ª/4ª divisão: ${gbNaBaixada} ${gbNaBaixada === 0 ? '✅' : '❌'}`);
console.log(`Copa Nacional ganha na 3ª/4ª divisão: ${copaNaBaixada} ${copaNaBaixada <= 1 ? '✅ raro' : '❌ fácil demais'}`);
console.log(`finais disputadas: ${finais}`);
console.log(`propostas por temporada: média ${media(propostas)} ${media(propostas) >= 1.5 ? '✅' : '❌ poucas'}`);
