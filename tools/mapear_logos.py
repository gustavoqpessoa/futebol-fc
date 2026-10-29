#!/usr/bin/env python3
"""mapear_logos.py — liga o nome de cada clube do jogo ao arquivo do escudo."""
import json, os, re, unicodedata, shutil

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ = os.path.join(RAIZ, 'public', 'players.json')
LOGOS = os.path.join(RAIZ, 'public', 'logos.json')
SAIDA = os.path.join(RAIZ, 'tools', 'mapa_logos.json')

RUIDO = set('fc sc cf ac ad ud cd rc rcd sd sv vfl vfb tsg sk jk fk kv krc kaa rsc afc osc '
            'ssc ss us as ca cs ec se aa gd cp hnk nk gnk ofk pfk bsc sfc club clube de da do '
            'the balompie calcio futebol futbol football kulubu'.split())

# apelidos confirmados a mao — o arquivo do escudo tem um nome, o jogo tem outro
ALIAS = {
 'Vasco': 'vasco-da-gama', 'Atlético-MG': 'atletico-mineiro', 'Athletico-PR': 'athletico-paranaense',
 'América-MG': 'america-mineiro', 'Nautico Recife': 'nautico', 'Operário-PR': 'operario-ferroviario',
 'Sport': 'sport-recife', 'West Ham United': 'west-ham', 'Wolverhampton Wanderers': 'wolves',
 'Bolton Wanderers': 'bolton', 'Brighton & Hove Albion': 'brighton', 'Ipswich Town': 'ipswich',
 'Tottenham Hotspur': 'tottenham', 'Olympique Lyonnais': 'lyon', 'Olympique de Marseille': 'marseille',
 'OGC Nice': 'nice', 'Stade Rennais FC': 'rennes', 'Stade Brestois 29': 'brest', 'Angers SCO': 'angers',
 'AJ Auxerre': 'auxerre', 'Metz': 'fc-metz', 'En Avant Guingamp': 'guingamp',
 '1. FSV Mainz 05': 'mainz-05', 'Bielefeld': 'arminia-bielefeld', 'Hellas Verona FC': 'verona',
 'ADO Den Haag': 'ado-den-haag', 'Excelsior': 'excelsior-rotterdam', 'Willem II': 'willem-ii',
 'SL Benfica': 'benfica', 'Sporting Clube de Braga': 'sc-braga', 'Vitória Guimarães': 'vitoria-de-guimaraes',
 'Marítimo': 'maritimo', 'Medipol Başakşehir FK': 'basaksehir', 'FK Bodø/Glimt': 'bodo-glimt',
 'FC København': 'copenhagen', 'Ferencvárosi Torna Club': 'ferencvaros', 'Racing Santander': 'racing',
 'Sporting Gijón': 'sporting-gijon', 'Göztepe': 'goztepe-izmir', 'Kasımpaşa': 'kasimpasa',
 'Sampaio Corrêa': 'sampaio-correa', 'Botafogo-PB': 'botafogo-pb', 'Ypiranga-RS': 'ypiranga',
 'Ferroviária': 'ferroviaria', 'Volta Redonda': 'volta-redonda', 'Inter de Limeira': 'inter-de-limeira',
}

def norm(t):
    t = unicodedata.normalize('NFD', t).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]', '', t)

def nucleo(t):
    t = unicodedata.normalize('NFD', t).encode('ascii', 'ignore').decode().lower()
    ws = [w for w in re.split(r'[^a-z0-9]+', t) if w and w not in RUIDO and not w.isdigit()]
    return ''.join(ws)

def main():
    dados = json.load(open(ARQ, encoding='utf-8'))
    logos = json.load(open(LOGOS, encoding='utf-8'))
    # o ligas_reais.py já sabe, de cada clube que ele renomeou, qual é o escudo certo.
    # Esses apelidos mandam mais que o casamento por nome — é o que garante que nenhum
    # clube receba o escudo de outro.
    extra = os.path.join(RAIZ, 'tools', 'alias_ligas.json')
    if os.path.exists(extra):
        ALIAS.update(json.load(open(extra, encoding='utf-8')))
    porNorm, porNucleo = {}, {}
    for s in logos:
        porNorm.setdefault(norm(s.replace('-', ' ')), s)
        n = nucleo(s.replace('-', ' '))
        if n: porNucleo.setdefault(n, s)

    # UM ESCUDO PERTENCE A UM CLUBE SÓ.
    #
    # O casamento é por núcleo do nome, e "SC" é ruído: o Barcelona SC do Equador
    # virava "barcelona" e saía jogando a Libertadores com o escudo do Barcelona da
    # Espanha. Agora, quando dois clubes disputam o mesmo escudo, fica com ele o do
    # elenco mais forte — que é quase sempre o dono do nome — e o outro fica SEM
    # escudo, que é a regra da casa: não pôr escudo onde não se sabe.
    def forca(c):
        ps = [p[2] for p in (c.get('players') or [])]
        return sum(ps) / len(ps) if ps else 0

    todos = [c for liga in dados['leagues'] for c in liga['clubs']]
    mapa, sem, usados, disputados = {}, 0, set(), []

    # 1) o apelido vindo do ligas_reais.py manda em tudo
    for c in todos:
        s = ALIAS.get(c['n'])
        if s and s in logos:
            mapa[c['n']] = s
            usados.add(s)

    # 2) o resto, do elenco mais forte para o mais fraco
    for c in sorted(todos, key=forca, reverse=True):
        n = c['n']
        if n in mapa:
            continue
        s = porNorm.get(norm(n)) or porNucleo.get(nucleo(n))
        if not s or s not in logos:
            sem += 1
            continue
        if s in usados:
            disputados.append(n)
            sem += 1
            continue
        mapa[n] = s
        usados.add(s)
    if disputados:
        print(f'   {len(disputados)} clube(s) ficaram sem escudo por disputa de nome: '
              + ', '.join(disputados[:6]))

    json.dump(mapa, open(SAIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    shutil.copy(SAIDA, os.path.join(RAIZ, 'public', 'mapa_logos.json'))
    print(f'{len(mapa)} clubes com escudo oficial, {sem} sem')

if __name__ == '__main__':
    main()
