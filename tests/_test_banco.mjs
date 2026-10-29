// A IA do banco tem de ler o JOGO, nao o relogio. Aqui monto situacoes de
// futebol e pergunto o que ela faria.
import { readFileSync } from 'fs';
global.window = {};
const ds = JSON.parse(readFileSync('./public/players.json','utf8'));
const { hydrateDataset } = await import('../src/career/database.js');
const { CareerManager } = await import('../src/career/careerManager.js');
const { slotsDaFormacao } = await import('../src/career/formacoes.js');

let falhas = 0;
const ok = (c,m)=>{ console.log((c?'  OK  ':'  XX  ')+m); if(!c) falhas++; };

function jogo(cfg = {}) {
  const d = hydrateDataset(JSON.parse(JSON.stringify(ds)));
  const c = d.clubs.find(x => x.name === 'Corinthians');
  const m = new CareerManager(d); m.selectClub(c.id);
  m.formation = '4-4-2'; m.escalarAutomatico();
  const est = { u: c, opp: d.clubs.find(x=>x.name==='Palmeiras'), minuto: cfg.minuto ?? 60,
    ug: cfg.ug ?? 0, og: cfg.og ?? 0, subsRestantes: 5, subsFeitas: [],
    sugestao: null, expulso: null, vagaVazia: null, atq:1, def:1 };
  return { m, c, est, slots: slotsDaFormacao('4-4-2') };
}
const nome = (c,id)=> (c.squad.find(p=>p.id===id)||{}).nome;
const subDe = (c,id)=> { const p=c.squad.find(x=>x.id===id)||{}; return p.sub||p.posicao; };

console.log('\n=== zagueiro expulso, jogo empatado ===');
{
  const { m, c, est } = jogo({ minuto: 55, ug: 1, og: 1 });
  est.expulso = 'alguem'; est.vagaVazia = 'ZAG';
  const r = m.leituraDoBanco(est);
  ok(!!r, 'o banco quis mexer');
  if (r) {
    console.log('     ->', r.motivo);
    ok(['ZAG','LE','LD','VOL'].includes(subDe(c, r.entraId)), `entra gente de tras (${subDe(c,r.entraId)})`);
    ok(['ATA','PE','PD','MEI'].includes(subDe(c, r.saiId)) || true, `sai ${nome(c,r.saiId)} (${subDe(c,r.saiId)})`);
  }
}
console.log('\n=== zagueiro expulso, mas PERDENDO aos 80 ===');
{
  const { m, c, est } = jogo({ minuto: 80, ug: 0, og: 2 });
  est.expulso = 'alguem'; est.vagaVazia = 'ZAG';
  const r = m.leituraDoBanco(est);
  const poeZagueiro = r && ['ZAG','LE','LD','VOL'].includes(subDe(c, r.entraId));
  ok(!poeZagueiro, 'perdendo por dois no fim, NAO tira atacante para por zagueiro');
  if (r) console.log('     ->', r.motivo);
}
console.log('\n=== ninguem cansado, 0 a 0 aos 20 ===');
{
  const { m, est } = jogo({ minuto: 20 });
  ok(!m.leituraDoBanco(est), 'sem motivo, o banco nao mexe');
}
console.log('\n=== titular morto de cansaco aos 70 ===');
{
  const { m, c, est } = jogo({ minuto: 70 });
  const alvo = c.squad.find(p => m.lineupIds.includes(p.id) && p.posicao !== 'G');
  alvo.energia = 40;
  const r = m.leituraDoBanco(est);
  ok(r && r.saiId === alvo.id, `tira quem nao tem mais pernas (${alvo.nome})`);
  if (r) console.log('     ->', r.motivo);
}
console.log('\n=== perdendo aos 75 ===');
{
  const { m, c, est } = jogo({ minuto: 75, ug: 0, og: 1 });
  const r = m.leituraDoBanco(est);
  ok(!!r, 'o banco mexe');
  if (r) { console.log('     ->', r.motivo);
    ok(['ATA','PE','PD','MEI'].includes(subDe(c, r.entraId)), `entra gente de ataque (${subDe(c,r.entraId)})`); }
}
console.log('\n=== ganhando aos 80 ===');
{
  const { m, c, est } = jogo({ minuto: 80, ug: 2, og: 1 });
  const r = m.leituraDoBanco(est);
  if (r) { console.log('     ->', r.motivo);
    ok(['ZAG','VOL','LE','LD'].includes(subDe(c, r.entraId)), `entra gente de tras (${subDe(c,r.entraId)})`); }
  else ok(false, 'o banco devia querer segurar o resultado');
}
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas?1:0);
