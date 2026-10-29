# ⚽ Futebol FC

> **🚧 Em construção.** Projeto pessoal, feito com IA (Claude Code), ainda não está pronto.
> A partida rápida em 3D e a Carreira de Treinador funcionam. A Carreira de Jogador está sendo refeita.

## O que é

Jogo de futebol para navegador com três modos:

- **Partida Rápida 3D**: física real, câmera de transmissão e controle de Xbox.
- **Carreira de Treinador** (no estilo Brasfoot): elenco, mercado, finanças, diretoria, copas e estaduais.
- **Carreira de Jogador**: em reconstrução.

A base tem **19.318 jogadores, 74 ligas e 84 seleções**, com os elencos reais da Série A.
A pasta `tests/` tem mais de 30 testes que conferem a base, o calendário, as copas, o mercado e os saves.
Para rodar, use `node tests/_test_dados.mjs` a partir da raiz.

---

## Partida 3D: detalhes técnicos (Vite + Three.js + cannon-es)

Jogo de futebol 3D com **física real** (cannon-es), **câmera de transmissão dinâmica**,
**pós-processamento estilo EA FC** (Bloom + SSAO + Depth of Field) e **minimapa/radar**.
Arquitetura modular, pronta para receber modelos 3D realistas (Mixamo) e texturas PBR.

## ▶️ Como rodar

Você precisa do **Node.js 18+** instalado. No terminal, dentro desta pasta:

```bash
npm install      # instala as dependências (só na primeira vez)
npm run dev      # abre em http://localhost:5173
```

Para gerar a versão final (pasta `dist/`):

```bash
npm run build
npm run preview  # testa o build em http://localhost:4173
```

## 🎮 Controles

- **WASD / setas / analógico esquerdo** — mover
- **Espaço / X** — chutar (segure para carregar a força; a bola sobe conforme a carga)
- **J / A** — passe
- **Q / LB** — trocar de jogador
- **Shift / RT** — correr
- **P / Esc** — pausar
- **H** — alternar gráficos **Alto ⇄ Performance** (desliga Bloom/SSAO/DoF se travar)

> Controle Xbox é reconhecido automaticamente — aperte um botão com a janela em foco.

## 🧩 Estrutura

```
futebol-fc/
├── public/
│   ├── models/       <- coloque aqui player.glb (Mixamo) — opcional
│   ├── animations/   <- animações extras .glb (opcional)
│   └── audio/        <- torcida.mp3, apito.mp3, chute.mp3 (opcional)
├── src/
│   ├── main.js         (loop principal + integração física/render)
│   ├── Physics.js      (mundo cannon-es: chão, paredes, gol, bola, jogadores)
│   ├── Stadium.js      (campo, linhas, gols com rede, arquibancada, luzes, céu)
│   ├── Camera.js       (câmera de TV com lerp + FOV dinâmico)
│   ├── PostProcess.js  (EffectComposer: Bloom, SSAO, Depth of Field)
│   ├── PlayerLoader.js (modelo procedural + carregador GLTF/AnimationMixer)
│   ├── Controls.js     (teclado + gamepad, movimento relativo à câmera)
│   ├── UI.js           (placar, força, legenda, radar 2D)
│   ├── Game.js         (jogadores, IA por zona, posse física, chute/passe, gols)
│   └── Constants.js    (dimensões e ajustes do jogo)
└── index.html
```

## 🎨 Deixando com cara de EA FC (assets gratuitos)

O jogo já roda com **jogadores procedurais** (sem download). Para o visual realista,
baixe assets gratuitos e coloque nas pastas indicadas:

### 1. Jogadores realistas com animação — Mixamo (grátis, precisa de conta Adobe)
- Site: https://www.mixamo.com
- Escolha um **Character** → aba **Animations** → baixe **Idle**, **Running**, **Shoot/Kick**, **Pass**.
- Em cada download: **Format = glTF Binary (.glb)**, **Skin = With Skin**.
- Renomeie o principal para `player.glb` e coloque em `public/models/`.
- O `PlayerLoader.js` detecta o arquivo e troca automaticamente (com crossfade Idle⇄Run).

### 2. Texturas PBR do gramado/estádio — Poly Haven / AmbientCG (CC0, sem conta)
- https://polyhaven.com/textures  e  https://ambientcg.com
- Procure "grass", "concrete", "stadium". Baixe os mapas (Color/Roughness/Normal) em 2K.
- Coloque em `public/textures/` e carregue com `THREE.TextureLoader` no `Stadium.js`.

### 3. Estádio/rede/bola em 3D — Sketchfab (filtro "Downloadable" + "Free")
- https://sketchfab.com/search?type=models&features=downloadable — filtre por licença gratuita.
- Baixe em `.glb`/`.gltf` e carregue com `GLTFLoader`.

### 4. Áudio (torcida, apito, chute) — Freesound / Sonniss GDC
- https://freesound.org  e  https://sonniss.com/gameaudiogdc
- Coloque `torcida.mp3`, `apito.mp3`, `chute.mp3` em `public/audio/`.

## ⚙️ Desempenho

Bloom + SSAO + Depth of Field são pesados em placas fracas. Se travar, aperte **H**
para o modo **Performance** (efeitos desligados). Dá também para desativar de fábrica
em `main.js`: `new PostProcess(renderer, scene, tv.cam, { ssao:false, dof:false })`.

## 🔧 Próximos passos (para evoluir)
- Escanteios/laterais/faltas/pênaltis com reinício de jogo.
- Goleiro com mergulho/defesa dedicada.
- Atributos por jogador (velocidade/chute/defesa).
- Trocar jogadores procedurais pelos GLB do Mixamo (é só soltar o arquivo).

## Carreira de treinador — as decisões que mudam o jogo

Três mecânicas que mexem no resultado de verdade. Estão juntas aqui porque as
três começaram como número morto no código: existiam, eram calculadas e nada
na tela as usava.

### Postura, durante a partida

Três botões na beira do campo, a qualquer minuto. O motor já lia `atq`/`def`
na conta das chances, da posse e do contra-ataque — mas ficavam travados em 1,
e dirigir era assistir.

| postura | faz | toma |
|---|---|---|
| Ir para cima | 1,9 | 1,4 |
| Equilibrado | 1,5 | 1,0 |
| Segurar | 1,3 | 0,7 |

Medido em 1.200 partidas (`_test_postura.mjs`). Subir o time cobra fôlego do
elenco depois do apito. A decisão do intervalo é a mesma coisa: as duas portas
mexem no mesmo botão.

### A paciência da diretoria

De 0 a 100, começa em 80. Cai quando você perde estando abaixo da meta, sobe
quando ganha. No chão, você é demitido **no meio da temporada** — antes disso
vem a cobrança pública e depois o ultimato, e sempre dá para reagir ganhando.

A cobrança **cresce com a temporada**: na rodada 8 a tabela ainda não separa
ninguém, então quase não pesa; da metade em diante pesa inteira. Sem isso eu
demitia o técnico do time que terminaria campeão em metade das temporadas.

Medido em `_test_diretoria.mjs`:

- Palmeiras (2º mais forte, meta top 4): demitido em 2 de 8 temporadas, sempre
  depois da 30ª rodada. Quando segura o emprego, termina em 1º.
- Bahia (meio de tabela, meta top 7): 2 de 8, e termina em 3,7º quando fica.
- Chapecoense (20º de 20, meta é escapar): 6 de 8 — e está certo que caia.

### A moral do elenco

De 0 a 100, parte de 60. Sobe com vitória, cai com derrota, goleada pesa mais,
e **a semana esfria a cabeça**: a cada jogo o vestiário puxa 14% de volta para o
normal. Sem essa volta ao normal, um time que perde muito trava a moral no chão
e nunca mais sai — moral baixa tira força, menos força faz perder de novo.

A moral mexe na força do time em campo, mas pouco de propósito: no máximo uns
4% para cada lado. O bastante para uma sequência ruim virar bola de neve, não
tanto que decida sozinho. Média na segunda metade da temporada: Palmeiras 77,
Bahia 64, Chapecoense 48.

### Propostas pelos seus jogadores

O mercado era de mão única: você comprava do mundo inteiro e ninguém nunca vinha
atrás do seu craque. Faltava a parte que dá peso a ter um bom jogador.

Nas janelas (meio e fim de temporada) chegam propostas. Quem oferece é sempre um
clube **mais forte que o seu**, e só por quem tem 68 de força para cima — ninguém
liga pelo terceiro goleiro. O valor vai de 90% a 160% do valor de mercado: abaixo
de 100% é proposta para recusar, bem acima é dinheiro que muda a temporada.

Aceitar põe o dinheiro no caixa na hora e tira o jogador do elenco e da sua
escalação. **Recusar uma oferta muito alta incomoda o jogador e o vestiário** —
segurar quem todo mundo quer tem preço. Com o elenco no limite (18), a venda é
barrada.

Coberto por `_test_propostas.mjs`.

### Ferramentas

- `tools/relatorio_escudos.py` — quem ainda está sem escudo oficial, por liga.
- `tools/casar_escudos.py` — liga os clubes do jogo aos escudos do site.
- `tools/escudos_webp.py` — converte os escudos para WebP (o mesmo desenho
  ocupando um terço).
