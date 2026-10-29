// playerCareerUI.js — as telas da Carreira de Jogador.
// O motor (playerCareer.js) decide tudo; aqui só desenhamos e recolhemos escolhas.
// Estilo The Fenômeno: pouca lista, muito pop-up — cada momento importante da
// temporada aparece na cara do jogador, com troféu quando é para comemorar.

import { PlayerCareer, POSICOES, CAMISAS, FOCOS, INTENSIDADES, PERKS, BENS, NIVEL_MAX, NIVEIS_ESPECIALIDADE, precoDoNivel, siglaPosicao, tierDe } from './playerCareer.js';
import { TOKENS, BACKDROP, PARTS, CRIAR_JOGADOR_CSS, JOGADOR_VISUAL } from '../theme.js';
import { acentoDoClube } from './corDoClube.js';
import { crest } from './crest.js';
import { compTrophy, trophy } from './trophy.js';
import { disputaDePenaltis, CSS_PENALTIS } from './penaltis.js';

export const SAVE_JOGADOR = 'futebolfc_save_jogador';
export const temSaveDeJogador = () => {
  try { return !!localStorage.getItem(SAVE_JOGADOR); } catch (e) { return false; }
};

const rnd = (n) => Math.floor(Math.random() * n);
const rnd90 = () => rnd(90);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const money = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// As classes daqui levam prefixo j/ jcard porque o menu da Partida Rápida já define
// um .card com display:flex — sem o prefixo, ele vencia e o pop-up saía em linha.
const CSS = `${TOKENS}
  #jogRoot{position:fixed;inset:0;z-index:45;color:var(--ink);font-family:var(--font);overflow:auto;${BACKDROP}}
  #jogRoot.hidden{display:none}
  .jwrap{max-width:960px;margin:0 auto;padding:18px 18px 40px}
${PARTS}
${CRIAR_JOGADOR_CSS}
  .jtop{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
    margin:-18px -18px 14px;padding:13px 18px;position:sticky;top:0;z-index:5;backdrop-filter:blur(10px);
    background:linear-gradient(180deg,rgba(15,16,19,.96),rgba(15,16,19,.72));border-bottom:1px solid var(--line-hot)}
  /* O nome vinha espremido a 64px e ficava so o primeiro pedaco: 'Ze' no lugar de
     'Ze Neto da Silva'. */
  /* O nome era TEXTO SOLTO dentro de um flex com overflow:hidden — virava um item
     anonimo que ninguem controlava, e aparecia so 'Ze' no lugar de 'Ze Neto da
     Silva'. Agora ele tem elemento proprio e uma coluna para chamar de sua. */
  .jnome{font-family:var(--font-head);font-weight:800;font-size:21px;letter-spacing:.04em;
    display:flex;align-items:center;gap:10px;flex:1 1 auto;min-width:0}
  .jnomecol{display:flex;flex-direction:column;min-width:0;line-height:1.15}
  .jnometxt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .jnomecol .muted{font-size:11.5px;letter-spacing:.06em}
  .ovrbig{font-family:var(--font-head);font-size:34px;font-weight:800;line-height:1;
    background:linear-gradient(180deg,#fff,#9b9ea6);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .bar{height:9px;border-radius:5px;background:rgba(255,255,255,.09);overflow:hidden;margin-top:4px}
  .bar i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,#6b6e76,#e6e8ec)}
  .attrs{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:11px}
  .attr b{font-family:var(--font-head);letter-spacing:.05em;font-size:11.5px;text-transform:uppercase;color:var(--ink-dim)}
  .attr span{float:right;font-weight:800}
  .opts{display:flex;gap:7px;flex-wrap:wrap}
  .opt{font-family:var(--font-head);text-transform:uppercase;letter-spacing:.06em;font-size:12.5px;font-weight:800;
    background:linear-gradient(180deg,#2a2d33,#1c1e23);color:#b6b9c0;border:1px solid #34373e;border-radius:9px;
    padding:8px 13px;cursor:pointer}
  .opt.on{background:linear-gradient(180deg,#ffffff,#d7d9df 60%,#b4b7bf);color:#101114;border-color:#d7d9df;
    box-shadow:0 0 18px -6px rgba(255,255,255,.35)}
  .big{font-size:16px;padding:14px 26px}
  .jov{position:fixed;inset:0;z-index:80;background:rgba(8,9,11,.90);display:flex;align-items:center;
    justify-content:center;padding:18px;backdrop-filter:blur(4px)}
  .jcard{background:var(--panel-solid);border:1px solid var(--line-hot);border-radius:18px;padding:24px;
    max-width:560px;width:100%;max-height:88vh;overflow:auto;box-shadow:0 30px 80px -30px #000;text-align:center}
  .jcard h3{font-family:var(--font-head);text-transform:uppercase;letter-spacing:.08em;font-size:19px;margin-bottom:6px}
  .kv{display:flex;justify-content:space-between;gap:10px;padding:7px 2px;border-bottom:1px solid rgba(255,255,255,.08);font-size:14px}
  .kv b{font-family:var(--font-head);letter-spacing:.03em}
  .ok{color:var(--acc)} .bad{color:var(--red)}
  input,select{background:#16181c;border:1px solid #34373e;color:var(--ink);border-radius:9px;padding:10px 12px;
    font-size:15px;font-family:var(--font);width:100%}
  label{display:block;text-align:left;font-family:var(--font-head);text-transform:uppercase;letter-spacing:.07em;
    font-size:11.5px;color:var(--ink-dim);margin:12px 0 5px}
  .prop{display:flex;align-items:center;gap:11px;text-align:left;padding:11px;border-radius:11px;cursor:pointer;
    background:linear-gradient(180deg,rgba(255,255,255,.05),transparent);border:1px solid var(--line);margin-bottom:8px}
  .prop:hover{border-color:var(--acc);transform:translateY(-1px)}
  .grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:9px}
${JOGADOR_VISUAL}`;

export class PlayerCareerUI {
  /**
   * @param {object} dataset dataset hidratado
   * @param {object} opts    { onVirarTreinador(anos), onSair() }
   */
  constructor(dataset, opts = {}) {
    this.dataset = dataset;
    this.opts = opts;
    this.pc = null;
    const el = document.createElement('div');
    el.id = 'jogRoot';
    el.innerHTML = `<style>${CSS}${CSS_PENALTIS}</style><div class="jwrap" id="jbody"></div>`;
    document.body.appendChild(el);
    this.el = el;
    this.body = el.querySelector('#jbody');
    this._telaCriar();
  }

  show() { this.el.classList.remove('hidden'); }
  hide() { this.el.classList.add('hidden'); }

  // ---------------------------------------------------------- salvar
  salvar(silencioso) {
    if (!this.pc || this.pc.aposentado) return false;
    try {
      localStorage.setItem(SAVE_JOGADOR, this.pc.toSnapshot());
      if (!silencioso) this._popup('<h3>Carreira salva</h3>'
        + '<p class="muted">Você pode continuar depois pelo botão Continuar da tela inicial.</p>', [{ txt: 'Ok' }]);
      return true;
    } catch (e) {
      if (!silencioso) this._popup(`<h3>Não consegui salvar</h3><p class="muted">${esc(e.message)}</p>`, [{ txt: 'Ok' }]);
      return false;
    }
  }

  static apagarSave() { try { localStorage.removeItem(SAVE_JOGADOR); } catch (e) { /* ignora */ } }

  // retoma uma carreira salva (o mundo é reenvelhecido dentro do fromSnapshot)
  retomar(raw) {
    this.pc = PlayerCareer.fromSnapshot(this.dataset, raw);
    this._telaTemporada();
    return this.pc;
  }

  // ---------------------------------------------------------- pop-up genérico
  _popup(html, acoes) {
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.className = 'jov';
      ov.innerHTML = `<div class="jcard">${html}<div class="opts" style="justify-content:center;margin-top:18px"> ${acoes.map((a, i) => `<button class="btn ${a.sec ? 'sec' : ''} ${acoes.length <= 2 ? 'big' : ''}" data-i="${i}">${a.txt}</button>`).join('')}
</div></div>`;
      document.body.appendChild(ov);
      ov.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => {
        ov.remove();
        resolve(+b.dataset.i);
      }));
    });
  }

  // ---------------------------------------------------------- criar jogador
  _telaCriar() {
    const paises = [...new Set(this.dataset.clubs.map((c) => c.country))].sort();
    this.body.innerHTML = `<div class="panel" style="max-width:520px;margin:8vh auto"> <h2>Nova Carreira de Jogador</h2> <div class="muted" style="margin-bottom:14px">Você tem 16 anos e um contrato de base. O resto é com você.</div> <label>Nome</label><input id="fNome" maxlength="26" placeholder="Seu nome"> <label>Escolha sua posição</label> <div class="posgrid" id="fPosGrid">${POSICOES.map((p, i) => `<button class="poscard ${i === 8 ? 'on' : ''}" data-pos="${p.key}"><b>${p.key}</b><span>${esc(p.desc)}</span></button>`).join('')}</div> <label>Número da camisa</label> <div class="muted" style="font-size:11.5px;margin:-4px 0 6px">Os números disponíveis para você agora.</div> <div class="camisas" id="fCamisas">${CAMISAS.map((n, i) => `<button class="camisa ${i === 0 ? 'on' : ''}" data-num="${n}">${n}</button>`).join('')}</div> <label>Pé preferido</label> <select id="fPe"><option value="R">Destro</option><option value="L">Canhoto</option></select> <label>Nacionalidade</label> <select id="fPais">${paises.map((p) => `<option ${p === 'Brasil' ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select> <div class="opts" style="margin-top:20px;justify-content:center"> <button class="btn big" id="fOk">Começar carreira</button> <button class="btn sec" id="fVoltar">Voltar</button></div></div>`;

    let posEscolhida = 'ATA', camisaEscolhida = CAMISAS[0];
    this.body.querySelectorAll('[data-pos]').forEach((n) => (n.onclick = () => {
      posEscolhida = n.dataset.pos;
      this.body.querySelectorAll('[data-pos]').forEach((x) => x.classList.toggle('on', x === n));
    }));
    this.body.querySelectorAll('[data-num]').forEach((n) => (n.onclick = () => {
      camisaEscolhida = +n.dataset.num;
      this.body.querySelectorAll('[data-num]').forEach((x) => x.classList.toggle('on', x === n));
    }));

    this.body.querySelector('#fOk').onclick = () => {
      const nome = this.body.querySelector('#fNome').value.trim() || 'Craque Anônimo';
      this.pc = new PlayerCareer(this.dataset, {
        nome, camisa: camisaEscolhida,
        posicao: posEscolhida,
        pe: this.body.querySelector('#fPe').value,
        nacionalidade: this.body.querySelector('#fPais').value,
      });
      this._telaEscolherClube();
    };
    this.body.querySelector('#fVoltar').onclick = () => { this.hide(); if (this.opts.onSair) this.opts.onSair(); };
  }

  // ---------------------------------------------------------- escolher o clube
  _telaEscolherClube() {
    const pc = this.pc;
    const ops = pc.opcoesDeClubeInicial();
    if (!ops.length) { pc._escolherClubeInicial(); return this._boasVindas(); }

    this.body.innerHTML = `<div class="panel" style="max-width:640px;margin:6vh auto"> <h2>Onde você quer começar?</h2> <div class="muted" style="margin-bottom:14px">Clube grande dá vitrine, mas o banco é duro.
        Clube pequeno te põe em campo desde já. A escolha muda a sua carreira.</div> ${ops.map((o, i) => `<div class="prop" data-clube="${i}"> ${crest(this.dataset.clubs.find((c) => c.id === o.clubeId), 34)}
        <div style="flex:1"><b>${esc(o.nome)}</b> <div class="muted">${esc(o.liga)} • força do elenco ${o.forca}</div> <div class="muted">${esc(o.dificuldade)} • ${money(o.salario)}/mês</div></div></div>`).join('')}
</div>`;

    this.body.querySelectorAll('[data-clube]').forEach((n) => (n.onclick = () => {
      const o = ops[+n.dataset.clube];
      pc.escolherClubeInicial(o.clubeId, o.salario);
      this._boasVindas();
    }));
  }

  async _boasVindas() {
    const pc = this.pc;
    const c = pc.clube();
    // O primeiro contrato é o momento da carreira. Era um pop-up genérico com
    // pares de chave e valor e uma plantinha em cima — o Gustavo: "odiei essa
    // segunda tela, está horrível, por que tem uma planta do nada?". Agora é um
    // cartão de contrato, nas cores do clube, com a camisa e a assinatura.
    const hx2 = (n) => '#' + ((n >>> 0) & 0xffffff).toString(16).padStart(6, '0');
    await this._popup(
      `<div class="contrato" style="--c1:${hx2(c.primary)};--c2:${hx2(c.secondary)}">
        <div class="contratotopo">
          <div class="contratoclube">${crest(c, 46)}
            <div><span>Contrato profissional</span><b>${esc(c.name)}</b></div></div>
          <div class="contratonum"><i>${pc.camisa}</i></div>
        </div>
        <div class="contratonome">${esc(pc.nome)}</div>
        <div class="contratopos">${esc(pc.sub || pc.posicao)} · ${pc.idade} anos · ${pc.pe === 'L' ? 'canhoto' : 'destro'}</div>
        <div class="contratolinhas">
          <div><span>Competição</span><b>${esc(pc.compDoClube().name)}</b></div>
          <div><span>Overall</span><b>${pc.ovr}</b></div>
          <div><span>Salário</span><b>${money(pc.salario)}/mês</b></div>
          <div><span>Luvas na assinatura</span><b>${money(pc.dinheiro)}</b></div>
        </div>
        <div class="contratorodape">O seu teto é secreto. Só o treino e os jogos vão dizer até onde você chega.</div>
      </div>`,
      [{ txt: 'Assinar' }]);
    this._telaTemporada();
  }

  // ---------------------------------------------------------- tela principal
  /** Põe a cor do clube atual do jogador na tela inteira: você troca de time e
   *  a tela troca de cor. Em clube preto-e-branco a cor vem do escudo. */
  _pintarClube(clube) {
    try {
      if (!clube || !clube.name) return;
      const svg = String(crest(clube, 240));
      const pintar = (ui) => {
        this.body.style.setProperty('--clube1', ui);
        this.body.style.setProperty('--clubetxt', '#fff');
      };
      pintar(acentoDoClube(clube, svg, (cor) => pintar(cor)));
      const m = svg.match(/src="([^"]+)"/);
      if (m) this.body.style.setProperty('--marca', `url("${m[1]}")`);
    } catch (e) { /* sem clube: fica a cor padrão */ }
  }

  _telaTemporada() {
    const pc = this.pc;
    const c = pc.clube();
    const comp = pc.compDoClube();
    const a = pc.attrs;
    const linha = (nome, k) => `<div class="attr"><b>${nome}<span>${a[k]}</span></b><div class="bar"><i style="width:${a[k]}%"></i></div></div>`;
    const papelTxt = { estrela: 'Estrela do time', titular: 'Titular', rotacao: 'Rotação', reserva: 'Reserva' }[pc.papel()];

    // A TELA VESTE O CLUBE ONDE VOCÊ JOGA, igual à carreira de treinador. No modo
    // jogador isso conta uma história: você troca de time e a tela troca de cor.
    this._pintarClube(c);

    this.body.innerHTML = `
      <div class="jheroi"><div class="jhcorpo">${crest(c, 60)}
        <div class="jhquem"><b>${esc(pc.nome)}</b>
          <span>${pc.sigla} · ${pc.idade} anos · ${esc(c.name)} · ${pc.ano}</span></div>
        <div class="jhovr"><i>Overall</i><b>${pc.ovr}</b></div></div></div> ${(() => {
      // ANTES: nove informações soltas em fila, do papel ao saldo do banco, todas
      // com o mesmo peso. O Gustavo: "muita informação ali em cima... parece um
      // negócio corrido, nada interativo, nada fácil de visualizar".
      // Agora são duas coisas separadas: ONDE você está (os números do contrato) e
      // COMO você está (os medidores que mudam de jogo para jogo).
      const rel = pc.descreverRelacao();
      const medidor = (rot, v, cor) => `<div class="medlinha">
        <i>${rot}</i>
        <span class="medbar"><em style="width:${Math.max(3, Math.min(100, v))}%;background:${cor}"></em></span>
        <b>${Math.round(v)}</b></div>`;
      const cor = (v) => v >= 70 ? '#36e27f' : v >= 45 ? '#ffc53d' : '#ff5e6b';
      const ficha = (rot, val, cls = '') => `<div class="jficha ${cls}"><i>${rot}</i><b>${val}</b></div>`;
      const acabando = pc.contrato <= 0;
      return `<div class="panel"><h2>No ${esc(c.name)} · ${esc(comp.name)}</h2>
        <div class="jfichas">
          ${ficha('Papel', papelTxt, 'largo')}
          ${ficha('Contrato', acabando ? 'acabando' : `${pc.contrato} ano${pc.contrato > 1 ? 's' : ''}`, acabando ? 'alerta' : '')}
          ${ficha('Salário', money(pc.salario) + '/mês')}
          ${ficha('Valor de mercado', money(pc.valorMercado()))}
          ${ficha('Seu banco', money(pc.dinheiro))}
        </div></div>
      <div class="panel"><h2>Como você está</h2>
        ${medidor('Moral', pc.moral, cor(pc.moral))}
        ${medidor('Forma', pc.forma, cor(pc.forma))}
        ${medidor('Reputação', pc.reputacao, cor(pc.reputacao))}
        <div class="jtecnico ${rel.cor}"><i>O técnico</i><b>${esc(rel.txt)}</b></div>
      </div>`;
    })()} <div class="panel"><h2>Atributos</h2><div class="attrs"> ${(() => {
      // Goleiro nao tem 'finalizacao' nem 'drible': os mesmos numeros valem, mas o
      // nome deles na tela e outro. Mostrar 'DRIBLE 49' na ficha de um goleiro
      // parecia erro de dado.
      const g = pc.posicao === 'G';
      return linha(g ? 'Reflexo' : 'Ritmo', 'ritmo')
        + linha(g ? 'Defesa de pênalti' : 'Finalização', 'finalizacao')
        + linha(g ? 'Reposição' : 'Passe', 'passe');
    })()}
        ${(() => { const g = pc.posicao === 'G';
      return linha(g ? 'Saída do gol' : 'Drible', 'drible')
        + linha(g ? 'Posicionamento' : 'Defesa', 'defesa')
        + linha(g ? 'Domínio da área' : 'Físico', 'fisico'); })()}
</div></div> <div class="panel"><h2>Objetivo da temporada</h2> <div style="font-size:17px;font-weight:700">${esc(pc.objetivo.txt)}</div> <div class="muted" style="margin-top:6px">Cumprir dá moral, reputação e propostas melhores.</div></div> <div class="panel"><h2>Treino</h2> <div class="muted" style="margin-bottom:6px">Foco</div> <div class="opts" id="focos">${FOCOS.map((f) => {
        // O foco do treino tambem tinha nome de jogador de linha para o goleiro:
        // 'finalizacao' e 'criacao' num goleiro nao dizem nada. Sao os mesmos
        // atributos, com o nome que fazem no gol.
        const nomeGol = { fin: 'Reflexo e pênaltis', cri: 'Reposição', vel: 'Saída do gol',
          def: 'Posicionamento', com: 'Completo' }[f.key];
        const nome = pc.posicao === 'G' && nomeGol ? nomeGol : f.nome;
        return `<button class="opt ${pc.treino.foco === f.key ? 'on' : ''}" data-foco="${f.key}">${nome}</button>`;
      }).join('')}</div> <div class="muted" style="margin:12px 0 6px">Intensidade</div> <div class="opts" id="intens">${INTENSIDADES.map((i) => `<button class="opt ${pc.treino.intensidade === i.key ? 'on' : ''}" data-int="${i.key}">${i.nome}</button>`).join('')}</div> <div class="muted" style="margin-top:10px">Pesada evolui mais rápido, mas desgasta a moral e aumenta o risco de lesão.</div>
       <div class="muted" style="margin:16px 0 6px">Trabalho extra do ano <i style="opacity:.7">— uma por vez, e leva temporadas</i></div>
       <div class="espgrid" id="especs">${pc.especialidadesDisponiveis().map((e) => {
         const n = pc.nivelEspecialidade(e.key);
         const cheio = n >= NIVEIS_ESPECIALIDADE;
         return `<button class="espcard ${pc.especialidadeAtual === e.key ? 'on' : ''} ${cheio ? 'pronto' : ''}"
           data-esp="${e.key}" ${cheio ? 'disabled' : ''}>
           <b>${esc(e.nome)}</b><i>${esc(e.desc)}</i>
           <span class="espniv">${Array.from({ length: NIVEIS_ESPECIALIDADE }, (_, k) =>
             `<em class="${k < n ? 'on' : ''}"></em>`).join('')}${cheio ? ' dominado' : ''}</span></button>`;
       }).join('')}</div></div> <div class="panel jacoes">
      <!-- ANTES tudo numa fila só: jogar, loja, carreira, salvar, menu e "pedir para
           sair" lado a lado, do mesmo tamanho. O Gustavo: "pedir para sair está
           depois do menu, aí o menu e o salvar deviam ficar em outro lugar, para
           não confundir". Agora são três faixas: o que te faz avançar na
           temporada, o que você visita, e o que é decisão séria. -->
      <div class="jlinha principal">
        <button class="btn big" id="bJogar">Jogar a temporada</button>
        <button class="btn sec big" id="bTempo">Acompanhar em tempo real</button>
      </div>
      <div class="jlinha">
        <button class="btn sec" id="bLoja">Loja &amp; Patrocínios</button>
        <button class="btn sec" id="bHist">Minha carreira</button>
        <button class="btn sec" id="bSalvar">Salvar</button>
        <button class="btn sec" id="bHome">Menu</button>
      </div>
      <div class="jlinha perigo">
        <button class="btn sec" id="bSair">Pedir para sair do clube</button>
      </div></div>`;

    this.body.querySelectorAll('[data-foco]').forEach((b) => (b.onclick = () => {
      pc.definirTreino(b.dataset.foco, pc.treino.intensidade); this._telaTemporada();
    }));
    this.body.querySelectorAll('[data-int]').forEach((b) => (b.onclick = () => {
      pc.definirTreino(pc.treino.foco, b.dataset.int); this._telaTemporada();
    }));
    // Este bloco estava DENTRO do de cima: o clique no trabalho extra só passava a
    // existir depois de você mexer na intensidade. Clicar nele antes disso não fazia
    // nada, que foi o que o Gustavo viu.
    this.body.querySelectorAll('[data-esp]').forEach((n) => (n.onclick = () => {
      // clicar de novo na mesma tira o trabalho extra do ano
      pc.definirEspecialidade(pc.especialidadeAtual === n.dataset.esp ? null : n.dataset.esp);
      this._telaTemporada();
    }));
    this.body.querySelector('#bJogar').onclick = () => this._rodarTemporada(false);
    this.body.querySelector('#bTempo').onclick = () => this._rodarTemporada(true);
    this.body.querySelector('#bLoja').onclick = () => this._telaLoja();
    this.body.querySelector('#bHist').onclick = () => this._telaHistorico();
    this.body.querySelector('#bSalvar').onclick = () => this.salvar();
    this.body.querySelector('#bSair').onclick = async () => {
      const ok = await this._popup(
        `<div style="font-size:44px"></div><h3>Pedir para sair</h3> <p class="muted">Você abre mão do contrato com o ${esc(pc.clube().name)} e ouve o mercado.
         Custa moral e um pouco de reputação — a diretoria não gosta.</p>`,
        [{ txt: 'Quero sair' }, { txt: 'Deixa quieto', sec: true }]);
      if (ok !== 0) return;
      const props = pc.pedirParaSair();
      if (!props.length) {
        await this._popup('<h3>Ninguém apareceu</h3><p class="muted">Nenhum clube do seu nível abriu porta agora. Tente na próxima temporada.</p>', [{ txt: 'Ok' }]);
        return this._telaTemporada();
      }
      await this._mercado();
      this._telaTemporada();
    };
    this.body.querySelector('#bHome').onclick = () => {
      this.salvar(true);                       // guarda antes de sair, para não perder nada
      this.hide();
      if (this.opts.onSair) this.opts.onSair();
    };
  }

  // ---------------------------------------------------------- a temporada
  async _rodarTemporada(comTempo) {
    // TRAVA DE REENTRADA. Dava para clicar "Jogar a temporada" varias vezes e
    // empilhar temporadas: os pop-ups se sobrepunham, e como cada um escurece o
    // fundo em 90%, seis camadas deixavam a tela inteira preta. Uma temporada de
    // cada vez.
    if (this._rodando) return;
    this._rodando = true;
    try {
      return await this._rodarTemporadaAgora(comTempo);
    } finally {
      this._rodando = false;
    }
  }

  async _rodarTemporadaAgora(comTempo) {
    const pc = this.pc;

    // 0) O QUE DEU NAS SUAS ESCOLHAS. Antes de decidir de novo, o jogo mostra o
    // que voltou das decisões passadas — foi a maior queixa do Gustavo: "eu
    // dispensei e não teve nenhuma consequência".
    const ecos = pc.ecosDaTemporada ? pc.ecosDaTemporada() : [];
    if (ecos.length) {
      await this._popup(
        `<h3>O que deu nas suas escolhas</h3>${ecos.map((e) => `
          <div class="ecocard"><div class="ecotxt">${esc(e.txt)}</div>
            ${e.escolha ? `<div class="ecoorigem">Veio de: “${esc(e.escolha)}”</div>` : ''}</div>`).join('')}`,
        [{ txt: 'Entendi' }]);
    }

    // 1) decisões, uma de cada vez, em pop-up
    while (pc.proximaDecisao()) {
      const d = pc.proximaDecisao();
      const i = await this._popup(
        `<h3>Decisão</h3> <p style="margin:10px 0 4px;font-size:16px;line-height:1.5">${esc(d.txt)}</p>`,
        d.ops.map((o) => ({ txt: esc(o.txt), sec: true })));
      const res = pc.responderDecisao(i);
      // A consequência continua existindo e continua voltando — o que saiu é o AVISO
      // dela. O Gustavo: "para de mostrar esse negócio que vai ter consequência".
      // Ele tem razão: dizer de antemão que algo vai voltar tira a surpresa de quando
      // volta, e era mais um popup entre você e o jogo.
    }

    // 2) simula
    const r = pc.simularTemporada();

    // 2.5) acompanhar a temporada rodada a rodada, com o tempo correndo
    if (comTempo) await this._temporadaAoVivo(r);

    // 3) relatório
    await this._popup(
      `<div class="anotopo">
         ${crest(pc.clube() || {}, 54)}
         <div class="anoquem">
           <b>${r.ano}</b>
           <span>${esc(r.clube)} · ${esc(r.comp)} · ${r.posicaoLiga}º lugar · ${esc(r.papel)}</span>
         </div>
         <div class="anoovr"><i>Overall</i><b>${r.ovr}</b>${
           r.ganhouOvr > 0 ? `<em class="sobe">+${r.ganhouOvr}</em>`
           : r.ganhouOvr < 0 ? `<em class="cai">${r.ganhouOvr}</em>` : ''}</div>
       </div>

       <div class="anonums">
         <div class="anonum"><b>${r.jogos + (r.selecao.jogos || 0)}</b><i>Jogos</i>${
           r.selecao.jogos ? `<s>${r.jogos} clube · ${r.selecao.jogos} seleção</s>` : ''}</div>
         <div class="anonum"><b>${r.gols + (r.selecao.gols || 0)}</b><i>Gols</i>${
           r.selecao.gols ? `<s>${r.gols} clube · ${r.selecao.gols} seleção</s>` : ''}</div>
         <div class="anonum"><b>${r.assist}</b><i>Assistências</i></div>
         <div class="anonum nota ${r.nota >= 7 ? 'boa' : r.nota >= 6 ? 'media' : 'ruim'}"><b>${r.nota}</b><i>Nota média</i></div>
       </div>

       <div class="anometa ${r.cumpriu ? 'ok' : 'nao'}">
         <b>${r.cumpriu ? 'Objetivo cumprido' : 'Objetivo não cumprido'}</b>
         <span>${esc(r.objetivo.txt)}</span>
       </div>

       ${(r.campanha && r.campanha.length) || r.porCompeticao ? `<div class="resumoano">
         <div class="ratit">Como acabou a temporada</div>
         <div class="ralinha"><span>${esc(r.comp)}</span><b>${r.posicaoLiga}º lugar</b></div>
         ${(r.campanha || []).map((x) => `<div class="ralinha ${x.campeao ? 'venceu' : ''}"><span>${esc(x.copa)}</span><b>${esc(x.fase)}</b></div>`).join('')}
       </div>` : ''}

       ${r.manchete ? `<div class="imprensa"> <span>${esc(r.manchete)}</span></div>` : ''}
       ${r.rival ? this._cardRival(r.rival) : ''}`,
      [{ txt: 'Continuar' }]);

    // 3.15) O trabalho extra do ano: saiu ou nao saiu.
    if (pc.evolucaoEspecialidade) {
      const e = pc.evolucaoEspecialidade;
      await this._popup(
        `<h3>${e.evoluiu ? 'Trabalho extra' : 'Ainda não'}</h3>
         <p style="margin:10px 0;font-size:15px;line-height:1.55">${esc(e.txt)}</p>`,
        [{ txt: 'Continuar' }]);
      pc.evolucaoEspecialidade = null;
    }

    // 3.2) A DIRETORIA. Quando o ano não fecha, eles chamam para conversar — e
    // agora dá para responder, que era o que faltava.
    const conv = pc.conversaComADiretoria ? pc.conversaComADiretoria(r) : null;
    if (conv) {
      const i = await this._popup(
        `<h3>Conversa com a diretoria</h3><p style="margin:10px 0 4px;font-size:15.5px;line-height:1.55">${esc(conv.txt)}</p>`,
        conv.ops.map((o) => ({ txt: esc(o.txt), sec: true })));
      pc.decisoesPendentes.unshift(conv);
      const res = pc.responderDecisao(i);
      if (res && res.eco) {
        await this._popup(
          `<h3>Ficou marcado</h3><p style="margin:10px 0;font-size:15px;line-height:1.55">
            O que você disse à diretoria vai ter efeito ${res.eco.em === 1 ? 'na próxima temporada' : `daqui a ${res.eco.em} temporadas`}.</p>`,
          [{ txt: 'Ok' }]);
      }
    }

    // 3.25) A CAMPANHA da seleção, fase a fase. Antes o jogo só avisava quando você
    // chegava à final: se caísse antes, o torneio simplesmente não era mencionado e
    // você nunca sabia onde tinha parado nem contra quem.
    const camp = r.selecao && r.selecao.campanha;
    if (camp && !camp.campeao) {
      const linhas = camp.fases.map((f) => {
        const cor = f.passou ? '#22c55e' : '#ef4444';
        const oque = f.nome === 'Fase de grupos'
          ? (f.passou ? 'passou' : 'caiu na primeira fase')
          : (f.passou ? `passou por ${esc(f.rival || '')}` : `perdeu para ${esc(f.rival || '')}`);
        return `<div style="display:flex;justify-content:space-between;gap:12px;padding:4px 0;border-bottom:1px solid #ffffff14">
          <b>${esc(f.nome)}</b><span style="color:${cor}">${oque}</span></div>`;
      }).join('');
      const parou = camp.fases[camp.fases.length - 1];
      await this._popup(
        `<h3>${esc(camp.torneio)}</h3>
         <p class="muted" style="margin-bottom:10px">${camp.entram} seleções na disputa. Você foi convocado.</p>
         ${linhas}
         <p style="margin-top:10px;font-weight:800">${parou && parou.nome === 'Fase de grupos' && !parou.passou
           ? 'Eliminado ainda na fase de grupos.'
           : `Sua campanha parou ${/^(quartas|oitavas|fase de 32)/i.test(parou.nome) ? 'n' + (/^fase/i.test(parou.nome) ? 'a ' : 'as ') : 'na '}${esc(parou.nome.toLowerCase())}.`}</p>`,
        [{ txt: 'Fazer o que' }]);
    }

    // 3.3) final de seleção: Copa do Mundo, Copa América ou Eurocopa
    const fs = r.selecao && r.selecao.final;
    if (fs) {
      const pen = fs.penA ? ` (${fs.penA}x${fs.penB} nos pênaltis)` : '';
      await this._popup(
        fs.venceu
          ? `<div style="display:flex;justify-content:center;margin-bottom:8px">${compTrophy(fs.torneio, 92)}</div> <h3>Campeão do mundo${fs.torneio.includes('Mundo') ? '' : ''}!</h3> <p style="font-size:19px;font-weight:800">${esc(pc.nacionalidade)} ${fs.placar[0]} x ${fs.placar[1]} ${esc(fs.rival)}${pen}</p> <p class="muted" style="margin-top:6px">Final da ${esc(fs.torneio)}</p>`
          : `<div style="font-size:52px"></div><h3>Vice na ${esc(fs.torneio)}</h3> <p style="font-size:19px;font-weight:800">${esc(pc.nacionalidade)} ${fs.placar[0]} x ${fs.placar[1]} ${esc(fs.rival)}${pen}</p> <p class="muted" style="margin-top:6px">Chegar à final já coloca seu nome na história.</p>`,
        [{ txt: fs.venceu ? 'É CAMPEÃO!' : 'Cabeça erguida' }]);
    }

    // 3.35) disputa da Bola de Ouro
    if (r.bolaDeOuro) {
      const b = r.bolaDeOuro;
      await this._popup(
        `<div style="font-size:46px"></div><h3>Bola de Ouro ${r.ano}</h3> <div class="podio">${b.podio.map((x, i) => `<div class="pod ${x.euMesmo ? 'eu' : ''} p${i + 1}"> <div class="medalha">${['', '', ''][i]}</div> <div><b>${esc(x.nome)}</b><div class="muted">${esc(x.clube)} • ${x.gols}g ${x.assist}a • OVR ${x.ovr}</div></div></div>`).join('')}</div> <p style="margin-top:12px;font-weight:800" class="${b.venceu ? 'ok' : ''}"> ${b.venceu ? 'A Bola de Ouro é sua.' : `Você terminou em ${b.minhaPos}º na votação.`}</p>`,
        [{ txt: b.venceu ? 'Que ano!' : 'Ano que vem eu volto' }]);
    }

    // 3.4) braçadeira da seleção
    if (r.selecao && r.selecao.virouCapitao) {
      await this._popup(
        `<div style="font-size:52px"></div><h3>Capitão da seleção</h3> <p style="font-size:17px;font-weight:700;margin:8px 0">${esc(pc.nacionalidade)} entrega a braçadeira a você.</p> <p class="muted">É o reconhecimento de que você virou a referência do seu país.</p>`,
        [{ txt: 'É uma honra' }]);
    }

    // 3.5) finais de copa — você decide se assiste ou se pula direto para o placar
    for (const f of (r.finais || [])) await this._assistirFinal(f);

    // 3.6) acesso ou rebaixamento
    if (r.movimento) {
      const subiu = r.movimento.tipo === 'subiu';
      await this._popup(
        `<div style="font-size:52px">${subiu ? '' : ''}</div> <h3>${subiu ? 'Acesso!' : 'Rebaixamento'}</h3> <p style="font-size:17px;font-weight:700;margin:8px 0">${esc(r.clube)} ${subiu ? 'sobe para' : 'cai para'} a ${esc(r.movimento.para)}</p> <p class="muted">${subiu ? 'Divisão nova, adversários mais fortes e mais gente de olho em você.'
           : 'Ano difícil. Dá para reconstruir — ou ouvir outra proposta.'}</p>`,
        [{ txt: subiu ? 'Vamos subir!' : 'Seguir em frente' }]);
    }

    // 4) comemorações — uma por conquista, com o troféu certo
    for (const t of r.titulos) {
      await this._popup(
        `<div style="display:flex;justify-content:center;margin-bottom:8px">${compTrophy(t, 88)}</div> <h3>Campeão!</h3><p style="font-size:18px;font-weight:700">${esc(t)}</p>`,
        [{ txt: 'Comemorar' }]);
    }
    for (const p of r.premios) {
      await this._popup(
        `<div style="font-size:52px"></div><h3>Prêmio individual</h3> <p style="font-size:18px;font-weight:700">${esc(p)}</p>`, [{ txt: 'Que orgulho' }]);
    }
    for (const m of r.marcos) {
      await this._popup(
        `<div style="display:flex;justify-content:center;margin-bottom:8px">${trophy(80)}</div> <h3>Marco na carreira</h3><p style="font-size:18px;font-weight:700">${esc(m)}</p>`, [{ txt: 'Seguir em frente' }]);
    }

    // 5) mercado: renovar ou aceitar proposta
    await this._mercado();

    // 6) vira o ano
    const av = pc.avancarTemporada();
    if (av.chuteira) {
      await this._popup(
        `<div style="font-size:52px"></div><h3>Chuteira de assinatura</h3> <p style="font-size:18px;font-weight:700">${esc(av.chuteira)}</p> <p class="muted" style="margin-top:8px">Três temporadas de fidelidade à marca. +2 no seu atributo principal.</p>`,
        [{ txt: 'Calçar' }]);
    }
    if (av.aposentou) return this._fimDeCarreira();
    this.salvar(true);        // salva sozinho a cada temporada — ninguém perde progresso
    this._telaTemporada();
  }

  // ---------------------------------------------------------- temporada ao vivo
  //
  // O ano inteiro já foi decidido pelo motor. Aqui os gols e as assistências são
  // espalhados pelas rodadas e mostrados um a um, com o relógio correndo — é a mesma
  // ideia da simulação por tempo do modo Treinador, aplicada à sua temporada.
  async _temporadaAoVivo(r) {
    const pc = this.pc;
    const clube = pc.clube();
    const rodadas = Math.max(1, r.jogos);

    // sorteia em que rodada saiu cada gol e cada assistência
    const eventos = [];
    for (let i = 0; i < r.gols; i++) eventos.push({ rodada: 1 + rnd(rodadas), tipo: 'gol' });
    for (let i = 0; i < r.assist; i++) eventos.push({ rodada: 1 + rnd(rodadas), tipo: 'assist' });
    eventos.sort((a, b) => a.rodada - b.rodada);

    const ov = document.createElement('div');
    ov.className = 'jov';
    ov.innerHTML = `<div class="jcard"> <div class="muted" style="letter-spacing:.3em;text-transform:uppercase;font-size:11px">Temporada ${r.ano}</div> <h3>${esc(clube.name)}</h3> <div style="display:flex;justify-content:center;gap:22px;margin:14px 0 10px"> <div><div id="tGols" style="font-family:var(--font-head);font-size:36px;font-weight:800;color:var(--acc)">0</div><div class="muted">gols</div></div> <div><div id="tAss" style="font-family:var(--font-head);font-size:36px;font-weight:800;color:var(--blue)">0</div><div class="muted">assistências</div></div> <div><div id="tJogos" style="font-family:var(--font-head);font-size:36px;font-weight:800">0</div><div class="muted">jogos</div></div></div> <div class="bar" style="height:8px"><i id="tBar" style="width:0%"></i></div> <div id="tRod" class="muted" style="margin-top:6px">Rodada 0 de ${rodadas}</div> <div id="tFeed" style="text-align:left;margin-top:12px;max-height:190px;overflow:auto;
        background:rgba(0,0,0,.25);border-radius:11px;padding:10px;font-size:13.5px;min-height:80px"></div> <div class="opts" style="justify-content:center;margin-top:16px"> <button class="btn sec" id="tSkip">Pular para o resumo</button></div></div>`;
    document.body.appendChild(ov);

    const $ = (id) => ov.querySelector('#' + id);
    let gols = 0, ass = 0, pulou = false;
    $('tSkip').onclick = () => { pulou = true; };
    const feed = [];

    for (let rod = 1; rod <= rodadas && !pulou; rod++) {
      const doDia = eventos.filter((e) => e.rodada === rod);
      doDia.forEach((e) => {
        if (e.tipo === 'gol') { gols++; feed.unshift(`<b>Rodada ${rod}</b> — <i class="ico-bola"></i> <b class="ok">Gol seu!</b>`); }
        else { ass++; feed.unshift(`<b>Rodada ${rod}</b> —  Assistência.`); }
      });
      $('tGols').textContent = gols; $('tAss').textContent = ass; $('tJogos').textContent = rod;
      $('tBar').style.width = (rod / rodadas * 100) + '%';
      $('tRod').textContent = `Rodada ${rod} de ${rodadas}`;
      if (doDia.length) $('tFeed').innerHTML = feed.slice(0, 40).map((t) => `<div style="padding:3px 0">${t}</div>`).join('');
      await espera(doDia.length ? 340 : 70);
    }
    $('tGols').textContent = r.gols; $('tAss').textContent = r.assist; $('tJogos').textContent = r.jogos;
    if (!pulou) await espera(500);
    ov.remove();
  }

  // ---------------------------------------------------------- assistir à final
  //
  // O placar já está decidido pelo motor; o que se constrói aqui é a espera. O
  // relógio corre, os gols vão pintando no minuto em que aconteceram, e só no fim
  // aparece se deu título ou vice.
  async _assistirFinal(final) {
    const pc = this.pc;
    const clube = pc.clube();
    const rival = this.dataset.clubs.find((c) => c.id === final.adversarioId);
    const [gm, gs] = final.placar;

    const cabecalho = `
      <div class="muted" style="letter-spacing:.3em;text-transform:uppercase;font-size:11px">Final</div> <h3>${esc(final.copa)}</h3> <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin:16px 0 6px"> <div style="flex:1;text-align:right">${crest(clube, 40)}<div style="font-weight:800;margin-top:5px">${esc(clube.name)}</div></div> <div id="placar" style="font-family:var(--font-head);font-size:40px;font-weight:800;min-width:110px">0 — 0</div> <div style="flex:1;text-align:left">${rival ? crest(rival, 40) : ''}<div style="font-weight:800;margin-top:5px">${esc(final.adversario)}</div></div></div>`;

    const querAssistir = await this._popup(
      `<div style="font-size:46px"></div>${cabecalho}
       <p class="muted">Você está na final. Quer assistir ao jogo?</p>`,
      [{ txt: 'Assistir à final' }, { txt: 'Pular para o resultado', sec: true }]);

    if (querAssistir === 0) {
      // sorteia em que minuto cada gol saiu, para o placar mexer na hora certa
      const golsCasa = Array.from({ length: gm }, () => 1 + rnd90());
      const golsFora = Array.from({ length: gs }, () => 1 + rnd90());
      const ov = document.createElement('div');
      ov.className = 'jov';
      ov.innerHTML = `<div class="jcard">${cabecalho}
        <div id="relogio" style="font-family:var(--font-head);font-size:22px;font-weight:800;color:var(--acc)">0'</div> <div id="lance" class="muted" style="min-height:22px;margin-top:8px">Bola rolando...</div></div>`;
      document.body.appendChild(ov);

      const elPlacar = ov.querySelector('#placar');
      const elRelogio = ov.querySelector('#relogio');
      const elLance = ov.querySelector('#lance');
      let a = 0, b = 0;
      for (let min = 1; min <= 90; min += 2) {
        const novosA = golsCasa.filter((m) => m === min || m === min + 1).length;
        const novosB = golsFora.filter((m) => m === min || m === min + 1).length;
        if (novosA || novosB) {
          a += novosA; b += novosB;
          elPlacar.textContent = `${a} — ${b}`;
          elLance.innerHTML = novosA
            ? `<b class="ok"><i class="ico-bola"></i> GOL do ${esc(clube.name)}!</b>`
            : `<b class="bad"><i class="ico-bola"></i> Gol do ${esc(final.adversario)}.</b>`;
        }
        elRelogio.textContent = `${Math.min(90, min + 1)}'`;
        await espera(novosA || novosB ? 620 : 55);
      }
      elLance.innerHTML = '<b>Fim de jogo.</b>';
      await espera(700);
      ov.remove();
    }

    let venceu = final.venceu;
    let penaltis = null;
    if (gm === gs) {
      // empatou: a decisão é sua, cobrança a cobrança
      penaltis = await disputaDePenaltis({
        nomeA: clube.name, nomeB: final.adversario,
        escudoA: crest(clube, 26), escudoB: rival ? crest(rival, 26) : '',
        forcaA: Math.round(pc.forcaDoClube()), forcaB: Math.round(rival ? pc.forcaDoClube(rival) : 74),
        subtitulo: `${final.copa} · disputa de pênaltis`, cobrador: pc.nome,
      });
      venceu = penaltis.venceuA;
      final.venceu = venceu;
      if (venceu && !pc.carreira.titulos.includes(final.copa)) pc.carreira.titulos.push(final.copa);
    }
    await this._popup(
      venceu
        ? `<div style="display:flex;justify-content:center;margin-bottom:8px">${compTrophy(final.copa, 92)}</div> <h3>Campeão!</h3> <p style="font-size:19px;font-weight:800">${esc(clube.name)} ${gm} x ${gs} ${esc(final.adversario)}</p> ${penaltis ? `<p class="muted">${penaltis.golsA} x ${penaltis.golsB} nos pênaltis</p>` : ''}
           <p class="muted" style="margin-top:6px">${esc(final.copa)}</p>`
        : `<div style="font-size:52px"></div><h3>Vice-campeão</h3> <p style="font-size:19px;font-weight:800">${esc(clube.name)} ${gm} x ${gs} ${esc(final.adversario)}</p> <p class="muted" style="margin-top:6px">Chegar à final da ${esc(final.copa)} já é história. Ano que vem tem volta.</p>`,
      [{ txt: venceu ? 'Levantar a taça' : 'Cabeça erguida' }]);
  }

  async _mercado() {
    const pc = this.pc;
    const props = pc.propostas || [];

    if (pc.contrato <= 0) {
      const ops = pc.opcoesRenovacao() || [];
      const acoes = ops.map((o) => ({ txt: `${o.anos} anos — ${money(o.salario)}/mês`, sec: true }));
      if (props.length) acoes.push({ txt: 'Ver propostas de outros clubes' });
      const i = await this._popup(
        `<div style="font-size:44px"></div><h3>Seu contrato acabou</h3> <p class="muted">Você é agente livre. Renove com o ${esc(pc.clube().name)} ou ouça o mercado.</p>`, acoes);
      if (i < ops.length) { pc.renovar(ops[i].anos, ops[i].salario); return; }
    } else if (!props.length) return;

    if (!props.length) return;
    const html = `<div style="font-size:44px"></div><h3>Propostas</h3> <p class="muted" style="margin-bottom:12px">Clubes interessados em você.</p> ${props.map((p, i) => {
        const c = this.dataset.clubs.find((x) => x.id === p.clubeId);
        return `<div class="prop" data-p="${i}">${crest(c, 32)}<div style="flex:1"> <b>${esc(p.nome)}</b><div class="muted">${esc(p.liga)} • força ${p.forca} • ${esc(p.papel)}</div> <div class="muted">${money(p.salario)}/mês por ${p.anos} anos</div></div></div>`;
      }).join('')}`;

    const escolha = await new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.className = 'jov';
      ov.innerHTML = `<div class="jcard">${html}
        <div class="opts" style="justify-content:center;margin-top:14px"> <button class="btn sec" data-fica="1">Ficar no ${esc(pc.clube().name)}</button></div></div>`;
      document.body.appendChild(ov);
      ov.querySelectorAll('[data-p]').forEach((n) => (n.onclick = () => { ov.remove(); resolve(+n.dataset.p); }));
      ov.querySelector('[data-fica]').onclick = () => { ov.remove(); resolve(-1); };
    });

    if (escolha >= 0) {
      const p = props[escolha];
      pc.aceitarProposta(p.clubeId);
      await this._popup(
        `<div style="font-size:46px"></div><h3>Contrato assinado</h3> <p style="font-size:18px;font-weight:700">${esc(p.nome)}</p> <div class="kv"><span>Salário</span><b>${money(p.salario)}/mês</b></div> <div class="kv"><span>Duração</span><b>${p.anos} anos</b></div> <div class="kv"><span>Papel prometido</span><b>${esc(p.papel)}</b></div>`, [{ txt: 'Vamos!' }]);
    }
  }

  // ---------------------------------------------------------- loja
  /** VOCÊ CONTRA ELE, linha a linha. O card do rival só dizia o nome e os gols
   *  dele; a graça de ter um rival de geração é saber quem está na frente. */
  _cardRival(rv) {
    const pc = this.pc;
    const meu = pc.carreira;
    const linha = (rot, a, b2) => {
      const cls = a > b2 ? 'eu' : b2 > a ? 'ele' : '';
      return `<div class="rvlinha ${cls}"><b>${a}</b><span>${rot}</span><b>${b2}</b></div>`;
    };
    const dif = (meu.gols || 0) - rv.gols;
    const recado = rv.aposentado ? `${rv.nome.split(' ')[0]} pendurou as chuteiras. A comparação parou aqui.`
      : dif > 0 ? `Você está ${dif} gol${dif > 1 ? 's' : ''} na frente.`
      : dif < 0 ? `Ele está ${-dif} gol${dif < -1 ? 's' : ''} na frente.`
      : 'Empatados em gols — a temporada decide.';
    return `<div class="rival">
      <div class="muted" style="letter-spacing:.2em;text-transform:uppercase;font-size:10.5px">Seu rival de geração</div>
      <div class="rvtopo"><b>${esc(pc.nome)}</b><span>${pc.idade}a · OVR ${pc.ovr}</span>
        <i>vs</i><span>${rv.idade}a · OVR ${rv.ovr}</span><b>${esc(rv.nome)}</b></div>
      <div class="rvonde"><span>${esc((pc.clube() || {}).name || '')}</span>
        <span>${esc([rv.clube, rv.pais].filter(Boolean).join(' · '))}</span></div>
      ${linha('gols', meu.gols || 0, rv.gols)}
      ${linha('assistências', meu.assist || 0, rv.assist)}
      ${linha('jogos', meu.jogos || 0, rv.jogos)}
      ${linha('títulos', (meu.titulos || []).length, rv.titulos)}
      ${linha('prêmios', (meu.premios || []).length, rv.premios)}
      ${(() => {
        const minhas = (meu.premios || []).filter((x) => String(x).includes('Bola de Ouro')).length;
        return (rv.bolasDeOuro || minhas) ? linha('Bola de Ouro', minhas, rv.bolasDeOuro || 0) : '';
      })()}
      <div class="rvrecado">${esc(recado)}</div></div>`;
  }

  _telaLoja() {
    const pc = this.pc;
    // SEM EMOJI (o Gustavo: "não coloca emojis, fica horrível"). O lugar do ícone
    // ficou com a INICIAL do item num quadradinho — mesma função de ancorar o olho,
    // sem o visual de adesivo.
    const ico = (k, nome) => `<span class="lojaini">${esc(String(nome || k).trim()[0] || '•')}</span>`;
    const ofertas = pc.ofertasPatrocinio();
    // melhorias em NÍVEL: mostra as bolinhas do progresso e o preço do próximo degrau
    const melhoria = (it) => {
      const n = pc.nivelDe(it.key);
      const maximo = n >= NIVEL_MAX;
      const custo = maximo ? 0 : precoDoNivel(it, n + 1);
      const pode = !maximo && pc.dinheiro >= custo;
      const pontos = Array.from({ length: NIVEL_MAX }, (_, i) => `<span class="niv ${i < n ? 'on' : ''}"></span>`).join('');
      return `<div class="prop ${pode ? '' : 'off'}" ${pode ? `data-buy="${it.key}"` : ''}> <div class="lojaico">${ico(it.key, it.nome)}</div><div style="flex:1"> <b>${esc(it.nome)}</b> <span class="niveis">${pontos}</span> <div class="muted">${n ? esc(it.desc(n)) : 'Ainda não contratado'}</div> <div class="muted">${maximo ? '★ nível máximo'
          : `Nível ${n + 1}: <b>${money(custo)}</b> — ${esc(it.desc(n + 1))}`}</div></div></div>`;
    };
    // O que o item FAZ agora aparece na loja. Antes só tinha nome e preço, e comprar
    // um iate era igual a comprar um tênis: saía do caixa e entrava no patrimônio.
    const efeitoEmTexto = (ef = {}) => {
      const p = [];
      if (ef.forma) p.push(`${ef.forma > 0 ? '+' : ''}${ef.forma} de forma`);
      if (ef.moral) p.push(`${ef.moral > 0 ? '+' : ''}${ef.moral} de moral`);
      if (ef.rep) p.push(`+${ef.rep} de reputação`);
      if (ef.desempenho) p.push(`+${ef.desempenho} de desempenho`);
      if (ef.rendaAnual) p.push(`${money(ef.rendaAnual)} por ano`);
      return p.join(' · ');
    };
    const bem = (it) => {
      const tem = pc.bens.includes(it.key);
      const pode = !tem && pc.dinheiro >= it.preco;
      return `<div class="prop ${pode ? '' : 'off'} ${tem ? 'meu' : ''}" ${pode ? `data-buy="${it.key}"` : ''}>
        <div class="lojaico">${ico(it.key, it.nome)}</div>
        <div style="flex:1">
          <b>${esc(it.nome)}</b>
          ${it.desc ? `<div class="itemdesc">${esc(it.desc)}</div>` : ''}
          <div class="itemef">${efeitoEmTexto(it.ef)}</div>
          <div class="lojapreco ${tem ? 'meu' : pode ? '' : 'caro'}">${tem ? '✓ já é seu' : money(it.preco)}</div></div></div>`;
    };
    this.body.innerHTML = `
      <div class="jtop"><div class="jnome"> Loja & Patrocínios</div> <div><span class="stat">Banco: <b>${money(pc.dinheiro)}</b></span> <span class="stat">Patrimônio: <b>${money(pc.patrimonio())}</b></span></div></div> <div class="panel"><h2>Patrocínios</h2> ${pc.patrocinioMaterial ? `<span class="stat">Material: <b>${esc(pc.patrocinioMaterial.marca)}</b> — ${money(pc.patrocinioMaterial.valor)}/ano</span>` : ''}
        ${pc.patrocinioImagem ? `<span class="stat">Imagem: <b>${esc(pc.patrocinioImagem.marca)}</b> — ${money(pc.patrocinioImagem.valor)}/ano</span>` : ''}
        ${pc.chuteiraAssinatura ? `<span class="stat"> <b>${esc(pc.chuteiraAssinatura)}</b></span>` : ''}
        ${ofertas.length ? `<div style="margin-top:10px">${ofertas.map((o, i) => `<div class="prop" data-patro="${i}"> <div class="lojaico">${ico(o.tipo, o.tipo === 'material' ? 'Material' : 'Imagem')}</div><div style="flex:1"> <b>${esc(o.marca)}</b><div class="muted">${o.tipo === 'material' ? 'Material esportivo' : 'Imagem'} • ${money(o.valor)}/ano por ${o.anos} anos</div></div></div>`).join('')}</div>`
        : '<div class="muted" style="margin-top:8px">Nenhuma oferta ainda — ganhe reputação jogando bem.</div>'}
</div> <div class="panel"><h2>Estrutura pessoal</h2> <div class="muted" style="margin-bottom:9px">Cada nível custa mais e entrega mais. Até o nível ${NIVEL_MAX}.</div> <div class="grid2">${PERKS.map(melhoria).join('')}</div></div> <div class="panel"><h2>Para a carreira</h2> <div class="muted" style="margin-bottom:9px">Coisas simples que ajudam desde o começo — dá para comprar com o primeiro salário.</div> <div class="grid2">${BENS.filter((b) => b.tipo === 'util').map(bem).join('')}</div></div> <div class="panel"><h2>Patrimônio</h2> <div class="muted" style="margin-bottom:9px">O que o dinheiro grande compra. Alguns rendem todo ano.</div> <div class="grid2">${BENS.filter((b) => b.tipo !== 'util').map(bem).join('')}</div></div> <div class="panel" style="text-align:center"><button class="btn big" id="bVolta">← Voltar</button></div>`;

    this.body.querySelectorAll('[data-buy]').forEach((n) => (n.onclick = () => {
      if (pc.comprar(n.dataset.buy)) this._telaLoja();
    }));
    this.body.querySelectorAll('[data-patro]').forEach((n) => (n.onclick = () => {
      pc.assinarPatrocinio(ofertas[+n.dataset.patro]); this._telaLoja();
    }));
    this.body.querySelector('#bVolta').onclick = () => this._telaTemporada();
  }

  // ---------------------------------------------------------- histórico
  _telaHistorico() {
    const pc = this.pc;
    const c = pc.carreira;
    const cont = {};
    c.titulos.forEach((t) => (cont[t] = (cont[t] || 0) + 1));
    const prem = {};
    c.premios.forEach((p) => (prem[p] = (prem[p] || 0) + 1));

    // Em que ano cada título veio — a sala de troféus fica muito melhor quando
    // conta uma história e não só um contador.
    const anoDoTitulo = {};
    pc.historico.forEach((h) => (h.titulos || []).forEach((t) => {
      (anoDoTitulo[t] = anoDoTitulo[t] || []).push(h.ano);
    }));
    (pc.selecao.titulos || []).forEach((t) => { anoDoTitulo[t] = anoDoTitulo[t] || []; });

    const vitrine = Object.entries(cont).sort((a, b) => b[1] - a[1]).map(([t, n]) => `
      <div class="trofeu">
        <div class="trofeuimg">${compTrophy(t, 62)}${n > 1 ? `<span class="trofeun">${n}</span>` : ''}</div>
        <div class="trofeunome">${esc(t)}</div>
        <div class="trofeuano">${(anoDoTitulo[t] || []).join(', ') || '—'}</div></div>`).join('');

    const premiosHtml = Object.entries(prem).sort((a, b) => b[1] - a[1])
      .map(([p, n]) => `<div class="premio"><b>${esc(p)}</b>${n > 1 ? `<i>${n}x</i>` : ''}</div>`).join('');

    const marcas = [];
    if (pc.chuteiraAssinatura) marcas.push(`Chuteira com o seu nome: <b>${esc(pc.chuteiraAssinatura)}</b>`);
    if (pc.linhaPropria) marcas.push(`Linha própria: <b>${esc(pc.linhaPropria)}</b>`);
    if (pc.contratoVitalicio) marcas.push(`<b>${esc(pc.contratoVitalicio)}</b>`);
    if (pc.capitao) marcas.push('Capitão do clube');
    if (pc.capitaoSelecao) marcas.push('Capitão da seleção');

    this.body.innerHTML = `
      <div class="jtop"><div class="jnome">Carreira de ${esc(pc.nome)}</div></div>
      <div class="panel"><h2>Números</h2>
        <span class="stat">Jogos: <b>${c.jogos}</b></span><span class="stat">Gols: <b>${c.gols}</b></span>
        <span class="stat">Assistências: <b>${c.assist}</b></span>
        <span class="stat">Seleção: <b>${pc.selecao.jogos}j ${pc.selecao.gols}g</b></span>
        <span class="stat">Patrimônio: <b>${money(pc.patrimonio())}</b></span></div>

      <div class="panel"><h2>Sala de troféus</h2>
        ${vitrine ? `<div class="vitrine">${vitrine}</div>`
          : '<div class="salavazia">A prateleira está vazia. Ainda dá tempo.</div>'}
        ${premiosHtml ? `<div class="premiostit">Prêmios individuais</div><div class="premios">${premiosHtml}</div>` : ''}
        ${marcas.length ? `<div class="premiostit">Marcas da carreira</div>
          <div class="marcas">${marcas.map((m) => `<div>${m}</div>`).join('')}</div>` : ''}</div>

      <div class="panel"><h2>Temporada a temporada</h2>
        <div style="overflow-x:auto"><table class="classif">
          <thead><tr><th>Ano</th><th>Clube</th><th>OVR</th><th>J</th><th>G</th><th>A</th><th>Nota</th><th>Objetivo</th></tr></thead>
          <tbody>${pc.historico.map((h) => `<tr>
            <td>${h.ano}</td><td>${esc(h.clube)}</td><td>${h.ovr}</td>
            <td>${h.jogos}</td><td>${h.gols}</td><td>${h.assist}</td><td>${h.nota}</td>
            <td class="${h.cumpriu ? 'ok' : 'bad'}">${h.cumpriu ? 'cumprido' : 'não'}</td></tr>`).join('')}
          </tbody></table></div></div>
      <div class="panel" style="text-align:center"><button class="btn big" id="bVolta">← Voltar</button></div>`;
    this.body.querySelector('#bVolta').onclick = () => this._telaTemporada();
  }

  // ---------------------------------------------------------- fim
  async _fimDeCarreira() {
    const pc = this.pc;
    const f = pc.aposentar();
    PlayerCareerUI.apagarSave();   // carreira encerrada: não há o que continuar
    const t = f.tier;

    await this._popup(
      `<div style="font-size:56px">${t.emoji}</div> <h3>Fim de carreira</h3> <p class="muted" style="margin-bottom:14px">${esc(pc.nome)} pendurou as chuteiras aos ${f.idade} anos, depois de ${f.anos} temporadas.</p> <div style="font-family:var(--font-head);font-size:52px;font-weight:800;line-height:1;
         background:linear-gradient(180deg,#fff,var(--gold));-webkit-background-clip:text;background-clip:text;
         -webkit-text-fill-color:transparent">${f.nota}</div> <div class="muted" style="margin-bottom:14px">nota final</div> <div style="font-size:22px;font-weight:800;margin-bottom:16px">${t.emoji} ${esc(t.nome)}</div> <div class="kv"><span>Jogos</span><b>${f.jogos}</b></div> <div class="kv"><span>Gols</span><b>${f.gols}</b></div> <div class="kv"><span>Assistências</span><b>${f.assist}</b></div> <div class="kv"><span>Pico de overall</span><b>${f.picoOvr}</b></div> <div class="kv"><span>Títulos</span><b>${f.titulos.length}</b></div> <div class="kv"><span>Prêmios</span><b>${f.premios.length}</b></div> <div class="kv"><span>Patrimônio</span><b>${money(f.patrimonio)}</b></div>`,
      [{ txt: 'Ver o ranking' }]);

    const riv = pc.rival;
    if (riv) {
      const meuPeso = f.gols + f.assist * 0.6 + f.titulos.length * 8 + f.premios.length * 10;
      const dele = riv.gols + riv.assist * 0.6 + riv.titulos * 8 + riv.premios * 10;
      const ganhei = meuPeso >= dele;
      await this._popup(
        `<div style="font-size:48px">${ganhei ? '' : ''}</div> <h3>Você e ${esc(riv.nome)}</h3> <p class="muted" style="margin-bottom:12px">Vocês começaram no mesmo ano, na mesma posição.</p> <div class="kv"><span>Gols</span><b>${f.gols} <span class="muted">x</span> ${riv.gols}</b></div> <div class="kv"><span>Assistências</span><b>${f.assist} <span class="muted">x</span> ${riv.assist}</b></div> <div class="kv"><span>Títulos</span><b>${f.titulos.length} <span class="muted">x</span> ${riv.titulos}</b></div> <div class="kv"><span>Prêmios</span><b>${f.premios.length} <span class="muted">x</span> ${riv.premios}</b></div> <p style="margin-top:14px;font-size:17px;font-weight:800" class="${ganhei ? 'ok' : 'bad'}"> ${ganhei ? 'A geração é sua.' : `A geração ficou marcada pelo nome dele.`}</p>`,
        [{ txt: 'Encerrar' }]);
    }

    this._telaRanking(f);
  }

  _telaRanking(f) {
    const pc = this.pc;
    const lista = PlayerCareer.ranking();
    const anos = pc.temporada - 1;

    this.body.innerHTML = `
      <div class="jtop"><div class="jnome"> Maiores carreiras</div></div> <div class="panel"><h2>Ranking (salvo neste navegador)</h2> <div style="overflow-x:auto"><table><thead><tr><th>#</th><th>Jogador</th><th>Pos</th><th>Nota</th><th>Tier</th><th>Gols</th><th>Jogos</th></tr></thead> <tbody>${lista.map((r, i) => `<tr class="${r.nome === pc.nome && r.nota === f.nota ? 'me' : ''}"> <td>${i + 1}</td><td>${esc(r.nome)}</td><td>${esc(r.pos)}</td><td><b>${r.nota}</b></td> <td>${esc(r.tier)}</td><td>${r.gols}</td><td>${r.jogos}</td></tr>`).join('')}</tbody></table></div></div> <div class="panel" style="text-align:center"> <h2>E agora?</h2> <div class="muted" style="margin-bottom:14px">Estamos em ${pc.ano}. Passaram-se ${anos} anos desde que você estreou —
          o mundo do futebol envelheceu junto: seus contemporâneos se aposentaram e uma nova geração tomou conta.</div> <div class="opts" style="justify-content:center"> <button class="btn big" id="bTreinador">Virar treinador</button> <button class="btn sec" id="bNova">Nova carreira</button> <button class="btn sec" id="bSair">Menu inicial</button></div></div>`;

    this.body.querySelector('#bTreinador').onclick = () => {
      this.hide();
      if (this.opts.onVirarTreinador) this.opts.onVirarTreinador(anos, pc.ano);
    };
    this.body.querySelector('#bNova').onclick = () => { this.pc = null; this._telaCriar(); };
    this.body.querySelector('#bSair').onclick = () => { this.hide(); if (this.opts.onSair) this.opts.onSair(); };
  }
}
