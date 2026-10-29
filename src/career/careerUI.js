// careerUI.js — interface do Modo Carreira (Brasfoot): painel, tática (com campo), mercado,
// tabela, artilharia/assistências e simulação com autores dos gols.
import { STATE } from './careerManager.js';
import { aviso, confirmar } from './aviso.js';
import { bestEleven, fmtMoney, deriveAttributes } from './database.js';
import { TACTICS, tacticByKey } from '../Tactics.js';
import { CAREER_CSS } from '../theme.js';
import { crest } from './crest.js';
import { acentoDoClube } from './corDoClube.js';
import { compTrophy, trophy } from './trophy.js';
import { bandeira, nomeDaLiga, rotuloDivisao, PESO, bandeiraDoJogador } from './paises.js';
import { FORMS, slotsDaFormacao, PARECIDAS, penalidadeDePosicao } from './formacoes.js';
import { classicoEntre } from './rivalidades.js';
import { disputaDePenaltis, CSS_PENALTIS } from './penaltis.js';

const hx = (n) => '#' + n.toString(16).padStart(6, '0');

// O botão "Dirigir a partida" é pintado com a COR DO CLUBE, e o texto dele era sempre
// escuro. No Corinthians, que é preto, o botão sumia: letra preta em fundo preto.
// A cor do clube fica como está — clarear deixava o vermelho do Flamengo cor-de-rosa
// — e o que muda é a cor da LETRA, conforme o fundo seja claro ou escuro.
const luz = (n) => {
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;   // luminância 0..1
};
const corTextoBotao = (n) => (luz(n) > 0.55 ? '#04121f' : '#f2f7ff');

// Coordenadas das formações (x%,y%) — gol embaixo (y=90), ataque em cima (y=20)
// "E. Haaland" -> "Haaland". O campinho mostrava o primeiro pedaço do nome, que num
// nome abreviado é só a inicial: a escalação inteira virava "E.", "L.", "B.".
function crestInline(clube) { return clube ? crest(clube, 18) : ''; }

function sobrenomeCurto(nome) {
  const ps = String(nome).trim().split(/\s+/);
  const ultimo = ps[ps.length - 1];
  return ultimo.length <= 2 && ps.length > 1 ? ps.slice(-2).join(' ') : ultimo;
}


const espera2 = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export class CareerUI {
  constructor(career, opts) {
    this.career = career; this.opts = opts || {}; this.onPlay = opts.onPlay; this.onPlayCup = opts.onPlayCup;
    const el = document.createElement('div'); el.id = 'careerRoot';
    el.innerHTML = `
      <style>${CAREER_CSS}${CSS_PENALTIS}</style><div class="cwrap" id="cbody"></div>`;
    document.body.appendChild(el); this.el = el; this.body = el.querySelector('#cbody');
    this.marketFilter = 'ALL';
    this.render();
  }
  show() { this.el.classList.remove('hidden'); this.render(); }
  hide() { this.el.classList.add('hidden'); }

  _nav() {
    // SEM EMOJI. O Gustavo: "não coloca emojis, fica horrível". A navegação se
    // resolve com tipografia: nome curto, caixa alta pequena, e a aba ativa marcada
    // pela cor do clube — como num placar de transmissão.
    const c = this.career;
    const tab = (k, label, cls = '') => `<button class="${cls} ${c.state === k ? 'active' : ''}" data-tab="${k}">${label}</button>`;
    return `<div class="cnav">${tab(STATE.DASHBOARD, 'Painel')}${tab(STATE.TACTICS, 'Elenco')}${tab(STATE.TRANSFERS, 'Mercado')}${tab(STATE.STANDINGS, 'Tabela')}${tab(STATE.STATS, 'Artilharia')}${tab(STATE.COPA, 'Copa')}${tab(STATE.CAL, 'Agenda')}${tab(STATE.BASE, 'Olheiro')}${tab(STATE.LIGAS, 'Ligas')}${tab(STATE.HIST, 'Histórico')}<span class="cnavsep"></span><button class="btn sec" data-save="1">Salvar</button><button class="btn sec" data-home="1">Menu</button><button class="play" data-tab="PLAY">Jogar</button></div>`;
  }
  /** A TELA DE ANTES DA PARTIDA.
   *
   *  Mostra o seu onze de hoje, quem não pode jogar e quem está sem energia, e
   *  deixa trocar jogador por jogador. O Gustavo: "eu substituo o jogador e ele
   *  só muda para aquela partida; para a próxima volta o meu time titular".
   *  Por isso a troca aqui vira `usarEscalacaoDaPartida` e morre com o jogo.
   *
   *  Devolve true para entrar em campo, false para voltar.
   */
  _checagem() {
    const c = this.career;
    const u = c.userClub();
    return new Promise((resolve) => {
      // a escalação de HOJE começa igual à titular; as trocas ficam só aqui
      let ids = (c.lineupDaPartida && c.lineupDaPartida.length
        ? c.lineupDaPartida : (c.lineupIds || [])).slice();

      const ov = document.createElement('div');
      ov.className = 'checagem';
      document.body.appendChild(ov);

      const jogDe = (id) => u.squad.find((p) => p.id === id);
      const vagas = slotsDaFormacao(c.formation) || [];

      const fechar = (r) => { ov.remove(); resolve(r); };

      const pintar = () => {
        const forca = Math.round(c.strengthOf(u, ids));
        const problemas = ids.map(jogDe).filter(Boolean).filter((p) => !c.isAvailable(p)).length;
        const cansados = ids.map(jogDe).filter(Boolean)
          .filter((p) => c.isAvailable(p) && (p.energia || 100) < 60).length;

        const linha = (id, i) => {
          const p = jogDe(id);
          const vaga = (vagas[i] && vagas[i].sub) || (p && (p.sub || p.posicao)) || '';
          if (!p) return `<div class="cklinha vazia"><span class="posn">${esc(vaga)}</span>
            <b>vaga aberta</b><button class="btn sec" data-troca="${i}">Escolher</button></div>`;
          const en = Math.round(p.energia || 100);
          const ruim = !c.isAvailable(p);
          const fraco = !ruim && en < 60;
          const aviso = ruim ? `<span class="tag tag-lesao">${esc(p.lesao > 0 ? (p.lesaoNome || 'lesionado') : 'suspenso')}</span>`
            : fraco ? `<span class="tag tag-fim">cansado</span>` : '';
          return `<div class="cklinha ${ruim ? 'fora' : fraco ? 'cansado' : ''}">
            <span class="posn">${esc(vaga)}</span>
            <div class="ckquem"><b>${esc(p.nome)}</b>${aviso}
              <i>${en}% de energia</i></div>
            <span class="ckovr">${p.forca}</span>
            <button class="btn sec" data-troca="${i}">Trocar</button></div>`;
        };

        ov.innerHTML = `<div class="ckcaixa">
          <div class="cktopo">
            <div><b>Escalação para esta partida</b>
              <i>As trocas valem só hoje — o seu time titular não muda.</i></div>
            <div class="ckforca"><span>Força</span><b>${forca}</b></div>
          </div>
          ${problemas || cansados ? `<div class="ckalerta">${
            problemas ? `${problemas} jogador${problemas > 1 ? 'es' : ''} não pode${problemas > 1 ? 'm' : ''} jogar. ` : ''}${
            cansados ? `${cansados} com pouca energia.` : ''}</div>` : ''}
          <div class="cklista">${ids.map(linha).join('')}</div>
          <div class="ckbs">
            <button class="btn sec" data-auto="1">Escalar o melhor time de hoje</button>
            <button class="btn sec" data-reset="1">Voltar ao titular</button>
          </div>
          <div class="ckfim">
            <button class="btn" data-ok="1">Entrar em campo</button>
            <button class="btn sec" data-nao="1">Voltar</button>
          </div></div>`;
        ligar();
      };

      const ligar = () => {
        ov.querySelectorAll('[data-troca]').forEach((n) => n.onclick = () => {
          abrirTroca(+n.dataset.troca);
        });
        const auto = ov.querySelector('[data-auto]');
        if (auto) auto.onclick = () => { ids = c.escalacaoAutomaticaDeHoje(); pintar(); };
        const reset = ov.querySelector('[data-reset]');
        if (reset) reset.onclick = () => { ids = (c.lineupIds || []).slice(); pintar(); };
        ov.querySelector('[data-ok]').onclick = () => {
          // igual ao titular? então nem precisa de escalação de partida
          const mesmo = ids.length === (c.lineupIds || []).length
            && ids.every((id, i) => id === c.lineupIds[i]);
          if (mesmo) c.limparEscalacaoDaPartida(); else c.usarEscalacaoDaPartida(ids);
          fechar(true);
        };
        ov.querySelector('[data-nao]').onclick = () => fechar(false);
      };

      /** Quem pode entrar na vaga i, do mais indicado para o menos. */
      const abrirTroca = (i) => {
        const vaga = (vagas[i] && vagas[i].sub)
          || (jogDe(ids[i]) && (jogDe(ids[i]).sub || jogDe(ids[i]).posicao)) || '';
        const dentro = new Set(ids);
        const opcoes = u.squad
          .filter((p) => !dentro.has(p.id) && c.isAvailable(p))
          .map((p) => ({ p, nota: p.forca - penalidadeDePosicao(vaga, p.sub || p.posicao)
            - ((p.energia || 100) < 60 ? 6 : 0) }))
          .sort((a, b) => b.nota - a.nota)
          .slice(0, 30);

        const cx = document.createElement('div');
        cx.className = 'checagem troca';
        cx.innerHTML = `<div class="ckcaixa">
          <div class="cktopo"><div><b>Quem joga de ${esc(vaga)}?</b>
            <i>Fora da posição o jogador rende menos.</i></div></div>
          <div class="cklista">${opcoes.map(({ p, nota }) => {
            const en = Math.round(p.energia || 100);
            const forade = penalidadeDePosicao(vaga, p.sub || p.posicao) > 0;
            return `<div class="cklinha" data-entra="${p.id}">
              <span class="posn">${esc(p.sub || p.posicao)}</span>
              <div class="ckquem"><b>${esc(p.nome)}</b>${forade
                ? '<span class="tag">fora de posição</span>' : ''}<i>${en}% de energia</i></div>
              <span class="ckovr">${p.forca}</span>
              <span class="cknota">${Math.round(nota)}</span></div>`;
          }).join('')}</div>
          <div class="ckfim"><button class="btn sec" data-fecha="1">Cancelar</button></div></div>`;
        document.body.appendChild(cx);
        cx.querySelector('[data-fecha]').onclick = () => cx.remove();
        cx.querySelectorAll('[data-entra]').forEach((n) => n.onclick = () => {
          ids[i] = +n.dataset.entra; cx.remove(); pintar();
        });
      };

      pintar();
    });
  }

  /** Clicar numa camisa do campo, no Elenco: escolhe quem joga naquela vaga.
   *  Aqui a troca é no TITULAR mesmo — é a tela de montar o time. */
  _trocaDaVaga(i) {
    const c = this.career;
    const u = c.userClub();
    const ids = (c.lineupIds || []).slice();
    const vagas = slotsDaFormacao(c.formation) || [];
    const atual = u.squad.find((p) => p.id === ids[i]);
    const vaga = (vagas[i] && vagas[i].sub) || (atual && (atual.sub || atual.posicao)) || '';
    const dentro = new Set(ids);

    const opcoes = u.squad
      .filter((p) => p.id !== ids[i])
      .map((p) => ({ p, nota: p.forca - penalidadeDePosicao(vaga, p.sub || p.posicao),
        titular: dentro.has(p.id) }))
      .sort((a, b) => b.nota - a.nota)
      .slice(0, 40);

    const cx = document.createElement('div');
    cx.className = 'checagem troca';
    cx.innerHTML = `<div class="ckcaixa">
      <div class="cktopo"><div><b>Quem joga de ${esc(vaga)}?</b>
        <i>${atual ? `Hoje é o ${esc(atual.nome)}. ` : ''}Quem já é titular troca de lugar.</i></div></div>
      <div class="cklista">${opcoes.map(({ p, nota, titular }) => {
        const ruim = !c.isAvailable(p);
        const forade = penalidadeDePosicao(vaga, p.sub || p.posicao) > 0;
        return `<div class="cklinha ${ruim ? 'fora' : ''}" data-entra="${p.id}">
          <span class="posn">${esc(p.sub || p.posicao)}</span>
          <div class="ckquem"><b>${esc(p.nome)}</b>${titular ? '<span class="tag">titular</span>' : ''}${
            forade ? '<span class="tag">fora de posição</span>' : ''}${
            ruim ? `<span class="tag tag-lesao">${esc(p.lesao > 0 ? 'lesionado' : 'suspenso')}</span>` : ''}
          <i>${Math.round(p.energia || 100)}% de energia</i></div>
          <span class="ckovr">${p.forca}</span>
          <span class="cknota">${Math.round(nota)}</span></div>`;
      }).join('')}</div>
      <div class="ckfim"><button class="btn sec" data-fecha="1">Cancelar</button></div></div>`;
    document.body.appendChild(cx);
    cx.querySelector('[data-fecha]').onclick = () => cx.remove();
    cx.querySelectorAll('[data-entra]').forEach((n) => n.onclick = () => {
      const entra = +n.dataset.entra;
      const j = ids.indexOf(entra);
      if (j >= 0) ids[j] = ids[i];        // já era titular: os dois trocam de vaga
      ids[i] = entra;
      c.lineupIds = ids;
      cx.remove();
      this.render();
    });
  }

  /** As pastilhas de forma de QUALQUER clube (V/E/D das últimas partidas).
   *  Estava sendo chamada pelo card do duelo mas nunca tinha sido escrita: o
   *  painel quebrava inteiro em dia de liga, e por isso "dirigir a partida"
   *  não respondia. */
  _pastilhasDe(clubId) {
    const f = (this.career.formaDe ? this.career.formaDe(clubId) : []) || [];
    if (!f.length) return '';
    return `<div class="forma">${f.slice(-5).map((r) => `<s class="f${r}">${r}</s>`).join('')}</div>`;
  }

  /** O HERÓI: escudo grande, nome do clube, linha da liga e o caixa.
   *  Na maquete ele é a primeira coisa da tela e as abas vêm logo abaixo —
   *  antes o nome e o caixa apareciam duas vezes, na barra e no painel. */
  _heroClube() {
    const c = this.career; const u = c.userClub(); const comp = c.userCompObj();
    const onde = c.round === 0 ? 'a estreia é agora' : `${c.userPosition()}º de ${c.nClubs()}`;
    return `<div class="idclube"><div class="idcorpo">${crest(u, 60)}
      <div class="idquem"><b>${esc(u.name)}</b>
        <span>${esc(nomeDaLiga(comp.country, comp.tier, comp.name))} · ${onde} · ${(c.startYear || 2026) + c.season - 1}</span></div>
      <div class="idcaixa"><i>Caixa</i><b>${fmtMoney(u.caixa)}</b></div></div></div>`;
  }

  _header() {
    const c = this.career; const u = c.userClub(); const comp = c.userCompObj();
    // O caixa entra no cabeçalho fixo: era um número que só existia no card do painel
    // e sumia quando você ia para o mercado — justo onde ele importa.
    const caixa = u.caixa != null
      ? `<div class="ctopcaixa"><b>${fmtMoney(u.caixa)}</b><span>caixa</span></div>` : '';
    // No painel quem manda é o herói; nas outras abas fica a barra compacta, que
    // é o mesmo conteúdo em tamanho de rodapé para não roubar a tela.
    if (c.state === STATE.DASHBOARD) return this._heroClube() + this._nav();
    return `<div class="ctop"><div class="clogo">${crest(u,30)}${u.name}
      <span class="muted" style="font-weight:600">${nomeDaLiga(comp.country, comp.tier, comp.name)} • ${c.year ? c.year() : c.season}</span></div>${caixa}</div>${this._nav()}`;
  }
  render() {
    const c = this.career;
    if (c.state === STATE.MAIN_MENU) return this._renderMenu();
    let html = this._header();
    if (c.state === STATE.DASHBOARD) html += this._renderDash();
    else if (c.state === STATE.TACTICS) html += this._renderTactics();
    else if (c.state === STATE.TRANSFERS) html += this._renderTransfers();
    else if (c.state === STATE.STANDINGS) html += this._renderStandings();
    else if (c.state === STATE.STATS) html += this._renderStats();
    else if (c.state === STATE.LIGAS) html += this._renderLigas();
    else if (c.state === STATE.COPA) html += this._renderCopa();
    else if (c.state === STATE.BASE) html += this._renderGarotos();
    else if (c.state === STATE.CAL) html += this._renderCalendar();
    else if (c.state === STATE.OLHEIRO) html += this._renderGarotos();
    else if (c.state === STATE.HIST) html += this._renderHistory();
    // A CARA DO SEU CLUBE NA INTERFACE INTEIRA. Nos jogos de futebol de hoje a tela
    // veste as cores do time: aqui o clube pinta a aba ativa, os destaques da tabela
    // e a barra de cima. Sai de duas variáveis, o resto do CSS se vira.
    // A CARA DO SEU CLUBE NA TELA INTEIRA.
    //
    // A cor não sai mais só do campo `primary`: clube preto-e-branco (Corinthians,
    // Botafogo, Vasco) deixava a tela cinza, que é o mesmo que não ter identidade.
    // Agora, quando o clube é monocromático, o acento vem da cor dominante do
    // ESCUDO dele. Nada inventado — é a cor do próprio clube.
    try {
      const u = c.userClub && c.userClub();
      if (u) {
        const svgEscudo = String(crest(u, 240));
        const pintar = (ui) => {
          this.body.style.setProperty('--clube1', ui);
          this.body.style.setProperty('--clube2', ui);
          this.body.style.setProperty('--clubetxt', corTextoBotao(parseInt(ui.replace('#', ''), 16)));
        };
        pintar(acentoDoClube(u, svgEscudo, (corDoEscudo) => pintar(corDoEscudo)));
        // o escudo gigante e apagado atrás do cabeçalho: é o que faz a tela ser DO
        // clube. Vai por setProperty porque o data: do escudo tem ';' e quebraria
        // um style="" inline.
        const mImg = svgEscudo.match(/src="([^"]+)"/);
        const inline = svgEscudo.replace(/^[\s\S]*?(<svg)/, '$1').replace(/<\/span>\s*$/, '');
        this.body.style.setProperty('--marca', mImg ? `url("${mImg[1]}")`
          : `url("data:image/svg+xml;utf8,${encodeURIComponent(inline)}")`);
      }
    } catch (e) { /* sem clube ainda: fica o tema padrão */ }
    this.body.innerHTML = html; this._wire();
  }

  // ---------------------------------------------------------- escolher clube
  // Três passos, como no FIFA: país → liga → clube. A versão anterior jogava as 74
  // ligas numa lista só, com um quadradinho "D1" do lado, e era ilegível.
  _renderMenu() {
    const c = this.career;
    if (this._pickComp != null) return this._menuClubes();
    if (this._pickPais != null) return this._menuLigas();
    return this._menuPaises();
  }

  /** A faixa que explica o teto de quem foi demitido. Sem ela o clube trancado
   *  parece bug. */
  _avisoDemitido() {
    const c = this.career;
    if (!c.tetoTreinador) return '';
    return `<div class="panel" style="border-color:#ef4444;background:#170a0a;margin-bottom:12px">
      <b style="color:#ef4444">Sem clube</b>
      <div class="muted" style="margin-top:5px">O ${esc(c.demitidoDe || 'seu último clube')} te demitiu, e isso pesa no seu nome.
      Por enquanto só clubes de força até <b>${c.tetoTreinador}</b> te chamam — os outros aparecem trancados.
      Faça um bom trabalho e os grandes voltam a ligar.</div></div>`;
  }

  _menuPaises() {
    const c = this.career;
    const porPais = {};
    c.competitions().forEach((cp) => (porPais[cp.country] = porPais[cp.country] || []).push(cp));
    // ordem pela FORÇA de verdade da primeira divisão de cada país (média dos clubes),
    // e não por uma lista fixa. O peso só desempata.
    if (!this._forcaPais) {
      this._forcaPais = {};
      for (const pais in porPais) {
        const primeira = porPais[pais].slice().sort((a, b) => a.tier - b.tier)[0];
        const cls = c.clubsOfComp(primeira.id);
        this._forcaPais[pais] = cls.length ? cls.reduce((s2, cl) => s2 + c.strengthOf(cl), 0) / cls.length : 0;
      }
    }
    // BUSCA. São 54 países em ordem alfabética, e o Gustavo: "país, 54 opções em
    // ordem alfabética, África do Sul primeiro, sem busca". Digitar 'ing' já leva
    // à Inglaterra; o nome do CLUBE também vale, para quem sabe o time mas não
    // lembra em que país ele joga.
    const semAcento = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const q = semAcento((this._buscaPais || '').trim());
    let paises = Object.keys(porPais).sort((x, y) => x.localeCompare(y, 'pt-BR'));
    if (q) {
      const porNome = paises.filter((p) => semAcento(p).includes(q));
      const porClube = porNome.length ? [] : paises.filter((p) => porPais[p].some((lg) =>
        c.clubsOfComp(lg.id).some((cl) => semAcento(cl.name).includes(q))));
      paises = porNome.length ? porNome : porClube;
    }

    this.body.innerHTML = `${this._avisoDemitido()}<div class="panel"> <h2>Escolha o país</h2> <input id="buscaPais" placeholder="Buscar país ou clube..." value="${esc(this._buscaPais || '')}" autocomplete="off"> <div class="muted" style="margin-bottom:14px">${c.competitions().length} ligas • ${c.league.meta ? c.league.meta.players.toLocaleString('pt-BR') : ''} jogadores</div> <div class="paises">${paises.map((p) => {
        const ligas = porPais[p];
        const clubes = ligas.reduce((s, l) => s + l.clubIds.length, 0);
        return `<button class="pais" data-pais="${esc(p)}"><span class="flag">${bandeira(p)}</span> <span class="pnome">${esc(p)}</span> <span class="muted">${ligas.length} ${ligas.length === 1 ? 'liga' : 'ligas'} • ${clubes} clubes</span></button>`;
      }).join('')}</div></div>`;

    this.body.querySelectorAll('[data-pais]').forEach((n) => (n.onclick = () => {
      this._pickPais = n.dataset.pais; this.render();
    }));
    const bp = this.body.querySelector('#buscaPais');
    if (bp) {
      bp.oninput = () => { this._buscaPais = bp.value; this.render(); };
      bp.focus();
      bp.setSelectionRange(bp.value.length, bp.value.length);
    }
  }

  _menuLigas() {
    const c = this.career;
    const pais = this._pickPais;
    const ligas = c.competitions().filter((cp) => cp.country === pais).sort((a, b) => a.tier - b.tier);

    this.body.innerHTML = `<div class="panel"> <button class="btn sec" id="voltar" style="margin-bottom:14px">← Trocar de país</button> <h2><span style="font-size:22px">${bandeira(pais)}</span> ${esc(pais)}</h2> <div class="ligas">${ligas.map((cp) => {
        const forca = Math.round(c.clubsOfComp(cp.id).reduce((s, cl) => s + c.strengthOf(cl), 0) / Math.max(1, cp.clubIds.length));
        return `<button class="liga t${Math.min(4, cp.tier)}" data-comp="${cp.id}"><span class="tierbar"></span> <span class="lnome">${esc(nomeDaLiga(pais, cp.tier, cp.name))}</span> <span class="muted">${rotuloDivisao(cp.tier)} • ${cp.clubIds.length} clubes • força média ${forca}</span></button>`;
      }).join('')}</div></div>`;

    this.body.querySelector('#voltar').onclick = () => { this._pickPais = null; this.render(); };
    this.body.querySelectorAll('[data-comp]').forEach((n) => (n.onclick = () => {
      this._pickComp = +n.dataset.comp; this.render();
    }));
  }

  _menuClubes() {
    const c = this.career;
    const comp = c.compById(this._pickComp);
    // Ordem alfabética, não por força: procurar um clube pelo nome numa lista de 20
    // é o que se faz aqui, e ordenar por força obriga a varrer a tela inteira.
    // 'pt-BR' para o Á e o Ç caírem no lugar certo, e ignorePunctuation para o
    // "Al Batin" não pular na frente do "Al-Ahli" só por causa do hífen.
    const semAcento2 = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const qc = semAcento2((this._buscaClube || '').trim());
    const clubes = c.clubsOfComp(comp.id)
      .map((cl) => { cl._avg = Math.round(c.strengthOf(cl)); return cl; })
      .filter((cl) => !qc || semAcento2(cl.name).includes(qc))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base', ignorePunctuation: true }));

    // AS FICHAS DE CLUBE, no espírito do FIFA: escudo grande, estrelas, o overall
    // em destaque e as três barras (ataque, meio, defesa). Antes era uma lista de
    // linhas com o escudo pequeno e um número — não dava para escolher o time
    // olhando, que é a graça dessa tela.
    const ficha = (cl) => {
      const nota = (grupos, n) => {
        const l = cl.squad.filter((p) => grupos.includes(p.grupo || p.posicao))
          .sort((a, b) => b.forca - a.forca).slice(0, n);
        return l.length ? Math.round(l.reduce((t, p) => t + p.forca, 0) / l.length) : 0;
      };
      const ata = nota(['A'], 3), mei = nota(['M'], 4), def = nota(['Z', 'L', 'G'], 5);
      // estrelas de 0,5 em 0,5, como no FIFA: força 50 vale 1, força 86 vale 5
      const e = Math.max(1, Math.min(10, Math.round((cl._avg - 46) / 4)));
      const cheias = Math.floor(e / 2), meia = e % 2;
      const estrelas = Array.from({ length: 5 }, (_, i) => i < cheias ? 'c' : (i === cheias && meia ? 'm' : 'v'))
        .map((k) => `<s class="e${k}"></s>`).join('');
      const barra = (rot, v) => `<div class="fbarra"><i>${rot}</i>
        <span><em style="width:${Math.max(5, Math.min(100, (v - 40) / 50 * 100))}%"></em></span><b>${v || '-'}</b></div>`;
      return { ata, mei, def, estrelas, barra };
    };

    this.body.innerHTML = `${this._avisoDemitido()}<div class="panel escolhaclube">
      <button class="btn sec" id="voltar" style="margin-bottom:16px">← Trocar de liga</button>
      <h2><span style="font-size:22px">${bandeira(comp.country)}</span> ${esc(nomeDaLiga(comp.country, comp.tier, comp.name))}</h2>
      <div class="muted" style="margin-bottom:12px">Escolha o clube que você vai treinar.</div>
      <input id="buscaPais" placeholder="Buscar clube..." value="${esc(this._buscaClube || '')}" autocomplete="off">
      <div class="gradeclubes">${clubes.map((cl) => {
        const pode = c.podeAssumir(cl.id);
        const f = ficha(cl);
        const cor = hx(cl.primary), cor2 = hx(cl.secondary);
        return `<button class="fclube ${pode ? '' : 'trancado'}" ${pode ? `data-club="${cl.id}"` : 'disabled'}
          style="--c1:${cor};--c2:${cor2}">
          <div class="fescudo">${crest(cl, 76)}</div>
          <div class="fnome">${esc(cl.name)}</div>
          <div class="festrelas">${f.estrelas}</div>
          <div class="fovr"><span>Força</span><b>${cl._avg}</b></div>
          <div class="fbarras">${f.barra('ATA', f.ata)}${f.barra('MEI', f.mei)}${f.barra('DEF', f.def)}</div>
          <div class="felenco">${cl.squad.length} jogadores${pode ? '' : ' · não te querem'}</div>
        </button>`;
      }).join('')}</div></div>`;

    this.body.querySelector('#voltar').onclick = () => { this._pickComp = null; this.render(); };
    const bc = this.body.querySelector('#buscaPais');
    if (bc) { bc.oninput = () => { this._buscaClube = bc.value; this.render(); };
      bc.focus(); bc.setSelectionRange(bc.value.length, bc.value.length); }
    this.body.querySelectorAll('[data-club]').forEach((n) => (n.onclick = () => {
      c.selectClub(+n.dataset.club); c.state = STATE.DASHBOARD;
      this._pickComp = null; this._pickPais = null; this.render();
    }));
  }

  // ---------------------------------------------------------- categoria de base
  //
  // Todo ano a base revela garotos. Você escolhe quem sobe. Quem fica de fora vai
  // embora — não dá para guardar todo mundo, e é isso que torna a escolha difícil.
  _telaBase() {
    const c = this.career;
    const garotos = c.baseRevelada || [];
    if (!garotos.length) return this.render();
    const escolhidos = new Set();

    const ov = document.createElement('div');
    ov.className = 'cov';
    const desenhar = () => {
      ov.innerHTML = `<div class="ccard" style="max-width:620px;border-color:var(--line-hot)"> <h3>Garotos da base — ${c.year()}</h3> <p class="muted" style="margin-bottom:14px">A base do ${esc(c.userClub().name)} revelou ${garotos.length} jogadores.
          Escolha quem sobe para o profissional. Quem ficar de fora deixa o clube.</p> <div style="display:flex;flex-direction:column;gap:7px;max-height:44vh;overflow:auto"> ${garotos.map((g) => `<div class="prop ${escolhidos.has(g.id) ? 'sel' : ''}" data-g="${g.id}"> <span class="pos ${g.posicao}">${g.sub || g.posicao}</span> <div style="flex:1"><b>${esc(g.nome)}${g.joia ? ' <span class="joia">JOIA DA GERAÇÃO</span>' : ''}</b> <div class="muted">${g.idade} anos • overall ${g.forca} • teto <b class="ok">${g.potencial}</b></div></div> <span class="marca">${escolhidos.has(g.id) ? '✓' : ''}</span></div>`).join('')}
</div> <div class="muted" style="margin-top:11px">Selecionados: <b>${escolhidos.size}</b> de ${garotos.length}</div> <div class="opts" style="justify-content:center;margin-top:14px"> <button class="btn" id="baseOk">${escolhidos.size ? 'Subir os escolhidos' : 'Não subir ninguém'}</button></div></div>`;
      ov.querySelectorAll('[data-g]').forEach((n) => (n.onclick = () => {
        const id = +n.dataset.g;
        if (escolhidos.has(id)) escolhidos.delete(id); else escolhidos.add(id);
        desenhar();
      }));
      ov.querySelector('#baseOk').onclick = () => {
        c.promoverDaBase([...escolhidos]);
        ov.remove();
        this.render();
      };
    };
    desenhar();
    document.body.appendChild(ov);
  }

  // pop-up da final de copa
  _abrirFinal() {
    const c = this.career;
    const cup = c.cupFinalPending;
    const rival = c.cupOpponentInFinal();
    if (!cup || !rival) return;
    this._finalAberta = true;
    const u = c.userClub();

    const ov = document.createElement('div');
    ov.className = 'cov';
    ov.innerHTML = `<div class="ccard"> <div style="display:flex;justify-content:center;margin-bottom:6px">${compTrophy(cup.name, 72)}</div> <div class="muted" style="letter-spacing:.3em;text-transform:uppercase;font-size:11px">Final</div> <h3>${esc(cup.name)}</h3> <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin:16px 0"> <div style="flex:1;text-align:right">${crest(u, 42)}<div style="font-weight:800;margin-top:5px">${esc(u.name)}</div></div> <div style="font-family:var(--font-head);font-size:24px;color:var(--ink-dim)">vs</div> <div style="flex:1;text-align:left">${crest(rival, 42)}<div style="font-weight:800;margin-top:5px">${esc(rival.name)}</div></div></div> <p class="muted" style="margin-bottom:16px">É a decisão do título. Como você quer viver esse jogo?</p> <div style="display:flex;flex-direction:column;gap:9px"> <button class="btn" data-f="time">Dirigir a final, minuto a minuto</button> <button class="btn sec" data-f="skip">Pular direto para o resultado</button></div></div>`;
    document.body.appendChild(ov);

    ov.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => {
      ov.remove();
      this._finalAberta = false;
      const acao = b.dataset.f;
      if (acao === 'play') { this.hide(); this.onPlayCup(); return; }
      this._decidirFinal(cup, rival, acao);
    }));
  }

  // Resolve a final. Se empatar no tempo normal, a decisão vai para os PÊNALTIS —
  // e os pênaltis são jogáveis: você escolhe o canto de cada cobrança.
  async _decidirFinal(cup, rival, acao) {
    const c = this.career;
    const u = c.userClub();
    const est = c.iniciarPartidaAoVivo ? null : null;   // a final usa o caminho simples

    // gols do tempo normal
    const uStr = c.strengthOf(u, c._availLineup()), oStr = c.strengthOf(rival);
    let ug = 0, og = 0;
    const sim = c.simulateCupFinalSemDecidir
      ? c.simulateCupFinalSemDecidir(cup)
      : null;

    // usa o caminho existente, mas segurando o empate para os pênaltis
    const res = c.simulateCupFinalTempoNormal(cup);
    ug = res.userGoals; og = res.oppGoals;

    if (acao === 'sim') await this._assistirEsperando(res, rival);
    else if (acao === 'time') await this._assistirEsperando(res, rival, true);

    if (ug === og) {
      const r = await disputaDePenaltis({
        nomeA: u.name, nomeB: rival.name,
        escudoA: crest(u, 26), escudoB: crest(rival, 26),
        forcaA: Math.round(uStr), forcaB: Math.round(oStr),
        subtitulo: `${cup.name} · disputa de pênaltis`,
      });
      c.registrarFinal(cup, ug, og, r.venceuA, r.golsA, r.golsB);
    } else {
      c.registrarFinal(cup, ug, og, ug > og, 0, 0);
    }
    c.state = STATE.DASHBOARD;
    this.render();
  }

  _assistirEsperando(res, rival, tempo) {
    return new Promise((resolve) => {
      if (tempo) this._watchTime({ events: res.events }, rival, resolve);
      else this._watchSim({ events: res.events }, rival, resolve);
    });
  }

  _renderDash() {
    const c = this.career; const u = c.userClub(); const opp = c.opponentClub(); const comp = c.userCompObj();
    let summary = '';
    if (c._seasonJustEnded && c.seasonSummary) {
      const s = c.seasonSummary;   // fica na tela até você fechar (antes sumia ao mudar de aba)
      const bd = s.ballonDor;
      const trf = (s.transfers || []).slice(0, 5).map((t) => `${t.p} (${t.from} → <b>${t.to}</b>) ${fmtMoney(t.val)}`).join('<br>');
      const cupsHtml = (s.cups || []).filter((cp) => cp.winner).map((cp) => `<div>${cp.name}: <b style="color:${cp.userWon ? '#22c55e' : '#e6edf7'}">${cp.winner}</b>${cp.userWon ? '  (você!)' : ''}</div>`).join('');
      const b = s.board || {};
      const boardHtml = b.fired
        ? `<div class="panel" style="border-color:#ef4444;background:#1a0000;margin-top:8px"><b style="color:#ef4444"> Você foi demitido!</b> <span class="muted">(terminou em ${b.finish}º, meta era top ${b.target}${b.relegated ? ', com rebaixamento' : ''})</span><div style="margin-top:6px"><button class="btn" data-action="newclub">Escolher novo clube</button></div></div>`
        : (b.offers && b.offers.length)
          ? `<div class="panel" style="border-color:#1f6fe0;margin-top:8px"><b style="color:#54a8ff"> Propostas de clubes maiores!</b><div style="margin-top:6px;display:flex;flex-direction:column;gap:6px">${b.offers.map((o) => `<div class="row" style="padding:4px 6px"><span>${o.name} <span class="muted">(${o.comp})</span></span><button class="btn" data-offer="${o.id}">Aceitar</button></div>`).join('')}<div class="muted">Ou fique e ignore as propostas.</div></div></div>`
          : '';
      // O resumo era uma parede de texto: sete linhas soltas de acesso, rebaixamento,
      // cinco transferências e nove campeões nacionais, tudo corrido. O Gustavo:
      // "essa parte aqui está muito feio, muita informação, muita escrita. Não estou
      // conseguindo ler porque está muito bagunçada. Um negócio mais simples."
      //
      // Agora é um cartão com o essencial em blocos: como VOCÊ terminou, o que foi
      // ganho na temporada, e o mundo em uma linha só.
      const meta = s.metaEhFuga ? 'a meta era escapar do rebaixamento' : `a meta era o top ${s.objective}`;
      const cumpriu = s.metaEhFuga ? s.userFinish < 17 : s.userFinish <= s.objective;
      const seusTitulos = (s.cups || []).filter((cp) => cp.userWon).map((cp) => cp.name);
      const outrosTitulos = (s.cups || []).filter((cp) => cp.winner && !cp.userWon);

      summary = `<div class="panel fimtemp">
        <div class="fimtopo ${cumpriu ? 'bom' : 'ruim'}">
          <div class="fimpos">${s.userFinish}º</div>
          <div><b>Fim da temporada</b><span>${esc(s.userWas)} · ${meta}</span></div>
          ${seusTitulos.length ? `<div class="fimtit">${seusTitulos.map((t) => `${compTrophy(t, 30)}`).join('')}</div>` : ''}</div>

        ${seusTitulos.length ? `<div class="fimlinha ok"><b>Você levantou:</b> ${seusTitulos.map(esc).join(', ')}</div>` : ''}
        <div class="fimlinha"><b>Campeão de ${esc(s.userWas)}:</b> ${esc(s.champion)}</div>
        ${s.premio ? `<div class="fimlinha ok"><b>Premiação da temporada:</b> ${fmtMoney(s.premio.total)}
          <span class="muted">${s.premio.itens.slice(0, 3).map((i) => esc(i.o)).join(' · ')}</span></div>` : ''}
        ${outrosTitulos.length ? `<div class="fimlinha muted">${outrosTitulos.map((cp) => `${esc(cp.name)}: ${esc(cp.winner)}`).join(' · ')}</div>` : ''}
        ${bd ? `<div class="fimlinha"><b>Bola de Ouro:</b> <span style="color:#f5c518">${esc(bd.nome)}</span>
          <span class="muted">${esc(bd.club)}</span>
          <div class="muted" style="font-size:11.5px;margin-top:2px">${esc(bd.porque || `${bd.gols} gols e ${bd.assist} assistências`)}</div></div>` : ''}
        ${s.mundo && s.mundo.ligas.length
          ? `<div class="fimmundo">${s.mundo.champions ? `<span><b>Champions</b> ${esc(s.mundo.champions)}</span>` : ''}${s.mundo.ligas.map((l) => `<span>${bandeira(l.pais)} ${esc(l.campeao)}</span>`).join('')}</div>` : ''}

        ${s.evolucao && s.evolucao.length ? `<div class="evogrid">
          <span class="evotit">Cresceram no ano · treino em ${esc({ base: 'a base', ataque: 'ataque', defesa: 'defesa', fisico: 'físico' }[s.treino || 'base'])}</span>
          ${s.evolucao.map((x) => `<span class="evochip up">${esc(x.sub)} ${esc(x.nome)} <b>${x.de}→${x.para}</b></span>`).join('')}
          ${(s.caiu || []).map((x) => `<span class="evochip down">${esc(x.sub)} ${esc(x.nome)} <b>${x.de}→${x.para}</b></span>`).join('')}
        </div>` : ''}

        <details class="fimmais"><summary>ver os detalhes da temporada</summary>
          ${s.awards && s.awards.revelacao ? `<div class="fimlinha muted">Revelação: ${esc(s.awards.revelacao)} · Melhor goleiro: ${esc(s.awards.goleiro)}</div>` : ''}
          ${s.promoted.length ? `<div class="fimlinha muted">Subiram: ${s.promoted.map(esc).join(', ')}</div>` : ''}
          ${s.relegated.length ? `<div class="fimlinha muted">Caíram: ${s.relegated.map(esc).join(', ')}</div>` : ''}
          ${trf ? `<div class="fimlinha muted" style="line-height:1.7">${trf}</div>` : ''}
        </details>

        <div class="fimrodape">
          <span class="muted">A tabela e a artilharia desta temporada continuam nas abas até você começar a próxima.</span>
          <button class="btn" data-action="fecharresumo">Começar ${esc(nomeDaLiga(comp.country, comp.tier, comp.name))}</button></div>
      </div>${boardHtml}`;
    }
    // A FINAL interrompe o jogo: vira pop-up bloqueante, não um aviso perdido no
    // meio do painel que dava para ignorar sem perceber.
    const cupPrompt = '';
    // A final não pode saltar por cima do resumo de fim de temporada: a temporada
    // nova começa por dentro do fim da antiga, e a Recopa da nova aparecia como
    // pop-up bloqueante em cima do balanço do ano que acabou de terminar.
    if (c.cupFinalPending && !this._finalAberta && !c._seasonJustEnded) this._abrirFinal();
    const seasonDone = c.isSeasonOver();
    // Mesma regra do painel de copas: sem ter entrado, não é "eliminado".
    const inscritoEm = (cup) => cup.entradas
      ? cup.entradas.some((e) => e.includes(c.userClubId))
      : cup.alive.includes(c.userClubId) || (cup.results || []).length > 0;
    const cupStatus = c.cupsList().filter(inscritoEm).map((cup) => {
      const sit = c.cupUserSituacao ? c.cupUserSituacao(cup) : (c.cupUserAlive(cup) ? 'vivo' : 'eliminado');
      const txt = sit === 'campeao' ? 'CAMPEÃO'
        : sit === 'vivo' ? `classificado — ${cup.stages[cup.stage] || 'Final'} a disputar`
        : sit === 'entra' ? `você entra na ${String(c.cupFaseDeEntrada(cup) || 'fase seguinte').toLowerCase()}`
        : 'eliminado';
      return `<span class="stat">${cup.name}: <b>${txt}</b></span>`;
    }).join('');
    // UM botão principal, não seis. Antes havia "Jogar em 3D", "Assistir (bonecos)",
    // "Dirigir a partida", "Simular (tempo)", "Avançar rodada" e "Simular temporada"
    // lado a lado, cada um de uma cor, e não dava para saber qual era O botão.
    // Agora: dirigir a partida é o principal, simular é o secundário, e o resto fica
    // atrás de "outras formas de jogar".
    // Com o resumo de fim de temporada aberto, os botões de jogar somem: o Gustavo
    // quase começou a próxima temporada sem ver como a dele tinha terminado.
    const actions = (c._seasonJustEnded)
      ? '<div class="muted" style="margin:14px 20px">Feche o resumo da temporada (o botão verde lá em cima) para começar a próxima. A tabela, a artilharia, as copas e as ligas do mundo ainda mostram o ano que acabou.</div>'
      : seasonDone
      ? '<div class="muted" style="margin-top:14px">Temporada encerrada — confira a tabela e a artilharia.</div>'
      : `<div class="jogarbarra" style="--cor:${hx(u.primary)};--cortxt:${corTextoBotao(u.primary)}"> <button class="btnjogo" data-action="aovivo"${opp ? '' : ' disabled'}>Dirigir a partida</button> <button class="btnjogo sec" data-action="skip">Simular</button></div> <details class="maisjeitos"><summary>outras formas de jogar</summary> <div class="maisgrid"> <button class="btn sec" data-action="simtime">Minuto a minuto</button></div></details>
      <div class="maisgrid" style="padding:0 20px 14px"><button class="btn sec" data-action="auto">Simular a temporada inteira</button></div>`;
    const myTac = c.tacticOf(u);
    let next, tacLine = '';
    if (seasonDone) next = 'Temporada encerrada.';
    else if (opp) {
      next = `Rodada ${c.round + 1}/${c.totalRounds()} — <b>${c.userIsHome() ? 'em casa' : 'fora'}</b> vs <b>${opp.name}</b>`;
      tacLine = `<div class="muted" style="margin-top:6px">Seu modelo: <b style="color:#7fe3a0">${myTac.name}</b> • ${opp.name} joga no <b style="color:#ffb454">${c.tacticOf(opp).name}</b></div>`;
    } else next = `Rodada ${c.round + 1}/${c.totalRounds()} — <b>folga nesta rodada</b>`;
    // DE ONDE VEM E PARA ONDE VAI O DINHEIRO. O Gustavo, com o Vaduz: "meu caixa
    // está negativo e eu não sei por quê". A linha antiga só mostrava bilheteria e
    // folha — o patrocínio e o custo de operar, que são o grosso, ficavam escondidos.
    const f2 = c._lastFinance;
    const fin = f2 ? `<div class="panel financas">
      <div class="fintit">Contas da última rodada</div>
      <div class="fingrid">
        <div class="finit"><span>Bilheteria</span><b class="mais">${fmtMoney(f2.bilheteria)}</b>
          <i>${f2.publico ? `${f2.publico.toLocaleString('pt-BR')} pagantes` : 'jogo fora de casa'}</i></div>
        <div class="finit"><span>Patrocínio</span><b class="mais">${fmtMoney(f2.patrocinio)}</b><i>parcela da temporada</i></div>
        <div class="finit"><span>Folha</span><b class="menos">−${fmtMoney(f2.folha)}</b><i>de ${fmtMoney(f2.folhaMensal)} por mês</i></div>
        <div class="finit"><span>Operação</span><b class="menos">−${fmtMoney(f2.operacao)}</b><i>estrutura, viagem, base</i></div>
        <div class="finit total"><span>Saldo da rodada</span><b class="${f2.saldo >= 0 ? 'mais' : 'menos'}">${f2.saldo >= 0 ? '' : '−'}${fmtMoney(Math.abs(f2.saldo))}</b>
          <i>caixa: ${fmtMoney(u.caixa)}</i></div></div>
      ${u.caixa < 0 ? `<div class="finalerta">No vermelho. A folha de ${fmtMoney(f2.folhaMensal)} por mês é grande para o que o clube arrecada —
        venda alguém, ou deixe um salário alto acabar. Se o buraco crescer demais, a diretoria vende por você.</div>`
        : f2.saldo < 0 ? '<div class="finalerta leve">Esta rodada fechou no negativo. Jogo em casa e campanha boa trazem mais dinheiro.</div>' : ''}
    </div>` : '';
    // card do resultado da última partida
    let lastCard = '';
    const lr = c._lastUserResult;
    if (lr && !lr.bye) {
      const cor = lr.res === 'V' ? '#22c55e' : lr.res === 'D' ? '#ef4444' : '#f5c518';
      const rot = lr.res === 'V' ? 'Vitória' : lr.res === 'D' ? 'Derrota' : 'Empate';
      const advDoJogo = c.clubById(lr.oppId);
      const artil = (lr.events || []).map((e) => {
        const meu = e.side === 'user';
        return `<div class="golinha ${meu ? 'meu' : 'dele'}"><span class="golmin">${e.minute}'</span>${
          crest(meu ? u : advDoJogo, 16)}<b>${esc(e.scorer)}</b>${
          e.assist ? ` <span class="muted">(${esc(e.assist)})</span>` : ''}</div>`;
      }).join('') || '<span class="muted">Ninguém marcou</span>';
      lastCard = `<div class="panel" style="border-color:${cor}"><h2>Resultado da última partida — <span style="color:${cor}">${rot}</span></h2> <div style="font-size:22px;font-weight:900;margin:4px 0">${u.name} <span style="color:${cor}">${lr.userGoals} x ${lr.oppGoals}</span> ${lr.opp} <span class="muted" style="font-size:13px;font-weight:600">(${lr.home ? 'casa' : 'fora'})</span></div> <div style="font-size:13px;line-height:1.6">${artil}</div></div>`;
    }
    // aviso de clássico antes do jogo
    const cl = c.classicoDaRodada();
    const avisoClassico = cl ? `<div class="classico"> <div><b>${esc(cl.nome)}</b> <div class="muted">Contra o ${esc(cl.rival)}. Vencer levanta o elenco e o seu prestígio; perder abre crise.</div></div></div>` : '';

    // o herói virou o cabeçalho da tela (_heroClube); aqui ficam só as cores que o
    // card do jogo ainda usa no degradê
    const cor = hx(u.primary), cor2 = hx(u.secondary);
    const cabecalho = '';

    // ---- forma recente em pastilhas ----
    // Cada pastilha diz contra quem foi e em quanto: passar o mouse mostra
    // "3x0 no Vasco (casa)". Antes era só a letra V, e não dava para saber de quem.
    const pastilhas = (arr) => {
      const det = c.formaDetalhe || [];
      const desloc = (arr || []).length - det.length;
      // O adversário passou a aparecer NA TELA, não só no title. O Gustavo:
      // "está mostrando vitória e derrota, só que não está mostrando o adversário".
      return `<div class="forma">${(arr || []).map((r, i) => {
        const d = det[i - desloc];
        if (!d) return `<s class="f${r}">${r}</s>`;
        const adv = d.oppId != null ? c.clubById(d.oppId) : null;
        const dica = `${d.gp}x${d.gc} ${d.res === 'V' ? 'no' : d.res === 'D' ? 'para o' : 'com o'} ${d.opp} (${d.home ? 'casa' : 'fora'})`;
        return `<span class="fchip f${r}" title="${esc(dica)}">
          ${adv ? crest(adv, 18) : ''}
          <span class="fcol"><b>${d.gp}<em>x</em>${d.gc}</b>
          <i>${esc(d.opp)} · ${d.home ? 'casa' : 'fora'}</i></span></span>`;
      }).join('') || '<span class="muted" style="font-size:11px">sem jogos ainda</span>'}</div>`;
    };

    // ---- o compromisso de hoje ----
    //
    // A temporada não é mais só as 38 rodadas da liga: cada fase de copa tem o seu
    // dia. Quando hoje é dia de copa, o card mostra a COPA e a fase, não o próximo
    // jogo do Brasileirão — que só acontece depois.
    let cardJogo = '';
    const copaHoje = !seasonDone && c.hojeEhCopa ? c.copaDeHoje() : null;
    if (copaHoje) {
      const d = c.compromissoDeHoje();
      const fase = copaHoje.stages[d.fase] || 'Final';
      const euVivo = (copaHoje.alive || []).includes(c.userClubId);
      const entro = (copaHoje.entraDoUsuario || 0) === d.fase;
      // o card usa a cor do CLUBE, não um amarelo genérico — era ele que deixava o
      // card do dia de copa com aquele tom encardido
      const cor = hx(u.primary);
      const duelo = c.adversarioNaCopaHoje && c.adversarioNaCopaHoje();
      if (duelo) {
        // Dia de copa com confronto definido: o card vira o mesmo card de jogo da
        // liga, com os dois escudos — e os botões jogam A COPA, não a rodada.
        cardJogo = `<div class="jogocard" style="--cor:${cor};--cor2:${hx(duelo.adversario.primary)}">
          <div class="jogotopo"><b>${esc(copaHoje.name)}</b><span>${esc(duelo.fase)}${copaHoje.tag ? ' · ' + esc(copaHoje.tag) : ''}</span></div>
          <div class="duelo"> <div class="lado">${crest(u, 60)}
            <div><b>${esc(u.name)}</b> <i>VOCÊ</i>${this._pastilhasDe(u.id)}</div></div>
            <div class="vs">VS</div>
            <div class="lado dir">${crest(duelo.adversario, 56)}
            <div><b>${esc(duelo.adversario.name)}</b> <i>ADVERSÁRIO</i>${this._pastilhasDe(duelo.adversario.id)}</div></div></div>
          <div class="jogotat">Mata-mata: ${esc(duelo.fase.toLowerCase())} — quem perde está fora.</div>
          ${actions}</div>`;
      } else {
        // DIA DE FASE DE GRUPOS: em vez de um card vazio, mostra a rodada e a
        // classificação do SEU grupo, que é o que importa naquele dia.
        const meuGrupo = (copaHoje.grupos || []).find((g) => g.some((r) => r.id === c.userClubId));
        const hojeRod = d.rodadaDoGrupo;
        cardJogo = `<div class="jogocard" style="--cor:${cor};--cor2:${cor}">
          <div class="jogotopo"><b>${esc(copaHoje.name)}</b>
            <span>${esc(copaHoje.stages[d.fase] || '')}${hojeRod ? ` · rodada ${hojeRod}` : ''}${copaHoje.tag ? ' · ' + esc(copaHoje.tag) : ''}</span></div>
          <div style="padding:20px 22px 6px">
            <div style="font-size:15px;font-weight:800;color:${cor === '#8ea3c4' ? 'var(--ink)' : 'inherit'}">${
              euVivo || entro ? `Hoje você joga a ${hojeRod ? `${hojeRod}ª rodada do grupo` : 'fase de grupos'}` : `Hoje é dia de ${esc(copaHoje.name)}`}</div>
            <div class="muted" style="margin-top:5px">${entro && !euVivo ? 'É a sua estreia nesta competição.'
              : euVivo ? 'O adversário sai do sorteio do grupo.' : 'Você não está mais nela — o resto da chave segue.'}</div>
            ${meuGrupo ? `<table class="classif" style="margin-top:14px">
              <thead><tr><th>#</th><th>Clube</th><th>P</th><th>J</th><th>SG</th></tr></thead>
              <tbody>${meuGrupo.map((r, i) => { const cl = c.clubById(r.id) || { name: '' };
                return `<tr class="${r.id === c.userClubId ? 'me' : ''}"><td>${i + 1}</td>
                  <td><div class="tabclube">${crest(cl, 26)}<span>${esc(cl.name)}</span></div></td>
                  <td><b>${r.pts}</b></td><td>${r.j}</td><td>${(r.gp - r.gc > 0 ? '+' : '') + (r.gp - r.gc)}</td></tr>`;
              }).join('')}</tbody></table>` : ''}
          </div>
          ${actions}</div>`;
      }
      if (false) cardJogo = `<div class="jogocard" style="--cor:${cor}">
        <div class="jogotopo"> <b>${esc(copaHoje.name)}</b>
          <span>${esc(fase)}${copaHoje.tag ? ' · ' + esc(copaHoje.tag) : ''}</span></div>
        <div class="duelo" style="justify-content:center;text-align:center">
          <div><div style="font-size:15px;font-weight:800;color:${cor}">${
            euVivo || entro ? 'Hoje você joga ' + esc(fase.toLowerCase()) : 'Hoje é dia de ' + esc(copaHoje.name)}</div>
          <div class="muted" style="margin-top:6px">${
            entro && !euVivo ? 'É a sua estreia nesta competição.'
            : euVivo ? 'O adversário sai do sorteio da fase.'
            : 'Você não está mais nela — o resto da chave segue.'}</div></div></div>
        <div class="jogotat">${esc(copaHoje.detalhe || '').slice(0, 160)}</div>
        ${actions}</div>`;
    }
    if (!copaHoje && !seasonDone && opp) {
      // O card sempre põe o MANDANTE à esquerda e o visitante à direita. O rótulo
      // seguia a SUA posição em vez de seguir o lado: jogando fora, o card mostrava
      // o dono da casa à esquerda e escrevia "VISITANTE" embaixo dele, enquanto o
      // seu clube, à direita e fora de casa, aparecia como "MANDANTE".
      const casa = c.userIsHome();
      const estadio = casa ? u.estadio : opp.estadio;
      const mando = casa ? u : opp;
      cardJogo = `<div class="jogocard" style="--cor:${cor};--cor2:${hx(opp.primary)}"> <div class="jogotopo"> <b>${esc(nomeDaLiga(comp.country, comp.tier, comp.name))}</b> <span>Rodada ${c.round + 1} de ${c.totalRounds()}${estadio ? ' · ' + esc(estadio) : ''}${mando.lugares ? ' · ' + mando.lugares.toLocaleString('pt-BR') + ' lugares' : ''}</span></div> <div class="duelo"> <div class="lado">${crest(casa ? u : opp, 56)}
            <div><b>${esc((casa ? u : opp).name)}</b> <i>MANDANTE</i>${this._pastilhasDe((casa ? u : opp).id)}</div></div> <div class="vs">VS</div> <div class="lado dir">${crest(casa ? opp : u, 56)}
            <div><b>${esc((casa ? opp : u).name)}</b> <i>VISITANTE</i>${this._pastilhasDe((casa ? opp : u).id)}</div></div></div>
        <div class="formafaixa"><span class="flabel">Como você vem</span>${pastilhas(c.forma)}</div> <div class="jogotat">Seu modelo: <b>${esc(myTac.name)}</b> · ${esc(opp.name)} joga no <b>${esc(c.tacticOf(opp).name)}</b></div> ${(() => { const f = c.foraDePosicao(); return f.length ? `<div class="avisopos"> <b>${f.length} fora de posição</b> ${f.map((x) => `<span>${esc(x.nome)} é ${esc(x.natural)} jogando de ${esc(x.vaga.toLowerCase())}</span>`).join('')}
</div>` : ''; })()}
        ${actions}
</div>`;
    } else if (!copaHoje) {
      // Só cai aqui quando não há jogo nenhum hoje. Sem o `!copaHoje` este else
      // apagava o card da copa e escrevia "folga nesta rodada" em cima dele.
      cardJogo = `<div class="panel"><h2>${seasonDone ? 'Temporada encerrada' : 'Folga nesta rodada'}</h2> <div class="muted">${seasonDone ? 'Confira a tabela e a artilharia.' : next}</div>${actions}</div>`;
    }

    // ---- tabela: uma janela ao redor de você ----
    let tabela = '';
    if (!seasonDone) {
      const linhas = c.standingsSorted();
      const eu = linhas.findIndex((r) => r.id === c.userClubId);
      const ini = Math.max(0, Math.min(eu - 2, linhas.length - 5));
      const janela = linhas.slice(ini, ini + 5);
      tabela = `<div class="panel tabmini"><h2>Tabela</h2> <table class="classif"><thead><tr><th>#</th><th>Clube</th><th>P</th><th>J</th><th>SG</th></tr></thead><tbody> ${janela.map((r, i) => { const cl = c.clubById(r.id); const pos = ini + i + 1;
          return `<tr class="${r.id === c.userClubId ? 'me' : ''}"> <td class="posn">${pos}</td> <td><div class="tabclube">${crest(cl, 26)}<span>${esc(cl.name)}</span></div></td> <td><b>${r.pts}</b></td><td>${r.j}</td><td>${r.gp - r.gc > 0 ? '+' : ''}${r.gp - r.gc}</td></tr>`;
        }).join('')}
        </tbody></table> <div class="muted" style="margin-top:8px;font-size:12px">${cupStatus}</div></div>`;
    }

    // DEMITIDO OU COM PROPOSTA NA MESA: o painel PARA aqui.
    //
    // Jogando, fui demitido no fim de uma temporada e mesmo assim continuei
    // simulando: dez rodadas depois eu ainda estava no Remo, na Série C, com o
    // aviso de demissão pendurado no topo. O painel mostrava a demissão e logo
    // abaixo o card do próximo jogo, e nada impedia de seguir.
    const bloqueio = c.pendingBoard && (c.pendingBoard.fired
      || (c.pendingBoard.offers && c.pendingBoard.offers.length));
    if (bloqueio) return summary || this._painelDeDecisaoDeEmprego(c.pendingBoard);

    // QUEM ESTÁ DE SAÍDA. Contrato que acaba agora acaba de verdade — então o painel
    // avisa antes, com nome, em vez de o jogador sumir no fim da temporada.
    const vencendo = (u.squad || []).filter((p) => (p.contrato || 0) <= 0);
    const saindo = vencendo.filter((p) => (p.avisoFimContrato || 0) >= 2);
    const avisoContrato = vencendo.length ? `<div class="avisocontrato ${saindo.length ? 'urgente' : ''}">
      <b>${vencendo.length} jogador${vencendo.length > 1 ? 'es' : ''} sem contrato</b>
      <span>${vencendo.slice(0, 4).map((p) => esc(p.nome)).join(', ')}${vencendo.length > 4 ? ` e mais ${vencendo.length - 4}` : ''}.
        ${saindo.length ? `${saindo.length === 1 ? 'Um deles vai' : `${saindo.length} deles vão`} embora de graça no fim desta temporada se você não renovar.`
          : 'Renove no elenco antes que eles comecem a procurar outro clube.'}</span></div>` : '';

    // COMO VÃO OS SEUS CAMPEONATOS, no painel.
    const comps = (c.minhasCompeticoes ? c.minhasCompeticoes() : [])
      .filter((x) => x.vivo || x.campeao || x.grupo || x.aindaNaoEntrou);
    const painelComps = comps.length ? `<div class="panel"><h2>Suas competições</h2>
      ${comps.map((x) => `<div class="compl ${x.campeao ? 'ok' : x.vivo ? '' : 'fora'}">
        <b>${esc(x.nome)}</b>
        <span>${x.campeao ? 'Campeão!' : x.aindaNaoEntrou ? `você entra na ${esc(String(x.entraNa || '').toLowerCase())}` : x.grupo
          ? `fase de grupos · ${x.grupo.pos}º de ${x.grupo.de} · ${x.grupo.pts} pts em ${x.grupo.j} jogos${
              x.grupo.pos <= x.grupo.passam ? ' — dentro' : ' — fora da classificação'}`
          : x.vivo ? `vivo na ${esc(String(x.fase).toLowerCase())}` : 'eliminado'}</span>
        ${x.proximo >= 0 ? `<i>próximo jogo em ${x.proximo - c.dia === 0 ? 'hoje' : `${x.proximo - c.dia} dia(s)`}</i>` : ''}</div>`).join('')}</div>` : '';

    const noticias = (c.news || []).length ? `<div class="panel"><h2>No clube</h2>
      ${(c.news || []).slice(0, 5).map((t) => `<div class="noticia">${esc(t)}</div>`).join('')}</div>` : '';

    // O LAYOUT DA MAQUETE: duas colunas. À esquerda o jogo (que é o que importa
    // agora), à direita o objetivo e as competições. A tabela e o resto ocupam a
    // largura toda embaixo. Era isso que fazia a maquete parecer jogo e a tela
    // parecer planilha: tiras largas, uma embaixo da outra.
    const colunas = `<div class="dashgrid">
      <div class="dashcol">${cardJogo}</div>
      <div class="dashcol">${this._faixaDaMeta()}${this._climaDoClube()}${painelComps}</div></div>`;

    return summary + cupPrompt + lastCard + avisoClassico + cabecalho + avisoContrato
      + this._propostasRecebidas() + colunas + noticias + tabela + fin;
  }

  _tacBars(t) {
    const bar = (label, v, col) => `<div style="display:flex;align-items:center;gap:6px;margin:2px 0;font-size:11.5px"> <span style="width:64px;color:#9fb2cf">${label}</span> <span style="flex:1;height:7px;background:#0b1220;border-radius:5px;overflow:hidden"><span style="display:block;height:100%;width:${Math.round(v * 100)}%;background:${col}"></span></span></div>`;
    return bar('Ataque', t.off, '#22c55e') + bar('Defesa', t.def, '#1f6fe0') + bar('Pressão', t.press, '#ff6b6b') + bar('Linha', t.line, '#f5c518') + bar('Ritmo', t.tempo, '#a855f7') + bar('Posse', t.poss, '#38bdf8');
  }

  // Cada vaga sabe QUE posição ela é. Sem isso, "Defesa" era genérico e o motor
  // escalava zagueiro na lateral e lateral no miolo da zaga.
  _slotDefs(formation) { return slotsDaFormacao(formation); }

  _eligible(g, p) {
    if (g === 'G') return p.posicao === 'G';
    if (g === 'DEF') return p.posicao === 'Z' || p.posicao === 'L';
    if (g === 'MID') return p.posicao === 'M' || p.posicao === 'L';
    if (g === 'ATT') return p.posicao === 'A' || p.posicao === 'M';
    return true;
  }
  _ensureLineup() {
    const c = this.career, u = c.userClub(); const defs = this._slotDefs(c.formation);
    let ids = c.lineupIds;
    const valid = ids && ids.length === defs.length && new Set(ids).size === ids.length && ids.every((id) => u.squad.some((p) => p.id === id));
    if (!valid) {
      // Escala pela POSIÇÃO EXATA primeiro. Sem isso, o grupo "DEF" servia para os
      // quatro e o time entrava com zagueiro na lateral e lateral na zaga.
      // Ordem de preferência: sigla igual > sigla parecida > grupo > quem sobrou.
      const used = new Set(); ids = [];
      const livre = () => u.squad.filter((p) => !used.has(p.id));

      // Empate de overall é comum (um elenco pode ter sete jogadores de 78). Quem
      // decide é o técnico, não o acaso: entra quem está em forma, inteiro e na
      // idade de render. O overall continua mandando; isto só desempata.
      const nota = (p) => {
        let n = p.forca * 10;
        if (p.lesao > 0) n -= 400;                       // machucado não joga
        if (p.suspenso > 0) n -= 400;
        n += ((p.forma || 6) - 6) * 6;                   // forma do momento
        n += (p.energia != null ? p.energia - 80 : 0) * 0.35;
        const idade = p.idade || 26;
        if (idade <= 20) n -= 12;                        // o garoto ainda não é escolha
        else if (idade >= 34) n -= 10;                   // o veterano rende menos
        else if (idade >= 24 && idade <= 30) n += 8;     // idade de auge
        n += Math.min(12, (p.jogos || 0) * 0.4);         // quem vem jogando tem ritmo
        return n;
      };
      const melhor = (lista) => lista.slice().sort((a, b) => nota(b) - nota(a))[0];

      for (const d of defs) {
        const exatos = livre().filter((p) => p.sub === d.sub);
        const perto = livre().filter((p) => (PARECIDAS[d.sub] || []).includes(p.sub));
        const doGrupo = livre().filter((p) => this._eligible(d.g, p));
        const cand = melhor(exatos) || melhor(perto) || melhor(doGrupo) || melhor(livre());
        if (!cand) break;
        ids.push(cand.id); used.add(cand.id);
      }
      c.lineupIds = ids;
    }
    return ids;
  }

  /** O painel de emprego, quando o resumo da temporada já foi fechado mas você
   *  ainda não decidiu para onde vai. Sem isto dava para seguir jogando demitido. */
  _painelDeDecisaoDeEmprego(b) {
    if (b.fired) {
      return `<div class="panel" style="border-color:#ef4444;background:#1a0000">
        <h2 style="color:#ef4444">Você foi demitido</h2>
        <div class="muted" style="margin-bottom:12px">Terminou em ${b.finish}º, e a meta era top ${b.target}${b.relegated ? ', com rebaixamento' : ''}. A diretoria agradeceu e mandou você embora.</div>
        <div class="muted" style="margin-bottom:14px">Você está sem clube. Escolha onde recomeçar para seguir a carreira.</div>
        <button class="btn big" data-action="newclub">Escolher novo clube</button></div>`;
    }
    return `<div class="panel" style="border-color:#1f6fe0">
      <h2 style="color:#54a8ff">Propostas na mesa</h2>
      <div class="muted" style="margin-bottom:12px">Clubes maiores querem você. Aceite uma ou diga que fica.</div>
      <div style="display:flex;flex-direction:column;gap:7px">
        ${b.offers.map((o) => `<div class="row" style="padding:7px 9px"><span><b>${esc(o.name)}</b> <span class="muted">(${esc(o.comp)})</span></span><button class="btn" data-offer="${o.id}">Aceitar</button></div>`).join('')}
        <button class="btn sec" data-action="ficar">Fico onde estou</button></div></div>`;
  }

  /** O que o modelo faz com ESTE elenco, em gols por jogo contra um time igual.
   *  Sai do mesmo motor da partida — é medida, não propaganda. */
  _previaModelo(key) {
    const p = this.career.previaDoModelo(key);
    if (!p) return '';
    const n = (v) => v.toFixed(2).replace('.', ',');
    const saldo = p.cria - p.sofre;
    return `<span>Com este elenco, contra um time do seu nível:</span>
      <b class="ok">${n(p.cria)}</b> gol por jogo a favor ·
      <b class="bad">${n(p.sofre)}</b> contra
      <i>${saldo > 0.15 ? 'modelo de atacar' : saldo < -0.15 ? 'modelo de se defender' : 'modelo equilibrado'}</i>`;
  }

  _renderTactics() {
    const c = this.career; const u = c.userClub();
    const defs = this._slotDefs(c.formation); const ids = this._ensureLineup();
    const byId = (id) => u.squad.find((p) => p.id === id);
    const form = FORMS[c.formation] || FORMS['4-4-2'];
    const prim = hx(u.primary), sec = hx(u.secondary);

    // O CAMPO. Antes era uma bolinha preta com o nome embaixo, em cima de um
    // retângulo liso — o Gustavo: "está muito feio, nem aparece o nome do jogador".
    // Agora cada jogador é uma CAMISA nas cores do clube, com número, sobrenome e
    // overall, e o campo tem grande área, marca do meio e listras de grama.
    const dots = ids.map((id, i) => {
      const p = byId(id); const co = form.coords[i] || [50, 50];
      const d = defs[i] || {};
      const torto = p && (p.sub || p.posicao) !== d.sub;
      const num = 1 + (i === 0 ? 0 : i);
      // O CAMPINHO VIROU A ESCALAÇÃO. O Gustavo: "eu queria poder pegar direto da
      // escalação, onde está o campinho, e arrastar o jogador para pegar um do
      // banco... ou clico num jogador e aparecem os que jogam naquela posição".
      // Agora cada camisa é arrastável, é alvo de quem vem do banco, e um clique
      // abre quem pode entrar naquela vaga.
      return `<div class="jog11 ${torto ? 'torto' : ''}" style="left:${co[0]}%;top:${co[1]}%"
        draggable="true" data-pid="${p ? p.id : ''}" data-slot-card="${i}" data-vaga="${i}"
        title="${esc(p ? p.nome : '')}${torto ? ` — é ${esc(p.sub || p.posicao)}, está jogando de ${esc(d.sub)}` : ''} — clique para trocar, ou arraste">
        <div class="jcamisa" style="--c1:${prim};--c2:${sec}"><b>${num}</b></div>
        <span class="jog11nome">${esc(sobrenomeCurto(p ? p.nome : ''))}</span>
        <span class="jfor">${p ? p.forca : ''}</span></div>`;
    }).join('');

    // TITULARES em carta, não em linha de tabela.
    let slotHtml = '', ultimoGrupo = '';
    defs.forEach((d, i) => {
      const cur = byId(ids[i]);
      // O setor vem da LINHA em que a vaga joga, não da sigla. No 4-4-2 o PE é um
      // meia-esquerda: pela sigla ele é 'ATT' e a lista mostrava "Ataque" antes de
      // "Meio-campo", fora de ordem.
      const grupo = i === 0 ? 'Goleiro'
        : i <= form.d ? 'Defesa'
        : i <= form.d + form.m ? 'Meio-campo' : 'Ataque';
      if (grupo !== ultimoGrupo) { slotHtml += `<div class="setor">${grupo}</div>`; ultimoGrupo = grupo; }
      // O <select> cinza saiu daqui. Era a última peça de cara de formulário no
      // jogo, e o Gustavo: "o layout do elenco, onde eu edito os jogadores, não
      // acompanhou o restante". A troca agora abre o MESMO painel da escalação
      // pré-jogo, que já mostra energia, posição e o quanto cada um perde fora
      // da vaga.

      const torto = cur && (cur.sub || cur.posicao) !== d.sub;
      const nac = cur ? bandeiraDoJogador(cur.pais) : '';
      const cond = cur && cur.lesao > 0 ? '<i class="tag tag-lesao">Lesão</i>'
        : cur && cur.suspenso > 0 ? '<i class="tag tag-susp">Susp.</i>' : '';
      const energia = cur ? Math.round(cur.energia || 100) : 100;
      // A energia era um número no meio de uma frase. O Gustavo: "coloca uma barra
      // de energia na escalação, pra eu ver de relance quem está morto".
      const barra = `<span class="enbar ${energia < 40 ? 'crit' : energia < 70 ? 'meia' : ''}"><i style="width:${energia}%"></i></span>`;
      slotHtml += `<div class="xi ${torto ? 'torto' : ''}" draggable="true" data-slot-card="${i}" data-pid="${cur ? cur.id : ''}">
        <span class="vaga" title="${esc(d.lbl)}">${d.sub}</span>
        <div class="xinfo">
          <div class="xitopo">${nac ? `<span class="nac">${nac}</span>` : ''}<b>${esc(cur ? cur.nome : '—')}</b>${cond}</div>
          <div class="xisub">${d.lbl}${torto ? ` · <span class="alerta">é ${esc(cur.sub || cur.posicao)}</span>` : ''}</div>
          <div class="xiener">${barra}<span class="ener ${energia < 60 ? 'baixa' : ''}">${energia}%</span></div>
          </div>
        <span class="xiovr">${cur ? cur.forca : ''}</span>
        <button class="btn sec xitrocar" data-vaga="${i}">Trocar</button></div>`;
    });

    // BANCO em carta compacta, agrupado por posição.
    const inXI = new Set(ids);
    const bench = u.squad.filter((p) => !inXI.has(p.id));
    const posOrder = [['G', 'Goleiros'], ['Z', 'Zagueiros'], ['L', 'Laterais'], ['M', 'Meias'], ['A', 'Atacantes']];
    const benchHtml = posOrder.map(([pos, lbl]) => {
      const list = bench.filter((p) => p.posicao === pos).sort((a, b) => b.forca - a.forca);
      if (!list.length) return '';
      return `<div class="setor">${lbl} <i>${list.length}</i></div>` + list.map((p) => {
        const cond = p.lesao > 0 ? `<i class="tag tag-lesao" title="${esc(p.lesaoNome || '')} — ${p.lesaoSemanas || p.lesao} sem.">Lesão</i>`
          : p.suspenso > 0 ? '<i class="tag tag-susp">Susp.</i>'
          : (p.contrato || 0) <= 1 ? '<i class="tag tag-fim">Fim de contrato</i>' : '';
        const evo = p.ovrAnterior != null && p.forca !== p.ovrAnterior
          ? `<span class="evo ${p.forca > p.ovrAnterior ? 'up' : 'down'}">${p.forca > p.ovrAnterior ? '▲' : '▼'}${Math.abs(p.forca - p.ovrAnterior)}</span>` : '';
        const nac = bandeiraDoJogador(p.pais);
        const en = Math.round(p.energia == null ? 100 : p.energia);
        const livre = p.lesao > 0 || p.suspenso > 0;
        return `<div class="banco ${livre ? 'indisp' : ''}" data-player="${p.id}" data-pid="${p.id}" draggable="${livre ? 'false' : 'true'}">
          <span class="vaga">${p.sub || p.posicao}</span>
          <div class="xinfo"><div class="xitopo">${nac ? `<span class="nac">${nac}</span>` : ''}<b>${esc(p.nome)}</b>${evo}${cond}</div>
            <div class="xisub">${p.idade} anos${p.potencial > p.forca ? ` · pode chegar a ${p.potencial}` : ''}</div>
            <div class="xiener"><span class="enbar ${en < 40 ? 'crit' : en < 70 ? 'meia' : ''}"><i style="width:${en}%"></i></span><span class="ener ${en < 60 ? 'baixa' : ''}">${en}%</span></div></div>
          <span class="xiovr">${p.forca}</span></div>`;
      }).join('');
    }).join('');

    const curTac = c.userTactic || u.tactic; const tObj = tacticByKey(curTac);
    const tacOpts = TACTICS.map((t) => `<option value="${t.key}" ${t.key === curTac ? 'selected' : ''}>${t.name}</option>`).join('');
    const forca = Math.round(c.strengthOf(u, ids));
    const fora = (c.foraDePosicao ? c.foraDePosicao(ids) : []).length;

    return `<div class="escalacao">
      <div class="panel campocard">
        <div class="campotopo">
          <div><span class="muted">Escalação</span><h2>${c.formation}</h2></div>
          <div class="forcatime"><span class="muted">Força do time</span><b>${forca}</b></div></div>
        <div class="pitch2">
          <div class="linha meio"></div><div class="circulo"></div>
          <div class="area cima"></div><div class="area baixo"></div>
          ${dots}</div>
        ${fora ? `<div class="avisopos">${fora} jogador${fora > 1 ? 'es' : ''} fora da posição natural — o time rende menos ali.</div>` : ''}
        <div class="escolhas">
          <label>Formação<select id="formSel">${Object.keys(FORMS).map((f) => `<option ${c.formation === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
          <label>Postura<select id="postSel">${['Defensiva', 'Equilibrada', 'Ofensiva'].map((f) => `<option ${c.posture === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
        </div>
        <div class="modelo">
          <div class="setor">Treino da temporada</div>
          <p class="muted" style="margin:0 0 7px">No que o elenco trabalha o ano inteiro. Aparece na evolução de quem treina.</p>
          <div class="fseg" style="width:100%">
            ${[['base', 'A base'], ['ataque', 'Ataque'], ['defesa', 'Defesa'], ['fisico', 'Físico']]
              .map(([k, t]) => `<button class="${(c.treinoDoTime || 'base') === k ? 'on' : ''}" data-treino="${k}">${t}</button>`).join('')}</div>
          <p class="muted" style="margin:7px 0 0;font-size:11.5px">${{
            base: 'Os garotos de até 22 anos crescem mais rápido.',
            ataque: 'Pontas, meias-atacantes e centroavantes evoluem mais.',
            defesa: 'Goleiro, zagueiros, laterais e volantes evoluem mais.',
            fisico: 'Todo o elenco ganha um pouco — o ganho mais parelho e o mais fraco.',
          }[c.treinoDoTime || 'base']}</p>
        </div>

        <div class="modelo">
          <div class="setor">Modelo de jogo</div>
          <select id="tacSel">${tacOpts}</select>
          <p class="muted" id="tacDesc">${tObj.desc}</p>
          <p class="muted">Técnico-referência: ${tObj.coach}</p>
          <div id="tacBars">${this._tacBars(tObj)}</div>
          <div id="tacPrev" class="tacprev">${this._previaModelo(curTac)}</div></div>
        <button class="btn" id="saveLine">Salvar tática e escalação</button></div>
      <div class="panel listacard"><div class="listatit">Titulares <i class="dicadrag">arraste para trocar</i></div><div class="lista">${slotHtml}</div></div>
      <div class="panel listacard"><div class="listatit">Banco</div><div class="lista">${benchHtml || '<div class="muted">Sem reservas.</div>'}</div></div>
    </div>`;
  }

  _renderTransfers() {
    const c = this.career;
    const u = c.userClub();
    const busca = (this._mktBusca || '').trim();
    const ordem = this._mktOrdem || 'forca';
    const escopo = this._mktEscopo || 'liga';

    const semAcento = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const alvo = semAcento(busca);

    // de onde procurar: sua liga, seu país ou o mundo inteiro
    let clubes;
    if (escopo === 'mundo') clubes = c.clubs();
    else if (escopo === 'pais') clubes = c.clubs().filter((cl) => cl.country === u.country);
    else clubes = c.activeClubs();

    // O FILTRO É PELA POSIÇÃO FINA. O Gustavo precisava de um lateral-esquerdo para o
    // Bolton e o mercado só sabia filtrar "LAT" — e ainda por cima o mundo inteiro
    // estava marcado como lateral-direito. Agora dá para pedir LE, PE, VOL.
    // Entraram também o overall mínimo e o "que eu posso pagar": ordenar por "mais
    // barato" trazia jogadores de 50 de overall, que não servem para ninguém.
    const ovrMin = this._mktOvr || 0;
    const ovrMax = this._mktOvrMax || 99;
    const soCabe = !!this._mktCabe;
    const sigla = (p) => p.sub || p.posicao;
    // Posição é MULTI-ESCOLHA: o Gustavo queria ver ponta-esquerda e ponta-direita
    // juntas e o filtro só deixava uma por vez ("coloco ponta esquerda e não consigo
    // filtrar mais os ponta direita"). Conjunto vazio = todas.
    const posSel = this._mktPos instanceof Set ? this._mktPos : (this._mktPos = new Set());
    const nacSel = this._mktNac || '';

    const candidatos = [];
    for (const cl of clubes) {
      if (cl.id === c.userClubId) continue;
      for (const p of cl.squad) {
        if (alvo && !semAcento(p.nome).includes(alvo)) continue;
        candidatos.push({ p, cl });
      }
    }
    for (const p of (c.league.market || [])) {
      if (alvo && !semAcento(p.nome).includes(alvo)) continue;
      candidatos.push({ p, cl: null });
    }
    const paisesDoMercado = [...new Set(candidatos.map((x) => x.p.pais).filter(Boolean))]
      .sort((a2, b2) => a2.localeCompare(b2, 'pt-BR'));
    const custo = ({ p, cl }) => (cl ? c.precoDe(p, cl) : p.valorMercado);
    const passa = (x, filtro) => {
      const pp = filtro.pos !== undefined ? filtro.pos : posSel;
      const oo = filtro.ovr !== undefined ? filtro.ovr : ovrMin;
      const ox = filtro.ovrMax !== undefined ? filtro.ovrMax : ovrMax;
      const cc = filtro.cabe !== undefined ? filtro.cabe : soCabe;
      const nn = filtro.nac !== undefined ? filtro.nac : nacSel;
      if (pp.size && !pp.has(sigla(x.p))) return false;
      if (nn && x.p.pais !== nn) return false;
      if (x.p.forca < oo || x.p.forca > ox) return false;
      if (cc && custo(x) > u.caixa) return false;
      return true;
    };
    let lista = candidatos.filter((x) => passa(x, {}));

    const ordenar = {
      forca: (a, b) => b.p.forca - a.p.forca,
      potencial: (a, b) => (b.p.potencial || b.p.forca) - (a.p.potencial || a.p.forca),
      valor: (a, b) => a.p.valorMercado - b.p.valorMercado,
      jovem: (a, b) => a.p.idade - b.p.idade || b.p.forca - a.p.forca,
    }[ordem];
    const total = lista.length;
    lista = lista.sort(ordenar).slice(0, 60);

    const btn = (attr, val, atual, txt) => `<button class="opt ${val === atual ? 'on' : ''}" data-${attr}="${val}">${txt}</button>`;
    // cada botão diz quantos jogadores ele traz, como no olheiro
    // pílula com o número de jogadores que ela traz (só onde a escolha é múltipla)
    const pill = (attr, val, ligado, txt, filtro) => {
      const n = candidatos.reduce((t, x) => t + (passa(x, filtro) ? 1 : 0), 0);
      return `<button class="fpill ${ligado ? 'on' : ''} ${n ? '' : 'vazio'}" data-${attr}="${val}">${txt}<i>${n}</i></button>`;
    };
    const seg = (attr, val, ligado, txt) => `<button class="${ligado ? 'on' : ''}" data-${attr}="${val}">${txt}</button>`;
    const SIGLAS = ['GOL', 'ZAG', 'LE', 'LD', 'VOL', 'MC', 'MEI', 'PE', 'PD', 'ATA'];
    const maisPos = (k) => { const n = new Set(posSel); n.has(k) ? n.delete(k) : n.add(k); return n; };

    const cartao = ({ p, cl }) => {
      // O preço na tela tem de ser o que vai SAIR do caixa, não o valor de tabela
      // agente livre: o que sai do caixa é a luva, não o valor de mercado
      const preco = cl ? c.precoDe(p, cl) : c.luvaDe(p);
      // O motivo aparece ANTES do clique. O mercado listava 536 jogadores com o
      // botão aceso e só dizia "Elenco cheio" depois de clicar.
      const impedido = cl ? c.motivoImpedido(p, cl) : null;
      const pode = !impedido;
      const joia = (p.potencial || 0) - p.forca >= 8 && p.idade <= 23;
      return `<div class="jog ${pode ? '' : 'caro'}"> <span class="pos ${p.posicao}">${p.sub || p.posicao}</span> <div class="jinfo"> <b>${bandeiraDoJogador(p.pais) ? `<span class="nac" title="${esc(p.pais)}">${bandeiraDoJogador(p.pais)}</span>` : ''}${esc(p.nome)}${joia ? ' <span title="joia"></span>' : ''}</b> <span class="muted">${p.idade} anos • ${cl ? esc(cl.name) : '<b style="color:#7fe3a0">sem clube</b> — só a luva'}${cl && escopo !== 'liga' ? ` <span class="liga-tag">${esc(cl.league)}</span>` : ''}</span></div> ${cl ? crest(cl, 24) : '<span style="width:24px"></span>'}
        <span class="forcanum">${p.forca}</span> <span class="preco">${fmtMoney(preco)}</span> ${cl ? (impedido
            ? `<button class="btn sec" disabled title="${esc(impedido)}">${esc(impedido)}</button>`
            : `<button class="btn" data-neg="${p.id}" data-from="${cl.id}">Negociar</button>`)
             : `<button class="btn play" data-sign="${p.id}" title="Sem clube: você paga só a luva">Contratar de graça</button>`}
</div>`;
    };

    const vender = u.squad.slice().sort((a, b) => b.forca - a.forca).map((p) => `<div class="jog"> <span class="pos ${p.posicao}">${p.sub || p.posicao}</span> <div class="jinfo"><b>${bandeiraDoJogador(p.pais) ? `<span class="nac" title="${esc(p.pais)}">${bandeiraDoJogador(p.pais)}</span>` : ''}${esc(p.nome)}</b><span class="muted">${p.idade} anos</span></div> <span class="forcanum">${p.forca}</span> <span class="preco">${fmtMoney(Math.round(p.valorMercado * 0.9))}</span> <button class="btn sec" data-sell="${p.id}">Vender</button></div>`).join('');

    // ---- mesa de negociação: aberta quando você clica em Negociar ----
    let mesa = '';
    if (this._neg) {
      const dono = c.clubById(this._neg.cid);
      const alvo = dono && dono.squad.find((x) => x.id === this._neg.pid);
      if (!alvo) { this._neg = null; } else {
        const pedido = c.precoDe(alvo, dono);
        const r = this._neg.resp;
        const cor = r && r.status === 'aceita' ? '#34d399' : r && r.status === 'contra' ? '#f59e0b' : '#f43f5e';
        const resposta = r ? `<div class="negresp" style="--c:${cor}"> <b>${r.status === 'aceita' ? 'Proposta aceita' : r.status === 'contra' ? 'Contraproposta' : 'Proposta recusada'}</b> <span>${esc(r.motivo || `${dono.name} aceitou. ${alvo.nome} é seu.`)}</span> ${r.status === 'contra' ? `<button class="btn" data-fechar="${r.pedido}">Aceitar e pagar ${fmtMoney(r.pedido)}</button>` : ''}
</div>` : '';
        mesa = `<div class="panel mesa"> <h2>Negociação — ${esc(alvo.nome)}</h2> <div class="muted" style="margin-bottom:10px">${crestInline(dono)} ${esc(dono.name)} · ${alvo.idade} anos · ${alvo.sub || alvo.posicao} · overall ${alvo.forca}</div> <div class="negpedido">Eles pedem <b>${fmtMoney(pedido)}</b> <span class="muted">(valor de mercado: ${fmtMoney(alvo.valorMercado)})</span></div> <div class="negbotoes"> <button class="btn" data-oferta="${pedido}">Pagar o que pedem</button> <button class="btn sec" data-oferta="${Math.round(pedido * 0.85)}">Oferecer ${fmtMoney(Math.round(pedido * 0.85))}</button> <button class="btn sec" data-oferta="${Math.round(pedido * 0.65)}">Oferecer ${fmtMoney(Math.round(pedido * 0.65))}</button> <button class="btn sec" data-desistir="1">Desistir</button></div>${resposta}</div>`;
      }
    }

    // ---- o mundo se mexendo: sem isso o mercado é um catálogo parado ----
    // AS TRANSFERÊNCIAS DO MUNDO, com os dois escudos. O Gustavo: "mostra o jogador,
    // o escudo do time que ele estava e o do time para onde ele vai — ia ficar bem
    // legal mesmo".
    const rumores = (c.transferNews || []).slice(0, 8).map((t) => `<div class="transf">
      <div class="tjog"><span class="pos ${esc(String(t.pos || '').slice(0, 1))}">${esc(t.pos || '')}</span>
        <b>${esc(t.p)}</b><span class="muted">${t.idade ? t.idade + ' anos · ' : ''}overall ${t.forca}</span></div>
      <div class="trota">${crest(c.clubById(t.fromId), 24)}
        <span class="tseta">→</span>${crest(c.clubById(t.toId), 24)}</div>
      <div class="tvalor">${fmtMoney(t.val)}</div></div>`).join('');
    // As notícias do clube (suspensão, lesão, base) saíram do mercado: o Gustavo,
    // vendo "Hugo Souza cumpre suspensão" no meio das transferências: "por que isso
    // está no mercado? Isso podia estar no painel". Está — no painel.
    // A JANELA. O Gustavo: "zero movimentações no mercado, eu não sei se a janela
    // está fechada, porque você não fala". O seu clube pode contratar o ano todo;
    // o que tem data é a janela do RESTO DO MUNDO, que é de onde vêm as notícias.
    const meio = Math.floor(c.totalRounds() * 0.5);
    const faltam = meio - c.round;
    const estadoJanela = c._midWindowDone
      ? 'A janela do meio do ano já passou. A próxima movimentação do mundo é na virada da temporada.'
      : faltam > 0
        ? `A janela do meio do ano abre na ${meio + 1}ª rodada — faltam ${faltam}.`
        : 'A janela do meio do ano está aberta.';
    const avisos = `<div class="janelaaviso"><b>Você pode contratar a qualquer momento.</b>
      <span>${estadoJanela}</span></div>`;
    const feed = `<div class="panel"><h2>O que está acontecendo</h2>${avisos}${
      rumores || '<div class="muted">Nenhuma transferência no mundo desde a última janela.</div>'}</div>`;

    // QUANTAS VAGAS VOCÊ TEM. O Corinthians começa com os 30 profissionais e o
    // mercado inteiro respondia "elenco cheio" — 38 de 40 tentativas de compra
    // barradas, sem o jogo dizer o caminho, que é vender antes.
    // O teto saiu: agora o que existe é um PISO de 20 jogadores (onze em campo e nove
    // no banco). A barra passou a mostrar o tamanho do elenco e quanto ele custa por
    // mês — carregar 40 jogadores é permitido, o que pesa é a folha.
    const nProf = c.contamNoLimite(u);
    const nTotal = (u.squad || []).length;
    const minimo = 20;
    const folha = (u.squad || []).reduce((t, p) => t + (p.salario || 0), 0);
    const podeVender = nTotal > minimo;
    const barraVagas = `<div class="vagas ${podeVender ? '' : 'cheio'}">
      <b>${nTotal} jogadores</b>
      <span>${nProf} profissionais e ${nTotal - nProf} da base. Folha de ${fmtMoney(folha)} por mês.
        ${podeVender
          ? 'Você pode ter quantos quiser — quem paga a conta é o caixa.'
          : `No mínimo ${minimo}: onze em campo e nove no banco. Contrate antes de vender.`}</span></div>`;

    return mesa + feed + `<div class="panel"> <div class="mkttop"> <h2 style="margin:0">Mercado de transferências</h2> <div class="caixa">Caixa disponível<b>${fmtMoney(u.caixa)}</b></div></div> ${barraVagas} <input id="mktBusca" placeholder="Buscar jogador pelo nome..." value="${esc(busca)}" autocomplete="off"> <div class="filtros">
      <div class="fgrupo largo"><span class="frot">Posição</span><div class="fpills">
        ${pill('filter', 'ALL', !posSel.size, 'Todas', { pos: new Set() })}${SIGLAS.map((k) => pill('filter', k, posSel.has(k), k, { pos: maisPos(k) })).join('')}</div></div>
      <div class="fgrupo"><span class="frot">Onde procurar</span><div class="fseg">
        ${seg('escopo', 'liga', escopo === 'liga', 'Minha liga')}${seg('escopo', 'pais', escopo === 'pais', 'Meu país')}${seg('escopo', 'mundo', escopo === 'mundo', 'Mundo')}</div></div>
      <div class="fgrupo"><span class="frot">Overall</span><div class="fdupla">
        <select class="fsel" id="mktOvr">${[0, 60, 65, 70, 75, 80].map((v) => `<option value="${v}" ${ovrMin === v ? 'selected' : ''}>${v ? `de ${v}` : 'qualquer'}</option>`).join('')}</select>
        <span>até</span>
        <select class="fsel" id="mktOvrMax">${[99, 85, 80, 75, 70, 65].map((v) => `<option value="${v}" ${ovrMax === v ? 'selected' : ''}>${v === 99 ? 'qualquer' : v}</option>`).join('')}</select></div></div>
      <div class="fgrupo"><span class="frot">Preço</span><div class="fseg">
        ${seg('mktcabe', '0', !soCabe, 'Todos')}${seg('mktcabe', '1', soCabe, 'Que eu posso pagar')}</div></div>
      <div class="fgrupo"><span class="frot">Nacionalidade</span><select class="fsel" id="mktNac"><option value="">Qualquer país</option>${
        paisesDoMercado.map((n) => `<option value="${esc(n)}" ${n === nacSel ? 'selected' : ''}>${bandeira(n) || ''} ${esc(n)}</option>`).join('')}</select></div>
      <div class="fgrupo"><span class="frot">Ordenar por</span><select class="fsel" id="mktOrdem">${
        [['forca', 'Overall'], ['potencial', 'Potencial'], ['valor', 'Mais barato'], ['jovem', 'Mais jovem']]
          .map(([v, t]) => `<option value="${v}" ${ordem === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div></div>
      ${(() => {
        // O QUE ESTÁ FILTRADO, em pastilhas que dá para tirar uma a uma. O Gustavo:
        // "quando eu seleciono um, ele tira o outro... preciso que mostre todos os
        // filtros que eu tô usando".
        const chips = [];
        posSel.forEach((k) => chips.push([`posição ${k}`, `filter="${k}"`]));
        if (ovrMin) chips.push([`overall ${ovrMin}+`, 'mktovr="0"']);
        if (ovrMax < 99) chips.push([`até ${ovrMax}`, 'mktovrmax="99"']);
        if (soCabe) chips.push(['cabe no caixa', 'mktcabe="0"']);
        if (nacSel) chips.push([`${bandeira(nacSel) || ''} ${nacSel}`, 'mktnaclimpa="1"']);
        if (busca) chips.push([`"${busca}"`, 'mktbuscalimpa="1"']);
        if (!chips.length) return '';
        return `<div class="chips"><span class="fl">Filtrando por</span>${
          chips.map(([txt, attr]) => `<button class="chip" data-${attr}>${esc(txt)} <i>✕</i></button>`).join('')}
          <button class="chip limpar" data-limpafiltros="1">limpar tudo</button></div>`;
      })()}
      <div class="scresumo">Procurando ${posSel.size ? `<b>${[...posSel].join(', ')}</b>` : 'jogador de qualquer posição'}${
        ovrMin || ovrMax < 99 ? `, overall <b>${ovrMin || 'qualquer'}${ovrMax < 99 ? ` a ${ovrMax}` : ' para cima'}</b>` : ''}, ${
        { liga: 'na sua liga', pais: 'no seu país', mundo: 'no mundo todo' }[escopo]}${soCabe ? ', <b>que caiba no seu caixa</b>' : ''}.
        <b>${total.toLocaleString('pt-BR')}</b> encontrado${total === 1 ? '' : 's'}${total > 60 ? ' — mostrando os 60 melhores' : ''}.</div> <div class="jlista">${lista.map(cartao).join('') || `<div class="muted" style="padding:10px 2px">Ninguém com esse filtro.${
        soCabe ? ' Ninguém dessa posição cabe no seu caixa — tente "Todos" no preço, ou venda alguém antes.'
        : ovrMin ? ' Baixe o overall mínimo' : ''
      }${escopo === 'liga' ? ' Procure no seu país ou no mundo todo.' : ''}</div>`}</div></div> <div class="panel"><h2>Seu elenco — vender</h2> <div class="jlista">${vender}</div></div>`;
  }

  /** O QUE A DIRETORIA ESPERA, na tela onde você vive.
   *
   *  A meta só aparecia no fim da temporada, junto com a demissão — e aí já era
   *  tarde. Aqui ela fica à vista o ano inteiro, com a sua posição de agora ao lado.
   */
  /** AS PROPOSTAS QUE CHEGARAM PELOS SEUS JOGADORES.
   *
   *  O mercado era de mão única: você comprava do mundo e ninguém nunca vinha
   *  atrás do seu craque. Agora chega proposta, e a decisão é sua — segurar quem
   *  todo mundo quer, ou vender bem e reconstruir. Recusar uma proposta muito
   *  alta tem preço no vestiário.
   */
  _propostasRecebidas() {
    const c = this.career;
    const lista = c.propostasRecebidas || [];
    if (!lista.length) return '';
    const u = c.userClub();
    return `<div class="panel"><h2>Propostas pelos seus jogadores</h2>
      <div class="muted" style="margin-bottom:14px">Vender entra no caixa na hora. Recusar uma oferta muito alta
        incomoda o jogador e o elenco.</div>
      ${lista.map((p, i) => {
        const aqui = (u.squad || []).find((x) => x.id === p.jogadorId);
        if (!aqui) return '';
        const acima = Math.round((p.valor / Math.max(1, p.justo) - 1) * 100);
        return `<div class="proposta ${p.generosa ? 'boa' : p.baixa ? 'fraca' : ''}">
          <div class="propquem">
            <b>${esc(p.nome)}</b>
            <i>${p.forca} de força · ${p.idade} anos</i>
          </div>
          <div class="propclube">${crest(c.clubById(p.clubeId) || {}, 26)}<span>${esc(p.clube)}</span></div>
          <div class="propvalor">
            <b>${fmtMoney(p.valor)}</b>
            <i>${acima >= 0 ? '+' : ''}${acima}% do valor de mercado</i>
          </div>
          <div class="propbs">
            <button class="btn" data-vender="${i}">Vender</button>
            <button class="btn sec" data-recusar="${i}">Recusar</button>
          </div></div>`;
      }).join('')}</div>`;
  }

  /** O HUMOR DA DIRETORIA E DO VESTIÁRIO.
   *
   *  Duas barras curtas no painel. Não é enfeite: a paciência da diretoria é o
   *  seu emprego, e a moral do elenco entra na força do time em campo. Sem
   *  mostrar, o jogador seria demitido sem entender por quê.
   */
  _climaDoClube() {
    const c = this.career;
    if (c.round === 0 && !c._avisoDiretoria) return '';
    const pac = Math.round(c.paciencia != null ? c.paciencia : 72);
    const mor = Math.round(c.moralElenco != null ? c.moralElenco : 60);

    const comoDiretoria = pac <= 18 ? ['Seu cargo está em jogo', '#ff5e6b']
      : pac <= 40 ? ['Cobrando resultado', '#ffc53d']
      : pac <= 70 ? ['Acompanhando de perto', '#9fb0cc']
      : ['Confiando no trabalho', '#36e27f'];
    const comoElenco = mor <= 30 ? ['Vestiário rachado', '#ff5e6b']
      : mor <= 50 ? ['Elenco cabisbaixo', '#ffc53d']
      : mor <= 72 ? ['Clima normal', '#9fb0cc']
      : ['Elenco confiante', '#36e27f'];

    const barra = (rot, v, txt, cor) => `<div class="climalinha">
      <i>${rot}</i>
      <span class="climabar"><em style="width:${Math.max(3, v)}%;background:${cor}"></em></span>
      <b style="color:${cor}">${esc(txt)}</b></div>`;

    return `<div class="panel"><h2>Clima no clube</h2>
      ${barra('Diretoria', pac, comoDiretoria[0], comoDiretoria[1])}
      ${barra('Elenco', mor, comoElenco[0], comoElenco[1])}
      ${pac <= 18 ? '<div class="climaaviso">Perder de novo pode custar o emprego. Vencer devolve a confiança.</div>' : ''}
    </div>`;
  }

  /** O OBJETIVO DA DIRETORIA, como na maquete: um anel com a sua posição no meio.
   *  Antes era uma tira de texto; o anel diz de relance se você está perto ou longe. */
  _faixaDaMeta() {
    const c = this.career;
    const o = c.objective;
    if (!o || c.round === 0) return '';
    const pos = c.userPosition();
    const cumprindo = pos <= o.target;
    const perto = !cumprindo && pos <= o.target + 2;
    const alvo = o.ehFuga ? `Escapar do rebaixamento`
      : o.tier > 1 ? `Entrar no top ${o.target} e subir`
      : `Terminar no top ${o.target}`;
    // quanto do caminho está feito: 100% se está dentro, caindo conforme se afasta
    const pct = Math.max(6, Math.round(100 - Math.max(0, pos - o.target) / Math.max(1, o.n - o.target) * 100));
    const cor = cumprindo ? '#36e27f' : perto ? '#ffc53d' : '#ff5e6b';
    return `<div class="panel"><h2>A diretoria quer</h2>
      <div class="metaanel">
        <div class="anel" style="--p:${pct};--anelcor:${cor}"><i>${pos}º</i></div>
        <div class="metatxt"><b>${esc(alvo)}</b>
          <span>você está em ${pos}º de ${o.n} — ${cumprindo ? 'dentro do combinado'
            : perto ? 'a dois passos' : 'abaixo do que pediram'}</span></div></div></div>`;
  }

  _renderStandings() {
    const c = this.career; const comp = c.userCompObj();
    // Enquanto o resumo de fim de temporada está na tela, a tabela que interessa é a
    // que ACABOU, não a nova zerada. O jogo trocava na hora e o Gustavo nunca via
    // como o campeonato terminou.
    const fim = c._seasonJustEnded && c.tabelaFinal ? c.tabelaFinal : null;
    const st = fim ? fim.linhas : c.standingsSorted();
    const relK = fim ? fim.relK : c.relegationCount();
    const proK = fim ? fim.proK : c.promotionCount();
    const rows = st.map((r, i) => { const cl = c.clubById(r.id) || { id: r.id, name: r.nome };
      const cls = [r.id === c.userClubId ? 'me' : '', relK && i >= st.length - relK ? 'down' : '', proK && i < proK ? 'up' : ''].join(' ');
      return `<tr class="${cls}"><td class="posn">${i + 1}</td><td><div class="tabclube">${crest(cl, 26)}<span>${esc(cl.name)}</span></div></td><td><b>${r.pts}</b></td><td>${r.j}</td><td>${r.v}</td><td>${r.e}</td><td>${r.d}</td><td>${r.gp}</td><td>${r.gc}</td><td>${r.gp - r.gc}</td></tr>`; }).join('');
    // a legenda em pastilha, com a cor do lado — igual às barras das linhas
    const leg = [];
    if (proK) leg.push(`<span class="zona sobe"><s></s>Acesso — ${proK} primeiro${proK > 1 ? 's' : ''}</span>`);
    if (relK) leg.push(`<span class="zona cai"><s></s>Rebaixamento — ${relK} último${relK > 1 ? 's' : ''}</span>`);
    if (!proK && !relK) leg.push('<span class="zona">Divisão única deste país — sem acesso nem rebaixamento</span>');
    return `<div class="panel"><h2>Classificação — ${esc(fim ? fim.comp : comp.name)} ${(c.startYear || 2026) + (fim ? fim.season : c.season) - 1}${fim ? ' · final' : ''}</h2> <table class="classif"><thead><tr><th>#</th><th>Clube</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th></tr></thead><tbody>${rows}</tbody></table> <div class="zonas">${leg.join('')}</div></div>`;
  }

  _renderStats() {
    const c = this.career;
    const u = c.userClub();
    const fim = c._seasonJustEnded && c.artilhariaFinal ? c.artilhariaFinal : null;

    // QUAL COMPETIÇÃO. O Gustavo: "eu quero ver a artilharia do Paulistão, e como
    // está o meu elenco naquele campeonato — com filtro".
    const comps = c.competicoesComGol ? c.competicoesComGol() : [];
    const minha = (c.userCompObj() || {}).name;
    const sel = comps.includes(this._artComp) ? this._artComp : (comps[0] || minha);
    const abas = comps.length > 1 ? `<div class="fpills" style="margin-bottom:12px">${
      comps.map((k) => `<button class="fpill ${k === sel ? 'on' : ''}" data-artcomp="${esc(k)}">${esc(k)}</button>`).join('')}</div>` : '';

    const dados = fim && sel === minha
      ? { gols: fim.gols.map((x) => ({ nome: x.nome, clube: c.clubById(x.clubeId), n: x.n })),
          assist: fim.assist.map((x) => ({ nome: x.nome, clube: c.clubById(x.clubeId), n: x.n })) }
      : (() => { const a = c.artilhariaDe(sel, 15);
          return { gols: a.gols.map((x) => ({ nome: x.p.nome, clube: x.club, n: x.gols })),
            assist: a.assist.map((x) => ({ nome: x.p.nome, clube: x.club, n: x.assist })) }; })();

    const lista = (arr, cor, vazio) => {
      if (!arr.length) return `<div class="muted" style="padding:10px 2px">${vazio}</div>`;
      const topo = arr[0].n || 1;
      return arr.map((x, i) => `<div class="artlinha ${x.clube && x.clube.id === c.userClubId ? 'meu' : ''} ${i === 0 ? 'lider' : ''}">
        <span class="artpos">${i + 1}</span>
        ${crest(x.clube, 20)}
        <div class="artnome"><b>${esc(x.nome)}</b><span>${esc(x.clube ? x.clube.name : '')}</span></div>
        <div class="artbarra"><i style="width:${Math.round(x.n / topo * 100)}%;background:${cor}"></i></div>
        <b class="artnum" style="color:${cor}">${x.n}</b></div>`).join('');
    };

    // O ELENCO INTEIRO EM NÚMEROS, que ele pediu: jogos, nota média, gols, assists.
    const elenco = (c.resumoDoElenco ? c.resumoDoElenco() : [])
      .filter((p) => p.jogos || p.gols || p.assist);
    const soDaComp = sel !== minha;

    // ORDENAR PELA COLUNA. O Gustavo: "seria bom se tivesse como ordenar, aperto
    // na quantidade de jogos e me mostra quem jogou mais, quantidade de gols,
    // quem fez mais gols". Clicar na mesma coluna de novo inverte.
    const ord = this._ordElenco || { col: 'g', desc: true };
    const valor = (p, col) => {
      const g = soDaComp ? (p.golsComp[sel] || 0) : p.gols;
      const a = soDaComp ? (p.assistComp[sel] || 0) : p.assist;
      const j = soDaComp ? (p.jogosComp[sel] || 0) : p.jogos;
      return col === 'j' ? j : col === 'g' ? g : col === 'a' ? a
        : col === 'nota' ? (p.nota != null ? p.nota : -1) : p.nome;
    };
    const linhas = elenco.slice().sort((x, y) => {
      const vx = valor(x, ord.col), vy = valor(y, ord.col);
      const cmp = typeof vx === 'string' ? String(vx).localeCompare(String(vy), 'pt-BR') : vx - vy;
      return ord.desc ? -cmp : cmp;
    });
    const cab = (col, txt) => `<th class="ordcol ${ord.col === col ? 'on' : ''}" data-ord="${col}">${txt}${
      ord.col === col ? `<s>${ord.desc ? '▾' : '▴'}</s>` : ''}</th>`;

    const painelElenco = elenco.length ? `<div class="panel"><h2>Seu elenco${soDaComp ? ` — ${esc(sel)}` : ' na temporada'}</h2>
      <div class="muted" style="margin-bottom:10px">Clique na coluna para ordenar.</div>
      <div style="overflow-x:auto"><table class="classif">
        <thead><tr>${cab('nome', 'Jogador')}${cab('j', 'J')}${cab('g', 'G')}${cab('a', 'A')}${cab('nota', 'Nota')}</tr></thead>
        <tbody>${linhas.map((p) => {
          const g = soDaComp ? (p.golsComp[sel] || 0) : p.gols;
          const a = soDaComp ? (p.assistComp[sel] || 0) : p.assist;
          const j = soDaComp ? (p.jogosComp[sel] || 0) : p.jogos;
          if (soDaComp && !g && !a) return '';
          return `<tr><td><div class="tabclube"><span class="pos ${esc(p.sub.slice(0, 1))}">${esc(p.sub)}</span>
            <span>${esc(p.nome)}</span></div></td>
            <td>${j}</td><td><b>${g}</b></td><td>${a}</td>
            <td>${p.nota != null ? `<b style="color:${p.nota >= 7 ? '#7fe3a0' : p.nota >= 6 ? '#8fd0ff' : '#ff8a8a'}">${p.nota.toFixed(1)}</b>` : '—'}</td></tr>`;
        }).join('')}</tbody></table></div></div>` : '';

    return `<div class="panel"><h2>Artilharia${fim && c.tabelaFinal ? ` · ${(c.startYear || 2026) + c.tabelaFinal.season - 1}` : ''}</h2>
      ${abas}
      <div class="artgrid">
        <div><div class="artcab">Gols — ${esc(sel)}</div>${lista(dados.gols, '#7fe3a0', 'Ninguém marcou ainda nesta competição.')}</div>
        <div><div class="artcab">Assistências</div>${lista(dados.assist, '#8fd0ff', 'Sem assistências ainda.')}</div></div></div>${painelElenco}`;
  }

  _renderCalendar() {
    const c = this.career;
    const ag = c.agenda || [];
    // A agenda virou o que ela é de verdade: a LISTA DE JOGOS da sua temporada, um
    // por linha, na ordem em que acontecem. Antes ela mostrava as 38 rodadas do
    // Brasileirão e, na coluna do lado, "Campeonato Paulista: Final — se avançar",
    // como se os dois fossem no mesmo dia. O Gustavo: "como é que vou jogar os dois
    // jogos no dia? Eu preciso que tenha datas específicas".
    if (!ag.length) return `<div class="panel"><h2>Agenda</h2><div class="muted">A agenda desta temporada ainda não foi montada.</div></div>`;

    const cp = c.userCompObj();
    const nomeLiga = nomeDaLiga(cp.country, cp.tier, cp.name);
    let rows = '';
    let jogados = 0;
    ag.forEach((d, i) => {
      const passou = i < c.dia;
      const hoje = i === c.dia;
      if (passou) jogados++;
      let quem = '', onde = '', comp = '', extra = '';
      if (d.tipo === 'liga') {
        const g = (c.fixtures[d.rodada] || []).find((x) => x[0] === c.userClubId || x[1] === c.userClubId);
        comp = nomeLiga;
        if (g) {
          const casa = g[0] === c.userClubId;
          const opp = c.clubById(casa ? g[1] : g[0]);
          onde = casa ? '<span class="ondeC">CASA</span>' : '<span class="ondeF">FORA</span>';
          quem = `${crest(opp, 22)}<span>${esc(opp.name)}</span>`;
        } else quem = '<span class="muted">Folga</span>';
        extra = `rodada ${d.rodada + 1}`;
      } else {
        const cup = c.cupsList()[d.cup];
        if (!cup) return;
        comp = cup.name;
        quem = `<span>${esc(cup.stages[d.fase] || 'Final')}</span>`;
        const caiu = cup.winner && cup.winner !== c.userClubId && d.fase >= cup.stage;
        extra = caiu ? 'você já está fora' : (cup.entraDoUsuario === d.fase ? 'sua estreia' : '');
      }
      rows += `<tr class="${hoje ? 'me' : ''}" ${passou ? 'style="opacity:.45"' : ''}>
        <td class="posn">${i + 1}</td>
        <td><div class="agjogo">${onde}${quem} <span class="agcomp">${esc(comp)}</span></div></td>
        <td class="muted">${hoje ? '<b style="color:#f5c518">é hoje</b>' : passou ? 'jogado' : esc(extra)}</td></tr>`;
    });

    const daLiga = ag.filter((d) => d.tipo === 'liga').length;
    const deCopa = ag.length - daLiga;
    return `<div class="panel"><h2>Agenda de ${esc(c.userClub().name)}</h2>
      <div class="muted" style="margin-bottom:9px">São <b>${ag.length} jogos</b> nesta temporada:
        ${daLiga} pelo ${esc(nomeLiga)} e ${deCopa} de copa. Cada um tem a sua data —
        você joga um de cada vez, na ordem. Já foram ${jogados}.</div>
      <div style="overflow-x:auto"><table class="classif">
        <thead><tr><th>#</th><th>Jogo</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div></div>`;
  }

  /** O placar da partida que você acabou de simular, numa janela. */
  _popupResultado(sim) {
    if (!sim) return;
    const c = this.career;
    const u = c.userClub();

    // dia de copa: o resultado é a fase, não um placar de liga
    if (sim.diaDeCopa) {
      const par = sim.par;
      const meuGol = par ? (par.a === c.userClubId ? par.ga : par.gb) : null;
      const delesGol = par ? (par.a === c.userClubId ? par.gb : par.ga) : null;
      const rival = par ? c.clubById(par.a === c.userClubId ? par.b : par.a) : null;
      const venci = par && par.win === c.userClubId;
      // FASE DE GRUPOS: o resultado não é um placar, são os seus jogos e a
      // classificação do seu grupo. Dizer "aconteceu sem o seu clube em campo"
      // depois de o Corinthians jogar a fase inteira do Paulista era mentira.
      const jogos = sim.meusJogos || [];
      const grupo = sim.meuGrupo || null;
      let grupoHtml;
      if (jogos.length || grupo) {
        const pos = grupo ? grupo.findIndex((x) => x.id === c.userClubId) + 1 : 0;
        grupoHtml = `
          ${jogos.length ? `<div style="max-width:300px;margin:0 auto">${jogos.map((j) => {
            const adv = c.clubById(j.adv);
            const res = j.meus > j.deles ? 'meu' : j.meus < j.deles ? 'dele' : '';
            return `<div class="golinha ${res}"><span class="golmin">${j.casa ? 'casa' : 'fora'}</span>
              ${crest(adv, 16)}<b>${esc(adv ? adv.name : '')}</b>
              <span style="margin-left:auto;font-weight:800">${j.meus}x${j.deles}</span></div>`;
          }).join('')}</div>` : ''}
          ${grupo ? `<div class="muted" style="margin-top:10px">Você terminou o grupo em <b style="color:${sim.segue ? '#7fe3a0' : '#ef4444'}">${pos}º</b> de ${grupo.length}</div>` : ''}
          <div class="muted" style="margin-top:6px">${sim.segue
            ? (sim.parcial
              ? `Ainda faltam rodadas no grupo${sim.totalDoGrupo
                ? ` — ${sim.rodadaDoGrupo} de ${sim.totalDoGrupo} jogadas` : ''}.`
              : `Classificado — a próxima é ${esc(sim.proximaFase || 'a fase seguinte')}.`)
            : 'Eliminado nesta competição.'}</div>`;
      } else {
        grupoHtml = `<div class="muted" style="font-size:15px">${sim.inscrito
          ? 'A fase aconteceu e o seu clube não entrou em campo desta vez.'
          : 'Esta fase é de outros clubes — o seu entra mais adiante.'}</div>`;
      }
      const cor = !par ? (sim.segue === false ? '#ef4444' : '#8ea3c4') : venci ? '#22c55e' : '#ef4444';
      this._telaResultado(`<div class="muted" style="letter-spacing:.24em;text-transform:uppercase;font-size:11px">${esc(sim.cup || '')}</div>
        <h3 style="margin:4px 0 10px">${esc(sim.fase || '')}</h3>
        ${par
          ? `<div style="font-size:30px;font-weight:900;color:${cor}">${meuGol} <span style="color:var(--ink-dim)">x</span> ${delesGol}</div>
             <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:8px;font-weight:700">
               ${crest(u, 26)} ${esc(u.name)} <span class="muted">contra</span> ${esc(rival ? rival.name : '')} ${crest(rival, 26)}</div>
             ${par.pen ? `<div style="margin-top:6px;font-weight:700;color:${cor}">
               decidido nos pênaltis</div>` : ''}
             <div class="muted" style="margin-top:8px">${venci ? 'Você avançou.'
               : `Fim de linha nesta competição${par.pen ? ' — empatou no tempo normal e caiu nos pênaltis' : ''}. A competição segue sem você.`}</div>`
          : grupoHtml}`, cor);
      return;
    }

    if (sim.bye) return;
    // O adversário pode não vir no resultado (rodada pulada, jogo de copa resolvido
    // por fora): sem esta rede, o popup quebrava a tela inteira ao desenhar o escudo
    // de quem fez o gol — e o jogo ficava sem responder a clique nenhum.
    const opp = c.clubById(sim.oppId) || c.opponentClub() || { name: sim.oppName || 'adversário' };
    const venci = sim.userGoals > sim.oppGoals;
    const empate = sim.userGoals === sim.oppGoals;
    const cor = venci ? '#22c55e' : empate ? '#f5c518' : '#ef4444';
    const rot = venci ? 'Vitória' : empate ? 'Empate' : 'Derrota';
    // DE QUEM FOI O GOL. O Gustavo: "essa tela não mostra qual jogador é do meu
    // time, eu não consigo reconhecer". Agora cada gol vem com o escudo de quem
    // marcou e os seus ficam verdes, com uma barra do lado.
    const gols = (sim.events || [])
      .map((e) => {
        const meu = e.side === 'user';
        const clube = meu ? u : opp;
        return `<div class="golinha ${meu ? 'meu' : 'dele'}">
          <span class="golmin">${e.minute}'</span>${crest(clube, 16)}
          <b>${esc(e.scorer)}</b>${e.assist ? ` <span class="muted">(${esc(e.assist)})</span>` : ''}</div>`;
      })
      .join('') || '<div class="muted" style="font-size:13px">Ninguém marcou.</div>';
    // COM OU SEM GOL, a partida tem história: as notas dizem quem jogou.
    const nts = sim.notas || [];
    const notas = nts.length ? `<div class="notas"><span class="notatit">Melhores em campo</span>${
      nts.slice(0, 3).map((x) => `<span class="notachip ${x.nota >= 7.5 ? 'top' : ''}">${esc(x.sub)} ${esc(x.nome)} <b>${x.nota.toFixed(1)}</b></span>`).join('')}</div>` : '';
    this._telaResultado(`<div class="muted" style="letter-spacing:.24em;text-transform:uppercase;font-size:11px">${rot}</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin:12px 0 6px">
        <div style="flex:1;text-align:right"><div style="font-weight:800">${esc(u.name)}</div></div>
        <div style="font-size:30px;font-weight:900;color:${cor}">${sim.userGoals} <span style="color:var(--ink-dim)">x</span> ${sim.oppGoals}</div>
        <div style="flex:1;text-align:left"><div style="font-weight:800">${esc(opp ? opp.name : '')}</div></div></div>
      <div class="muted" style="margin-bottom:10px">${sim.home ? 'em casa' : 'fora de casa'}</div>
      <div style="text-align:left;max-width:300px;margin:0 auto">${gols}</div>${notas}`, cor);
  }

  /** A janelinha em si. */
  _telaResultado(html, cor) {
    const ov = document.createElement('div');
    ov.className = 'cov';
    ov.innerHTML = `<div class="ccard" style="max-width:430px;text-align:center;border-color:${cor}">
      ${html}
      <div class="opts" style="justify-content:center;margin-top:16px">
        <button class="btn" id="okRes">Continuar</button></div></div>`;
    const fecha = () => ov.remove();
    ov.querySelector('#okRes').onclick = fecha;
    ov.onclick = (e) => { if (e.target === ov) fecha(); };
    document.body.appendChild(ov);
  }

  /** A mesa de negociação: as propostas pelo seu jogador, para você escolher. */
  /** Pergunta antes de fazer o que não dá para desfazer. */
  _confirmar(html, ok = 'Confirmar', nao = 'Cancelar') {
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.className = 'cov';
      ov.innerHTML = `<div class="ccard" style="max-width:420px;text-align:center">${html}
        <div class="opts" style="justify-content:center;margin-top:16px">
          <button class="btn sec" data-nao="1">${esc(nao)}</button>
          <button class="btn" data-sim="1">${esc(ok)}</button></div></div>`;
      ov.querySelector('[data-sim]').onclick = () => { ov.remove(); resolve(true); };
      ov.querySelector('[data-nao]').onclick = () => { ov.remove(); resolve(false); };
      document.body.appendChild(ov);
    });
  }

  _mesaDeVenda(p, props) {
    const c = this.career;
    const ov = document.createElement('div');
    ov.className = 'cov';
    ov.innerHTML = `<div class="ccard" style="max-width:560px">
      <h3>Propostas por ${esc(p.nome)}</h3>
      <p class="muted" style="margin-bottom:12px">${p.idade} anos · ${esc(p.posicao)} · overall ${p.forca} ·
        vale ${fmtMoney(p.valorMercado)}. Quem paga à vista paga menos; quem parcela paga mais no total.</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${props.map((x) => `<div class="prop" data-prop="${esc(x.id)}">
          ${crest(c.clubById(x.clubeId), 34)}
          <div style="flex:1">
            <b>${esc(x.clube)}</b> <span class="muted">${esc(x.liga)}</span>
            <div class="muted" style="margin-top:3px">${x.parcelas > 1
              ? `${fmtMoney(x.aVista)} agora e mais ${x.parcelas - 1} parcela(s) iguais`
              : 'pagamento único, cai no caixa agora'}</div></div>
          <div style="text-align:right">
            <b style="font-size:17px;color:#7fe3a0">${fmtMoney(x.total)}</b>
            <div class="muted">${esc(x.rotulo)}</div></div></div>`).join('')}
      </div>
      <div class="opts" style="justify-content:center;margin-top:14px">
        <button class="btn sec" id="naoVende">Não vender agora</button></div></div>`;

    // CONFIRMAR ANTES DE VENDER. O Gustavo: "eu cliquei e nem confirmei nada". Vender
    // um titular é irreversível — agora o card escolhido abre uma confirmação com o
    // escudo de quem leva o jogador e quanto entra no caixa.
    ov.querySelectorAll('[data-prop]').forEach((n) => (n.onclick = async () => {
      const x = props.find((y) => String(y.id) === n.dataset.prop);
      const comprador = c.clubById(x.clubeId);
      const sim = await this._confirmar(`
        <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:10px">
          ${crest(c.userClub(), 40)} <span style="font-size:22px;color:var(--ink-dim)">→</span> ${crest(comprador, 40)}</div>
        <h3>Vender ${esc(p.nome)}?</h3>
        <p class="muted" style="margin:8px 0 2px">${esc(x.clube)} paga <b style="color:#7fe3a0">${fmtMoney(x.total)}</b> ${esc(x.rotulo)}.</p>
        <p class="muted">${p.idade} anos · ${esc(p.sub || p.posicao)} · overall ${p.forca}. Não dá para desfazer.</p>`,
        'Vender', 'Cancelar');
      if (!sim) return;
      const r = c.aceitarPropostaDeVenda(p.id, n.dataset.prop);
      ov.remove();
      aviso(r.msg || 'Não foi possível', r.ok ? 'ok' : 'erro');
      this.render();
    }));
    ov.querySelector('#naoVende').onclick = () => ov.remove();
    document.body.appendChild(ov);
  }

  _renderHistory() {
    const c = this.career;
    const hist = (c.history || []).slice().reverse();
    const ano = (n) => (c.startYear || 2026) + n - 1;

    // SALA DE TROFÉUS: os títulos em vitrine, não numa linha de texto.
    const trophyCount = {};
    (c.trophies || []).forEach((t) => trophyCount[t] = (trophyCount[t] || 0) + 1);
    const taças = Object.entries(trophyCount).sort((a, b) => b[1] - a[1]);
    const vitrine = taças.length
      ? `<div class="vitr">${taças.map(([t, n]) => `<div class="vitrpeca">${compTrophy(t, 46)}
          <b>${esc(t)}</b>${n > 1 ? `<i>${n}x</i>` : ''}</div>`).join('')}</div>`
      : '<div class="muted" style="padding:10px 2px">A prateleira está vazia. Ainda dá tempo.</div>';

    // NÚMEROS DA CARREIRA: uma linha só, para ele saber quem é sem contar nos dedos.
    const temps = hist.length;
    const melhor = temps ? Math.min(...hist.map((h) => h.finish)) : 0;
    const titulos = (c.trophies || []).length;
    const resumo = `<div class="histnums">
      <div><b>${temps}</b><span>temporada${temps === 1 ? '' : 's'}</span></div>
      <div><b>${titulos}</b><span>título${titulos === 1 ? '' : 's'}</span></div>
      <div><b>${temps ? melhor + 'º' : '—'}</b><span>melhor campanha</span></div></div>`;

    // TEMPORADA A TEMPORADA: cada ano é uma linha com a posição em destaque.
    const linhas = hist.map((h) => {
      const meus = h.userTrophies || [];
      return `<div class="histano">
        <span class="histpos ${h.finish === 1 ? 'ouro' : h.finish <= 4 ? 'bom' : ''}">${h.finish}º</span>
        <div class="histmeio">
          <b>${ano(h.season)}</b> <span class="muted">${esc(h.comp)}</span>
          <div class="muted">Campeão: ${esc(h.champion)}${h.ballonDor ? ` · Bola de Ouro: ${esc(h.ballonDor.nome)}` : ''}</div></div>
        ${meus.length ? `<div class="histtacas" title="${esc(meus.join(', '))}">${meus.map((t) => compTrophy(t, 26)).join('')}</div>` : ''}
      </div>`;
    }).join('') || '<div class="muted" style="padding:10px 2px">Sua primeira temporada está em andamento.</div>';

    return `<div class="panel"><h2>Sala de troféus</h2>${resumo}${vitrine}</div>
      <div class="panel"><h2>Temporada a temporada</h2>${linhas}</div>`;
  }

  _playerModal(p) {
    const c = this.career; const attrs = deriveAttributes(p);
    const st = (p.lesao > 0)
      ? `<span style="color:#ef4444"><i class="tag tag-lesao">Lesão</i> ${esc(p.lesaoNome || 'Lesionado')} — fora por ${p.lesaoSemanas || p.lesao} semana(s)</span>`
      : (p.suspenso > 0) ? `<span style="color:#f5c518"><i class="tag tag-susp">Susp.</i> Suspenso (${p.suspenso})</span>` : '<span style="color:#22c55e">Disponível</span>';
    const bars = Object.entries(attrs).map(([k, v]) => `<div style="display:flex;align-items:center;gap:6px;margin:3px 0;font-size:12px"><span style="width:56px;color:#9fb2cf">${k}</span><span style="flex:1;height:8px;background:#0b1220;border-radius:5px;overflow:hidden"><span style="display:block;height:100%;width:${v}%;background:${v >= 80 ? '#22c55e' : v >= 65 ? '#f5c518' : '#ef4444'}"></span></span><b style="width:22px;text-align:right">${v}</b></div>`).join('');
    const inUser = c.userClub().squad.some((x) => x.id === p.id);
    // emprestar só faz sentido para o jovem com teto que não está jogando
    const podeEmprestar = inUser && p.idade <= 23 && (p.potencial || 0) - p.forca >= 4;
    const renew = inUser
      ? `<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px"> <button class="btn" data-renew="${p.id}" title="luva de ${fmtMoney(c.custoDeRenovar(p).luva)}">Renovar 3 anos — ${fmtMoney(c.custoDeRenovar(p).luva)}</button> ${podeEmprestar ? `<button class="btn sec" data-loan="${p.id}">Emprestar</button>` : ''}
</div>` : '';
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:70;background:rgba(5,9,18,.85);display:flex;align-items:center;justify-content:center;font-family:Segoe UI,sans-serif';
    ov.innerHTML = `<div style="background:#0f1728;border:1px solid #22314c;border-radius:14px;padding:18px;width:min(380px,92vw);color:#e6edf7"> <div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">${p.nome}</h2><button id="pmX" style="background:none;border:none;color:#9fb2cf;font-size:20px;cursor:pointer"></button></div> <div class="muted" style="margin:4px 0">${p.pais ? `${bandeiraDoJogador(p.pais)} ${esc(p.pais)} • ` : ''}${p.posicao} • ${p.idade} anos • OVR <b style="color:#7fe3a0">${p.forca}</b>${p.potencial > p.forca ? ' → ' + p.potencial : ''} • ${p.foot === 'L' ? 'canhoto' : 'destro'}</div> <div style="margin:6px 0">${st} • Contrato: <b>${p.contrato || 0} ano(s)</b> • Forma: ${'★'.repeat(Math.round((p.forma || 6) / 2))}</div> <div style="margin:6px 0">Valor: <b>${fmtMoney(p.valorMercado)}</b> • Salário: ${fmtMoney(p.salario)}</div> <div style="margin-top:8px">${bars}</div> <div style="margin-top:6px;font-size:12px" class="muted">Gols: ${p.gols || 0} • Assist.: ${p.assist || 0} • Jogos: ${p.jogos || 0}</div> ${renew}</div>`;
    document.body.appendChild(ov);
    ov.querySelector('#pmX').onclick = () => ov.remove();
    ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
    const rb = ov.querySelector('[data-renew]'); if (rb) rb.onclick = () => { const r = c.renewContract(p.id); aviso(r.msg); ov.remove(); this.render(); };
    const lb = ov.querySelector('[data-loan]'); if (lb) lb.onclick = () => { ov.remove(); this._telaEmprestimo(p.id); };
  }

  // ---------------------------------------------------------- empréstimo
  _telaEmprestimo(playerId) {
    const c = this.career;
    const p = c.userClub().squad.find((x) => x.id === playerId);
    if (!p) return;
    const destinos = c.destinosDeEmprestimo(playerId);

    const ov = document.createElement('div');
    ov.className = 'cov';
    ov.innerHTML = `<div class="ccard" style="max-width:560px;border-color:var(--line-hot)"> <h3>Emprestar ${esc(p.nome)}</h3> <p class="muted" style="margin-bottom:14px">${p.idade} anos • OVR ${p.forca} → teto ${p.potencial}.
        Jogando como titular ele volta melhor no fim da temporada. Parado no seu banco, não evolui.</p> ${destinos.length ? `<div style="display:flex;flex-direction:column;gap:7px;max-height:46vh;overflow:auto"> ${destinos.map((d) => `<div class="prop" data-dest="${d.clubeId}"> ${crest(c.clubById(d.clubeId), 30)}
          <div style="flex:1"><b>${esc(d.nome)}</b> <div class="muted">${esc(d.liga)} • força ${d.forca}</div></div></div>`).join('')}
</div>` : '<p class="muted">Nenhum clube do tamanho certo agora.</p>'}
      <div class="opts" style="justify-content:center;margin-top:14px"> <button class="btn sec" id="loanX">Cancelar</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelector('#loanX').onclick = () => ov.remove();
    ov.querySelectorAll('[data-dest]').forEach((n) => (n.onclick = () => {
      const r = c.emprestarJogador(playerId, +n.dataset.dest);
      ov.remove();
      if (r.ok) this.render();
    }));
  }

  _wire() {
    const c = this.career;
    this.body.querySelectorAll('[data-tab]').forEach((n) => n.onclick = () => {
      const t = n.dataset.tab;
      if (t === 'PLAY') { c.state = STATE.DASHBOARD; this.render(); return; }
      c.state = t; this.render();
    });
    this.body.querySelectorAll('[data-action]').forEach((n) => n.onclick = async () => {
      const a = n.dataset.action;
      if (a === 'play') { this.onPlay(); return; }
      if (a === 'fecharresumo') {
        c._seasonJustEnded = false;
        // Quem foi DEMITIDO não escolhe os garotos da base: eles são do clube que
        // acabou de te mandar embora. O jogo perguntava assim mesmo, e o Gustavo
        // subiu três jogadores para um elenco que já não era dele.
        if (c.pendingBoard && c.pendingBoard.fired) c.baseRevelada = [];
        if (c.baseRevelada && c.baseRevelada.length) return this._telaBase();
        this.render(); return;
      }
      if (a === 'newclub') { c.pendingBoard = null; c.state = STATE.MAIN_MENU; this._pickComp = null; this.render(); return; }
      if (a === 'ficar') { c.pendingBoard = null; this.render(); return; }
      // ---- FINAL da copa ----
      if (a === 'finalplay') { if (this.onPlayCup) this.onPlayCup(); return; }
      if (a === 'finalsim' || a === 'finaltime') {
        const res = c.simulateCupFinal();
        if (a === 'finalsim') this._watchSim({ events: res.events }, res.opp);
        else this._watchTime({ events: res.events }, res.opp);
        return;
      }
      // ---- simular temporada inteira (para só em final) ----
      // Simular a temporada inteira NÃO para no meio: as finais se resolvem sozinhas
      // e o único pop-up é o do fim de temporada, como você pediu.
      if (a === 'auto') { const r = c.autoSimSeason(true); c.state = STATE.DASHBOARD; this.render();
        if (r.stopped === 'final') { /* o cupPrompt aparece no painel */ } return; }
      // ---- rodada normal ----
      // CHECAGEM ANTES DE ROLAR A BOLA. É a resposta para "é muito chato ir lá na
      // tática, procurar o jogador menos cansado, fazer a alteração, salvar".
      if (a === 'aovivo' || a === 'skip' || a === 'simtime') {
        const seguir = await this._checagem();
        if (!seguir) return;
      }
      if (a === 'aovivo') { this._partidaAoVivo(); return; }
      const sim = c.simulateUserResult();
      // SIMULAR abre o placar num popup. O Gustavo: "eu queria que na hora que eu
      // simulasse aparecesse um popup, em vez de aparecer em cima como é hoje —
      // porque eu vou ter que olhar ali em cima depois, e não quero isso".
      if (a === 'skip') { c.state = STATE.DASHBOARD; this.render(); this._popupResultado(sim); }
      else if (a === 'simtime') this._watchTime(sim, c.clubById(sim.oppId));
      else this._watchSim(sim, c.clubById(sim.oppId));
    });
    // mercado: busca, filtros, escopo e ordenação
    const mb = this.body.querySelector('#mktBusca');
    if (mb) {
      let t;
      mb.oninput = () => { clearTimeout(t); t = setTimeout(() => {
        const pos = mb.selectionStart; this._mktBusca = mb.value; this.render();
        const novo = this.body.querySelector('#mktBusca');
        if (novo) { novo.focus(); novo.setSelectionRange(pos, pos); }
      }, 260); };
    }
    this.body.querySelectorAll('[data-scescopo]').forEach((n) => (n.onclick = () => { this._scEscopo = n.dataset.scescopo; this.render(); }));
    this.body.querySelectorAll('[data-scidade]').forEach((n) => (n.onclick = () => { this._scIdade = +n.dataset.scidade; this.render(); }));
    this.body.querySelectorAll('[data-scteto]').forEach((n) => (n.onclick = () => { this._scTeto = +n.dataset.scteto; this.render(); }));
    this.body.querySelectorAll('[data-artcomp]').forEach((n) => n.onclick = () => { this._artComp = n.dataset.artcomp; this.render(); });
    this.body.querySelectorAll('[data-garotos]').forEach((n) => n.onclick = () => {
      this._abaGarotos = n.dataset.garotos; this.render();
    });
    this.body.querySelectorAll('[data-ord]').forEach((n) => n.onclick = () => {
      const col = n.dataset.ord;
      const atual = this._ordElenco || { col: 'g', desc: true };
      // mesma coluna: inverte. coluna nova: começa do maior (nome começa do A)
      this._ordElenco = atual.col === col ? { col, desc: !atual.desc } : { col, desc: col !== 'nome' };
      this.render();
    });
    this.body.querySelectorAll('[data-scpos]').forEach((n) => (n.onclick = () => { this._scPos = n.dataset.scpos; this.render(); }));
    const si = this.body.querySelector('#scIdade');
    if (si) si.onchange = () => { this._scIdade = +si.value; this.render(); };
    const st = this.body.querySelector('#scTeto');
    if (st) st.onchange = () => { this._scTeto = +st.value; this.render(); };
    this.body.querySelectorAll('[data-sccabe]').forEach((n) => (n.onclick = () => { this._scCabe = n.dataset.sccabe === '1'; this.render(); }));
    this.body.querySelectorAll('[data-loan]').forEach((n) => (n.onclick = () => this._telaEmprestimo(+n.dataset.loan)));
    this.body.querySelectorAll('[data-escopo]').forEach((n) => (n.onclick = () => { this._mktEscopo = n.dataset.escopo; this.render(); }));
    this.body.querySelectorAll('[data-ordem]').forEach((n) => (n.onclick = () => { this._mktOrdem = n.dataset.ordem; this.render(); }));

    // seletor de outras ligas
    const ligaSel = this.body.querySelector('#ligaSel');
    if (ligaSel) ligaSel.onchange = () => { this._ligaView = +ligaSel.value; this.render(); };
    // aceitar proposta de outro clube
    // Era confirm() do navegador — e com "|| true" no fim, ou seja, a resposta do
    // usuário era ignorada: dizer "cancelar" assumia o clube do mesmo jeito.
    this.body.querySelectorAll('[data-offer]').forEach((n) => n.onclick = async () => {
      const clube = c.clubById(+n.dataset.offer);
      if (!clube) return;
      const sair = await confirmar(
        `Assumir o ${clube.name}? Você deixa o ${c.userClub().name} agora.`, 'Assumir', 'Ficar onde estou');
      if (!sair) return;
      c.acceptOffer(+n.dataset.offer);
      c.pendingBoard = null;
      c.state = STATE.DASHBOARD;
      aviso(`Você é o novo técnico do ${clube.name}.`, 'ok');
      this.render();
    });
    // voltar ao menu inicial
    this.body.querySelectorAll('[data-home]').forEach((n) => (n.onclick = () => {
      if (this.opts.onHome) this.opts.onHome();
    }));
    // salvar carreira
    this.body.querySelectorAll('[data-save]').forEach((n) => n.onclick = () => { try { localStorage.setItem('futebolfc_save', c.toSnapshot()); aviso('Carreira salva. Você pode continuar depois na tela inicial.', 'ok'); } catch (e) { aviso('Não consegui salvar: ' + e.message, 'erro'); } });
    // abrir ficha do jogador
    this.body.querySelectorAll('[data-player]').forEach((n) => n.onclick = (e) => { e.preventDefault(); const p = c.userClub().squad.find((x) => x.id === +n.dataset.player); if (p) this._playerModal(p); });
    // troca de titular: escolher outro jogador no slot; se já for titular em outro slot, faz swap
    // (o antigo onchange do <select data-slot> saiu junto com o próprio select)
    // ARRASTAR PARA TROCAR. O Gustavo: "poderia ser tipo arrastando os jogadores,
    // sabe? Clicar no jogador e trocar de posição". O menu continua ali para quem
    // preferir, mas agora dá para pegar um reserva e soltar em cima do titular.
    const trocar = (pid, slot) => {
      const ids = (c.lineupIds || []).slice();
      if (!ids.length || slot < 0 || slot >= ids.length || !pid) return;
      const j = ids.indexOf(pid);
      if (j === slot) return;
      if (j >= 0) ids[j] = ids[slot];   // titular com titular: troca de vaga
      ids[slot] = pid;                  // reserva: entra no lugar
      c.lineupIds = ids; this.render();
    };
    this.body.querySelectorAll('[data-pid][draggable="true"]').forEach((n) => {
      n.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', n.dataset.pid);
        e.dataTransfer.effectAllowed = 'move';
        n.classList.add('arrastando');
      };
      n.ondragend = () => { n.classList.remove('arrastando');
        this.body.querySelectorAll('.alvo').forEach((x) => x.classList.remove('alvo')); };
    });
    // clicar na camisa do campo: abre quem pode jogar naquela vaga
    this.body.querySelectorAll('[data-vaga]').forEach((n) => n.onclick = () => {
      this._trocaDaVaga(+n.dataset.vaga);
    });
    this.body.querySelectorAll('[data-slot-card]').forEach((n) => {
      n.ondragover = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; n.classList.add('alvo'); };
      n.ondragleave = () => n.classList.remove('alvo');
      n.ondrop = (e) => {
        e.preventDefault(); n.classList.remove('alvo');
        trocar(+e.dataTransfer.getData('text/plain'), +n.dataset.slotCard);
      };
    });

    // abas de copa e botões de fase
    this.body.querySelectorAll('[data-copa]').forEach((n) => n.onclick = () => {
      this._copaSel = +n.dataset.copa; this.render();
    });
    this.body.querySelectorAll('[data-fase]').forEach((n) => n.onclick = () => {
      (this._faseSel = this._faseSel || {})[this._copaSel] = +n.dataset.fase; this.render();
    });
    this.body.querySelectorAll('[data-prelim]').forEach((n) => n.onclick = () => {
      this._verPrelim = !this._verPrelim; this.render();
    });

    // decidir as propostas pelos seus jogadores
    this.body.querySelectorAll('[data-vender]').forEach((n) => n.onclick = async () => {
      const prop = (c.propostasRecebidas || [])[+n.dataset.vender];
      if (!prop) return;
      const sim = await confirmar(
        `Vender ${prop.nome} ao ${prop.clube} por ${fmtMoney(prop.valor)}?`, 'Vender', 'Voltar');
      if (!sim) return;
      const r = c.aceitarPropostaPorMeuJogador(prop);
      if (!r.ok) { aviso(r.msg); return; }
      c.propostasRecebidas = (c.propostasRecebidas || []).filter((x) => x !== prop);
      aviso(`${prop.nome} vendido por ${fmtMoney(prop.valor)}.`, 'ok');
      this.render();
    });
    this.body.querySelectorAll('[data-recusar]').forEach((n) => n.onclick = () => {
      const prop = (c.propostasRecebidas || [])[+n.dataset.recusar];
      if (!prop) return;
      c.recusarPropostaPorMeuJogador(prop);
      c.propostasRecebidas = (c.propostasRecebidas || []).filter((x) => x !== prop);
      this.render();
    });

    this.body.querySelectorAll('[data-treino]').forEach((n) => n.onclick = () => {
      c.treinoDoTime = n.dataset.treino; this.render();
    });
    const tacSel = this.body.querySelector('#tacSel');
    if (tacSel) tacSel.onchange = () => {
      const t = tacticByKey(tacSel.value);
      const d = this.body.querySelector('#tacDesc'); if (d) d.innerHTML = t.desc + ' <span style="color:#8ea3c4">(' + t.coach + ')</span>';
      const b = this.body.querySelector('#tacBars'); if (b) b.innerHTML = this._tacBars(t);
      const pv = this.body.querySelector('#tacPrev'); if (pv) pv.innerHTML = this._previaModelo(tacSel.value);
      c.userTactic = tacSel.value;
    };
    const save = this.body.querySelector('#saveLine');
    if (save) save.onclick = () => {
      c.formation = this.body.querySelector('#formSel').value; c.posture = this.body.querySelector('#postSel').value;
      if (tacSel) c.userTactic = tacSel.value;
      this._ensureLineup(); aviso('Tática e formação salvas.', 'ok'); this.render();
    };
    this.body.querySelector('#formSel') && (this.body.querySelector('#formSel').onchange = (e) => { c.formation = e.target.value; c.lineupIds = null; this.render(); });
    this.body.querySelectorAll('[data-filter]').forEach((n) => n.onclick = () => {
      const k = n.dataset.filter;
      if (!(this._mktPos instanceof Set)) this._mktPos = new Set();
      if (k === 'ALL') this._mktPos.clear();
      else if (this._mktPos.has(k)) this._mktPos.delete(k);
      else this._mktPos.add(k);
      this.render();
    });
    this.body.querySelectorAll('[data-mktovrmax]').forEach((n) => n.onclick = () => { this._mktOvrMax = +n.dataset.mktovrmax; this.render(); });
    const selOvr = this.body.querySelector('#mktOvr');
    if (selOvr) selOvr.onchange = () => { this._mktOvr = +selOvr.value; this.render(); };
    const selOvrMax = this.body.querySelector('#mktOvrMax');
    if (selOvrMax) selOvrMax.onchange = () => { this._mktOvrMax = +selOvrMax.value; this.render(); };
    const selOrdem = this.body.querySelector('#mktOrdem');
    if (selOrdem) selOrdem.onchange = () => { this._mktOrdem = selOrdem.value; this.render(); };
    const selNac = this.body.querySelector('#mktNac');
    if (selNac) selNac.onchange = () => { this._mktNac = selNac.value; this.render(); };
    this.body.querySelectorAll('[data-mktnaclimpa]').forEach((n) => n.onclick = () => { this._mktNac = ''; this.render(); });
    this.body.querySelectorAll('[data-mktbuscalimpa]').forEach((n) => n.onclick = () => { this._mktBusca = ''; this.render(); });
    this.body.querySelectorAll('[data-limpafiltros]').forEach((n) => n.onclick = () => {
      this._mktPos = new Set(); this._mktOvr = 0; this._mktOvrMax = 99; this._mktCabe = false;
      this._mktNac = ''; this._mktBusca = ''; this.render();
    });
    this.body.querySelectorAll('[data-mktovr]').forEach((n) => n.onclick = () => { this._mktOvr = +n.dataset.mktovr; this.render(); });
    this.body.querySelectorAll('[data-mktcabe]').forEach((n) => n.onclick = () => { this._mktCabe = n.dataset.mktcabe === '1'; this.render(); });
    this.body.querySelectorAll('[data-buy]').forEach((n) => n.onclick = () => { const r = c.buyPlayer(+n.dataset.buy, +n.dataset.from); aviso(r.msg); this.render(); });
    // --- mesa de negociação ---
    this.body.querySelectorAll('[data-neg]').forEach((n) => n.onclick = () => {
      this._neg = { pid: +n.dataset.neg, cid: +n.dataset.from, resp: null }; this.render();
    });
    this.body.querySelectorAll('[data-desistir]').forEach((n) => n.onclick = () => { this._neg = null; this.render(); });
    this.body.querySelectorAll('[data-oferta]').forEach((n) => n.onclick = () => {
      if (!this._neg) return;
      const val = +n.dataset.oferta;
      const r = c.avaliarProposta(this._neg.pid, this._neg.cid, val);
      if (r.status === 'aceita') {
        const compra = c.buyPlayer(this._neg.pid, this._neg.cid, val);
        this._neg = compra.ok ? null : { ...this._neg, resp: { status: 'recusa', motivo: compra.msg } };
        if (compra.ok) aviso(compra.msg);
      } else this._neg = { ...this._neg, resp: r };
      this.render();
    });
    this.body.querySelectorAll('[data-fechar]').forEach((n) => n.onclick = () => {
      if (!this._neg) return;
      const compra = c.buyPlayer(this._neg.pid, this._neg.cid, +n.dataset.fechar);
      aviso(compra.msg);
      if (compra.ok) this._neg = null;
      this.render();
    });
    this.body.querySelectorAll('[data-basesobe]').forEach((n) => n.onclick = () => {
      const r = c.subirDaBase(+n.dataset.basesobe); aviso(r.msg, r.ok ? 'ok' : 'erro'); this.render(); });
    this.body.querySelectorAll('[data-basesai]').forEach((n) => n.onclick = async () => {
      const p = c.baseDoClube().find((x) => x.id === +n.dataset.basesai);
      if (!p) return;
      if (!await confirmar(`Dispensar ${p.nome}? Ele tem ${p.idade} anos e você nunca vai saber até onde ele ia chegar.`, 'Dispensar', 'Deixar ficar')) return;
      const r = c.dispensarDaBase(+n.dataset.basesai); aviso(r.msg); this.render(); });
    this.body.querySelectorAll('[data-sign]').forEach((n) => n.onclick = () => { const r = c.signFreeAgent(+n.dataset.sign); aviso(r.msg); this.render(); });
    // VENDER virou uma NEGOCIAÇÃO. Antes o clique vendia na hora, o dinheiro entrava
    // e o jogador sumia — o Gustavo vendeu por 40 milhões e o jogo mandou o cara para
    // "agente livre" sem dizer para quem. Agora abre a mesa com as propostas.
    this.body.querySelectorAll('[data-sell]').forEach((n) => n.onclick = () => {
      const id = +n.dataset.sell;
      const p = (c.userClub().squad || []).find((x) => x.id === id);
      const props = c.propostasPor(id);
      if (!props.length) {
        aviso(`Ninguém fez proposta por ${p ? p.nome : 'esse jogador'} agora. Tente na próxima janela.`, 'erro');
        return;
      }
      this._mesaDeVenda(p, props);
    });
  }

  // Assiste à simulação com os BONECOS jogando em campo (canvas), com movimento
  // influenciado pelas táticas dos dois times (linha, pressão, ritmo, largura).
  // ---- Simulação COM TEMPO CORRENDO (relógio + feed, sem bonecos) ----
  _watchTime(sim, oppClub, onDone) {
    const c = this.career; const u = c.userClub(), o = oppClub || c.opponentClub();
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:60;background:rgba(5,9,18,.95);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:#fff;font-family:Segoe UI,sans-serif;';
    ov.innerHTML = `<div style="font-size:12px;color:#9fb2cf">SIMULAÇÃO — tempo correndo</div> <div style="display:flex;align-items:center;gap:18px;font-size:26px;font-weight:900"><span>${u.name}</span><span id="tScore" style="font-size:34px">0 x 0</span><span>${o.name}</span></div> <div style="width:min(560px,92vw)"><div style="height:10px;background:#0f1728;border:1px solid #22314c;border-radius:6px;overflow:hidden"><div id="tBar" style="height:100%;width:0;background:linear-gradient(90deg,#22c55e,#54a8ff)"></div></div> <div id="tClock" style="text-align:center;color:#9fb2cf;margin-top:4px;font-weight:700">0'</div></div> <div id="tFeed" style="min-height:150px;width:min(560px,92vw);background:#0f1728;border:1px solid #22314c;border-radius:12px;padding:10px;font-size:14px;overflow:auto;max-height:200px"></div> <button id="tSkip" style="background:#334155;color:#e2e8f0;border:none;border-radius:8px;padding:8px 18px;font-weight:800;cursor:pointer">Pular para o fim</button>`;
    document.body.appendChild(ov);
    const $ = (id) => ov.querySelector('#' + id);
    let ug = 0, og = 0, min = 0, evi = 0; const feed = [];
    const draw = () => { $('tScore').textContent = ug + ' x ' + og; $('tClock').textContent = Math.floor(min) + "'"; $('tBar').style.width = (min / 90 * 100) + '%'; $('tFeed').innerHTML = feed.map((t) => `<div>${t}</div>`).join(''); $('tFeed').scrollTop = 9e9; };
    const finish = () => { clearInterval(timer); ov.remove(); if (onDone) onDone(); else { c.state = STATE.DASHBOARD; this.render(); } };
    const timer = setInterval(() => {
      min = Math.min(90, min + 1.2);
      while (evi < sim.events.length && sim.events[evi].minute <= min) {
        const e = sim.events[evi++]; if (e.side === 'user') ug++; else og++;
        const time = e.side === 'user' ? u.name : o.name;
        feed.push(`<b>${e.minute}'</b> <i class="ico-bola"></i> <b>${e.scorer}</b> (${time})${e.assist ? ` — assist: ${e.assist}` : ''}  <span style="color:#9fb2cf">${ug} x ${og}</span>`);
      }
      draw();
      if (min >= 90) { clearInterval(timer); feed.push(`<b>90'</b> — FIM DE JOGO: ${u.name} ${ug} x ${og} ${o.name}`); draw(); setTimeout(finish, 1500); }
    }, 90);
    $('tSkip').onclick = finish; draw();
  }

  // ---- Ver OUTRAS LIGAS (classificação projetada) ----
  // ---------------------------------------------------------- olheiro
  _renderOlheiro() {
    const c = this.career;
    const u = c.userClub();
    const escopo = this._scEscopo || 'mundo';
    const idadeMax = this._scIdade || 21;
    const tetoMin = this._scTeto || 82;
    const pos = this._scPos || 'ALL';
    const soCabe = !!this._scCabe;

    const base = { idadeMax, tetoMin, escopo, posicao: pos, soCabe };
    const joias = c.scoutJoias(base);
    const btn = (attr, val, atual, txt) => `<button class="opt ${val === atual ? 'on' : ''}" data-${attr}="${val}">${txt}</button>`;

    const linhas = joias.map(({ p, clube, sobra }) => {
      const preco = c.precoDe(p, clube);      // o olheiro também mostra o preço real
      const pode = u.caixa >= preco;
      // A FICHA DA JOIA. O Gustavo: "esse olheiro ta muito paia, tenta deixar mais
      // bonito e mais facil". O que importa numa joia é o SALTO — o quanto ela ainda
      // tem para crescer — e isso virou uma barra: o cheio é o que ele já é, o resto
      // é o que o olheiro acha que ele pode virar.
      const pct = Math.max(6, Math.round(p.forca / p.potencial * 100));
      const leitura = sobra >= 14 ? 'pode virar craque' : sobra >= 10 ? 'salto grande pela frente'
        : 'ainda tem margem para crescer';
      return `<div class="joiacard ${pode ? '' : 'caro'}">
        ${crest(clube, 34)}
        <div class="joiainfo">
          <b>${bandeiraDoJogador(p.pais) ? `<span class="nac" title="${esc(p.pais)}">${bandeiraDoJogador(p.pais)}</span>` : ''}${esc(p.nome)}</b>
          <span class="muted">${esc(p.sub || p.posicao)} · ${p.idade} anos · ${esc(clube.name)}<span class="liga-tag">${esc(clube.league)}</span></span>
          <div class="joiabarra" title="${p.forca} agora, teto ${p.potencial}"><i style="width:${pct}%"></i>
            <em>${p.forca}</em><b>${p.potencial}</b></div>
          <span class="joialeitura">${leitura}</span></div>
        <div class="joiapreco"><b>${fmtMoney(preco)}</b>
          <button class="btn ${pode ? '' : 'sec'}" data-buy="${p.id}" data-from="${clube.id}" ${pode ? '' : 'disabled'}>${pode ? 'Negociar' : 'Caro demais'}</button></div></div>`;
    }).join('');

    const SIGLAS = ['GOL', 'ZAG', 'LE', 'LD', 'VOL', 'MC', 'MEI', 'PE', 'PD', 'ATA'];

    // QUANTOS DÁ CADA OPÇÃO. O Gustavo: "o olheiro tinha que ter filtro dinâmico,
    // e mostrar o que ele está filtrando". Cada botão passou a dizer quantos garotos
    // aparecem se você clicar nele, e uma linha em cima conta o filtro em português.
    const conta = (mud) => c.scoutJoias({ ...base, ...mud, limite: 1 }).total;
    const pillN = (attr, val, ligado, txt, mud) => {
      const n = conta(mud);
      return `<button class="fpill ${ligado ? 'on' : ''} ${n ? '' : 'vazio'}" data-${attr}="${val}">${txt}<i>${n}</i></button>`;
    };
    const segN = (attr, val, ligado, txt) => `<button class="${ligado ? 'on' : ''}" data-${attr}="${val}">${txt}</button>`;

    const ondeTxt = { liga: 'na sua liga', pais: 'no seu país', mundo: 'no mundo todo' }[escopo];
    const resumo = `Garotos de até <b>${idadeMax} anos</b>, com teto de <b>${tetoMin}</b> para cima,
      ${pos === 'ALL' ? 'de qualquer posição' : `na posição <b>${pos}</b>`}, ${ondeTxt}${soCabe ? ', <b>que cabem no seu caixa</b>' : ''}.`;

    return `<div class="panel"> <div class="mkttop"><h2 style="margin:0">Olheiro</h2> <div class="caixa">Caixa disponível<b>${fmtMoney(u.caixa)}</b></div></div>
      <div class="muted" style="margin-bottom:11px">Garotos cujo teto está bem acima do que já mostram. Comprar cedo é barato — depois que explodem, não é mais.</div>
      <div class="filtros">
        <div class="fgrupo largo"><span class="frot">Posição</span><div class="fpills">
          ${pillN('scpos', 'ALL', pos === 'ALL', 'Todas', { posicao: 'ALL' })}${SIGLAS.map((k) => pillN('scpos', k, pos === k, k, { posicao: k })).join('')}</div></div>
        <div class="fgrupo"><span class="frot">Onde</span><div class="fseg">
          ${segN('scescopo', 'liga', escopo === 'liga', 'Minha liga')}${segN('scescopo', 'pais', escopo === 'pais', 'Meu país')}${segN('scescopo', 'mundo', escopo === 'mundo', 'Mundo')}</div></div>
        <div class="fgrupo"><span class="frot">Idade até</span><select class="fsel" id="scIdade">${
          [17, 19, 21, 23].map((v) => `<option value="${v}" ${idadeMax === v ? 'selected' : ''}>${v} anos</option>`).join('')}</select></div>
        <div class="fgrupo"><span class="frot">Teto mínimo</span><select class="fsel" id="scTeto">${
          [74, 78, 82, 86].map((v) => `<option value="${v}" ${tetoMin === v ? 'selected' : ''}>${v} de overall</option>`).join('')}</select></div>
        <div class="fgrupo"><span class="frot">Preço</span><div class="fseg">
          ${segN('sccabe', '0', !soCabe, 'Todos')}${segN('sccabe', '1', soCabe, 'Que eu posso pagar')}</div></div></div>
      ${(() => {
        // as mesmas pastilhas do mercado: dá para ver e tirar o que está filtrado
        const chips = [];
        if (pos !== 'ALL') chips.push([`posição ${pos}`, 'scpos="ALL"']);
        if (idadeMax !== 21) chips.push([`até ${idadeMax} anos`, 'scidade="21"']);
        if (tetoMin !== 82) chips.push([`teto ${tetoMin}+`, 'scteto="82"']);
        if (soCabe) chips.push(['cabe no caixa', 'sccabe="0"']);
        if (escopo !== 'mundo') chips.push([escopo === 'liga' ? 'minha liga' : 'meu país', 'scescopo="mundo"']);
        if (!chips.length) return '';
        return `<div class="chips"><span class="fl">Filtrando por</span>${
          chips.map(([t, a2]) => `<button class="chip" data-${a2}>${esc(t)} <i>✕</i></button>`).join('')}</div>`;
      })()}
      <div class="scresumo">${resumo}</div>
      <div class="muted" style="margin:8px 0 6px">${joias.total} joia${joias.total === 1 ? '' : 's'} nesse filtro${joias.total > joias.length ? ` — mostrando as ${joias.length} melhores` : ''}</div>
      <div class="jlista">${linhas || '<div class="muted">Ninguém com esses filtros. Baixe o teto mínimo, suba a idade ou procure no mundo todo.</div>'}</div></div>`;
  }

  _renderLigas() {
    const c = this.career;
    const encerrada = !!(c._seasonJustEnded && c.ligasFinais);
    const sel = this._ligaView != null ? this._ligaView : c.userComp;
    const comp = c.compById(sel);
    const minha = sel === c.userComp;

    const porPais = {};
    c.competitions().forEach((cp) => (porPais[cp.country] = porPais[cp.country] || []).push(cp));
    const opts = Object.keys(porPais).sort((x, y) => (PESO[y] || 0) - (PESO[x] || 0) || x.localeCompare(y))
      .map((pais) => `<optgroup label="${bandeira(pais)} ${esc(pais)}">${porPais[pais].slice().sort((a, b) => a.tier - b.tier)
        .map((cp) => `<option value="${cp.id}" ${cp.id === sel ? 'selected' : ''}>${esc(nomeDaLiga(pais, cp.tier, cp.name))}</option>`).join('')}</optgroup>`).join('');

    // com a temporada encerrada, mostra a tabela que ACABOU, não a nova zerada
    const foto = c._seasonJustEnded && c.ligasFinais && c.ligasFinais[comp.id];
    const table = foto || (minha && c.table ? c.standingsSorted() : c._simTable(comp.id));
    const n = table.length;
    const acima = c.competitions().find((x) => x.country === comp.country && x.tier === comp.tier - 1);
    const abaixo = c.competitions().find((x) => x.country === comp.country && x.tier === comp.tier + 1);
    const [sobem, caem] = c.vagasDoPais(comp.country);
    const nSobe = acima ? sobem : 0;
    const nCai = abaixo ? caem : 0;

    const rows = table.map((r, i) => {
      const cl = c.clubById(r.id) || { id: r.id, name: r.nome || '' };
      const zona = i < nSobe ? 'sobe' : i >= n - nCai ? 'cai' : (!acima && i < 4 ? 'copa' : '');
      const sg = (r.gp || 0) - (r.gc || 0);
      return `<tr class="${cl.id === c.userClubId ? 'me' : ''} ${zona}"> <td class="posn">${i + 1}</td> <td><div class="clubcel">${crest(cl, 22)}<span>${esc(cl.name)}</span></div></td> <td>${r.j != null ? r.j : ''}</td><td><b>${r.pts}</b></td> <td>${r.gp != null ? r.gp : ''}</td><td>${r.gc != null ? r.gc : ''}</td> <td>${sg > 0 ? '+' + sg : sg}</td></tr>`;
    }).join('');

    const legenda = [
      nSobe ? `<span class="leg sobe">Acesso à ${esc(nomeDaLiga(comp.country, comp.tier - 1, acima.name))} (${nSobe})</span>` : '',
      !acima ? '<span class="leg copa">Vaga continental</span>' : '',
      nCai ? `<span class="leg cai">Rebaixamento (${nCai})</span>` : '',
    ].filter(Boolean).join('');

    return `<div class="panel"> <div class="ligatop"> <div><h2 style="margin:0">${bandeira(comp.country)} ${esc(nomeDaLiga(comp.country, comp.tier, comp.name))}</h2> <div class="muted">${esc(comp.country)} • ${rotuloDivisao(comp.tier)} • ${n} clubes</div></div> <select id="ligaSel">${opts}</select></div> <div class="legendas">${legenda}</div> <div style="overflow-x:auto"><table class="classif"> <thead><tr><th>#</th><th>Clube</th><th>J</th><th>P</th><th>GP</th><th>GC</th><th>SG</th></tr></thead> <tbody>${rows}</tbody></table></div> <div class="muted" style="margin-top:10px">${encerrada
        ? `Tabela FINAL de ${(c.startYear || 2026) + (c.tabelaFinal ? c.tabelaFinal.season : c.season) - 1}. A temporada nova começa quando você fechar o resumo.`
        : minha ? 'Sua liga — tabela real da temporada.'
        : `Após ${c.round} de ${c.totalRounds()} rodadas. As outras ligas caminham junto com a sua.`}</div></div>`;
  }

  // ---- COPA continental: chaveamento e resultados ----
  /** BASE E OLHEIRO NA MESMA ABA.
   *
   *  O Gustavo: "seria bom se a base e o olheiro fossem num negócio só, e
   *  tivesse como separar dentro desses dois — aí seria menos uma caixinha".
   *  As duas tratam da mesma coisa, garoto que ainda não é do time, e viviam em
   *  abas separadas forçando a ir e voltar.
   */
  _renderGarotos() {
    const qual = this._abaGarotos === 'olheiro' ? 'olheiro' : 'base';
    const aba = (k, txt, dica) => `<button class="gaba ${qual === k ? 'on' : ''}" data-garotos="${k}">
      <b>${txt}</b><i>${dica}</i></button>`;
    // (a aba se chama "Olheiro"; "Garotos" ficou ruim e o Gustavo odiou)
    return `<div class="gabas">
        ${aba('base', 'Base do clube', 'os que já são seus')}
        ${aba('olheiro', 'Olheiro', 'garimpar no mundo')}
      </div>${qual === 'base' ? this._renderBase() : this._renderOlheiro()}`;
  }

  _renderBase() {
    const c = this.career;
    const garotos = c.baseDoClube();
    if (!garotos.length) return '<div class="panel"><h2>Categoria de base</h2><div class="muted">Sem garotos na base agora.</div></div>';
    const u = c.userClub();
    const forcaTime = Math.round(c.strengthOf(u));
    const cheio = c.elencoCheio(u);

    const cartas = garotos.map((p) => {
      const f = c.faixaBase(p);
      // A barra mostra a FAIXA do olheiro sobre o teto, não um número exato.
      // É o ponto da tela: ninguém sabe até onde um moleque de 16 anos vai.
      const esc0 = (v) => Math.max(0, Math.min(100, ((v - 40) / 52) * 100));
      const nac = bandeiraDoJogador(p.pais);
      const perto = p.forca >= forcaTime - 8;
      return `<div class="garoto ${perto ? 'pronto' : ''}">
        <div class="gtopo">
          <span class="vaga">${esc(p.sub || p.posicao)}</span>
          <div class="xinfo"><div class="xitopo">${nac ? `<span class="nac">${nac}</span>` : ''}<b>${esc(p.nome)}</b></div>
            <div class="xisub">${p.idade} anos · ${p.foot === 'L' ? 'canhoto' : 'destro'} · ${p.contrato || 1} ${(p.contrato || 1) === 1 ? 'ano' : 'anos'} de contrato</div></div>
          <span class="xiovr">${p.forca}</span></div>
        <div class="tetobarra" title="o olheiro estima o teto entre ${f.de} e ${f.ate}">
          <i class="hoje" style="left:${esc0(p.forca)}%"></i>
          <i class="faixa" style="left:${esc0(f.de)}%;width:${Math.max(2, esc0(f.ate) - esc0(f.de))}%"></i></div>
        <div class="gparecer">${esc(c.parecerBase(p))}</div>
        <div class="gacoes">
          <button class="btn" data-basesobe="${p.id}" ${cheio && p.idade > 20 ? 'disabled' : ''}>Subir ao profissional</button>
          <button class="btn sec" data-basesai="${p.id}">Dispensar</button></div></div>`;
    }).join('');

    return `<div class="panel">
      <h2>Categoria de base</h2>
      <div class="muted" style="margin-bottom:12px;line-height:1.55">Os garotos da sua casa. O teto de cada um é
        <b>secreto</b> — o que aparece é a leitura do olheiro, e ela erra. Quanto mais tempo o garoto fica e joga,
        mais a faixa aperta. Quem tem até ${20} anos não ocupa vaga no elenco profissional.</div>
      <div class="basegrid">${cartas}</div></div>`;
  }

  /** Qual copa abrir primeiro: a de hoje, senão uma em que você ainda está vivo,
   *  senão a primeira da lista. */
  _copaPadrao(cups) {
    const c = this.career;
    const hoje = c.compromissoDeHoje && c.compromissoDeHoje();
    if (hoje && hoje.tipo === 'copa' && cups[hoje.cup]) return hoje.cup;
    const viva = cups.findIndex((cp) => !cp.winner && cp.alive.includes(c.userClubId));
    return viva >= 0 ? viva : 0;
  }

  /** Como as copas da temporada que acabou terminaram. */
  _copasDaFoto() {
    const c = this.career;
    const ano = (c.startYear || 2026) + (c.tabelaFinal ? c.tabelaFinal.season : c.season) - 1;
    const cards = c.copasFinais.map((cp) => {
      const campeao = cp.campeaoId != null ? c.clubById(cp.campeaoId) : null;
      const adv = cp.ultima && cp.ultima.advId != null ? c.clubById(cp.ultima.advId) : null;
      const minha = cp.fases > 0;
      return `<div class="panel cupcard">
        <div class="cuphead">${compTrophy(cp.name, 40)}
          <div class="cupid"><h2>${esc(cp.name)}</h2><span class="muted">${esc(cp.tag || '')}</span></div>
          <span class="cupsit ${cp.euGanhei ? 'campeao' : minha ? 'fora' : 'espera'}">${
            cp.euGanhei ? 'Você foi campeão' : minha ? `Você jogou ${cp.fases} fase${cp.fases > 1 ? 's' : ''}` : 'Seu clube não disputou'}</span></div>
        ${campeao ? `<div class="cupcampeao">${crest(campeao, 30)}<div><span class="muted">Campeão</span><b>${esc(campeao.name)}</b></div></div>` : ''}
        ${cp.ultima && !cp.euGanhei ? `<div class="fimlinha muted">Sua campanha terminou ${esc((cp.ultima.fase || '').toLowerCase())}:
          ${cp.ultima.gp}x${cp.ultima.gc} ${cp.ultima.passei ? 'contra' : 'para'} ${esc(adv ? adv.name : '')}</div>` : ''}
      </div>`;
    }).join('');
    return `<div class="panel"><h2>Copas de ${ano}</h2>
      <div class="muted">Como terminou cada competição da temporada que você acabou de jogar.
        As copas novas aparecem quando você começar a próxima.</div></div>${cards}`;
  }

  _renderCopa() {
    const c = this.career;
    // Com o resumo de fim de temporada na tela, as copas que interessam são as que
    // ACABARAM — as novas só começam quando ele apertar "começar a próxima".
    if (c._seasonJustEnded && c.copasFinais && c.copasFinais.length) return this._copasDaFoto();
    const cups = c.cupsList();
    if (!cups.length) return '<div class="panel">Sem copa em disputa.</div>';

    const time = (id, cls = '') => {
      const cl = c.clubById(id);
      if (!cl) return '<span class="ct">—</span>';
      return `<span class="ct ${id === c.userClubId ? 'eu' : ''} ${cls}">${crest(cl, 18)}<b>${esc(cl.name)}</b></span>`;
    };

    // UMA COPA POR VEZ. Antes as sete competições vinham empilhadas na mesma
    // página: o Gustavo abria a aba Copa e caía numa parede de texto de
    // Libertadores + Copa do Brasil + Paulista, tudo junto.
    if (this._copaSel == null || !cups[this._copaSel]) this._copaSel = this._copaPadrao(cups);
    const abas = `<div class="copabas">${cups.map((cp, i) => {
      const meu = cp.alive.includes(c.userClubId);
      const fim = !!cp.winner;
      return `<button class="copaba ${i === this._copaSel ? 'on' : ''} ${fim ? 'fim' : meu ? 'vivo' : ''}" data-copa="${i}">
        ${compTrophy(cp.name, 20)}<span>${esc(cp.name)}</span></button>`;
    }).join('')}</div>`;

    return abas + [cups[this._copaSel]].map((cup) => {
      const campeao = cup.winner ? c.clubById(cup.winner) : null;
      const entra = cup.entraDoUsuario || 0;
      const vivo = cup.alive.includes(c.userClubId);
      const jaEntrei = cup.stage >= entra;
      const faseAtual = cup.stages[cup.stage] || 'Final';
      const rodada = cup.sched && cup.sched[cup.stage];

      // ONDE VOCÊ ESTÁ. É a primeira coisa que interessa numa tela de copa, e a
      // versão antiga não dizia: só listava os clubes soltos em pastilhas.
      // "Você está na quartas" estava errado — a preposição muda com a fase.
      const naFase = (nome) => {
        const n = (nome || '').toLowerCase();
        if (/^(quartas|oitavas|eliminat)/.test(n)) return `nas ${n}`;
        if (/^(playoff|grupo)/.test(n)) return `no ${n}`;
        return `na ${n}`;
      };
      // Você só pode ser eliminado de uma copa em que ENTROU. O Dortmund aparecia
      // como "eliminado" da Liga Europa e da Conference sem nunca ter se
      // classificado para elas — ele está é na Champions.
      const inscrito = cup.entradas
        ? cup.entradas.some((e) => e.includes(c.userClubId))
        : cup.alive.includes(c.userClubId) || cup.results.length > 0;
      let situacao;
      if (campeao && cup.winner === c.userClubId) situacao = { cls: 'campeao', txt: 'Você é o campeão' };
      else if (!inscrito) situacao = { cls: 'espera', txt: 'Seu clube não disputa' };
      else if (campeao) situacao = { cls: 'fora', txt: `Campeão: ${campeao.name}` };
      else if (vivo) situacao = { cls: 'dentro', txt: `Você está ${naFase(faseAtual)}` };
      else if (!jaEntrei) situacao = { cls: 'espera', txt: `Você entra ${naFase(cup.stages[entra])}` };
      else situacao = { cls: 'fora', txt: 'Eliminado' };

      // Se a fase de grupos já virou, cup.alive é exatamente quem passou.
      const faseJaVirou = cup.stage > (cup.iGrupos || 0);
      const classificados = faseJaVirou ? new Set(cup.alive) : null;

      // Fase de grupos: tabela de cada grupo, com o seu grupo primeiro.
      const grupoDoUsuario = (g) => g.some((r) => r.id === c.userClubId);
      // `de` é a posição real da primeira linha: sem ela a janela "onde você está"
      // numerava 1 a 5 e o Ajax aparecia em 3º numa tabela de 36 em que ele era 13º.
      // QUEM PASSOU, de verdade. Antes o verde vinha da posição ("os 2 primeiros"),
      // mas há competição que leva os melhores terceiros: o Palmeiras classificou
      // em 3º e ficava sem o verde. Quando a fase já acabou, quem manda é a lista
      // de quem seguiu vivo; só enquanto a fase corre é que a posição decide.
      const passaram = classificados;
      const tabelinha = (linhas, titulo, passam, de = 1) => `
        <div class="gcard ${linhas.some((r) => r.id === c.userClubId) ? 'meu' : ''}">
          <div class="gtit">${esc(titulo)}</div>
          <table class="gtab">
            <thead><tr><th></th><th>Clube</th><th>P</th><th>J</th><th>SG</th></tr></thead>
            <tbody>${linhas.map((r, i) => `
            <tr class="${r.id === c.userClubId ? 'me' : ''} ${
              passaram ? (passaram.has(r.id) ? 'passa' : '') : (de + i <= passam ? 'passa' : '')}">
              <td class="gp">${de + i}</td><td>${time(r.id)}</td>
              <td><b>${r.pts}</b></td><td class="gj">${r.j}</td>
              <td class="gsg">${r.gp - r.gc > 0 ? '+' : ''}${r.gp - r.gc}</td></tr>`).join('')}
          </tbody></table></div>`;

      let corpo = '';
      const resGrupos = cup.results.find((r) => r.fase);
      if (resGrupos && resGrupos.grupos) {
        const gs = resGrupos.grupos.slice().sort((a, b) => (grupoDoUsuario(b) ? 1 : 0) - (grupoDoUsuario(a) ? 1 : 0));
        const passam = (cup.formatoFaseFeita && cup.formatoFaseFeita.avancam_por_grupo) || 2;
        corpo += `<div class="grupos">${gs.map((g, i) =>
          tabelinha(g, `Grupo ${String.fromCharCode(65 + resGrupos.grupos.indexOf(g))}`, passam)).join('')}</div>`;
      } else if (resGrupos && resGrupos.tabela) {
        // Fase de liga (Champions): tabela única, mostrando o topo e a sua volta.
        const t = resGrupos.tabela;
        const meu = t.findIndex((r) => r.id === c.userClubId);
        const ini = Math.max(0, meu - 2);
        const janela = meu > 10 ? t.slice(ini, meu + 3) : [];
        const passam = cup.passaramDaFase || cup.alive.length;   // quantos passaram DAQUELA fase
        corpo += `<div class="ligafase">
          ${tabelinha(t.slice(0, 10), `Fase de liga — os ${passam} primeiros passam`, passam)}
          ${janela.length ? tabelinha(janela, `Onde você está — ${meu + 1}º de ${t.length}`, passam, ini + 1) : ''}</div>`;
      }
      if (resGrupos && resGrupos.meusJogos && resGrupos.meusJogos.length) {
        corpo += `<div class="meusjogos"><div class="mjtit">Seus jogos na fase</div>${
          resGrupos.meusJogos.map((j) => `<div class="mj ${j.meus > j.deles ? 'v' : j.meus < j.deles ? 'd' : 'e'}">
            <span class="mjonde">${j.casa ? 'CASA' : 'FORA'}</span>${time(j.adv)}
            <b>${j.meus} <em>x</em> ${j.deles}</b></div>`).join('')}</div>`;
      }

      // MATA-MATA: uma fase por vez, escolhida num botão. A Libertadores inteira
      // de uma vez eram 60 confrontos numa rolagem só.
      const blocos = cup.results.filter((r) => r.pairs && r.pairs.length);
      // As fases preliminares são de clubes que você nem vai enfrentar — o Gustavo:
      // "essas fases preliminares da Libertadores podiam nem aparecer". Ficam
      // guardadas atrás de um botão.
      const ehPrelim = (r) => { const i = cup.stages.indexOf(r.stage); return i >= 0 && i < entra; };
      const escondidas = blocos.filter(ehPrelim).length;
      const visiveis = blocos.map((r, i) => ({ r, i }))
        .filter(({ r }) => this._verPrelim || !ehPrelim(r));
      let chave = '';
      if (visiveis.length) {
        const chaveSel = this._faseSel || (this._faseSel = {});
        let atual = chaveSel[this._copaSel];
        if (atual == null || !visiveis.some(({ i }) => i === atual)) atual = visiveis[visiveis.length - 1].i;
        const r = blocos[atual];
        chave = `<div class="fasesbar">
          ${visiveis.map(({ r: b2, i }) => `<button class="fasebt ${i === atual ? 'on' : ''}" data-fase="${i}">${esc(b2.stage)}</button>`).join('')}
          ${escondidas ? `<button class="fasebt prelim" data-prelim="1">${this._verPrelim ? 'esconder' : 'ver'} ${escondidas === 1 ? 'a fase que passou antes de você entrar' : `as ${escondidas} fases antes de você entrar`}</button>` : ''}</div>
          <div class="fbloco"><div class="ftit">${esc(r.stage)}</div>
          ${r.pairs.map((p) => `<div class="conf ${p.a === c.userClubId || p.b === c.userClubId ? 'meu' : ''}">
            ${time(p.a, p.win === p.a ? 'passou' : 'caiu')}
            <span class="pl">${p.ga}${p.pen === 'a' ? '<i>p</i>' : ''} <em>x</em> ${p.gb}${p.pen === 'b' ? '<i>p</i>' : ''}</span>
            ${time(p.b, p.win === p.b ? 'passou' : 'caiu')}</div>`).join('')}
        </div>`;
      }

      const proxima = campeao ? '' : `<div class="proxfase">
        <span class="fase">${esc(faseAtual)}</span>
        <span class="muted">${rodada ? `rodada ${rodada}` : 'a disputar'} • ${cup.alive.length} clube${cup.alive.length === 1 ? '' : 's'} na disputa</span></div>`;

      const explica = cup.detalhe
        ? `<details class="comofunciona"><summary>como funciona</summary><p>${esc(cup.detalhe)}</p>
             ${cup.totalClubes ? `<p class="muted">${cup.totalClubes} clubes disputam esta edição, em ${cup.stages.length} fases.</p>` : ''}</details>`
        : '';

      return `<div class="panel cupcard">
        <div class="cuphead">${compTrophy(cup.name, 44)}
          <div class="cupid"><h2>${esc(cup.name)}</h2><span class="muted">${esc(cup.tag || '')}</span></div>
          <span class="cupsit ${situacao.cls}">${esc(situacao.txt)}</span></div>
        ${campeao ? `<div class="cupcampeao">${crest(campeao, 34)}<div><span class="muted">Campeão</span><b>${esc(campeao.name)}</b></div></div>` : proxima}
        ${corpo}${chave}
        ${!corpo && !chave && !campeao ? '<div class="muted" style="margin-top:10px">Os confrontos aparecem conforme as fases acontecem.</div>' : ''}
        ${explica}</div>`;
    }).join('');
  }

  // ---------------------------------------------------------- partida ao vivo
  //
  // Aqui você TREINA durante o jogo: no intervalo e nos momentos quentes a partida
  // para e pergunta o que fazer, e a escolha muda as chances do que vem depois.
  async _partidaAoVivo() {
    const c = this.career;
    // DIA DE COPA É JOGO DE COPA. Antes, clicar em "dirigir a partida" num dia de
    // Paulista jogava a RODADA DO BRASILEIRÃO: o Gustavo viu Bahia e Cruzeiro já
    // jogados enquanto a agenda ainda estava na semifinal do estadual.
    const naCopa = c.adversarioNaCopaHoje && c.adversarioNaCopaHoje();
    const est = c.iniciarPartidaAoVivo(naCopa || null);
    if (!est) { c.state = STATE.DASHBOARD; return this.render(); }

    const ov = document.createElement('div');
    ov.className = 'aovivo';
    ov.innerHTML = `
      <div class="avtop"> <div class="avtime">${crest(est.u, 52)}<span>${esc(est.u.name)}</span></div> <div class="avplacar"><b id="avP">0 — 0</b><span id="avRel">0'</span></div> <div class="avtime dir"><span>${esc(est.opp.name)}</span>${crest(est.opp, 52)}</div></div>
      <div class="avonde">${est.casa ? 'Em casa' : 'Fora de casa'}${est.u.estadio ? ` · ${esc(est.casa ? est.u.estadio : (est.opp.estadio || ''))}` : ''}</div> ${est.classico ? `<div class="avclassico"> ${esc(est.classico.nome)}</div>` : ''}
      <div class="avbarra"><i id="avBar"></i></div> <div class="avstats" id="avStats"></div> <div class="avfeed" id="avFeed"></div> <div class="avpostura" id="avPostura">
        <i>Postura</i>
        <button data-post="cima">Ir para cima</button>
        <button data-post="equilibrio" class="on">Equilibrado</button>
        <button data-post="segurar">Segurar</button></div>
      <div class="avbotoes"> <button class="btn sec" id="avSub">Substituir <b id="avSubN">5</b></button> <button class="btn sec" id="avVel">Velocidade 1x</button> <button class="btn sec" id="avPular">Pular para o fim</button></div>`;
    document.body.appendChild(ov);

    const $ = (id) => ov.querySelector('#' + id);
    const feed = [];
    let velocidade = 1, pulou = false;
    $('avVel').onclick = () => {
      velocidade = velocidade === 1 ? 2 : velocidade === 2 ? 4 : 1;
      $('avVel').textContent = `Velocidade ${velocidade}x`;
    };
    $('avPular').onclick = () => { pulou = true; };

    // --- POSTURA: a decisão que o motor já sabia ler e ninguém podia tomar ---
    // O jogo tinha `atq` e `def` dentro da conta das chances, da posse e do
    // contra-ataque, travados em 1. Dirigir era assistir. Agora dá para ir para
    // cima quando está perdendo e fechar quando está ganhando — com preço: subir
    // o time cansa o elenco e abre as suas costas.
    ov.querySelectorAll('[data-post]').forEach((n) => n.onclick = () => {
      const ev = c.mudarPostura(est, n.dataset.post);
      ov.querySelectorAll('[data-post]').forEach((x) => x.classList.toggle('on', x === n));
      if (ev) { feed.unshift(`<div class="avdec"><b>${est.minuto}'</b> ${esc(ev.texto)}</div>`); pintar([]); }
    });

    // --- substituições no meio do jogo ---
    let pausado = false;
    $('avSub').onclick = async () => {
      if (est.subsRestantes <= 0 || pausado) return;
      pausado = true;
      // Enquanto ele quiser trocar (e ainda houver substituição), o painel volta:
      // dá para fazer as duas de uma vez sem o jogo voltar a correr no meio.
      let outra = true;
      while (outra && est.subsRestantes > 0) {
        outra = false;
        const troca = await this._painelSubstituicao(est);
        if (!troca) break;
        const r = c.substituir(est, troca.sai, troca.entra);
        if (r.ok) { feed.unshift(`<div class="avdec"><b>${est.minuto}'</b> ${esc(r.ev.texto)}</div>`);
          $('avSubN').textContent = est.subsRestantes; pintar([]); outra = !!troca.outra; }
        else aviso(r.msg);
      }
      pausado = false;
    };

    const pintar = (novos) => {
      $('avP').textContent = `${est.ug} — ${est.og}`;
      $('avRel').textContent = `${est.minuto}'`;
      $('avBar').style.width = `${(est.minuto / 90) * 100}%`;
      const s2 = est.stats;
      $('avStats').innerHTML = [
        ['Posse', `${est.posse}%`, `${100 - est.posse}%`],
        ['Finalizações', s2.chutesU, s2.chutesO],
        ['Escanteios', s2.escanteiosU, s2.escanteiosO],
      ].map(([lbl, a, b]) => `<div class="avst"><b>${a}</b><span>${lbl}</span><b>${b}</b></div>`).join('');
      novos.forEach((e) => {
        if (e.side === 'user') feed.unshift(`<div class="golinha meu"><span class="golmin">${e.minute}'</span>${crest(est.u, 16)}<b>${esc(e.scorer)}</b>${e.assist ? ` <span class="muted">(${esc(e.assist)})</span>` : ''}</div>`);
        else if (e.side === 'opp') feed.unshift(`<div class="golinha dele"><span class="golmin">${e.minute}'</span>${crest(est.opp, 16)}<b>${esc(e.scorer)}</b></div>`);
        else if (e.side === 'vermelho' || e.side === 'lesao') feed.unshift(`<div class="avgrave"><b>${e.minute}'</b> ${esc(e.texto)}</div>`);
      });
      $('avFeed').innerHTML = feed.slice(0, 12).join('');
    };
    pintar([]);

    while (est.minuto < 90) {
      if (!pulou) {
        const d = c.decisaoDaPartida(est);
        if (d) {
          const i = await this._popupJogo(d, est);
          const op = c.aplicarDecisaoDaPartida(est, d, i);
          // a decisão do vestiário é a mesma coisa que a postura: os botões da
          // beira do campo têm que mostrar o que você acabou de escolher
          ov.querySelectorAll('[data-post]').forEach((x) =>
            x.classList.toggle('on', x.dataset.post === est.postura));
          feed.unshift(`<div class="avdec"><b>${est.minuto}'</b> ${esc(op.txt)}</div>`);
        }
      }
      if (pausado) { await espera2(120); continue; }   // o relógio para enquanto você substitui
      const novos = c.avancarPartida(est, pulou ? 90 : 1);
      pintar(novos);
      if (!pulou) await espera2(Math.max(30, 260 / velocidade));
    }

    // fim de jogo
    const res = est.ug > est.og ? 'VITÓRIA' : est.ug < est.og ? 'DERROTA' : 'EMPATE';
    const cor = est.ug > est.og ? 'ok' : est.ug < est.og ? 'bad' : '';
    ov.querySelector('.avbotoes').innerHTML =
      `<div class="avfim"><b class="${cor}">FIM DE JOGO — ${res}</b> <div class="avfimplacar">${esc(est.u.name)} ${est.ug} x ${est.og} ${esc(est.opp.name)}</div> <button class="btn big" id="avOk">Continuar</button></div>`;
    await new Promise((r) => { ov.querySelector('#avOk').onclick = r; });

    ov.remove();
    const fim = c.finalizarPartidaAoVivo(est);
    c.state = STATE.DASHBOARD;
    this.render();
    if (est.copa && fim && fim.diaDeCopa) this._popupResultado(fim);
  }

  /** Escolhe quem sai e quem entra, sem sair da partida. */
  _painelSubstituicao(est) {
    const c = this.career;
    const { emCampo, banco } = c.opcoesDeSubstituicao(est);
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.className = 'cov';
      const linha = (p, tipo) => `<button class="subjog" data-${tipo}="${p.id}"><span class="pos ${p.posicao}">${esc(p.sub || p.posicao)}</span> <span class="subnome">${esc(p.nome)}<i>${p.idade} anos${p.energia != null ? ' · energia ' + Math.round(p.energia) + '%' : ''}</i></span> <b>${p.forca}</b></button>`;
      const ped = est.sugestao;
      const recado = ped ? `<div class="pedidobanco"><b>O banco pede</b><span>${esc(ped.motivo)}</span></div>` : '';
      ov.innerHTML = `<div class="ccard subcard"> <div class="muted" style="letter-spacing:.3em;text-transform:uppercase;font-size:11px">${est.minuto}' — substituição (${est.subsRestantes} restantes)</div> ${recado} <div class="subcols"> <div><h3>Sai</h3><div class="sublista" id="subSai">${emCampo.map((p) => linha(p, 'sai')).join('')}</div></div> <div><h3>Entra</h3><div class="sublista" id="subEntra">${banco.map((p) => linha(p, 'entra')).join('')}</div></div></div> <div class="subrod"><span class="muted" id="subMsg">Escolha quem sai e quem entra.</span> <button class="btn sec" id="subCancelar">Cancelar</button> ${est.subsRestantes > 1 ? '<button class="btn sec" id="subMais" disabled>Confirmar e fazer outra</button>' : ''} <button class="btn" id="subOk" disabled>Confirmar</button></div></div>`;
      document.body.appendChild(ov);
      let sai = null, entra = null;
      const marcar = (attr, val) => {
        ov.querySelectorAll(`[data-${attr}]`).forEach((b) => b.classList.toggle('on', +b.dataset[attr] === val));
        ov.querySelector('#subOk').disabled = !(sai && entra);
        // O Gustavo: "as vezes eu quero trocar dois de uma vez e o jogo me faz
        // abrir o painel de novo, com o relogio parado no meio".
        const mais = ov.querySelector('#subMais');
        if (mais) mais.disabled = !(sai && entra);
        if (sai && entra) {
          const a = emCampo.find((p) => p.id === sai), b = banco.find((p) => p.id === entra);
          // Nada de "+3 de overall" nem de chance de vitória. O Gustavo: "a pessoa
          // tem que imaginar, será que se eu fizer isso vai ajudar o time?". Então
          // a tela diz o que um auxiliar diria, e o julgamento é dele.
          const vaga = (() => { const i = (c.lineupIds || []).indexOf(sai);
            const sl = slotsDaFormacao(c.formation); return i >= 0 && sl[i] ? sl[i].sub : (a.sub || a.posicao); })();
          const perda = penalidadeDePosicao(vaga, b.sub || b.posicao);
          const dif = b.forca - a.forca;
          const leitura = perda >= 9 ? `${b.nome} não joga de ${vaga} — vai ficar perdido ali`
            : perda > 0 ? `${b.nome} é ${b.sub || b.posicao}, entra improvisado na ${vaga}`
            : dif >= 4 ? `${b.nome} entra mais forte na posição`
            : dif <= -4 ? `perde qualidade, mas ${b.nome} entra inteiro`
            : `troca de igual para igual, com pernas novas`;
          ov.querySelector('#subMsg').innerHTML = `Sai ${esc(a.nome)}, entra ${esc(b.nome)} — <b>${esc(leitura)}</b>`;
        }
      };
      ov.querySelectorAll('[data-sai]').forEach((b) => (b.onclick = () => { sai = +b.dataset.sai; marcar('sai', sai); }));
      ov.querySelectorAll('[data-entra]').forEach((b) => (b.onclick = () => { entra = +b.dataset.entra; marcar('entra', entra); }));
      // A troca que o banco pediu já vem marcada: aceitar é um clique, e mudar
      // de ideia também.
      if (ped && emCampo.some((p) => p.id === ped.saiId) && banco.some((p) => p.id === ped.entraId)) {
        sai = ped.saiId; entra = ped.entraId; marcar('sai', sai); marcar('entra', entra);
      }
      ov.querySelector('#subCancelar').onclick = () => { ov.remove(); resolve(null); };
      ov.querySelector('#subOk').onclick = () => { ov.remove(); resolve({ sai, entra }); };
      const mais = ov.querySelector('#subMais');
      if (mais) mais.onclick = () => { ov.remove(); resolve({ sai, entra, outra: true }); };
    });
  }

  _popupJogo(d, est) {
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.className = 'cov';
      ov.innerHTML = `<div class="ccard" style="border-color:var(--line-hot)"> <div class="muted" style="letter-spacing:.3em;text-transform:uppercase;font-size:11px">${est.minuto}' — ${esc(d.titulo)}</div> <div style="font-family:var(--font-head);font-size:30px;font-weight:800;margin:10px 0"> ${esc(est.u.name)} ${est.ug} — ${est.og} ${esc(est.opp.name)}</div> <p class="muted" style="margin-bottom:16px">${esc(d.txt)}</p> <div style="display:flex;flex-direction:column;gap:9px"> ${d.ops.map((o, i) => `<button class="btn sec opdec" data-op="${i}"><b>${esc(o.txt)}</b>${o.sub ? `<i>${esc(o.sub)}</i>` : ''}</button>`).join('')}
</div></div>`;
      document.body.appendChild(ov);
      ov.querySelectorAll('[data-op]').forEach((b) => (b.onclick = () => { ov.remove(); resolve(+b.dataset.op); }));
    });
  }

  _watchSim(sim, oppClub) {
    const c = this.career; const u = c.userClub(), o = oppClub || c.opponentClub();
    const tacA = c.tacticOf(u), tacB = c.tacticOf(o);
    const colA = hx(u.primary), colB = hx(o.primary);
    const CW = Math.min(620, (window.innerWidth || 640) - 30), CH = Math.round(CW * 0.62);
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:60;background:rgba(5,9,18,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;font-family:Segoe UI,sans-serif;padding:12px;overflow:auto;';
    ov.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;font-size:22px;font-weight:900"> <span style="display:flex;align-items:center;gap:6px"><span style="width:16px;height:16px;border-radius:4px;background:${colA}"></span>${u.name}</span> <span id="simScore" style="font-size:30px">0 x 0</span> <span style="display:flex;align-items:center;gap:6px">${o.name}<span style="width:16px;height:16px;border-radius:4px;background:${colB}"></span></span></div> <div style="display:flex;gap:16px;font-size:12px;color:#9fb2cf"><span>${tacA.name}</span><span id="simClock" style="color:#fff;font-weight:700">0'</span><span>${tacB.name}</span></div> <canvas id="simCv" width="${CW}" height="${CH}" style="border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.5)"></canvas> <div id="simFeed" style="min-height:44px;width:${CW}px;background:#0f1728;border:1px solid #22314c;border-radius:10px;padding:8px;font-size:13px;overflow:auto;max-height:96px"></div> <div style="display:flex;gap:8px"> <button id="simSpeed" style="background:#1f6fe0;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:800;cursor:pointer">Velocidade 1x</button> <button id="simSkip" style="background:#334155;color:#e2e8f0;border:none;border-radius:8px;padding:8px 16px;font-weight:800;cursor:pointer">Pular para o fim</button></div>`;
    document.body.appendChild(ov);
    const $ = (id) => ov.querySelector('#' + id);
    const cv = $('simCv'), g = cv.getContext('2d');
    const M = 16, PX = M, PY = M, PW = CW - 2 * M, PH = CH - 2 * M;

    // monta as bases de formação de um time (mirror=true => ataca para a esquerda)
    const buildTeam = (tac, mirror) => {
      const line = (tac.line - 0.5) * 0.13;                 // linha alta empurra p/ frente
      const spread = 0.42 * (0.62 + tac.width * 0.55);      // uso da largura
      const rows = [[0.05, [0.5]], [0.20 + line, [0.5 - spread, 0.5 - spread * 0.34, 0.5 + spread * 0.34, 0.5 + spread]],
        [0.37 + line, [0.5 - spread, 0.5 - spread * 0.34, 0.5 + spread * 0.34, 0.5 + spread]], [0.47 + line, [0.5 - spread * 0.5, 0.5 + spread * 0.5]]];
      const pl = [];
      rows.forEach(([fx, ys], ri) => ys.forEach((fy) => {
        const ax = mirror ? 1 - fx : fx;
        pl.push({ bx: PX + ax * PW, by: PY + fy * PH, x: PX + ax * PW, y: PY + fy * PH, gk: ri === 0, mirror });
      }));
      return pl;
    };
    const A = buildTeam(tacA, false), B = buildTeam(tacB, true);
    const goalAx = PX + PW, goalBx = PX;   // A ataca a direita, B a esquerda
    const ball = { x: PX + PW / 2, y: PY + PH / 2 };
    let possTeam = 'A';
    let channelY = PY + PH / 2;            // "corredor" por onde a jogada sobe (muda aos poucos)
    const midX = PX + PW / 2;

    let ug = 0, og = 0, min = 0, evi = 0, speed = 1; const feed = [];
    const nearest = (arr) => { let b = arr[0], bd = 1e9; for (const p of arr) { if (p.gk) continue; const d = (p.x - ball.x) ** 2 + (p.y - ball.y) ** 2; if (d < bd) { bd = d; b = p; } } return b; };
    const moveTo = (p, tx, ty, sp) => { const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1, s = Math.min(sp, d); p.x += dx / d * s; p.y += dy / d * s; };

    const drawFrame = () => {
      g.fillStyle = '#1b7a34'; g.fillRect(0, 0, CW, CH);
      // faixas do gramado
      g.fillStyle = 'rgba(255,255,255,0.04)'; for (let i = 0; i < 8; i++) if (i % 2) g.fillRect(PX + i * PW / 8, PY, PW / 8, PH);
      g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 2;
      g.strokeRect(PX, PY, PW, PH);
      g.beginPath(); g.moveTo(PX + PW / 2, PY); g.lineTo(PX + PW / 2, PY + PH); g.stroke();
      g.beginPath(); g.arc(PX + PW / 2, PY + PH / 2, PH * 0.13, 0, 7); g.stroke();
      const boxH = PH * 0.5, boxW = PW * 0.12;
      g.strokeRect(PX, PY + (PH - boxH) / 2, boxW, boxH); g.strokeRect(PX + PW - boxW, PY + (PH - boxH) / 2, boxW, boxH);
      // gols
      g.fillStyle = '#fff'; g.fillRect(PX - 4, PY + PH / 2 - PH * 0.1, 4, PH * 0.2); g.fillRect(PX + PW, PY + PH / 2 - PH * 0.1, 4, PH * 0.2);
      const carrier = possTeam === 'A' ? nearest(A) : nearest(B);
      const drawPl = (arr, col, isCarrierTeam) => arr.forEach((p) => {
        g.beginPath(); g.arc(p.x, p.y, p.gk ? 6 : 7, 0, 7);
        g.fillStyle = p.gk ? '#f5c518' : col; g.fill();
        g.lineWidth = 1.5; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.stroke();
        if (p === carrier) { g.beginPath(); g.arc(p.x, p.y, 11, 0, 7); g.strokeStyle = '#5effa0'; g.lineWidth = 2; g.stroke(); }
      });
      drawPl(A, colA); drawPl(B, colB);
      g.beginPath(); g.arc(ball.x, ball.y, 4.5, 0, 7); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#111'; g.lineWidth = 1; g.stroke();
    };

    const flip = () => { possTeam = possTeam === 'A' ? 'B' : 'A'; channelY = PY + PH * (0.25 + Math.random() * 0.5); };
    const step = () => {
      const attTac = possTeam === 'A' ? tacA : tacB, defTac = possTeam === 'A' ? tacB : tacA;
      const att = possTeam === 'A' ? A : B, def = possTeam === 'A' ? B : A;
      const goalX = possTeam === 'A' ? goalAx : goalBx, dir = possTeam === 'A' ? 1 : -1;
      const carrier = nearest(att);
      // corredor da jogada varia devagar
      channelY += (Math.sin(min * 0.6) * PH * 0.18) * 0.02;
      // a bola SOBE em direção ao gol adversário, num ritmo humano
      const bsp = 1.0 + attTac.tempo * 0.9;
      ball.x += dir * bsp;
      ball.y += (channelY - ball.y) * 0.05 + (Math.random() - 0.5) * 1.2;
      ball.x = Math.max(PX + 3, Math.min(PX + PW - 3, ball.x));
      ball.y = Math.max(PY + 6, Math.min(PY + PH - 6, ball.y));
      // portador acompanha a bola (fica logo atrás dela)
      moveTo(carrier, ball.x - dir * 5, ball.y, bsp + 0.5);
      // companheiros do ataque sobem para a zona deles (empurrados p/ frente pela intenção ofensiva) — sem grudar na bola
      att.forEach((p) => {
        if (p === carrier || p.gk) return;
        const zx = p.bx + dir * (10 + attTac.off * 16);
        moveTo(p, Math.max(PX + 8, Math.min(PX + PW - 8, zx)), p.by + (ball.y - p.by) * 0.10, 0.8 + attTac.tempo * 0.5);
      });
      // defesa: só 1-2 marcadores pressionam a bola; o resto segura a linha na própria zona
      const ranked = def.filter((p) => !p.gk).slice().sort((a, b) => ((a.x - ball.x) ** 2 + (a.y - ball.y) ** 2) - ((b.x - ball.x) ** 2 + (b.y - ball.y) ** 2));
      const pressers = 1 + (defTac.press > 0.72 ? 1 : 0);
      def.forEach((p) => {
        if (p.gk) return; const idx = ranked.indexOf(p);
        if (idx < pressers) moveTo(p, ball.x + dir * 3, ball.y, 1.1 + defTac.press * 0.8);
        else moveTo(p, p.bx + (ball.x - p.bx) * 0.14, p.by + (ball.y - p.by) * 0.06, 0.8);
      });
      // goleiros acompanham a altura da bola
      [A, B].forEach((arr) => { const gk = arr.find((p) => p.gk); if (gk) moveTo(gk, gk.bx, Math.max(PY + PH / 2 - PH * 0.12, Math.min(PY + PH / 2 + PH * 0.12, ball.y)), 1.1); });
      // desarme OCASIONAL (não a cada quadro) — quanto maior a pressão, mais provável
      const st = ranked[0];
      if (st && Math.hypot(st.x - ball.x, st.y - ball.y) < 12 && Math.random() < 0.025 + defTac.press * 0.03) flip();
      // chegou perto do gol adversário: goleiro afasta e a posse vira
      if (Math.abs(ball.x - goalX) < PW * 0.05) { ball.x = midX; ball.y = PY + PH / 2; flip(); }
    };

    const draw = () => { $('simScore').textContent = ug + ' x ' + og; $('simClock').textContent = Math.floor(min) + "'"; $('simFeed').innerHTML = feed.map((t) => `<div>${t}</div>`).join(''); $('simFeed').scrollTop = 9e9; };
    const finish = () => { clearInterval(timer); ov.remove(); c.state = STATE.DASHBOARD; this.render(); };
    let acc = 0;
    const timer = setInterval(() => {
      for (let s = 0; s < speed; s++) {
        step();
        acc += 0.30;
        if (acc >= 1) { min = Math.min(90, min + acc); acc = 0; }
        while (evi < sim.events.length && sim.events[evi].minute <= min) {
          const e = sim.events[evi++]; if (e.side === 'user') ug++; else og++;
          const time = e.side === 'user' ? u.name : o.name;
          feed.push(`${e.minute}'  <i class="ico-bola"></i> <b>${e.scorer}</b> (${time})${e.assist ? ` — assist: ${e.assist}` : ''}  <span style="color:#9fb2cf">${ug} x ${og}</span>`);
          // reinício após o gol: quem sofreu recomeça do meio
          ball.x = PX + PW / 2; ball.y = PY + PH / 2; possTeam = e.side === 'user' ? 'B' : 'A'; channelY = PY + PH / 2;
        }
      }
      drawFrame(); draw();
      if (min >= 90) {
        clearInterval(timer);
        const cor = ug > og ? '#22c55e' : ug < og ? '#ef4444' : '#f5c518';
        const rot = ug > og ? 'VITÓRIA' : ug < og ? 'DERROTA' : 'EMPATE';
        const banner = document.createElement('div');
        banner.style.cssText = 'text-align:center;margin-top:4px';
        banner.innerHTML = `<div style="font-size:15px;font-weight:900;color:${cor}">FIM DE JOGO — ${rot}</div> <div style="font-size:26px;font-weight:900">${u.name} ${ug} x ${og} ${o.name}</div> <button id="simClose" style="margin-top:8px;background:#22c55e;color:#06210f;border:none;border-radius:8px;padding:8px 20px;font-weight:800;cursor:pointer">Continuar</button>`;
        ov.appendChild(banner);
        // Nada de fechar sozinho depois de 4s: o jogo espera você clicar. Era isso
        // que cortava a comemoração no meio.
        ov.querySelector('#simClose').onclick = finish;
      }
    }, 55);
    $('simSpeed').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 3 : 1; $('simSpeed').textContent = 'Velocidade ' + speed + 'x'; };
    $('simSkip').onclick = finish; drawFrame(); draw();
  }
}
