// aviso.js — o recado do jogo.
//
// Antes isto era alert() do navegador: uma caixa cinza escrito "localhost:5312 diz"
// em cima da partida. O Gustavo viu e disse que não fazia sentido nenhum — e não faz:
// nenhum jogo de futebol para tudo para o sistema operacional falar com você.
// Aqui o recado nasce dentro da tela, na cor do que aconteceu, e sai sozinho.

let pilha = null;

function caixa() {
  if (pilha && document.body.contains(pilha)) return pilha;
  pilha = document.createElement('div');
  pilha.className = 'avisos';
  document.body.appendChild(pilha);
  return pilha;
}

/** tipo: 'ok' | 'erro' | 'info' (o padrão) */
export function aviso(msg, tipo = 'info') {
  if (!msg) return;
  const el = document.createElement('div');
  el.className = `aviso aviso-${tipo}`;
  el.textContent = String(msg);
  caixa().appendChild(el);
  // fica mais tempo quando o texto é longo: ninguém lê três linhas em dois segundos
  const vida = Math.min(7000, 2200 + String(msg).length * 45);
  setTimeout(() => { el.classList.add('saindo'); setTimeout(() => el.remove(), 320); }, vida);
}

/** Pergunta de sim ou não, no visual do jogo. Devolve uma Promise<boolean>. */
export function confirmar(msg, simTxt = 'Confirmar', naoTxt = 'Cancelar') {
  return new Promise((resolve) => {
    const cov = document.createElement('div');
    cov.className = 'cov';
    cov.innerHTML = `<div class="panel confirmbox">
      <div class="confirmtxt"></div>
      <div class="confirmbtns">
        <button class="btn sec" data-nao></button>
        <button class="btn" data-sim></button>
      </div></div>`;
    cov.querySelector('.confirmtxt').textContent = msg;
    cov.querySelector('[data-sim]').textContent = simTxt;
    cov.querySelector('[data-nao]').textContent = naoTxt;
    const fim = (v) => { cov.remove(); resolve(v); };
    cov.querySelector('[data-sim]').onclick = () => fim(true);
    cov.querySelector('[data-nao]').onclick = () => fim(false);
    cov.onclick = (e) => { if (e.target === cov) fim(false); };
    document.body.appendChild(cov);
  });
}
