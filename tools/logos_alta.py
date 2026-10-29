#!/usr/bin/env python3
"""
logos_alta.py — TROCA OS ESCUDOS DE 64px POR ESCUDOS DE VERDADE.

O jogo embutia os escudos em 64x64. Numa tela Retina qualquer coisa acima de
~32px já sai mole, e o escudo do clube no cabeçalho ficava borrado: foi a
reclamação do Gustavo. Este script baixa o escudo grande do football-logos.cc
(o mesmo site de onde vieram os de 64), encolhe para o tamanho que o jogo
precisa e regrava o public/logos.json.

Como acha a imagem: o CDN exige um hash no nome do arquivo, então não dá para
montar a URL. A página de cada país lista os links completos — então o script
lê a página do país, monta um índice slug -> URL e só aí baixa.

Uso:  python3 tools/logos_alta.py [tamanho]      (padrão 128)
"""
import base64
import json
import os
import re
import subprocess
import sys
import time
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, 'public', 'logos.json')
CACHE = '/tmp/logos_alta'
LADO = int(sys.argv[1]) if len(sys.argv) > 1 else 128
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}

# o país no jogo está em português; o site usa o nome em inglês, com hífen
PAIS_SLUG = {
    'Alemanha': 'germany', 'Inglaterra': 'england', 'Espanha': 'spain',
    'Itália': 'italy', 'França': 'france', 'Portugal': 'portugal',
    'Holanda': 'netherlands', 'Países Baixos': 'netherlands', 'Bélgica': 'belgium',
    'Brasil': 'brazil', 'Argentina': 'argentina', 'Estados Unidos': 'usa',
    'México': 'mexico', 'Turquia': 'turkey', 'Rússia': 'russia',
    'Escócia': 'scotland', 'Áustria': 'austria', 'Suíça': 'switzerland',
    'Grécia': 'greece', 'Dinamarca': 'denmark', 'Noruega': 'norway',
    'Suécia': 'sweden', 'Polônia': 'poland', 'Ucrânia': 'ukraine',
    'Croácia': 'croatia', 'Sérvia': 'serbia', 'Romênia': 'romania',
    'Chéquia': 'czech-republic', 'República Tcheca': 'czech-republic',
    'Arábia Saudita': 'saudi-arabia', 'Japão': 'japan', 'China': 'china',
    'Coreia do Sul': 'south-korea', 'Austrália': 'australia',
    'Colômbia': 'colombia', 'Chile': 'chile', 'Uruguai': 'uruguay',
    'Paraguai': 'paraguay', 'Peru': 'peru', 'Equador': 'ecuador',
    'Bolívia': 'bolivia', 'Venezuela': 'venezuela', 'Canadá': 'canada',
    'África do Sul': 'south-africa', 'Egito': 'egypt', 'Marrocos': 'morocco',
    'Tunísia': 'tunisia', 'Argélia': 'algeria', 'Israel': 'israel',
    'Índia': 'india', 'Bulgária': 'bulgaria', 'Hungria': 'hungary',
    'Irlanda': 'ireland', 'Finlândia': 'finland', 'Chipre': 'cyprus',
    'Emirados Árabes Unidos': 'uae', 'Catar': 'qatar', 'Irã': 'iran',
    'Costa do Marfim': 'ivory-coast', 'Nigéria': 'nigeria', 'Gana': 'ghana',
}


def baixar(url, tentativas=3):
    for i in range(tentativas):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read()
        except Exception as e:
            if i == tentativas - 1:
                return None
            time.sleep(1.5 * (i + 1))
    return None


def indice_do_pais(slug_pais):
    """slug do clube -> melhor URL (a maior resolução que o site oferece)."""
    html = baixar(f'https://football-logos.cc/{slug_pais}')
    if not html:
        return {}
    txt = html.decode('utf-8', 'ignore')
    achados = re.findall(
        r'assets\.football-logos\.cc/logos/[a-z0-9-]+/(\d+)x\d+/([a-z0-9-]+)\.([a-f0-9]+)\.png', txt)
    melhor = {}
    for tam, slug, h in achados:
        tam = int(tam)
        if tam < LADO:          # menor que o alvo não serve
            continue
        atual = melhor.get(slug)
        # pega a MENOR resolução que ainda é >= o alvo: encolher é barato, inflar não presta
        if atual is None or tam < atual[0]:
            m = re.search(
                rf'assets\.football-logos\.cc/logos/([a-z0-9-]+)/{tam}x{tam}/{re.escape(slug)}\.{h}\.png', txt)
            pais_url = m.group(1) if m else slug_pais
            melhor[slug] = (tam, f'https://assets.football-logos.cc/logos/{pais_url}/{tam}x{tam}/{slug}.{h}.png')
    return {k: v[1] for k, v in melhor.items()}


def encolher(entrada, saida):
    """sips é nativo do macOS: não precisa instalar nada."""
    r = subprocess.run(['sips', '-Z', str(LADO), entrada, '--out', saida],
                       capture_output=True)
    return r.returncode == 0 and os.path.exists(saida)


def main():
    os.makedirs(CACHE, exist_ok=True)
    antigos = json.load(open(SAIDA, encoding='utf-8'))
    dados = json.load(open(os.path.join(RAIZ, 'public', 'players.json'), encoding='utf-8'))

    # quais países o jogo usa
    paises = sorted({lg['country'] for lg in dados['leagues']})
    faltam_pais = [p for p in paises if p not in PAIS_SLUG]

    indice = {}
    for p in paises:
        sl = PAIS_SLUG.get(p)
        if not sl:
            continue
        idx = indice_do_pais(sl)
        indice.update(idx)
        print(f'  {p:22s} {len(idx):4d} escudos listados', flush=True)

    novos = dict(antigos)
    trocados = semfonte = 0
    for slug in antigos:
        url = indice.get(slug)
        if not url:
            semfonte += 1
            continue
        bruto = os.path.join(CACHE, slug + '.src.png')
        pronto = os.path.join(CACHE, f'{slug}.{LADO}.png')
        if not os.path.exists(pronto):
            if not os.path.exists(bruto):
                d = baixar(url)
                if not d:
                    semfonte += 1
                    continue
                open(bruto, 'wb').write(d)
            if not encolher(bruto, pronto):
                semfonte += 1
                continue
        with open(pronto, 'rb') as f:
            novos[slug] = 'data:image/png;base64,' + base64.b64encode(f.read()).decode('ascii')
        trocados += 1
        if trocados % 50 == 0:
            print(f'  ... {trocados} escudos trocados', flush=True)

    json.dump(novos, open(SAIDA, 'w', encoding='utf-8'), separators=(',', ':'))
    mb = os.path.getsize(SAIDA) / 1024 / 1024
    print(f'\n{trocados} escudos agora em {LADO}px; {semfonte} ficaram no tamanho antigo')
    print(f'logos.json: {mb:.1f} MB')
    if faltam_pais:
        print('países sem equivalente no site:', ', '.join(faltam_pais))


if __name__ == '__main__':
    main()
