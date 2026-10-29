#!/usr/bin/env python3
"""
build_single.py — monta o FUTEBOL-FC.html, o jogo inteiro num arquivo só.

Por que existe: abrir um arquivo local (file://) não tem servidor por trás, então o
`fetch('players.json')` falha e o navegador ainda bloqueia módulos ES. A solução é
colar TUDO dentro do HTML — o bundle do Vite como script comum e os jogadores em
`window.__PLAYERS` (o database.js usa essa variável quando ela existe).

Resultado: um arquivo que roda com dois cliques, sem instalar nada, e que também
pode ser publicado como página.

Uso:
    npm run build && python3 tools/build_single.py [--corpo]

    --corpo  gera só o conteúdo (sem <html>/<head>/<body>), para publicar como página.
"""
import json
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(RAIZ, 'dist')
SAIDA = os.path.join(RAIZ, 'COMPANY-FOOTBALL.html')
SAIDA_CORPO = os.path.join(RAIZ, 'COMPANY-FOOTBALL.corpo.html')

ESTILO = """*{margin:0;padding:0;box-sizing:border-box}
    html,body{height:100%;overflow:hidden;background:#05070d;font-family:'Segoe UI',system-ui,sans-serif;color:#fff}
    #app{position:fixed;inset:0}
    canvas{display:block}"""


def ler_bundle():
    assets = os.path.join(DIST, 'assets')
    js = [f for f in os.listdir(assets) if f.endswith('.js')]
    if not js:
        raise SystemExit('Nenhum .js em dist/assets — rode "npm run build" antes.')
    if len(js) > 1:
        raise SystemExit(f'Esperava um bundle só, achei {len(js)}: {js}')
    with open(os.path.join(assets, js[0]), encoding='utf-8') as f:
        return f.read()


def main():
    corpo_apenas = '--corpo' in sys.argv

    bundle = ler_bundle()
    with open(os.path.join(DIST, 'players.json'), encoding='utf-8') as f:
        jogadores = json.load(f)

    # escudos oficiais (se existirem) entram embutidos também
    def carregar(nome):
        caminho = os.path.join(DIST, nome)
        if not os.path.exists(caminho):
            return None
        with open(caminho, encoding='utf-8') as f:
            return json.load(f)
    logos = carregar('logos.json')
    mapa = carregar('mapa_logos.json')

    # </script> dentro de string quebraria o HTML na marra
    dados = json.dumps(jogadores, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

    miolo = (
        f'<style>\n    {ESTILO}\n  </style>\n'
        f'<div id="app"></div>\n'
        f'<script>window.__PLAYERS={dados};</script>\n'
        + (f'<script>window.__LOGOS={json.dumps(logos, separators=(",", ":"))};'
           f'window.__MAPA_LOGOS={json.dumps(mapa, ensure_ascii=False, separators=(",", ":"))};</script>\n'
           if logos and mapa else '')
        + f'<script>{bundle}</script>'
    )

    if corpo_apenas:
        alvo, conteudo = SAIDA_CORPO, f'<title>Company Football</title>\n{miolo}\n'
    else:
        alvo = SAIDA
        conteudo = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Company Football</title>
</head>
<body>
{miolo}
</body>
</html>
"""

    with open(alvo, 'w', encoding='utf-8') as f:
        f.write(conteudo)

    mb = os.path.getsize(alvo) / 1024 / 1024
    n = jogadores['meta']['players'] if 'meta' in jogadores else '?'
    print(f'{os.path.basename(alvo)} — {mb:.1f} MB, {n} jogadores embutidos')


if __name__ == '__main__':
    main()
