#!/usr/bin/env python3
"""
escudos_europa.py — importa o pack europeu e confere as ligas contra ele.

O pack (football-logos-master) é a melhor fonte que apareceu até agora: 25 ligas
europeias, UMA PASTA POR LIGA, e cada escudo com o NOME DO CLUBE no arquivo. Isso
resolve os dois problemas de uma vez — o escudo tem dono conhecido, e a lista de
quem joga cada campeonato vem junto, na temporada 2026/27.

O que este script faz:

1. Importa os escudos que faltam. Um clube que o jogo já tem NÃO é reimportado:
   o casamento é pelo miolo do nome, então "SL Benfica" reconhece o "benfica" que
   já existe e reaproveita o mesmo arquivo, em vez de criar um escudo duplicado.
2. Encolhe para 64px com o `sips` (nativo do macOS). Os originais têm 139x181 e
   pesam ~25 KB; embutidos crus, o arquivo de 1 clique iria de 4,4 MB para ~17 MB.
3. Grava `tools/europa_2026.json` com a lista oficial de cada liga, já no formato
   do `ligas_reais.json`, mantendo a ORDEM que eu já tinha curado à mão e jogando
   os clubes novos no fim.
4. Compara com o `ligas_reais.json` e diz, liga por liga, quem eu tinha colocado
   e não deveria, e quem faltou.

O passo 4 é o mais valioso: é o que aponta erro na minha lista escrita à mão.

Uso:  python3 tools/escudos_europa.py [pasta-do-pack]
"""
import base64
import difflib
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGOS = os.path.join(RAIZ, 'public', 'logos.json')
TABELA = os.path.join(RAIZ, 'tools', 'ligas_reais.json')
SAIDA = os.path.join(RAIZ, 'tools', 'europa_2026.json')
PADRAO = os.path.expanduser('~/Downloads/football-logos-master/logos')

# Pasta do pack -> nome da liga no jogo.
LIGAS = {
    'Austria - Bundesliga': 'Áustria — Liga',
    'Belgium - Jupiler Pro League': 'Bélgica — Liga',
    'Croatia - SuperSport HNL': 'Croácia — Liga',
    'Czech Republic - Chance Liga': 'República Tcheca — Liga',
    'Denmark - Superliga': 'Dinamarca — Liga',
    'England - Premier League': 'Inglaterra — 1ª Divisão',
    'France - Ligue 1': 'França — 1ª Divisão',
    'Germany - Bundesliga': 'Alemanha — 1ª Divisão',
    'Greece - Super League 1': 'Grécia — Liga',
    'Italy - Serie A': 'Itália — 1ª Divisão',
    'Netherlands - Eredivisie': 'Holanda — 1ª Divisão',
    'Norway - Eliteserien': 'Noruega — Liga',
    'Poland - PKO BP Ekstraklasa': 'Polônia — 1ª Divisão',
    'Portugal - Liga Portugal': 'Portugal — Liga',
    'Romania - SuperLiga': 'Romênia — 1ª Divisão',
    'Russia - Premier Liga': 'Rússia — Liga',
    'Scotland - Scottish Premiership': 'Escócia — Liga',
    'Serbia - Super liga Srbije': 'Sérvia — Liga',
    'Spain - LaLiga': 'Espanha — 1ª Divisão',
    'Sweden - Allsvenskan': 'Suécia — Liga',
    'Switzerland - Super League': 'Suíça — Liga',
    'Türkiye - Süper Lig': 'Turquia — 1ª Divisão',
    'Ukraine - Premier Liga': 'Ucrânia — Liga',
    # Estas duas nao existiam no jogo; o ligas_reais.py cria a partir dos clubes
    # genericos que sobraram quando as ligas europeias encolheram para o tamanho real.
    'Bulgaria - efbet Liga': 'Bulgária — Liga',
    "Israel - Ligat ha'Al": 'Israel — Liga',
}
SEM_LIGA_NO_JOGO = set()

# Nomes que o pack escreve em ingles e que no Brasil se conhece de outro jeito.
RENOMEAR = {
    'Red Star Belgrade': 'Crvena Zvezda',
    'FK Partizan Belgrade': 'Partizan',
    'Heart of Midlothian FC': 'Hearts',
}
# "Türkiye - Süper Lig" nao casa por igualdade de string por causa do ü; o miolo casa.
LIGAS_NORM = None  # preenchido no fim do modulo, depois que nucleo() existe

RUIDO = set('fc sc cf ac ad ud cd rc rcd sd sv vfl vfb tsg sk jk fk kv krc kaa rsc afc osc '
            'ssc ss us as ca cs ec se aa gd cp hnk nk gnk ofk pfk bsc sfc club clube de da do '
            'the balompie calcio futebol futbol football kulubu'.split())
ESTRANHAS = str.maketrans({'ø': 'o', 'Ø': 'o', 'ß': 's', 'đ': 'd', 'ł': 'l', 'æ': 'a', 'ð': 'd'})


def nucleo(t):
    t = unicodedata.normalize('NFD', t.translate(ESTRANHAS)).encode('ascii', 'ignore').decode().lower()
    ws = [w for w in re.split(r'[^a-z0-9]+', t) if w and w not in RUIDO and not w.isdigit()]
    return ''.join(ws)


def mesmo_clube(a, b):
    """'Inter' e 'Inter Milan' são o mesmo. 'AEK Atenas' e 'AEK Athens' também.

    O pack escreve os nomes em inglês e a minha lista usa o nome comum, então a
    comparação crua acusaria a liga inteira como errada. Três caminhos: miolo igual,
    um contido no outro, ou parecidos o bastante (difflib) para grafia diferente.
    """
    na, nb = nucleo(a), nucleo(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    if (len(na) >= 4 and na in nb) or (len(nb) >= 4 and nb in na):
        return True
    return difflib.SequenceMatcher(None, na, nb).ratio() >= 0.82


def semelhanca(a, b):
    """Quanto dois nomes parecem ser o mesmo clube. 0 = nem considere.

    Serve para o casamento um-para-um: o par mais parecido escolhe primeiro. Por
    isso "um contém o outro" vale menos que o miolo idêntico — assim "Club Brugge"
    fica com o Club Brugge antes que o "Cercle Brugge" possa reivindicar o nome.
    """
    na, nb = nucleo(a), nucleo(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    r = difflib.SequenceMatcher(None, na, nb).ratio()
    if (len(na) >= 4 and na in nb) or (len(nb) >= 4 and nb in na):
        return max(r, 0.80)
    return r if r >= 0.62 else 0.0


def slugify(nome):
    t = unicodedata.normalize('NFD', nome.translate(ESTRANHAS)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', t)).strip('-')


def encolher(caminho, tmp):
    """64px com o sips. Devolve os bytes do PNG reduzido, ou o original se falhar."""
    saida = os.path.join(tmp, 'x.png')
    r = subprocess.run(['sips', '-Z', '64', caminho, '--out', saida],
                       capture_output=True)
    alvo = saida if r.returncode == 0 and os.path.exists(saida) else caminho
    with open(alvo, 'rb') as f:
        return f.read()


def main():
    origem = sys.argv[1] if len(sys.argv) > 1 else PADRAO
    if not os.path.isdir(origem):
        # Os escudos já foram embutidos em logos.json e a composição das ligas já está
        # em europa_2026.json, ambos versionados. O pack em Downloads é descartável:
        # depois de importado uma vez, pode ser apagado sem perder nada.
        print(f'{origem} não existe — usando o europa_2026.json que já foi gerado')
        return

    logos = json.load(open(LOGOS, encoding='utf-8')) if os.path.exists(LOGOS) else {}
    antes = len(logos)
    # miolo do nome -> slug que o jogo já usa, para não duplicar escudo
    por_nucleo = {}
    for s in logos:
        n = nucleo(s.replace('-', ' '))
        if n:
            por_nucleo.setdefault(n, s)

    tabela = json.load(open(TABELA, encoding='utf-8')) if os.path.exists(TABELA) else {}

    saida, novos = {}, 0
    tmp = tempfile.mkdtemp()
    for pasta in sorted(os.listdir(origem)):
        if pasta in SEM_LIGA_NO_JOGO:
            continue
        liga = LIGAS.get(pasta) or LIGAS_NORM.get(nucleo(pasta))
        caminho = os.path.join(origem, pasta)
        if not liga or not os.path.isdir(caminho):
            if os.path.isdir(caminho):
                print(f'aviso: pasta "{pasta}" não tem liga correspondente, pulei')
            continue

        itens = []
        for arq in sorted(os.listdir(caminho)):
            if not arq.endswith('.png'):
                continue
            nome = arq[:-4]
            n = nucleo(nome)
            slug = por_nucleo.get(n)
            if not slug:
                slug = slugify(nome)
                dados = encolher(os.path.join(caminho, arq), tmp)
                logos[slug] = 'data:image/png;base64,' + base64.b64encode(dados).decode('ascii')
                por_nucleo[n] = slug
                novos += 1
            itens.append([nome, slug])

        # Casa cada clube do pack com o da minha lista curada, UM PARA UM.
        #
        # Um para um é o ponto. Casando cada um por conta própria, "Cercle Brugge"
        # engolia o nome "Club Brugge" (um contém o outro), "Paris FC" virava
        # "Paris Saint-Germain" e o Espanyol virava Barcelona. Resolvendo os pares
        # de maior semelhança primeiro e gastando cada nome uma única vez, o par
        # óbvio leva o nome antes que o parecido tenha chance.
        anterior = [x[0] for x in tabela.get(liga, [])]
        pares = []
        for pi, it in enumerate(itens):
            for mi, velho in enumerate(anterior):
                s = semelhanca(it[0], velho)
                if s:
                    pares.append((s, pi, mi))
        pares.sort(reverse=True)
        de_pack, de_meu = {}, set()
        for s, pi, mi in pares:
            if pi in de_pack or mi in de_meu:
                continue
            de_pack[pi] = mi
            de_meu.add(mi)

        # o nome curado à mão fica (o pack escreve em inglês), e a ordem também;
        # clube que eu não tinha entra no fim, em ordem alfabética
        for pi, mi in de_pack.items():
            itens[pi][0] = anterior[mi]
        itens = [it for _o, _i, it in
                 sorted((de_pack.get(pi, 10_000), pi, it) for pi, it in enumerate(itens))]

        # Depois de ordenar, e só depois: o pack usa o nome em inglês de alguns clubes
        # que no Brasil se conhece de outro jeito. A ordem no ligas_reais.json continua
        # escrita com o nome do pack, então o casamento da próxima rodada não quebra.
        for it in itens:
            it[0] = RENOMEAR.get(it[0], it[0])
        saida[liga] = itens

    json.dump(logos, open(LOGOS, 'w', encoding='utf-8'), separators=(',', ':'))
    json.dump(saida, open(SAIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    mb = os.path.getsize(LOGOS) / 1024 / 1024
    print(f'escudos: {antes} -> {len(logos)} (+{novos} novos), logos.json com {mb:.1f} MB')
    print(f'lista oficial das {len(saida)} ligas gravada em {SAIDA}')
    print()
    print('=== o pack contra a minha lista escrita à mão ===')
    limpas = 0
    for liga, itens in saida.items():
        oficiais = [x[0] for x in itens]
        meus = [x[0] for x in tabela.get(liga, [])]
        sobrando = [m for m in meus if not any(mesmo_clube(m, o) for o in oficiais)]
        faltando = [o for o in oficiais if not any(mesmo_clube(o, m) for m in meus)]
        if not sobrando and not faltando:
            limpas += 1
            continue
        print(f'\n{liga}  ({len(itens)} clubes no pack, {len(meus)} na minha lista)')
        if sobrando:
            print(f'   NÃO deveriam estar: {", ".join(sobrando)}')
        if faltando:
            print(f'   faltaram: {", ".join(faltando)}')
    print(f'\n{limpas} liga(s) já batiam certinho com o pack.')
    return 0


LIGAS_NORM = {nucleo(k): v for k, v in LIGAS.items()}

if __name__ == '__main__':
    raise SystemExit(main())
