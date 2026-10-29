// theme.js — identidade visual do FUTEBOL FC.
// Um único lugar para cores, fontes e componentes. Estilo de game esportivo:
// tipografia condensada em caixa alta, painéis de vidro escuro, botões com
// biséu (relevo) e brilho de acento nos elementos ativos.
//
// Fontes: só famílias que já existem no sistema — o jogo precisa rodar no
// arquivo único offline, então nada de carregar fonte da internet.

export const TOKENS = `
  :root{
    --bg0:#04070f; --bg1:#0a1120; --bg2:#101a2e;
    --panel:rgba(17,27,46,.82); --panel-solid:#111b2e;
    --line:rgba(120,160,220,.16); --line-hot:rgba(120,190,255,.32);
    --ink:#e8f0fb; --ink-dim:#8ea6c9; --ink-mute:#61789c;
    --acc:#2be07a; --acc-dark:#0b3a20; --acc-glow:rgba(43,224,122,.45);
    --gold:#cfd2d8; --gold-dark:#3a2c00;
    --blue:#3d9bff; --red:#ff4d5a;
    --font:'Segoe UI',system-ui,-apple-system,sans-serif;
    --font-head:'Avenir Next Condensed','Roboto Condensed','Arial Narrow','Segoe UI',system-ui,sans-serif;
    --r:14px;
    /* as cores do clube entram em tempo de execucao (careerUI.render) */
    --clube1:#e8362f; --clube2:#ffffff; --clubetxt:#ffffff;
  }`;

// fundo de estádio: brilho central + faixas diagonais bem sutis (textura de grama/holofote)
export const BACKDROP = `
    background:
      radial-gradient(1100px 500px at 15% -10%, color-mix(in srgb, var(--clube1) 24%, transparent), transparent 60%),
      radial-gradient(900px 520px at 100% -6%, rgba(45,108,246,.14), transparent 58%),
      /* As listras diagonais ficavam marcadas demais nas áreas vazias da tela e
         davam um ar de papel de parede, destoando do resto. Agora são quase
         imperceptíveis e mais largas: dão textura sem virar estampa. */
      repeating-linear-gradient(115deg, rgba(255,255,255,.004) 0 44px, transparent 44px 88px),
      linear-gradient(168deg, var(--bg1), var(--bg0) 78%);`;

// peças reutilizadas (painel, botão, tabela, pílulas de posição)
export const PARTS = `
  .panel{
    position:relative; background:linear-gradient(180deg,rgba(26,34,53,.74),rgba(17,24,40,.68));
    border:1px solid var(--line);
    border-radius:18px; padding:17px 19px 17px; margin-bottom:14px;
    box-shadow:0 26px 54px -32px #000, inset 0 1px 0 rgba(255,255,255,.07);
    backdrop-filter:blur(10px);
  }
  .panel::before{
    content:''; position:absolute; left:16px; right:16px; top:0; height:2px; border-radius:2px;
    background:linear-gradient(90deg,transparent,var(--clube1),transparent); opacity:.5;
  }
  .panel:hover::before{opacity:.8}
  h2{
    font-family:var(--font-head); font-size:13px; font-weight:800; letter-spacing:.14em;
    text-transform:uppercase; color:var(--ink-dim); margin-bottom:12px;
    display:flex; align-items:center; gap:9px;
  }
  h2::after{content:''; flex:1; height:1px; background:linear-gradient(90deg,
    rgba(255,255,255,.10), transparent);}
  .muted{color:var(--ink-dim); font-size:12.5px;}

  .btn{
    font-family:var(--font-head); font-weight:800; letter-spacing:.06em; text-transform:uppercase;
    color:var(--acc-dark); background:linear-gradient(180deg,#5cf5a2,var(--acc) 55%,#12a556);
    border:none; border-radius:9px; padding:8px 15px; cursor:pointer; font-size:13.5px;
    box-shadow:0 3px 0 #0a6b39, 0 8px 18px -8px var(--acc-glow), inset 0 1px 0 rgba(255,255,255,.5);
    transition:transform .08s, box-shadow .08s, filter .15s;
  }
  .btn:hover{filter:brightness(1.08);}
  .btn:active{transform:translateY(3px); box-shadow:0 0 0 #0a6b39, inset 0 1px 0 rgba(255,255,255,.3);}
  .btn.sec{
    color:#dbe8fb; background:linear-gradient(180deg,#2b3d5c,#1b2842);
    box-shadow:0 3px 0 #0e1729, 0 8px 18px -10px #000, inset 0 1px 0 rgba(255,255,255,.12);
  }
  .btn.sec:active{box-shadow:0 0 0 #0e1729, inset 0 1px 0 rgba(255,255,255,.1);}

  table{width:100%; border-collapse:collapse; font-size:13.5px;}
  th{
    font-family:var(--font-head); text-transform:uppercase; letter-spacing:.08em;
    font-size:11.5px; color:var(--ink-dim); font-weight:800;
    border-bottom:1px solid var(--line-hot); padding:7px 8px;
  }
  td{padding:6px 8px; border-bottom:1px solid rgba(120,160,220,.09);}
  th,td{text-align:center;}
  th:first-child,td:first-child{text-align:left;}
  tbody tr:nth-child(even){background:rgba(255,255,255,.018);}
  tbody tr:hover{background:rgba(61,155,255,.09);}
  tr.me td{background:rgba(43,224,122,.13); font-weight:700;}
  tr.me td:first-child{box-shadow:inset 3px 0 0 var(--acc);}
  tr.up td{border-bottom:1px solid rgba(43,224,122,.35);}
  tr.down td{background:rgba(255,77,90,.10);}

  .pos{
    display:inline-block; min-width:26px; text-align:center; border-radius:5px; padding:2px 6px;
    font-family:var(--font-head); font-weight:800; font-size:10.5px; letter-spacing:.06em;
    color:#fff; text-shadow:0 1px 2px rgba(0,0,0,.6); box-shadow:inset 0 1px 0 rgba(255,255,255,.25);
  }
  .G{background:linear-gradient(180deg,#8f9299,#5c5f66);}
  .Z{background:linear-gradient(180deg,#7c8088,#4e5158);}
  .L{background:linear-gradient(180deg,#888c94,#585c63);}
  .M{background:linear-gradient(180deg,#9a9ea6,#63666e);}
  .A{background:linear-gradient(180deg,#b9bcc4,#74777f);}

  .stat{
    display:inline-block; background:linear-gradient(180deg,rgba(255,255,255,.05),transparent);
    border:1px solid var(--line); border-radius:10px; padding:8px 13px; margin:4px 6px 4px 0;
    font-size:13.5px; box-shadow:inset 0 1px 0 rgba(255,255,255,.06);
  }
  .stat b{color:var(--acc); font-family:var(--font-head); letter-spacing:.03em;}
  ::-webkit-scrollbar{width:10px;height:10px}
  ::-webkit-scrollbar-thumb{background:#34373e;border-radius:6px;border:2px solid var(--bg0)}
  ::-webkit-scrollbar-track{background:transparent}`;

// Peças usadas também pelo modo Jogador (que monta a própria folha de estilo).
export const CRIAR_JOGADOR_CSS = `
  /* ---------- criar jogador: posição e camisa ---------- */
  .posgrid{display:grid; grid-template-columns:repeat(3,1fr); gap:8px;}
  .poscard{display:flex; flex-direction:column; align-items:center; gap:3px; cursor:pointer;
    padding:13px 8px; border-radius:11px; border:1px solid var(--line); color:var(--ink);
    background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.01)); transition:.13s;}
  .poscard b{font-family:var(--font-head); font-size:19px; letter-spacing:.06em;}
  .poscard span{font-size:10.5px; color:var(--ink-dim); text-align:center; line-height:1.25;}
  .poscard:hover{border-color:var(--line-hot);}
  .poscard.on{background:linear-gradient(180deg,#ffffff,#d7d9df); border-color:#fff;}
  .poscard.on b, .poscard.on span{color:#101114;}
  .camisas{display:flex; gap:7px; flex-wrap:wrap;}
  .camisa{width:44px; height:44px; border-radius:10px; cursor:pointer; border:1px solid var(--line);
    background:rgba(255,255,255,.04); color:var(--ink); font-family:var(--font-head);
    font-size:16px; font-weight:800; transition:.13s;}
  .camisa:hover{border-color:var(--line-hot);}
  .camisa.on{background:#fff; color:#101114; border-color:#fff;}

`;

// ---------- Repaginação da CARREIRA DE JOGADOR ----------
// O modo jogador tinha ficado para trás: barras prateadas, cabeçalho pequeno e
// botões cinza, enquanto o modo treinador já vestia a cor do clube. Aqui ele
// entra no mesmo padrão — e, como o jogador troca de time ao longo da carreira,
// a tela troca de cor junto.
export const JOGADOR_VISUAL = `
  #jogRoot{font-size:15px}
  .jwrap{max-width:1180px; padding:20px 22px 48px}

  /* --- o herói do jogador: escudo do clube, nome grande e o overall --- */
  .jheroi{border:1px solid rgba(255,255,255,.08); border-top:0; overflow:hidden;
    border-radius:0 0 26px 26px; margin:-20px -22px 18px}
  .jhcorpo{position:relative; display:flex; align-items:center; gap:22px; padding:30px 30px 28px;
    background:
      linear-gradient(135deg,
        color-mix(in srgb, var(--clube1) 52%, transparent),
        color-mix(in srgb, var(--clube1) 12%, transparent) 45%,
        rgba(10,14,26,.25)),
      linear-gradient(180deg,#0e1424,#080c16)}
  .jhcorpo::after{content:''; position:absolute; right:-34px; top:-46px;
    width:290px; height:290px; background:var(--marca) center/contain no-repeat;
    opacity:.10; pointer-events:none}
  .jhcorpo > .escudoimg{position:relative; z-index:1}
  .jhquem{position:relative; z-index:1; min-width:0}
  .jhquem b{display:block; font-family:var(--font-head); font-size:clamp(30px,4.2vw,48px);
    line-height:.98; letter-spacing:.012em; text-shadow:0 2px 12px rgba(0,0,0,.5);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
  .jhquem span{display:block; color:#b9c8e0; font-size:13px; letter-spacing:.13em;
    text-transform:uppercase; margin-top:5px; white-space:nowrap; overflow:hidden;
    text-overflow:ellipsis}
  .jhovr{position:relative; z-index:1; margin-left:auto; text-align:right; flex:0 0 auto}
  .jhovr i{display:block; font-style:normal; font-size:11px; letter-spacing:.18em;
    text-transform:uppercase; color:#b9c8e0; margin-bottom:3px}
  .jhovr b{font-family:var(--font-head); font-size:54px; line-height:1; color:#fff;
    text-shadow:0 2px 14px rgba(0,0,0,.6)}

  /* --- painéis e títulos na mesma escala do modo treinador --- */
  .panel{padding:22px 24px 24px; border-radius:20px; margin-bottom:16px}
  h2{font-size:13.5px; letter-spacing:.17em; margin-bottom:16px}
  .muted{font-size:13.5px}

  /* --- atributos: barra na cor do clube, número grande --- */
  .attrs{gap:16px}
  .attr b{font-size:12.5px; letter-spacing:.11em}
  .attr span{font-size:17px; font-family:var(--font-head)}
  .bar{height:11px; border-radius:6px; margin-top:7px}
  .bar i{background:linear-gradient(90deg,
    color-mix(in srgb, var(--clube1) 70%, #000), var(--clube1))}

  /* --- as pastilhas de informação --- */
  .stat{font-size:13.5px; padding:10px 14px; border-radius:11px}
  /* o valor saía no verde antigo do jogo; agora é texto normal e quem tem
     recado próprio (.ok / .bad) continua colorido */
  .stat b{color:var(--ink)}
  .stat b.ok{color:#4ade80} .stat b.bad{color:#ff6b78}

  /* --- botões de escolha (treino, intensidade) --- */
  .opt{font-size:13.5px; padding:11px 17px; border-radius:11px;
    background:rgba(255,255,255,.055); border-color:rgba(255,255,255,.12); color:var(--ink-dim)}
  .opt:hover{color:var(--ink); background:rgba(255,255,255,.10)}
  .opt.on{color:#fff; border-color:transparent;
    background:linear-gradient(180deg, var(--clube1), color-mix(in srgb, var(--clube1) 64%, #000));
    box-shadow:0 14px 26px -14px var(--clube1), inset 0 1px 0 rgba(255,255,255,.3)}
  .big{font-size:17px; padding:18px 32px}

  /* --- o botão principal usa a cor do clube, não o verde antigo --- */
  .btn{font-size:14.5px; padding:12px 19px; border-radius:12px; color:#fff;
    background:linear-gradient(180deg, var(--clube1), color-mix(in srgb, var(--clube1) 66%, #000));
    box-shadow:0 14px 28px -14px var(--clube1), inset 0 1px 0 rgba(255,255,255,.3)}
  .btn.sec{color:var(--ink); background:rgba(255,255,255,.06);
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
  .btn.sec:hover{background:rgba(255,255,255,.10)}

  /* --- criar jogador: as fichas de posição --- */
  .posgrid{gap:11px}
  .poscard{padding:17px 10px; border-radius:14px; gap:5px;
    background:rgba(255,255,255,.04); border-color:rgba(255,255,255,.09)}
  .poscard b{font-size:24px}
  .poscard span{font-size:11.5px}
  .poscard:hover{background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.2)}
  .poscard.on{border-color:transparent; color:#fff;
    background:linear-gradient(180deg, var(--clube1), color-mix(in srgb, var(--clube1) 62%, #000));
    box-shadow:0 16px 30px -16px var(--clube1), inset 0 1px 0 rgba(255,255,255,.3)}
  .poscard.on b, .poscard.on span{color:#fff}
  .camisa{width:52px; height:52px; border-radius:12px; font-size:18px}
  .camisa.on{background:linear-gradient(180deg, var(--clube1), color-mix(in srgb, var(--clube1) 62%, #000));
    color:#fff; border-color:transparent;
    box-shadow:0 14px 24px -14px var(--clube1), inset 0 1px 0 rgba(255,255,255,.3)}
  label{font-size:12px; letter-spacing:.14em; margin:18px 0 7px}
  input, select{padding:13px 14px; font-size:15px; border-radius:12px}

  /* --- o cartão do contrato: era verde fixo, agora é do clube --- */
  /* O TRAVAMENTO DO RESUMO DE TEMPORADA ERA AQUI.
     Eu troquei o overflow do cartão para 'hidden' na repaginação, e o resumo de
     fim de ano é longo: o botão "Continuar" ficava cortado para fora da caixa,
     sem rolagem, e o jogo parava. */
  .jcard{border-radius:22px; max-width:640px; max-height:88vh; overflow:auto}
  .jcard h3{font-size:22px}
  .kv{font-size:14.5px; padding:12px 4px}

  /* ===== RESUMO DE FIM DE TEMPORADA =====
     Era uma pilha de linhas chave-valor — "um monte de tabela", nas palavras do
     Gustavo. Virou um cabeçalho com o escudo e o overall, os números em cartões
     e o objetivo numa faixa. */
  .anotopo{display:flex; align-items:center; gap:18px; text-align:left;
    padding:4px 2px 18px; border-bottom:1px solid rgba(255,255,255,.08); margin-bottom:18px}
  .anoquem{flex:1; min-width:0}
  .anoquem b{display:block; font-family:var(--font-head); font-size:38px; line-height:1}
  .anoquem span{display:block; font-size:12.5px; color:var(--ink-dim); margin-top:5px;
    letter-spacing:.04em}
  .anoovr{text-align:right; flex:0 0 auto}
  .anoovr i{display:block; font-style:normal; font-size:10px; letter-spacing:.18em;
    text-transform:uppercase; color:var(--ink-dim)}
  .anoovr b{font-family:var(--font-head); font-size:46px; line-height:1}
  .anoovr em{font-style:normal; font-size:14px; font-weight:800; margin-left:5px}
  .anoovr em.sobe{color:#4ade80} .anoovr em.cai{color:#ff6b78}

  .anonums{display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px}
  .anonum{padding:15px 10px; border-radius:14px; text-align:center;
    background:rgba(255,255,255,.045); border:1px solid rgba(255,255,255,.08)}
  .anonum b{display:block; font-family:var(--font-head); font-size:30px; line-height:1}
  .anonum i{display:block; font-style:normal; font-size:10.5px; letter-spacing:.12em;
    text-transform:uppercase; color:var(--ink-dim); margin-top:6px}
  .anonum s{display:block; text-decoration:none; font-size:10px; color:var(--ink-mute); margin-top:4px}
  .anonum.nota.boa b{color:#4ade80}
  .anonum.nota.media b{color:#8fd0ff}
  .anonum.nota.ruim b{color:#ff8a8a}

  .anometa{text-align:left; padding:14px 16px; border-radius:14px; margin-bottom:16px}
  .anometa.ok{background:rgba(54,226,127,.10); border:1px solid rgba(54,226,127,.26)}
  .anometa.nao{background:rgba(255,94,107,.10); border:1px solid rgba(255,94,107,.26)}
  .anometa b{display:block; font-size:15.5px; margin-bottom:3px}
  .anometa.ok b{color:#4ade80} .anometa.nao b{color:#ff8a8a}
  .anometa span{font-size:13px; color:var(--ink-dim)}

  .rvonde{display:flex; justify-content:space-between; gap:12px; font-size:11.5px;
    color:var(--ink-mute); padding:2px 2px 8px; border-bottom:1px solid rgba(255,255,255,.07);
    margin-bottom:8px}

  @media (max-width:560px){
    .anonums{grid-template-columns:repeat(2,1fr)}
    .anoquem b{font-size:28px}
    .anoovr b{font-size:34px}
  }

  /* ===== OS BOTÕES DA TEMPORADA, em três faixas ===== */
  .jacoes{display:flex; flex-direction:column; gap:12px}
  .jlinha{display:flex; gap:11px; flex-wrap:wrap}
  .jlinha.principal .btn{flex:1; min-width:210px; padding:19px; font-size:16px}
  .jlinha:not(.principal) .btn{flex:1; min-width:130px}
  .jlinha.perigo{border-top:1px solid rgba(255,255,255,.08); padding-top:13px}
  .jlinha.perigo .btn{flex:0 0 auto; color:#ff8a8a;
    box-shadow:inset 0 0 0 1px rgba(255,94,107,.28); background:rgba(255,94,107,.07)}
  .jlinha.perigo .btn:hover{background:rgba(255,94,107,.14)}

  /* ===== A FICHA DO JOGADOR: onde você está, como você está ===== */
  .jfichas{display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:11px}
  .jficha{padding:14px 16px; border-radius:14px;
    background:rgba(255,255,255,.045); border:1px solid rgba(255,255,255,.08)}
  .jficha.largo{grid-column:span 2}
  .jficha.alerta{background:rgba(255,94,107,.10); border-color:rgba(255,94,107,.26)}
  .jficha i{display:block; font-style:normal; font-size:10.5px; letter-spacing:.14em;
    text-transform:uppercase; color:var(--ink-mute); margin-bottom:5px}
  .jficha b{font-family:var(--font-head); font-size:21px; line-height:1.15}
  .jficha.alerta b{color:#ff8a8a}

  .medlinha{display:flex; align-items:center; gap:14px; padding:9px 0}
  .medlinha i{font-style:normal; font-size:10.5px; letter-spacing:.15em;
    text-transform:uppercase; color:var(--ink-mute); width:92px; flex:0 0 auto}
  .medbar{flex:1; height:9px; border-radius:5px; background:rgba(255,255,255,.09); overflow:hidden}
  .medbar em{display:block; height:100%; border-radius:5px; transition:width .3s}
  .medlinha b{font-family:var(--font-head); font-size:19px; width:40px; text-align:right; flex:0 0 auto}
  .jtecnico{margin-top:12px; padding:13px 16px; border-radius:13px;
    background:rgba(255,255,255,.04); border-left:3px solid var(--ink-mute)}
  .jtecnico i{display:block; font-style:normal; font-size:10.5px; letter-spacing:.15em;
    text-transform:uppercase; color:var(--ink-mute); margin-bottom:4px}
  .jtecnico b{font-size:15.5px}
  .jtecnico.ok{border-left-color:#36e27f} .jtecnico.ok b{color:#4ade80}
  .jtecnico.bad{border-left-color:#ff5e6b} .jtecnico.bad b{color:#ff8a8a}
  @media (max-width:520px){ .jficha.largo{grid-column:span 1} .medlinha i{width:70px} }

  /* ===== RIVAL E IMPRENSA no modo jogador =====
     Estas regras existiam só no CSS da carreira de TREINADOR. O modo jogador tem
     folha própria e nunca as recebeu: o quadro do rival saía com tudo grudado
     ("1gols10"), que foi o que o Gustavo viu no resumo do ano. */
  .rival{text-align:left; margin-top:16px; padding:16px 18px; border-radius:15px;
    background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08)}
  .rvtopo{display:flex; align-items:center; gap:10px; margin:8px 0 2px;
    flex-wrap:wrap; justify-content:space-between}
  .rvtopo b{font-size:15px}
  .rvtopo span{color:var(--ink-dim); font-size:11.5px}
  .rvtopo i{font-style:normal; color:var(--ink-mute); font-size:11px; letter-spacing:.14em}
  .rvlinha{display:grid; grid-template-columns:1fr auto 1fr; align-items:center;
    gap:12px; padding:6px 0; font-size:14.5px}
  .rvlinha b{font-family:var(--font-head); font-size:17px}
  .rvlinha b:first-child{text-align:right}
  .rvlinha span{font-size:10.5px; text-transform:uppercase; letter-spacing:.1em;
    color:var(--ink-mute); text-align:center}
  .rvlinha.eu b:first-child{color:#4ade80}
  .rvlinha.ele b:last-child{color:#ffc53d}
  .rvrecado{margin-top:11px; padding-top:10px; border-top:1px solid rgba(255,255,255,.08);
    font-size:13px; color:var(--ink-dim)}
  .imprensa{text-align:left; margin-top:16px; padding:14px 18px; border-radius:14px;
    border-left:3px solid var(--clube1); background:rgba(255,255,255,.04);
    font-size:14.5px; line-height:1.55; font-style:italic}

  /* --- propostas --- */
  .prop{padding:15px 17px; border-radius:14px; font-size:14.5px; gap:14px}
  .prop:hover{border-color:var(--clube1)}

  /* --- barra de cima, quando aparece --- */
  .jtop{padding:15px 22px; margin:-20px -22px 18px}
  .jnome{font-size:24px}

  @media (max-width:860px){
    #jogRoot{font-size:14px}
    .jhcorpo{padding:22px 20px; gap:16px}
    .jhovr b{font-size:38px}
    .posgrid{gap:8px}
    .poscard b{font-size:19px}
  }`;

// ---------- CSS da Carreira de Treinador ----------
export const CAREER_CSS = `${TOKENS}
  #careerRoot{
    position:fixed; inset:0; z-index:40; color:var(--ink);
    font-family:var(--font); overflow:auto; ${BACKDROP}
  }
  #careerRoot.hidden{display:none;}
  .cwrap{max-width:1080px; margin:0 auto; padding:18px 18px 34px;}

  /* O cabecalho gruda no topo: o Gustavo queria "o Corinthians e o caixa sempre em
     cima". Rolando a tela, voce continua vendo de quem e o time e quanto tem no caixa. */
  .ctop{
    position:sticky; top:0; z-index:40;
    border-top:3px solid var(--clube1);
    display:flex; align-items:center; gap:12px; justify-content:space-between; flex-wrap:wrap;
    margin:-18px -18px 14px; padding:13px 18px;
    background:linear-gradient(180deg,rgba(10,17,32,.99),rgba(10,17,32,.96));
    backdrop-filter:blur(8px);
    border-bottom:1px solid var(--line-hot);
    box-shadow:0 10px 30px -18px #000; position:sticky; top:0; z-index:5;
    backdrop-filter:blur(10px);
  }
  .clogo{
    display:flex; align-items:center; gap:10px;
    font-family:var(--font-head); font-weight:800; font-size:21px; letter-spacing:.04em;
  }
  .badge{width:26px; height:26px; border-radius:7px; border:1px solid rgba(255,255,255,.35);}

  .ctopcaixa{margin-left:auto;text-align:right;line-height:1.15}
  .ctopcaixa b{font-size:15px;color:#7fe3a0;font-variant-numeric:tabular-nums}
  .ctopcaixa span{display:block;font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-dim)}
  .tacprev{margin-top:9px;padding-top:9px;border-top:1px solid rgba(255,255,255,.08);
    font-size:12px;color:var(--ink-dim);line-height:1.6}
  .tacprev b{font-size:13px}
  .tacprev i{font-style:normal;display:block;margin-top:2px;font-size:11px;opacity:.8}

  .compl b{font-size:13.5px}
  .compl{padding:9px 0}

  /* ===== painel em duas colunas (como a maquete) ===== */
  .dashgrid{display:grid;grid-template-columns:1.35fr .9fr;gap:14px;align-items:start}
  .dashcol>*{margin-bottom:14px}
  .dashcol>*:last-child{margin-bottom:0}
  @media (max-width:860px){ .dashgrid{grid-template-columns:1fr} }

  /* anel do objetivo */
  .metaanel{display:flex;align-items:center;gap:16px}
  .anel{--p:60;--anelcor:#36e27f;width:76px;height:76px;border-radius:50%;flex:0 0 auto;
    display:grid;place-items:center;
    background:conic-gradient(var(--anelcor) calc(var(--p)*1%), rgba(255,255,255,.08) 0)}
  .anel i{width:62px;height:62px;border-radius:50%;background:#101728;display:grid;place-items:center;
    font-style:normal;font-family:var(--cond,inherit);font-size:21px;font-weight:800}
  .metatxt b{display:block;font-size:15px;margin-bottom:3px}
  .metatxt span{font-size:12.5px;color:var(--ink-dim)}

  /* ===== meta da diretoria ===== */
  .meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0;
    padding:10px 14px;border-radius:12px;font-size:13px;
    background:rgba(255,255,255,.04);border-left:4px solid var(--ink-dim)}
  .meta.ok{border-left-color:#34d399}
  .meta.quase{border-left-color:#f0b429}
  .meta.ruim{border-left-color:#ef4444}
  .metarot{font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-dim)}
  .metapos{color:var(--ink-dim);font-size:12.5px}
  .metastatus{margin-left:auto;font-size:11px;font-weight:800;letter-spacing:.04em;
    text-transform:uppercase}
  .meta.ok .metastatus{color:#7fe3a0}
  .meta.quase .metastatus{color:#f0b429}
  .meta.ruim .metastatus{color:#ef4444}

  /* ===== rival de geracao ===== */
  .rvtopo{display:flex;align-items:center;gap:8px;margin:6px 0 10px;font-size:12px;
    flex-wrap:wrap;justify-content:space-between}
  .rvtopo b{font-size:14px}
  .rvtopo span{color:var(--ink-dim);font-size:11px}
  .rvtopo i{font-style:normal;color:var(--ink-dim);font-size:11px;letter-spacing:.1em}
  .rvlinha{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;
    padding:4px 0;font-size:13px}
  .rvlinha span{font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;
    color:var(--ink-dim);text-align:center}
  .rvlinha b:first-child{text-align:right}
  .rvlinha.eu b:first-child{color:#7fe3a0}
  .rvlinha.ele b:last-child{color:#f0b429}
  .rvrecado{margin-top:9px;padding-top:8px;border-top:1px solid rgba(255,255,255,.08);
    font-size:12px;color:var(--ink-dim)}

  /* ===== loja da carreira de jogador ===== */
  .lojaico{width:38px;flex:0 0 auto;display:flex;align-items:center;justify-content:center}
  .lojaini{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;
    justify-content:center;font-family:var(--font-head);font-size:15px;font-weight:800;
    color:var(--ink);background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.10)}
  .lojapreco{margin-top:4px;display:inline-block;font-size:11.5px;font-weight:800;
    padding:2px 9px;border-radius:20px;background:rgba(127,227,160,.14);color:#7fe3a0}
  .lojapreco.caro{background:rgba(255,255,255,.06);color:var(--ink-dim)}
  .lojapreco.meu{background:rgba(143,208,255,.14);color:#8fd0ff}

  /* ===== notas dos jogadores ===== */
  .notas{margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08);
    display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center}
  .notatit{width:100%;font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;
    color:var(--ink-dim);margin-bottom:2px}
  .notachip{font-size:11.5px;padding:3px 9px;border-radius:20px;
    background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07)}
  .notachip b{margin-left:4px;color:#8fd0ff}
  .notachip.top b{color:#7fe3a0}

  /* ===== gols de uma partida ===== */
  .golinha{display:flex;align-items:center;gap:7px;font-size:13px;padding:3px 0 3px 8px;
    border-left:3px solid transparent}
  .golinha.meu{border-left-color:#34d399}
  .golinha.meu b{color:#7fe3a0}
  .golinha.dele{border-left-color:rgba(255,255,255,.14);opacity:.85}
  .golmin{min-width:30px;font-size:11.5px;color:var(--ink-dim);font-weight:700}

  /* ===== forma recente com adversario ===== */
  .formafaixa{display:flex;align-items:center;gap:10px;flex-wrap:wrap;
    padding:9px 14px;border-top:1px solid rgba(255,255,255,.07)}
  .flabel{font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-dim)}
  .forma{display:flex;flex-wrap:wrap;gap:6px;align-items:stretch}
  .fchip{display:flex;align-items:center;gap:6px;padding:4px 9px 4px 5px;border-radius:9px;
    background:rgba(255,255,255,.05);border-left:3px solid var(--ink-dim);flex:0 0 auto}
  .fchip.fV{border-left-color:#34d399}
  .fchip.fD{border-left-color:#ef4444}
  .fchip.fE{border-left-color:#f0b429}
  .fcol{display:flex;flex-direction:column;min-width:0;line-height:1.25}
  .fchip b{font-size:12.5px;font-weight:800;white-space:nowrap}
  .fchip b em{font-style:normal;opacity:.5;margin:0 1px}
  .fchip i{font-style:normal;font-size:10.5px;color:var(--ink-dim);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

  /* ===== o seu elenco na artilharia ===== */
  .meulinha{display:flex;align-items:center;gap:10px;padding:7px 2px;
    border-bottom:1px solid rgba(255,255,255,.06)}
  .meulinha:last-child{border-bottom:0}
  .meunome{flex:1;min-width:0;display:flex;flex-direction:column}
  .meunome b{font-size:13.5px}
  .meunome span{font-size:11px;color:var(--ink-dim);white-space:nowrap;
    overflow:hidden;text-overflow:ellipsis}
  .meugols,.meuass{font-size:15px;font-weight:800;min-width:34px;text-align:right}
  .meugols{color:#7fe3a0}
  .meuass{color:#8fd0ff}
  .meugols i,.meuass i{font-style:normal;font-size:9.5px;opacity:.6;margin-left:1px}

  .avisocontrato{display:flex;flex-direction:column;gap:3px;margin:12px 0;padding:10px 14px;
    border-radius:12px;background:rgba(240,180,41,.10);border-left:4px solid #f0b429}
  .avisocontrato.urgente{background:rgba(239,68,68,.12);border-left-color:#ef4444}
  .avisocontrato b{font-size:13px;color:#ffe3a8}
  .avisocontrato.urgente b{color:#ffc9c9}
  .avisocontrato span{font-size:12px;color:var(--ink-dim)}

  /* transferencias do mundo */
  .transf{display:flex;align-items:center;gap:12px;padding:8px 10px;border-radius:10px;
    background:rgba(255,255,255,.035);margin-bottom:6px}
  .tjog{flex:1;min-width:0;display:flex;align-items:center;gap:8px}
  .tjog b{font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tjog .muted{font-size:11px;white-space:nowrap}
  .trota{display:flex;align-items:center;gap:8px}
  .tseta{color:var(--ink-mute);font-size:13px}
  .tvalor{font-size:12.5px;font-weight:800;color:#7fe3a0;min-width:90px;text-align:right}

  .compl{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 0;
    border-bottom:1px solid rgba(255,255,255,.06);font-size:13px}
  .compl:last-child{border-bottom:0}
  .compl span{color:var(--ink-dim);font-size:12px}
  .compl i{margin-left:auto;font-style:normal;font-size:11px;color:var(--ink-mute)}
  .compl.ok b{color:#7fe3a0}
  .compl.fora{opacity:.55}

  .noticia{font-size:13px;padding:7px 0 7px 12px;border-left:2px solid rgba(255,255,255,.12);
    margin-bottom:4px;color:var(--ink-dim)}
  .noticia:first-letter{text-transform:uppercase}

  /* ===== contas da rodada ===== */
  .financas{padding:14px 16px}
  .fintit{font-size:10.5px;letter-spacing:.11em;text-transform:uppercase;color:var(--ink-dim);margin-bottom:10px}
  .fingrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
  .finit{display:flex;flex-direction:column;gap:2px;padding:9px 11px;border-radius:10px;
    background:rgba(255,255,255,.04)}
  .finit span{font-size:11px;color:var(--ink-dim)}
  .finit b{font-size:15px;font-weight:800}
  .finit b.mais{color:#7fe3a0}
  .finit b.menos{color:#ff8a8a}
  .finit i{font-style:normal;font-size:10.5px;color:var(--ink-dim)}
  .finit.total{background:rgba(127,227,160,.08);border:1px solid rgba(127,227,160,.18)}
  .finalerta{margin-top:10px;padding:9px 12px;border-radius:10px;font-size:12.5px;
    background:rgba(239,68,68,.12);border-left:3px solid #ef4444;color:#ffc9c9}
  .finalerta.leve{background:rgba(240,180,41,.10);border-left-color:#f0b429;color:#ffe3a8}

  /* ===== checagem antes do jogo ===== */
  .cktit{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-dim);
    margin:12px 0 6px}
  .cklista{max-height:46vh;overflow:auto;padding-right:4px}
  .cklinha .btn.sec{padding:4px 9px;font-size:10.5px}
  .cklinha{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:7px 10px;
    border-radius:10px;margin-bottom:6px;background:rgba(255,255,255,.04);
    border-left:3px solid var(--ink-dim);font-size:13px}
  .cklinha.ruim{border-left-color:#ef4444}
  .cklinha.meia{border-left-color:#f0b429}
  .cklinha.ok{border-left-color:#34d399}
  .cklinha .muted{font-size:11.5px}
  .cklinha .btn{margin-left:auto;padding:5px 10px;font-size:11px}
  .ckvaga{font-size:10px;font-weight:800;padding:2px 6px;border-radius:6px;
    background:rgba(255,255,255,.08);color:var(--ink-dim)}

  /* ===== barra de filtros (mercado e olheiro) =====
     O Gustavo: "esse filtro me incomoda, preciso que seja mais bonito e melhor de
     visualizar". Eram trinta botõezinhos iguais numa parede. Agora: faixa por
     grupo, rótulo pequeno em cima, pílulas só onde a escolha é múltipla e menu
     onde é um número. */
  .filtros{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));
    gap:12px 18px;padding:13px 15px;border-radius:14px;margin-top:11px;
    background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)}
  .fgrupo{display:flex;flex-direction:column;gap:6px;min-width:0}
  .fgrupo.largo{grid-column:1/-1}
  .frot{font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--ink-dim);font-weight:700}
  .fpills{display:flex;flex-wrap:wrap;gap:5px}
  .fpill{padding:5px 11px;border-radius:9px;font-size:11.5px;font-weight:800;cursor:pointer;
    color:var(--ink-dim);background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
  .fpill:hover{color:var(--ink);border-color:rgba(255,255,255,.2)}
  .fpill.on{background:#7fe3a0;color:#08101a;border-color:#7fe3a0}
  .fpill.vazio{opacity:.35}
  .fpill i{font-style:normal;font-size:9.5px;opacity:.7;margin-left:5px;font-weight:700}
  .fseg{display:inline-flex;border-radius:9px;overflow:hidden;border:1px solid rgba(255,255,255,.10);
    background:rgba(255,255,255,.04);width:fit-content;max-width:100%}
  .fseg button{padding:6px 12px;font-size:11.5px;font-weight:700;cursor:pointer;color:var(--ink-dim);
    background:transparent;border:0;border-right:1px solid rgba(255,255,255,.08);white-space:nowrap}
  .fseg button:last-child{border-right:0}
  .fseg button.on{background:rgba(127,227,160,.16);color:#7fe3a0}
  .fseg button:hover:not(.on){color:var(--ink)}
  .fsel{background:#0d1626;border:1px solid #263752;color:var(--ink);border-radius:9px;
    padding:6px 10px;font-size:12px;font-family:var(--font);width:100%;max-width:220px}
  .fdupla{display:flex;gap:8px;align-items:center}
  .fdupla span{font-size:11px;color:var(--ink-dim)}

  /* ===== pastilhas do filtro ativo ===== */
  .chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:12px 0 2px}
  .chips .fl{margin:0 2px 0 0}
  .chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;
    font-size:11.5px;font-weight:700;cursor:pointer;color:#0b0f17;background:#7fe3a0;
    border:1px solid transparent}
  .chip i{font-style:normal;opacity:.65;font-size:10px}
  .chip:hover i{opacity:1}
  .chip.limpar{background:transparent;color:var(--ink-dim);border-color:rgba(255,255,255,.14)}
  .chip.limpar:hover{color:var(--ink)}
  #mktNac{background:#0d1626;border:1px solid #263752;color:var(--ink);border-radius:8px;
    padding:5px 9px;font-size:12px;font-family:var(--font);max-width:190px}

  /* ===== olheiro: a ficha da joia ===== */
  .joiacard{display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:12px;
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);margin-bottom:7px}
  .joiacard:hover{border-color:rgba(127,227,160,.35);background:rgba(127,227,160,.06)}
  .joiacard.caro{opacity:.55}
  .joiainfo{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
  .joiainfo>b{font-size:14.5px}
  .joiainfo .muted{font-size:11.5px}
  .joiabarra{position:relative;height:16px;border-radius:9px;background:rgba(255,255,255,.07);
    margin-top:5px;max-width:280px;overflow:hidden}
  .joiabarra i{display:block;height:100%;border-radius:9px;
    background:linear-gradient(90deg,#3d9bff,#7fe3a0)}
  .joiabarra em{position:absolute;left:8px;top:0;line-height:16px;font-style:normal;
    font-size:10.5px;font-weight:800;color:#06101c}
  .joiabarra b{position:absolute;right:8px;top:0;line-height:16px;font-size:10.5px;
    font-weight:800;color:#7fe3a0}
  .joialeitura{font-size:11px;color:#8fd0ff;margin-top:3px}
  .joiapreco{text-align:right;display:flex;flex-direction:column;gap:6px;align-items:flex-end}
  .joiapreco b{font-size:13px;color:#7fe3a0;white-space:nowrap}

  /* ===== olheiro ===== */
  /* O contador dentro do botao de filtro. Primeira versao ficou "bem estranha",
     nas palavras do Gustavo: numero do mesmo tamanho do texto, colado. Agora e uma
     pastilha menor, discreta, que so aparece quando ha o que contar. */
  .opt i{font-style:normal;margin-left:6px;font-size:9.5px;font-weight:800;
    padding:1px 5px;border-radius:20px;background:rgba(255,255,255,.10);
    color:var(--ink-dim);vertical-align:1px;letter-spacing:0}
  .opt.on i{background:rgba(0,0,0,.22);color:inherit;opacity:.75}
  .opt.vazio{opacity:.45}
  .scresumo{margin:10px 0 2px;padding:8px 11px;border-radius:10px;font-size:12.5px;
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)}
  .scresumo b{color:#7fe3a0}

  /* ===== abas de copa e fases ===== */
  .copabas{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
  .copaba{display:flex;align-items:center;gap:6px;padding:6px 11px;border-radius:20px;
    font-size:12px;font-weight:700;color:var(--ink-dim);cursor:pointer;
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
  .copaba:hover{color:var(--ink)}
  .copaba.vivo{color:#7fe3a0;border-color:rgba(127,227,160,.3)}
  .copaba.fim{opacity:.6}
  .copaba.on{background:var(--ink);color:#0b0f17;border-color:var(--ink)}
  .copaba.on svg,.copaba.on img{filter:none}
  .fasesbar{display:flex;flex-wrap:wrap;gap:5px;margin:12px 0 8px}
  .fasebt{padding:5px 10px;border-radius:8px;font-size:11.5px;font-weight:700;
    cursor:pointer;color:var(--ink-dim);background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.08)}
  .fasebt:hover{color:var(--ink)}
  .fasebt.on{background:rgba(127,227,160,.14);color:#7fe3a0;border-color:rgba(127,227,160,.35)}
  .fasebt.prelim{margin-left:auto;opacity:.7;font-weight:600}

  /* ===== historico ===== */
  .histnums{display:flex;gap:22px;flex-wrap:wrap;margin:2px 0 14px;
    padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.08)}
  .histnums div{display:flex;flex-direction:column}
  .histnums b{font-family:var(--font-head,inherit);font-size:26px;line-height:1.1}
  .histnums span{font-size:11px;color:var(--ink-dim);text-transform:uppercase;letter-spacing:.08em}
  .vitr{display:flex;flex-wrap:wrap;gap:10px}
  .vitrpeca{display:flex;flex-direction:column;align-items:center;gap:4px;width:104px;
    padding:10px 6px;border-radius:12px;background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.07);text-align:center}
  .vitrpeca b{font-size:11px;line-height:1.25}
  .vitrpeca i{font-style:normal;font-size:11px;color:#f5c518;font-weight:800}
  .histano{display:flex;align-items:center;gap:12px;padding:9px 2px;
    border-bottom:1px solid rgba(255,255,255,.06)}
  .histano:last-child{border-bottom:0}
  .histpos{font-family:var(--font-head,inherit);font-size:20px;font-weight:900;
    min-width:44px;text-align:center;color:var(--ink-dim)}
  .histpos.bom{color:#7fe3a0}
  .histpos.ouro{color:#f5c518}
  .histmeio{flex:1;font-size:13px}
  .histmeio .muted{font-size:11.5px}
  .histtacas{display:flex;gap:4px}

  .clube.trancado{opacity:.42;cursor:not-allowed;filter:grayscale(.7)}
  .clube.trancado .forca i{background:#64748b}

  /* ===== energia e arrastar na escalacao ===== */
  .xiener{display:flex;align-items:center;gap:6px;margin:4px 0 2px}
  .enbar{flex:1;max-width:120px;height:5px;border-radius:4px;overflow:hidden;
    background:rgba(255,255,255,.10);display:block}
  .enbar i{display:block;height:100%;background:#5fd08a;border-radius:4px}
  .enbar.meia i{background:#f0b429}
  .enbar.crit i{background:#ef4444}
  .xiener .ener{font-size:11px;color:var(--ink-dim)}
  .xiener .ener.baixa{color:#f0b429}
  .xi[draggable="true"],.banco[draggable="true"]{cursor:grab}
  .xi.arrastando,.banco.arrastando{opacity:.4}
  .banco.indisp{opacity:.55}
  .xi.alvo{outline:2px dashed #5fd08a;outline-offset:2px;background:rgba(95,208,138,.08)}
  .dicadrag{float:right;font-style:normal;font-size:10.5px;color:var(--ink-dim);
    text-transform:none;letter-spacing:0}

  .evogrid{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 2px}
  .evotit{width:100%;font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-dim)}
  .evochip{font-size:11.5px;padding:3px 9px;border-radius:20px;background:rgba(255,255,255,.05);
    border:1px solid rgba(255,255,255,.07)}
  .evochip.up b{color:#7fe3a0;margin-left:4px}
  .evochip.down b{color:#ff8a8a;margin-left:4px}

  /* ===== fim de temporada ===== */
  .fimtemp{border-color:#3a8f5a}
  .fimtopo{display:flex;align-items:center;gap:14px;padding:0 0 12px;margin-bottom:10px;
    border-bottom:1px solid rgba(255,255,255,.08)}
  .fimpos{font-family:var(--font-head,inherit);font-size:36px;line-height:1;font-weight:900;
    min-width:62px;text-align:center;color:#7fe3a0}
  .fimtopo.ruim .fimpos{color:#ef4444}
  .fimtopo b{display:block;font-size:16px}
  .fimtopo span{font-size:12px;color:var(--ink-dim)}
  .fimtit{margin-left:auto;display:flex;gap:5px}
  .fimlinha{padding:4px 0;font-size:13.5px}
  .fimlinha.ok{color:#7fe3a0}
  .fimlinha.muted{color:var(--ink-dim);font-size:12.5px}
  .fimmundo{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px}
  .fimmundo span{font-size:11.5px;padding:3px 8px;border-radius:20px;
    background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07)}
  .fimmais{margin-top:8px}
  .fimmais summary{cursor:pointer;color:#8ea3c4;font-size:12px;letter-spacing:.05em}
  .fimrodape{display:flex;align-items:center;justify-content:space-between;gap:12px;
    flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.08)}
  .fimrodape .muted{font-size:11.5px;max-width:330px}

  /* ===== artilharia ===== */
  .artgrid{display:grid;grid-template-columns:1fr 1fr;gap:22px}
  @media (max-width:720px){ .artgrid{grid-template-columns:1fr} }
  .artcab{font-family:var(--cond,inherit);letter-spacing:.18em;text-transform:uppercase;
    font-size:11px;color:var(--ink-dim);padding:0 0 8px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:4px}
  .artlinha{display:flex;align-items:center;gap:9px;padding:7px 8px;border-radius:9px}
  .artlinha:nth-child(even){background:rgba(255,255,255,.022)}
  .artlinha.meu{background:rgba(127,227,160,.10);box-shadow:inset 2px 0 0 #7fe3a0}
  .artlinha.lider .artnome b{font-size:15px}
  .artpos{width:17px;text-align:right;font-size:11.5px;color:var(--ink-dim);font-variant-numeric:tabular-nums}
  .artnome{flex:1;min-width:0;line-height:1.15}
  .artnome b{display:block;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .artnome span{font-size:10.5px;color:var(--ink-dim)}
  .artbarra{width:52px;height:4px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden;flex:none}
  .artbarra i{display:block;height:100%;border-radius:3px}
  .artnum{width:24px;text-align:right;font-size:15px;font-variant-numeric:tabular-nums}
  .cnav{display:flex; gap:5px; flex-wrap:wrap;}
  .cnav button{
    font-family:var(--font-head); text-transform:uppercase; letter-spacing:.07em;
    background:linear-gradient(180deg,#2a2d33,#1c1e23); color:#b6b9c0;
    border:1px solid #34373e; border-radius:9px; padding:8px 13px;
    font-weight:800; font-size:12.5px; cursor:pointer;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.07); transition:.12s;
  }
  .cnav button:hover{color:#fff; border-color:var(--line-hot);}
  /* A NAVEGAÇÃO. Sem caixa e sem emoji ("não coloca emojis, fica horrível"): só o
     nome, e a aba em que você está marcada por um traço da cor do clube embaixo —
     é como um placar de transmissão separa as seções. */
  .cnav{gap:2px; align-items:center}
  .cnav button{background:transparent; border:0; border-radius:0; box-shadow:none;
    padding:9px 11px 8px; font-size:12px; letter-spacing:.06em; color:var(--ink-mute);
    border-bottom:2px solid transparent;}
  .cnav button:hover{color:var(--ink); background:rgba(255,255,255,.04)}
  .cnav button.active{color:var(--ink); border-bottom-color:var(--clube1); background:transparent;}
  .cnavsep{width:1px; height:18px; background:rgba(255,255,255,.12); margin:0 6px; align-self:center}
  .cnav .btn.sec{border:1px solid rgba(255,255,255,.12); border-radius:8px; padding:6px 11px;
    font-size:11.5px; background:rgba(255,255,255,.04); color:var(--ink-dim)}
  .cnav .btn.sec:hover{color:var(--ink)}
  .cnav button.play{
    background:var(--clube1) !important; color:var(--clubetxt) !important;
    border:0 !important; border-radius:8px !important; padding:7px 16px !important;
    box-shadow:0 8px 20px -10px var(--clube1) !important;
  }
  .play{
    background:linear-gradient(180deg,#ffffff,var(--gold) 58%,#9fa3ab) !important;
    color:var(--gold-dark) !important; border-color:var(--gold) !important;
  }
${PARTS}
  /* ---------- criar jogador: posição e camisa ---------- */
  .posgrid{display:grid; grid-template-columns:repeat(3,1fr); gap:8px;}
  .poscard{display:flex; flex-direction:column; align-items:center; gap:3px; cursor:pointer;
    padding:13px 8px; border-radius:11px; border:1px solid var(--line); color:var(--ink);
    background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.01)); transition:.13s;}
  .poscard b{font-family:var(--font-head); font-size:19px; letter-spacing:.06em;}
  .poscard span{font-size:10.5px; color:var(--ink-dim); text-align:center; line-height:1.25;}
  .poscard:hover{border-color:var(--line-hot);}
  .poscard.on{background:linear-gradient(180deg,#ffffff,#d7d9df); border-color:#fff;}
  .poscard.on b, .poscard.on span{color:#101114;}
  .camisas{display:flex; gap:7px; flex-wrap:wrap;}
  .camisa{width:44px; height:44px; border-radius:10px; cursor:pointer; border:1px solid var(--line);
    background:rgba(255,255,255,.04); color:var(--ink); font-family:var(--font-head);
    font-size:16px; font-weight:800; transition:.13s;}
  .camisa:hover{border-color:var(--line-hot);}
  .camisa.on{background:#fff; color:#101114; border-color:#fff;}

  .grid8{display:grid; grid-template-columns:repeat(auto-fill,minmax(228px,1fr)); gap:10px;}

  /* ---------- seleção país → liga → clube (estilo FIFA) ---------- */
  .paises{display:grid; grid-template-columns:repeat(auto-fill,minmax(168px,1fr)); gap:10px;}
  .pais{
    display:flex; flex-direction:column; align-items:center; gap:3px; cursor:pointer;
    padding:16px 10px; border-radius:13px; color:var(--ink); font-family:var(--font);
    background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.015));
    border:1px solid var(--line); transition:.15s;
  }
  .pais:hover{border-color:var(--acc); transform:translateY(-3px); box-shadow:0 14px 28px -16px var(--acc-glow);}
  .pais .flag{font-size:38px; line-height:1.1; filter:drop-shadow(0 3px 6px rgba(0,0,0,.5));}
  .pais .pnome{font-family:var(--font-head); font-weight:800; font-size:15px; letter-spacing:.03em; text-align:center;}

  .ligas{display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:10px;}
  .liga{
    position:relative; display:flex; flex-direction:column; align-items:flex-start; gap:3px;
    cursor:pointer; padding:15px 15px 15px 22px; border-radius:13px; text-align:left;
    color:var(--ink); font-family:var(--font); overflow:hidden;
    background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.015));
    border:1px solid var(--line); transition:.15s;
  }
  .liga:hover{border-color:var(--acc); transform:translateY(-2px);}
  .liga .tierbar{position:absolute; left:0; top:0; bottom:0; width:6px;}
  .liga.t1 .tierbar{background:linear-gradient(180deg,#ffffff,#b9bcc4);}
  .liga.t2 .tierbar{background:linear-gradient(180deg,#cfd8e3,#8a97a8);}
  .liga.t3 .tierbar{background:linear-gradient(180deg,#d8a06a,#a8703a);}
  .liga.t4 .tierbar{background:linear-gradient(180deg,#5d7290,#3a4a63);}
  .liga .lnome{font-family:var(--font-head); font-weight:800; font-size:17px; letter-spacing:.03em;}

  .clubes{display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px;}
  .clube{
    display:grid; grid-template-columns:auto 1fr; grid-template-rows:auto auto auto;
    column-gap:11px; row-gap:2px; align-items:center; cursor:pointer; text-align:left;
    padding:12px; border-radius:13px; color:var(--ink); font-family:var(--font);
    background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.015));
    border:1px solid var(--line); transition:.15s;
  }
  .clube:hover{border-color:var(--acc); transform:translateY(-2px); box-shadow:0 14px 28px -16px var(--acc-glow);}
  .clube > span:first-child{grid-row:1 / span 3;}
  .clube .cnome{font-family:var(--font-head); font-weight:800; font-size:16px; letter-spacing:.02em;}
  .clube .forca{height:5px; border-radius:3px; background:rgba(255,255,255,.10); overflow:hidden;}
  .clube .forca i{display:block; height:100%; background:linear-gradient(90deg,#7a7d85,#e6e8ec);}

  /* ---------- copa ---------- */
  .cuptop{display:flex; align-items:center; gap:13px; margin-bottom:12px;}
  .cupnow{display:flex; align-items:center; gap:11px; flex-wrap:wrap; margin-bottom:11px;}
  .cupnow .fase{
    font-family:var(--font-head); text-transform:uppercase; letter-spacing:.09em; font-size:13px;
    font-weight:800; color:var(--gold-dark); padding:5px 13px; border-radius:999px;
    background:linear-gradient(180deg,#ffffff,#b9bcc4); box-shadow:0 0 18px -5px rgba(255,255,255,.7);
  }
  .cupwin{display:flex; align-items:center; gap:16px; padding:14px; border-radius:14px; margin-bottom:12px;
    background:linear-gradient(120deg,rgba(255,255,255,.14),transparent); border:1px solid rgba(255,255,255,.3);}
  .chips{display:flex; flex-wrap:wrap; gap:7px;}
  .chip{
    display:inline-flex; align-items:center; gap:6px; padding:5px 11px 5px 6px; border-radius:999px;
    background:rgba(255,255,255,.05); border:1px solid var(--line); font-size:13px;
  }
  .chip.eu{border-color:var(--acc); background:rgba(43,224,122,.14); font-weight:800;}
  .chip.venceu{border-color:rgba(255,255,255,.5);}
  .fase-bloco{margin-top:14px;}
  .fase-tit{
    font-family:var(--font-head); text-transform:uppercase; letter-spacing:.09em; font-size:11.5px;
    color:var(--ink-dim); font-weight:800; padding-bottom:5px; margin-bottom:7px;
    border-bottom:1px solid var(--line);
  }
  .confronto{
    display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:10px;
    padding:6px 4px; border-radius:8px;
  }
  .confronto:hover{background:rgba(255,255,255,.03);}
  .confronto .lado{opacity:.55;}
  .confronto .lado.venceu{opacity:1;}
  .confronto .lado:last-child{text-align:right;}
  .confronto .placar{
    font-family:var(--font-head); font-weight:800; font-size:16px; min-width:74px; text-align:center;
    font-variant-numeric:tabular-nums;
  }
  .confronto .placar em{color:var(--ink-dim); font-style:normal; margin:0 2px;}
  .confronto .placar i{font-size:10px; color:var(--gold); font-style:normal;}

  /* ---------- classificação ---------- */
  .ligatop{display:flex; align-items:flex-end; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:11px;}
  .ligatop select{
    background:#0d1626; color:var(--ink); border:1px solid #263752; border-radius:9px;
    padding:9px 12px; font-family:var(--font); font-size:14px; min-width:220px;
  }
  .legendas{display:flex; gap:14px; flex-wrap:wrap; margin-bottom:9px;}
  .leg{font-size:11.5px; color:var(--ink-dim); display:inline-flex; align-items:center; gap:6px;}
  .leg::before{content:''; width:10px; height:10px; border-radius:3px; display:inline-block;}
  .leg.sobe::before{background:var(--acc);}
  .leg.copa::before{background:var(--blue);}
  .leg.cai::before{background:var(--red);}
  table.classif td{padding:9px 10px;}
  table.classif .posn{width:34px; color:var(--ink-dim); font-variant-numeric:tabular-nums;}
  table.classif .clubcel{display:flex; align-items:center; gap:9px; text-align:left; font-weight:600;}
  table.classif tr.sobe .posn{box-shadow:inset 3px 0 0 var(--acc); color:var(--acc); font-weight:800;}
  table.classif tr.copa .posn{box-shadow:inset 3px 0 0 var(--blue); color:#9fd0ff;}
  table.classif tr.cai .posn{box-shadow:inset 3px 0 0 var(--red); color:#ff9aa2; font-weight:800;}
  table.classif tr.cai td{background:rgba(255,77,90,.07);}
  /* TABELA COM CARA DE JOGO NOVO: linhas alternadas, destaque no seu clube com a
     cor dele, números tabulares e realce ao passar o mouse. */
  table.classif{width:100%; border-collapse:separate; border-spacing:0 2px;}
  table.classif thead th{font-size:10.5px; letter-spacing:.09em; text-transform:uppercase;
    color:var(--ink-mute); font-weight:700; padding:6px 8px; text-align:center;}
  table.classif thead th:nth-child(2){text-align:left;}
  table.classif tbody tr{background:rgba(255,255,255,.022);}
  table.classif tbody tr:nth-child(even){background:rgba(255,255,255,.045);}
  table.classif tbody tr:hover{background:rgba(120,190,255,.10);}
  table.classif tbody td{text-align:center; font-variant-numeric:tabular-nums;}
  table.classif tbody td:nth-child(2){text-align:left;}
  table.classif tbody tr td:first-child{border-radius:8px 0 0 8px;}
  table.classif tbody tr td:last-child{border-radius:0 8px 8px 0;}
  table.classif tr.me td{background:color-mix(in srgb,var(--clube1) 16%, transparent); font-weight:800;}
  table.classif tr.me td:first-child{box-shadow:inset 3px 0 0 var(--clube1);}
  @supports not (color: color-mix(in srgb, red, blue)) {
    table.classif tr.me td{background:rgba(255,255,255,.10);}
  }

  /* ---------- pop-up da final e resumo do mundo ---------- */
  /* z-index 85: ACIMA da tela de partida (.aovivo, 78). Estava em 75, ou seja,
     ATRÁS dela — o pop-up do intervalo era criado, ficava invisível e sem clique,
     e a partida travava esperando para sempre uma resposta impossível de dar.
     Foi o travamento no intervalo que o Gustavo relatou. */
  .cov{position:fixed; inset:0; z-index:85; background:rgba(4,7,15,.9); display:flex;
    align-items:center; justify-content:center; padding:18px; backdrop-filter:blur(4px);}
  .ccard{background:var(--panel-solid); border:1px solid rgba(255,255,255,.4); border-radius:18px;
    padding:26px; max-width:520px; width:100%; text-align:center; color:var(--ink);
    box-shadow:0 30px 80px -30px #000, 0 0 60px -30px rgba(255,255,255,.5);}
  .ccard h3{font-family:var(--font-head); text-transform:uppercase; letter-spacing:.08em;
    font-size:20px; margin-bottom:4px;}
  .mundo{margin-top:12px; padding-top:11px; border-top:1px solid var(--line);}
  .mundo-tit{font-family:var(--font-head); text-transform:uppercase; letter-spacing:.09em;
    font-size:11px; color:var(--ink-dim); margin-bottom:7px;}
  .mundo-ligas{display:flex; flex-wrap:wrap; gap:5px; margin-top:6px;}
  .mundo-ligas .stat{font-size:12px; padding:5px 9px; margin:0;}

  /* ---------- mercado de transferências ---------- */
  .mkttop{display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:12px;}
  .caixa{
    display:flex; flex-direction:column; align-items:flex-end; font-size:11px; color:var(--ink-dim);
    text-transform:uppercase; letter-spacing:.09em; font-family:var(--font-head);
  }
  .caixa b{font-size:20px; color:var(--acc); letter-spacing:0; text-transform:none;}
  #buscaPais{margin-bottom:12px}
  #buscaPais,
  #mktBusca{
    width:100%; background:#0d1626; border:1px solid #263752; color:var(--ink);
    border-radius:10px; padding:11px 14px; font-size:15px; font-family:var(--font);
  }
  #buscaPais:focus,
  #mktBusca:focus{outline:none; border-color:var(--acc); box-shadow:0 0 0 3px var(--acc-glow);}
  .mktfiltros{display:flex; flex-wrap:wrap; gap:16px; margin-top:11px;}
  .mktfiltros > div{display:flex; align-items:center; gap:5px; flex-wrap:wrap;}
  .fl{
    font-family:var(--font-head); text-transform:uppercase; letter-spacing:.09em;
    font-size:10.5px; color:var(--ink-dim); margin-right:3px;
  }
  .jlista{display:flex; flex-direction:column; gap:5px; max-height:520px; overflow:auto; padding-right:4px;}
  .jog{
    display:grid; grid-template-columns:auto 1fr auto auto auto auto; align-items:center; gap:11px;
    padding:8px 11px; border-radius:10px; background:rgba(255,255,255,.035);
    border:1px solid transparent; transition:.12s;
  }
  /* a linha do olheiro tem uma coluna a mais (o teto), senao o botao cai de linha */
  .jog.joia{grid-template-columns:auto 1fr auto auto auto auto auto}
  .jog:hover{background:rgba(61,155,255,.09); border-color:var(--line);}
  .jog.caro{opacity:.5;}
  .jinfo{display:flex; flex-direction:column; min-width:0;}
  .jinfo b{font-size:14.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .liga-tag{
    display:inline-block; padding:1px 6px; border-radius:5px; font-size:10px;
    background:rgba(61,155,255,.16); color:#a9d3ff; margin-left:4px;
  }
  .forcanum{
    font-family:var(--font-head); font-weight:800; font-size:19px; min-width:34px;
    text-align:center; font-variant-numeric:tabular-nums;
  }
  .preco{
    font-family:var(--font-head); font-size:13px; color:var(--ink-dim);
    min-width:120px; text-align:right; font-variant-numeric:tabular-nums;
  }
  .jog button:disabled{filter:grayscale(1) brightness(.6); cursor:not-allowed;}

  /* ---------- partida ao vivo ---------- */
  .aovivo{position:fixed; inset:0; z-index:78; display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:13px; padding:20px; color:var(--ink);
    font-family:var(--font); overflow:auto;
    background:radial-gradient(900px 500px at 50% 20%, rgba(43,224,122,.10), transparent 60%),
      linear-gradient(170deg,#08101f,#04070f 75%);}
  /* O PLACAR. O Gustavo: "a tela de dirigir a partida pode ficar mais bonita, ta
     feia". Virou um painel de transmissao: um cartao so, com o relogio dentro, os
     escudos grandes e o placar no meio. */
  .avtop{display:flex; align-items:center; justify-content:center; gap:22px; flex-wrap:wrap;
    width:min(620px,92vw); padding:16px 20px; border-radius:16px;
    background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02));
    border:1px solid rgba(255,255,255,.10); box-shadow:0 18px 40px -26px #000;}
  .avtime{display:flex; align-items:center; gap:11px; font-family:var(--font-head);
    font-weight:800; font-size:19px; letter-spacing:.03em;}
  .avtime.dir{flex-direction:row;}
  .avplacar{text-align:center; min-width:150px;}
  .avplacar b{display:block; font-family:var(--font-head); font-size:52px; font-weight:800; line-height:1;
    font-variant-numeric:tabular-nums;}
  .avplacar span{display:inline-block; margin-top:6px; color:#0b0f17; background:var(--acc);
    font-family:var(--font-head); font-size:13px; font-weight:800; padding:2px 10px;
    border-radius:20px; letter-spacing:.05em;}
  .avtime{flex:1; min-width:0; justify-content:flex-end;}
  .avtime.dir{justify-content:flex-start;}
  .avtime span{white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:150px;}
  .avonde{font-size:11.5px; letter-spacing:.09em; text-transform:uppercase; color:var(--ink-dim);
    margin-top:-6px}
  .avclassico{font-family:var(--font-head); letter-spacing:.12em; text-transform:uppercase;
    font-size:12px; color:var(--gold); padding:4px 14px; border-radius:999px;
    background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.3);}
  .avbarra{width:min(620px,92vw); height:7px; border-radius:4px; background:rgba(255,255,255,.09); overflow:hidden;}
  .avbarra i{display:block; height:100%; width:0; background:linear-gradient(90deg,var(--acc),var(--blue));}
  .avstats{display:flex; flex-direction:column; gap:5px; width:min(620px,92vw);}
  .avst{display:grid; grid-template-columns:60px 1fr 60px; align-items:center; font-size:13px;
    padding:5px 10px; border-radius:8px; background:rgba(255,255,255,.035);}
  .avst b{font-family:var(--font-head); font-size:16px; font-variant-numeric:tabular-nums;}
  .avst b:last-child{text-align:right;}
  .avst span{text-align:center; color:var(--ink-dim); font-size:11.5px;
    text-transform:uppercase; letter-spacing:.08em;}
  .avfeed{width:min(620px,92vw); min-height:96px; max-height:210px; overflow:auto; font-size:14px;
    background:rgba(0,0,0,.30); border:1px solid rgba(255,255,255,.07);
    border-radius:14px; padding:12px 14px; line-height:1.7;}
  .avfeed:empty::before{content:'A bola vai rolar…'; color:var(--ink-dim); font-size:13px;}
  .avfeed .golinha{padding:4px 0 4px 9px}
  .avbarra{position:relative}
  .avbarra::after{content:''; position:absolute; left:50%; top:-3px; width:1px; height:13px;
    background:rgba(255,255,255,.25)}
  .avdec{color:#d7d9df;}
  .avgrave{color:var(--red); font-weight:700;}
  .avbotoes{display:flex; gap:9px; flex-wrap:wrap; justify-content:center;
    width:min(620px,92vw);}
  .avbotoes .btn{flex:1; min-width:150px}
  .avfim{text-align:center;}
  .avfim b{font-family:var(--font-head); letter-spacing:.1em; font-size:15px;}
  .avfimplacar{font-family:var(--font-head); font-size:27px; font-weight:800; margin:5px 0 12px;}

  /* ---------- olheiro, lesão e evolução ---------- */
  .tetonum{font-family:var(--font-head); font-weight:800; font-size:15px; min-width:74px;
    text-align:center; color:var(--acc);}
  .tetonum i{font-style:normal; font-size:10.5px; color:var(--ink-dim); margin-left:3px;}
  .lesao{display:inline-block; margin-left:7px; padding:1px 7px; border-radius:5px; font-size:10.5px;
    background:rgba(255,77,90,.16); color:#ff9aa2;}
  .evo{display:inline-block; margin-left:6px; font-size:10.5px; font-weight:800;}
  .evo.up{color:var(--acc);} .evo.down{color:var(--red);}
  .classico{display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:12px;
    margin-bottom:11px; background:linear-gradient(100deg,rgba(255,255,255,.15),transparent);
    border:1px solid rgba(255,255,255,.35);}
  .classico b{font-family:var(--font-head); letter-spacing:.05em; font-size:16px;}

  /* ---------- agenda ---------- */
  .agjogo{display:flex; align-items:center; gap:9px; text-align:left;}
  .ondeC,.ondeF{font-family:var(--font-head); font-size:9.5px; letter-spacing:.09em; font-weight:800;
    padding:2px 6px; border-radius:4px;}
  .ondeC{background:rgba(43,224,122,.18); color:var(--acc);}
  .ondeF{background:rgba(61,155,255,.18); color:#9fd0ff;}
  
  /* ===== painel do clube: a COR DO CLUBE toma conta da tela ===== */
  .idclube{border:1px solid var(--linha,rgba(255,255,255,.10));border-radius:16px;overflow:hidden;margin-bottom:12px}
  .idfaixa{height:5px;background:linear-gradient(90deg,var(--cor) 0 62%,var(--cor2) 62% 100%)}
  .idclube{position:relative}
  .idcorpo{position:relative;display:flex;align-items:center;gap:20px;padding:26px 26px;
    background:
      radial-gradient(120% 160% at 100% 0%, rgba(255,255,255,.07), transparent 58%),
      linear-gradient(165deg,
        color-mix(in srgb, var(--cor) 72%, #0a0e16),
        color-mix(in srgb, var(--cor) 30%, #080b12))}
  /* o escudo gigante, bem apagado, atrás de tudo: é o que faz a tela ser DO clube */
  .idcorpo::after{content:'';position:absolute;right:14px;top:50%;transform:translateY(-50%);
    width:215px;height:215px;background:var(--marca) center/contain no-repeat;
    opacity:.08;pointer-events:none;filter:grayscale(.2)}
  .idquem b{text-shadow:0 2px 12px rgba(0,0,0,.5)}
  .idcorpo svg,.idcorpo img{filter:drop-shadow(0 6px 14px rgba(0,0,0,.6))}
  .idquem b{display:block;font-family:var(--cond,inherit);font-size:42px;letter-spacing:.012em;line-height:.98}
  .idquem span{color:#8ea3c4;font-size:12px;letter-spacing:.10em;text-transform:uppercase}
  .idcaixa{margin-left:auto;text-align:right}
  .idcaixa i{display:block;color:#8ea3c4;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;font-style:normal}
  .idcaixa b{font-family:var(--cond,inherit);font-size:27px;letter-spacing:.01em}
  .idcaixa i{margin-bottom:3px}

  /* ===== o jogo da rodada, enquadrado como transmissao ===== */
  .jogocard{position:relative;border:1px solid rgba(255,255,255,.10);border-radius:18px;overflow:hidden;
    margin-bottom:14px;
    background:
      linear-gradient(100deg,
        color-mix(in srgb, var(--cor) 46%, #0b1018), #0b1018 50%,
        color-mix(in srgb, var(--cor2, #3d9bff) 34%, #0b1018));
    box-shadow:0 26px 54px -32px #000}
  .jogotopo{display:flex;align-items:center;gap:10px;padding:11px 18px;
    border-bottom:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.03)}
  .jogotopo b{font-family:var(--cond,inherit);font-size:12.5px;letter-spacing:.18em;text-transform:uppercase}
  .jogotopo span{margin-left:auto;color:#8ea3c4;font-size:11.5px;text-align:right}
  .duelo{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:18px;padding:26px 22px 20px}
  .duelo .lado{display:flex;align-items:center;gap:14px;min-width:0}
  .duelo .lado.dir{flex-direction:row-reverse;text-align:right}
  .duelo .lado b{font-family:var(--cond,inherit);font-size:22px;line-height:1.1;display:block;
    overflow:hidden;text-overflow:ellipsis}
  .duelo .lado i{font-style:normal;color:#8ea3c4;font-size:10.5px;letter-spacing:.14em}
  .vs{font-family:var(--cond,inherit);font-size:12.5px;letter-spacing:.2em;color:#9fb0cc;
    background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);
    border-radius:999px;padding:8px 14px}
  /* as pastilhas antigas (so a letra) ainda servem quando nao ha detalhe do jogo */
  .forma s{width:19px;height:19px;border-radius:5px;display:grid;place-items:center;font-size:10.5px;
    font-weight:900;text-decoration:none;color:#04121f}
  .forma s.fV{background:#34d399} .forma s.fE{background:#94a3b8} .forma s.fD{background:#f43f5e}
  .jogotat{padding:0 20px 14px;color:#8ea3c4;font-size:12.5px}

  /* ===== um botao principal, nao seis ===== */
  .jogarbarra{display:flex;gap:12px;padding:4px 22px 18px}
  /* O botão de jogar: degradê da cor do clube com brilho embaixo, como na proposta. */
  .btnjogo{flex:1;border:0;border-radius:13px;padding:15px;font-family:var(--cond,inherit);font-size:14.5px;
    letter-spacing:.13em;text-transform:uppercase;cursor:pointer;color:var(--cortxt,#04121f);
    /* usa a cor SEGURA do clube (o preto do Corinthians sumia no botão) */
    color:var(--clubetxt);
    background:linear-gradient(180deg,var(--clube1),color-mix(in srgb,var(--clube1) 66%,#000));
    box-shadow:0 16px 30px -16px var(--clube1), inset 0 1px 0 rgba(255,255,255,.34);
    transition:transform .1s, box-shadow .15s}
  .btnjogo:hover{box-shadow:0 20px 34px -14px var(--clube1), inset 0 1px 0 rgba(255,255,255,.4)}
  .btnjogo:active{transform:translateY(2px)}
  .btnjogo:disabled{opacity:.4;cursor:default}
  .btnjogo.sec{flex:0 0 34%;background:transparent;color:#e6edf7;
    border:1px solid rgba(255,255,255,.16);box-shadow:none}
  .maisjeitos{padding:0 20px 16px;margin-top:-6px}
  .maisjeitos summary{cursor:pointer;color:#8ea3c4;font-size:12px;letter-spacing:.06em}
  .maisgrid{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}

  /* ===== tabela dentro do painel ===== */
  .tabmini table{width:100%}
  .tabclube{display:flex;align-items:center;gap:8px}
  .tabclube span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

  /* ===== mesa de negociacao ===== */
  .mesa{border-color:rgba(94,200,255,.35)}
  .negpedido{font-size:15px;margin-bottom:12px}
  .negpedido b{font-family:var(--cond,inherit);font-size:21px}
  .negbotoes{display:flex;gap:8px;flex-wrap:wrap}
  .negresp{margin-top:13px;padding:12px 14px;border-radius:11px;
    border:1px solid color-mix(in srgb,var(--c) 45%,transparent);
    background:color-mix(in srgb,var(--c) 12%,transparent)}
  .negresp b{display:block;color:var(--c);font-family:var(--cond,inherit);font-size:14px;
    letter-spacing:.10em;text-transform:uppercase;margin-bottom:5px}
  .negresp span{display:block;font-size:13.5px;line-height:1.55}
  .negresp .btn{margin-top:10px}

  /* ===== o mundo se mexendo ===== */
  .rumor{display:flex;gap:11px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08);
    font-size:13.5px;line-height:1.5}
  .rumor:last-child{border-bottom:0}
  .rumor em{font-style:normal;font-family:var(--cond,inherit);font-size:9.5px;letter-spacing:.13em;
    padding:3px 7px;border-radius:5px;height:fit-content;white-space:nowrap;
    background:#38bdf8;color:#04121f}
  .rumor em.q{background:#f59e0b;color:#1a1200}
  .subcard{max-width:760px;width:94vw}
  .subcols{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}
  .subcols h3{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8ea3c4;margin-bottom:7px}
  .sublista{max-height:44vh;overflow-y:auto;display:flex;flex-direction:column;gap:5px}
  .subjog{display:flex;align-items:center;gap:9px;width:100%;text-align:left;cursor:pointer;
    background:#0b1220;border:1px solid rgba(255,255,255,.10);border-radius:9px;padding:7px 9px;color:#e6edf7}
  .subjog.on{border-color:#5ec8ff;background:rgba(94,200,255,.12)}
  .subnome{flex:1;font-size:13px;font-weight:700}
  .subnome i{display:block;font-style:normal;font-size:11px;color:#8ea3c4;font-weight:500;margin-top:1px}
  .subrod{display:flex;align-items:center;gap:9px}
  .subrod .muted{flex:1;font-size:12.5px}
  .opdec{display:block;text-align:left;padding:12px 14px}
  .opdec b{display:block;font-size:14px}
  .opdec i{display:block;font-style:normal;font-size:11.5px;color:#8ea3c4;margin-top:3px}
  .avisopos{margin:0 20px 12px;padding:10px 13px;border-radius:10px;
    border:1px solid rgba(255,154,60,.35);background:rgba(255,154,60,.08);font-size:12.5px}
  .avisopos b{display:block;color:#ff9a3c;font-family:var(--cond,inherit);font-size:11.5px;
    letter-spacing:.12em;text-transform:uppercase;margin-bottom:5px}
  .avisopos span{display:block;color:#c9d6ea;line-height:1.5}
  .forapos{font-size:10px;font-weight:800;color:#ff9a3c;border:1px solid rgba(255,154,60,.35);
  border-radius:5px;padding:1px 5px;white-space:nowrap}
.agcomp{font-size:11px;letter-spacing:.4px;text-transform:uppercase;opacity:.62;
  border:1px solid rgba(255,255,255,.14);border-radius:5px;padding:2px 7px;margin-left:8px}
.agcopa{display:inline-block; padding:3px 9px; border-radius:999px; font-size:11.5px;
    background:rgba(255,255,255,.14); color:#ffe08a; border:1px solid rgba(255,255,255,.28); margin:2px;}

  /* ---------- loja em níveis e pódio da Bola de Ouro ---------- */
  .niveis{display:inline-flex; gap:3px; margin-left:6px; vertical-align:middle;}
  .niv{width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,.16);}
  .niv.on{background:var(--acc); box-shadow:0 0 6px var(--acc-glow);}
  .prop.off{opacity:.45; cursor:default;}
  .prop.sel{border-color:#e6e8ec; background:rgba(255,255,255,.10);}
  .prop .marca{font-size:19px; color:#e6e8ec; width:20px; text-align:center;}
  .joia{display:inline-block; font-family:var(--font-head); font-size:9.5px; letter-spacing:.12em;
    padding:2px 7px; border-radius:4px; background:#e6e8ec; color:#0f1013; margin-left:6px;}
  .prop.off:hover{border-color:var(--line); transform:none;}
  .podio{display:flex; flex-direction:column; gap:7px; margin-top:12px;}
  .pod{display:flex; align-items:center; gap:11px; text-align:left; padding:10px 12px;
    border-radius:11px; background:rgba(255,255,255,.04); border:1px solid var(--line);}
  .pod.p1{background:linear-gradient(100deg,rgba(255,255,255,.16),transparent); border-color:rgba(255,255,255,.4);}
  .pod.eu{border-color:var(--acc); background:rgba(43,224,122,.12);}
  .pod .medalha{font-size:24px;}

  /* ---------- imprensa e rival (modo Jogador) ---------- */
  .imprensa{
    display:flex; gap:9px; align-items:flex-start; text-align:left; margin-top:12px;
    padding:12px 14px; border-radius:11px; font-size:14px; line-height:1.45;
    background:linear-gradient(120deg,rgba(61,155,255,.12),transparent);
    border-left:3px solid var(--blue);
  }
  .imprensa span{font-style:italic;}
  .rival{
    text-align:left; margin-top:10px; padding:12px 14px; border-radius:11px;
    background:rgba(255,255,255,.04); border:1px solid var(--line);
  }
  .club{
    display:flex; align-items:center; gap:10px; padding:11px; border-radius:11px;
    background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.01));
    border:1px solid var(--line); cursor:pointer; transition:.14s;
  }
  .club:hover{
    border-color:var(--acc); transform:translateY(-2px);
    box-shadow:0 12px 24px -14px var(--acc-glow);
  }
  .row{
    display:flex; align-items:center; justify-content:space-between; gap:8px;
    padding:7px 9px; border-bottom:1px solid rgba(120,160,220,.09); font-size:13.5px;
    border-radius:7px; transition:background .12s;
  }
  .row:hover{background:rgba(61,155,255,.07);}

  .pitch{
    position:relative; width:300px; height:380px; margin:auto; overflow:hidden;
    border:1px solid rgba(255,255,255,.18); border-radius:12px;
    background:
      repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 26px, transparent 26px 52px),
      linear-gradient(#2a2d33,#1c1e23);
    box-shadow:inset 0 0 60px rgba(0,0,0,.45), 0 18px 40px -20px #000;
  }
  .pitch .mid{position:absolute; left:0; right:0; top:50%; height:2px; background:rgba(255,255,255,.55);}
  .pitch .circle{
    position:absolute; left:50%; top:50%; width:80px; height:80px;
    border:2px solid rgba(255,255,255,.55); border-radius:50%; transform:translate(-50%,-50%);
  }
  .dot{position:absolute; transform:translate(-50%,-50%); text-align:center;}
  .dot .b{
    width:22px; height:22px; border-radius:50%; margin:auto;
    border:2px solid #06210f; background:linear-gradient(180deg,#ffe680,var(--gold));
    box-shadow:0 3px 8px rgba(0,0,0,.5);
  }
  .dot span{
    font-size:10px; display:block; margin-top:3px; color:#eaf6ff;
    text-shadow:0 1px 3px #000; max-width:66px; overflow:hidden;
    text-overflow:ellipsis; white-space:nowrap;
  }

  /* =======================================================================
     REPAGINAÇÃO VISUAL — a maquete aprovada não é outra COR, é outra ESCALA.
     Tudo aqui em baixo sobe o tamanho e o respiro do jogo inteiro: abas,
     cabeçalho, cards, tabelas, listas. Fica por último de propósito, para
     valer sobre as regras antigas sem eu ter que reescrever cada uma.
     ======================================================================= */

  #careerRoot{font-size:15px}
  .cwrap{max-width:1240px; padding:20px 22px 48px}

  /* --- barra de cima: nome do clube e caixa, com presença --- */
  .ctop{padding:15px 22px; margin:-20px -22px 0; border-top-width:4px; border-bottom:0}
  .clogo{font-size:26px; letter-spacing:.03em; gap:13px}
  .badge{width:34px; height:34px; border-radius:9px}
  .ctopcaixa b{font-size:19px}
  .ctopcaixa span{font-size:10.5px}

  /* --- abas: na maquete elas são grandes e espaçadas, não botõezinhos --- */
  .cnav{gap:3px; margin-bottom:18px}
  .cnav button{font-size:13px; letter-spacing:.1em; padding:12px 15px;
    border:0; border-radius:11px 11px 0 0; color:var(--ink-mute); background:transparent}
  .cnav button:hover{color:var(--ink); background:rgba(255,255,255,.04)}
  /* SALVAR/MENU/JOGAR vão para a direita: antes empurravam as abas para a 2ª linha */
  .cnavsep{margin-left:auto}
  .cnav button.active{color:#fff; background:linear-gradient(180deg,rgba(255,255,255,.10),transparent);
    box-shadow:inset 0 -3px 0 var(--clube1)}
  .cnav .btn.sec{padding:9px 15px; font-size:13px; border-radius:10px}
  .cnav button.play{font-size:14px; padding:11px 20px}
  .cnavsep{height:22px; margin:0 9px}

  /* --- painéis: mais respiro e o título maior --- */
  .panel{padding:22px 24px 24px; border-radius:20px; margin-bottom:16px}
  h2{font-size:13.5px; letter-spacing:.17em; margin-bottom:16px; gap:11px}
  .muted{font-size:13.5px}

  /* --- cabeçalho do clube: é a assinatura da tela, tem que ser grande --- */
  /* O HERÓI, com a forma da maquete: sangra no topo, só arredonda embaixo, e o
     degradê nasce do ACENTO do clube (no time preto-e-branco, vindo do escudo). */
  .idclube{border-radius:0 0 26px 26px; border:1px solid rgba(255,255,255,.08); border-top:0;
    margin:-20px -22px 0; overflow:hidden}
  .idfaixa{display:none}
  .idcorpo{padding:30px 30px 28px; gap:22px;
    background:
      linear-gradient(135deg,
        color-mix(in srgb, var(--clube1) 52%, transparent),
        color-mix(in srgb, var(--clube1) 12%, transparent) 45%,
        rgba(10,14,26,.25)),
      linear-gradient(180deg,#0e1424,#080c16)}
  /* escudo d'água no alto à direita, como na maquete */
  .idcorpo::after{right:-34px; top:-46px; transform:none;
    width:290px; height:290px; opacity:.10; filter:none}
  /* ESCUDO NÃO É QUADRADO: forçar largura E altura cortava o desenho. */


  /* as abas ficam grudadas embaixo do herói e acompanham a rolagem */
  .cnav{position:sticky; top:0; z-index:40; margin:0 -22px 18px; padding:11px 22px 0;
    background:linear-gradient(180deg,rgba(8,12,22,.97),rgba(8,12,22,.90));
    backdrop-filter:blur(10px); border-bottom:1px solid rgba(255,255,255,.08)}
  .idquem b{font-size:clamp(32px,4.4vw,56px)}
  .idquem span{font-size:13.5px; letter-spacing:.15em}
  .idcorpo::after{width:260px; height:260px; opacity:.10}
  /* o caixa não pode quebrar nem estourar a borda: encolhe junto com a tela */
  .idcaixa{flex:0 0 auto}
  .idcaixa b{font-size:clamp(21px,3.2vw,36px); white-space:nowrap}
  .idquem{min-width:0}
  .idquem b{overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
  .idquem span{white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block}
  .idcaixa i{font-size:11.5px}

  /* --- o duelo do dia --- */
  .jogocard{border-radius:20px; margin-bottom:16px}
  .jogotopo{padding:15px 24px}
  .jogotopo b{font-size:13.5px; letter-spacing:.17em}
  .jogotopo span{font-size:12.5px}
  .duelo{padding:34px 26px 26px; gap:24px}


  .duelo .lado{gap:18px}
  .duelo .lado b{font-size:28px}
  .duelo .lado i{font-size:11.5px; letter-spacing:.16em}
  .vs{font-size:14px; letter-spacing:.22em; padding:12px 19px}
  .forma s{width:24px; height:24px; border-radius:7px; font-size:12.5px}
  .jogotat{padding:0 26px 18px; font-size:13.5px}
  .jogarbarra{gap:14px; padding:6px 26px 24px}
  .btnjogo{padding:20px; font-size:16.5px; border-radius:15px; letter-spacing:.15em}

  /* --- tabela: linhas altas e números grandes, como na maquete --- */
  table.classif{font-size:15px; border-spacing:0 4px}
  table.classif td{padding:17px 14px}
  table.classif thead th{font-size:11.5px; letter-spacing:.14em; padding:0 14px 10px}
  table.classif td b{font-size:17px}
  .tabclube{gap:13px}

  /* a SUA linha ganha uma barra na lateral — na maquete é o que puxa o olho */
  table.classif tr.me td{font-weight:800; color:#fff;
    background:linear-gradient(90deg,
      color-mix(in srgb, var(--clube1) 30%, transparent),
      color-mix(in srgb, var(--clube1) 10%, transparent))}
  table.classif tr.me td:first-child{box-shadow:inset 4px 0 0 var(--clube1); color:#fff}

  /* --- lista de competições --- */
  .compl{padding:15px 0}
  .compl b{font-size:16px}
  .compl span, .compl i{font-size:13px; color:var(--ink-dim)}

  /* --- o anel do objetivo --- */
  .metaanel{gap:20px}
  .anel{width:96px; height:96px}
  .anel i{width:80px; height:80px; font-size:27px}
  .metatxt b{font-size:19px; margin-bottom:5px}
  .metatxt span{font-size:13.5px}

  /* --- listas gerais (elenco, mercado, base, histórico) --- */
  .row{padding:12px 13px; font-size:14.5px}
  .noticia{padding:14px 0; font-size:14px}
  .chip, .fpill{font-size:12.5px; padding:7px 13px}
  .cklinha{padding:13px 0; font-size:14.5px}

  /* as abas que trocam de copa: eram pastilhas de 12px, somem na tela */
  .copabas{gap:9px; margin-bottom:18px}
  .copaba{padding:10px 17px; border-radius:12px; font-size:13.5px;
    background:rgba(255,255,255,.05); border-color:rgba(255,255,255,.10)}
  .copaba svg, .copaba img{max-height:19px; width:auto}
  .copaba:hover{background:rgba(255,255,255,.10)}
  .copaba.on{color:#fff; border-color:transparent;
    background:linear-gradient(180deg, var(--clube1), color-mix(in srgb, var(--clube1) 64%, #000));
    box-shadow:0 12px 24px -14px var(--clube1), inset 0 1px 0 rgba(255,255,255,.3)}
  .fasebt{padding:9px 15px; border-radius:11px; font-size:13px}

  /* ===== BASE + OLHEIRO na mesma aba ===== */
  .gabas{display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap}
  .gaba{flex:1; min-width:200px; cursor:pointer; text-align:left; border:0;
    border-radius:16px; padding:16px 20px; font-family:var(--font);
    color:var(--ink-dim); background:rgba(255,255,255,.04);
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); transition:.14s}
  .gaba:hover{color:var(--ink); background:rgba(255,255,255,.08)}
  .gaba b{display:block; font-family:var(--font-head); font-size:18px;
    letter-spacing:.03em; margin-bottom:3px}
  .gaba i{font-style:normal; font-size:12.5px; opacity:.85}
  .gaba.on{color:#fff; box-shadow:inset 0 1px 0 rgba(255,255,255,.3);
    background:linear-gradient(180deg, var(--clube1), color-mix(in srgb, var(--clube1) 64%, #000))}

  .janelaaviso{padding:13px 16px; border-radius:13px; margin-bottom:14px;
    background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.09)}
  .janelaaviso b{display:block; font-size:14.5px; margin-bottom:3px}
  .janelaaviso span{font-size:13px; color:var(--ink-dim)}
  .gtab thead th{font-size:9.5px; letter-spacing:.12em; text-transform:uppercase;
    color:var(--ink-mute); padding:0 6px 6px; font-weight:800}

  /* coluna que ordena */
  th.ordcol{cursor:pointer; user-select:none; transition:color .12s}
  th.ordcol:hover{color:var(--ink)}
  th.ordcol.on{color:var(--clube1)}
  th.ordcol s{text-decoration:none; margin-left:4px; font-size:9px}

  /* o overall do titular na cor do clube, não no verde antigo */
  .xiovr{color:var(--ink)}

  /* ===== ELENCO: a linha do titular, sem cara de formulário ===== */
  .xi{display:grid; grid-template-columns:auto 1fr auto auto; align-items:center;
    gap:14px; padding:13px 15px; border-radius:14px; margin-bottom:7px;
    background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
    transition:.13s}
  .xi:hover{background:rgba(255,255,255,.07); border-color:rgba(255,255,255,.16)}
  .xi .vaga{flex:0 0 auto; min-width:46px; text-align:center; font-size:11px;
    font-weight:800; letter-spacing:.07em; padding:6px 0; border-radius:8px;
    background:rgba(255,255,255,.08); color:var(--ink-dim)}
  .xi.torto .vaga{background:rgba(245,165,36,.18); color:#ffcf5a}
  .xitopo b{font-size:16px}
  .xisub{font-size:12px; color:var(--ink-mute); margin-top:2px}
  .xiener{display:flex; align-items:center; gap:9px; margin-top:6px}
  .enbar{display:block; width:120px; height:7px; border-radius:4px;
    background:rgba(255,255,255,.10); overflow:hidden}
  .enbar i{display:block; height:100%; border-radius:4px; background:#36e27f}
  .enbar.meia i{background:#ffc53d} .enbar.crit i{background:#ff5e6b}
  .ener{font-size:12px; color:var(--ink-dim)}
  .ener.baixa{color:#ffc53d}
  .xiovr{font-family:var(--font-head); font-size:26px; font-weight:800;
    min-width:44px; text-align:center}
  .xitrocar{padding:10px 16px !important; font-size:12.5px !important}
  .setor{font-size:11px; letter-spacing:.17em; text-transform:uppercase;
    color:var(--ink-mute); margin:16px 0 8px; font-weight:800}
  @media (max-width:620px){
    .xi{grid-template-columns:auto 1fr auto; gap:10px}
    .xitrocar{grid-column:2/-1; justify-self:start}
    .enbar{width:84px}
  }

  /* ===== PROPOSTAS PELOS SEUS JOGADORES ===== */
  .proposta{display:grid; grid-template-columns:1.2fr .9fr .9fr auto; gap:16px;
    align-items:center; padding:16px 18px; border-radius:15px; margin-bottom:10px;
    background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.09)}
  .proposta.boa{background:rgba(54,226,127,.07); border-color:rgba(54,226,127,.22)}
  .proposta.fraca{opacity:.8}
  .propquem b{display:block; font-size:16.5px}
  .propquem i{font-style:normal; font-size:12.5px; color:var(--ink-mute)}
  .propclube{display:flex; align-items:center; gap:10px; min-width:0}
  .propclube span{font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
  .propvalor b{display:block; font-family:var(--font-head); font-size:21px}
  .propvalor i{font-style:normal; font-size:12px; color:var(--ink-dim)}
  .proposta.boa .propvalor i{color:#4ade80}
  .propbs{display:flex; gap:9px}
  .propbs .btn{padding:11px 17px; font-size:13px}
  @media (max-width:820px){
    .proposta{grid-template-columns:1fr 1fr; gap:12px}
    .propbs{grid-column:1/-1}
    .propbs .btn{flex:1}
  }

  /* ===== CLIMA NO CLUBE: diretoria e vestiário ===== */
  .climalinha{display:flex; align-items:center; gap:12px; padding:9px 0}
  .climalinha i{font-style:normal; font-size:10.5px; letter-spacing:.16em;
    text-transform:uppercase; color:var(--ink-mute); width:74px; flex:0 0 auto}
  .climabar{flex:1; height:8px; border-radius:5px; background:rgba(255,255,255,.08);
    overflow:hidden}
  .climabar em{display:block; height:100%; border-radius:5px; transition:width .3s}
  .climalinha b{font-size:12.5px; width:150px; text-align:right; flex:0 0 auto}
  .climaaviso{margin-top:10px; font-size:12.5px; color:#ffb3ba; line-height:1.5;
    background:rgba(255,94,107,.10); border:1px solid rgba(255,94,107,.22);
    border-radius:11px; padding:11px 13px}
  @media (max-width:560px){
    .climalinha{flex-wrap:wrap}
    .climalinha b{width:auto; text-align:left}
  }

  /* ===== POSTURA NA PARTIDA AO VIVO =====
     Três botões na beira do campo. O ativo acende na cor do clube. */
  .avpostura{display:flex; align-items:center; gap:8px; flex-wrap:wrap;
    width:min(760px,94vw); margin-top:4px; padding:12px 16px; border-radius:16px;
    background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.09)}
  .avpostura i{font-style:normal; font-size:10.5px; letter-spacing:.18em;
    text-transform:uppercase; color:var(--ink-mute); margin-right:4px}
  .avpostura button{flex:1; min-width:120px; cursor:pointer; border:0; border-radius:11px;
    padding:12px 14px; font-family:var(--font-head); font-weight:800; font-size:13px;
    letter-spacing:.1em; text-transform:uppercase; color:var(--ink-dim);
    background:rgba(255,255,255,.05); box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);
    transition:.13s}
  .avpostura button:hover{color:var(--ink); background:rgba(255,255,255,.10)}
  .avpostura button.on{color:#fff; box-shadow:inset 0 1px 0 rgba(255,255,255,.3);
    background:linear-gradient(180deg, var(--clube1), color-mix(in srgb, var(--clube1) 64%, #000))}
  /* a decisão aparece no relato, como um lance */
  .avdec{border-left:3px solid var(--clube1); padding-left:11px; margin:5px 0;
    font-size:13.5px; color:#dbe6f6}
  .avdec b{color:var(--clube1); margin-right:7px}

  /* ===== TELA DE COPA na mesma escala do resto =====
     Ficou para trás: pastilhas miúdas, cartão com título de 17px e o grupo
     num quadradinho. */
  .cuphead{padding:20px 22px; gap:16px;
    background:
      linear-gradient(110deg, color-mix(in srgb, var(--clube1) 26%, transparent), transparent 55%),
      linear-gradient(180deg,#16202f,#111925)}
  .cuphead svg, .cuphead img{max-height:44px; width:auto}
  .cupid h2{font-size:24px; letter-spacing:.02em}
  .cupid .muted{font-size:12px; letter-spacing:.14em}
  .cupsit{font-size:12px; padding:8px 14px}
  .proxfase{padding:15px 22px; gap:14px; font-size:14px}
  .proxfase .fase{font-size:15px; padding:7px 14px; border-radius:9px}
  .cupcampeao{padding:18px 22px}
  .cupcampeao b{font-size:23px}
  .grupos, .ligafase{padding:18px 22px; gap:14px;
    grid-template-columns:repeat(auto-fill,minmax(270px,1fr))}
  .gcard{border-radius:14px}
  .ct b{font-size:13.5px}
  .ct.eu b{color:var(--clube1)}
  /* as pastilhas que trocam de copa viram abas de verdade */
  .fpills{gap:8px}
  .fpill{font-size:13px; padding:10px 16px; border-radius:11px}
  .fpill.on{color:#fff; border-color:transparent;
    background:linear-gradient(180deg, var(--clube1), color-mix(in srgb, var(--clube1) 64%, #000));
    box-shadow:0 12px 24px -14px var(--clube1), inset 0 1px 0 rgba(255,255,255,.3)}

  /* ===== ZONAS DA TABELA =====
     Acesso e rebaixamento eram uma legenda embaixo e um fundo quase invisível.
     Agora cada linha leva uma barra na lateral, como nos sites de futebol: dá
     para ver onde você está sem contar posição. */
  table.classif tr.up td:first-child{box-shadow:inset 4px 0 0 #36e27f}
  table.classif tr.down td:first-child{box-shadow:inset 4px 0 0 #ff5e6b}
  table.classif tr.up td{background:rgba(54,226,127,.07)}
  table.classif tr.down td{background:rgba(255,94,107,.09)}
  /* a SUA linha manda mais que a zona, mas a barra da zona continua aparecendo */
  table.classif tr.me.up td:first-child{box-shadow:inset 4px 0 0 #36e27f}
  table.classif tr.me.down td:first-child{box-shadow:inset 4px 0 0 #ff5e6b}
  /* a legenda vira pastilha, não texto solto */
  .zonas{display:flex; gap:10px; flex-wrap:wrap; margin-top:14px}
  .zona{display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--ink-dim);
    background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
    border-radius:999px; padding:7px 14px}
  .zona s{width:11px; height:11px; border-radius:3px; display:block; text-decoration:none}
  .zona.sobe s{background:#36e27f} .zona.cai s{background:#ff5e6b}

  /* ===== ESCOLHER O CLUBE: a ficha no espírito do FIFA =====
     Escudo grande, estrelas, overall e as três barras. Dá para escolher o time
     batendo o olho, em vez de ler uma lista. */
  .escolhaclube h2{font-size:15px}
  .gradeclubes{display:grid; gap:14px; margin-top:16px;
    grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}
  .fclube{position:relative; overflow:hidden; cursor:pointer; text-align:center;
    padding:20px 16px 16px; border-radius:18px; color:var(--ink);
    font-family:var(--font); border:1px solid rgba(255,255,255,.10);
    background:
      linear-gradient(170deg, color-mix(in srgb, var(--c1) 40%, transparent), transparent 52%),
      linear-gradient(180deg,#141d31,#0a1120);
    box-shadow:0 22px 44px -28px #000, inset 0 1px 0 rgba(255,255,255,.07);
    transition:transform .14s, box-shadow .14s, border-color .14s}
  .fclube::before{content:''; position:absolute; left:0; right:0; top:0; height:4px;
    background:linear-gradient(90deg, var(--c1) 0 60%, var(--c2) 60% 100%)}
  .fclube:hover{transform:translateY(-4px); border-color:rgba(255,255,255,.26);
    box-shadow:0 34px 58px -26px #000, 0 0 0 1px rgba(255,255,255,.06)}
  .fclube.trancado{opacity:.42; cursor:not-allowed}
  .fclube.trancado:hover{transform:none}

  .fescudo{height:76px; display:grid; place-items:center; margin-bottom:12px}
  .fescudo img, .fescudo svg{filter:drop-shadow(0 8px 16px rgba(0,0,0,.7))}
  .fnome{font-family:var(--font-head); font-size:19px; line-height:1.1; margin-bottom:8px;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis}

  /* as estrelas, desenhadas: nada de emoji */
  .festrelas{display:flex; gap:3px; justify-content:center; margin-bottom:10px}
  .festrelas s{width:14px; height:14px; display:block; text-decoration:none;
    -webkit-mask:var(--estrela) center/contain no-repeat;
    mask:var(--estrela) center/contain no-repeat;
    --estrela:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 1.6l3.1 6.6 7 .9-5.1 4.9 1.3 7-6.3-3.4-6.3 3.4 1.3-7L1.9 9.1l7-.9z'/></svg>")}
  .festrelas s.ec{background:#ffc53d}
  .festrelas s.ev{background:rgba(255,255,255,.16)}
  .festrelas s.em{background:linear-gradient(90deg,#ffc53d 50%, rgba(255,255,255,.16) 50%)}

  .fovr{display:flex; align-items:baseline; justify-content:center; gap:8px; margin-bottom:12px}
  .fovr span{font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:var(--ink-dim)}
  .fovr b{font-family:var(--font-head); font-size:30px; line-height:1}

  .fbarras{display:flex; flex-direction:column; gap:6px; margin-bottom:11px}
  .fbarra{display:flex; align-items:center; gap:8px}
  .fbarra i{font-style:normal; font-size:9.5px; letter-spacing:.13em; color:var(--ink-mute);
    width:28px; text-align:left; font-weight:800}
  .fbarra span{flex:1; height:5px; border-radius:3px; background:rgba(255,255,255,.09); overflow:hidden}
  .fbarra em{display:block; height:100%; border-radius:3px;
    background:linear-gradient(90deg, var(--c1), color-mix(in srgb, var(--c1) 55%, #fff))}
  .fbarra b{font-size:11.5px; width:22px; text-align:right; font-variant-numeric:tabular-nums}

  .felenco{font-size:11px; color:var(--ink-mute)}

  @media (max-width:520px){
    .gradeclubes{grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px}
    .fclube{padding:15px 11px 12px}
    .fescudo{height:56px}
    .fescudo img, .fescudo svg{max-height:56px}
    .fnome{font-size:15px}
    .fovr b{font-size:24px}
  }

  /* ===== ELENCO: o campo também veste o clube =====
     A tela de montar o time estava com a escala e as cores antigas enquanto o
     resto do jogo já tinha mudado. */
  .escalacao{gap:16px}
  .campocard{padding:20px 22px}
  .campotopo{margin-bottom:16px}
  .campotopo h2{font-size:34px; letter-spacing:.03em}
  .campotopo .muted{font-size:11px; letter-spacing:.17em}
  .forcatime b{font-size:36px; color:var(--clube1)}
  /* o gramado puxa um fio da cor do clube, como o resto das telas */
  .pitch2{border-radius:16px; border-color:rgba(255,255,255,.14);
    background:
      radial-gradient(120% 80% at 50% 40%, color-mix(in srgb, var(--clube1) 12%, transparent), transparent 66%),
      radial-gradient(120% 80% at 50% 45%, rgba(255,255,255,.10), transparent 70%),
      repeating-linear-gradient(180deg,#1e5b31 0 9%,#194d2a 9% 18%)}
  /* camisa maior: o número e o nome mal se liam */
  /* O NOME TINHA QUE CABER. Aumentei a letra e o nome passou a ser cortado:
     "Memphis" virava "Me...". Agora a casinha é mais larga que a camisa e a
     letra é só um pouco maior que a original. */
  .jog11{width:104px; gap:3px}
  .jcamisa{width:38px; height:38px; border-radius:8px 8px 11px 11px}
  .jcamisa b{font-size:15px}
  .jog11nome{font-size:11px; max-width:104px; letter-spacing:-.1px}
  .jfor{font-size:11px; color:#d8f3e3}
  .escolhas label{font-size:11px; letter-spacing:.14em}

  /* ===== PARTIDA AO VIVO: o placar veste o clube ===== */
  .avtop{background:
      linear-gradient(100deg, color-mix(in srgb, var(--clube1) 34%, transparent), transparent 52%),
      linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.02));
    border-color:rgba(255,255,255,.14)}
  .avbarra i{background:var(--clube1)}
  .avfeed{text-align:left}

  /* ===== ESCALAÇÃO ANTES DA PARTIDA e TROCA DE VAGA =====
     As duas telas que o jogo mais usa na hora de jogar. Mesmo vidro escuro,
     mesma cor do clube e as linhas altas do resto do jogo. */
  .checagem{position:fixed; inset:0; z-index:88; display:grid; place-items:center;
    padding:20px; background:rgba(4,7,15,.84); backdrop-filter:blur(9px);
    font-family:var(--font); color:var(--ink)}
  .checagem.troca{z-index:89}
  .ckcaixa{width:min(620px,96vw); max-height:92vh; overflow:auto;
    background:rgba(20,26,42,.96); border:1px solid rgba(255,255,255,.10);
    border-radius:22px; padding:24px 24px 20px;
    box-shadow:0 50px 90px -44px #000, inset 0 1px 0 rgba(255,255,255,.07)}
  .cktopo{display:flex; align-items:flex-start; gap:16px; margin-bottom:18px}
  .cktopo b{display:block; font-family:var(--font-head); font-size:24px; letter-spacing:.015em}
  .cktopo i{display:block; font-style:normal; font-size:13px; color:var(--ink-dim); margin-top:4px}
  .ckforca{margin-left:auto; text-align:right; flex:0 0 auto}
  .ckforca span{display:block; font-size:10.5px; letter-spacing:.17em; text-transform:uppercase;
    color:var(--ink-dim)}
  .ckforca b{font-family:var(--font-head); font-size:34px; color:var(--clube1)}
  .ckalerta{font-size:13.5px; color:#ffcf5a; background:rgba(255,207,90,.10);
    border:1px solid rgba(255,207,90,.22); border-radius:12px; padding:11px 14px; margin-bottom:14px}

  .cklista{display:flex; flex-direction:column; gap:6px; margin-bottom:18px}
  .cklinha{display:flex; align-items:center; gap:13px; padding:12px 14px; border-radius:13px;
    background:rgba(255,255,255,.035); border:1px solid transparent; transition:.12s}
  .cklinha[data-entra]{cursor:pointer}
  .cklinha[data-entra]:hover{background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.18);
    transform:translateX(2px)}
  .cklinha.fora{background:rgba(255,94,107,.09); border-color:rgba(255,94,107,.22)}
  .cklinha.cansado{background:rgba(255,207,90,.08)}
  .cklinha .posn{flex:0 0 46px; text-align:center; font-size:11px; font-weight:800;
    letter-spacing:.07em; padding:5px 0; border-radius:7px;
    background:rgba(255,255,255,.07); color:var(--ink-dim)}
  .ckquem{flex:1; min-width:0}
  .ckquem b{font-size:15.5px; margin-right:7px}
  .ckquem i{display:block; font-style:normal; font-size:12px; color:var(--ink-mute); margin-top:2px}
  .ckovr{font-family:var(--font-head); font-size:23px; font-weight:800; min-width:40px;
    text-align:center; font-variant-numeric:tabular-nums}
  .cknota{font-family:var(--font-head); font-size:14px; color:var(--clube1); min-width:34px;
    text-align:right}
  .cklinha .btn{padding:9px 15px; font-size:12.5px}

  .ckbs{display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px}
  .ckbs .btn{flex:1; min-width:180px}
  .ckfim{display:flex; gap:10px; border-top:1px solid rgba(255,255,255,.08); padding-top:16px}
  .ckfim .btn{flex:1; padding:16px}
  @media (max-width:560px){
    .ckcaixa{padding:18px 16px 16px}
    .cktopo b{font-size:20px}
    .cklinha{gap:9px; padding:10px 11px}
    .ckquem b{font-size:14px}
  }

  /* ===== ESCUDO: uma regra só, para o jogo inteiro =====
     Quem manda no tamanho é o HTML (crest(clube, N)); a imagem preenche
     exatamente essa moldura e nunca mais transborda nem é cortada.
     O PNG do clube tem 64px: pedir mais que isso só borra, então o crest.js
     trava nesse teto. */
  .escudoimg{overflow:visible; flex:0 0 auto}
  .escudoimg img{width:100% !important; height:100% !important; object-fit:contain}

  /* --- botões em geral --- */
  .btn{font-size:14.5px; padding:12px 19px; border-radius:12px;
    color:var(--clubetxt);
    background:linear-gradient(180deg, var(--clube1), color-mix(in srgb, var(--clube1) 68%, #000));
    box-shadow:0 14px 28px -14px var(--clube1), inset 0 1px 0 rgba(255,255,255,.3)}
  .btn:hover{box-shadow:0 18px 32px -12px var(--clube1), inset 0 1px 0 rgba(255,255,255,.4)}
  .btn.sec{padding:11px 17px; color:var(--ink);
    background:rgba(255,255,255,.06); box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
  .btn.sec:hover{background:rgba(255,255,255,.10); box-shadow:inset 0 0 0 1px rgba(255,255,255,.26)}

  /* --- linha de jogador (elenco, mercado, base, olheiro) ---
     É a tela onde o Gustavo passa mais tempo e era a mais apertada de todas. */
  .jlista{gap:7px; max-height:none}
  .jog{padding:13px 15px; gap:14px; border-radius:13px}
  .jog:hover{transform:translateX(2px)}
  .jinfo b{font-size:16px}
  .jinfo .muted{font-size:12.5px}
  .forcanum{font-size:24px; min-width:46px}
  .preco{font-size:15px; min-width:140px}
  .liga-tag{font-size:11px; padding:2px 8px; border-radius:6px}
  .jog button{font-size:13px; padding:9px 14px}

  /* --- pílulas de posição e etiquetas --- */
  .posn{font-size:11.5px; padding:4px 9px; border-radius:7px}
  .tag{font-size:11.5px; padding:4px 9px; border-radius:7px}
  .nac{font-size:13px}

  /* --- barra de filtros --- */
  .frot{font-size:11px; letter-spacing:.13em}
  .fseg button{padding:9px 16px; font-size:13px}
  .fsel{padding:10px 13px; font-size:14px; border-radius:11px}
  .finit{padding:12px 15px; border-radius:13px}
  .finit b{font-size:19px}
  .finit span{font-size:12px}
  input, select, textarea{font-size:14.5px}

  /* --- cartão de jogador / proposta --- */
  .ccard{border-radius:20px; padding:22px 24px}
  .ccard h3{font-size:22px}
  .prop{padding:14px 16px; border-radius:13px; font-size:14.5px}

  /* --- escalação --- */
  .xitopo{font-size:16px}
  .xiovr{font-size:22px}
  .xisub, .xinfo{font-size:13px}

  /* --- partida ao vivo: o placar é o momento do jogo, tem que impor --- */
  .avtop{width:min(760px,94vw); padding:22px 26px; gap:28px; border-radius:20px}

  .avplacar b{font-size:54px}
  .avplacar span{font-size:17px}
  .avtime span{font-size:19px}
  .avfeed{font-size:14.5px}

  /* em tela estreita nada disso pode virar um muro de letra grande */
  @media (max-width:900px){
    #careerRoot{font-size:14px}
    .idquem b{font-size:36px}
    .idcorpo{padding:22px 20px}
    .duelo .lado b{font-size:20px}
    .duelo svg,.duelo img{width:56px !important;height:56px !important}
    table.classif td{padding:12px 9px}
    .cnav button{font-size:12.5px; padding:10px 11px}
    .jog{padding:10px 11px; gap:10px}
    .jinfo b{font-size:14px}
    .forcanum{font-size:19px; min-width:34px}
    .preco{font-size:13px; min-width:92px}
    .idcaixa b{font-size:26px}
  }
`;

// A perguntinha de "continuar ou começar outra carreira". Fica fora do
// LANDING_CSS porque aparece por cima de tudo, inclusive do jogo.
export const ESCOLHA_CSS = `
  .escolhacarreira{position:fixed; inset:0; z-index:90; display:grid; place-items:center;
    padding:22px; background:rgba(4,7,15,.82); backdrop-filter:blur(8px);
    font-family:'Segoe UI',system-ui,-apple-system,sans-serif; color:#eef3fb}
  .escolhacarreira .cxcaixa{width:min(460px,94vw); text-align:center;
    background:rgba(22,28,44,.94); border:1px solid rgba(255,255,255,.10);
    border-radius:20px; padding:28px 26px 20px;
    box-shadow:0 40px 80px -40px #000, inset 0 1px 0 rgba(255,255,255,.07)}
  .escolhacarreira b{display:block; font-family:var(--font-head,inherit); font-size:23px;
    letter-spacing:.02em; margin-bottom:8px}
  .escolhacarreira i{display:block; font-style:normal; font-size:13.5px; line-height:1.55;
    color:#9fb0cc; margin-bottom:22px}
  .escolhacarreira .cxbs{display:flex; flex-direction:column; gap:10px}
  .escolhacarreira button{font-family:var(--font-head,inherit); font-weight:800; font-size:14.5px;
    letter-spacing:.1em; text-transform:uppercase; cursor:pointer; border:0;
    border-radius:13px; padding:16px; color:#fff;
    background:linear-gradient(180deg,var(--clube1,#e8362f),color-mix(in srgb,var(--clube1,#e8362f) 66%,#000));
    box-shadow:0 16px 30px -16px var(--clube1,#e8362f), inset 0 1px 0 rgba(255,255,255,.3)}
  .escolhacarreira button.alt{color:#eef3fb; background:rgba(255,255,255,.07);
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
  .escolhacarreira button.alt:hover{background:rgba(255,255,255,.12)}
  .escolhacarreira .cxvoltar{margin-top:14px; background:none; box-shadow:none;
    color:#6b7f9e; font-size:12.5px; letter-spacing:.14em; padding:8px}
  .escolhacarreira .cxvoltar:hover{color:#eef3fb}`;

// ---------- CSS da tela inicial ----------
export const LANDING_CSS = `${TOKENS}
  /* ===== TELA INICIAL =====
     O pedido do Gustavo: "deixa algo mais joguinho online de futebol". Então:
     esteira de escudos reais passando no fundo, gramado com listras de corte,
     luz de holofote e dois botões gordos, com relevo. Sem escudo solto no meio
     da tela, sem subtítulo e sem o "temporada 2026" que não dizia nada. */
  #landing{
    position:fixed; inset:0; z-index:50; overflow:hidden;
    display:flex; align-items:center; justify-content:center;
    color:var(--ink); font-family:var(--font); padding:20px;
    background:
      radial-gradient(1100px 520px at 50% -14%, rgba(255,255,255,.13), transparent 60%),
      radial-gradient(700px 400px at 8% 100%, color-mix(in srgb, var(--clube1) 22%, transparent), transparent 62%),
      linear-gradient(175deg,#121d31 0%,#0a1322 44%,#05080f 100%);
  }

  /* --- o gramado embaixo, com as listras do corte --- */
  #landing .lgrama{
    position:absolute; left:-10%; right:-10%; bottom:-6%; height:46%;
    transform:perspective(620px) rotateX(58deg);
    transform-origin:bottom center; pointer-events:none;
    background:
      repeating-linear-gradient(90deg,
        rgba(255,255,255,.035) 0 56px, transparent 56px 112px),
      linear-gradient(180deg, #16412a, #0b2416 62%, #070f0d);
    opacity:.42;
    -webkit-mask-image:linear-gradient(180deg,transparent,#000 58%,rgba(0,0,0,.45));
    mask-image:linear-gradient(180deg,transparent,#000 58%,rgba(0,0,0,.45));
  }

  /* --- a esteira de escudos reais --- */
  #landing .lescudos{position:absolute; inset:0; overflow:hidden; pointer-events:none;
    -webkit-mask-image:radial-gradient(70% 60% at 50% 48%, transparent 30%, #000 78%);
    mask-image:radial-gradient(70% 60% at 50% 48%, transparent 30%, #000 78%)}
  #landing .lfaixa{position:absolute; display:flex; gap:46px; align-items:center;
    width:max-content; opacity:.16; filter:grayscale(.25)}
  #landing .lfaixa img{width:58px; height:58px; object-fit:contain; display:block}
  #landing .lfaixa.a{top:12%; animation:lesteira 58s linear infinite}
  #landing .lfaixa.b{bottom:16%; animation:lesteira 74s linear infinite reverse}
  @keyframes lesteira{from{transform:translateX(0)} to{transform:translateX(-50%)}}
  @media (prefers-reduced-motion:reduce){ #landing .lfaixa{animation:none} }

  /* --- o miolo --- */
  #landing .cx{position:relative; z-index:2; text-align:center; width:min(620px,94vw)}
  #landing .mark{
    font-family:var(--font-head); font-size:clamp(52px,9.4vw,104px); font-weight:800;
    letter-spacing:.015em; text-transform:uppercase; line-height:.84; color:#fff;
    text-shadow:0 2px 0 rgba(0,0,0,.4), 0 18px 44px rgba(0,0,0,.75);
  }
  #landing .mark2{display:block; font-size:.40em; letter-spacing:.32em;
    color:var(--clube1); margin-top:.16em;
    text-shadow:0 0 34px color-mix(in srgb, var(--clube1) 70%, transparent);}

  #landing .modos{display:flex; flex-direction:column; gap:13px;
    width:min(400px,92vw); margin:clamp(30px,5vh,48px) auto 0;}
  /* botão gordo com biséu: é o que dá cara de jogo, e não de formulário */
  #landing .modo{
    position:relative; cursor:pointer; border:0; border-radius:16px; padding:21px 26px;
    font-family:var(--font-head); font-weight:800; font-size:17px; letter-spacing:.13em;
    text-transform:uppercase; color:#fff; overflow:hidden;
    background:linear-gradient(180deg,
      color-mix(in srgb, var(--clube1) 88%, #fff) 0%, var(--clube1) 42%,
      color-mix(in srgb, var(--clube1) 62%, #000) 100%);
    box-shadow:0 6px 0 color-mix(in srgb, var(--clube1) 40%, #000),
      0 26px 44px -20px color-mix(in srgb, var(--clube1) 80%, transparent),
      inset 0 1px 0 rgba(255,255,255,.5);
    transition:transform .1s, box-shadow .1s, filter .14s;
  }
  /* o brilho que corre por cima quando passa o mouse */
  #landing .modo::after{content:''; position:absolute; top:0; bottom:0; left:-60%; width:40%;
    background:linear-gradient(100deg,transparent,rgba(255,255,255,.34),transparent);
    transform:skewX(-18deg); transition:left .45s}
  #landing .modo:hover::after{left:120%}
  #landing .modo:nth-child(2){
    background:linear-gradient(180deg,#38445c 0%,#222c40 45%,#151c2b 100%);
    box-shadow:0 6px 0 #0a0e18, 0 26px 44px -22px #000, inset 0 1px 0 rgba(255,255,255,.18);
  }
  #landing .modo:hover{filter:brightness(1.07)}
  #landing .modo:active{transform:translateY(5px);
    box-shadow:0 1px 0 color-mix(in srgb, var(--clube1) 40%, #000), inset 0 1px 0 rgba(255,255,255,.3)}
  #landing .modo:nth-child(2):active{box-shadow:0 1px 0 #0a0e18, inset 0 1px 0 rgba(255,255,255,.14)}
  #landing .modo b{font:inherit}
  #landing .modo:disabled{filter:grayscale(.5) brightness(.8); cursor:wait}

  #landing .continuar{display:flex; align-items:center; justify-content:center; gap:12px;
    flex-wrap:wrap; margin-top:clamp(18px,3vh,26px)}
  #landing .ghost{
    font-family:var(--font-head); font-weight:800; font-size:12.5px; letter-spacing:.18em;
    text-transform:uppercase; cursor:pointer; border:0; background:none; padding:9px 2px;
    color:var(--ink-dim); border-bottom:2px solid transparent;
  }
  #landing .ghost:hover{color:#fff; border-bottom-color:var(--clube1)}
  #landing .muted{color:var(--ink-mute); font-size:12.5px}

/* Marcadores que substituiram os emojis. Um jogo nao escreve com emoji: escreve
   com etiqueta e com icone desenhado. */
.tag{display:inline-block;font-style:normal;font-weight:800;font-size:10px;letter-spacing:.06em;
  text-transform:uppercase;padding:2px 6px;border-radius:4px;vertical-align:middle;line-height:1.3}
.tag-lesao{background:#3a1113;color:#ff8b8b;border:1px solid #6b1f22}
.tag-susp{background:#3a2a08;color:#ffcf5a;border:1px solid #6b4d10}
.tag-fim{background:#33220c;color:#ff9a3c;border:1px solid #5e3d12}
.nac{font-size:12px;margin-right:5px;vertical-align:-1px;opacity:.95}
.pedidobanco{display:flex;flex-direction:column;gap:2px;margin:10px 0 2px;padding:9px 12px;
  background:#101b2c;border:1px solid #234066;border-left:3px solid #54a8ff;border-radius:8px}
.pedidobanco b{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#7fb4ff}
.pedidobanco span{font-size:13px;color:#dbe6f6;line-height:1.45}
.agcopa.talvez{opacity:.62;border-style:dashed}
.agcopa.talvez i{font-style:normal;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;opacity:.8}
/* ---- Tela de copa. Antes era uma lista de pastilhas com nome de clube: nao
   dizia onde voce estava, nao mostrava grupo nem chaveamento. ---- */
.cupcard{padding:0;overflow:hidden}
.cuphead{display:flex;align-items:center;gap:13px;padding:15px 17px;
  background:linear-gradient(180deg,#16202f,#111925);border-bottom:1px solid #1e2b3f}
.cupid{flex:1;min-width:0}
.cupid h2{margin:0;font-size:17px;line-height:1.2}
.cupid .muted{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase}
.cupsit{flex-shrink:0;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;
  padding:5px 10px;border-radius:99px;border:1px solid}
.cupsit.dentro{color:#7fe3a0;border-color:#2e6b48;background:#0f2419}
.cupsit.campeao{color:#f5c518;border-color:#6b5714;background:#241d08}
.cupsit.fora{color:#ff8b8b;border-color:#5e2326;background:#240f11}
.cupsit.espera{color:#9fb2cf;border-color:#2a3a54;background:#141c29}
.proxfase{display:flex;align-items:center;gap:11px;padding:12px 17px;border-bottom:1px solid #16202f}
.proxfase .fase{font-family:var(--font-head);font-size:14px;font-weight:800;letter-spacing:.05em;
  text-transform:uppercase;color:#dbe6f6;background:#1b2537;padding:4px 11px;border-radius:6px}
.cupcampeao{display:flex;align-items:center;gap:12px;padding:14px 17px;background:#1a1608;
  border-bottom:1px solid #3a2f0d}
.cupcampeao b{display:block;font-size:18px;color:#f5c518}
.cupcampeao .muted{font-size:11px;letter-spacing:.14em;text-transform:uppercase}
.ct{display:inline-flex;align-items:center;gap:6px;min-width:0}
.ct b{font-weight:600;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ct.eu b{color:#7fe3a0;font-weight:800}
.ct.caiu{opacity:.45}
.ct.passou b{font-weight:800}
.grupos,.ligafase{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;padding:14px 17px}
.gcard{background:#0e1626;border:1px solid #1e2b3f;border-radius:9px;overflow:hidden}
.gcard.meu{border-color:#2e6b48}
.gtit{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#8fa6c4;
  padding:8px 10px;background:#111a29}
.gtab{width:100%;border-collapse:collapse;font-size:12.5px}
.gtab td{padding:5px 7px;border-top:1px solid #16202f}
.gtab tr.me{background:#12261c}
.gtab tr.passa td:first-child{box-shadow:inset 2px 0 0 #3ad07f}
.gtab .gp{color:#6f83a0;width:16px}
/* O saldo de gols estava cortado ('+1...' em vez de '+12'). */
.gtab .gj{color:#8fa6c4;text-align:right;width:24px}
.gtab .gsg{color:#8fa6c4;text-align:right;width:34px;white-space:nowrap;padding-right:9px}
.meusjogos{padding:0 17px 14px}
.mjtit{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#8fa6c4;margin:4px 0 7px}
.mj{display:flex;align-items:center;gap:9px;padding:6px 10px;border-radius:7px;margin-bottom:5px;
  background:#0e1626;border-left:3px solid #2a3a54}
.mj.v{border-left-color:#3ad07f}.mj.d{border-left-color:#ef4444}.mj.e{border-left-color:#8fa6c4}
.mj b{margin-left:auto;font-family:var(--font-head);font-size:14px}
.mj b em{font-style:normal;color:#6f83a0;margin:0 2px}
.mjonde{font-size:9.5px;font-weight:800;letter-spacing:.08em;color:#6f83a0;width:32px}
.fbloco{padding:12px 17px;border-top:1px solid #16202f}
.ftit{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#8fa6c4;margin-bottom:8px}
.conf{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;padding:6px 9px;
  border-radius:7px;margin-bottom:4px}
.conf.meu{background:#101d17;box-shadow:inset 0 0 0 1px #2e6b48}
.conf .ct:last-child{justify-content:flex-end;text-align:right}
.pl{font-family:var(--font-head);font-size:14px;font-weight:800;white-space:nowrap}
.pl em{font-style:normal;color:#6f83a0;margin:0 3px;font-size:11px}
.pl i{font-style:normal;font-size:9px;color:#f5c518;vertical-align:super}
.comofunciona{padding:11px 17px 15px;border-top:1px solid #16202f}
.comofunciona summary{cursor:pointer;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;
  color:#8fa6c4;font-weight:800}
.comofunciona p{font-size:12.5px;line-height:1.55;color:#c3d2e6;margin:9px 0 0}
/* ---- Tela de escalacao. Era uma lista de select cinza sobre um retangulo liso.
   'Esta muito feio, sem cor, sem vida', e ele tinha razao. ---- */
.escalacao{display:grid;grid-template-columns:minmax(300px,1.1fr) 1fr 1fr;gap:13px;align-items:start}
@media (max-width:1100px){.escalacao{grid-template-columns:1fr}}
.campocard{padding:15px}
.campotopo{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:11px}
.campotopo h2{margin:0;font-size:26px;letter-spacing:.04em}
.campotopo .muted{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase}
.forcatime{text-align:right}
.forcatime b{display:block;font-family:var(--font-head);font-size:26px;color:#7fe3a0;line-height:1}

/* O CAMPO. O Gustavo: "deixa mais vivo o campo, que ta com as cores apagadas".
   Grama mais viva, listras que aparecem, luz no meio e sombra so nos cantos. */
.pitch2{position:relative;aspect-ratio:68/100;max-height:min(560px,68vh);margin:0 auto;border-radius:11px;overflow:hidden;
  background:
    radial-gradient(120% 80% at 50% 45%,rgba(255,255,255,.10),transparent 70%),
    repeating-linear-gradient(180deg,#1e5b31 0 9%,#194d2a 9% 18%);
  box-shadow:inset 0 0 90px rgba(0,0,0,.42),0 10px 28px -12px #000;
  border:1px solid #2c6b41}
.pitch2 .linha.meio,.pitch2 .circulo,.pitch2 .area{border-color:rgba(255,255,255,.34)}
.pitch2 .linha.meio{background:rgba(255,255,255,.34)}
.pitch2 .linha.meio{position:absolute;left:0;right:0;top:50%;height:2px;background:rgba(255,255,255,.22)}
.pitch2 .circulo{position:absolute;left:50%;top:50%;width:26%;aspect-ratio:1;transform:translate(-50%,-50%);
  border:2px solid rgba(255,255,255,.22);border-radius:50%}
.pitch2 .area{position:absolute;left:22%;width:56%;height:13%;border:2px solid rgba(255,255,255,.2)}
.pitch2 .area.cima{top:0;border-top:none}
.pitch2 .area.baixo{bottom:0;border-bottom:none}

.jog11{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;
  align-items:center;gap:2px;width:64px}
/* Sem color-mix: o navegador descartava a declaracao inteira e a camisa ficava
   sem cor nenhuma — o Corinthians aparecia de cinza claro em vez de preto. */
/* A camisa ganhou contorno claro: o Corinthians (preto) sumia dentro do campo. */
.jcamisa{position:relative;width:32px;height:32px;border-radius:6px 6px 9px 9px;
  background-color:var(--c1);
  background-image:linear-gradient(180deg,rgba(255,255,255,.22),rgba(0,0,0,.28));
  border:1.5px solid rgba(255,255,255,.55);
  box-shadow:0 3px 9px rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.45);
  display:flex;align-items:center;justify-content:center;cursor:grab}
.jcamisa::before,.jcamisa::after{content:'';position:absolute;top:-1.5px;width:8px;height:9px;
  background-color:var(--c1);border:1.5px solid rgba(255,255,255,.45);border-radius:3px}
.camisa::before{left:-7px}.camisa::after{right:-7px}
.jcamisa b{position:relative;z-index:1;font-family:var(--font-head);font-size:13px;
  color:var(--c2);text-shadow:0 1px 2px rgba(0,0,0,.6)}
.jog11.torto .jcamisa{box-shadow:0 0 0 2px #f5a524,0 3px 7px rgba(0,0,0,.5)}
.jog11.arrastando{opacity:.45}
.jog11.alvo .jcamisa{box-shadow:0 0 0 3px #5fd08a,0 3px 9px rgba(0,0,0,.6)}
.jog11 .jcamisa:hover{filter:brightness(1.15)}
/* Renomeada: .jnome ja era o nome do jogador na carreira de JOGADOR, e o
   max-width:64px daqui esmagava aquele — 'Ze Neto da Silva' aparecia como 'Z..'.
   Segunda colisao de nome do mesmo tipo, depois da .camisa. */
.jog11nome{font-size:10px;font-weight:800;color:#fff;text-shadow:0 1px 3px #000;white-space:nowrap;
  max-width:64px;overflow:hidden;text-overflow:ellipsis}
.jfor{font-size:9.5px;font-weight:800;color:#bff0cf;text-shadow:0 1px 2px #000}

.escolhas{display:flex;gap:9px;margin-top:11px}
.escolhas label{flex:1;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#8fa6c4;font-weight:800}
.escolhas select,.modelo select{width:100%;margin-top:4px;padding:7px 9px;background:#0b1220;
  color:#e6edf7;border:1px solid #22314c;border-radius:8px;font-size:13px}
.modelo{margin-top:12px;background:#0e1626;border:1px solid #1e2b3f;border-radius:10px;padding:11px}
.modelo p{font-size:12px;line-height:1.5;margin:7px 0 0}
#saveLine{width:100%;margin-top:12px}

.listacard{padding:0;overflow:hidden}
.listatit{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8fa6c4;
  padding:13px 15px;background:linear-gradient(180deg,#16202f,#111925);border-bottom:1px solid #1e2b3f}
.lista{max-height:620px;overflow:auto;padding:5px 0}
.setor{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#6f83a0;
  padding:11px 15px 5px}
.setor i{font-style:normal;opacity:.65}
.xi,.banco{display:flex;align-items:center;gap:10px;padding:8px 15px;border-bottom:1px solid #131c29}
.xi.torto{background:linear-gradient(90deg,rgba(245,165,36,.09),transparent 60%)}
.banco{cursor:pointer}
.banco:hover{background:#101a28}
.vaga{flex-shrink:0;width:34px;text-align:center;font-size:9.5px;font-weight:800;letter-spacing:.04em;
  padding:4px 0;border-radius:5px;background:#182338;color:#9fb8dd;border:1px solid #22314c}
.xinfo{flex:1;min-width:0}
.xitopo{display:flex;align-items:center;gap:6px;min-width:0}
.xitopo b{font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.xisub{font-size:11px;color:#7d90ad;margin-top:1px}
.xisub .alerta{color:#f5a524;font-weight:700}
.xisub .ener.baixa{color:#ff9a3c;font-weight:700}
.xi select{width:100%;margin-top:5px;padding:5px 7px;background:#0b1220;color:#dbe6f6;
  border:1px solid #22314c;border-radius:6px;font-size:12px}
.xiovr{flex-shrink:0;font-family:var(--font-head);font-size:19px;font-weight:800;color:#7fe3a0;
  min-width:30px;text-align:right}
/* ---- Categoria de base. O ponto da tela e a FAIXA: o teto do garoto e secreto. ---- */
.basegrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:11px}
.garoto{background:#0e1626;border:1px solid #1e2b3f;border-radius:11px;padding:12px}
.garoto.pronto{border-color:#2e6b48;box-shadow:inset 3px 0 0 #3ad07f}
.gtopo{display:flex;align-items:center;gap:10px}
.tetobarra{position:relative;height:7px;margin:11px 0 8px;border-radius:99px;
  background:#111a29;border:1px solid #1e2b3f;overflow:hidden}
.tetobarra .faixa{position:absolute;top:0;bottom:0;background:linear-gradient(90deg,#2a5c8f,#54a8ff);
  opacity:.55;border-radius:99px}
.tetobarra .hoje{position:absolute;top:-3px;bottom:-3px;width:2px;background:#7fe3a0;z-index:1;
  box-shadow:0 0 5px #7fe3a0}
.gparecer{font-size:12px;color:#9fb8dd;line-height:1.45;min-height:32px}
.gacoes{display:flex;gap:7px;margin-top:9px}
.gacoes .btn{flex:1;padding:7px 8px;font-size:11.5px}
/* Resumo de fim de temporada da carreira de jogador. */
.resumoano{background:#0e1626;border:1px solid #1e2b3f;border-radius:10px;padding:11px 13px;margin-bottom:13px}
.ratit{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8fa6c4;margin-bottom:7px}
.ralinha{display:flex;justify-content:space-between;gap:12px;font-size:12.5px;padding:4px 0;
  border-top:1px solid #16202f}
.ralinha:first-of-type{border-top:none}
.ralinha span{color:#9fb8dd}
.ralinha.venceu b{color:#f5c518}
.rajogos{font-size:12px;color:#8fa6c4;line-height:1.5;margin-top:8px;padding-top:8px;border-top:1px solid #16202f}
/* Ecos: a consequencia de uma escolha antiga chegando. */
.ecocard{background:#101b2c;border:1px solid #234066;border-left:3px solid #54a8ff;
  border-radius:9px;padding:11px 13px;margin:9px 0;text-align:left}
.ecotxt{font-size:14px;line-height:1.5;color:#dbe6f6}
.ecoorigem{font-size:11.5px;color:#7d90ad;margin-top:6px;font-style:italic}
.itemdesc{font-size:11.5px;color:#8fa6c4;line-height:1.45;margin:3px 0}
.itemef{font-size:11px;color:#7fe3a0;font-weight:700;margin-bottom:3px}
.prop.meu{opacity:.55;border-color:#2e6b48}
/* Sala de trofeus: vitrine, nao contador. */
.vitrine{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:12px;margin-top:4px}
.trofeu{background:#0e1626;border:1px solid #1e2b3f;border-radius:11px;padding:13px 9px;text-align:center}
.trofeuimg{position:relative;display:inline-block}
.trofeun{position:absolute;right:-4px;bottom:2px;background:#f5c518;color:#1a1608;font-weight:800;
  font-size:11px;padding:1px 6px;border-radius:99px;border:2px solid #0e1626}
.trofeunome{font-size:12px;font-weight:700;line-height:1.3;margin-top:6px;color:#dbe6f6}
.trofeuano{font-size:10.5px;color:#7d90ad;margin-top:2px}
.salavazia{padding:22px;text-align:center;color:#7d90ad;font-size:13px;
  border:1px dashed #22314c;border-radius:11px}
.premiostit{font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
  color:#8fa6c4;margin:16px 0 8px}
.premios{display:flex;flex-wrap:wrap;gap:7px}
.premio{background:#141d2b;border:1px solid #22314c;border-radius:7px;padding:6px 11px;font-size:12.5px}
.premio i{font-style:normal;color:#f5c518;font-weight:800;margin-left:6px}
.marcas div{font-size:13px;color:#c3d2e6;padding:5px 0;border-top:1px solid #16202f;line-height:1.5}
.marcas div:first-child{border-top:none}
/* Trabalho extra do ano na tela de treino. */
.espgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px}
.espcard{display:flex;flex-direction:column;gap:3px;text-align:left;padding:10px 11px;
  background:#101a28;border:1px solid #22314c;border-radius:9px;cursor:pointer;color:#dbe6f6;
  font-family:inherit}
.espcard:hover{border-color:#2e4a70}
.espcard.on{border-color:#3ad07f;background:#12261c}
.espcard.pronto{opacity:.6;cursor:default;border-color:#6b5714}
.espcard b{font-size:13px}
.espcard i{font-style:normal;font-size:11px;color:#8fa6c4;line-height:1.4}
.espniv{display:flex;align-items:center;gap:4px;margin-top:4px;font-size:10px;color:#f5c518;
  text-transform:uppercase;letter-spacing:.1em}
.espniv em{width:16px;height:4px;border-radius:99px;background:#22314c;display:block}
.espniv em.on{background:#3ad07f}
/* Quantas vagas de profissional o elenco ainda tem. */
.vagas{display:flex;align-items:center;gap:11px;margin:11px 0;padding:10px 13px;border-radius:9px;
  background:#101b2c;border:1px solid #234066;border-left:3px solid #54a8ff}
.vagas.cheio{background:#2a1a0a;border-color:#5e3d12;border-left-color:#f5a524}
.vagas b{font-family:var(--font-head);font-size:19px;color:#dbe6f6;flex-shrink:0}
.vagas span{font-size:12.5px;line-height:1.45;color:#c3d2e6}
/* O nome do jogador nao pode ser esmagado pelo botao do lado. */
.jog .jinfo{flex:1 1 auto;min-width:140px}
.jog .jinfo b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.jog .btn{flex-shrink:0;max-width:210px}





/* Cartao do primeiro contrato, no lugar do pop-up de chave e valor. */
.contrato{text-align:left;border-radius:13px;overflow:hidden;border:1px solid #22314c;
  background:#0e1626}
.contratotopo{display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:15px 17px;background-color:var(--c1);
  background-image:linear-gradient(180deg,rgba(255,255,255,.14),rgba(0,0,0,.36))}
.contratoclube{display:flex;align-items:center;gap:11px;min-width:0}
.contratoclube span{display:block;font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;
  color:var(--c2);opacity:.85}
.contratoclube b{display:block;font-size:17px;color:var(--c2);line-height:1.2}
.contratonum{width:46px;height:46px;border-radius:9px;display:flex;align-items:center;
  justify-content:center;border:2px solid var(--c2);flex-shrink:0}
.contratonum i{font-style:normal;font-family:var(--font-head);font-size:22px;color:var(--c2)}
.contratonome{font-family:var(--font-head);font-size:27px;letter-spacing:.02em;
  padding:15px 17px 2px;line-height:1.1}
.contratopos{padding:0 17px 14px;font-size:12.5px;color:#8fa6c4;
  letter-spacing:.08em;text-transform:uppercase}
.contratolinhas{border-top:1px solid #1e2b3f}
.contratolinhas div{display:flex;justify-content:space-between;gap:12px;padding:9px 17px;
  border-bottom:1px solid #16202f;font-size:13px}
.contratolinhas span{color:#8fa6c4}
.contratorodape{padding:12px 17px;font-size:12px;color:#7d90ad;line-height:1.5}






.ico-bola{display:inline-block;width:11px;height:11px;border-radius:50%;vertical-align:-1px;
  background:#e9eef7;border:1.5px solid #10141c;
  box-shadow:inset 0 0 0 1.5px #10141c, inset 3px 3px 0 -1px #9aa7bd}

/* Avisos do jogo, no lugar do alert() do navegador. */
.avisos{position:fixed;right:16px;bottom:16px;z-index:120;display:flex;flex-direction:column;
  gap:8px;align-items:flex-end;pointer-events:none;max-width:min(420px,86vw)}
.aviso{pointer-events:auto;background:#131a26;border:1px solid #2a3a54;border-radius:9px;
  padding:11px 14px;font-size:13px;line-height:1.45;color:#dce6f5;
  box-shadow:0 10px 30px rgba(0,0,0,.5);border-left:3px solid #54a8ff;
  animation:avEntra .22s cubic-bezier(.2,.9,.3,1)}
.aviso-ok{border-left-color:#3ad07f}
.aviso-erro{border-left-color:#ef4444}
.aviso.saindo{opacity:0;transform:translateX(12px);transition:opacity .3s,transform .3s}
@keyframes avEntra{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.confirmbox{max-width:420px;padding:20px}
.confirmtxt{font-size:14px;line-height:1.5;margin-bottom:16px}
.confirmbtns{display:flex;gap:9px;justify-content:flex-end}
`;

