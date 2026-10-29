import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';
import { CareerManager } from '../src/career/careerManager.js';
import { PlayerCareer } from '../src/career/playerCareer.js';

const ds = hydrateDataset(JSON.parse(fs.readFileSync('public/players.json', 'utf8')));
const fla = ds.clubs.find((c) => c.name === 'Flamengo');
const idadeMedia = (c) => (c.squad.reduce((s, p) => s + p.idade, 0) / c.squad.length).toFixed(1);
const veteranos = fla.squad.slice().sort((a, b) => b.idade - a.idade).slice(0, 3).map((p) => `${p.nome}(${p.idade})`);

console.log('ANTES da carreira de jogador:');
console.log(`  Flamengo — idade média ${idadeMedia(fla)} | mais velhos: ${veteranos.join(', ')}`);
console.log(`  Arrascaeta existe? ${fla.squad.some((p) => p.nome === 'Giorgian de Arrascaeta') ? 'sim' : 'não'}`);

const pc = new PlayerCareer(ds, { nome: 'Teste', posicao: 'A', pe: 'R', nacionalidade: 'Brasil' });
while (!pc.aposentado) {
  while (pc.proximaDecisao()) pc.responderDecisao(0);
  pc.simularTemporada();
  if (pc.avancarTemporada().aposentou) break;
}
pc.aposentar();
const anos = pc.temporada - 1;
console.log(`\nJogador aposentou aos ${pc.idade} anos, em ${pc.ano} (${anos} temporadas)`);

// é ISTO que main.js faz ao clicar em "Virar treinador"
const mgr = new CareerManager(ds);
mgr.startYear = pc.ano;
mgr.selectClub(fla.id);

console.log('\nDEPOIS, ao abrir a Carreira de Treinador:');
console.log(`  Ano no cabeçalho: ${mgr.year()}  ${mgr.year() === pc.ano ? '✅ bate com a aposentadoria' : '❌ ERRADO'}`);
const fla2 = mgr.clubById(fla.id);
console.log(`  Flamengo — idade média ${idadeMedia(fla2)} | elenco ${fla2.squad.length} jogadores`);
console.log(`  Arrascaeta ainda no elenco? ${fla2.squad.some((p) => p.nome === 'Giorgian de Arrascaeta') ? '❌ SIM (os anos não passaram!)' : '✅ não, aposentou'}`);
const regens = fla2.squad.filter((p) => p.regenDe).length;
console.log(`  Jogadores de gerações novas: ${regens}/${fla2.squad.length}`);
const ex = fla2.squad.find((p) => p.regenDe);
if (ex) console.log(`  Exemplo: ${ex.nome}, ${ex.idade} anos (herdeiro de ${ex.regenDe})`);
const vazios = mgr.clubs().filter((c) => c.squad.length < 18).length;
console.log(`  Clubes com elenco curto no mundo: ${vazios} ${vazios === 0 ? '✅' : '❌'}`);
