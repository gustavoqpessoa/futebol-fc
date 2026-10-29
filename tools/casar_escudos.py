#!/usr/bin/env python3
"""
casar_escudos.py — LIGA OS CLUBES DO JOGO AOS ESCUDOS QUE JÁ EXISTEM.

Descoberta ao conferir a lista de quem estava sem escudo: na maioria dos casos
o escudo EXISTE no football-logos.cc — o que falta é o jogo saber que
"Cerro Porteño" é o arquivo "cerro-porteno". O mapa nome->arquivo foi feito à
mão e parou em 608 clubes, de 1420.

Este script fecha essa conta sozinho: lê a página de cada país, monta a lista
de escudos disponíveis e casa com os nomes do jogo.

O CUIDADO QUE IMPORTA: escudo trocado é pior que escudo faltando. Então o
casamento só vale quando é seguro —

  * o nome, sem acento e sem as siglas de sempre (FC, SC, CD, AC...), bate com
    o arquivo por 88% ou mais; ou
  * as palavras com peso (4 letras ou mais) são exatamente as mesmas;
  e, nos dois casos, o segundo colocado tem que estar claramente atrás, senão é
  ambíguo e o script desiste.

Uso:  python3 tools/casar_escudos.py [--aplicar]
      sem --aplicar ele só mostra o que faria.
"""
import base64
import difflib
import json
import os
import re
import subprocess
import sys
import time
import unicodedata
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(RAIZ, 'public')
CACHE = '/tmp/escudos_novos'
LADO = 128
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
APLICAR = '--aplicar' in sys.argv

# nomes de país do jogo -> página do site
PAIS = {
    'Alemanha': 'germany', 'Inglaterra': 'england', 'Espanha': 'spain',
    'Itália': 'italy', 'França': 'france', 'Portugal': 'portugal',
    'Holanda': 'netherlands', 'Bélgica': 'belgium', 'Brasil': 'brazil',
    'Argentina': 'argentina', 'Estados Unidos': 'usa', 'México': 'mexico',
    'Turquia': 'turkey', 'Rússia': 'russia', 'Escócia': 'scotland',
    'Áustria': 'austria', 'Suíça': 'switzerland', 'Grécia': 'greece',
    'Dinamarca': 'denmark', 'Noruega': 'norway', 'Suécia': 'sweden',
    'Polônia': 'poland', 'Ucrânia': 'ukraine', 'Croácia': 'croatia',
    'Sérvia': 'serbia', 'Romênia': 'romania', 'Chéquia': 'czech-republic',
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
    'Nova Zelândia': 'new-zealand', 'País de Gales': 'wales', 'Senegal': 'senegal',
}

# siglas que não ajudam a distinguir um clube de outro
RUIDO = {
    'fc', 'cf', 'sc', 'ac', 'cd', 'ca', 'afc', 'cfc', 'sv', 'fk', 'nk', 'bk',
    'if', 'ff', 'sk', 'club', 'clube', 'de', 'do', 'da', 'del', 'the', 'ec',
    'cr', 'as', 'us', 'ssc', 'rc', 'rcd', 'ud', 'sd', 'ad', 'cs', 'csd', 'aa',
    'esporte', 'futebol', 'football', 'calcio', 'sport', 'sports', 'atletico',
    'deportivo', 'deportes', 'united', 'city', 'real', 'fbc', 'spa', 'ltda',
}


def sem_acento(t):
    return ''.join(c for c in unicodedata.normalize('NFD', t)
                   if unicodedata.category(c) != 'Mn')


def chave(nome):
    t = sem_acento(str(nome)).lower()
    t = re.sub(r'[^a-z0-9]+', ' ', t).strip()
    return t


def palavras_fortes(nome):
    return {p for p in chave(nome).split() if len(p) >= 4 and p not in RUIDO}


def limpo(nome):
    return ' '.join(p for p in chave(nome).split() if p not in RUIDO)


def baixar(url, tentativas=3):
    for i in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                return r.read()
        except Exception:
            if i == tentativas - 1:
                return None
            time.sleep(1.5 * (i + 1))
    return None


def escudos_do_pais(pagina):
    """slug -> url da menor resolução que ainda serve."""
    d = baixar(f'https://football-logos.cc/{pagina}')
    if not d:
        return {}
    txt = d.decode('utf-8', 'ignore')
    achados = re.findall(
        r'assets\.football-logos\.cc/logos/([a-z0-9-]+)/(\d+)x\d+/([a-z0-9-]+)\.([a-f0-9]+)\.png', txt)
    melhor = {}
    for pais_url, tam, slug, h in achados:
        tam = int(tam)
        if tam < LADO or slug.endswith('--no-text'):
            continue
        if slug not in melhor or tam < melhor[slug][0]:
            melhor[slug] = (tam, f'https://assets.football-logos.cc/logos/{pais_url}/{tam}x{tam}/{slug}.{h}.png')
    return {k: v[1] for k, v in melhor.items()}


def casar(nome, candidatos):
    """Devolve o slug certo, ou None quando não dá para ter certeza."""
    alvo = limpo(nome)
    if not alvo:
        return None
    fortes = palavras_fortes(nome)
    notas = []
    for slug in candidatos:
        s_limpo = limpo(slug.replace('-', ' '))
        nota = difflib.SequenceMatcher(None, alvo, s_limpo).ratio()
        # palavras com peso iguais dos dois lados: é o mesmo clube escrito diferente
        if fortes and fortes == palavras_fortes(slug.replace('-', ' ')):
            nota = max(nota, 0.95)
        notas.append((nota, slug))
    if not notas:
        return None
    notas.sort(reverse=True)
    melhor, segundo = notas[0], (notas[1] if len(notas) > 1 else (0, ''))
    if melhor[0] < 0.88:
        return None
    if melhor[0] - segundo[0] < 0.06:      # dois parecidos: não arrisca
        return None
    return melhor[1]


def main():
    dados = json.load(open(os.path.join(PUB, 'players.json'), encoding='utf-8'))
    mapa = json.load(open(os.path.join(PUB, 'mapa_logos.json'), encoding='utf-8'))
    logos = json.load(open(os.path.join(PUB, 'logos.json'), encoding='utf-8'))
    os.makedirs(CACHE, exist_ok=True)

    # clubes sem escudo, por país
    faltam = {}
    for lg in dados['leagues']:
        for cl in lg['clubs']:
            sl = mapa.get(cl['n'])
            if not (sl and sl in logos):
                faltam.setdefault(lg['country'], set()).add(cl['n'])

    novos_mapa, novos_logo, sem_fonte = 0, 0, 0
    for pais in sorted(faltam):
        pagina = PAIS.get(pais)
        if not pagina:
            print(f'  {pais}: sem página no site', flush=True)
            continue
        disponiveis = escudos_do_pais(pagina)
        if not disponiveis:
            print(f'  {pais}: página vazia', flush=True)
            continue
        achei = 0
        for nome in sorted(faltam[pais]):
            slug = casar(nome, disponiveis)
            if not slug:
                sem_fonte += 1
                continue
            pronto = os.path.join(CACHE, f'{slug}.{LADO}.png')
            if not os.path.exists(pronto):
                bruto = os.path.join(CACHE, slug + '.src.png')
                if not os.path.exists(bruto):
                    d = baixar(disponiveis[slug])
                    if not d:
                        sem_fonte += 1
                        continue
                    open(bruto, 'wb').write(d)
                r = subprocess.run(['sips', '-Z', str(LADO), bruto, '--out', pronto],
                                   capture_output=True)
                if r.returncode != 0 or not os.path.exists(pronto):
                    sem_fonte += 1
                    continue
            if slug not in logos:
                with open(pronto, 'rb') as f:
                    logos[slug] = 'data:image/png;base64,' + base64.b64encode(f.read()).decode('ascii')
                novos_logo += 1
            mapa[nome] = slug
            novos_mapa += 1
            achei += 1
        print(f'  {pais:24s} {achei:3d} de {len(faltam[pais]):3d} casados', flush=True)

    print(f'\n{novos_mapa} clubes ganharam escudo real ({novos_logo} arquivos novos)')
    print(f'{sem_fonte} continuam sem — ou não existem no site, ou o nome era ambíguo')
    if APLICAR:
        json.dump(mapa, open(os.path.join(PUB, 'mapa_logos.json'), 'w', encoding='utf-8'),
                  ensure_ascii=False, separators=(',', ':'))
        json.dump(logos, open(os.path.join(PUB, 'logos.json'), 'w', encoding='utf-8'),
                  separators=(',', ':'))
        mb = os.path.getsize(os.path.join(PUB, 'logos.json')) / 1024 / 1024
        print(f'gravado. logos.json: {mb:.1f} MB')
    else:
        print('(nada gravado — rode com --aplicar)')


if __name__ == '__main__':
    main()
