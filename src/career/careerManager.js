// careerManager.js — carreira multi-liga: escolha qualquer clube de qualquer uma das 50 ligas.
// Cada liga roda seu próprio campeonato (pontos corridos, turno/returno). No fim da temporada,
// há acesso/rebaixamento entre as divisões do MESMO país (onde existir mais de uma).
// Gols + assistências por jogador (artilharia e líder de assistências) da sua competição.
import { bestEleven, avgForca, valorJusto, BASE_JOGADOR, CAMPOS_MUTAVEIS, CAMPOS_DO_MUNDO, ELENCO_ORIGINAL } from './database.js';
import { slotsDaFormacao, penalidadeDePosicao, PARECIDAS } from './formacoes.js';
import { expectedGoals, tacticByKey } from '../Tactics.js';
import { ageWorldOneYear, advanceWorld, youthPlayer } from './evolution.js';
import { vagasDeAcesso } from './paises.js';
import { splitDaLiga, turnosDaLiga } from './formatos.js';
import { estadoDe, nomeDoEstadual } from './estados.js';
import { classicoEntre, ehDerbyRegional } from './rivalidades.js';
import { copaNacional, segundaCopa, copasDoContinente, copaEstadual, SEM_COPA,
  supercopaDoPais, supercopaDoContinente, mundiais } from './copas.js';
import { gerarBase, avancarBase, parecerDoOlheiro, leituraDoOlheiro } from './base.js';

// Lesões com nome e prazo. Antes era só um número invisível no jogador; agora dá
// para saber que o Yuri Alberto está fora por 3 semanas com dor na coxa.
const LESOES = [
  { nome: 'Lesão na coxa', min: 2, max: 5 },
  { nome: 'Estiramento na panturrilha', min: 2, max: 4 },
  { nome: 'Entorse no tornozelo', min: 3, max: 6 },
  { nome: 'Dores no joelho', min: 2, max: 4 },
  { nome: 'Lesão na virilha', min: 3, max: 6 },
  { nome: 'Fratura no dedo do pé', min: 4, max: 7 },
  { nome: 'Lesão muscular na posterior', min: 3, max: 6 },
  { nome: 'Pancada nas costelas', min: 1, max: 3 },
  { nome: 'Ruptura do ligamento', min: 12, max: 24 },
  { nome: 'Cirurgia no menisco', min: 8, max: 14 },
];
export function sortearLesao(grave) {
  const pool = grave ? LESOES.slice(-2) : LESOES.slice(0, -2);
  const l = pool[Math.floor(Math.random() * pool.length)];
  const semanas = l.min + Math.floor(Math.random() * (l.max - l.min + 1));
  return { nome: l.nome, semanas, rodadas: Math.max(1, Math.round(semanas / 1.6)) };
}

export const STATE = { MAIN_MENU: 'menu', PICKLEAGUE: 'pickleague', DASHBOARD: 'dash', TACTICS: 'tactics', TRANSFERS: 'transfers', STANDINGS: 'standings', STATS: 'stats', LIGAS: 'ligas', COPA: 'copa', CAL: 'cal', HIST: 'hist', OLHEIRO: 'olheiro', BASE: 'base', MATCH: 'match' };

function poisson(l) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// País (PT) -> confederação continental (para a copa continental)
const CONTINENT = {
  'Brasil': 'CONMEBOL', 'Argentina': 'CONMEBOL', 'Uruguai': 'CONMEBOL', 'Colômbia': 'CONMEBOL', 'Chile': 'CONMEBOL', 'Equador': 'CONMEBOL', 'Paraguai': 'CONMEBOL', 'Peru': 'CONMEBOL', 'Bolívia': 'CONMEBOL',
  'Inglaterra': 'UEFA', 'Espanha': 'UEFA', 'Itália': 'UEFA', 'Alemanha': 'UEFA', 'França': 'UEFA', 'Holanda': 'UEFA', 'Portugal': 'UEFA', 'Turquia': 'UEFA', 'Bélgica': 'UEFA', 'Escócia': 'UEFA', 'Polônia': 'UEFA', 'Noruega': 'UEFA', 'Suécia': 'UEFA', 'Romênia': 'UEFA', 'Suíça': 'UEFA', 'Áustria': 'UEFA', 'Grécia': 'UEFA', 'Dinamarca': 'UEFA', 'Chéquia': 'UEFA', 'Croácia': 'UEFA', 'Sérvia': 'UEFA', 'Ucrânia': 'UEFA', 'Rússia': 'UEFA', 'Hungria': 'UEFA', 'Chipre': 'UEFA', 'Finlândia': 'UEFA', 'Azerbaijão': 'UEFA', 'Bulgária': 'UEFA', 'Eslováquia': 'UEFA', 'Eslovênia': 'UEFA', 'Irlanda': 'UEFA', 'Israel': 'UEFA',
  'Estados Unidos': 'CONCACAF', 'México': 'CONCACAF', 'Canadá': 'CONCACAF',
  'China': 'AFC', 'Coreia do Sul': 'AFC', 'Japão': 'AFC', 'Arábia Saudita': 'AFC', 'Índia': 'AFC', 'Emirados Árabes': 'AFC', 'Austrália': 'AFC', 'Malásia': 'AFC',
  'África do Sul': 'CAF', 'Costa do Marfim': 'CAF', 'Senegal': 'CAF',
  'Venezuela': 'CONMEBOL',
  'Emirados Árabes Unidos': 'AFC',
  'País de Gales': 'UEFA', 'República Tcheca': 'UEFA',
  'Nova Zelândia': 'OFC',
};
// TODO país novo: mapeie aqui. Sem isso ele caía em 'UEFA' por omissão, e era assim
// que Nova Zelândia, Venezuela, Emirados e Costa do Marfim disputavam a Champions
// League. Repare que 'Chéquia' e 'Emirados Árabes' estavam escritos diferente do que
// o jogo usa ('República Tcheca', 'Emirados Árabes Unidos') — o mapa não pegava.
// Nome COMPLETO de cada competição — sem prefixo "Copa" grudado na frente, que era
// o que gerava a "Copa Copa dos Campeões".
const clamp01 = (v) => Math.max(0, Math.min(100, v));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtMoneyBr = (v) => '€ ' + Math.round(v).toLocaleString('pt-BR');

const CUP_NAME = {
  CONMEBOL: 'Copa Libertadores', UEFA: 'UEFA Champions League',
  CONCACAF: 'Concacaf Champions Cup', AFC: 'AFC Champions League', CAF: 'CAF Champions League',
  OFC: 'OFC Champions League',
};
// Copa nacional com o nome de verdade de cada país.
const COPA_NACIONAL = {
  Brasil: 'Copa do Brasil', Inglaterra: 'FA Cup', Espanha: 'Copa del Rey',
  Alemanha: 'DFB-Pokal', Itália: 'Coppa Italia', França: 'Coupe de France',
  Portugal: 'Taça de Portugal', Holanda: 'KNVB Beker', Argentina: 'Copa Argentina',
  Escócia: 'Scottish Cup', Bélgica: 'Beker van België', Turquia: 'Türkiye Kupası',
  México: 'Copa MX', 'Estados Unidos': 'US Open Cup', Japão: "Emperor's Cup",
  'Coreia do Sul': 'Korean FA Cup', Chile: 'Copa Chile', Colômbia: 'Copa Colombia',
  Uruguai: 'Copa Uruguay', Grécia: 'Kypello Elladas', Rússia: 'Copa da Rússia',
};

export class CareerManager {
  constructor(dataset) {
    this.league = dataset;           // { clubs, competitions, market, meta }
    this.userClubId = null; this.userComp = null; this.state = STATE.MAIN_MENU;
    this.season = 1; this.round = 0; this.startYear = 2026;
    this.lineupIds = null; this.formation = '4-4-2'; this.posture = 'Equilibrada'; this.userTactic = null;
    this.forma = [];
  }

  clubs() { return this.league.clubs; }
  competitions() { return this.league.competitions; }
  clubById(id) { return this.league.clubs.find((c) => c.id === id); }
  compById(id) { return this.league.competitions.find((c) => c.id === id); }
  clubsOfComp(compId) { return this.league.clubs.filter((c) => c.comp === compId); }
  activeClubs() { return this.clubsOfComp(this.userComp); }
  userClub() { return this.clubById(this.userClubId); }
  userCompObj() { return this.compById(this.userComp); }

  tacticOf(club) {
    if (club && club.id === this.userClubId && this.userTactic) return tacticByKey(this.userTactic);
    return tacticByKey(club ? club.tactic : null);
  }

  /** Depois de uma demissão só um clube até o teto te contrata. Sem demissão no
   *  currículo, o mundo inteiro está aberto (é assim que a carreira começa). */
  podeAssumir(id) {
    if (!this.tetoTreinador) return true;
    const cl = this.clubById(id);
    return !!cl && avgForca(bestEleven(cl)) <= this.tetoTreinador;
  }

  selectClub(id) {
    if (!this.podeAssumir(id)) return false;
    this.tetoTreinador = null; this.demitidoDe = null;
    this.userClubId = id; this.userComp = this.userClub().comp; this.userTactic = this.userClub().tactic;
    // Assumir um clube novo zera o que era do clube anterior. Sem isto, quem era
    // demitido e pegava outro time via no painel do time novo "resultado da última
    // partida" — uma partida da temporada passada, com o escudo do clube velho.
    this._lastUserResult = null; this.forma = []; this.formaDetalhe = [];
    this._startSeason(); this._iniciarBase(); this.escalarAutomatico();
    return true;
  }

  _startSeason() {
    // O "resultado da última partida" da temporada PASSADA continuava no painel da
    // temporada nova. O Gustavo: "isso aqui não faz sentido".
    this.round = 0; this._midWindowDone = false; this.formaDosClubes = {};
    this._lastUserResult = null; this.forma = []; this.formaDetalhe = [];
    // temporada nova, crédito novo com a diretoria e vestiário no zero a zero
    this.paciencia = 80; this._avisoDiretoria = null; this.moralElenco = 60;
    this._buildFixtures(); this._initStandings();
    this.activeClubs().forEach((c) => c.squad.forEach((p) => { p.gols = 0; p.assist = 0; p.jogos = 0; p.amarelos = 0; }));
    this._startCups(); this._espalharCalendarioDasCopas(); this._setObjective();
    this._montarAgenda();
  }

  /** A AGENDA DA TEMPORADA: um compromisso por dia, um jogo por compromisso.
   *
   *  O Gustavo: "como é que vou jogar os dois jogos no mesmo dia? Eu preciso que
   *  tenha datas específicas e dê para simular também esses outros campeonatos,
   *  porque eu não quero só simular brasileiro".
   *
   *  Antes a temporada era só as 38 rodadas da liga, e as fases de copa aconteciam
   *  POR DENTRO delas: ao simular a rodada 5 do Brasileirão, o jogo resolvia também a
   *  fase do Paulista que calhava ali. Você nunca jogava a copa — ela acontecia com
   *  você. Agora cada fase de copa tem o seu dia, e a temporada passa de 38 para uns
   *  55 compromissos, que é quanto um clube brasileiro joga de verdade.
   *
   *  O estadual abre o ano em BLOCO, como no Brasil: janeiro a abril só tem estadual,
   *  e o Brasileirão só começa quando ele acaba.
   */
  /** QUANTOS DIAS UMA FASE OCUPA NA AGENDA.
   *
   *  O Gustavo: "fase de grupos não se decide em um jogo". Não mesmo — um grupo de
   *  quatro são três rodadas (seis com ida e volta), e cada uma tem a sua data. As
   *  fases de mata-mata continuam sendo um dia.
   */
  diasDaFase(cup, fase) {
    const f = fase === (cup.iGrupos || 0) ? cup.formatoFase : null;
    if (!f) return 1;
    if (f.tipo === 'liga') return Math.min(f.jogos || 8, 8);
    const porGrupo = f.por_grupo || 4;
    return Math.max(1, (porGrupo - 1) * (f.ida_volta ? 2 : 1));
  }

  _montarAgenda() {
    const dias = [];
    const cups = this.cupsList();

    // 1) o estadual inteiro, antes de tudo
    // A agenda é DO SEU CLUBE. Uma fase em que você não entra não é compromisso seu:
    // a primeira fase da Libertadores acontece enquanto você espera nos grupos. Sem
    // este filtro a temporada saía com 71 datas, várias delas de jogos alheios.
    const daMinhaFase = (c) => Math.max(0, c.entraDoUsuario || 0);
    const euJogo = (c) => (c.entradas
      ? c.entradas.some((e) => e && e.includes(this.userClubId))
      : (c.alive || []).includes(this.userClubId));

    const iEst = cups.findIndex((c) => c.kind === 'estadual');
    if (iEst >= 0 && euJogo(cups[iEst])) {
      const est = cups[iEst];
      for (let f = daMinhaFase(est); f < est.stages.length; f++) {
        const n = this.diasDaFase(est, f);
        for (let k = 0; k < n; k++) dias.push({ tipo: 'copa', cup: iEst, fase: f, rodadaDoGrupo: n > 1 ? k + 1 : null });
      }
    }

    // 2) as rodadas da liga, com as fases das outras copas intercaladas.
    //    Cada copa mantém a ORDEM das fases dela; o que muda é o espaçamento, que
    //    agora é medido em dias de agenda e não em rodadas de liga.
    const rodadas = this.fixtures.length;
    const outras = cups.map((c, i) => ({ c, i }))
      .filter(({ c, i }) => i !== iEst && c.stages && c.stages.length);
    const marcos = [];
    for (const { c, i } of outras) {
      if (!euJogo(c)) continue;
      for (let f = daMinhaFase(c); f < c.stages.length; f++) {
        // onde a fase caía na escala antiga (rodada), vira posição relativa na liga
        const quando = (c.sched && c.sched[f]) || Math.round((f + 1) / c.stages.length * rodadas);
        marcos.push({ pos: Math.max(0, Math.min(rodadas, quando)), cup: i, fase: f });
      }
    }
    marcos.sort((a, b) => a.pos - b.pos || a.cup - b.cup || a.fase - b.fase);

    let m = 0;
    for (let r = 0; r < rodadas; r++) {
      while (m < marcos.length && marcos[m].pos <= r) {
        {
          const cp = cups[marcos[m].cup];
          const n = this.diasDaFase(cp, marcos[m].fase);
          for (let k = 0; k < n; k++) {
            dias.push({ tipo: 'copa', cup: marcos[m].cup, fase: marcos[m].fase,
              rodadaDoGrupo: n > 1 ? k + 1 : null });
          }
        }
        m++;
      }
      dias.push({ tipo: 'liga', rodada: r });
    }
    while (m < marcos.length) { dias.push({ tipo: 'copa', cup: marcos[m].cup, fase: marcos[m].fase }); m++; }

    this.agenda = dias;
    this.dia = 0;
  }

  // ---------------------------- CATEGORIA DE BASE ----------------------------
  /** Os garotos da sua casa. Gerados uma vez, ao assumir o clube. */
  _iniciarBase() {
    const u = this.userClub();
    this.base = gerarBase(u, this.strengthOf(u), 10);
  }
  baseDoClube() { return this.base || []; }
  parecerBase(p) { return parecerDoOlheiro(p); }
  faixaBase(p) { return leituraDoOlheiro(p); }

  /** Sobe UM garoto da categoria para o profissional. */
  subirDaBase(id) {
    const i = (this.base || []).findIndex((p) => p.id === id);
    if (i < 0) return { ok: false, msg: 'Garoto não encontrado' };
    const p = this.base[i];
    const u = this.userClub();
    if (this.elencoCheio(u) && p.idade > CareerManager.IDADE_BASE)
      return { ok: false, msg: 'Elenco profissional cheio' };
    this.base.splice(i, 1);
    // ganha id de gente grande e entra no elenco
    p.id = Math.max(0, ...u.squad.map((x) => x.id)) + 1;
    p.base = false;
    u.squad.push(p);
    this._pushNews(`${p.nome}, ${p.idade} anos, subiu da base para o profissional.`);
    return { ok: true, msg: `${p.nome} subiu ao profissional`, jogador: p };
  }

  /** Dispensa o garoto. Sem drama: nem todo mundo vinga. */
  dispensarDaBase(id) {
    const i = (this.base || []).findIndex((p) => p.id === id);
    if (i < 0) return { ok: false, msg: 'Garoto não encontrado' };
    const p = this.base.splice(i, 1)[0];
    return { ok: true, msg: `${p.nome} foi dispensado da base` };
  }

  /** Vira o ano na base: eles crescem, e quem faz 20 anos precisa de decisão. */
  _avancarBase() {
    if (!this.base) return this._iniciarBase();
    const u = this.userClub();
    const { ficam, saem } = avancarBase(this.base, this.strengthOf(u));
    this.base = ficam;
    for (const p of saem) {
      // quem passou da idade e é bom o bastante sobe sozinho; o resto vai embora
      const merece = p.forca >= this.strengthOf(u) - 12 && !this.elencoCheio(u);
      if (merece) {
        p.id = Math.max(0, ...u.squad.map((x) => x.id)) + 1; p.base = false;
        u.squad.push(p);
        this._pushNews(`${p.nome} completou 20 anos e subiu da base.`);
      } else {
        this._pushNews(`${p.nome} passou da idade de base e deixou o clube.`);
      }
    }
    // Quem completa a base são os garotos revelados pela estrutura do clube
    // (_revelarBase, logo depois desta chamada) — investir na base rende mais gente
    // e com teto mais alto. Aqui só ordeno o que sobrou.
    this.base.sort((a, b) => b.forca - a.forca);
  }

  // ---------- COPAS (continental + nacional), em lista ----------
  _startCups() {
    this.cups = []; this.cupFinalPending = null;
    const country = this.userClub().country;
    const cont = CONTINENT[country];
    if (!cont) { this.cups.push(...[]); }   // país sem confederação: só copa nacional

    // CONTINENTAL: só entra quem se classificou — os melhores da PRIMEIRA divisão de
    // cada país, no máximo 4 por país. Antes era "os 15 mais fortes do continente", e
    // por isso caía um clube de Série B na Libertadores.
    const contPool = [];
    const paises = cont ? [...new Set(this.clubs()
      .filter((c) => CONTINENT[c.country] === cont).map((c) => c.country))] : [];
    // VAGAS POR PAÍS. Antes eram 3 para todo mundo (4 para o do usuário), e por isso
    // a Libertadores tinha 28 clubes em vez de 47. Na de verdade o Brasil tem 7
    // vagas, a Argentina 6 e os outros oito países 4 — está pesquisado no copas.json.
    const fmtPrincipal = cont ? copasDoContinente(cont)[0] : null;
    const vagasDe = (pais) => {
      const v = fmtPrincipal && fmtPrincipal.vagas;
      if (!v) return pais === country ? 4 : 3;
      return v[pais] != null ? v[pais] : (v._padrao || 3);
    };
    for (const pais of paises) {
      const primeira = this.competitions().find((cp) => cp.country === pais && cp.tier === 1);
      if (!primeira) continue;
      this._classificacaoAnterior(primeira).slice(0, vagasDe(pais)).forEach((r) => contPool.push(r.id));
    }
    // As vagas por país da Libertadores dão 45, e ela tem 47: as outras duas são do
    // campeão da Libertadores e do da Sul-Americana. Aqui elas vão para os melhores
    // colocados que ficaram de fora, para o número de participantes bater.
    if (fmtPrincipal && fmtPrincipal.entram && contPool.length < fmtPrincipal.entram) {
      const dentro = new Set(contPool);
      const fila = [];
      for (const pais of paises) {
        const cp = this.competitions().find((c) => c.country === pais && c.tier === 1);
        if (cp) this._classificacaoAnterior(cp).forEach((r, i) => {
          if (!dentro.has(r.id)) fila.push({ id: r.id, pos: i });
        });
      }
      fila.sort((a, b) => a.pos - b.pos);
      for (const f of fila) {
        if (contPool.length >= fmtPrincipal.entram) break;
        contPool.push(f.id);
      }
    }
    if (cont) {
      const fmtC = copasDoContinente(cont)[0];
      const real = fmtC ? this._buildCupContinental('cont', fmtC, contPool, cont) : null;
      this.cups.push(real || this._buildCup('cont', contPool, CUP_NAME[cont] || 'Copa Continental', cont, false, true));
    }

    // SEGUNDA COMPETIÇÃO CONTINENTAL: Sul-Americana na CONMEBOL, Liga Europa na UEFA.
    // Entram os clubes que ficaram logo atrás dos classificados à principal.
    const segundaPool = [];
    for (const pais of paises) {
      const primeira = this.competitions().find((cp) => cp.country === pais && cp.tier === 1);
      if (!primeira) continue;
      // quem já foi para a principal não repete; a segunda leva o número de vagas
      // que ela tem de verdade (Sul-Americana: 6 do Brasil, 6 da Argentina, 4 dos outros)
      const fmt2 = cont ? copasDoContinente(cont).find((x) => x.nome === (
        cont === 'CONMEBOL' ? 'Copa Sul-Americana' : cont === 'UEFA' ? 'Liga Europa' : '')) : null;
      const v2 = fmt2 && fmt2.vagas;
      const quantas = v2 ? (v2[pais] != null ? v2[pais] : (v2._padrao || 3)) : 3;
      const jaClassificados = vagasDe(pais);
      this._classificacaoAnterior(primeira)
        .slice(jaClassificados, jaClassificados + quantas).forEach((r) => segundaPool.push(r.id));
    }
    const nomeSegunda = cont === 'CONMEBOL' ? 'Copa Sul-Americana'
      : cont === 'UEFA' ? 'Liga Europa' : null;
    // A Sul-Americana tem 56 participantes e as vagas por país dão 44: as outras 12
    // são clubes que caem da Libertadores. Como no jogo um clube não muda de copa no
    // meio da temporada, essas vagas vão para os melhores que ainda estão de fora.
    const fmtSeg = nomeSegunda && cont
      ? copasDoContinente(cont).find((x) => x.nome === nomeSegunda) : null;
    if (fmtSeg && fmtSeg.entram && segundaPool.length < fmtSeg.entram) {
      const jaTem = new Set([...contPool, ...segundaPool]);
      const fila = [];
      for (const pais of paises) {
        const cp = this.competitions().find((c) => c.country === pais && c.tier === 1);
        if (cp) this._classificacaoAnterior(cp).forEach((r, i) => {
          if (!jaTem.has(r.id)) fila.push({ id: r.id, pos: i });
        });
      }
      fila.sort((a, b) => a.pos - b.pos);
      for (const f of fila) {
        if (segundaPool.length >= fmtSeg.entram) break;
        segundaPool.push(f.id);
      }
    }
    if (nomeSegunda && segundaPool.length >= 4) {
      // NINGUÉM joga as duas. O Gustavo viu o Napoli na Champions e na Liga Europa
      // ao mesmo tempo, e depois o Corinthians na Libertadores e na Sul-Americana
      // na mesma rodada. Um clube se classifica para UMA competição continental.
      // TODOS os inscritos na principal, não só os que estão em campo agora: desde que
      // a Libertadores ganhou as preliminares, o `alive` dela no começo tem só os 6
      // da primeira fase, e por isso Corinthians e Palmeiras apareciam nas DUAS.
      const principal = this.cups.find((c) => c.kind === 'cont');
      const naPrincipal = new Set(principal
        ? (principal.entradas ? principal.entradas.flat() : principal.alive)
        : []);
      const pool = segundaPool.filter((id) => !naPrincipal.has(id) && id !== this.userClubId);
      const euEstouNaPrincipal = naPrincipal.has(this.userClubId);
      // VAGA CONTINENTAL É DA PRIMEIRA DIVISÃO. O jogo enfiava o clube do jogador na
      // segunda competição do continente sempre, e o Gustavo pegou o Bolton na League
      // One: "acho estranho estar aparecendo Liga Europa, sendo que eu estou na
      // terceira divisão". Quem está fora da elite não se classifica para a Europa —
      // sobe primeiro.
      const minhaComp = this.userCompObj();
      // E NÃO BASTA SER DA PRIMEIRA DIVISÃO. O Gustavo pegou o Vaduz, o pior clube
      // da Suíça, terminou em último e mesmo assim jogou a Liga Europa: "um time do
      // meu nível nem deveria estar jogando". Vaga continental é de quem terminou
      // NA FAIXA de classificação do país na temporada anterior.
      const elegivel = (() => {
        if (!minhaComp || minhaComp.tier !== 1) return false;
        const tab = this._classificacaoAnterior(minhaComp);
        const pos = tab.findIndex((r) => r.id === this.userClubId) + 1;
        if (!pos) return false;
        const vagas = (vagasDe(minhaComp.country) || 0) + 3;   // vagas da principal + as da segunda
        return pos <= vagas;
      })();
      const comigo = (euEstouNaPrincipal || !elegivel) ? pool : [this.userClubId, ...pool];
      if (comigo.length >= 4) {
        const fmt2C = copasDoContinente(cont).find((x) => x.nome === nomeSegunda);
        const real2 = fmt2C ? this._buildCupContinental('cont2', fmt2C, comigo, cont) : null;
        this.cups.push(real2 || this._buildCup('cont2', comigo, nomeSegunda, cont, false, true));
      }
    }

    // TERCEIRA COMPETIÇÃO CONTINENTAL: a Conference League. A UEFA tem TRÊS e o jogo
    // só tinha duas — o clube que terminava em 6º ou 7º não ia para lugar nenhum.
    // Ela é como a Liga Europa, mas cada clube joga SEIS partidas na fase de liga em
    // vez de oito.
    if (cont === 'UEFA') {
      const fmt3 = copasDoContinente(cont).find((x) => x.nome === 'Conference League');
      if (fmt3) {
        const jaEstao = new Set(this.cups
          .filter((c) => c.kind === 'cont' || c.kind === 'cont2')
          .flatMap((c) => (c.entradas ? c.entradas.flat() : c.alive)));
        const terceiroPool = [];
        for (const pais of paises) {
          const cp = this.competitions().find((c) => c.country === pais && c.tier === 1);
          if (!cp) continue;
          const v = fmt3.vagas || {};
          const quantas = v[pais] != null ? v[pais] : (v._padrao || 2);
          this._classificacaoAnterior(cp).filter((r) => !jaEstao.has(r.id))
            .slice(0, quantas).forEach((r) => terceiroPool.push(r.id));
        }
        // completa até o tamanho real com os melhores que sobraram
        if (fmt3.entram && terceiroPool.length < fmt3.entram) {
          const dentro = new Set([...jaEstao, ...terceiroPool]);
          const fila = [];
          for (const pais of paises) {
            const cp = this.competitions().find((c) => c.country === pais && c.tier === 1);
            if (cp) this._classificacaoAnterior(cp).forEach((r, i) => {
              if (!dentro.has(r.id)) fila.push({ id: r.id, pos: i });
            });
          }
          fila.sort((a, b) => a.pos - b.pos);
          for (const f of fila) {
            if (terceiroPool.length >= fmt3.entram) break;
            terceiroPool.push(f.id);
          }
        }
        const euJaEstou = jaEstao.has(this.userClubId);
        const pool3 = terceiroPool.filter((id) => id !== this.userClubId);
        // mesma regra da Liga Europa: a Conference é da primeira divisão
        // mesma régua da Liga Europa: a Conference também é para quem terminou bem
        const daElite = (() => {
          const cp = this.userCompObj();
          if (!cp || cp.tier !== 1) return false;
          const tab = this._classificacaoAnterior(cp);
          const pos = tab.findIndex((r) => r.id === this.userClubId) + 1;
          return !!pos && pos <= (vagasDe(cp.country) || 0) + 5;
        })();
        const comigo3 = (euJaEstou || !daElite) ? pool3 : [this.userClubId, ...pool3];
        if (comigo3.length >= 8) {
          const real3 = this._buildCupContinental('cont3', fmt3, comigo3, cont);
          if (real3) this.cups.push(real3);
        }
      }
    }

    // SUPERCOPAS. Abrem a temporada e são disputadas por quem ganhou alguma coisa no
    // ano anterior: na Alemanha o campeão da Bundesliga contra o da DFB-Pokal, na
    // Europa o campeão da Champions contra o da Liga Europa, na América do Sul a
    // Recopa entre os campeões da Libertadores e da Sul-Americana (essa em ida e
    // volta). A da Espanha tem quatro clubes, com semifinais.
    const minhaLiga = this.competitions().find((c) => c.country === country && c.tier === 1);
    const sup = supercopaDoPais(country);
    if (sup) {
      const campLiga = this._campeaoDe('liga:' + country, minhaLiga, 0);
      const nac = copaNacional(country);
      let campCopa = nac ? this._campeaoDe(nac.nome, minhaLiga, 1) : null;
      // Dobradinha: o mesmo clube ganhou a liga e a copa. A regra é a mesma em todo
      // lugar — entra o VICE da liga no lugar. Antes a supercopa não acontecia.
      if (campCopa && campCopa === campLiga) {
        campCopa = this._campeaoDe('vice:' + country, minhaLiga, 1);
        if (campCopa === campLiga) campCopa = null;
      }
      const ids = [campLiga, campCopa];
      if ((sup.entram || 2) >= 4) {
        // Espanha: campeão e vice da liga, campeão e vice da copa. Preenche com a
        // tabela do ano anterior sem repetir quem já está — senão os quatro viravam
        // dois e a Supercopa de España saía como jogo único.
        const tab = this._classificacaoAnterior(minhaLiga);
        for (const r of tab) {
          if (ids.filter(Boolean).length >= 4) break;
          if (!ids.includes(r.id)) ids.push(r.id);
        }
      }
      const s1 = this._buildSupercopa('super', sup, ids, country);
      if (s1) this.cups.push(s1);
    }
    if (cont) {
      const supC = supercopaDoContinente(cont);
      if (supC) {
        const daCont = copasDoContinente(cont);
        // NA PRIMEIRA TEMPORADA NINGUÉM GANHOU NADA AINDA, e o jogo caía na tabela
        // da SUA liga para preencher — foi assim que o Servette, campeão suíço,
        // apareceu jogando a Supercopa da UEFA sem ter ganhado nada. O certo é
        // olhar o continente: entra quem é grande no continente, não na sua liga.
        const grandesDoCont = this.clubs()
          .filter((cl) => CONTINENT[cl.country] === cont && cl.tier === 1)
          .sort((x, y) => this.strengthOf(y) - this.strengthOf(x));
        const doCont = (i) => (grandesDoCont[i] ? grandesDoCont[i].id : null);
        const a1 = daCont[0] ? (this._campeaoDe(daCont[0].nome, null) || doCont(0)) : null;
        let a2 = daCont[1] ? (this._campeaoDe(daCont[1].nome, null) || doCont(1)) : null;
        if (a2 && a2 === a1) a2 = doCont(2);
        const s2 = this._buildSupercopa('superc', supC, [a1, a2], cont);
        if (s2) this.cups.push(s2);
      }
    }

    // O PLAYOFF DA SEGUNDA ESPERA OS GRUPOS DA PRINCIPAL.
    //
    // Quem entra no playoff das oitavas da Sul-Americana são os terceiros colocados
    // dos grupos da Libertadores. Só que o playoff caía na rodada 14 e a fase de
    // grupos da Libertadores na 17: na hora de montar o confronto, os terceiros ainda
    // não existiam. Aqui o playoff e tudo que vem depois dele são empurrados para
    // depois dos grupos da principal, que é a ordem de verdade.
    {
      const principal = this.cups.find((c) => c.kind === 'cont');
      const segunda = this.cups.find((c) => c.kind === 'cont2');
      if (principal && segunda && principal.sched && segunda.sched) {
        const quandoGrupos = principal.sched[principal.iGrupos || 0] || 0;
        const iPlay = segunda.stages.findIndex((n) => /playoff/i.test(n));
        if (iPlay > 0 && segunda.sched[iPlay] <= quandoGrupos) {
          const total = this.totalRounds() || 38;
          const desloc = quandoGrupos + 1 - segunda.sched[iPlay];
          for (let i = iPlay; i < segunda.sched.length; i++) {
            segunda.sched[i] = Math.min(total, segunda.sched[i] + desloc);
          }
          // a final não pode empatar de rodada com a semifinal
          for (let i = 1; i < segunda.sched.length; i++) {
            if (segunda.sched[i] <= segunda.sched[i - 1]) segunda.sched[i] = Math.min(total, segunda.sched[i - 1] + 1);
          }
        }
      }
    }

    // OS DOIS MUNDIAIS.
    //
    // O Mundial de Clubes é o de 32 clubes e acontece DE QUATRO EM QUATRO ANOS, com
    // vagas por confederação: 12 da UEFA, 6 da CONMEBOL, 4 da CAF, da AFC e da
    // CONCACAF, 1 da Oceania e 1 do país-sede. A Copa Intercontinental é todo ano e
    // junta só os seis campeões continentais, com o da Champions entrando direto na
    // final. As duas existem de verdade e são coisas diferentes.
    for (const mun of mundiais()) {
      const cada = mun.de_quantos_em_quantos_anos || 1;
      if (cada > 1 && this.season % cada !== 0) continue;
      const ids = mun.vagas_por_continente
        ? this._poolDoMundial(mun) : this._campeoesContinentais();
      if (ids.length < 4) continue;
      const cm = mun.vagas_por_continente
        ? this._buildCupContinental('mundial', mun, ids, 'FIFA')
        : this._buildCupReal('mundial', mun, ids, 'FIFA', false);
      if (cm) this.cups.push(cm);
    }

    // NACIONAL: todo mundo do país pode entrar, de qualquer divisão — como na Copa do
    // Brasil. Metade das vagas vai para os grandes, metade é sorteada, para caber a
    // zebra sem virar torneio só de gigante.
    // O usuário SEMPRE entra na copa nacional: é o torneio do país dele, todo mundo
    // joga. Ao passar a exigir classificação nas continentais eu tirei ele daqui sem
    // querer, e o Napoli ficou fora da Coppa Italia.
    const doPais = this.clubs().filter((c) => c.country === country).map((c) => c.id);
    const fmt = copaNacional(country);
    let nacional = null;
    if (fmt) nacional = this._buildCupReal('nac', fmt, doPais, country, false);
    // Onde a copa nacional NÃO existe, ela não existe. O México não tem copa desde
    // que a Copa MX acabou, em 2019-20; o jogo estava inventando uma.
    if (!fmt && SEM_COPA.includes(country)) nacional = null;
    else if (!nacional) {
      // País cuja copa eu ainda não pesquisei: fica o chaveado antigo, menor, até eu
      // conferir o formato dele. Melhor um torneio simples e honesto do que inventar
      // fases que eu não sei se existem.
      const fortes = this.clubs().filter((c) => c.country === country && c.id !== this.userClubId)
        .sort((a, b) => this.strengthOf(b) - this.strengthOf(a));
      const grandes = fortes.slice(0, 8).map((c) => c.id);
      const resto = shuffle(fortes.slice(8)).slice(0, 12).map((c) => c.id);
      nacional = this._buildCup('nac', [this.userClubId, ...grandes, ...resto],
        COPA_NACIONAL[country] || ('Copa ' + country), country);
    }
    if (nacional) this.cups.push(nacional);

    // Onde existe SEGUNDA copa nacional, ela existe também aqui. O Gustavo lembrou:
    // "na Inglaterra tem a FA Cup e tem também a Carabao Cup, tem duas copas".
    const fmt2 = segundaCopa(country);
    if (fmt2 && fmt !== null && fmt2.nome !== fmt.nome) {
      const segunda = this._buildCupReal('nac2', fmt2, doPais, country, false);
      if (segunda) this.cups.push(segunda);
    }

    // ESTADUAL: no Brasil a temporada abre pelo campeonato do estado, com os clubes
    // da região — de qualquer divisão. É decidido nas primeiras rodadas do calendário.
    if (country === 'Brasil') {
      const uf = estadoDe(this.userClub().name);
      if (uf) {
        const doEstado = this.clubs().filter((c) => estadoDe(c.name) === uf).map((c) => c.id);
        // basta ter dois: no Pará, o estadual é o Re-Pa, e ele merece existir.
        if (doEstado.length >= 2) {
          // Estadual com formato pesquisado (o Paulista tem grupos, não é chaveado)
          // usa o formato de verdade; os que eu ainda não conferi ficam no chaveado
          // simples, que é honesto, em vez de eu copiar o formato do vizinho.
          const nomeEst = nomeDoEstadual(uf);
          const fmtEst = copaEstadual(nomeEst);
          let est = null;
          // O formato real só faz sentido se houver clubes para ele. O jogo tem 12
          // paulistas mas só 5 cariocas e 2 paraenses; com 5 clubes, "Taça Guanabara,
          // Taça Rio e final do estado" vira nome sem conteúdo. Abaixo de 8, o
          // estadual é um chaveado simples — que é honesto.
          // Agora que os 124 clubes brasileiros têm estado, mais estaduais têm gente
          // suficiente: Minas e Goiás chegaram a 8, o Ceará a 7, Santa Catarina,
          // Pernambuco e Mato Grosso a 6. Com 6 já dá para montar o formato real
          // (o montador corta as fases que não cabem); abaixo disso vira chaveado.
          if (fmtEst && doEstado.length >= 6) {
            est = this._buildCupContinental('estadual', fmtEst, doEstado, uf)
              || this._buildCupReal('estadual', fmtEst, doEstado, uf, true);
            if (est) est.sched = est.stages.map((_, k) => Math.max(1,
              Math.floor((0.04 + 0.20 * (est.stages.length <= 1 ? 1 : k / (est.stages.length - 1))) * (this.totalRounds() || 38))));
          }
          this.cups.unshift(est || this._buildCup('estadual', doEstado, nomeEst, uf, true));
        }
      }
    }
  }
  /** Copa continental no formato real: com grupos, ou com a fase de liga nova. */
  /** Espalha as fases das copas para não caírem todas na mesma rodada.
   *
   *  O Gustavo viu, na mesma linha da agenda, "Copa Libertadores: Quartas", "Copa
   *  Sul-Americana: Quartas" e "Copa do Brasil: Quartas" — três jogos decisivos no
   *  mesmo dia, para o mesmo clube. Nenhum calendário de futebol faz isso: as
   *  competições se revezam ao longo da semana e do mês.
   */
  _espalharCalendarioDasCopas() {
    const ocupadas = new Set();
    const total = this.totalRounds() || 38;
    // as copas que começam cedo (estadual) escolhem primeiro, para não serem
    // empurradas para fora da janela delas
    const ordem = this.cupsList().slice().sort((a, b) => (a.sched[0] || 0) - (b.sched[0] || 0));
    for (const cup of ordem) {
      cup.sched = cup.sched.map((r, i) => {
        let alvo = Math.max(1, Math.min(total - 1, r));
        // procura a rodada livre mais perto, andando para os dois lados
        for (let d = 0; d <= total; d++) {
          for (const cand of [alvo + d, alvo - d]) {
            if (cand < 1 || cand >= total || ocupadas.has(cand)) continue;
            // e sem passar por cima da fase anterior desta mesma copa
            if (i > 0 && cand <= cup.sched[i - 1]) continue;
            ocupadas.add(cand); return cand;
          }
        }
        return alvo;
      });
    }
  }

  _buildCupContinental(kind, formato, poolIds, tag) {
    const fases = formato.fases || [];
    // A fase de grupos nem sempre é a primeira: a Libertadores tem duas preliminares
    // antes dela. Procuro a fase que É de grupos (ou a de liga), não a de índice 0.
    const iFase = fases.findIndex((f) => f.tabela_unica || f.grupos);
    // Copa continental que é mata-mata do começo ao fim, sem fase de grupos nem de
    // liga: a Concacaf Champions Cup é assim. Aqui ela caía fora e virava uma copa
    // genérica de 16 começando nas oitavas. O montador de chave das copas nacionais
    // já sabe fazer exatamente isso, com quem entra tarde e tudo.
    if (iFase < 0) return this._buildCupReal(kind, formato, poolIds, tag, false);
    const primeira = fases[iFase];
    const ehLiga = !!primeira.tabela_unica;
    const ehGrupos = !!primeira.grupos;

    // Quantos clubes a competição comporta: o tamanho real, ou o que houver.
    // Quando existem preliminares, a fase de grupos NÃO recebe todo mundo: na
    // Libertadores 28 entram direto e as outras 4 vagas são de quem passou.
    const temPreFase = fases.slice(0, iFase).some((f) => f.clubes >= 2);
    const tamGrupos = ehLiga ? 0 : primeira.grupos * (primeira.por_grupo || 4);
    // Quando o formato não diz quantos entram direto, a conta sai do tamanho do pool:
    // com N clubes e uma fase de grupos de G, entram direto 2G−N e o resto joga a
    // preliminar (que entrega metade). Sem isto a CAF ficava com 16 clubes e os
    // outros 8 do pool não jogavam nada.
    const entramDireto = primeira.entram_aqui != null ? primeira.entram_aqui
      : Math.max(Math.floor(tamGrupos / 2), Math.min(tamGrupos, 2 * tamGrupos - poolIds.length));
    const querem = ehLiga ? (primeira.clubes || 36)
      : (temPreFase ? entramDireto : tamGrupos);
    const ord = poolIds.filter((id) => id !== this.userClubId)
      .sort((a, b) => this.strengthOf(this.clubById(b)) - this.strengthOf(this.clubById(a)));
    const inscrito = poolIds.includes(this.userClubId);
    let tam = Math.min(querem, ord.length + (inscrito ? 1 : 0));
    if (!ehLiga && !temPreFase) tam -= tam % (primeira.por_grupo || 4);  // grupos têm de fechar
    if (tam < 8) return null;

    // FASES PRELIMINARES. A Libertadores não começa na fase de grupos: 6 clubes jogam
    // a primeira fase, 13 entram na segunda e 28 entram direto nos grupos — é assim
    // que ela tem 47 participantes. O jogo pulava tudo isso e começava nos grupos com
    // 28 clubes. Aqui as preliminares são montadas com quem sobrou do pool, dos mais
    // fracos para os mais fortes: quem entra cedo é quem se classificou pior.
    const preFases = fases.slice(0, iFase).filter((f) => f.clubes >= 2);
    let sobrando = ord.slice(tam - (inscrito ? 1 : 0));
    // A Sul-Americana recebe 8 clubes DEPOIS da fase de grupos, no playoff das
    // oitavas (na de verdade são os terceiros dos grupos da Libertadores). Eles saem
    // do fim da fila, os piores colocados, e ficam reservados aqui.
    const seguinteFase = fases[iFase + 1];
    const quantosNoPlayoff = (seguinteFase && /playoff/i.test(seguinteFase.nome || '')
      && seguinteFase.entram_aqui) || 0;
    const doPlayoff = quantosNoPlayoff
      ? sobrando.splice(Math.max(0, sobrando.length - quantosNoPlayoff), quantosNoPlayoff) : [];
    const preEntradas = [];
    let usados = 0;
    for (const f of preFases) {
      const querEntrar = f.entram_aqui != null ? f.entram_aqui : f.clubes;
      const cabe = Math.min(querEntrar, sobrando.length - usados);
      preEntradas.push(cabe > 0 ? sobrando.slice(usados, usados + cabe) : []);
      usados += Math.max(0, cabe);
    }
    // Uma preliminar só existe se der para montar a chave dela até a fase de grupos.
    // Se não sobrou gente, a copa começa nos grupos, como começava antes.
    const temPre = preEntradas.length > 0 && preEntradas[0].length >= 2;

    const escolhidos = ord.slice(0, tam - (inscrito ? 1 : 0));
    const times = shuffle(inscrito ? [this.userClubId, ...escolhidos] : escolhidos);

    // Quantos saem da primeira fase para o mata-mata.
    // O mata-mata precisa de uma potência de 2, senão aparecem "Fase de 7" e
    // "Fase de 3", que não existem em lugar nenhum. Sete grupos dão 14 classificados;
    // vão os 8 melhores entre eles, e os outros caem — como acontece de verdade
    // quando sobram vagas de menos.
    // Quantos clubes a fase de grupos tem DE VERDADE: os que entram direto mais os que
    // chegam das preliminares. Usando só `times` a Libertadores contava 28 em vez de
    // 32, avançavam 8 em vez de 16 e as OITAVAS sumiam da competição.
    const naFaseDeGrupos = ehLiga ? times.length
      : Math.max(times.length, primeira.grupos * (primeira.por_grupo || 4));
    const brutos = ehLiga
      ? Math.min(16, Math.max(8, Math.floor(times.length / 2)))
      : (primeira.avancam_por_grupo || 2) * Math.ceil(naFaseDeGrupos / (primeira.por_grupo || 4));
    let avancam = 2;
    while (avancam * 2 <= brutos) avancam *= 2;

    // A Champions e a Liga Europa têm uma fase a mais que ninguém mais tem: do 9º ao
    // 24º da tabela jogam um PLAYOFF, e só os 8 primeiros vão direto às oitavas. O
    // jogo passava 16 direto da fase de liga para as oitavas e essa fase não existia.
    // O playoff vem logo DEPOIS da fase de grupos (ou da fase de liga), não na posição
    // 1 do arquivo — na Sul-Americana a fase de grupos é a segunda, então o playoff é
    // a terceira. Procurando pelo índice fixo, o playoff dela nunca era encontrado.
    const seguinte = fases[iFase + 1];
    const playoff = (seguinte && /playoff/i.test(seguinte.nome || '') && seguinte.clubes)
      ? seguinte : null;
    // Quantos passam direto: os que vão às oitavas sem jogar o playoff.
    const direto = playoff ? Math.max(0, avancam - playoff.clubes / 2) : 0;
    if (playoff && direto > 0) avancam = direto + playoff.clubes;

    // O mata-mata depois da primeira fase: vai partindo pela metade até a Final.
    // O nome sai do tamanho, que é como o futebol chama mesmo — 16 são as oitavas.
    const nomes = [primeira.nome || (ehLiga ? 'Fase de liga' : 'Fase de grupos')];
    const idaVolta = [false];
    if (playoff && direto > 0) { nomes.push(playoff.nome); idaVolta.push(!!playoff.ida_volta); }
    const nomeDoTamanho = { 2: 'Final', 4: 'Semifinal', 8: 'Quartas', 16: 'Oitavas', 32: 'Fase de 32' };
    // o ida-e-volta de cada tamanho vem da fase real de mesmo nome
    const porNome = new Map(fases.map((f) => [f.nome, f]));
    // Depois do playoff a chave tem os 8 que passaram direto mais os 8 que venceram:
    // 16, as oitavas. Sem isso os nomes saíam de 24 e viravam "Fase de 12" e "Fase de 3".
    let restam = (playoff && direto > 0) ? direto * 2 : avancam;
    while (restam >= 2) {
      const nm = nomeDoTamanho[restam] || `Fase de ${restam}`;
      nomes.push(nm);
      const real = porNome.get(nm);
      // a final da Libertadores e da Sul-Americana é jogo único; a da CAF é ida e volta
      idaVolta.push(real ? !!real.ida_volta : restam > 2);
      restam = Math.floor(restam / 2);
    }

    // AS PRELIMINARES ENTRAM NA FRENTE. A fase de grupos deixa de ser a fase 0 e passa
    // a ser a fase `iGrupos`; quem entra em cada preliminar já está separado acima.
    // A conta tem de fechar: a última preliminar precisa entregar exatamente as vagas
    // que faltam para a fase de grupos (4 na Libertadores).
    const vagasNosGrupos = (ehLiga ? (primeira.clubes || 36)
      : primeira.grupos * (primeira.por_grupo || 4)) - times.length;
    const preNomes = [], preIdaVolta = [], preEntradasOk = [], preByes = [];
    if (temPre && vagasNosGrupos >= 1) {
      // De trás para frente: a última preliminar tem de sair com `vagasNosGrupos`.
      const tamanhos = new Array(preEntradas.length).fill(0);
      let precisaSair = vagasNosGrupos;
      for (let i = preEntradas.length - 1; i >= 0; i--) {
        tamanhos[i] = precisaSair * 2;
        precisaSair = tamanhos[i] - preEntradas[i].length;
        if (precisaSair < 0) precisaSair = 0;
      }
      // agora, para a frente, ajusta quem entra em cada uma para o tamanho fechar
      let vindo = 0;
      for (let i = 0; i < preEntradas.length; i++) {
        const cabem = Math.max(0, tamanhos[i] - vindo);
        const usa = preEntradas[i].slice(0, cabem);
        preEntradasOk.push(usa);
        const naFase = vindo + usa.length;
        preByes.push(Math.max(0, tamanhos[i] - naFase));
        vindo = Math.floor(naFase / 2);
        preNomes.push(preFases[i].nome || `Fase ${i + 1}`);
        preIdaVolta.push(!!preFases[i].ida_volta);
      }
      // quem sobrou sem lugar entra na primeira preliminar
      const usados2 = new Set(preEntradasOk.flat());
      const sobrou = preEntradas.flat().filter((id) => !usados2.has(id));
      if (sobrou.length && preEntradasOk.length) preEntradasOk[0].push(...sobrou);
    }
    const iGrupos = preNomes.length;
    const stages = [...preNomes, ...nomes];
    const idaVoltaAll = [...preIdaVolta, ...idaVolta];
    const entradas = [...preEntradasOk, times, ...nomes.slice(1).map(() => [])];
    // e os reservados entram na fase do playoff, que é a logo depois da de grupos
    if (doPlayoff.length && playoff) entradas[iGrupos + 1] = doPlayoff;
    const byesAll = [...preByes, ...nomes.map((_, i) =>
      (i === 1 && playoff && direto > 0 ? direto : 0))];

    const total = this.totalRounds() || 38, n = stages.length;
    const sched = stages.map((_, k) => Math.max(1, Math.floor((0.10 + 0.84 * (n <= 1 ? 1 : k / (n - 1))) * total)));

    // Em que fase VOCÊ entra. Sem isto a tela dizia que o Palmeiras estava "eliminado"
    // da Libertadores na primeira fase — ele não joga a primeira fase, ele entra
    // direto na fase de grupos.
    const entraDoUsuario = Math.max(0,
      entradas.findIndex((e) => e && e.includes(this.userClubId)));

    return { kind, name: formato.nome, tag, stage: 0, stages, idaVolta: idaVoltaAll,
      alive: (entradas[0] || times).slice(), results: [], winner: null, sched, formatoReal: true,
      entraDoUsuario,
      detalhe: formato.detalhe || '', totalClubes: entradas.reduce((a, e) => a + e.length, 0),
      entradas, iGrupos,
      // quantos passam direto em cada fase: só o playoff tem, e são os 8 primeiros
      byesNoPlayoff: playoff && direto > 0 ? direto : 0,
      byes: byesAll,
      formatoFase: { tipo: ehLiga ? 'liga' : 'grupos',
        jogos: primeira.jogos_por_clube || 8, avancam,
        por_grupo: primeira.por_grupo || 4,
        avancam_por_grupo: primeira.avancam_por_grupo || 2,
        ida_volta: !!primeira.ida_volta } };
  }

  /** Monta uma copa SEGUINDO O FORMATO REAL dela (tools/copas.json).
   *
   *  O Gustavo: "não faz sentido eu começar nas oitavas um campeonato, a Copa do
   *  Brasil é um campeonato gigantesco e todos os times do Brasil deveriam ter
   *  oportunidade de jogar". Ele tem razão: a de verdade tem 126 clubes e SETE
   *  fases, e o jogo montava um chaveado de 16 que já começava nas oitavas. O
   *  Brasil aqui dentro tem 124 clubes somando Série A, B, C e D — dá para fazer
   *  quase a coisa real.
   *
   *  O método: descobrir quantos clubes ENTRAM em cada fase no formato de verdade
   *  (numa fase de 32 que vem de uma de 40, 20 são sobreviventes e 12 são gente
   *  nova), reduzir tudo pela mesma proporção até caber no que existe, e remontar.
   *  Assim a estrutura é preservada: o número de fases, quem entra tarde e o que é
   *  ida e volta. Um clube da Libertadores continua entrando nas oitavas — o que
   *  muda é que agora existem as seis fases antes dele.
   */
  _buildCupReal(kind, formato, candidatos, tag, cedo) {
    const reais = (formato.fases || []).filter((f) => !f.tabela_unica && f.clubes >= 2);
    if (reais.length < 2 || candidatos.length < 4) return null;

    // Quanta gente NOVA entra em cada fase no formato de verdade.
    const novosReais = reais.map((f, i) =>
      i === 0 ? f.clubes : Math.max(0, f.clubes - Math.floor(reais[i - 1].clubes / 2)));
    const somaReal = novosReais.reduce((a, b) => a + b, 0) || 1;
    const fator = candidatos.length / somaReal;

    // Remonta a chave no tamanho que cabe, DE TRÁS PARA FRENTE — a partir da final.
    //
    // A versão anterior montava do começo para o fim e arredondava o tamanho de cada
    // fase para par. Só que arredondar para cima inventa uma vaga que ninguém ocupa:
    // a DFB-Pokal saía com a chave 66 > 34 > 18 > 10 > 6 > 2, e como não entrava
    // clube novo em fase nenhuma, o que rodava de verdade era 66 > 33 > 17 > 9 > 5 >
    // 3. Em toda fase sobrava um clube passando de graça, e a FINAL era jogada com
    // TRÊS times: o Bayern ganhou do Wolfsburg e depois teve de ganhar de novo, do
    // Unterhaching, que já tinha sido eliminado na segunda fase.
    //
    // Indo de trás para frente o número de sobreviventes é exato: uma fase é sempre
    // o dobro dos que sobrevivem dela, mais quem entra na hora.
    let novos = novosReais.map((n) => Math.round(n * fator));
    const chave = new Array(reais.length).fill(0);
    const entraNaFase = new Array(reais.length).fill(0);
    chave[reais.length - 1] = 2;                        // a final é sempre de dois
    for (let i = reais.length - 1; i > 0; i--) {
      // Quem chega a esta fase vindo da anterior. No máximo METADE da fase pode ser
      // gente nova: se entrasse mais, a fase anterior sairia menor que esta e a
      // chave crescia em vez de diminuir — a Coppa Italia estava saindo
      // 2 > 4 > 2 > 16 > 8 > 4 > 2.
      const podeEntrar = Math.min(novos[i], Math.floor(chave[i] / 2));
      const sobrev = chave[i] - podeEntrar;
      entraNaFase[i] = podeEntrar;
      chave[i - 1] = sobrev * 2;
    }
    entraNaFase[0] = chave[0];
    // Não pode chamar mais clube do que existe: encolhe a chave pela frente até caber.
    while (chave.length > 2 &&
           entraNaFase.reduce((a, b) => a + b, 0) > candidatos.length) {
      chave.shift(); entraNaFase.shift(); novos = novos.slice(1);
      entraNaFase[0] = chave[0];
    }
    // corta as fases da frente que ficaram sem gente nova nenhuma
    while (chave.length > 2 && entraNaFase[0] === 0) { chave.shift(); entraNaFase.shift(); }
    // e as do FIM que já chegaram a dois clubes: a FA Cup estava saindo com
    // "Quartas > Semifinal > Final" todas com 2 clubes, ou seja, três finais.
    // ...mas só se ninguém NOVO entra na última. A Copa Intercontinental é uma escada
    // em que toda fase tem dois clubes — um que vem ganhando e um que entra ali, e o
    // campeão da Champions entra direto na final. Cortando por tamanho, ela sumia.
    while (chave.length > 1 && chave[chave.length - 2] <= 2
           && !entraNaFase[chave.length - 1]) { chave.pop(); entraNaFase.pop(); }
    if (chave.length < 2) return null;

    // FASE PRELIMINAR: TODO CLUBE DO PAÍS JOGA A COPA.
    //
    // A chave é de potências de dois, mas o país quase nunca tem um número redondo de
    // clubes. Antes o que sobrava ficava de fora, e sobrava MUITO: a Coppa Italia
    // usava 56 dos 100 clubes italianos e a Copa do Brasil 80 dos 124. O Gustavo tem
    // razão de reclamar — na Itália e na Inglaterra todo mundo entra na copa.
    //
    // A saída é a mesma do futebol de verdade: uma rodada preliminar antes da chave.
    // Com 124 clubes e uma primeira fase de 64, jogam 60 confrontos (120 clubes) e os
    // 4 restantes passam direto — dá 64 exatos para a fase seguinte. Quem joga a
    // preliminar são os mais fracos, que é como funciona: o amador entra antes.
    // Quem entra em fase adiantada (na Copa do Brasil os grandes entram na 3ª) já está
    // contado; o resto tem de caber entre a 1ª fase e a preliminar.
    const tardios = entraNaFase.slice(1).reduce((a, b) => a + b, 0);
    let disponivel = candidatos.length - tardios;
    // Uma rodada preliminar só consegue cortar até METADE: com 76 clubes para uma
    // primeira fase de 32 não há jeito. Nesse caso a chave ganha uma fase na frente,
    // dobrando de tamanho, até o excedente caber numa rodada só. É por isso que a
    // Coppa Italia aqui tem mais fases que a de verdade: a de verdade tem 44 clubes
    // e a Itália deste jogo tem 100.
    let guarda = 0;
    while (disponivel > 2 * chave[0] && guarda++ < 8) {
      chave.unshift(chave[0] * 2);
      entraNaFase.unshift(chave[0]);
      // a fase que ficou logo atrás passa a receber só sobreviventes: quem entrava
      // nela agora entra na fase nova. Sem isto a Coppa Italia somava 32 novos com
      // 32 sobreviventes numa fase de 32, e 32 clubes sumiam.
      entraNaFase[1] = 0;
    }
    const sobra = disponivel - chave[0];
    let preliminar = 0;
    if (sobra > 0) {
      preliminar = disponivel;            // TODO clube que ainda não entrou joga aqui
      chave.unshift(preliminar);
      entraNaFase.unshift(disponivel);
      // A fase logo depois da preliminar recebe SÓ quem sobreviveu a ela. Sem isto a
      // Copa do Brasil somava os 64 da 1ª fase com os 64 que vinham da preliminar.
      entraNaFase[1] = 0;
    }
    const desloc = reais.length - chave.length;
    const nomes = chave.map((_, i) => (reais[desloc + i] || {}).nome || `Fase ${i + 1}`);
    const idaVolta = chave.map((_, i) => !!(reais[desloc + i] || {}).ida_volta);
    if (preliminar) { nomes[0] = 'Fase preliminar'; idaVolta[0] = false; }

    // Quantos, em cada fase, passam direto sem jogar. Só a preliminar tem: os que
    // entram nela são o excedente, e o resto da fase espera na próxima rodada.
    // Na preliminar joga o excedente: `sobra` confrontos, ou seja `sobra*2` clubes.
    // Os outros passam direto e esperam na fase seguinte.
    const byes = chave.map(() => 0);
    if (preliminar) byes[0] = 2 * chave[1] - chave[0];

    // QUEM ENTRA QUANDO: os mais fracos abrem a competição, os mais fortes entram
    // tarde. É o que faz o time da Série D jogar a primeira fase e o grande aparecer
    // só lá na frente.
    // Preencho da ÚLTIMA fase de entrada para a PRIMEIRA, com os mais fortes na
    // frente. Assim o grande entra tarde e o pequeno abre a copa — e quem sobra,
    // quando há mais clube do que vaga, é o mais fraco. Fazendo na ordem direta os
    // 44 clubes MAIS FORTES do Brasil ficavam de fora da Copa do Brasil.
    const doForte = candidatos.slice()
      .sort((a, b) => this.strengthOf(this.clubById(b)) - this.strengthOf(this.clubById(a)));
    const entradas = chave.map(() => []);
    let cursor = 0;
    for (let f = chave.length - 1; f >= 0; f--)
      for (let k = 0; k < entraNaFase[f] && cursor < doForte.length; k++)
        entradas[f].push(doForte[cursor++]);
    const deFora = doForte.length - cursor;

    const entraEm = new Map();
    entradas.forEach((ids, f) => ids.forEach((id) => entraEm.set(id, f)));

    const total = this.totalRounds() || 38, n = chave.length;
    const ini = cedo ? 0.04 : 0.14, fim = cedo ? 0.24 : 0.94;
    const sched = chave.map((_, k) => Math.max(1,
      Math.floor((ini + (fim - ini) * (n <= 1 ? 1 : k / (n - 1))) * total)));

    return { kind, name: formato.nome, tag, stage: 0, stages: nomes, idaVolta,
      alive: shuffle(entradas[0].slice()), entradas, chave, byes,
      entraDoUsuario: entraEm.has(this.userClubId) ? entraEm.get(this.userClubId) : 0,
      results: [], winner: null, sched, formatoReal: true,
      detalhe: formato.detalhe || '', totalClubes: candidatos.length };
  }

  _buildCup(kind, poolIds, name, tag, cedo, porForca) {
    // `porForca`: nas copas CONTINENTAIS entram os melhores, não um sorteio. Sorteando
    // entre os ~150 classificados do continente, a Champions saía sem PSG e sem
    // Barcelona e com o Newport County dentro. Na copa NACIONAL o sorteio fica, porque
    // ali a zebra é parte da graça.
    const inscrito = poolIds.includes(this.userClubId);
    let ids = [...new Set(poolIds)].filter((id) => id !== this.userClubId);
    const teto = porForca ? 32 : 16;
    let size = teto; while (size > ids.length + (inscrito ? 1 : 0)) size = size / 2;
    if (size < 2) size = 2;
    const vagas = size - (inscrito ? 1 : 0);
    const escolhidos = porForca
      ? ids.slice().sort((a, b) => this.strengthOf(this.clubById(b)) - this.strengthOf(this.clubById(a))).slice(0, vagas)
      : shuffle(ids).slice(0, vagas);
    // o usuário só entra se REALMENTE se classificou — antes ele era enfiado em toda
    // copa, e por isso o Napoli aparecia na Champions e na Liga Europa ao mesmo tempo
    const teams = shuffle(inscrito ? [this.userClubId, ...escolhidos] : escolhidos);
    const map = { 2: ['Final'], 4: ['Semifinal', 'Final'], 8: ['Quartas', 'Semifinal', 'Final'], 16: ['Oitavas', 'Quartas', 'Semifinal', 'Final'], 32: ['Fase de 32', 'Oitavas', 'Quartas', 'Semifinal', 'Final'] };
    const stages = map[size] || ['Final'];
    const total = this.totalRounds() || 38, n = stages.length;
    // o estadual acontece no começo do ano; as outras copas se espalham pela temporada
    const ini = cedo ? 0.04 : 0.2, fim = cedo ? 0.22 : 0.9;
    const sched = stages.map((_, i) => Math.max(1,
      Math.floor((ini + (fim - ini) * (n <= 1 ? 1 : i / (n - 1))) * total)));
    // `totalClubes` faltava aqui, e a tela de copas mostrava "undefined clubes na
    // disputa" em todo estadual pequeno.
    return { kind, name, tag, stage: 0, stages, alive: teams, results: [], winner: null, sched,
      totalClubes: teams.length, idaVolta: stages.map(() => false) };
  }
  cupsList() { return this.cups || []; }

  /** Os 32 do Mundial de Clubes, respeitando as vagas de cada confederação:
   *  12 da UEFA, 6 da CONMEBOL, 4 da CAF, da AFC e da CONCACAF, 1 da Oceania e 1 do
   *  país-sede. Dentro de cada confederação entram os melhores colocados. */
  _poolDoMundial(mun) {
    const paisesDe = {};
    for (const c of this.clubs()) {
      const k = CONTINENT[c.country];
      if (k) (paisesDe[k] = paisesDe[k] || new Set()).add(c.country);
    }
    const ids = [];
    let sobrando = 0;
    for (const [conf, vagas] of Object.entries(mun.vagas_por_continente || {})) {
      const paises = [...(paisesDe[conf] || [])];
      // A Oceania e o país-sede não existem como confederação aqui: essas vagas
      // sobram e vão para quem ficou logo atrás, para o Mundial ter 32 mesmo assim.
      if (!paises.length) { sobrando += vagas; continue; }
      const fila = [];
      for (const pais of paises) {
        const cp = this.competitions().find((c) => c.country === pais && c.tier === 1);
        if (cp) this._classificacaoAnterior(cp).forEach((r, i) => fila.push({ id: r.id, pos: i }));
      }
      fila.sort((a, b) => a.pos - b.pos);
      let postos = 0;
      for (const f of fila) {
        if (postos >= vagas) break;
        if (ids.includes(f.id)) continue;
        ids.push(f.id); postos++;
      }
      sobrando += vagas - postos;
    }
    if (sobrando > 0) {
      const fila = [];
      for (const cp of this.competitions()) {
        if (cp.tier !== 1 || !CONTINENT[cp.country]) continue;
        this._classificacaoAnterior(cp).forEach((r, i) => fila.push({ id: r.id, pos: i }));
      }
      fila.sort((a, b) => a.pos - b.pos);
      for (const f of fila) {
        if (sobrando <= 0) break;
        if (ids.includes(f.id)) continue;
        ids.push(f.id); sobrando--;
      }
    }
    return ids;
  }

  /** Os seis campeões continentais, para a Copa Intercontinental. */
  _campeoesContinentais() {
    const ids = [];
    for (const conf of ['UEFA', 'CONMEBOL', 'CONCACAF', 'AFC', 'CAF', 'OFC']) {
      const c = copasDoContinente(conf)[0];
      if (!c) continue;
      const paises = [...new Set(this.clubs()
        .filter((x) => CONTINENT[x.country] === conf).map((x) => x.country))];
      const algum = this.competitions().find((cp) => paises.includes(cp.country) && cp.tier === 1);
      const id = this._campeaoDe(c.nome, algum, 0);
      if (id && !ids.includes(id)) ids.push(id);
    }
    return ids;
  }

  /** Quem ganhou aquilo na temporada passada. Na primeira temporada ainda não houve
   *  nada, então vale a tabela simulada do ano anterior — o 1º é o campeão da liga e
   *  o 2º faz as vezes de campeão da copa, que é como a supercopa se monta. */
  _campeaoDe(chave, fallbackComp, posicao = 0) {
    const guardado = this.campeoes && this.campeoes[chave];
    if (guardado && this.clubById(guardado)) return guardado;
    if (!fallbackComp) return null;
    const tab = this._classificacaoAnterior(fallbackComp);
    return tab && tab[posicao] ? tab[posicao].id : null;
  }

  /** Supercopa: dois (ou quatro) campeões, uma partida (ou semifinal e final).
   *  Não passa pelo montador de chave das copas normais porque ali a competição
   *  precisa de pelo menos duas fases e um pool grande. */
  _buildSupercopa(kind, formato, ids, tag) {
    const times = ids.filter((id, i, a) => id && this.clubById(id) && a.indexOf(id) === i);
    if (times.length < 2) return null;
    const quatro = (formato.entram || 2) >= 4 && times.length >= 4;
    const usados = quatro ? times.slice(0, 4) : times.slice(0, 2);
    const stages = quatro ? ['Semifinal', 'Final'] : ['Final'];
    const idaVolta = quatro ? [false, false]
      : [!!(formato.fases && formato.fases[0] && formato.fases[0].ida_volta)];
    const total = this.totalRounds() || 38;
    // A supercopa abre a temporada: ela é jogada nas primeiras rodadas.
    const sched = stages.map((_, k) => Math.max(1, 2 + k * 2));
    return { kind, name: formato.nome, tag, stage: 0, stages, idaVolta,
      alive: shuffle(usados.slice()), entradas: [usados.slice(), ...stages.slice(1).map(() => [])],
      byes: stages.map(() => 0), chave: quatro ? [4, 2] : [2],
      results: [], winner: null, sched, formatoReal: true, ehSupercopa: true,
      entraDoUsuario: 0,
      detalhe: formato.detalhe || '', totalClubes: usados.length };
  }
  cupUserAlive(cup) { return cup && !cup.winner && cup.alive.includes(this.userClubId); }

  /** EM QUE PÉ VOCÊ ESTÁ NESTA COPA.
   *
   *  'alive' sozinho não serve para responder isso: na Libertadores você entra na
   *  fase de grupos e na Copa do Brasil na terceira fase, então no começo da
   *  temporada você está INSCRITO mas fora de 'alive' — e a tela chamava isso de
   *  "eliminado". O Gustavo, no primeiro dia de carreira: "já tá falando que eu
   *  estou eliminado da Libertadores e da Copa do Brasil, sendo que nem joguei".
   */
  cupUserSituacao(cup) {
    if (!cup) return null;
    if (cup.winner) return cup.winner === this.userClubId ? 'campeao' : 'eliminado';
    if (cup.alive.includes(this.userClubId)) return 'vivo';
    // ainda vai entrar? procura o seu clube numa entrada de fase que não chegou
    if (cup.entradas) {
      for (let f = 0; f < cup.entradas.length; f++) {
        if ((cup.entradas[f] || []).includes(this.userClubId)) {
          return f > cup.stage ? 'entra' : 'eliminado';
        }
      }
    }
    return 'eliminado';
  }

  /** Em que fase você entra nesta copa (texto curto para a tela). */
  cupFaseDeEntrada(cup) {
    if (!cup || !cup.entradas) return null;
    for (let f = 0; f < cup.entradas.length; f++) {
      if ((cup.entradas[f] || []).includes(this.userClubId)) return cup.stages[f] || null;
    }
    return null;
  }
  userInCupFinalOf(cup) { return cup && !cup.winner && cup.alive.length === 2 && cup.alive.includes(this.userClubId); }
  _cupSim(aId, bId, nomeDaCopa) {
    const A = this.clubById(aId), B = this.clubById(bId);
    let ga = poisson(expectedGoals(this.strengthOf(A), this.tacticOf(A), this.strengthOf(B), this.tacticOf(B), 0));
    let gb = poisson(expectedGoals(this.strengthOf(B), this.tacticOf(B), this.strengthOf(A), this.tacticOf(A), 0));
    let pen = null, penA = 0, penB = 0;
    if (ga === gb) {
      penA = 3 + Math.floor(Math.random() * 3);
      penB = penA - 1 - Math.floor(Math.random() * 2);
      if (Math.random() < 0.5) { const t2 = penA; penA = penB; penB = t2; }
      pen = penA > penB ? 'a' : 'b';
    }
    // Se o jogador DIRIGIU este confronto, o placar é o que aconteceu em campo, não
    // um sorteio. É o que permite jogar a semifinal do Paulista minuto a minuto.
    if (this._placarDoUsuario && (aId === this.userClubId || bId === this.userClubId)) {
      const meu = this._placarDoUsuario;
      if (aId === this.userClubId) { ga = meu.meus; gb = meu.deles; } else { gb = meu.meus; ga = meu.deles; }
      pen = null; penA = 0; penB = 0;
      if (ga === gb) { pen = meu.penaltis === 'eu' ? (aId === this.userClubId ? 'a' : 'b')
        : (aId === this.userClubId ? 'b' : 'a'); }
      this._placarDoUsuario = null;
    }
    const win = ga > gb || pen === 'a' ? aId : bId;
    // QUEM FEZ OS GOLS. Jogo de copa não dava gol a jogador nenhum — por isso a
    // artilharia só tinha a liga. Aqui o gol vira gol de alguém pelo menos no SEU
    // clube, que é de quem o jogo guarda a ficha inteira.
    const lixo = [];
    // Os gols de copa agora têm autor nos DOIS lados — sem isso a artilharia de uma
    // copa só teria os jogadores do seu clube, e o Gustavo quer ver a artilharia do
    // Paulistão inteira.
    this._attribute(A, aId === this.userClubId ? this._availLineup() : null, Math.floor(ga), lixo, 'x', this.tacticOf(A), nomeDaCopa);
    this._attribute(B, bId === this.userClubId ? this._availLineup() : null, Math.floor(gb), lixo, 'x', this.tacticOf(B), nomeDaCopa);
    return { a: aId, b: bId, ga: Math.floor(ga), gb: Math.floor(gb), pen, penA, penB, win };
  }
  /** FASE DE GRUPOS e FASE DE LIGA.
   *
   *  O Gustavo: "campeonatos diferentes precisa ser jogado diferente". Até aqui toda
   *  copa do jogo era mata-mata, e por isso a Libertadores não tinha os grupos e a
   *  Champions não tinha a fase de liga (que substituiu os grupos em 2024-25: 36
   *  clubes numa tabela só, oito jogos cada, contra adversários diferentes).
   *
   *  As duas coisas são a mesma máquina com uma diferença: nos grupos você só joga
   *  contra os do seu grupo e passam os melhores DE CADA grupo; na liga é uma tabela
   *  só e passam os melhores do geral.
   */
  /** UMA RODADA POR DIA. O Gustavo: "fase de grupos não se decide em um jogo".
   *  A fase inteira acontecia num dia só; agora o calendário dela é montado uma vez
   *  e cada dia da agenda joga a rodada seguinte, com a classificação atualizando. */
  /** O CALENDÁRIO DE UM GRUPO: rodízio clássico, uma rodada por dia.
   *
   *  Estava escrito dentro de _jogarFaseDeGrupos, que só roda na hora de JOGAR.
   *  Por isso não dava para saber contra quem você jogaria antes do apito — e
   *  foi daí que veio o bug do Paulista: sem adversário de copa, o jogo caía no
   *  adversário da LIGA e mexia na tabela do Brasileirão.
   */
  _rodiziosDoGrupo(grupos, idaVolta) {
    const rodadas = [];
    const turnos = idaVolta ? 2 : 1;
    for (let t = 0; t < turnos; t++) {
      const base = grupos.map((g) => (g.length % 2 ? g.concat([-1]) : g.slice()));
      const nR = (base[0] ? base[0].length : 2) - 1;
      for (let r = 0; r < nR; r++) {
        const daRodada = [];
        base.forEach((g) => {
          const n2 = g.length;
          for (let i = 0; i < n2 / 2; i++) {
            const a = g[i], b = g[n2 - 1 - i];
            if (a === -1 || b === -1) continue;
            const casa = (r + t) % 2 === 0;
            daRodada.push(casa ? [a, b] : [b, a]);
          }
          g.splice(1, 0, g.pop());
        });
        rodadas.push(daRodada);
      }
    }
    return rodadas;
  }

  /** Sorteia o grupo e monta o calendário SEM jogar nada.
   *  Serve para a tela saber contra quem você joga hoje antes de a bola rolar. */
  _prepararGrupo(cup) {
    const f = cup.formatoFase;
    if (!f || f.tipo === 'liga') return null;
    if (cup._grupoEstado && cup._grupoEstado.fase === cup.stage) return cup._grupoEstado;
    this._entrarNaFase(cup);
    const ids = cup.alive.slice();
    if (ids.length < 2) return null;
    const porGrupo = f.por_grupo || 4;
    const emb = shuffle(ids);
    const grupos = [];
    for (let i = 0; i < emb.length; i += porGrupo) grupos.push(emb.slice(i, i + porGrupo));
    cup._grupoEstado = {
      fase: cup.stage, grupos, i: 0, meus: [],
      rodadas: this._rodiziosDoGrupo(grupos, f.ida_volta),
      tab: ids.map((id) => ({ id, pts: 0, j: 0, gp: 0, gc: 0 })),
    };
    return cup._grupoEstado;
  }

  _jogarFaseDeGrupos(cup) {
    const f = cup.formatoFase;
    const ids = cup.alive.slice();
    const estado = cup._grupoEstado && cup._grupoEstado.fase === cup.stage ? cup._grupoEstado : null;
    const tab = estado ? new Map(estado.tab.map((r) => [r.id, r]))
      : new Map(ids.map((id) => [id, { id, pts: 0, j: 0, gp: 0, gc: 0 }]));
    const jogo = (a, b) => {
      const A = this.clubById(a), B = this.clubById(b);
      let ga = poisson(expectedGoals(this.strengthOf(A), this.tacticOf(A), this.strengthOf(B), this.tacticOf(B), 3));
      let gb = poisson(expectedGoals(this.strengthOf(B), this.tacticOf(B), this.strengthOf(A), this.tacticOf(A), 0));
      // O PLACAR QUE VOCÊ FEZ EM CAMPO. No mata-mata isso já valia; na fase de
      // grupos o jogo era sorteado de novo e o que você fez ao vivo era jogado
      // fora.
      if (this._placarDoUsuario && (a === this.userClubId || b === this.userClubId)) {
        const meu = this._placarDoUsuario;
        if (a === this.userClubId) { ga = meu.meus; gb = meu.deles; }
        else { gb = meu.meus; ga = meu.deles; }
        this._placarDoUsuario = null;
      }
      this._attribute(A, a === this.userClubId ? this._availLineup() : null, ga, [], 'x', this.tacticOf(A), cup.name);
      this._attribute(B, b === this.userClubId ? this._availLineup() : null, gb, [], 'x', this.tacticOf(B), cup.name);
      const ra = tab.get(a), rb = tab.get(b);
      ra.j++; rb.j++; ra.gp += ga; ra.gc += gb; rb.gp += gb; rb.gc += ga;
      if (ga > gb) ra.pts += 3; else if (gb > ga) rb.pts += 3; else { ra.pts++; rb.pts++; }
      return { a, b, ga, gb };
    };
    const ordena = (x, y) => y.pts - x.pts || (y.gp - y.gc) - (x.gp - x.gc) || y.gp - x.gp;
    const jogos = [];
    const jogosDoUsuario = (lista) => lista.filter((j) => j.a === this.userClubId || j.b === this.userClubId)
      .map((j) => (j.a === this.userClubId
        ? { casa: true, adv: j.b, meus: j.ga, deles: j.gb }
        : { casa: false, adv: j.a, meus: j.gb, deles: j.ga }));

    if (f.tipo === 'liga') {
      // Tabela única: cada clube pega N adversários diferentes, metade em casa.
      const n = Math.min(f.jogos || 8, ids.length - 1);
      // Rodízio: monto o calendário de todos-contra-todos e fico com as n primeiras
      // rodadas. Assim TODO clube joga exatamente n partidas, cada uma contra um
      // adversário diferente — que é o que a fase de liga é.
      //
      // A primeira versão emparelhava na base do "vai pegando quem ainda não jogou",
      // e isso encalha: os dois últimos com vaga já tinham se enfrentado, e sobravam
      // clubes com 7 jogos numa fase de 8.
      const paisDe = (id) => { const c = this.clubById(id); return c ? c.country : '?'; };
      // Clube não enfrenta CONTERRÂNEO na fase de liga — é regra da Champions, e o
      // Ajax estava caindo contra PSV e AZ Alkmaar dentro dela.
      //
      // A agenda é montada ANTES de simular. A troca de adversário só consegue olhar
      // para a frente, então de vez em quando ela não tem com quem trocar e um par de
      // conterrâneos escapava (falhava em cerca de 1 sorteio a cada 30). Quando isso
      // acontece, o sorteio inteiro é refeito em vez de deixar passar.
      const montaAgenda = () => {
        const roda = shuffle(ids.slice());
        if (roda.length % 2) roda.push(-1);                // ímpar: alguém folga
        const m2 = roda.length;
        const agenda = [];
        for (let r = 0; r < n; r++) {
          for (let i = 0; i < m2 / 2; i++) {
            let a = roda[i], b = roda[m2 - 1 - i];
            if (a === -1 || b === -1) continue;
            if (paisDe(a) === paisDe(b)) {
              // Troca o adversário com o de um par AINDA NÃO JOGADO nesta rodada.
              // Mexer num par já processado fazia o clube jogar duas vezes na mesma
              // rodada: a conta saía com times de 7, 9 e até 10 jogos numa fase de 8.
              let trocou = false;
              for (let k = i + 1; k < m2 / 2; k++) {
                const b2 = roda[m2 - 1 - k], a2 = roda[k];
                if (b2 === -1 || a2 === -1) continue;
                if (paisDe(a) !== paisDe(b2) && paisDe(a2) !== paisDe(b)) {
                  roda[m2 - 1 - i] = b2; roda[m2 - 1 - k] = b;
                  b = b2; trocou = true; break;
                }
              }
              if (!trocou) return null;                    // sorteio impossível: refaz
            }
            // manda quem está do lado de casa nesta rodada, alternando
            agenda.push(r % 2 === 0 ? [a, b] : [b, a]);
          }
          roda.splice(1, 0, roda.pop());                   // gira, menos o primeiro
        }
        return agenda;
      };
      // o calendário é montado UMA vez e guardado; cada dia joga uma rodada
      let agenda = estado ? estado.rodadas : null;
      if (!agenda) {
        let plano = null;
        for (let tent = 0; tent < 80 && !plano; tent++) plano = montaAgenda();
        const porRodada = Math.max(1, Math.floor(ids.length / 2));
        agenda = [];
        for (let i = 0; plano && i < plano.length; i += porRodada) agenda.push(plano.slice(i, i + porRodada));
      }
      const iRodada = estado ? estado.i : 0;
      for (const [a, b] of (agenda[iRodada] || [])) jogos.push(jogo(a, b));
      cup._grupoEstado = { fase: cup.stage, rodadas: agenda, i: iRodada + 1,
        tab: [...tab.values()], grupos: estado ? estado.grupos : null,
        meus: (estado && estado.meus ? estado.meus : []).concat(jogosDoUsuario(jogos)) };
      if (iRodada + 1 < agenda.length) {
        cup.tabelaFase = [...tab.values()].sort(ordena);
        cup.grupos = null;
        const meusAgora = jogos.filter((j) => j.a === this.userClubId || j.b === this.userClubId)
          .map((j) => (j.a === this.userClubId
            ? { casa: true, adv: j.b, meus: j.ga, deles: j.gb }
            : { casa: false, adv: j.a, meus: j.gb, deles: j.ga }));
        return { parcial: true, rodada: iRodada + 1, total: agenda.length,
          tabela: cup.tabelaFase, grupos: null, meusJogos: meusAgora };
      }
      const geral = [...tab.values()].sort(ordena);
      cup.tabelaFase = geral;
      cup.grupos = null;
      cup.alive = geral.slice(0, f.avancam).map((r) => r.id);
    } else {
      // Grupos de verdade: sorteia, joga dentro do grupo, passam os melhores de cada.
      const porGrupo = f.por_grupo || 4;
      const grupos = estado && estado.grupos ? estado.grupos : (() => {
        const emb = shuffle(ids); const gs = [];
        for (let i = 0; i < emb.length; i += porGrupo) gs.push(emb.slice(i, i + porGrupo));
        return gs;
      })();
      // CALENDÁRIO DO GRUPO: rodízio clássico, uma rodada por dia de agenda.
      const rodadas = estado ? estado.rodadas : this._rodiziosDoGrupo(grupos, f.ida_volta);
      const iRodada = estado ? estado.i : 0;
      for (const [a, b] of (rodadas[iRodada] || [])) jogos.push(jogo(a, b));
      const tabelaDoGrupo = () => grupos.map((g) => g.map((id) => tab.get(id)).filter(Boolean).sort(ordena));
      cup._grupoEstado = { fase: cup.stage, rodadas, i: iRodada + 1,
        tab: [...tab.values()], grupos,
        meus: (estado && estado.meus ? estado.meus : []).concat(jogosDoUsuario(jogos)) };
      if (iRodada + 1 < rodadas.length) {
        cup.grupos = tabelaDoGrupo();
        cup.tabelaFase = null;
        const meusAgora = jogos.filter((j) => j.a === this.userClubId || j.b === this.userClubId)
          .map((j) => (j.a === this.userClubId
            ? { casa: true, adv: j.b, meus: j.ga, deles: j.gb }
            : { casa: false, adv: j.a, meus: j.gb, deles: j.ga }));
        return { parcial: true, rodada: iRodada + 1, total: rodadas.length,
          grupos: cup.grupos, meusJogos: meusAgora };
      }
      const passam = f.avancam_por_grupo || 2;
      cup.grupos = grupos.map((g) => g.map((id) => tab.get(id)).sort(ordena));
      cup.tabelaFase = null;
      // classificados de cada grupo, e se sobrar gente para as vagas do mata-mata,
      // passam os de melhor campanha
      // Os classificados de cada grupo. Quando eles não enchem a chave, os MELHORES
      // TERCEIROS completam — é o que a Copa do Mundo e a Eurocopa fazem, e é o que
      // faltava aqui: o Paulista tem 3 grupos de 4 e passam 2 de cada, o que dá 6
      // numa chave de 8. Sobravam duas vagas, e nas quartas alguém avançava sem
      // jogar — o EC Jaú chegou à final sem disputar a semifinal.
      const direto = cup.grupos.flatMap((g) => g.slice(0, passam)).sort(ordena);
      // Quantos passam DE VERDADE. O número vem do formato (16 na Libertadores), mas
      // ele foi calculado supondo a fase cheia; quando o continente tem menos clubes,
      // a fase encolhe e o número não pode encolher junto sozinho. A Sul-Americana
      // ficou com 16 clubes na fase de grupos e classificou os 16 — a fase inteira
      // virou enfeite e a chave seguinte não fechava.
      //
      // Passa a maior potência de dois MENOR que o número de clubes da fase: alguém
      // sempre é eliminado, e a chave seguinte é redonda.
      const naFase = cup.grupos.reduce((n, g) => n + g.length, 0);
      let teto = 1;
      while (teto * 2 < naFase) teto *= 2;
      const querem = Math.min(f.avancam || direto.length, teto);
      if (direto.length < querem) {
        const sobra = cup.grupos.flatMap((g) => g.slice(passam)).sort(ordena);
        direto.push(...sobra.slice(0, querem - direto.length));
      }
      cup.alive = direto.sort(ordena).slice(0, querem).map((r) => r.id);
      // QUEM TERMINA EM TERCEIRO NÃO VAI PARA CASA. Na Libertadores o 3º de cada
      // grupo cai para a Sul-Americana e entra no playoff das oitavas dela. O jogo
      // preenchia essas oito vagas com "os melhores que sobraram", e o Corinthians
      // terminou em 3º sem ir para lugar nenhum.
      cup.terceiros = cup.grupos
        .map((g) => g[passam])            // o primeiro que ficou de fora, em cada grupo
        .filter(Boolean)
        .sort(ordena)
        .map((r) => r.id);
    }

    // TODOS os seus jogos da fase, não só os da última rodada
    const meu = (cup._grupoEstado && cup._grupoEstado.meus ? cup._grupoEstado.meus : [])
      .concat(jogosDoUsuario(jogos))
      .filter((x, i, arr) => arr.findIndex((y) => y.adv === x.adv && y.meus === x.meus
        && y.deles === x.deles && y.casa === x.casa) === i);
    cup.results.push({ stage: cup.stages[cup.stage], fase: f.tipo, meusJogos: meu,
      grupos: cup.grupos, tabela: cup.tabelaFase });
    cup.stage++;
    cup.formatoFaseFeita = f;   // a tela precisa saber quantos passavam por grupo
    cup.passaramDaFase = cup.alive.length;   // e quantos passaram, que muda a cada fase
    cup._grupoEstado = null;
    cup.formatoFase = null;
    return { grupos: cup.grupos, tabela: cup.tabelaFase, meusJogos: meu };
  }

  /** O ADVERSÁRIO DE HOJE NA COPA, antes de a fase acontecer.
   *
   *  O Gustavo: "eu preciso conseguir simular o Paulistão também, não só os jogos do
   *  Brasileirão". Para dirigir um jogo de copa é preciso saber contra quem — e isso
   *  só existia depois de a fase inteira ser resolvida. Aqui a fase é MONTADA (quem
   *  entra entra) e o confronto do jogador é lido sem jogar nada.
   */
  adversarioNaCopaHoje() {
    const hoje = this.compromissoDeHoje();
    if (!hoje || hoje.tipo !== 'copa') return null;
    const cup = this.cupsList()[hoje.cup];
    if (!cup || cup.winner || cup.stage > hoje.fase) return null;
    // FASE DE GRUPOS. Antes devolvia null aqui, e quem chamava caía no adversário
    // da LIGA: era por isso que, num dia de Paulista, o jogo marcava Atlético-MG e
    // mexia na tabela do Brasileirão.
    if (cup.formatoFase && cup.stage === (cup.iGrupos || 0)) {
      const est = this._prepararGrupo(cup);
      if (!est) return null;                       // fase de liga: ainda não dá
      const daRodada = est.rodadas[est.i] || [];
      const meu = daRodada.find(([a, b]) => a === this.userClubId || b === this.userClubId);
      if (!meu) return null;                       // você folga nesta rodada
      const advId = meu[0] === this.userClubId ? meu[1] : meu[0];
      const adv = this.clubById(advId);
      return adv ? { cup, adversario: adv, fase: cup.stages[cup.stage],
        grupo: true, casa: meu[0] === this.userClubId, rodadaDoGrupo: est.i + 1 } : null;
    }
    this._entrarNaFase(cup);
    const byes = Math.min((cup.byes && cup.byes[cup.stage]) || 0, cup.alive.length);
    const lista = byes > 0 ? cup.alive.slice(byes) : cup.alive;
    const i = lista.indexOf(this.userClubId);
    if (i < 0) return null;
    let advId;
    if (byes > 0) {
      const j = lista.length - 1 - i;
      advId = (i < Math.floor(lista.length / 2) || j < Math.floor(lista.length / 2)) ? lista[j] : null;
    } else {
      advId = i % 2 === 0 ? lista[i + 1] : lista[i - 1];
    }
    const adv = advId != null ? this.clubById(advId) : null;
    return adv ? { cup, adversario: adv, fase: cup.stages[cup.stage] } : null;
  }

  /** Guarda o placar que o jogador fez em campo para a fase usar. */
  definirPlacarDeCopa(meus, deles, penaltis) {
    this._placarDoUsuario = { meus, deles, penaltis };
  }

  _cupPlayStage(cup, skipUserFinal) {
    if (!cup || cup.winner) return null;
    // Se a fase atual é de grupos ou de liga, ela não é chaveada — é outra coisa.
    // QUEM ENTRA NESTA FASE. Na Copa do Brasil os grandes só aparecem na 3ª fase e na
    // Libertadores 28 clubes entram direto na fase de grupos. Isso estava escrito na
    // chave mas nunca acontecia: os clubes que entravam tarde ficavam guardados em
    // `entradas` e ninguém os colocava em campo. Na prática os 16 maiores do Brasil
    // não disputavam a Copa do Brasil, e a fase de grupos da Libertadores era jogada
    // só pelos 4 que vinham da preliminar.
    //
    // Isto tem de vir ANTES do desvio para a fase de grupos, senão ela começa vazia.
    this._entrarNaFase(cup);

    // A fase de grupos nem sempre é a primeira: na Libertadores vêm três preliminares
    // antes dela. `iGrupos` diz em que ponto da chave ela está.
    if (cup.formatoFase && cup.stage === (cup.iGrupos || 0)) return this._jogarFaseDeGrupos(cup);
    return this._jogarMataMata(cup, skipUserFinal);
  }

  /** Coloca em campo quem entra nesta fase (a Copa do Brasil traz os grandes na 3ª,
   *  a Libertadores traz 28 clubes direto nos grupos). Roda uma vez por fase. */
  _entrarNaFase(cup) {
    if (cup._faseMontada === cup.stage) return;
    cup._faseMontada = cup.stage;
    if (cup.entradas && cup.entradas[cup.stage] && cup.stage > 0) {
      let entram = cup.entradas[cup.stage];
      // Na SEGUNDA competição do continente, quem entra no playoff das oitavas são os
      // TERCEIROS colocados dos grupos da principal — é assim na Sul-Americana. Os
      // clubes reservados na montagem eram um substituto para o caso de a fase de
      // grupos da principal ainda não ter acontecido; se ela já aconteceu, valem os
      // times de verdade.
      if (cup.kind === 'cont2' && /playoff/i.test(cup.stages[cup.stage] || '')) {
        const principal = (this.cups || []).find((c) => c.kind === 'cont');
        const caidos = (principal && principal.terceiros) || [];
        if (caidos.length) {
          const vagas = entram.length || caidos.length;
          entram = caidos.slice(0, vagas);
          cup.entradas[cup.stage] = entram;
          cup.vieramDaPrincipal = entram.slice();
        }
      }
      const novos = entram.filter((id) => !cup.alive.includes(id));
      if (novos.length) cup.alive = shuffle(cup.alive.concat(novos));
    }
  }

  /** O mata-mata da fase: forma os confrontos e joga. */
  _jogarMataMata(cup, skipUserFinal) {

    // QUEM PASSA DIRETO. Duas situações usam isto:
    //  - a FASE PRELIMINAR de uma copa nacional, onde só o excedente joga (a Alemanha
    //    tem 66 clubes e a chave precisa de 64: jogam 4, os outros 62 esperam);
    //  - o PLAYOFF da Champions, onde do 1º ao 8º da tabela vão direto às oitavas.
    // Em ambos quem passa direto é quem está na frente da fila: na copa nacional os
    // mais fortes, na Champions os melhores da fase de liga.
    // Quantos passam direto nesta fase. No PLAYOFF o número não é fixo: quem chegou
    // dos grupos tem de sair de lá no mesmo tamanho, então joga um confronto para
    // cada clube que entrou agora e o resto espera. Com o número fixo de 8, uma
    // Sul-Americana que trouxe 8 dos grupos em vez de 16 saía com a chave torta.
    let byes = Math.min((cup.byes && cup.byes[cup.stage]) || 0, cup.alive.length);
    if (/playoff/i.test(cup.stages[cup.stage] || '')
        && cup.entradas && (cup.entradas[cup.stage] || []).length) {
      // Só quando entra gente NOVA no playoff, que é o caso da Sul-Americana. Na
      // Champions ninguém entra: os 24 vêm todos da fase de liga e o número de quem
      // passa direto é fixo em 8 — calcular aqui zerava os confrontos.
      const entraramAgora = cup.entradas[cup.stage].length;
      byes = Math.max(0, cup.alive.length - entraramAgora * 2);
    }
    const next = [], pairs = [];
    if (byes > 0) {
      const passamDireto = cup.alive.slice(0, byes);
      const jogam = cup.alive.slice(byes);
      for (let i = 0; i < Math.floor(jogam.length / 2); i++) {
        const a = jogam[i], b = jogam[jogam.length - 1 - i];
        const r = this._cupSim(a, b, cup.name); pairs.push(r); next.push(r.win);
      }
      if (jogam.length % 2) next.push(jogam[Math.floor(jogam.length / 2)]);
      next.unshift(...passamDireto);
    } else {
      const alive = cup.alive;
      for (let i = 0; i < alive.length; i += 2) {
        const a = alive[i], b = alive[i + 1];
        if (b === undefined) { next.push(a); continue; }
        if (skipUserFinal && alive.length === 2 && (a === this.userClubId || b === this.userClubId)) return { pausedFinal: true };
        const r = this._cupSim(a, b, cup.name); pairs.push(r); next.push(r.win);
      }
    }
    cup.results.push({ stage: cup.stages[cup.stage], pairs }); cup.alive = next; cup.stage++;
    // Sobrar um só não quer dizer que acabou: na Copa Intercontinental cada fase é um
    // jogo, e quem vence espera o próximo adversário entrar. Só é campeão quem venceu
    // a ÚLTIMA fase. Sem esta guarda o vencedor do primeiro play-off já era campeão
    // do mundo, e a final contra o campeão da Champions nunca acontecia.
    const faltamEntradas = (cup.entradas || []).slice(cup.stage).some((e) => e && e.length);
    if (next.length === 1 && cup.stage >= cup.stages.length && !faltamEntradas) cup.winner = next[0];
    return { pairs };
  }
  // Joga só os 90 minutos da final e devolve o resultado, SEM decidir o campeão —
  // quem decide é quem chamou, porque o empate vai para a disputa de pênaltis.
  simulateCupFinalTempoNormal(cup) {
    cup = cup || this.cupFinalPending;
    const opp = this.cupOpponentInFinal(cup);
    const uStr = this.forcaComMoral(this.userClub(), this._availLineup()), oStr = this.strengthOf(opp);
    const uTac = this.tacticOf(this.userClub()), oTac = this.tacticOf(opp);
    const ug = poisson(expectedGoals(uStr, uTac, oStr, oTac, 2));
    const og = poisson(expectedGoals(oStr, oTac, uStr, uTac, 0));
    const events = [];
    this._attribute(this.userClub(), this._availLineup(), ug, events, 'user', uTac, cup.name);
    this._attribute(opp, null, og, events, 'opp', oTac, cup.name);
    events.sort((a, b) => a.minute - b.minute);
    return { userGoals: ug, oppGoals: og, events, opp, cupName: cup.name };
  }

  // Registra o campeão da final (com ou sem pênaltis).
  registrarFinal(cup, ug, og, userVenceu, penA, penB) {
    const opp = cup.alive.find((id) => id !== this.userClubId);
    const win = userVenceu ? this.userClubId : opp;
    cup.results.push({ stage: 'Final',
      pairs: [{ a: this.userClubId, b: opp, ga: ug, gb: og, win,
        pen: penA || penB ? (userVenceu ? 'a' : 'b') : null, penA: penA || 0, penB: penB || 0 }] });
    cup.alive = [win]; cup.stage++; cup.winner = win;
    if (this.cupFinalPending === cup) this.cupFinalPending = null;
    return win === this.userClubId;
  }

  finishCupFinal(cup, userGoals, oppGoals) {
    const opp = cup.alive.find((id) => id !== this.userClubId);
    const ug = userGoals, og = oppGoals;
    // Final não termina empatada: se empatou no tempo normal, vai para os pênaltis —
    // e o placar dos pênaltis fica registrado, para a tela poder mostrar.
    let pen = null, penA = 0, penB = 0;
    if (ug === og) {
      penA = 3 + Math.floor(Math.random() * 3);
      penB = penA - 1 - Math.floor(Math.random() * 2);
      if (Math.random() < 0.5) { const t2 = penA; penA = penB; penB = t2; }
      pen = penA > penB ? 'a' : 'b';
    }
    const win = ug > og || pen === 'a' ? this.userClubId : opp;
    cup.results.push({ stage: 'Final', pairs: [{ a: this.userClubId, b: opp, ga: ug, gb: og, win, pen, penA, penB }] });
    cup.alive = [win]; cup.stage++; cup.winner = win;
    if (this.cupFinalPending === cup) this.cupFinalPending = null;
    return win === this.userClubId;
  }
  cupOpponentInFinal(cup) { const k = cup || this.cupFinalPending; return k ? this.clubById(k.alive.find((id) => id !== this.userClubId)) : null; }
  // marcadores dos DOIS lados na final (antes só saíam os seus)
  simulateCupFinal(cup) {
    cup = cup || this.cupFinalPending; const opp = this.cupOpponentInFinal(cup);
    const uStr = this.forcaComMoral(this.userClub(), this._availLineup()), oStr = this.strengthOf(opp);
    const uTac = this.tacticOf(this.userClub()), oTac = this.tacticOf(opp);
    let ug = poisson(expectedGoals(uStr, uTac, oStr, oTac, 2)), og = poisson(expectedGoals(oStr, oTac, uStr, uTac, 0));
    const events = []; this._attribute(this.userClub(), this._availLineup(), ug, events, 'user', uTac, cup.name); this._attribute(opp, null, og, events, 'opp', oTac, cup.name);
    events.sort((a, b) => a.minute - b.minute);
    const won = this.finishCupFinal(cup, ug, og);
    return { userGoals: ug, oppGoals: og, events, won, opp, cupName: cup.name };
  }

  /** Os clubes que disputam a SUA tabela. Em liga grande é o seu grupo. */
  clubesDaTabela() {
    if (this.grupoDaLiga && this.grupoDaLiga.length) {
      return this.grupoDaLiga.map((id) => this.clubById(id)).filter(Boolean);
    }
    return this.activeClubs();
  }
  _initStandings() { this.table = {}; for (const c of this.clubesDaTabela()) this.table[c.id] = { id: c.id, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 }; }

  // Turno e returno (double round-robin)
  _buildFixtures() {
    let ids = this.activeClubs().map((c) => c.id);

    // LIGA GRANDE DEMAIS PARA TODOS CONTRA TODOS.
    //
    // A Série D tem 64 clubes: turno e returno dava 126 RODADAS numa temporada só.
    // A de verdade não é assim — são grupos regionais e depois mata-mata. A MLS
    // também joga em conferências, não 58 rodadas de todos contra todos.
    //
    // Aqui a liga se divide em grupos do tamanho de um campeonato normal e você
    // joga o seu. O resto da tabela continua existindo; o que muda é que ninguém
    // joga uma temporada de dois anos e meio.
    if (ids.length > 24) {
      const porGrupo = ids.length >= 48 ? 16 : Math.ceil(ids.length / 2);
      const ordenados = ids.slice().sort((a, b) =>
        this.strengthOf(this.clubById(b)) - this.strengthOf(this.clubById(a)));
      // distribui em serpentina para os grupos ficarem parelhos
      const nGrupos = Math.ceil(ordenados.length / porGrupo);
      const grupos = Array.from({ length: nGrupos }, () => []);
      ordenados.forEach((id, i) => {
        const volta = Math.floor(i / nGrupos);
        const g = volta % 2 === 0 ? i % nGrupos : nGrupos - 1 - (i % nGrupos);
        grupos[g].push(id);
      });
      const meu = grupos.find((g) => g.includes(this.userClubId)) || grupos[0];
      this.grupoDaLiga = meu;
      ids = meu.slice();
    } else {
      this.grupoDaLiga = null;
    }
    // SORTEIO NOVO A CADA TEMPORADA. O Gustavo, na segunda temporada: "a sequência
    // de jogos é a mesma da temporada passada. Só mudou o primeiro jogo". Era: a
    // tabela saía sempre da mesma ordem de clubes. Um campeonato sorteia a tabela
    // todo ano, e agora este também.
    ids = shuffle(ids.slice());
    if (ids.length % 2 !== 0) ids = ids.concat([-1]); // "bye" se ímpar
    const n = ids.length, rounds = [], arr = ids.slice();
    for (let r = 0; r < n - 1; r++) {
      const games = [];
      for (let i = 0; i < n / 2; i++) { const h = arr[i], a = arr[n - 1 - i]; if (h !== -1 && a !== -1) games.push(r % 2 === 0 ? [h, a] : [a, h]); }
      rounds.push(games); arr.splice(1, 0, arr.pop());
    }
    // Quantos turnos a liga joga de verdade. Quase todas jogam 2 (turno e returno),
    // mas as pequenas se enfrentam 3 ou 4 vezes para a temporada não ficar curta: a
    // húngara joga 33 rodadas e a irlandesa 36, e aqui elas jogavam 22 e 18.
    // O mando alterna a cada turno; no 3º turno quem recebeu no 1º vai jogar fora.
    const cpL = this.userCompObj && this.userCompObj();
    const turnos = this.grupoDaLiga
      ? 2                                     // liga partida em grupos: turno e returno
      : turnosDaLiga(cpL && cpL.country, cpL && cpL.tier);
    this.fixtures = [];
    const emCasa = new Map();
    const contaCasa = (gs) => { for (const [h] of gs) emCasa.set(h, (emCasa.get(h) || 0) + 1); };
    const nTurnos = Math.max(2, turnos);
    // Cada PAR de turnos é ida e volta: todo mundo recebe uma vez e visita uma vez.
    for (let par = 0; par < Math.floor(nTurnos / 2); par++) {
      this.fixtures.push(...rounds.map((gs) => { contaCasa(gs); return gs; }));
      this.fixtures.push(...rounds.map((gs) => {
        const inv = gs.map(([h, a]) => [a, h]); contaCasa(inv); return inv;
      }));
    }
    // Sobrou um turno ímpar (a húngara e a escocesa jogam 3): o mando vai para quem
    // recebeu MENOS até aqui. Sem isso saía clube com 17 jogos em casa e outro com
    // 15 — e é justamente esse 3º jogo que a regra de lá manda ser no campo de quem
    // não recebeu o último.
    if (nTurnos % 2) {
      this.fixtures.push(...rounds.map((gs) => gs.map(([h, a]) => {
        const jogo = (emCasa.get(h) || 0) <= (emCasa.get(a) || 0) ? [h, a] : [a, h];
        emCasa.set(jogo[0], (emCasa.get(jogo[0]) || 0) + 1);
        return jogo;
      })));
    }
    this.fase = 1; this.gruposFase2 = null;
  }

  /** O split da SUA liga, se o país joga com fase final (Bélgica, Escócia, Grécia...). */
  _split() { const cp = this.userCompObj && this.userCompObj();
    if (!cp) return null;
    return splitDaLiga(cp.country, cp.tier); }

  /** Monta a fase final: a tabela se parte em grupos e cada grupo joga entre si.
   *  É aqui que a pesquisa vira jogo — na Bélgica os pontos caem pela metade,
   *  na Escócia não, e quem terminou em 7º não briga mais pelo título. */
  _iniciarFaseFinal() {
    const sp = this._split();
    if (!sp || this.fase === 2) return null;
    const ordem = this.standingsSorted().map((r) => r.id);
    const grupos = []; let i = 0;
    for (const tam of sp.grupos) { grupos.push(ordem.slice(i, i + tam)); i += tam; }
    if (i < ordem.length) grupos[grupos.length - 1].push(...ordem.slice(i));
    if (sp.pontos === 'metade') {
      for (const r of Object.values(this.table)) {
        r.pts = Math.ceil(r.pts / 2);   // Bélgica e Romênia: metade, arredondando pra cima
      }
    }
    // Cada grupo joga entre si; as rodadas dos grupos acontecem no mesmo dia.
    const porRodada = [];
    // sp.jogos pode ser um número (todos os grupos jogam o mesmo tanto) ou uma lista
    // com um número por grupo: na Sérvia o grupo de 6 joga 5 rodadas e o de 8 joga 7.
    grupos.forEach((g, gi) => {
      const quantos = Array.isArray(sp.jogos) ? (sp.jogos[gi] ?? sp.jogos[0]) : sp.jogos;
      const jogos = this._roundRobin(g, quantos);
      jogos.forEach((rod, r) => { (porRodada[r] = porRodada[r] || []).push(...rod); });
    });
    const novas = porRodada.filter((r) => r && r.length);
    const antes = this.fixtures.length;
    this.fixtures = this.fixtures.concat(novas);
    // A AGENDA TAMBÉM CRESCE. A fase final nasce depois que a agenda já está montada;
    // sem acrescentar os dias dela aqui, a temporada acabava na última rodada dos
    // pontos corridos e o split da Bélgica e da Escócia nunca era jogado.
    if (this.agenda && this.agenda.length) {
      for (let r = 0; r < novas.length; r++) this.agenda.push({ tipo: 'liga', rodada: antes + r });
    }
    this.fase = 2; this.gruposFase2 = grupos;
    const meu = grupos.findIndex((g) => g.includes(this.userClubId));
    const nome = grupos.length > 2
      ? ['grupo do título', 'grupo do meio', 'grupo do rebaixamento'][meu] || 'grupo final'
      : (meu === 0 ? 'grupo do título' : 'grupo do rebaixamento');
    this._pushNews(` Fase final: a tabela se dividiu e o ${this.userClub().name} caiu no ${nome}.` +
      (sp.pontos === 'metade' ? 'Os pontos foram divididos pela metade.' : ''));
    return { grupos, nome, metade: sp.pontos === 'metade' };
  }

  /** Rodízio simples dentro de um grupo, repetido até dar o número de jogos pedido. */
  _roundRobin(ids, jogos) {
    let arr = ids.slice(); if (arr.length % 2) arr = arr.concat([-1]);
    const n = arr.length, base = [];
    for (let r = 0; r < n - 1; r++) {
      const g = [];
      for (let i = 0; i < n / 2; i++) { const h = arr[i], a = arr[n - 1 - i];
        if (h !== -1 && a !== -1) g.push(r % 2 === 0 ? [h, a] : [a, h]); }
      base.push(g); arr.splice(1, 0, arr.pop());
    }
    const out = [];
    for (let v = 0; out.length < jogos; v++) {
      for (const g of base) { if (out.length >= jogos) break;
        out.push(v % 2 === 0 ? g : g.map(([h, a]) => [a, h])); }
      if (!base.length) break;
    }
    return out;
  }

  totalRounds() { return this.fixtures.length; }

  // ---- A AGENDA: o compromisso de hoje ----
  /** O que está marcado para hoje: uma rodada da liga ou uma fase de copa. */
  compromissoDeHoje() {
    const ag = this.agenda || [];
    return this.dia != null && this.dia < ag.length ? ag[this.dia] : null;
  }
  /** Hoje é dia de copa? A tela pergunta isso para saber o que desenhar. */
  hojeEhCopa() { const d = this.compromissoDeHoje(); return !!d && d.tipo === 'copa'; }
  /** A copa de hoje, se for dia de copa. */
  copaDeHoje() {
    const d = this.compromissoDeHoje();
    return d && d.tipo === 'copa' ? this.cupsList()[d.cup] : null;
  }
  totalDeCompromissos() { return (this.agenda || []).length; }

  /** Pura de propósito: quem cria a fase final é _talvezFaseFinal, num ponto só.
   *  Quando isso morava aqui dentro, a temporada virava sozinha seis vezes. */
  isSeasonOver() {
    // Com a agenda, a temporada acaba quando o último compromisso é jogado — e não
    // quando a liga acaba. Sem isso a Copa do Brasil ficava pela metade.
    if (this.agenda && this.agenda.length) return this.dia >= this.agenda.length;
    return this.round >= this.fixtures.length;
  }
  /** Acabou a fase de pontos corridos e o país joga com split? Então divide agora. */
  _talvezFaseFinal() {
    if (this.round < this.fixtures.length || this.fase === 2) return null;
    if (!this._split()) return null;
    return this._iniciarFaseFinal();
  }
  userFixture() {
    // A liga pode acabar ANTES da agenda: sobram dias de copa depois da última
    // rodada do Brasileirão. Sem esta guarda o jogo lia fixtures[38], que não existe.
    if (this.isSeasonOver() || this.round >= this.fixtures.length) return null;
    return this.fixtures[this.round].find((g) => g[0] === this.userClubId || g[1] === this.userClubId);
  }
  hasUserGame() { return !!this.userFixture(); }
  opponentClub() { const g = this.userFixture(); if (!g) return null; return this.clubById(g[0] === this.userClubId ? g[1] : g[0]); }
  userIsHome() { const g = this.userFixture(); return g && g[0] === this.userClubId; }
  /** Escala o time respeitando A VAGA: canhoto na esquerda, destro na direita.
   *
   *  Vive aqui, e não só na tela, porque quem nunca abre a aba de tática jogava sem
   *  escalação definida — e aí a penalidade por posição trocada não valia nada. Agora
   *  todo jogo tem um XI com vaga conhecida.
   */
  escalarAutomatico() {
    const u = this.userClub(); if (!u) return;
    const vagas = slotsDaFormacao(this.formation);
    const usados = new Set(); const ids = [];
    const livres = () => u.squad.filter((p) => !usados.has(p.id));
    const nota = (p) => p.forca * 10 - (p.lesao > 0 ? 400 : 0) - (p.suspenso > 0 ? 400 : 0)
      + ((p.forma || 6) - 6) * 6;
    const melhor = (l) => l.slice().sort((a, b) => nota(b) - nota(a))[0];
    for (const v of vagas) {
      const sub = (p) => p.sub || p.posicao;
      const exato = melhor(livres().filter((p) => sub(p) === v.sub));
      const perto = melhor(livres().filter((p) => (PARECIDAS[v.sub] || []).includes(sub(p))));
      const grupo = melhor(livres().filter((p) => (
        v.g === 'G' ? p.posicao === 'G'
        : v.g === 'DEF' ? (p.posicao === 'Z' || p.posicao === 'L')
        : v.g === 'MID' ? (p.posicao === 'M' || p.posicao === 'L')
        : (p.posicao === 'A' || p.posicao === 'M'))));
      const c = exato || perto || grupo || melhor(livres());
      if (!c) break;
      ids.push(c.id); usados.add(c.id);
    }
    if (ids.length === 11) this.lineupIds = ids;
  }

  /** Força do time em campo, JÁ DESCONTANDO quem está fora da posição.
   *
   *  É aqui que separar lateral-esquerdo de lateral-direito passa a valer alguma
   *  coisa. Antes a distinção existia só no rótulo da tela: escalar dois canhotos na
   *  defesa não mudava nada no resultado. Agora um LD jogando na esquerda perde 3
   *  pontos, um zagueiro improvisado na lateral perde 6, e um atacante na lateral
   *  perde 9 — o time joga pior, como jogaria.
   */
  strengthOf(club, lineupIds) {
    const base = avgForca(bestEleven(club, lineupIds));
    if (!club || club.id !== this.userClubId) return base;
    const ids = lineupIds || this.lineupIds;
    if (!ids || ids.length !== 11) return base;
    const vagas = slotsDaFormacao(this.formation);
    let perda = 0;
    ids.forEach((id, i) => {
      const p = club.squad.find((x) => x.id === id);
      if (p && vagas[i]) perda += penalidadeDePosicao(vagas[i].sub, p.sub || p.posicao);
    });
    return Math.max(30, base - perda / 11);
  }

  /** Quem está fora da posição natural, para a tela avisar antes do jogo. */
  foraDePosicao(lineupIds) {
    const u = this.userClub(); const ids = lineupIds || this.lineupIds;
    if (!u || !ids || ids.length !== 11) return [];
    const vagas = slotsDaFormacao(this.formation);
    const fora = [];
    ids.forEach((id, i) => {
      const p = u.squad.find((x) => x.id === id);
      const perda = p && vagas[i] ? penalidadeDePosicao(vagas[i].sub, p.sub || p.posicao) : 0;
      if (perda >= 3) fora.push({ nome: p.nome, vaga: vagas[i].lbl, natural: p.sub || p.posicao, perda });
    });
    return fora;
  }

  _applyResult(homeId, awayId, gh, ga) {
    const H = this.table[homeId], A = this.table[awayId]; if (!H || !A) return;
    H.j++; A.j++; H.gp += gh; H.gc += ga; A.gp += ga; A.gc += gh;
    if (gh > ga) { H.v++; H.pts += 3; A.d++; } else if (gh < ga) { A.v++; A.pts += 3; H.d++; } else { H.e++; A.e++; H.pts++; A.pts++; }
    // A FORMA DE TODO MUNDO, não só a sua. O Gustavo queria ver, embaixo do nome dos
    // dois times no card do jogo, como cada um vem — "aqueles quadradinhos de
    // vitória, derrota e empate, mas dos dois".
    const marca = (id, r) => {
      this.formaDosClubes = this.formaDosClubes || {};
      this.formaDosClubes[id] = ((this.formaDosClubes[id] || '') + r).slice(-5);
    };
    marca(homeId, gh > ga ? 'V' : gh < ga ? 'D' : 'E');
    marca(awayId, ga > gh ? 'V' : ga < gh ? 'D' : 'E');
  }

  /** Os últimos cinco resultados de um clube qualquer, do mais antigo ao mais novo. */
  formaDe(clubId) { return ((this.formaDosClubes || {})[clubId] || '').split(''); }

  /** `onde` é o nome da competição do gol. O Gustavo: "seria um diferencial muito
   *  top se tivesse a artilharia e a assistência de todos os campeonatos que o meu
   *  time disputa". Cada gol passa a saber onde foi feito. */
  _attribute(club, lineupIds, nGoals, minutesOut, side, tactic, onde) {
    const eleven = bestEleven(club, lineupIds);
    const off = tactic ? tactic.off : 0.5;
    const aW = 3.0 + off * 2.6;
    const w = (p) => (p.posicao === 'A' ? aW : p.posicao === 'M' ? 2.2 : p.posicao === 'L' ? 1.1 : p.posicao === 'Z' ? 0.7 : 0.05) * p.forca;
    const pick = (exclude) => {
      const pool = eleven.filter((p) => p !== exclude); const tot = pool.reduce((s, p) => s + w(p), 0); let r = Math.random() * tot;
      for (const p of pool) { r -= w(p); if (r <= 0) return p; } return pool[0];
    };
    for (let i = 0; i < nGoals; i++) {
      const sc = pick(null); if (!sc) continue; sc.gols++;
      const comp = onde || (this.userCompObj() || {}).name || 'Liga';
      sc.golsComp = sc.golsComp || {}; sc.golsComp[comp] = (sc.golsComp[comp] || 0) + 1;
      let as = null;
      if (Math.random() < 0.7) {
        as = pick(sc);
        if (as) { as.assist++; as.assistComp = as.assistComp || {}; as.assistComp[comp] = (as.assistComp[comp] || 0) + 1; }
      }
      minutesOut.push({ minute: 1 + Math.floor(Math.random() * 89), side, scorer: sc.nome, assist: as ? as.nome : null });
    }
  }

  // aplica a rodada do usuário + simula os outros jogos da rodada
  // O clássico da rodada, se houver
  classicoDaRodada() {
    const opp = this.opponentClub();
    if (!opp) return null;
    const c = classicoEntre(this.userClub().name, opp.name);
    if (c) return { nome: c.nome, peso: c.peso, rival: opp.name };
    if (ehDerbyRegional(this.userClub(), opp, estadoDe)) {
      return { nome: 'Clássico estadual', peso: 0.8, rival: opp.name };
    }
    return null;
  }

  /** A DIRETORIA ACOMPANHA A TEMPORADA — não só o fim dela.
   *
   *  Até aqui você podia estar em último na rodada 20 e nada acontecia: a
   *  conversa com a diretoria só existia depois do último jogo do ano. Sem
   *  risco no meio do caminho, uma sequência ruim não custava nada.
   *
   *  Agora existe uma paciência, de 0 a 100. Ela cai quando você perde estando
   *  abaixo do combinado, e sobe quando você ganha. Chegando a zero, você é
   *  mandado embora no meio da temporada — mas nunca sem aviso: antes disso vem
   *  o recado público, e dá tempo de reagir ganhando.
   */
  _diretoriaVeOResultado(res) {
    if (this.paciencia == null) this.paciencia = 80;
    const o = this.objective;
    const pos = this.userPosition();
    const alvo = (o && o.target) || Math.ceil(this.nClubs() / 2);
    // o quanto você está fora do combinado, em posições
    const fora = Math.max(0, pos - alvo);
    // A TABELA DEMORA A DIZER A VERDADE.
    //
    // Medi: o Palmeiras na mão do jogador termina em 1º — mas na rodada 8 ele
    // pode estar em 12º, porque oito jogos não separam ninguém. Cobrando a
    // posição desde cedo, eu demitia o técnico do time campeão em metade das
    // temporadas, antes de a tabela se ajeitar. Agora a cobrança CRESCE com a
    // temporada: no começo quase não pesa, e a partir da metade pesa inteira.
    const total = Math.max(1, this.totalRounds());
    const maturidade = Math.min(1, this.round / (total * 0.45));
    const cedo = this.round < 6;

    // CALIBRAGEM. A primeira conta demitia metade dos treinadores de time grande
    // em oito temporadas — isso não é tensão, é frustração. Ganhar tem que pagar
    // mais do que perder cobra, senão uma sequência ruim nunca se recupera.
    let d = res === 'V' ? 7 : res === 'E' ? 1.5 : -3;
    if (!cedo) d -= Math.min(4, fora * 0.5) * maturidade;   // longe da meta corrói
    if (!cedo && fora === 0) d += 2;                  // dentro do combinado acalma
    this.paciencia = clamp01(this.paciencia + d);

    // O RECADO. Só uma vez por faixa, para não virar notícia toda semana.
    const faixa = this.paciencia <= 18 ? 'ultimato' : this.paciencia <= 40 ? 'incomodo' : null;
    if (faixa && this._avisoDiretoria !== faixa && !cedo) {
      this._avisoDiretoria = faixa;
      this._pushNews(faixa === 'ultimato'
        ? `A diretoria deu um ultimato: o seu cargo está em jogo. ${pos}º colocado, a meta é o top ${alvo}.`
        : `A diretoria cobrou publicamente o ${pos}º lugar — a meta combinada era o top ${alvo}.`);
    }
    if (this.paciencia > 55) this._avisoDiretoria = null;   // passou o aperto
  }

  /** A DEMISSÃO NO MEIO DO ANO.
   *
   *  Mesma porta da demissão de fim de temporada (o painel de escolher novo
   *  clube já existia), com o mesmo teto de clubes — quem foi mandado embora do
   *  Vitória não assume o Real Madrid na tela seguinte.
   */
  _demitirNoMeioDaTemporada() {
    const pos = this.userPosition();
    const alvo = (this.objective && this.objective.target) || Math.ceil(this.nClubs() / 2);
    const meu = avgForca(bestEleven(this.userClub()));
    const desconto = Math.max(1, 4 - Math.min(3, (this.trophies || []).length));
    const fracos = this.clubs().map((c) => avgForca(bestEleven(c))).sort((a, b) => a - b);
    const piso = fracos[Math.min(24, fracos.length - 1)] || 45;
    this.tetoTreinador = Math.max(45, piso, Math.round(meu - desconto));
    this.demitidoDe = this.userClub().name;
    this._pushNews(`Você foi demitido do ${this.demitidoDe} na ${this.round + 1}ª rodada: ${pos}º colocado, a meta era o top ${alvo}.`);
    this.pendingBoard = {
      finish: pos, target: alvo, fired: true, offers: [], relegated: false,
      noMeio: true, rodada: this.round + 1,
    };
    this.paciencia = 80; this._avisoDiretoria = null;
  }

  /** Você foi mandado embora no meio da temporada? */
  demitidoNoMeio() {
    // nunca no comecinho, e nunca sem o ultimato ter saído antes
    // três travas, para a demissão nunca parecer sorteio:
    //   a paciência no chão, a temporada já encaminhada, o ultimato já dado,
    //   e você LONGE da meta — quem está a uma posição do combinado não cai.
    const alvo = (this.objective && this.objective.target) || Math.ceil(this.nClubs() / 2);
    const longe = this.userPosition() > alvo + 2;
    // e nunca antes de um terço da temporada: até lá a tabela ainda mente
    const cedoDemais = this.round < this.totalRounds() * 0.35;
    return this.paciencia != null && this.paciencia <= 0
      && !cedoDemais && this._avisoDiretoria === 'ultimato' && longe;
  }

  /** A FORÇA DO SEU TIME, JÁ COM O VESTIÁRIO DENTRO.
   *
   *  `moralElenco` existia, era escrita depois de clássico e NUNCA era lida por
   *  ninguém: ganhar o dérbi não mudava nada no jogo seguinte. Agora o clima do
   *  elenco vale alguma coisa em campo — pouco, de propósito. Moral no chão tira
   *  perto de 4% da força; elenco voando devolve quase o mesmo. É o bastante
   *  para uma sequência ruim virar bola de neve, e não tanto que decida sozinho.
   */
  forcaComMoral(clube, lineup) {
    const base = this.strengthOf(clube, lineup);
    if (!clube || clube.id !== this.userClubId) return base;
    const m = this.moralElenco != null ? this.moralElenco : 60;
    return base * (1 + (m - 60) / 1000);
  }

  /** O vestiário reage ao resultado de hoje. Vitória levanta, derrota abate, e
   *  goleada (dos dois lados) pesa mais que um 1 a 0. */
  _moralDoResultado(res, userGoals, oppGoals) {
    const saldo = userGoals - oppGoals;
    const peso = Math.min(3, Math.abs(saldo));
    // vencer tem que pagar mais do que perder cobra: com os dois pesos iguais, a
    // média de todo mundo escorregava para baixo do neutro — até a do campeão
    const d = res === 'V' ? 5 + peso * 1.8 : res === 'D' ? -3.5 - peso * 1.2 : 1;
    let m = this.moralElenco != null ? this.moralElenco : 60;
    // A SEMANA ESFRIA A CABEÇA.
    //
    // Sem isto, um time que perde muito trava a moral no chão e nunca mais sai:
    // moral baixa tira força, menos força faz perder de novo, e a bola de neve
    // não tem fim. Vi a Chapecoense com moral 5 na rodada 27, sem caminho de
    // volta. Então, a cada jogo, o vestiário puxa um pouco de volta para o
    // normal — o humor passa, o resultado é que manda.
    m += (60 - m) * 0.14;
    this.moralElenco = clamp01(m + d);
  }

  _applyUserRound(userGoals, oppGoals) {
    const classico = this.classicoDaRodada();
    const g = this.userFixture();
    if (g) {
      const homeId = g[0], awayId = g[1];
      const gh = this.userIsHome() ? userGoals : oppGoals, ga = this.userIsHome() ? oppGoals : userGoals;
      const events = [];
      const opp = this.opponentClub(), home = this.userIsHome();
      const uTac = this.tacticOf(this.userClub()), oTac = this.tacticOf(opp);
      this._attribute(this.userClub(), this._availLineup(), userGoals, events, 'user', uTac);
      this._attribute(opp, null, oppGoals, events, 'opp', oTac);
      events.sort((a, b) => a.minute - b.minute);
      this._applyResult(homeId, awayId, gh, ga);
      this._roundEvents = events;
      const res = userGoals > oppGoals ? 'V' : userGoals < oppGoals ? 'D' : 'E';
      // Clássico mexe com o ambiente: ganhar levanta o elenco e o prestígio,
      // perder abre crise. O peso vem da tabela de rivalidades.
      if (classico) {
        const k = classico.peso;
        this.moralElenco = clamp01((this.moralElenco != null ? this.moralElenco : 60)
          + (res === 'V' ? 9 * k : res === 'D' ? -9 * k : 1));
        this.prestigio = Math.max(0, (this.prestigio || 0) + (res === 'V' ? 3 * k : res === 'D' ? -2 * k : 0));
      }
      // o vestiário e a diretoria reagem ao que acabou de acontecer
      this._moralDoResultado(res, userGoals, oppGoals);
      this._diretoriaVeOResultado(res);
      if (this.demitidoNoMeio()) this._demitirNoMeioDaTemporada();
      const notas = this._notasDaPartida(events, userGoals, oppGoals, res);
      this._lastUserResult = { rodada: this.round + 1, home, opp: opp.name, oppId: opp.id, userGoals, oppGoals, res, events, classico, notas };
      // Forma recente: as 5 últimas, para as pastilhas V/E/D do painel. Guarda também
      // CONTRA QUEM e em quanto — as pastilhas mostravam só a letra, e o Gustavo
      // perguntou de quem tinha sido cada vitória.
      this.forma = [...(this.forma || []), res].slice(-5);
      this.formaDetalhe = [...(this.formaDetalhe || []),
        { res, opp: opp.name, oppId: opp.id, gp: userGoals, gc: oppGoals, home }].slice(-5);
    } else { this._roundEvents = []; this._lastUserResult = { rodada: this.round + 1, bye: true }; }
    // demais jogos da rodada (a liga pode já ter acabado, com a agenda ainda correndo)
    for (const game of (this.fixtures[this.round] || [])) {
      if (g && game === g) continue; const [h, a] = game;
      const H = this.clubById(h), A = this.clubById(a);
      const tH = this.tacticOf(H), tA = this.tacticOf(A), sH = this.strengthOf(H), sA = this.strengthOf(A);
      const xh = poisson(expectedGoals(sH, tH, sA, tA, 4)), xa = poisson(expectedGoals(sA, tA, sH, tH, 0));
      const tmp = [];
      this._attribute(H, null, xh, tmp, 'x', tH); this._attribute(A, null, xa, tmp, 'x', tA);
      this._applyResult(h, a, xh, xa);
    }
    // ---------------- finanças ----------------
    //
    // O Gustavo desconfiou disto e estava certo. A bilheteria era um SORTEIO entre
    // € 400 mil e € 1,2 mi que ignorava adversário, estádio e tabela; e o
    // "patrocínio" era pago toda rodada em cima da FORÇA do elenco — ou seja,
    // comprar craque aumentava a receita semanal e o elenco se pagava sozinho.
    //
    // Agora a bilheteria é PÚBLICO × INGRESSO, e o público sai do tamanho real do
    // estádio (dado do Transfermarkt) vezes a atração do jogo.
    const club = this.userClub(); const folha = club.squad.reduce((s, p) => s + p.salario, 0);
    const tier1 = this.userCompObj().tier === 1;
    let bilheteria = 0, publico = 0;
    if (this.userIsHome()) {
      const lugares = club.lugares || Math.round(6000 + Math.sqrt(this._valorDoElenco(club)) * 2);
      const adv = this.opponentClub();
      let atracao = 0.55;
      const pos = this.userPosition();
      if (pos <= 3) atracao += 0.18; else if (pos <= 6) atracao += 0.08;
      else if (pos >= this.nClubs() - 2) atracao -= 0.10;
      if (adv && this.strengthOf(adv) >= 78) atracao += 0.15;
      if (this.classicoDaRodada()) atracao += 0.25;          // clássico enche
      atracao = Math.max(0.30, Math.min(1, atracao));
      publico = Math.round(lugares * atracao);
      const ingresso = tier1 ? 17 : 9;
      bilheteria = publico * ingresso;
    }
    // Patrocínio vem do TAMANHO do clube (valor do elenco), não da força — e é uma
    // fração da temporada paga por rodada, não um prêmio por ser bom.
    // Calibrado para a folha ficar perto de 60% da receita, que é a proporção que
    // um clube de futebol tem de verdade. Com a folha corrigida e as receitas
    // antigas, o Corinthians juntava 257 milhões em nove temporadas — o oposto do
    // problema anterior, e o Gustavo já tinha reclamado de sobrar dinheiro demais.
    const patrocinio = Math.round(this._valorDoElenco(club) * (tier1 ? 0.0008 : 0.00045));

    // A FOLHA É MENSAL, e estava sendo descontada INTEIRA a cada rodada. Numa
    // temporada de 38 rodadas isso cobrava 38 meses de salário num ano só, e o
    // clube ia para o vermelho sozinho, sem o técnico fazer nada: no teste, caixa
    // de +7 milhões na terceira temporada virava -33 milhões na sexta.
    // A temporada dura uns dez meses, então cada rodada paga a fração certa dela.
    const rodadas = Math.max(1, this.totalRounds());
    const folhaDaRodada = Math.round(folha * 10 / rodadas);

    // CUSTO DE OPERAR O CLUBE: estrutura, viagem, comissão técnica, categoria de
    // base, administração. O jogo só descontava salário de jogador, e por isso um
    // clube grande virava uma máquina de juntar dinheiro — o City chegava a 458
    // milhões em nove temporadas sem fazer nada.
    // Parte do custo acompanha a RECEITA (viagem, jogo, administração) e parte
    // acompanha o TAMANHO do clube: quem paga folha de craque também paga comissão
    // técnica, base e estrutura de craque. Sem a segunda parte, juntar dinheiro era
    // automático — cinco temporadas no meio da tabela da League One e o caixa
    // dobrava sozinho.
    const operacao = Math.round((bilheteria + patrocinio) * 0.28 + folhaDaRodada * 0.30);

    const saldo = bilheteria + patrocinio - folhaDaRodada - operacao;
    club.caixa += saldo;
    this._lastFinance = { bilheteria, folha: folhaDaRodada, folhaMensal: folha, patrocinio, operacao, saldo, publico };
    // NO VERMELHO, O CLUBE VENDE. Antes o caixa negativo era só uma notícia e o
    // buraco crescia para sempre — dava para terminar a carreira com -33 milhões e
    // nada acontecia. No futebol de verdade, clube endividado vende jogador, e quem
    // decide não é o técnico.
    const limite = -Math.max(2000000, folha * 4);
    if (club.caixa < limite) {
      const vendaveis = club.squad
        .filter((p) => (p.idade || 0) > CareerManager.IDADE_BASE && p.valorMercado > 0)
        .sort((a, b) => b.valorMercado - a.valorMercado);
      const alvo = vendaveis[0];
      if (alvo && club.squad.length > 18) {
        const preco = Math.round(alvo.valorMercado * 0.85);
        club.squad = club.squad.filter((p) => p.id !== alvo.id);
        club.caixa += preco;
        if (this.lineupIds) this.lineupIds = this.lineupIds.filter((id) => id !== alvo.id);
        this._pushNews(`A diretoria vendeu ${alvo.nome} por ${fmtMoneyBr(preco)} para tapar o rombo. Não te consultaram.`);
      }
    }
    if (club.caixa < 0 && !this._avisoCaixa) {
      this._avisoCaixa = true;
      this._pushNews('O clube está no vermelho. A diretoria exige corte na folha.');
    }
    if (club.caixa >= 0) this._avisoCaixa = false;
    this._processUserSquadPostMatch(g);
    this.lineupDaPartida = null;   // a escalação do jogo morre com o jogo
    this.round++;
    // Com a agenda, o dia anda junto com a rodada. As copas NÃO são mais resolvidas
    // aqui dentro: cada fase tem o seu próprio dia. O _cupTick continua existindo
    // para as competições em que você não está — elas seguem acontecendo ao fundo.
    if (this.agenda && this.agenda.length) this.dia++;
    this._cupTick();
    this._talvezFaseFinal();
    if (this.isSeasonOver()) this._endSeason();
    return this._roundEvents;
  }

  // Lesões / cartões / energia após a partida do usuário
  /** NOTA DE CADA TITULAR, de 4 a 10.
   *
   *  O Gustavo, depois de um 0x0: "a partida terminou e o jogo disse 'sem gols'.
   *  Sem autor, sem nota de jogador, sem nada para contar". Sem nota, jogo sem gol
   *  não tem história nenhuma — e é assim que se sabe quem está bem sem olhar o
   *  overall.
   */
  _notasDaPartida(events, gp, gc, res) {
    const club = this.userClub();
    const onze = bestEleven(club, this._availLineup());
    const gols = new Map(); const assists = new Map();
    for (const e of (events || [])) {
      if (e.side !== 'user') continue;
      if (e.scorer) gols.set(e.scorer, (gols.get(e.scorer) || 0) + 1);
      if (e.assist) assists.set(e.assist, (assists.get(e.assist) || 0) + 1);
    }
    const defende = (p) => ['GOL', 'ZAG', 'LE', 'LD', 'VOL'].includes(p.sub || p.posicao);
    return onze.map((p) => {
      let n = 6 + (res === 'V' ? 0.4 : res === 'D' ? -0.4 : 0);
      n += (gols.get(p.nome) || 0) * 1.1 + (assists.get(p.nome) || 0) * 0.6;
      if (defende(p)) n += gc === 0 ? 0.8 : gc >= 3 ? -0.8 : gc >= 2 ? -0.3 : 0;
      else n += gp >= 3 ? 0.4 : gp === 0 ? -0.4 : 0;
      n += ((p.forma || 6) - 6) * 0.08 + ((p.forca - this.strengthOf(club)) * 0.03);
      n += (Math.random() - 0.5) * 1.2;
      const nota = Math.max(4, Math.min(10, Math.round(n * 10) / 10));
      p.somaNotas = (p.somaNotas || 0) + nota;
      p.jogosComNota = (p.jogosComNota || 0) + 1;
      return { id: p.id, nome: p.nome, sub: p.sub || p.posicao, nota };
    }).sort((a, b) => b.nota - a.nota);
  }

  _processUserSquadPostMatch(g) {
    const club = this.userClub();
    // a semana entre as rodadas devolve fôlego para todo mundo
    // O Gustavo: "senti que o jogador, mesmo passando de um dia para o outro, não
    // recupera 100%". Entre dois compromissos passa quase uma semana — quem descansa
    // volta inteiro, e quem joga seguido é que acumula desgaste.
    club.squad.forEach((p) => { p.energia = Math.min(100, (p.energia || 100) + 20); });
    const titulares = new Set(bestEleven(club, this._availLineup()).map((p) => p.id));
    const gastoExtra = this._gastoDaPartida || 0;
    this._gastoDaPartida = 0;   // vale para UMA partida
    for (const p of club.squad) {
      if (p.lesao > 0) { p.lesao--; if (p.lesao === 0) { p.lesaoNome = null; p.lesaoSemanas = 0; } }
      if (p.suspenso > 0) p.suspenso--;
      if (titulares.has(p.id)) {
        p.jogos = (p.jogos || 0) + 1;
        // A COMPETIÇÃO DO JOGO DE HOJE — não a liga, sempre.
        //
        // Isto estava fixo na liga do usuário: jogo de Paulista contava como jogo
        // de Brasileirão. Daí os dois sintomas que o Gustavo viu: a artilharia do
        // Paulista com "0 jogos" para todo mundo, e o Brasileirão marcando 2 jogos
        // depois de uma partida só.
        const hojeComp = this.compromissoDeHoje();
        const ondeHoje = hojeComp && hojeComp.tipo === 'copa'
          ? ((this.cupsList()[hojeComp.cup] || {}).name || 'Copa')
          : ((this.userCompObj() || {}).name || 'Liga');
        p.jogosComp = p.jogosComp || {};
        p.jogosComp[ondeHoje] = (p.jogosComp[ondeHoje] || 0) + 1;
        // ENERGIA. O Gustavo: "eles jogam uma partida e a energia para a próxima já
        // está amarela; é cansativo ter que substituir toda hora". Entre uma rodada
        // e outra passa uma SEMANA — dá tempo de recuperar quase tudo. Quem joga
        // cai de pouquinho e cansa ao longo de uma sequência, não em um jogo.
        // o extra vem de quantos minutos você passou com o time todo na frente
        const extra = Math.min(9, Math.round(gastoExtra / 12));
        p.energia = Math.max(25, (p.energia || 100) - (8 + Math.floor(Math.random() * 7)) - extra);
        if (Math.random() < 0.02) p.forma = Math.min(10, (p.forma || 6) + 1); else if (Math.random() < 0.02) p.forma = Math.max(1, (p.forma || 6) - 1);
        if (g && Math.random() < 0.03) {
          const l = sortearLesao(Math.random() < 0.06);
          p.lesao = l.rodadas; p.lesaoNome = l.nome; p.lesaoSemanas = l.semanas;
          this._pushNews(`${p.nome} se machucou: ${l.nome} — fora por ${l.semanas} semanas`);
        }
        if (g && Math.random() < 0.10) { p.amarelos = (p.amarelos || 0) + 1; if (p.amarelos % 3 === 0) { p.suspenso = 1; this._pushNews(' ' + p.nome + ' suspenso (3º amarelo)'); } }
        if (g && Math.random() < 0.015) { p.suspenso = 1; this._pushNews(p.nome + ' foi expulso e cumpre suspensão de 1 jogo'); }
      } else {
        p.energia = Math.min(100, (p.energia || 100) + 30); // banco recupera a semana inteira
      }
    }
  }
  _pushNews(t) { (this.news = this.news || []).unshift(t); if (this.news.length > 20) this.news.pop(); }
  // jogadores indisponíveis (lesão/suspensão) não entram na escalação
  isAvailable(p) { return (p.lesao || 0) <= 0 && (p.suspenso || 0) <= 0; }
  /** O QUE PRECISA DE OLHO ANTES DE ROLAR A BOLA.
   *
   *  O Gustavo: "é muito chato ir lá na tática, procurar o jogador menos cansado,
   *  fazer a alteração, salvar... e quando tem suspensão não é claro o que acontece".
   *  O jogo SEMPRE repõe quem não pode jogar (é o que _availLineup faz), mas isso
   *  acontecia escondido. Aqui ele diz quem está fora, quem entrou no lugar e quem
   *  está morto de cansaço — antes do jogo, numa tela só.
   */
  checagemPreJogo() {
    const u = this.userClub();
    const ids = this.lineupIds || [];
    const escalados = ids.map((id) => u.squad.find((p) => p.id === id)).filter(Boolean);
    const fora = escalados.filter((p) => !this.isAvailable(p)).map((p) => ({
      nome: p.nome, motivo: p.lesao > 0 ? (p.lesaoNome || 'lesionado') : 'suspenso',
      sub: p.sub || p.posicao,
    }));
    const usados = new Set(this._availLineup() || []);
    const entraram = [...usados].filter((id) => !ids.includes(id))
      .map((id) => u.squad.find((p) => p.id === id)).filter(Boolean)
      .map((p) => ({ nome: p.nome, sub: p.sub || p.posicao, forca: p.forca }));
    const cansados = escalados.filter((p) => this.isAvailable(p) && (p.energia || 100) < 60)
      .map((p) => {
        const melhor = u.squad.filter((x) => !ids.includes(x.id) && this.isAvailable(x)
          && (x.energia || 100) >= 75 && penalidadeDePosicao(p.sub || p.posicao, x.sub || x.posicao) <= 1)
          .sort((a, b) => b.forca - a.forca)[0];
        return { id: p.id, nome: p.nome, sub: p.sub || p.posicao, energia: Math.round(p.energia || 100),
          trocaPor: melhor ? { id: melhor.id, nome: melhor.nome, forca: melhor.forca,
            energia: Math.round(melhor.energia || 100) } : null };
      });
    return { fora, entraram, cansados, forca: Math.round(this.strengthOf(u, this._availLineup())) };
  }

  /** Troca um titular por outro jogador, direto (usado pela checagem pré-jogo). */
  trocarNaEscalacao(saiId, entraId) {
    const ids = (this.lineupIds || []).slice();
    const i = ids.indexOf(saiId);
    if (i < 0) return false;
    const j = ids.indexOf(entraId);
    if (j >= 0) ids[j] = saiId;
    ids[i] = entraId;
    this.lineupIds = ids;
    return true;
  }

  /** O MELHOR TIME POSSÍVEL PARA HOJE, sem mexer no seu titular.
   *
   *  Troca quem não pode jogar e quem está sem energia pelo melhor do banco para
   *  aquela vaga — e devolve a lista para usar só nesta partida. */
  escalacaoAutomaticaDeHoje(minEnergia = 60) {
    const u = this.userClub();
    const ids = (this.lineupIds || []).slice();
    const usados = new Set(ids);
    const vagas = slotsDaFormacao(this.formation);
    ids.forEach((id, i) => {
      const p = u.squad.find((x) => x.id === id);
      const vaga = (vagas[i] && vagas[i].sub) || (p && (p.sub || p.posicao));
      const precisa = !p || !this.isAvailable(p) || (p.energia || 100) < minEnergia;
      if (!precisa) return;
      const melhor = u.squad
        .filter((x) => !usados.has(x.id) && this.isAvailable(x) && (x.energia || 100) >= 70)
        .map((x) => ({ x, nota: x.forca - penalidadeDePosicao(vaga, x.sub || x.posicao) }))
        .sort((a2, b2) => b2.nota - a2.nota)[0];
      if (melhor && (!p || melhor.nota >= p.forca - 6)) {
        usados.delete(id); usados.add(melhor.x.id); ids[i] = melhor.x.id;
      }
    });
    return ids;
  }

  /** ESCALAÇÃO SÓ DESTA PARTIDA. O Gustavo: "eu substituo o jogador e ele só muda
   *  para aquela partida; para a próxima volta o meu time titular — assim eu não
   *  preciso toda hora desfazer a troca". Vale para um jogo e some. */
  usarEscalacaoDaPartida(ids) { this.lineupDaPartida = ids ? ids.slice() : null; }
  limparEscalacaoDaPartida() { this.lineupDaPartida = null; }

  /** O time que entra em campo AGORA: o desta partida, se houver, senão o titular.
   *  Troca automática do que não pode jogar continua valendo nos dois casos. */
  _availLineup() {
    const club = this.userClub(); const avail = club.squad.filter((p) => this.isAvailable(p));
    const base = this.lineupDaPartida && this.lineupDaPartida.length ? this.lineupDaPartida : (this.lineupIds || []);
    let ids = base.filter((id) => avail.some((p) => p.id === id));
    if (ids.length < 11) {
      const used = new Set(ids);
      const pool = avail.filter((p) => !used.has(p.id)).sort((a, b) => b.forca - a.forca);
      for (const p of pool) { if (ids.length >= 11) break; ids.push(p.id); used.add(p.id); }
    }
    return ids.length ? ids.slice(0, 11) : null;
  }

  // avança as fases das copas; pausa se o usuário chega a alguma final; janela de meio de temporada
  _cupTick() {
    if (this.cupFinalPending) return;
    // As copas que estão na SUA agenda têm dia marcado e são jogadas lá. Aqui só
    // andam as outras — as que você não disputa, para o mundo continuar girando.
    const naAgenda = new Set((this.agenda || [])
      .filter((d) => d.tipo === 'copa').map((d) => d.cup));
    const lista = this.cupsList();
    for (let i = 0; i < lista.length; i++) {
      const cup = lista[i];
      if (cup.winner || naAgenda.has(i)) continue;
      while (cup.stage < cup.stages.length && this.round >= cup.sched[cup.stage]) {
        if (this.userInCupFinalOf(cup)) { this.cupFinalPending = cup; return; }
        this._cupPlayStage(cup, false);
      }
    }
    if (!this._midWindowDone && this.round >= Math.floor(this.totalRounds() * 0.5)) {
      this._midWindowDone = true; this._runTransferWindow(20); this._midNews = (this.transferNews || []).slice(0, 6);
      // a janela do meio do ano é quando vêm atrás dos seus jogadores
      this.propostasRecebidas = this.gerarPropostasPorMeusJogadores(3);
    }
  }

  // Simular a temporada inteira de uma vez; para só se o time chegar a uma FINAL.
  // Simular a temporada inteira.
  //
  // Bugs que isto tinha: se a temporada já estava terminada, o laço saía na primeira
  // volta e o botão não fazia nada (era o travamento da 2ª temporada); e a final de
  // copa interrompia no meio, quando o combinado é justamente NÃO interromper.
  autoSimSeason(semParar) {
    const s0 = this.season;
    let guard = 0;
    while (this.season === s0 && guard++ < 400) {
      if (this.cupFinalPending) {
        if (!semParar) return { stopped: 'final' };
        this.simulateCupFinal(this.cupFinalPending);   // resolve sozinho e segue
        continue;
      }
      this._talvezFaseFinal();
      if (this.isSeasonOver()) { this._endSeason(); break; }
      this.simulateUserResult();
    }
    return { stopped: this.cupFinalPending ? 'final' : 'season' };
  }

  simulateUserResult() {
    // DIA DE COPA: hoje não tem rodada de liga, tem a fase de copa que está marcada.
    // Antes as copas eram resolvidas por dentro da rodada do Brasileirão e o jogador
    // nunca as disputava de fato — e a rodada da liga andava junto, o que fazia o
    // Brasileirão começar na quinta rodada depois do estadual.
    const hoje = this.compromissoDeHoje();
    if (hoje && hoje.tipo === 'copa') return this._jogarDiaDeCopa(hoje);

    if (!this.hasUserGame()) { return { userGoals: 0, oppGoals: 0, events: this._applyUserRound(0, 0), bye: true }; }
    const home = this.userIsHome();
    // O adversário tem de ser lido AGORA: _applyUserRound avança a rodada, e quem
    // perguntasse depois recebia o time da rodada seguinte — era por isso que o jogo
    // contra o Atlético-MG aparecia como vitória sobre o São Paulo.
    const opp = this.opponentClub();
    const uStr = this.forcaComMoral(this.userClub(), this._availLineup()), oStr = this.strengthOf(opp);
    const uTac = this.tacticOf(this.userClub()), oTac = this.tacticOf(opp);
    const ug = poisson(expectedGoals(uStr, uTac, oStr, oTac, home ? 4 : 0));
    const og = poisson(expectedGoals(oStr, oTac, uStr, uTac, home ? 0 : 4));
    const eventos = this._applyUserRound(ug, og);
    return { userGoals: ug, oppGoals: og, oppId: opp.id, oppName: opp.name, home,
      events: eventos, notas: (this._lastUserResult || {}).notas };
  }
  /** Joga a fase de copa marcada para hoje e passa o dia. */
  _jogarDiaDeCopa(hoje) {
    const cup = this.cupsList()[hoje.cup];
    this.dia++;
    if (!cup || cup.winner) return { diaDeCopa: true, pulou: true };
    // se a copa está atrasada em relação à agenda, adianta as fases que faltam
    let r = null;
    while (cup.stage <= hoje.fase && !cup.winner) {
      if (this.userInCupFinalOf(cup)) { this.cupFinalPending = cup; break; }
      r = this._cupPlayStage(cup, false);
      if (r && r.pausedFinal) { this.cupFinalPending = cup; break; }
      // fase de grupos joga UMA rodada por dia: parou aqui, o resto é amanhã
      if (r && r.parcial) break;
    }
    const meu = (r && r.pairs || []).find((x) => x.a === this.userClubId || x.b === this.userClubId);
    // FASE DE GRUPOS NÃO TEM "PAR". O Gustavo, jogando o Paulista com o Corinthians:
    // "a fase de grupos aconteceu sem o seu time em campo. Como assim? Não entendi".
    // Ele tinha jogado, e passado em primeiro — o que faltava era a tela saber ler
    // uma fase de grupos, onde o resultado são VÁRIOS jogos e uma classificação.
    // JOGO DE COPA TAMBÉM É JOGO.
    //
    // Isto só rodava em dia de liga e na partida ao vivo. Quem simulava um dia de
    // copa não tinha jogo contado, nem energia gasta, nem lesão sorteada: por isso
    // a artilharia do Paulista mostrava "0 jogos" para todo mundo, mesmo com os
    // gols lá. O guarda evita contar duas vezes quando a partida foi dirigida.
    const meuJogoHoje = (r && r.meusJogos && r.meusJogos.length) || (meu && true);
    if (meuJogoHoje && !this._elencoJaProcessado) this._processUserSquadPostMatch(true);
    this._elencoJaProcessado = false;

    this.lineupDaPartida = null;   // a escalação do dia morre com o dia
    const meusJogos = (r && r.meusJogos) || [];
    const meuGrupo = (r && r.grupos || []).find((g) => g.some((x) => x.id === this.userClubId));
    const segue = cup.alive.includes(this.userClubId);
    if (this.isSeasonOver()) this._endSeason();
    return { diaDeCopa: true, cup: cup.name, fase: cup.stages[hoje.fase],
      par: meu || null, tabela: r && r.tabela, grupos: r && r.grupos,
      meusJogos, meuGrupo, segue,
      // Enquanto o grupo tem rodada a jogar, NÃO existe "próxima fase": a tela
      // dizia "classificado — a próxima é Fase de grupos" no meio da fase de
      // grupos. Agora ela só fala da próxima quando a fase virou de verdade.
      parcial: !!(r && r.parcial),
      rodadaDoGrupo: r && r.rodada, totalDoGrupo: r && r.total,
      proximaFase: (r && r.parcial) ? null : (cup.stages[cup.stage] || null),
      inscrito: cup.entradas ? cup.entradas.some((e) => e.includes(this.userClubId))
        : cup.alive.includes(this.userClubId) };
  }

  // ---------------------------------------------------------- partida ao vivo
  //
  // A simulação antiga decidia o placar ANTES e só desenhava o resultado — por isso
  // era passiva: nada do que você fizesse mudava nada. Aqui o jogo acontece minuto a
  // minuto e as suas escolhas de postura mexem nas chances de verdade.
  /** `copa` = { adversario, fase, cup } quando o jogo de hoje é de copa. Sem ele,
   *  é a rodada da liga, como sempre foi. */
  iniciarPartidaAoVivo(copa) {
    // TRAVA: dia de copa joga COPA.
    //
    // O erro que mais incomodou o Gustavo veio daqui: quando a copa não sabia
    // dizer o adversário (fase de grupos), quem chamava passava `null`, e com
    // `null` esta função pegava o adversário da RODADA DA LIGA e o resultado
    // entrava na tabela do Brasileirão. Agora, se hoje é dia de copa e não veio
    // adversário de copa, a partida simplesmente não começa — nunca mais cai na
    // liga por engano.
    const hojeTem = this.compromissoDeHoje();
    if (!copa && hojeTem && hojeTem.tipo === 'copa') return null;
    // amarelo vale para esta partida: zera antes de comecar
    this.userClub().squad.forEach((p) => { p.amareloNoJogo = false; });
    const u = this.userClub();
    const opp = copa ? copa.adversario : this.opponentClub();
    if (!opp) return null;
    const casa = copa ? Math.random() < 0.5 : this.userIsHome();
    const uStr = this.forcaComMoral(u, this._availLineup());
    const oStr = this.strengthOf(opp);
    const uTac = this.tacticOf(u), oTac = this.tacticOf(opp);

    // gols esperados no jogo inteiro, convertidos em chance por minuto
    const xgU = expectedGoals(uStr, uTac, oStr, oTac, casa ? 4 : 0);
    const xgO = expectedGoals(oStr, oTac, uStr, uTac, casa ? 0 : 4);

    return {
      u, opp, casa, minuto: 0, ug: 0, og: 0,
      copa: copa ? { nome: copa.cup.name, fase: copa.fase } : null,
      xgU, xgO,
      // postura em jogo: multiplica ataque e defesa
      atq: 1, def: 1, postura: 'equilibrio', gastoExtra: 0,
      posse: Math.round(50 + (uStr - oStr) * 1.6),
      posseBase: Math.round(50 + (uStr - oStr) * 1.6),
      stats: { chutesU: 0, chutesO: 0, escanteiosU: 0, escanteiosO: 0, cartoes: 0 },
      subsRestantes: 5, subsFeitas: [], sugestao: null, vagaVazia: null,
      // Cada jogo tem seu tempo. Sem isto o banco pedia troca sempre no mesmo
      // minuto e o pedido virava relógio, não leitura de jogo.
      paciencia: 62 + Math.floor(Math.random() * 16),
      eventos: [],
      decisoesFeitas: [],
      classico: this.classicoDaRodada(),
    };
  }

  /** AS TRÊS POSTURAS DA BEIRA DO CAMPO.
   *
   *  O motor já sabia jogar com isso — `atq` e `def` entram na conta das chances,
   *  da posse e do contra-ataque — mas nada na tela mexia neles: a partida corria
   *  sempre no mesmo ritmo, e dirigir era só assistir. Agora é decisão sua:
   *
   *    cima      cria muito mais e toma muito mais. Cansa o time.
   *    equilibrio o seu modelo de jogo, sem adição nenhuma.
   *    segurar    fecha atrás e entrega a bola — mas quem se fecha ataca melhor
   *               no contra-ataque, e disso o motor já cuidava sozinho.
   */
  POSTURAS = {
    cima: { atq: 1.42, def: 0.78, nome: 'Ir para cima',
      texto: 'O time inteiro sobe. Mais chance de gol dos dois lados.' },
    equilibrio: { atq: 1, def: 1, nome: 'Equilibrado',
      texto: 'De volta ao seu modelo de jogo.' },
    segurar: { atq: 0.66, def: 1.40, nome: 'Segurar o resultado',
      texto: 'Time recuado. Menos chance de tomar, e o que sobrar sai no contra-ataque.' },
  };

  mudarPostura(estado, modo) {
    const p = this.POSTURAS[modo];
    if (!p || estado.postura === modo) return null;
    estado.postura = modo;
    estado.atq = p.atq;
    estado.def = p.def;
    // subir o time o jogo inteiro cobra o seu preço no fôlego
    estado.gastoExtra = (estado.gastoExtra || 0) + (modo === 'cima' ? 1 : 0);
    const ev = { minute: estado.minuto, side: 'tatica',
      texto: `${p.nome}. ${p.texto}` };
    estado.eventos.push(ev);
    return ev;
  }

  // avança N minutos do jogo ao vivo e devolve o que aconteceu
  avancarPartida(estado, minutos = 1) {
    const novos = [];
    for (let i = 0; i < minutos && estado.minuto < 90; i++) {
      estado.minuto++;
      const m = estado.minuto;
      // CONTRA-ATAQUE. Recuar não pode ser só "sofrer menos" — no futebol quem se
      // fecha cria MENOS vezes, mas cria MELHOR, com o adversário exposto. Times de
      // transição rápida (tempo alto, posse baixa) aproveitam mais esse espaço.
      const t = this.tacticOf(estado.u);
      const vocacao = 0.5 + (t.tempo || 0.5) * 0.6 - (t.poss || 0.5) * 0.35;
      const espaco = Math.max(0, (estado.def || 1) - 1);          // o quanto você recuou
      const contra = 1 + espaco * vocacao * 0.9;
      const pU = (estado.xgU * estado.atq * contra) / 90;
      const pO = (estado.xgO / Math.max(0.4, estado.def)) / 90;

      // FINALIZAÇÕES E ESCANTEIOS. As taxas antigas davam 5 finalizações suas e 3 do
      // adversário numa partida inteira, e 1,6 escanteio — no futebol de verdade são
      // uns 12 e uns 5 por time. Jogando, o placar ficava 0 a 1 com o adversário
      // tendo ZERO finalização, porque o gol também não contava como uma.
      if (Math.random() < pU * 8.5) estado.stats.chutesU++;
      if (Math.random() < pO * 8.5) estado.stats.chutesO++;
      if (Math.random() < pU * 3.6) estado.stats.escanteiosU++;
      if (Math.random() < pO * 3.6) estado.stats.escanteiosO++;

      // A POSSE respira. Era calculada uma vez, antes do apito, e ficava congelada
      // os 90 minutos — mandar o time para frente ou recuar não mudava nada nela.
      // Agora ela puxa para onde o jogo está sendo jogado: quem ataca e quem tem
      // modelo de posse fica com a bola; quem se fecha, entrega.
      const alvoPosse = clamp(estado.posseBase
        + (estado.atq - 1) * 22 - (estado.def - 1) * 16
        + ((t.poss || 0.5) - 0.5) * 18, 26, 74);
      estado.posse = Math.round(estado.posse + (alvoPosse - estado.posse) * 0.12);
      // O cartão vem da PRESSÃO do modelo de jogo, não da vontade de atacar. Antes
      // escalava com estado.atq, então mandar o time para frente aumentava a chance
      // de expulsão — e ir para cima era punido duas vezes.
      if (Math.random() < 0.004 + 0.005 * (this.tacticOf(estado.u).press || 0.5)) {
        estado.stats.cartoes++;
        const onzeC = bestEleven(estado.u, this._availLineup());
        const levou = onzeC[1 + Math.floor(Math.random() * (onzeC.length - 1))];
        if (levou && !levou.amareloNoJogo) {
          levou.amareloNoJogo = true;   // o cartao tem dono: o banco precisa saber quem esta pendurado
          novos.push({ minute: m, side: 'amarelo', texto: `Amarelo para ${levou.nome}.` });
        }
      }

      // CONSEQUÊNCIAS: lesão e expulsão acontecem, e você não pode fazer nada além
      // de aguentar. Jogar com dez muda o jogo — o ataque cai e a defesa sofre.
      if (!estado.expulso && Math.random() < 0.0006 + 0.0007 * (this.tacticOf(estado.u).press || 0.5)) {
        const onze = bestEleven(estado.u, this._availLineup());
        const vitima = onze[1 + Math.floor(Math.random() * (onze.length - 1))];
        estado.expulso = vitima.nome;
        // Guarda QUE vaga ficou vazia: e disso que o banco precisa para saber se o
        // buraco e atras (e entao repor a defesa) ou na frente.
        const iVaga = (this.lineupIds || []).indexOf(vitima.id);
        const slotsAgora = slotsDaFormacao(this.formation);
        estado.vagaVazia = iVaga >= 0 && slotsAgora[iVaga] ? slotsAgora[iVaga].sub : (vitima.sub || vitima.posicao);
        estado.atq *= 0.62; estado.def *= 0.72;
        vitima.suspenso = (vitima.suspenso || 0) + 1;
        novos.push({ minute: m, side: 'vermelho', texto: `${vitima.nome} expulso! Você joga com dez.` });
      }
      if (!estado.lesionado && Math.random() < 0.0012) {
        const onze = bestEleven(estado.u, this._availLineup());
        const vitima = onze[Math.floor(Math.random() * onze.length)];
        const l = sortearLesao(Math.random() < 0.08);
        vitima.lesao = l.rodadas; vitima.lesaoNome = l.nome; vitima.lesaoSemanas = l.semanas;
        estado.lesionado = vitima.nome;
        // QUEM SE MACHUCA SAI DE CAMPO.
        //
        // Antes o jogador "sentia" a lesão e seguia jogando normalmente: o jogo só
        // tirava 10% do ataque. O Gustavo: "ele machucou e eu não precisei tirar ele
        // de campo — acho que eu teria que ter tirado". Agora ele sai mesmo. Se você
        // ainda tem substituição, o jogo pede a troca; se não tem, o time fica com
        // dez e o buraco pesa de verdade.
        // mesma convenção do expulso: `vagaVazia` é a SIGLA da vaga (é disso que o
        // banco precisa para saber se o buraco é atrás ou na frente). Quem é o
        // jogador vai em separado, para o painel já abrir com ele marcado.
        const iVagaL = (this.lineupIds || []).indexOf(vitima.id);
        const slotsL = slotsDaFormacao(this.formation);
        estado.vagaVazia = iVagaL >= 0 && slotsL[iVagaL]
          ? slotsL[iVagaL].sub : (vitima.sub || vitima.posicao);
        estado.lesionadoId = vitima.id;
        const temBanco = estado.subsRestantes > 0;
        estado.atq *= temBanco ? 0.92 : 0.8;
        estado.def *= temBanco ? 0.96 : 0.86;
        novos.push({ minute: m, side: 'lesao',
          texto: `${vitima.nome} sentiu: ${l.nome}. Fora por ${l.semanas} semanas.`
            + (temBanco ? ' Não tem como seguir — faça a substituição.' : ' Sem substituição: você joga com dez.') });
        if (temBanco) estado.sugestao = null;   // o painel do banco reabre para esta troca
      }

      const mexeu = this.substituicaoDaIA(estado);
      if (mexeu) { estado.eventos.push(mexeu); novos.push(mexeu); }

      // O SEU banco tambem le o jogo. Quando ve motivo, avisa uma vez — e quem
      // decide e voce. Nada de porcentagem: o recado e em linguagem de futebol.
      if (estado.subsRestantes > 0 && !estado.sugestao) {
        const ideia = this.leituraDoBanco(estado);
        if (ideia) {
          estado.sugestao = ideia;
          const ev = { minute: m, side: 'banco', texto: `O banco pede: ${ideia.motivo}.` };
          estado.eventos.push(ev); novos.push(ev);
        }
      }

      if (Math.random() < pU) {
        estado.ug++;
        estado.stats.chutesU++;      // todo gol é uma finalização

        const autor = this._sorteiaMarcador(estado.u, this._availLineup());
        const ev = { minute: m, side: 'user', scorer: autor.nome, assist: autor.assist };
        estado.eventos.push(ev); novos.push(ev);
      }
      if (Math.random() < pO) {
        estado.og++;
        estado.stats.chutesO++;

        const autor = this._sorteiaMarcador(estado.opp, null);
        const ev = { minute: m, side: 'opp', scorer: autor.nome, assist: autor.assist };
        estado.eventos.push(ev); novos.push(ev);
      }
    }
    return novos;
  }

  _sorteiaMarcador(club, lineupIds) {
    const onze = bestEleven(club, lineupIds);
    const peso = (p) => ({ A: 10, M: 5, L: 2, Z: 2, G: 0.05 }[p.posicao] || 3) * (p.forca / 70);
    const total = onze.reduce((s, p) => s + peso(p), 0) || 1;
    let r = Math.random() * total;
    let autor = onze[onze.length - 1];
    for (const p of onze) { r -= peso(p); if (r <= 0) { autor = p; break; } }
    const outros = onze.filter((p) => p !== autor && p.posicao !== 'G');
    const assist = Math.random() < 0.65 && outros.length
      ? outros[Math.floor(Math.random() * outros.length)].nome : null;
    return { nome: autor.nome, assist };
  }

  // as decisões que aparecem durante o jogo, conforme o placar e o minuto
  decisaoDaPartida(estado) {
    const feito = (k) => estado.decisoesFeitas.includes(k);
    const dif = estado.ug - estado.og;

    if (estado.minuto >= 45 && !feito('intervalo')) {
      return { chave: 'intervalo', titulo: 'Intervalo', txt: dif > 0
          ? `Você vence por ${estado.ug} a ${estado.og}. O que fala no vestiário?`
          : dif < 0 ? `Você perde por ${estado.ug} a ${estado.og}. O que fala no vestiário?`
            : `${estado.ug} a ${estado.og}. O que fala no vestiário?`,
        ops: [
          // ESTAS TRÊS SÃO A MESMA COISA QUE OS BOTÕES DE POSTURA da beira do
          // campo. Antes multiplicavam atq/def por fora, e os dois caminhos se
          // atropelavam: escolher "fecha atrás" no vestiário e depois apertar
          // "ir para cima" apagava a conta do intervalo sem avisar. Agora as
          // duas portas mexem no MESMO botão.
          { txt: 'Manda ir para cima', sub: 'Cria bem mais, mas deixa espaço atrás', postura: 'cima' },
          { txt: 'Mantém o plano', sub: 'Sem mudanças', postura: 'equilibrio' },
          { txt: 'Fecha atrás', sub: 'Sofre menos e joga no contra-ataque', postura: 'segurar' },
        ] };
    }
    if (estado.minuto >= 70 && dif < 0 && !feito('perdendo')) {
      return { chave: 'perdendo', titulo: 'Faltam 20 minutos',
        txt: 'Você está atrás no placar. Vai com tudo ou aceita o resultado?',
        ops: [
          { txt: 'Tudo no ataque', sub: 'Última cartada: muito perigo dos dois lados', atq: 1.85, def: 0.62 },
          { txt: 'Aumenta a pressão', sub: 'Mais volume, algum risco', atq: 1.34, def: 0.90 },
          { txt: 'Aceita e evita a goleada', sub: 'Segura o placar como está', atq: 0.8, def: 1.28 },
        ] };
    }
    // O JOGADOR QUE ESTÁ MORTO EM CAMPO, com nome e tudo. O Gustavo pediu isso duas
    // vezes: "que garoto? Nome, nacionalidade, posição. Sem isso não é decisão, é
    // botão". Aqui a decisão é sobre alguém de verdade, no meio do jogo.
    if (estado.minuto >= 62 && estado.subsRestantes > 0 && !feito('cansado')) {
      const emCampo = (this.lineupIds || [])
        .map((id) => estado.u.squad.find((p) => p.id === id)).filter(Boolean);
      // goleiro não sai por cansaço — isso não existe no futebol
      const morto = emCampo.filter((p) => (p.sub || p.posicao) !== 'GOL')
        .sort((a, b) => (a.energia || 100) - (b.energia || 100))[0];
      if (morto && (morto.energia || 100) < 55) {
        const vaga = morto.sub || morto.posicao;
        const banco = estado.u.squad.filter((p) => !(this.lineupIds || []).includes(p.id)
          && !p.lesao && !p.suspenso)
          .map((p) => ({ p, perda: penalidadeDePosicao(vaga, p.sub || p.posicao) }))
          .sort((a, b) => (a.perda - b.perda) || (b.p.forca - a.p.forca));
        const entra = banco.length ? banco[0].p : null;
        if (entra) {
          return { chave: 'cansado', titulo: `${morto.nome} está no limite`,
            txt: `${morto.nome} (${vaga}) está com ${Math.round(morto.energia)}% de energia. `
              + `${entra.nome} (${entra.sub || entra.posicao}, ${entra.forca}) está pronto no banco.`,
            ops: [
              { txt: `Tirar ${morto.nome}`, sub: `Entra ${entra.nome}`, atq: 1, def: 1,
                troca: { sai: morto.id, entra: entra.id } },
              { txt: 'Fica em campo', sub: 'Ele aguenta — e você guarda a substituição', atq: 0.97, def: 0.97 },
            ] };
        }
      }
    }
    if (estado.minuto >= 75 && dif > 0 && !feito('vencendo')) {
      return { chave: 'vencendo', titulo: 'Faltam 15 minutos',
        txt: 'Você está na frente. Segura o jogo ou vai buscar mais?',
        ops: [
          { txt: 'Segura o resultado', sub: 'Recua e espera o contra-ataque', atq: 0.62, def: 1.45 },
          { txt: 'Continua igual', sub: 'Sem mudanças', atq: 1, def: 1 },
          // O texto tem de bater com o PLACAR. Estava fixo em "busca o terceiro" e
          // aparecia num 1 a 0, onde o próximo gol é o segundo.
          { txt: 'Vai matar o jogo',
            sub: `Busca ${['o segundo', 'o terceiro', 'o quarto'][estado.ug - 1] || 'mais um'} e arrisca`,
            atq: 1.32, def: 0.88 },
        ] };
    }
    return null;
  }

  /** Quem pode sair e quem pode entrar, com a energia de cada um. */
  opcoesDeSubstituicao(estado) {
    const u = estado.u; const ids = this.lineupIds || [];
    const emCampo = ids.map((id) => u.squad.find((p) => p.id === id))
      .filter((p) => p && !estado.subsFeitas.some((x) => x.saiuId === p.id));
    const banco = u.squad.filter((p) => !ids.includes(p.id) && !p.lesao && !p.suspenso
      && !estado.subsFeitas.some((x) => x.entrouId === p.id));
    return { emCampo, banco };
  }

  /** Troca de verdade: mexe na escalação e RECALCULA a força em campo.
   *
   *  Sem recalcular, substituir seria teatro — o jogo seguiria com o mesmo número.
   */
  substituir(estado, saiId, entraId) {
    if (estado.subsRestantes <= 0) return { ok: false, msg: 'Você já fez as 5 substituições' };
    const u = estado.u;
    const sai = u.squad.find((p) => p.id === saiId);
    const entra = u.squad.find((p) => p.id === entraId);
    if (!sai || !entra) return { ok: false, msg: 'Jogador não encontrado' };
    const i = (this.lineupIds || []).indexOf(saiId);
    if (i < 0) return { ok: false, msg: `${sai.nome} não está em campo` };

    this.lineupIds = this.lineupIds.map((id) => (id === saiId ? entraId : id));
    estado.subsRestantes--;
    estado.subsFeitas.push({ saiuId: saiId, entrouId: entraId, minuto: estado.minuto });
    estado.sugestao = null;   // mexeu: o banco volta a olhar o jogo do zero

    // a força mudou: refaz a expectativa de gols do restante do jogo
    const uStr = this.strengthOf(u, this.lineupIds);
    const oStr = this.strengthOf(estado.opp);
    estado.xgU = expectedGoals(uStr, this.tacticOf(u), oStr, this.tacticOf(estado.opp), estado.casa ? 4 : 0);
    estado.xgO = expectedGoals(oStr, this.tacticOf(estado.opp), uStr, this.tacticOf(u), estado.casa ? 0 : 4);
    // quem entra está inteiro: um empurrão curto de energia no time
    estado.atq *= 1.03;
    const ev = { minute: estado.minuto, side: 'sub',
      texto: ` Sai ${sai.nome}, entra ${entra.nome}` };
    estado.eventos.push(ev);
    return { ok: true, ev, forca: uStr };
  }

  /** O adversário também mexe no time dele. */
  /** A CABEÇA DO BANCO: o que um técnico faria agora, e por quê.
   *
   *  O Gustavo: "eu quero que a IA tenha a inteligência de mudar quando ela acha
   *  que deve. O zagueiro foi expulso, isso vai prejudicar o time, eu quero que
   *  ela tire algum jogador para repor a zaga." O exemplo é o zagueiro, mas o
   *  princípio é maior: a IA lê o jogo — quem saiu, que buraco ficou, o placar,
   *  o relógio, quem está morto de cansaço, quem está pendurado — e mexe quando
   *  tem motivo. Não é sorteio por minuto.
   *
   *  Devolve {saiId, entraId, motivo} ou null quando não há razão para mexer.
   */
  leituraDoBanco(estado) {
    if (estado.subsRestantes <= 0) return null;
    const u = estado.u;
    const { emCampo, banco } = this.opcoesDeSubstituicao(estado);
    if (!banco.length || emCampo.length < 7) return null;

    const slots = slotsDaFormacao(this.formation);
    const ids = this.lineupIds || [];
    const vagaDe = (p) => { const i = ids.indexOf(p.id); return i >= 0 && slots[i] ? slots[i].sub : (p.sub || p.posicao); };
    const dif = estado.ug - estado.og;
    const m = estado.minuto;

    // Quem no banco melhor resolve uma vaga: overall menos o que perde fora de posição.
    const melhorPara = (sub, filtro) => {
      const bons = banco.filter((p) => (!filtro || filtro(p)))
        .map((p) => ({ p, nota: p.forca - penalidadeDePosicao(sub, p.sub || p.posicao) }))
        .sort((a, b) => b.nota - a.nota);
      return bons.length ? bons[0] : null;
    };

    // 1. BURACO NA LINHA. Um expulso deixa uma vaga vazia, e o resto do time
    //    escorrega para tapar. Se o buraco é atrás e o jogo não exige risco, o
    //    técnico tira um homem de frente e põe gente na posição. É a troca mais
    //    comum do futebol e é exatamente o caso que o Gustavo descreveu.
    if (estado.expulso && !estado.reorganizou) {
      const vazia = estado.vagaVazia;
      const atras = vazia === 'ZAG' || vazia === 'LE' || vazia === 'LD' || vazia === 'VOL';
      // perdendo no fim, ninguém tira atacante para pôr zagueiro
      const aguentaPerderUmDeFrente = !(dif < 0 && m > 70);
      if (atras && aguentaPerderUmDeFrente) {
        const entra = melhorPara(vazia, (p) => ['ZAG', 'LE', 'LD', 'VOL'].includes(p.sub || p.posicao));
        const frente = emCampo.filter((p) => ['ATA', 'PE', 'PD', 'MEI'].includes(vagaDe(p)))
          .sort((a, b) => a.forca - b.forca)[0];
        if (entra && frente) {
          estado.reorganizou = true;
          return { saiId: frente.id, entraId: entra.p.id,
            motivo: `com um a menos, o time se fecha: sai ${frente.nome} e entra ${entra.p.nome} para tapar o buraco na ${vazia === 'VOL' ? 'proteção' : 'defesa'}` };
        }
      }
    }

    // 2. GENTE FORA DE POSIÇÃO. Se alguém está jogando onde não é dele e existe no
    //    banco quem é daquela vaga, o técnico arruma — não interessa o minuto.
    const torto = emCampo
      .map((p) => ({ p, vaga: vagaDe(p), perda: penalidadeDePosicao(vagaDe(p), p.sub || p.posicao) }))
      .filter((x) => x.perda >= 6)
      .sort((a, b) => b.perda - a.perda)[0];
    if (torto) {
      const certo = banco.filter((p) => (p.sub || p.posicao) === torto.vaga)
        .sort((a, b) => b.forca - a.forca)[0];
      if (certo && certo.forca >= torto.p.forca - 6) {
        return { saiId: torto.p.id, entraId: certo.id,
          motivo: `${torto.p.nome} estava improvisado na ${torto.vaga}; entra ${certo.nome}, que é da posição` };
      }
    }

    // 3. PERNAS. Depois dos 60, quem está no fim da energia sai — e sai por alguém
    //    da mesma vaga, não pelo melhor overall do banco.
    const espera = estado.paciencia || 66;
    if (m >= espera - 6) {
      const morto = emCampo.filter((p) => (p.energia || 100) < 58)
        .sort((a, b) => (a.energia || 100) - (b.energia || 100))[0];
      if (morto) {
        const entra = melhorPara(vagaDe(morto));
        if (entra) return { saiId: morto.id, entraId: entra.p.id,
          motivo: `${morto.nome} não tem mais pernas; entra ${entra.p.nome}` };
      }
    }

    // 4. PENDURADO. Quem está com amarelo e o jogo pegando fogo é risco de deixar
    //    o time com dez. Técnico tira.
    if (m >= espera && Math.abs(dif) <= 1) {
      const risco = emCampo.filter((p) => p.amareloNoJogo)
        .sort((a, b) => a.forca - b.forca)[0];
      if (risco) {
        const entra = melhorPara(vagaDe(risco));
        if (entra) return { saiId: risco.id, entraId: entra.p.id,
          motivo: `${risco.nome} está pendurado e o jogo está quente; entra ${entra.p.nome}` };
      }
    }

    // 5. O PLACAR. Perdendo no fim, entra gente de ataque no lugar de gente de trás.
    //    Ganhando no fim, o contrário. Só se houver alguém melhor para aquilo.
    if (m >= espera + 3) {
      if (dif < 0) {
        const atacante = banco.filter((p) => ['ATA', 'PE', 'PD', 'MEI'].includes(p.sub || p.posicao))
          .sort((a, b) => b.forca - a.forca)[0];
        const defensivo = emCampo.filter((p) => ['ZAG', 'VOL'].includes(vagaDe(p)))
          .sort((a, b) => a.forca - b.forca)[0];
        if (atacante && defensivo) return { saiId: defensivo.id, entraId: atacante.id,
          motivo: `precisa do gol: sai ${defensivo.nome} e entra ${atacante.nome}` };
      } else if (dif > 0) {
        const seguro = banco.filter((p) => ['ZAG', 'VOL', 'LE', 'LD'].includes(p.sub || p.posicao))
          .sort((a, b) => b.forca - a.forca)[0];
        const solto = emCampo.filter((p) => ['ATA', 'PE', 'PD'].includes(vagaDe(p)))
          .sort((a, b) => a.forca - b.forca)[0];
        if (seguro && solto) return { saiId: solto.id, entraId: seguro.id,
          motivo: `segurando o resultado: sai ${solto.nome} e entra ${seguro.nome}` };
      }
    }
    return null;
  }

  substituicaoDaIA(estado) {
    if (estado.minuto < 55 || estado.iaMexeu >= 2) return null;
    if (Math.random() > 0.035) return null;
    const dif = estado.og - estado.ug;
    estado.iaMexeu = (estado.iaMexeu || 0) + 1;
    // perdendo, o adversário se lança; ganhando, ele se fecha
    if (dif < 0) { estado.xgO *= 1.12; estado.def *= 0.97;
      return { minute: estado.minuto, side: 'sub', texto: ` ${estado.opp.name} coloca mais um atacante` }; }
    if (dif > 0) { estado.xgO *= 0.93;
      return { minute: estado.minuto, side: 'sub', texto: ` ${estado.opp.name} recua e segura o resultado` }; }
    estado.xgO *= 1.05;
    return { minute: estado.minuto, side: 'sub', texto: ` ${estado.opp.name} mexe no meio-campo` };
  }

  aplicarDecisaoDaPartida(estado, decisao, indice) {
    const op = decisao.ops[indice];
    // decisão de postura manda no mesmo lugar que os botões da beira do campo
    if (op.postura) this.mudarPostura(estado, op.postura);
    else { estado.atq *= (op.atq != null ? op.atq : 1); estado.def *= (op.def != null ? op.def : 1); }
    estado.decisoesFeitas.push(decisao.chave);
    // decisão que troca jogador faz a troca de verdade, sem abrir outro painel
    if (op.troca) {
      const r = this.substituir(estado, op.troca.sai, op.troca.entra);
      if (r.ok) return op;
    }
    estado.eventos.push({ minute: estado.minuto, side: 'info', texto: op.txt });
    return op;
  }

  finalizarPartidaAoVivo(estado) {
    // quem mandou o time para cima gastou mais do que uma partida normal: a conta
    // chega no fôlego, depois do apito
    this._gastoDaPartida = estado.gastoExtra || 0;
    // Jogo de copa: o placar que ele fez em campo entra na fase, e a fase acontece.
    if (estado.copa) {
      this.definirPlacarDeCopa(estado.ug, estado.og);
      this._processUserSquadPostMatch(true);
      this._elencoJaProcessado = true;   // o dia de copa não pode contar de novo
      return this.simulateUserResult();
    }
    // mesma trava do começo: se hoje é dia de copa, o resultado não entra na liga
    const hoje = this.compromissoDeHoje();
    if (hoje && hoje.tipo === 'copa') return this.simulateUserResult();
    return this._applyUserRound(estado.ug, estado.og);
  }

  finishUserMatch(userGoals, oppGoals) { return this._applyUserRound(userGoals, oppGoals); }

  standingsSorted() {
    return Object.values(this.table).sort((a, b) => b.pts - a.pts || (b.gp - b.gc) - (a.gp - a.gc) || b.gp - a.gp);
  }
  userPosition() { return this.standingsSorted().findIndex((r) => r.id === this.userClubId) + 1; }
  nClubs() { return this.clubesDaTabela().length; }

  topScorers(n = 15) { return this.activeClubs().flatMap((c) => c.squad.map((p) => ({ p, club: c }))).filter((x) => x.p.gols > 0).sort((a, b) => b.p.gols - a.p.gols).slice(0, n); }
  topAssists(n = 15) { return this.activeClubs().flatMap((c) => c.squad.map((p) => ({ p, club: c }))).filter((x) => x.p.assist > 0).sort((a, b) => b.p.assist - a.p.assist).slice(0, n); }

  // ---- Tabela simulada de uma competição inteira (para as ligas que o usuário não joga) ----
  // Tabela de OUTRA liga.
  //
  // Duas coisas estavam erradas: a temporada inteira era sorteada na hora (a Coreia
  // aparecia terminada na 1ª rodada da sua) e o sorteio era novo a cada abertura da
  // tela (a tabela mudava se você saísse e voltasse). Agora a temporada é simulada
  // UMA vez, de forma determinística pela temporada, e o que se mostra é a fração de
  // rodadas que VOCÊ já jogou.
  /** Classificação FINAL da temporada passada de um campeonato.
   *
   *  É por ela que se entra na Champions, e não pela força do elenco — "quem
   *  classifica?" foi pergunta do Gustavo e ele tem razão: quem vai é quem terminou
   *  bem, não quem tem o elenco mais caro. Na temporada 1 não existe passado, então
   *  ela é simulada com a MESMA semente de sempre: é sempre a mesma "temporada
   *  anterior", e não um sorteio novo a cada abertura de tela. */
  _classificacaoAnterior(comp) {
    const t = this.season - 1;
    this._cacheAnterior = this._cacheAnterior || {};
    const chave = comp.id + ':' + t;
    if (!this._cacheAnterior[chave]) {
      const semente = (comp.id * 7919 + t * 104729) >>> 0;
      this._cacheAnterior[chave] = this._simTableFull(comp.clubIds, semente);
    }
    return this._cacheAnterior[chave];
  }

  _simTable(compId) {
    const comp = typeof compId === 'object' ? null : this.compById(compId);
    const clubIds = comp ? comp.clubIds : compId;   // aceita a chamada antiga
    const chave = (comp ? comp.id : 'x') + ':' + this.season;
    this._tabelaCache = this._tabelaCache || {};

    if (!this._tabelaCache[chave]) {
      const semente = ((comp ? comp.id : 0) * 7919 + this.season * 104729) >>> 0;
      this._tabelaCache[chave] = this._simTableFull(clubIds, semente);
    }
    const cheia = this._tabelaCache[chave];
    const total = this.totalRounds() || 38;
    const frac = Math.max(0, Math.min(1, this.round / total));
    return cheia.map((r) => ({
      id: r.id, j: Math.round(r.j * frac),
      pts: Math.round(r.pts * frac), gp: Math.round(r.gp * frac), gc: Math.round(r.gc * frac),
    }));
  }

  _simTableFull(clubIds, semente) {
    // gerador com semente, para a mesma liga na mesma temporada dar sempre o mesmo
    let x = semente || 1;
    const rng = () => { x |= 0; x = (x + 0x6D2B79F5) | 0;
      let t = Math.imul(x ^ (x >>> 15), 1 | x); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const original = Math.random;
    Math.random = rng;
    try {
      const t = {}; clubIds.forEach((id) => t[id] = { id, pts: 0, j: 0, gp: 0, gc: 0 });
      for (let i = 0; i < clubIds.length; i++) for (let j = 0; j < clubIds.length; j++) {
        if (i === j) continue; const H = this.clubById(clubIds[i]), A = this.clubById(clubIds[j]);
        if (!H || !A) continue;
        const tH = this.tacticOf(H), tA = this.tacticOf(A), sH = this.strengthOf(H), sA = this.strengthOf(A);
        const gh = poisson(expectedGoals(sH, tH, sA, tA, 4)), ga = poisson(expectedGoals(sA, tA, sH, tH, 0));
        const HH = t[H.id], AA = t[A.id];
        HH.gp += gh; HH.gc += ga; HH.j++; AA.gp += ga; AA.gc += gh; AA.j++;
        if (gh > ga) HH.pts += 3; else if (gh < ga) AA.pts += 3; else { HH.pts++; AA.pts++; }
      }
      return Object.values(t).sort((a, b) => b.pts - a.pts || (b.gp - b.gc) - (a.gp - a.gc));
    } finally { Math.random = original; }
  }

  // quantos sobem/descem entre duas divisões (depende do tamanho)
  // Quantos sobem e descem entre duas divisões. Antes era uma conta pelo tamanho das
  // ligas — sempre "só o primeiro" nas menores. Agora segue a regra REAL de cada país
  // (ver paises.js): 4 no Brasil, 3 na Inglaterra, 2 na Alemanha, nenhum na MLS.
  _movesK(a, b, pais) {
    const [sobem, caem] = vagasDeAcesso(pais || (this.userClub() ? this.userClub().country : ''));
    const limite = Math.max(0, Math.floor(Math.min(a, b) / 3));
    return Math.max(0, Math.min(Math.max(sobem, caem), limite));
  }
  vagasDoPais(pais) { return vagasDeAcesso(pais || (this.userClub() ? this.userClub().country : '')); }

  // divisão imediatamente ACIMA / ABAIXO no mesmo país
  _neighborComp(comp, dir) {
    return this.competitions().find((c) => c.country === comp.country && c.tier === comp.tier + dir);
  }
  relegationCount() { const b = this._neighborComp(this.userCompObj(), +1); return b ? Math.min(this.vagasDoPais()[1], this._movesK(this.userCompObj().clubIds.length, b.clubIds.length)) : 0; }
  promotionCount() { const a = this._neighborComp(this.userCompObj(), -1); return a ? Math.min(this.vagasDoPais()[0], this._movesK(this.userCompObj().clubIds.length, a.clubIds.length)) : 0; }

  // melhor jogador da temporada (gols, assistências, overall e títulos)
  // BOLA DE OURO — o mundo inteiro, não só a sua liga.
  //
  // Antes só varria activeClubs(), por isso o prêmio saía para um atacante da sua
  // competição mesmo quando havia gente muito melhor na Europa. Agora: na sua liga
  // valem os números REAIS da temporada; fora dela, a produção é estimada pelo
  // overall e pelo nível da liga — e o peso da liga entra na conta, porque marcar 25
  // na Premier League não é a mesma coisa que marcar 25 na quarta divisão.
  _ballonDor() {
    const champId = this.standingsSorted()[0].id;
    const cupWins = new Set(this.cupsList().filter((c) => c.winner).map((c) => c.winner));

    // força média de cada competição, para saber o peso da liga
    if (!this._nivelComp || this._nivelCompSeason !== this.season) {
      this._nivelComp = {};
      this._nivelCompSeason = this.season;
      for (const comp of this.competitions()) {
        const cls = this.clubsOfComp(comp.id);
        this._nivelComp[comp.id] = cls.length ? cls.reduce((a, c) => a + this.strengthOf(c), 0) / cls.length : 60;
      }
    }

    let best = null, bs = -1;
    for (const c of this.clubs()) {
      const naMinha = c.comp === this.userComp;
      const nivel = this._nivelComp[c.comp] || 60;
      // liga forte pesa MUITO: Bola de Ouro sai da Europa, não da segunda divisão
      // O peso da liga estava fraco demais: um 86 da Turquia com 41 gols estimados
      // ganhava de um 90 da Premier League. Bola de Ouro sai de onde se joga o
      // futebol mais difícil.
      const pesoLiga = Math.max(0, (nivel - 62)) ** 1.6 * 2.2;
      for (const p of c.squad) {
        if (p.forca < 80) continue;                        // ninguém abaixo disso concorre
        let gols, assist;
        if (naMinha) { gols = p.gols; assist = p.assist; }
        else {
          // estimativa determinística: mesmo jogador, mesma temporada, mesmo número
          const r = ((p.id * 2654435761 + this.season * 40503) % 1000) / 1000;
          // o quanto ele está acima da média da liga, com teto — sem isso um 85 numa
          // liga fraca virava 70 gols na temporada
          const acima = Math.max(0, Math.min(18, p.forca - nivel));
          const base = { A: 0.62, M: 0.28, L: 0.10, Z: 0.06, G: 0 }[p.posicao] || 0.2;
          const rend = Math.max(0.35, Math.min(1.8, 0.55 + acima / 15));
          gols = Math.round(32 * base * rend * (0.7 + r * 0.6));
          assist = Math.round(gols * 0.5 * (0.6 + r * 0.8));
        }
        const titulos = (cupWins.has(c.id) ? 6 : 0) + (champId === c.id ? 6 : 0);
        const s = gols * 4 + assist * 2 + p.forca * 1.4 + pesoLiga + titulos;
        if (s > bs) {
          bs = s;
          // POR QUE ELE. O Gustavo: "por que o Osimhen foi Bola de Ouro? Foi pelos
          // números? Mas como foi o Galatasaray na Champions? Nem fala". Agora o
          // prêmio vem com a razão dele.
          const taca = this.cupsList().find((cp) => cp.winner === c.id);
          const porques = [];
          porques.push(`${gols} gols e ${assist} assistências`);
          if (champId === c.id) porques.push(`campeão de ${(this.userCompObj() || {}).name || 'sua liga'}`);
          if (taca) porques.push(`campeão da ${taca.name}`);
          porques.push(`overall ${p.forca} ${naMinha ? 'na sua liga' : `na ${c.league}`}`);
          best = { nome: p.nome, club: c.name, liga: c.league, gols, assist, forca: p.forca,
            porque: porques.join(' · '), titulo: taca ? taca.name : null };
        }
      }
    }
    return best;
  }

  // Como o mundo terminou a temporada: campeão de cada liga grande e o campeão
  // continental europeu, porque quem treina no Brasil também quer saber quem ganhou
  // a Champions.
  /** O que a temporada pagou: posição na liga, campanhas de copa e títulos. */
  _premiacao(comp, finish) {
    const clubes = this.clubsOfComp(comp.id);
    const bolo = clubes.length
      ? clubes.reduce((t, c) => t + this._valorDoElenco(c), 0) / clubes.length * 0.035 : 200000;
    const n = Math.max(2, clubes.length);
    const liga = Math.round(bolo * (0.3 + 1.2 * (1 - (Math.min(finish, n) - 1) / (n - 1))));
    const itens = [{ o: `${finish}º no ${comp.name}`, v: liga }];
    let copas = 0;
    for (const cup of this.cupsList()) {
      const fases = (cup.results || []).filter((r) => (r.pairs || []).some(
        (x) => x.a === this.userClubId || x.b === this.userClubId)).length;
      if (!fases) continue;
      const peso = cup.kind === 'cont' ? 0.09 : (cup.kind === 'cont2' || cup.kind === 'cont3') ? 0.05
        : cup.kind === 'estadual' ? 0.01 : 0.03;
      const venceu = cup.winner === this.userClubId;
      const v = Math.round(bolo * peso * fases + (venceu ? bolo * 0.35 : 0));
      if (v > 0) { copas += v; itens.push({ o: cup.name + (venceu ? ' (campeão)' : ''), v }); }
    }
    return { total: liga + copas, liga, copas, itens };
  }

  /** O que ESTE modelo faz, em gols esperados contra um adversário igual a você.
   *
   *  O Gustavo: "14 modelos de jogo, 11 formações, 3 posturas e 6 barras, sem
   *  nenhuma orientação de qual escolher nem do que muda". As barras diziam o que o
   *  modelo É; isto diz o que ele FAZ — e sai do mesmo motor que decide a partida,
   *  não de um texto bonito. */
  previaDoModelo(key) {
    const u = this.userClub();
    const meu = tacticByKey(key) || this.tacticOf(u);
    const neutro = tacticByKey('wm');
    const f = this.strengthOf(u, this.lineupIds);
    return { cria: expectedGoals(f, meu, f, neutro, 0), sofre: expectedGoals(f, neutro, f, meu, 0) };
  }

  /** COMO VÃO AS SUAS COMPETIÇÕES, em uma linha cada.
   *
   *  O Gustavo: "se eu estou jogando o Campeonato Paulista, seria legal que o painel
   *  me mostrasse como está sendo o Paulista — e isso para todos os campeonatos que
   *  eu estiver jogando". */
  minhasCompeticoes() {
    const out = [];
    for (const cup of this.cupsList()) {
      const inscrito = cup.entradas
        ? cup.entradas.some((e) => e.includes(this.userClubId))
        : (cup.alive || []).includes(this.userClubId);
      const jogou = (cup.results || []).some((r) => (r.pairs || []).some(
        (x) => x.a === this.userClubId || x.b === this.userClubId)
        || (r.meusJogos || []).length);
      if (!inscrito && !jogou) continue;
      const vivo = (cup.alive || []).includes(this.userClubId);
      const campeao = cup.winner === this.userClubId;
      // posição no grupo, quando a fase de grupos está rolando
      let grupo = null;
      const gs = cup.grupos;
      if (gs) {
        const meu = gs.find((g) => g.some((r) => r.id === this.userClubId));
        if (meu) {
          const pos = meu.findIndex((r) => r.id === this.userClubId) + 1;
          const linha = meu[pos - 1];
          grupo = { pos, de: meu.length, pts: linha.pts, j: linha.j,
            passam: (cup.formatoFaseFeita && cup.formatoFaseFeita.avancam_por_grupo)
              || (cup.formatoFase && cup.formatoFase.avancam_por_grupo) || 2 };
        }
      }
      // "Eliminado" só vale para quem ENTROU. Antes de a sua fase chegar, o certo é
      // dizer que você ainda entra — a Libertadores aparecia como eliminada na
      // primeira semana do ano.
      const entraEm = cup.entradas
        ? cup.entradas.findIndex((e) => e && e.includes(this.userClubId)) : 0;
      const aindaNaoEntrou = entraEm > cup.stage;
      out.push({
        nome: cup.name, tag: cup.tag || '', aindaNaoEntrou,
        entraNa: aindaNaoEntrou ? cup.stages[entraEm] : null,
        fase: cup.stages[Math.min(cup.stage, cup.stages.length - 1)],
        campeao, vivo, grupo,
        campeaoNome: cup.winner ? (this.clubById(cup.winner) || {}).name : null,
        proximo: (this.agenda || []).findIndex((d, i) => i >= this.dia && d.tipo === 'copa'
          && this.cupsList()[d.cup] === cup),
      });
    }
    return out;
  }

  /** ARTILHARIA DE QUALQUER COMPETIÇÃO que você disputa.
   *
   *  O Gustavo: "eu quero ver como está a artilharia do Paulistão, e como está o meu
   *  elenco naquele campeonato". Os gols agora sabem onde foram feitos, então basta
   *  ler por competição. */
  competicoesComGol() {
    const nomes = new Set();
    for (const c of this.clubs()) for (const p of c.squad) {
      for (const k of Object.keys(p.golsComp || {})) nomes.add(k);
    }
    const minha = (this.userCompObj() || {}).name;
    const ordem = [minha, ...this.cupsList().map((c) => c.name)];
    return [...nomes].sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b));
  }

  artilhariaDe(nomeComp, n = 15) {
    const linhas = [];
    for (const c of this.clubs()) {
      for (const p of c.squad) {
        const g = (p.golsComp || {})[nomeComp] || 0;
        const a = (p.assistComp || {})[nomeComp] || 0;
        if (g || a) linhas.push({ p, club: c, gols: g, assist: a });
      }
    }
    return {
      gols: linhas.filter((x) => x.gols).sort((x, y) => y.gols - x.gols).slice(0, n),
      assist: linhas.filter((x) => x.assist).sort((x, y) => y.assist - x.assist).slice(0, n),
    };
  }

  /** O seu elenco inteiro em números: jogos, nota média, gols e assistências. */
  resumoDoElenco() {
    return (this.userClub().squad || []).map((p) => ({
      nome: p.nome, sub: p.sub || p.posicao, idade: p.idade, forca: p.forca,
      jogos: p.jogos || 0, gols: p.gols || 0, assist: p.assist || 0,
      nota: p.jogosComNota ? Math.round((p.somaNotas / p.jogosComNota) * 10) / 10 : null,
      golsComp: p.golsComp || {}, assistComp: p.assistComp || {}, jogosComp: p.jogosComp || {},
    })).sort((a, b) => (b.jogos - a.jogos) || (b.gols - a.gols));
  }

  _resumoDoMundo() {
    // As cinco grandes mais Brasil e Portugal. O Gustavo: "na Holanda, eu acho que
    // pode tirar, não me importo com quem ganhou o campeonato da Holanda. Tira a
    // Argentina também. Coloca as top cinco ligas, o brasileiro e Portugal."
    const grandes = ['Inglaterra', 'Espanha', 'Itália', 'Alemanha', 'França',
      'Brasil', 'Portugal'];
    const ligas = [];
    for (const pais of grandes) {
      const comp = this.competitions().find((c) => c.country === pais && c.tier === 1);
      if (!comp) continue;
      const tab = comp.id === this.userComp ? this.standingsSorted() : this._simTable(comp.id);
      if (!tab.length) continue;
      const campeao = this.clubById(tab[0].id);
      if (campeao) ligas.push({ pais, liga: comp.name, campeao: campeao.name, campeaoId: campeao.id });
    }

    // O CAMPEÃO DA CHAMPIONS É O CAMPEÃO DA CHAMPIONS. Aqui era um SORTEIO entre os
    // melhores clubes da Europa, e por isso o resumo dizia Tottenham, a aba Copa
    // dizia PSG e a lista de campeões dizia Liverpool — três respostas para a mesma
    // pergunta, como o Gustavo pegou. Agora vem da competição que aconteceu.
    const liga3 = this.cupsList().find((c) => /champions/i.test(c.name) || c.kind === 'cont');
    const champions = liga3 && liga3.winner ? (this.clubById(liga3.winner) || {}).name
      : (this.campeoes || {})['Champions League'] ? (this.clubById(this.campeoes['Champions League']) || {}).name
      : null;
    return { ligas, champions };
  }
  // seleção da temporada, revelação e melhor goleiro (da sua competição)
  _awards() {
    const all = this.activeClubs().flatMap((c) => c.squad.map((p) => ({ p, club: c.name })));
    const sc = (x) => x.p.gols * 4 + x.p.assist * 2 + x.p.forca * 0.2;
    const byPos = (pos, n) => all.filter((x) => x.p.posicao === pos).sort((a, b) => sc(b) - sc(a)).slice(0, n).map((x) => `${x.p.nome} (${x.club})`);
    const gk = all.filter((x) => x.p.posicao === 'G').sort((a, b) => b.p.forca - a.p.forca)[0];
    const young = all.filter((x) => x.p.idade <= 21).sort((a, b) => sc(b) - sc(a))[0];
    return {
      eleven: [...byPos('G', 1), ...byPos('Z', 2), ...byPos('L', 2), ...byPos('M', 3), ...byPos('A', 3)],
      goleiro: gk ? `${gk.p.nome} (${gk.club})` : null,
      revelacao: young ? `${young.p.nome}, ${young.p.idade}a (${young.club})` : null,
    };
  }

  // ---- Meta da diretoria ----
  _setObjective() {
    const pos = this.userPosition ? 0 : 0; const n = this.nClubs();
    const strengthRank = this.activeClubs().slice().sort((a, b) => avgForca(bestEleven(b)) - avgForca(bestEleven(a))).findIndex((c) => c.id === this.userClubId) + 1;
    // meta = terminar perto (ou melhor) do que a força sugere
    let target = Math.max(1, Math.min(n, strengthRank + 2));
    if (this.userCompObj().tier > 1) target = Math.min(n, this.promotionCount() + 2 || 4); // divisões inferiores: buscar acesso

    // Para o clube fraco a meta virava "top 20" num campeonato de 20 clubes — uma
    // meta que ninguém consegue falhar, e o jogo ainda demitia por rebaixamento
    // dizendo "terminou em 20º, meta era top 20". A pior meta possível é ESCAPAR:
    // terminar acima da zona de rebaixamento.
    const caem = this.relegationCount();
    const fugir = Math.max(1, n - caem);
    if (caem > 0) target = Math.min(target, fugir);
    // "Terminar no top 12" num campeonato de 12 clubes não é meta, é piada — e era
    // o que aparecia na Suíça, onde o jogo não tem divisão de baixo para rebaixar.
    if (target >= n) target = Math.max(1, n - 1);
    this.objective = { target, n, tier: this.userCompObj().tier, ehFuga: caem > 0 && target === fugir };
  }

  // ---- Evolução dos jogadores + base + contratos (todos os clubes) ----
  // Virada de temporada: envelhece o mundo (ver evolution.js) e guarda os destaques.
  _progressPlayers() {
    const r = ageWorldOneYear(this, { userClubId: this.userClubId, market: this.league.market });
    // O mercado de agentes livres só crescia: 5.000 nomes depois de três temporadas,
    // quase todos sem interesse nenhum. Fica quem tem nível ou juventude para alguém
    // querer — o resto pendura as chuteiras, como na vida.
    if (this.league.market.length > 600) {
      this.league.market.sort((a2, b2) => (b2.forca + (b2.idade <= 23 ? 6 : 0))
        - (a2.forca + (a2.idade <= 23 ? 6 : 0)));
      this.league.market.length = 600;
    }
    this.evolucaoNews = r.destaques;
    this.lastAging = { aposentados: r.aposentados, regens: r.regens };
    return r;
  }

  _youthPlayer(club) { return youthPlayer(avgForca(bestEleven(club)), club.country); }

  /**
   * Salta N anos no mundo sem jogar nada. Usado pela ponte Carreira de Jogador →
   * Treinador: ao aposentar aos 38, o mundo precisa estar 22 anos mais velho.
   */
  advanceYears(years) { return advanceWorld(this, years, { userClubId: this.userClubId, market: this.league.market }); }

  // ano civil da temporada atual (temporada 1 = 2026)
  year() { return (this.startYear || 2026) + (this.season - 1); }

  // Mercado de transferências entre clubes da IA (compra/venda por caixa e necessidade)
  /** A JANELA DO MUNDO. O Gustavo: "teve poucas transferências, o mercado não teve
   *  impacto nenhum". Eram 60 tentativas e só umas 7 viravam negócio, porque o
   *  comprador precisava ter o valor INTEIRO em caixa — e, com o dinheiro
   *  arrumado, quase nenhum clube tem. Agora são muitas tentativas e o comprador
   *  pode parcelar, como no futebol. */
  /** QUEM QUER OS SEUS JOGADORES.
   *
   *  O mercado era de mão única: você comprava do mundo, e o mundo nunca vinha
   *  atrás do seu craque. Faltava a parte que dá peso a ter um bom jogador —
   *  segurar quem todo mundo quer, ou vender bem e reconstruir.
   *
   *  Quem faz proposta: clube mais forte que o seu, do mesmo país ou de um
   *  campeonato maior, e só por quem tem de fato valor de mercado.
   *  Quanto oferece: de 90% a 160% do valor justo. Abaixo de 100% é proposta
   *  para recusar; bem acima, é dinheiro que muda a sua temporada.
   */
  gerarPropostasPorMeusJogadores(quantas = 3) {
    const u = this.userClub();
    if (!u || !u.squad || u.squad.length <= 18) return [];
    const minhaForca = avgForca(bestEleven(u));

    // os seus melhores primeiro — ninguém faz proposta pelo terceiro goleiro
    const cobicados = u.squad
      .filter((p) => p.forca >= 68 && !p.emprestadoPara)
      .sort((a, b) => b.forca - a.forca)
      .slice(0, 10);
    if (!cobicados.length) return [];

    const compradores = this.clubs().filter((c) => {
      if (c.id === this.userClubId) return false;
      const f = avgForca(bestEleven(c));
      return f > minhaForca + 1 && c.squad.length < 32;
    });
    if (!compradores.length) return [];

    const propostas = [];
    const jaUsados = new Set();
    for (let i = 0; i < quantas * 4 && propostas.length < quantas; i++) {
      const p = cobicados[Math.floor(Math.random() * cobicados.length)];
      if (!p || jaUsados.has(p.id)) continue;
      // quanto melhor o jogador, mais provável que alguém venha
      const chance = 0.18 + Math.min(0.45, (p.forca - 68) * 0.035);
      if (Math.random() > chance) continue;
      const comprador = compradores[Math.floor(Math.random() * compradores.length)];
      const justo = valorJusto(p.forca, p.idade, p.potencial || p.forca);
      const fator = 0.9 + Math.random() * 0.7;
      const valor = Math.round(justo * fator);
      if (!comprador.caixa || comprador.caixa < valor * 0.5) continue;
      jaUsados.add(p.id);
      propostas.push({
        jogadorId: p.id, nome: p.nome, forca: p.forca, idade: p.idade,
        clubeId: comprador.id, clube: comprador.name,
        valor, justo, generosa: fator >= 1.25, baixa: fator < 1,
      });
    }
    return propostas;
  }

  /** Você aceita vender. Entra o dinheiro, sai o jogador. */
  aceitarPropostaPorMeuJogador(prop) {
    const u = this.userClub();
    const i = u.squad.findIndex((p) => p.id === prop.jogadorId);
    if (i < 0) return { ok: false, msg: 'Esse jogador não está mais no elenco.' };
    if (u.squad.length <= 18) return { ok: false, msg: 'O elenco ficaria curto demais para vender agora.' };
    const p = u.squad[i];
    const comprador = this.clubById(prop.clubeId);
    u.squad.splice(i, 1);
    u.caixa = (u.caixa || 0) + prop.valor;
    if (comprador) {
      comprador.squad.push(p);
      comprador.caixa = Math.max(0, (comprador.caixa || 0) - prop.valor);
    }
    // o elenco sente a saída de um dos melhores
    const eraDosMelhores = prop.forca >= Math.max(...u.squad.map((x) => x.forca), 0);
    this.moralElenco = clamp01((this.moralElenco != null ? this.moralElenco : 60)
      + (eraDosMelhores ? -6 : -2));
    this.lineupIds = (this.lineupIds || []).filter((id) => id !== prop.jogadorId);
    this._pushNews(`${p.nome} foi vendido ao ${prop.clube} por ${fmtMoneyBr(prop.valor)}.`);
    return { ok: true };
  }

  /** Você recusa. Dinheiro muito alto recusado azeda o jogador e o vestiário. */
  recusarPropostaPorMeuJogador(prop) {
    if (prop.generosa) {
      this.moralElenco = clamp01((this.moralElenco != null ? this.moralElenco : 60) - 4);
      this._pushNews(`${prop.nome} ficou incomodado: o clube recusou ${fmtMoneyBr(prop.valor)} do ${prop.clube}.`);
    } else {
      this._pushNews(`O clube recusou a proposta do ${prop.clube} por ${prop.nome}.`);
    }
    return { ok: true };
  }

  _runTransferWindow(n = 420) {
    const news = []; const clubs = this.clubs().filter((c) => c.id !== this.userClubId);
    const forcaDe = new Map(clubs.map((c) => [c.id, avgForca(bestEleven(c))]));
    for (let k = 0; k < n; k++) {
      const seller = clubs[Math.floor(Math.random() * clubs.length)];
      if (seller.squad.length <= 16) continue;
      const ranked = seller.squad.slice().sort((a, b) => b.forca - a.forca);
      const p = ranked[3 + Math.floor(Math.random() * Math.min(8, ranked.length - 3))];
      if (!p) continue;

      // O COMPRADOR TEM DE FAZER SENTIDO. Antes eram dois clubes sorteados no mundo
      // inteiro, e saía "Akron Tolyatti -> Maringá" e "Fortaleza -> Padova": um clube
      // russo vendendo para a Série C brasileira. Agora o jogador sobe de nível ou
      // troca de clube dentro do próprio país, que é o que acontece de verdade.
      const fs = forcaDe.get(seller.id) || 60;
      const entrada = Math.round(p.valorMercado * 0.5);   // metade agora, metade parcelada
      const candidatos = clubs.filter((b) => b !== seller && !this.elencoCheio(b)
        && b.caixa >= entrada
        && (b.country === seller.country || (forcaDe.get(b.id) || 0) >= fs + 3));
      if (!candidatos.length) continue;
      const buyer = candidatos[Math.floor(Math.random() * candidatos.length)];
      if (p.forca < (forcaDe.get(buyer.id) || 60) - 4) continue;  // compram p/ melhorar

      seller.squad = seller.squad.filter((x) => x !== p); buyer.squad.push(p);
      buyer.caixa -= entrada; seller.caixa += entrada;
      news.push({ p: p.nome, pos: p.sub || p.posicao, forca: p.forca, idade: p.idade,
        from: seller.name, fromId: seller.id, to: buyer.name, toId: buyer.id, val: p.valorMercado });
    }
    this.transferenciasDaJanela = news.length;
    news.sort((a, b) => b.val - a.val); this.transferNews = news.slice(0, 30);
  }

  _endSeason() {
    // AS PARCELAS DE QUEM VOCÊ VENDEU. Uma venda parcelada paga uma parte agora e o
    // resto nas temporadas seguintes; é aqui que a parcela do ano cai no caixa.
    const vencendo = (this.aReceber || []).filter((x) => x.temporada <= this.season + 1);
    if (vencendo.length) {
      const u = this.userClub();
      let soma = 0;
      for (const x of vencendo) { u.caixa += x.valor; soma += x.valor; }
      this.aReceber = (this.aReceber || []).filter((x) => x.temporada > this.season + 1);
      this._pushNews(`Entraram ${fmtMoneyBr(soma)} em parcelas de jogadores vendidos`);
      this._parcelasRecebidas = { total: soma, itens: vencendo };
    }

    // resolve as copas pendentes (inclui finais ignoradas)
    for (const cup of this.cupsList()) { while (!cup.winner) { if (this.userInCupFinalOf(cup)) this.finishCupFinal(cup, poisson(1.2), poisson(1.2)); else this._cupPlayStage(cup, false); } }
    this.cupFinalPending = null;
    const cupResults = this.cupsList().map((c) => ({ name: c.name, winner: c.winner ? (this.clubById(c.winner) || {}).name : null, userWon: c.winner === this.userClubId }));

    // GUARDA QUEM GANHOU O QUÊ, por id. A supercopa da temporada seguinte é entre o
    // campeão da liga e o campeão da copa, e sem o id não dá para montar o jogo.
    this.campeoes = this.campeoes || {};
    for (const c of this.cupsList()) if (c.winner) this.campeoes[c.name] = c.winner;
    for (const cp of this.competitions()) {
      if (cp.tier !== 1) continue;
      const tab = cp.id === this.userComp ? this.standingsSorted() : this._simTable(cp.id);
      if (tab && tab[0]) this.campeoes['liga:' + cp.country] = tab[0].id;
      // O VICE também: quando o mesmo clube ganha a liga e a copa, é ele que entra na
      // supercopa. Sem isso, na temporada em que o Bayern fez a dobradinha a
      // DFL-Supercup simplesmente não acontecia.
      if (tab && tab[1]) this.campeoes['vice:' + cp.country] = tab[1].id;
    }
    const cupUserWon = cupResults.some((c) => c.userWon);
    const ballonDor = this._ballonDor();
    const awards = this._awards();
    const real = this.standingsSorted();
    const champion = (this.clubById(real[0].id) || {}).name || '—';
    const userFinish = this.userPosition();
    // tabelas finais de todas as competições (a do usuário é real; as outras, simuladas)
    const tables = {};
    // ATENÇÃO: aqui ia this._simTable(comp.clubIds). Passando o array, o cache caía
    // sempre na mesma chave e TODAS as ligas recebiam a tabela da primeira — foi por
    // isso que Borussia Dortmund e Bayern "subiram" para a Série A e sumiram 4 clubes
    // da tabela. Tem de ir o ID da competição.
    for (const comp of this.competitions()) tables[comp.id] = comp.id === this.userComp ? real : this._simTable(comp.id);
    // acesso/rebaixamento entre divisões adjacentes do mesmo país
    const moves = []; // [clubId, novoCompId]
    const byCountry = {};
    this.competitions().forEach((c) => (byCountry[c.country] = byCountry[c.country] || []).push(c));
    for (const country in byCountry) {
      const comps = byCountry[country].slice().sort((a, b) => a.tier - b.tier);
      for (let k = 0; k < comps.length - 1; k++) {
        const up = comps[k], lo = comps[k + 1];
        const K = this._movesK(up.clubIds.length, lo.clubIds.length, country);
        // slice(-0) devolve o ARRAY INTEIRO, não "nenhum". Nos países sem acesso e
        // rebaixamento (os Estados Unidos, por exemplo) o K é zero — e a liga
        // inteira era rebaixada de uma vez: em cinco temporadas a MLS ficou com
        // ZERO clubes e a segunda divisão com 55.
        if (K <= 0) continue;
        const upT = tables[up.id], loT = tables[lo.id];
        // trava de segurança: só desce quem está mesmo na divisão de cima, e só sobe
        // quem está mesmo na de baixo
        upT.slice(-K).forEach((r) => { if (this.clubById(r.id) && this.clubById(r.id).comp === up.id) moves.push([r.id, lo.id]); });
        loT.slice(0, K).forEach((r) => { if (this.clubById(r.id) && this.clubById(r.id).comp === lo.id) moves.push([r.id, up.id]); });
      }
    }
    // resumo para o usuário (quem saiu/entrou na SUA divisão)
    const myComp = this.userCompObj();
    // PREMIAÇÃO. Faltava a maior receita de um clube de verdade: o jogo não pagava
    // nada por posição na tabela nem por campanha de copa, então subir de 15º para
    // 4º não mudava um centavo no caixa. O bolo sai do tamanho da liga (a média do
    // valor dos elencos dela), que é o que faz isso funcionar tanto na Premier
    // League quanto na Série D.
    const premio = this._premiacao(myComp, userFinish, cupResults);
    this.userClub().caixa += premio.total;
    const below = this._neighborComp(myComp, +1);
    const K = below ? this._movesK(myComp.clubIds.length, below.clubIds.length) : 0;
    const relegatedNames = K ? real.slice(-K).map((r) => (this.clubById(r.id) || {}).name).filter(Boolean) : [];
    const promotedNames = below && K ? tables[below.id].slice(0, K).map((r) => (this.clubById(r.id) || {}).name).filter(Boolean) : [];
    // aplica movimentos
    moves.forEach(([clubId, toComp]) => { this.clubById(clubId).comp = toComp; });
    // reconstrói clubIds de cada competição
    this.competitions().forEach((c) => { c.clubIds = this.clubsOfComp(c.id).map((cl) => cl.id); });
    // janela de transferências da IA entre as temporadas
    this._runTransferWindow();
    this.propostasRecebidas = this.gerarPropostasPorMeusJogadores(4);
    // ---- avaliação da diretoria: meta, demissão e propostas ----
    const obj = this.objective || { target: myComp.tier > 1 ? 4 : Math.ceil(this.nClubs() / 2) };
    const newComp = this.compById(this.userClub().comp);
    const gotRelegated = newComp.tier > myComp.tier;
    let board = { finish: userFinish, target: obj.target, fired: false, offers: [], relegated: gotRelegated };
    // Quem CUMPRIU a meta não é demitido. Só cai fora quem foi rebaixado ou
    // terminou bem abaixo do combinado.
    const cumpriu = userFinish <= obj.target;
    if (!cumpriu && (gotRelegated || userFinish > obj.target + Math.ceil(this.nClubs() * 0.25))) {
      board.fired = Math.random() < (gotRelegated ? 0.7 : 0.55);
    }
    // propostas de clubes maiores se superar a meta
    if (!board.fired && userFinish <= Math.max(1, obj.target - 2)) {
      const stronger = this.clubs().filter((c) => c.id !== this.userClubId && avgForca(bestEleven(c)) > avgForca(bestEleven(this.userClub())) + 3)
        .sort((a, b) => avgForca(bestEleven(b)) - avgForca(bestEleven(a)));
      board.offers = stronger.slice(0, 3).map((c) => ({ id: c.id, name: c.name, comp: this.compById(c.comp).name }));
    }
    // Demitido, o mundo inteiro deixava de ser uma opção — dava para sair do
    // rebaixamento no Vitória e escolher o Real Madrid na tela seguinte. O Gustavo:
    // "depois de demitido não deveria escolher qualquer clube". Agora fica um TETO:
    // só clubes até o nível do que te mandou embora, e um pouco abaixo dele. Quem
    // tem sala de troféus cheia perde menos.
    if (board.fired) {
      const meu = avgForca(bestEleven(this.userClub()));
      const desconto = Math.max(1, 4 - Math.min(3, (this.trophies || []).length));
      // O teto nunca pode fechar o mundo inteiro. Numa carreira de teste, depois de
      // três demissões seguidas em divisões cada vez piores, NENHUM clube do jogo
      // passava no teto e o técnico ficava sem para onde ir. O piso é o nível dos 25
      // clubes mais fracos do mundo: sempre sobra onde recomeçar.
      const fracos = this.clubs().map((c) => avgForca(bestEleven(c))).sort((a2, b2) => a2 - b2);
      const piso = fracos[Math.min(24, fracos.length - 1)] || 45;
      this.tetoTreinador = Math.max(45, piso, Math.round(meu - desconto));
      this.demitidoDe = this.userClub().name;
    }
    this.pendingBoard = board;
    // ---- histórico / troféus ----
    const myTrophies = [];
    if (champion && real[0].id === this.userClubId) myTrophies.push(myComp.name);
    cupResults.forEach((cr) => { if (cr.userWon) myTrophies.push(cr.name); });
    (this.history = this.history || []).push({ season: this.season, comp: myComp.name, finish: userFinish, champion, cups: cupResults, ballonDor, userTrophies: myTrophies });
    (this.trophies = this.trophies || []).push(...myTrophies);
    this.seasonSummary = { mundo: this._resumoDoMundo(), champion, promoted: promotedNames, relegated: relegatedNames, userWas: myComp.name,
      cups: cupResults, cupUserWon, ballonDor, awards, userFinish, objective: obj.target, metaEhFuga: !!obj.ehFuga, board, premio,
      transfers: (this.transferNews || []).slice(0, 8) };
    // ---- foto da tabela e da artilharia ----
    // O Gustavo: "eu não consigo ver a tabela, como acabou o campeonato, e já muda
    // pra outra". A temporada nova começa aqui dentro (_startSeason zera tudo), então
    // a última coisa que dá para fazer antes disso é tirar uma foto.
    this.tabelaFinal = {
      season: this.season, comp: myComp.name, pais: myComp.country, tier: myComp.tier,
      relK: this.relegationCount(), proK: this.promotionCount(),
      linhas: real.map((r) => ({ ...r, nome: (this.clubById(r.id) || {}).name || '' })),
    };
    // AS COPAS TAMBÉM VIRAM FOTO. O Gustavo: "quando eu vou nas copas para ver como
    // acabou, ele já me mostra as da próxima temporada". As competições são
    // recriadas no _startSeason, então a última chance de guardar como terminaram é
    // aqui.
    this.copasFinais = this.cupsList().map((cp) => ({
      name: cp.name, tag: cp.tag || '',
      campeao: cp.winner ? (this.clubById(cp.winner) || {}).name : null,
      campeaoId: cp.winner || null,
      euGanhei: cp.winner === this.userClubId,
      fases: (cp.results || []).filter((r) => (r.pairs || []).some(
        (x) => x.a === this.userClubId || x.b === this.userClubId)).length,
      ultima: (() => {
        const meus = (cp.results || []).filter((r) => (r.pairs || []).some(
          (x) => x.a === this.userClubId || x.b === this.userClubId));
        const r = meus[meus.length - 1];
        if (!r) return null;
        const par = r.pairs.find((x) => x.a === this.userClubId || x.b === this.userClubId);
        const eu = par.a === this.userClubId;
        return { fase: r.stage, gp: eu ? par.ga : par.gb, gc: eu ? par.gb : par.ga,
          advId: eu ? par.b : par.a, passei: par.win === this.userClubId };
      })(),
    }));

    const foto = (arr, campo) => arr.map((x) => ({ nome: x.p.nome, clubeId: x.club.id,
      clube: x.club.name, n: x.p[campo] || 0 }));
    // O painel "seu elenco" da artilharia também vira foto: ele sumia quando a
    // temporada virava, porque os gols dos jogadores zeram.
    this.elencoFinal = this.userClub().squad
      .filter((p) => (p.gols || 0) + (p.assist || 0) > 0)
      .map((p) => ({ nome: p.nome, sub: p.sub || p.posicao, posicao: p.posicao,
        gols: p.gols || 0, assist: p.assist || 0,
        golsComp: { ...(p.golsComp || {}) }, assistComp: { ...(p.assistComp || {}) } }))
      .sort((a3, b3) => (b3.gols - a3.gols) || (b3.assist - a3.assist));
    // AS LIGAS DO MUNDO TAMBÉM VIRAM FOTO. O Gustavo: "não dá mais para ver a liga
    // da temporada que acabou, já reinicia — eu quero confirmar quem ganhou e como
    // foi". Guardo a tabela final de cada competição (só o essencial).
    this.ligasFinais = {};
    for (const cp of this.competitions()) {
      const tab = cp.id === this.userComp ? this.standingsSorted() : this._simTable(cp.id);
      if (!tab || !tab.length) continue;
      this.ligasFinais[cp.id] = tab.map((r) => ({ id: r.id,
        nome: (this.clubById(r.id) || {}).name || '', pts: r.pts, j: r.j,
        v: r.v, e: r.e, d: r.d, gp: r.gp, gc: r.gc }));
    }
    this.artilhariaFinal = { gols: foto(this.topScorers(15), 'gols'),
      assist: foto(this.topAssists(15), 'assist') };

    // ---- empréstimos voltam para casa antes da evolução ----
    this._retornarEmprestimos();
    // ---- evolução dos jogadores (idade, base, contratos) ----
    this._progressPlayers();
    // QUEM EVOLUIU NA SUA CASA. É o retorno do treino — sem isso, escolher o foco
    // do ano seria um botão sem resposta.
    const meu = this.userClub();
    const evo = (meu.squad || []).filter((p) => p.ovrAnterior != null && p.forca !== p.ovrAnterior)
      .map((p) => ({ nome: p.nome, sub: p.sub || p.posicao, idade: p.idade,
        de: p.ovrAnterior, para: p.forca }))
      .sort((a4, b4) => (b4.para - b4.de) - (a4.para - a4.de));
    if (this.seasonSummary) {
      this.seasonSummary.evolucao = evo.filter((x) => x.para > x.de).slice(0, 5);
      this.seasonSummary.caiu = evo.filter((x) => x.para < x.de).slice(-3).reverse();
      this.seasonSummary.treino = this.treinoDoTime || 'base';
    }
    this.userComp = this.userClub().comp; // pode ter subido/caído
    this.season++;
    this._avancarBase();
    this._revelarBase();
    this._startSeason();
    this._seasonJustEnded = true;
  }

  // aceitar proposta de outro clube (troca de emprego)
  acceptOffer(clubId) {
    this.userClubId = clubId; this.userComp = this.userClub().comp; this.userTactic = this.userClub().tactic;
    this.lineupIds = null;
    this._lastUserResult = null; this.forma = []; this.formaDetalhe = [];   // o passado é do outro clube
    this.paciencia = 80; this._avisoDiretoria = null; this.moralElenco = 60;
    this._startSeason(); this.pendingBoard = null;
  }
  /** O que custa renovar: o jogador pede salário de mercado e uma luva para assinar.
   *  Antes era só trocar o número de anos — de graça — e o Gustavo renovou um
   *  contrato "sem ter dinheiro" sem o jogo dizer nada. */
  custoDeRenovar(p, years = 3) {
    const u = this.userClub();
    const justo = Math.round(valorJusto(p.forca, p.idade, p.potencial) * 0.009);
    const novoSalario = Math.max(p.salario || 0, justo);
    return { luva: Math.round(novoSalario * 3), novoSalario, anos: years, caixa: u.caixa };
  }

  renewContract(playerId, years = 3) {
    const u = this.userClub();
    const p = u.squad.find((x) => x.id === playerId);
    if (!p) return { ok: false, msg: 'Jogador não encontrado' };
    const c2 = this.custoDeRenovar(p, years);
    if (u.caixa < c2.luva) {
      return { ok: false, msg: `${p.nome} pede ${fmtMoneyBr(c2.luva)} de luva para renovar, e você tem ${fmtMoneyBr(u.caixa)}` };
    }
    u.caixa -= c2.luva;
    p.contrato = years;
    p.avisoFimContrato = 0;
    p.salario = c2.novoSalario;
    return { ok: true, msg: `${p.nome} renovou por ${years} anos — ${fmtMoneyBr(c2.luva)} de luva, agora ganha ${fmtMoneyBr(c2.novoSalario)}/mês` };
  }

  // ---- Salvar / Continuar (localStorage) ----
  toSnapshot() {
    // NÃO salva o mundo inteiro. Guardar `league` dava um save de 7,9 MB e estourava a
    // cota de 5 MB do navegador ("exceeded the quota"). O mundo é remontado a partir do
    // players.json, que é o mesmo arquivo, e aqui vai só o que MUDOU:
    //   - o elenco de cada clube (transferências) e o caixa;
    //   - os campos que mudam de cada jogador, e só de quem mudou;
    //   - a ficha inteira de quem nasceu durante a carreira (base e regens), que não
    //     existe no players.json.
    const jog = [], novos = [], jogMundo = [];
    // O seu elenco vai inteiro (energia, cartão, lesão importam para a próxima
    // partida). O resto do mundo vai enxuto — ver CAMPOS_DO_MUNDO.
    const idxMundo = CAMPOS_DO_MUNDO.map((k) => CAMPOS_MUTAVEIS.indexOf(k));
    const clubes = this.clubs().map((c) => {
      const meu = c.id === this.userClubId;
      c.squad.forEach((p) => {
        const base = BASE_JOGADOR.get(p.id);
        if (!base) { novos.push([p.id, p.nome, p.posicao, p.sub, p.foot,
          ...CAMPOS_MUTAVEIS.map((k) => p[k])]); return; }
        if (meu) {
          const agora = CAMPOS_MUTAVEIS.map((k) => p[k]);
          if (agora.some((v, i) => v !== base[i])) jog.push([p.id, ...agora]);
        } else {
          const agora = CAMPOS_DO_MUNDO.map((k) => p[k]);
          if (agora.some((v, i) => v !== base[idxMundo[i]])) jogMundo.push([p.id, ...agora]);
        }
      });
      // O elenco só entra no save se REALMENTE mudou. Antes os 1.276 clubes
      // gravavam a lista inteira de ids todo save, mesmo os que nunca foram
      // tocados: 1,7 MB de um limite de 5 MB, logo na primeira temporada.
      const ids = c.squad.map((p) => p.id);
      const original = ELENCO_ORIGINAL.get(c.id);
      const mudou = !original || original.length !== ids.length
        || ids.some((v, i) => v !== original[i]);
      return mudou ? [c.id, c.caixa, ids] : [c.id, c.caixa];
    });
    return JSON.stringify({
      v: 24, userClubId: this.userClubId, userComp: this.userComp, season: this.season,
      round: this.round, lineupIds: this.lineupIds, formation: this.formation, posture: this.posture, userTactic: this.userTactic,
      table: this.table, fixtures: this.fixtures, cups: this.cups, history: this.history, trophies: this.trophies, objective: this.objective,
      forma: this.forma, formaDetalhe: this.formaDetalhe, base: this.base,
      agenda: this.agenda, dia: this.dia, aReceber: this.aReceber,
      tetoTreinador: this.tetoTreinador, demitidoDe: this.demitidoDe, treinoDoTime: this.treinoDoTime,
      paciencia: this.paciencia, avisoDiretoria: this._avisoDiretoria, moralElenco: this.moralElenco,
      propostasRecebidas: this.propostasRecebidas,
      mundo: { clubes, jog, jogMundo, novos },
    });
  }
  /** `dsFresco` é o mundo recém-montado do players.json; o save só traz a diferença.
   *  Saves antigos (v23) ainda trazem o mundo dentro e continuam abrindo. */
  static fromSnapshot(json, dsFresco) {
    const s = typeof json === 'string' ? JSON.parse(json) : json;
    const ds = s.league || dsFresco;
    if (s.mundo && dsFresco) {
      const porId = new Map();
      dsFresco.clubs.forEach((c) => c.squad.forEach((p) => porId.set(p.id, p)));
      (s.mundo.novos || []).forEach((n) => {
        const [id, nome, posicao, sub, foot, ...vals] = n;
        const p = { id, nome, posicao, sub, foot, energia: 100 };
        CAMPOS_MUTAVEIS.forEach((k, i) => { p[k] = vals[i]; });
        porId.set(id, p);
      });
      (s.mundo.jog || []).forEach(([id, ...vals]) => {
        const p = porId.get(id); if (!p) return;
        CAMPOS_MUTAVEIS.forEach((k, i) => { p[k] = vals[i]; });
      });
      (s.mundo.jogMundo || []).forEach(([id, ...vals]) => {
        const p = porId.get(id); if (!p) return;
        CAMPOS_DO_MUNDO.forEach((k, i) => { p[k] = vals[i]; });
      });
      const clubePorId = new Map(dsFresco.clubs.map((c) => [c.id, c]));
      (s.mundo.clubes || []).forEach(([cid, caixa, ids]) => {
        const c = clubePorId.get(cid); if (!c) return;
        c.caixa = caixa;
        // sem lista de ids = elenco intacto, fica o que veio do players.json
        if (ids) c.squad = ids.map((i) => porId.get(i)).filter(Boolean);
        else c.squad.forEach((p, i) => { const novo = porId.get(p.id); if (novo) c.squad[i] = novo; });
      });
    }
    const cm = new CareerManager(ds);
    Object.assign(cm, { userClubId: s.userClubId, userComp: s.userComp, season: s.season, round: s.round, lineupIds: s.lineupIds,
      formation: s.formation, posture: s.posture, userTactic: s.userTactic, table: s.table, fixtures: s.fixtures, cups: s.cups,
      history: s.history || [], trophies: s.trophies || [], objective: s.objective, forma: s.forma || [],
      formaDetalhe: s.formaDetalhe || [],
      // Save antigo não tem agenda: ele termina a temporada no formato velho e a
      // próxima já nasce com o calendário novo.
      agenda: s.agenda || null, dia: s.dia != null ? s.dia : 0,
      aReceber: s.aReceber || [],
      tetoTreinador: s.tetoTreinador || null, demitidoDe: s.demitidoDe || null, treinoDoTime: s.treinoDoTime || 'base',
      paciencia: s.paciencia != null ? s.paciencia : 80,
      _avisoDiretoria: s.avisoDiretoria || null,
      moralElenco: s.moralElenco != null ? s.moralElenco : 60,
      propostasRecebidas: s.propostasRecebidas || [],
      base: s.base || [] });
    cm.state = STATE.DASHBOARD; cm._midWindowDone = true;
    return cm;
  }

  // ---- Mercado ----
  // ---------------------------------------------------------- categoria de base
  //
  // Todo ano a base do SEU clube revela garotos. Quanto melhor a estrutura, mais e
  // melhores eles vêm. Você escolhe quem sobe para o profissional e quem é
  // dispensado — é a chance de formar o craque em casa em vez de comprar.
  nivelDaBase() { return (this.investimentos && this.investimentos.base) || 1; }

  _revelarBase() {
    const u = this.userClub();
    if (!u) return [];
    const nivel = this.nivelDaBase();
    const forcaClube = this.strengthOf(u);
    const quantos = 2 + Math.floor(Math.random() * 2) + Math.floor(nivel / 2);

    const garotos = [];
    for (let i = 0; i < quantos; i++) {
      const g = youthPlayer(forcaClube, this.userClub().country);
      // a estrutura da base empurra o TETO para cima — é nisso que o investimento pesa
      const bonusTeto = 3 * nivel + Math.floor(Math.random() * 6);
      g.potencial = Math.min(93, g.potencial + bonusTeto);
      g.forca = Math.min(g.potencial - 4, g.forca + Math.floor(nivel * 0.8));
      g.daBase = true;
      g.idade = 16 + Math.floor(Math.random() * 2);
      // um deles pode ser a joia da geração
      if (i === 0 && Math.random() < 0.10 + nivel * 0.04) {
        g.potencial = Math.min(94, g.potencial + 6);
        g.joia = true;
      }
      garotos.push(g);
    }
    // Os garotos revelados entram na CATEGORIA DE BASE, onde ficam visíveis o ano
    // inteiro. Antes viravam uma lista solta que aparecia só na tela de fim de
    // temporada e sumia — o Gustavo procurou o elenco de base e não achou.
    this.base = this.base || [];
    // youthPlayer só sabe o GRUPO (G/Z/L/M/A). Sem a sigla fina o garoto aparecia
    // como "L" em vez de lateral-esquerdo, e caía em qualquer vaga da escalação.
    const FINA = { G: ['GOL'], Z: ['ZAG'], L: ['LE', 'LD'],
      M: ['VOL', 'MC', 'MEI'], A: ['PE', 'PD', 'ATA'] };
    for (const g of garotos) {
      g.base = true;
      g.pais = g.pais || u.country;
      if (!g.sub || g.sub.length < 2) {
        const opc = FINA[g.posicao] || ['MC'];
        g.sub = opc[Math.floor(Math.random() * opc.length)];
        if (g.sub === 'LE' || g.sub === 'PE') g.foot = 'L';
      }
      // garoto de base entra na escala da categoria, não na do time principal:
      // vinham com 70 aos 16 anos, mais fortes que os da própria peneira
      g.forca = Math.min(g.forca, Math.round(forcaClube - 16));
      g.potencial = Math.max(g.potencial, g.forca + 5);
      g.valorMercado = Math.round(g.forca * g.forca * 90);
      g.observado = 0;
      g.vies = Math.round((Math.random() - 0.5) * 10);
      this.base.push(g);
    }
    this.base.sort((a, b) => b.forca - a.forca);
    this.baseRevelada = garotos;
    return garotos;
  }

  promoverDaBase(ids) {
    const u = this.userClub();
    const sobem = (this.baseRevelada || []).filter((g) => ids.includes(g.id));
    sobem.forEach((g) => { g.base = false; u.squad.push(g); });
    const subiu = new Set(sobem.map((g) => g.id));
    this.base = (this.base || []).filter((g) => !subiu.has(g.id));
    const nomes = sobem.map((g) => g.nome);
    if (nomes.length) this._pushNews(` Subiram da base: ${nomes.join(', ')}`);
    this.baseRevelada = null;
    return sobem;
  }

  // ---------------------------------------------------------- cláusula
  //
  // Pagar a multa leva o jogador na hora, sem o clube poder recusar — custa caro,
  // e é assim que se tira o craque de um rival.
  /** Soma do valor de mercado do elenco — o "tamanho" do clube. */
  _valorDoElenco(club) { return club.squad.reduce((s, p) => s + (p.valorMercado || 0), 0); }

  clausulaDe(p) { return Math.round(p.valorMercado * (2.2 + Math.min(1.3, (p.potencial - p.forca) * 0.06))); }

  pagarClausula(playerId, fromClubId) {
    const origem = this.clubById(fromClubId);
    const u = this.userClub();
    if (!origem || !u) return { ok: false, msg: 'Clube não encontrado' };
    const i = origem.squad.findIndex((x) => x.id === playerId);
    if (i < 0) return { ok: false, msg: 'Jogador não está mais nesse clube' };
    const p = origem.squad[i];
    const preco = this.clausulaDe(p);
    if (u.caixa < preco) return { ok: false, msg: 'Caixa insuficiente para a multa' };
    if (u.squad.length >= 35) return { ok: false, msg: 'Elenco cheio' };
    origem.squad.splice(i, 1);
    u.squad.push(p);
    u.caixa -= preco; origem.caixa += preco;
    p.contrato = 3 + Math.floor(Math.random() * 3);
    this._pushNews(` Multa rescisória paga: ${p.nome} chega do ${origem.name}`);
    return { ok: true, msg: `${p.nome} é seu por ${fmtMoneyBr(preco)}` };
  }

  // ---------------------------------------------------------- olheiro
  //
  // Lista as JOIAS do mundo inteiro: jovens cujo teto está bem acima do que já
  // mostram. É o que dá sentido a apostar num garoto antes de ele explodir.
  /** `posicao` e `soCabe` entraram porque o olheiro do Gustavo listava 60 garotos
   *  sem ele poder dizer "quero um zagueiro que eu consiga pagar". `total` volta
   *  junto para a tela saber quantos ficaram de fora do limite. */
  scoutJoias({ idadeMax = 23, tetoMin = 80, sobraMin = 6, escopo = 'mundo', limite = 60,
    posicao = 'ALL', soCabe = false } = {}) {
    const u = this.userClub();
    let clubes = this.clubs();
    if (escopo === 'pais') clubes = clubes.filter((c) => c.country === u.country);
    else if (escopo === 'liga') clubes = this.activeClubs();

    const out = [];
    for (const c of clubes) {
      if (c.id === this.userClubId) continue;
      for (const p of c.squad) {
        const teto = p.potencial || p.forca;
        if (p.idade > idadeMax || teto < tetoMin || teto - p.forca < sobraMin) continue;
        if (posicao !== 'ALL' && (p.sub || p.posicao) !== posicao) continue;
        if (soCabe && this.precoDe(p, c) > u.caixa) continue;
        out.push({ p, clube: c, sobra: teto - p.forca });
      }
    }
    out.sort((a, b) => (b.p.potencial - b.p.forca * 0.35) - (a.p.potencial - a.p.forca * 0.35));
    const lista = out.slice(0, limite);
    lista.total = out.length;
    return lista;
  }

  // ---------------------------------------------------------- empréstimos
  //
  // Emprestar o garoto para ele JOGAR: no clube que o recebe ele é titular, e volta
  // no fim da temporada com mais overall do que teria ficando no seu banco.
  destinosDeEmprestimo(playerId, limite = 12) {
    const p = this.userClub().squad.find((x) => x.id === playerId);
    if (!p) return [];
    return this.clubs()
      .filter((c) => c.id !== this.userClubId)
      .map((c) => ({ c, f: this.strengthOf(c) }))
      .filter(({ f }) => f <= p.forca + 6 && f >= p.forca - 14)   // onde ele seria titular
      .sort((a, b) => b.f - a.f)
      .slice(0, limite)
      .map(({ c, f }) => ({ clubeId: c.id, nome: c.name, liga: c.league, país: c.country, forca: Math.round(f) }));
  }

  emprestarJogador(playerId, paraClubeId) {
    const u = this.userClub();
    const i = u.squad.findIndex((x) => x.id === playerId);
    const destino = this.clubById(paraClubeId);
    if (i < 0 || !destino) return { ok: false, msg: 'Jogador ou clube inválido' };
    const p = u.squad[i];
    if (p.emprestadoDe) return { ok: false, msg: 'Ele já está emprestado' };

    p.emprestadoDe = this.userClubId;
    p.emprestadoAte = this.season;                 // volta na virada da temporada
    u.squad.splice(i, 1);
    destino.squad.push(p);
    (this.emprestimos = this.emprestimos || []).push({ id: p.id, para: destino.id, nome: p.nome, temporada: this.season });
    this._pushNews(` ${p.nome} foi emprestado ao ${destino.name}`);
    return { ok: true, msg: `${p.nome} emprestado ao ${destino.name}` };
  }

  // chamado na virada de temporada: todo mundo volta para casa
  _retornarEmprestimos() {
    const voltaram = [];
    for (const e of (this.emprestimos || [])) {
      const destino = this.clubById(e.para);
      const casa = this.clubById(this.userClubId);
      if (!destino || !casa) continue;
      const i = destino.squad.findIndex((x) => x.id === e.id);
      if (i < 0) continue;
      const p = destino.squad.splice(i, 1)[0];
      // jogou a temporada inteira como titular: rende mais do que ficar no banco
      const teto = p.potencial || p.forca;
      const bonus = Math.min(Math.max(0, teto - p.forca), 2 + Math.floor(Math.random() * 3));
      p.forca += bonus;
      p.emprestadoDe = null; p.emprestadoAte = null;
      casa.squad.push(p);
      voltaram.push({ nome: p.nome, clube: destino.name, ganho: bonus, forca: p.forca });
    }
    this.emprestimos = [];
    if (voltaram.length) this.retornosDeEmprestimo = voltaram;
    return voltaram;
  }

  /** Quanto CUSTA tirar o jogador do clube dele. Nunca é o valor de tabela: ninguém
   *  vende pelo preço de mercado. O ágio sobe com o que o jogador ainda tem para
   *  crescer e com o tamanho do clube que o segura. */
  precoDe(p, dono) {
    const promessa = Math.max(0, p.potencial - p.forca);
    let mult = 1.35 + Math.min(0.55, promessa * 0.045);
    if (dono) {
      const forcaDono = avgForca(bestEleven(dono));
      if (forcaDono >= 78) mult += 0.35;        // clube grande resiste mais
      else if (forcaDono >= 72) mult += 0.15;
    }
    if (p.forca >= 85) mult += 0.3;             // craque consagrado custa caro
    return Math.round(p.valorMercado * mult);
  }

  /** Quantos jogadores contam para o limite do elenco.
   *
   *  O limite de 30 cru nao fazia sentido — o Gustavo: "eu acredito que um elenco
   *  pode ter mais do que trinta". E pode. A regra que existe de verdade (Premier
   *  League, e parecida na UEFA) e outra: o limite vale para os PROFISSIONAIS, e
   *  garoto de base entra fora da lista. Assim o teto deixa de ser um numero solto
   *  e vira o que e no futebol: um motivo para revelar gente da base. */
  //  Segunda rodada de conversa: "a quantidade de jogadores que você vai ter, a
  //  quantidade que você quiser. Eu acho que tem que ter um mínimo. Nove no banco de
  //  reserva e onze titulares, no mínimo você tem vinte jogadores, mas aí o teto é
  //  quantos você quiser."
  //
  //  Então o teto sai de cena — 50 é só uma trava de segurança para a tela não virar
  //  uma lista infinita — e o que passa a valer é o PISO de 20: onze em campo e nove
  //  no banco. Quem quiser carregar 40 jogadores paga a folha salarial dos 40, que é
  //  a consequência de verdade.
  static get LIMITE_ELENCO() { return 50; }
  static get MINIMO_ELENCO() { return 20; }
  static get IDADE_BASE() { return 20; }
  contamNoLimite(club) {
    return (club.squad || []).filter((p) => (p.idade || 0) > CareerManager.IDADE_BASE).length;
  }
  elencoCheio(club) { return this.contamNoLimite(club) >= CareerManager.LIMITE_ELENCO; }

  /** Por que ESTE jogador não pode ser comprado agora. null = pode.
   *
   *  Existe para a tela poder dizer o motivo ANTES do clique. O mercado listava 536
   *  jogadores com o botão Comprar aceso e só respondia "Elenco cheio (máx 30)"
   *  depois de clicar — nenhuma daquelas 536 compras era possível. */
  motivoImpedido(p, dono) {
    const user = this.userClub();
    // Curto de propósito: isto vira o texto do BOTÃO em cada linha do mercado, e a
    // versão longa espremia o card a ponto de o nome do jogador sumir da tela. A
    // explicação inteira fica na barra de vagas, no topo.
    if (this.elencoCheio(user) && (p.idade || 0) > CareerManager.IDADE_BASE)
      return 'Elenco cheio';
    if (dono && dono.squad.length <= CareerManager.MINIMO_ELENCO) return `${dono.name} não pode vender (elenco mínimo)`;
    if (user.caixa < this.precoDe(p, dono)) return 'Caixa insuficiente';
    return null;
  }

  /** O jogador QUER vir? Ninguém troca um gigante por um clube pequeno. */
  querVir(p, dono) {
    const u = this.userClub();
    const meu = avgForca(bestEleven(u));
    const dele = dono ? avgForca(bestEleven(dono)) : meu;
    const salto = dele - meu;
    // VETERANO DESCE DE DEGRAU. O Gustavo, tentando levar dois goleiros de 36 e 38
    // anos para o Bolton: "eles estão velhos, vão jogar no mesmo país, acho que faz
    // sentido eles aceitarem um clube menor". Faz — é o que o futebol chama de fim
    // de carreira. Quem passou dos 32 topa cair bem mais, e no mesmo país topa mais
    // ainda, porque não precisa mudar de vida.
    const folgaIdade = p.idade >= 34 ? 12 : p.idade >= 32 ? 8 : p.idade >= 30 ? 4 : 0;
    const folgaPais = dono && dono.country === u.country ? 3 : 0;
    // reserva do próprio clube também quer jogar: se ele não é titular lá, desce
    const titularLa = dono ? (dono.squad || []).filter((x) => x.forca > p.forca).length < 11 : true;
    const folgaBanco = titularLa ? 0 : 5;
    const tolerancia = folgaIdade + folgaPais + folgaBanco;
    if (salto - tolerancia >= 8 && p.forca >= 78) return false;   // craque de clube grande
    if (salto - tolerancia >= 12) return false;                    // salto grande demais
    return true;
  }

  /** Resposta do clube dono a uma oferta. É negociação, não botão. */
  avaliarProposta(playerId, fromClubId, oferta) {
    const from = this.clubById(fromClubId);
    const p = from && from.squad.find((x) => x.id === playerId);
    if (!p) return { status: 'recusa', motivo: 'Jogador não encontrado' };
    const impedido = this.motivoImpedido(p, from);
    if (impedido && !impedido.startsWith('Caixa')) return { status: 'recusa', motivo: impedido };
    if (!this.querVir(p, from)) {
      return { status: 'recusa', motivo: `${p.nome} não quer sair de um clube maior que o seu.` };
    }
    const pedido = this.precoDe(p, from);
    if (oferta >= pedido) return { status: 'aceita', pedido };
    if (oferta >= Math.round(pedido * 0.82)) {
      return { status: 'contra', pedido, motivo: `${from.name} recusou, mas aceita por ${fmtMoneyBr(pedido)}.` };
    }
    return { status: 'recusa', pedido,
      motivo: `${from.name} achou a proposta baixa demais. Pedem ${fmtMoneyBr(pedido)}.` };
  }

  /** Fecha a compra por um valor JÁ acertado. */
  buyPlayer(playerId, fromClubId, valor) {
    const from = this.clubById(fromClubId), user = this.userClub();
    const p = from.squad.find((x) => x.id === playerId); if (!p) return { ok: false, msg: 'Não encontrado' };
    const preco = valor || this.precoDe(p, from);
    const impedido = this.motivoImpedido(p, from);
    if (impedido) return { ok: false, msg: impedido };
    if (user.caixa < preco) return { ok: false, msg: 'Caixa insuficiente' };
    from.squad = from.squad.filter((x) => x.id !== playerId); user.squad.push(p);
    user.caixa -= preco; from.caixa += preco;
    this._pushNews(` ${p.nome} assinou com o ${user.name} — ${fmtMoneyBr(preco)} pagos ao ${from.name}`);
    return { ok: true, msg: `${p.nome} é seu! Pagos ${fmtMoneyBr(preco)} ao ${from.name}.` };
  }
  // contrata um agente livre do mercado global (scout)
  /** AGENTE LIVRE NÃO TEM PREÇO DE PASSE. O Gustavo: "o cara tava de agente livre e
   *  eu paguei 6 milhões por ele. Mas como, se ele tava de agente livre? Era pra ele
   *  vir de graça". Era pra sim: quem está sem clube custa só a LUVA (bônus de
   *  assinatura), que é dinheiro para o jogador, não para clube nenhum. */
  luvaDe(p) {
    // uns oito meses de salário, que é a ordem de grandeza de uma luva de verdade
    return Math.round((p.salario || Math.round(p.valorMercado * 0.008)) * 8);
  }

  signFreeAgent(playerId) {
    const user = this.userClub(); const idx = this.league.market.findIndex((p) => p.id === playerId);
    if (idx < 0) return { ok: false, msg: 'Indisponível' };
    const p = this.league.market[idx];
    const luva = this.luvaDe(p);
    if (user.caixa < luva) return { ok: false, msg: `Caixa insuficiente para a luva (${fmtMoneyBr(luva)})` };
    if (this.elencoCheio(user) && (p.idade || 0) > CareerManager.IDADE_BASE)
      return { ok: false, msg: `Elenco profissional cheio (${CareerManager.LIMITE_ELENCO} acima de ${CareerManager.IDADE_BASE} anos)` };
    this.league.market.splice(idx, 1); p.gols = 0; p.assist = 0; user.squad.push(p); user.caixa -= luva;
    return { ok: true, msg: `${p.nome} assinou de graça — você pagou ${fmtMoneyBr(luva)} de luva` };
  }
  /** AS PROPOSTAS PELO SEU JOGADOR.
   *
   *  O Gustavo vendeu o Kauê por 40 milhões e o jogo não disse para quem: "o Kauê foi
   *  para casa no caralho. Não mostrou para que time ele foi. Como é que eu vendi um
   *  jogador por quarenta milhões e ele foi para agente livre?"
   *
   *  Era isso mesmo que acontecia: a venda pegava o primeiro clube com vaga no elenco
   *  e, se não achasse nenhum, o jogador caía no mercado de agentes livres — com o
   *  dinheiro entrando do mesmo jeito. Agora quem compra é um clube de verdade, que
   *  precisa daquela posição e tem caixa, e a proposta vem com condição de pagamento:
   *  "à vista paga menos, parcelado paga mais". A escolha é sua.
   */
  propostasPor(playerId) {
    const user = this.userClub();
    const p = (user.squad || []).find((x) => x.id === playerId);
    if (!p) return [];
    const valor = p.valorMercado || 1;
    const meuNivel = this.strengthOf(user);

    // O MUNDO INTEIRO pode comprar, não só a sua liga. Procurando só entre os 19
    // adversários do Brasileirão, um jogador de 23 milhões não tinha comprador —
    // nenhum clube brasileiro tem esse caixa — e a venda caía no agente livre.
    // Na vida real ele vai para a Europa, e é de lá que vem a proposta.
    const interessados = this.clubs()
      .filter((c) => c.id !== this.userClubId)
      .filter((c) => (c.squad || []).length < CareerManager.LIMITE_ELENCO)
      .map((c) => {
        const nivel = this.strengthOf(c);
        // quanto o clube QUER: precisa da posição e o jogador melhora o time dele
        const naPosicao = (c.squad || []).filter((x) => x.posicao === p.posicao).length;
        const melhora = (p.forca || 0) - nivel;
        // clube grande tem mais chance de aparecer: um lateral do Corinthians recebe
        // proposta do Genoa antes de receber do Shenzhen Juniors
        const porte = (nivel - 60) / 3;
        // DE ONDE VEM A PROPOSTA. O Gustavo, vendendo um inglês da League One:
        // "chegou proposta pra ele jogar no Guarani do Paraguai, no Cerro do
        // Uruguai. Tem que aparecer propostas mais reais". Clube do mesmo país
        // vem primeiro, o continente depois, e o outro lado do mundo só se o
        // jogador for bom o bastante para valer a viagem.
        const mesmoPais = c.country === user.country;
        const mesmoCont = CONTINENT[c.country] === CONTINENT[user.country];
        const distancia = mesmoPais ? 10 : mesmoCont ? 2 : -8;
        // e um clube de fora só vai atrás de quem é melhor do que o elenco dele
        const vale = mesmoPais || melhora > 0 ? 0 : -6;
        const desejo = (naPosicao <= 1 ? 8 : naPosicao <= 2 ? 4 : 0) + melhora
          + (nivel > meuNivel ? 4 : 0) + porte + distancia + vale;
        return { c, nivel, desejo };
      })
      .filter((x) => x.desejo > -6 && (x.c.caixa || 0) > valor * 0.35)
      .sort((a, b) => b.desejo - a.desejo)
      .slice(0, 6);

    if (!interessados.length) return [];

    // Três propostas no máximo, cada uma com uma condição diferente. Quem paga à
    // vista paga menos; quem parcela paga mais, e o dinheiro entra ao longo dos anos.
    // A condição sai do BOLSO de quem compra: quem tem caixa para pagar tudo de uma
    // vez oferece à vista, e paga um pouco menos por isso; quem não tem, parcela e
    // paga mais no total. É a troca que existe de verdade numa negociação.
    const modelos = [
      { tipo: 'avista', mult: 0.92, parcelas: 1, rotulo: 'à vista' },
      { tipo: 'parcelado', mult: 1.12, parcelas: 3, rotulo: 'em 3 temporadas' },
      { tipo: 'parcelado', mult: 1.30, parcelas: 5, rotulo: 'em 5 temporadas' },
    ];
    const out = [];
    for (const x of interessados) {
      if (out.length >= 3) break;
      const caixa = x.c.caixa || 0;
      // clube rico paga mais, clube pobre pechincha
      const bolso = Math.max(0.72, Math.min(1.3, caixa / Math.max(1, valor * 1.5)));
      // o primeiro modelo que ele consegue bancar
      const mo = modelos.find((k) => caixa >= (valor * k.mult * bolso) / k.parcelas * 1.1);
      if (!mo) continue;
      const total = Math.round(valor * mo.mult * bolso);
      const jaTem = out.some((o) => o.clubeId === x.c.id);
      if (jaTem) continue;
      out.push({
        id: `${x.c.id}:${mo.tipo}:${mo.parcelas}`,
        clubeId: x.c.id, clube: x.c.name, liga: (this.compById(x.c.comp) || {}).name || '',
        total, parcelas: mo.parcelas, aVista: Math.round(total / mo.parcelas),
        rotulo: mo.rotulo, desejo: x.desejo,
      });
    }
    return out.sort((a, b) => b.total - a.total);
  }

  /** Aceita uma das propostas. O jogador vai para o clube que comprou — nunca mais
   *  "para agente livre" — e o dinheiro entra à vista ou em parcelas anuais. */
  aceitarPropostaDeVenda(playerId, propostaId) {
    const user = this.userClub();
    const p = (user.squad || []).find((x) => x.id === playerId);
    if (!p) return { ok: false, msg: 'Jogador não está no elenco' };
    if (user.squad.length <= CareerManager.MINIMO_ELENCO) {
      return { ok: false, msg: `Elenco mínimo: ${CareerManager.MINIMO_ELENCO} jogadores` };
    }
    const prop = this.propostasPor(playerId).find((x) => x.id === propostaId);
    if (!prop) return { ok: false, msg: 'Essa proposta não está mais na mesa' };
    const comprador = this.clubById(prop.clubeId);
    if (!comprador) return { ok: false, msg: 'O clube desistiu' };

    user.squad = user.squad.filter((x) => x.id !== playerId);
    if (this.lineupIds) this.lineupIds = this.lineupIds.filter((id) => id !== playerId);
    comprador.squad.push(p);
    comprador.caixa = (comprador.caixa || 0) - prop.aVista;

    user.caixa += prop.aVista;
    if (prop.parcelas > 1) {
      // o resto entra nas próximas temporadas
      this.aReceber = this.aReceber || [];
      for (let k = 1; k < prop.parcelas; k++) {
        this.aReceber.push({ temporada: this.season + k, valor: prop.aVista,
          de: comprador.name, jogador: p.nome });
      }
    }
    this._pushNews(`${p.nome} foi vendido ao ${comprador.name} por ${fmtMoneyBr(prop.total)}`
      + (prop.parcelas > 1 ? ` (${prop.parcelas} parcelas de ${fmtMoneyBr(prop.aVista)})` : ' à vista'));
    return { ok: true, msg: `${p.nome} vendido ao ${comprador.name} por ${fmtMoneyBr(prop.total)}`
      + (prop.parcelas > 1 ? ` — ${fmtMoneyBr(prop.aVista)} agora e mais ${prop.parcelas - 1} parcela(s)` : ' à vista'),
      clube: comprador.name, total: prop.total };
  }

  sellPlayer(playerId) {
    const user = this.userClub(); const p = user.squad.find((x) => x.id === playerId); if (!p) return { ok: false, msg: '' };
    if (user.squad.length <= CareerManager.MINIMO_ELENCO) {
      return { ok: false, msg: `Elenco mínimo: ${CareerManager.MINIMO_ELENCO} jogadores (11 em campo e 9 no banco)` };
    }
    user.squad = user.squad.filter((x) => x.id !== playerId);
    const v = Math.round(p.valorMercado * 0.9); user.caixa += v;
    const buyer = this.activeClubs().find((c) => c.id !== this.userClubId && c.squad.length < 26);
    if (buyer) buyer.squad.push(p); else { p.gols = 0; p.assist = 0; this.league.market.unshift(p); }
    if (this.lineupIds) this.lineupIds = this.lineupIds.filter((id) => id !== playerId);
    return { ok: true, msg: `Vendido ${p.nome} por ${fmtMoneyBr(v)}` };   // sem o € parecia numero solto
  }
}
