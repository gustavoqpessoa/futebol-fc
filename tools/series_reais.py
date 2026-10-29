#!/usr/bin/env python3
"""
series_reais.py — troca a Série C e a Série D pelos elencos REAIS, e cria a liga
"Resto do Mundo" com os clubes que têm escudo oficial mas não tinham lugar no jogo.

A Série C e a D vinham do gerador antigo, com nomes escolhidos por mim. As listas
reais estão aqui, tiradas do site que o Gustavo usou. Os jogadores continuam sendo
os que já existiam — só o nome e a identidade do clube mudam, para não estragar o
equilíbrio das divisões.

O "Resto do Mundo" resolve outro problema: 117 clubes de verdade (Napoli, FC Porto,
Zenit, CSKA, Athletic Bilbao...) têm escudo oficial mas não existiam no jogo, porque
o pipeline antigo os trocou por genéricos. Agora eles entram numa competição própria,
e quem quiser pode treiná-los.

Uso:  python3 tools/series_reais.py
"""
import json
import os
import re
import unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ = os.path.join(RAIZ, 'public', 'players.json')
LOGOS = os.path.join(RAIZ, 'public', 'logos.json')

SERIE_C = [
    'Amazonas', 'Brusque', 'Figueirense', 'Itabaiana', 'Paysandu',
    'Anápolis', 'Caxias', 'Floresta', 'Ituano', 'Santa Cruz',
    'Barra', 'Confiança', 'Guarani', 'Maranhão', 'Volta Redonda',
    'Botafogo-PB', 'Ferroviária', 'Inter de Limeira', 'Maringá', 'Ypiranga-RS',
]

# Série D: os 16 grupos da competição real, na ordem em que aparecem
SERIE_D = [
    'Manauara', 'Nacional-AM', 'São Raimundo-RR', 'Monte Roraima', 'Manaus',
    'Guaporé', 'Araguaína', 'Porto Velho', 'Independência', 'Galvez', 'Humaitá',
    'Gama', 'Luverdense', 'Brasiliense', 'Aparecidense', 'Primavera', 'Inhumas',
    'Capital-DF', 'Goiatuba', 'Ceilândia', 'Mixto', 'União-MT', 'Várzea Grande',
    'Trem', 'Águia de Marabá', 'Imperatriz', 'Tuna Luso', 'Tocantinópolis', 'Oratório',
    'Iguatu', 'Maracanã', 'Parnahyba', 'Sampaio Corrêa', 'Moto Club',
    'Ferroviário', 'Piauí', 'Fluminense-PI', 'Atlético de Altos', 'Atlético Cearense',
    'ABC', 'América-RN', 'Maguary', 'Central', 'Sousa', 'Laguna',
    'Treze', 'Serra Branca', 'Sergipe', 'Lagarto', 'Retrô', 'Decisão',
    'CSA', 'Juazeirense', 'ASA', 'Jacuipense', 'CSE', 'Atlético de Alagoinhas',
    'Uberlândia', 'Betim', 'CRAC', 'Ivinhema', 'Operário-MS',
    'Tombense', 'Democrata-GV', 'Vitória-ES', 'Rio Branco-ES', 'Porto-BA', 'Real Noroeste',
    'Portuguesa-RJ', 'Água Santa', 'Portuguesa Santista', 'América-RJ', 'Madureira', 'Pouso Alegre',
    'XV de Piracicaba', 'Noroeste', 'Velo Clube', 'Nova Iguaçu', 'Maricá',
    'Cianorte', 'Cascavel', 'São Luiz', 'Joinville', 'Guarany de Bagé',
    'Blumenau', 'Marcílio Dias', 'São Joseense', 'São José-RS', 'Brasil de Pelotas', 'Azuriz',
]


def norm(t):
    t = unicodedata.normalize('NFD', t).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]', '', t)


def trocar_nomes(liga, nomes):
    """Renomeia os clubes da liga na ordem, mantendo os elencos."""
    trocados = 0
    for clube, novo in zip(liga['clubs'], nomes):
        if clube['n'] != novo:
            clube['n'] = novo
            trocados += 1
    return trocados


def criar_resto_do_mundo(dados, logos, mapa):
    """Cria a liga com os clubes reais que têm escudo mas não estavam no jogo.

    O que decide se o escudo já tem dono é o MAPA (que inclui os apelidos), e não a
    comparação crua de nomes — senão o Belgrano entrava duas vezes, uma pelo nome do
    clube e outra pelo nome do arquivo.
    """
    jaTemDono = set(mapa.values())
    orfaos = [s for s in logos if s not in jaTemDono]
    if not orfaos:
        return None

    # nome apresentável a partir do slug, com os casos que o arquivo escreve errado
    CORRIGE = {
        'argeninos-juniors': 'Argentinos Juniors', 'club-atletico-platanense': 'Platense',
        'gimnasia-y-esgrima': 'Gimnasia y Esgrima', 'gimnasia-lp': 'Gimnasia La Plata',
        's-bratislava': 'Slovan Bratislava', 'cska-moskva': 'CSKA Moskva',
        'suditrol': 'Südtirol', 'austins-fc': 'Austin FC', 'malmo': 'Malmö FF',
        'u-cluj': 'Universitatea Cluj', 'uta': 'UTA Arad', 'otelul': 'Oțelul Galați',
        'amed': 'Amedspor', 'corum': 'Çorum FK', 'noah': 'FC Noah', 'drita': 'KF Drita',
        'akron': 'Akron Tolyatti', 'rodina-moscow': 'Rodina Moscou',
    }
    def bonito(slug):
        if slug in CORRIGE:
            return CORRIGE[slug]
        palavras = slug.replace('-', ' ').split()
        pequenas = {'de', 'da', 'do', 'the', 'of', 'y'}
        return ' '.join(w if w in pequenas else w.capitalize() for w in palavras)

    # doa elencos de clubes genéricos das divisões de baixo do mundo todo
    doadores = []
    for liga in dados['leagues']:
        if (liga.get('tier') or 1) >= 2 and liga.get('country') != 'Brasil':
            doadores.extend(liga['clubs'])
    doadores.sort(key=lambda c: -sum(sorted((p[2] for p in c['players']), reverse=True)[:11]))

    clubes = []
    for i, slug in enumerate(orfaos):
        if i >= len(doadores):
            break
        molde = doadores[i]
        clubes.append({
            'n': bonito(slug),
            't': molde.get('t', 'wm'),
            'players': [list(p) for p in molde['players']],
        })

    return {
        'name': 'Resto do Mundo', 'country': 'Resto do Mundo', 'tier': 1, 'clubs': clubes,
    }


def main():
    with open(ARQ, encoding='utf-8') as f:
        dados = json.load(f)
    logos = json.load(open(LOGOS, encoding='utf-8')) if os.path.exists(LOGOS) else {}
    caminho_mapa = os.path.join(RAIZ, 'tools', 'mapa_logos.json')
    mapa = json.load(open(caminho_mapa, encoding='utf-8')) if os.path.exists(caminho_mapa) else {}

    for liga in dados['leagues']:
        if liga['name'] == 'Brasileirão Série C':
            n = trocar_nomes(liga, SERIE_C)
            print(f'Série C: {n} clubes renomeados ({len(liga["clubs"])} no total)')
        elif liga['name'] == 'Brasileirão Série D':
            n = trocar_nomes(liga, SERIE_D)
            print(f'Série D: {n} clubes renomeados ({len(liga["clubs"])} no total)')

    # O "Resto do Mundo" foi APOSENTADO. Ele juntava num campeonato falso todo escudo
    # oficial sem dono e COPIAVA o elenco de clubes de divisões inferiores — o Porto
    # ficava com jogadores da 2ª espanhola e o mesmo jogador existia em dois clubes.
    # Quem põe cada clube na liga certa agora é o tools/ligas_reais.py.
    # A função criar_resto_do_mundo() continua abaixo só como registro do que foi feito.
    dados['leagues'] = [l for l in dados['leagues'] if l['name'] != 'Resto do Mundo']

    dados['meta']['leagues'] = len(dados['leagues'])
    dados['meta']['clubs'] = sum(len(l['clubs']) for l in dados['leagues'])
    with open(ARQ, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, separators=(',', ':'))
    print(f'gravado em {ARQ}')


if __name__ == '__main__':
    main()
