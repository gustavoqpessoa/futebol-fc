// _test_savetreinador.mjs — o save da Carreira de Treinador cabe no navegador?
//
// O save guardava o mundo inteiro dentro dele e chegou a 7,9 MB, estourando a cota de
// ~5 MB do localStorage: o Gustavo perdeu a carreira com "exceeded the quota". Agora
// grava só a diferenca em relacao ao players.json. Este teste cobre as duas coisas
// que importam: o tamanho, e se o mundo restaurado bate com o que foi salvo.
import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';
import { CareerManager } from '../src/career/careerManager.js';
const raw = JSON.parse(fs.readFileSync('./public/players.json','utf8'));
const ds = hydrateDataset(raw);
const cm = new CareerManager(ds); cm.selectClub(ds.clubs.find(c=>c.name==='Napoli').id);
for (let i=0;i<12;i++) cm.simulateUserResult();
const u = cm.userClub();
const antes = { caixa: u.caixa, elenco: u.squad.length, forca: Math.round(cm.strengthOf(u)),
  gols: u.squad.reduce((s,p)=>s+p.gols,0), pts: cm.table[u.id].pts, round: cm.round };
const snap = cm.toSnapshot();
console.log('tamanho do save:', (snap.length/1024).toFixed(0), 'KB  (era 7.900 KB)');
const ds2 = hydrateDataset(raw);
const cm2 = CareerManager.fromSnapshot(snap, ds2);
const u2 = cm2.userClub();
const depois = { caixa: u2.caixa, elenco: u2.squad.length, forca: Math.round(cm2.strengthOf(u2)),
  gols: u2.squad.reduce((s,p)=>s+p.gols,0), pts: cm2.table[u2.id].pts, round: cm2.round };
let ok = true;
for (const k of Object.keys(antes)) {
  const bom = antes[k] === depois[k];
  if (!bom) ok = false;
  console.log(`  ${bom?'OK ':'ERRO'} ${k}: ${antes[k]} -> ${depois[k]}`);
}
const kb = snap.length / 1024;
if (kb > 2000) { console.log(`FALHOU: save com ${kb.toFixed(0)} KB, perto demais da cota do navegador`); ok = false; }
console.log(ok ? 'TUDO CERTO' : 'FALHOU');
process.exit(ok ? 0 : 1);
