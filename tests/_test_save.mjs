import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';
import { PlayerCareer } from '../src/career/playerCareer.js';

const carregar = () => hydrateDataset(JSON.parse(fs.readFileSync('public/players.json', 'utf8')));
const idadeFla = (ds) => { const f = ds.clubs.find((c) => c.name === 'Flamengo');
  return (f.squad.reduce((s, p) => s + p.idade, 0) / f.squad.length).toFixed(1); };

// joga 8 temporadas e salva
const ds1 = carregar();
console.log(`Mundo novo (2026): idade média do Flamengo ${idadeFla(ds1)}`);
const pc = new PlayerCareer(ds1, { nome: 'Teste', posicao: 'M', pe: 'R', nacionalidade: 'Brasil' });
for (let i = 0; i < 8; i++) { while (pc.proximaDecisao()) pc.responderDecisao(0); pc.simularTemporada(); pc.avancarTemporada(); }
const raw = pc.toSnapshot();
console.log(`Salvou: ${pc.idade} anos, ano ${pc.ano}, ${Math.round(raw.length / 1024)} KB`);
console.log(`  mundo naquele momento: idade média do Flamengo ${idadeFla(ds1)}`);

// simula fechar o navegador: dataset novo em folha + carregar o save
const ds2 = carregar();
console.log(`\nApós recarregar a página, antes de restaurar: ${idadeFla(ds2)} (mundo em 2026)`);
const pc2 = PlayerCareer.fromSnapshot(ds2, raw);
console.log(`Restaurado: ${pc2.nome}, ${pc2.idade} anos, ano ${pc2.ano}`);
console.log(`  mundo depois de restaurar: idade média do Flamengo ${idadeFla(ds2)}`);
console.log(`  atributos batem? ${JSON.stringify(pc.attrs) === JSON.stringify(pc2.attrs) ? '✅ sim' : '❌ não'}`);
console.log(`  overall ${pc.ovr} -> ${pc2.ovr} ${pc.ovr === pc2.ovr ? '✅' : '❌'}`);
console.log(`  gols na carreira ${pc.carreira.gols} -> ${pc2.carreira.gols} ${pc.carreira.gols === pc2.carreira.gols ? '✅' : '❌'}`);
const vazios = ds2.clubs.filter((c) => c.squad.length < 18).length;
console.log(`  clubes com elenco curto: ${vazios} ${vazios === 0 ? '✅' : '❌'}`);
