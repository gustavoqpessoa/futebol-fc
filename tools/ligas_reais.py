#!/usr/bin/env python3
"""
ligas_reais.py — põe cada clube REAL no campeonato certo.

Por que este script existe
--------------------------
O `series_reais.py` criava uma liga chamada "Resto do Mundo": um balde com todo
escudo oficial que sobrou sem dono. Foi assim que o FC Porto, o Napoli, o Zenit e
o Athletic Bilbao foram parar fora das ligas deles.

Pior: aquele balde COPIAVA o elenco de clubes de divisões inferiores. O Porto ficou
com jogadores da 2ª divisão espanhola, o Napoli com o elenco do Leicester. Como era
cópia e não mudança, os mesmos ~2.900 jogadores existiam em dois clubes ao mesmo
tempo. Apagar o balde não perde nada — só tira a duplicata.

O que este script faz
---------------------
1. Apaga a liga "Resto do Mundo".
2. Para cada campeonato de `ligas_reais.json`, casa PRIMEIRO pelo nome, um para um:
   quem já está com o nome certo fica exatamente como está, com o elenco intacto.
   Só as vagas que sobram recebem os nomes que faltam, aí sim do elenco mais forte
   para o mais fraco. Nenhum jogador é inventado.

   **Casar pelo nome antes de tudo não é detalhe: é o que salva o dado.** O
   `players.base.json` vem do SoFIFA e tem os jogadores reais no clube certo — o
   Haaland está no Manchester City. A primeira versão deste script distribuía os
   nomes só por força de elenco, e o resultado foi Haaland e Rodri no Chelsea,
   Salah no City e Bellingham no Leverkusen. **Nunca volte a ordenar por força
   sem casar pelo nome primeiro.**
3. Se a lista real for maior que o número de vagas, sobe os clubes mais fortes da
   divisão de baixo do mesmo país para completar. Se for menor, as vagas que sobram
   ficam com o nome que já tinham.
4. Reaplica a cor real do clube a partir de `escudos.js`, para o uniforme na tela
   não continuar com a cor do clube antigo.
5. Grava `tools/alias_ligas.json` ligando cada nome novo ao arquivo do escudo, para
   o `mapear_logos.py` não precisar adivinhar.

REGRA: `ligas_reais.json` só aceita clube que tem escudo oficial. Se não souber de
qual clube é um escudo, deixe de fora — não chute.

Uso:  python3 tools/ligas_reais.py
"""
import difflib
import json
import os
import re
import unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ = os.path.join(RAIZ, 'public', 'players.json')
LOGOS = os.path.join(RAIZ, 'public', 'logos.json')
TABELA = os.path.join(RAIZ, 'tools', 'ligas_reais.json')
EUROPA = os.path.join(RAIZ, 'tools', 'europa_2026.json')
ORDEM_TM = os.path.join(RAIZ, 'tools', 'transfermarkt_ordem.json')
ESCUDOS = os.path.join(RAIZ, 'src', 'career', 'escudos.js')
ALIAS_SAIDA = os.path.join(RAIZ, 'tools', 'alias_ligas.json')

# A Série A fica de fora: os 704 jogadores dela vêm do .docx do Gustavo e estão
# amarrados ao clube certo — renomear por força destruiria esse dado.
# A C e a D já recebem os nomes reais no series_reais.py, na ordem dos grupos.
# A Série B NÃO está aqui de propósito: os elencos dela são nomes gerados, não os
# reais do .docx, então pode ser tratada como qualquer outra liga do mundo.
INTOCAVEIS = {'Brasileirão Série A', 'Brasileirão Série C', 'Brasileirão Série D'}

# Ligas cuja lista é COMPLETA, e não apenas o que eu conhecia. Só nelas faz sentido
# encolher a liga para caber na lista. As do pack europeu entram aqui sozinhas; a
# Série B entra porque o Gustavo conferiu clube a clube.
COMPLETAS = {
    'Brasileirão Série B',
    # Pesquisadas clube a clube na temporada 2025/26–2026 e conferidas na Wikipédia.
    # Estar aqui autoriza o script a ENCOLHER a liga até o tamanho real: a A-League
    # tem 12 clubes e não 18, a liga canadense tem 8, a MLS tem 30.
    'África do Sul — Liga', 'Costa do Marfim — Liga', 'Senegal — Liga',
    'Austrália — Liga', 'Paraguai — Liga', 'Canadá — Liga',
    'Estados Unidos — 1ª Divisão',
    # Segunda leva de pesquisa: América do Sul inteira fora Brasil/Argentina, mais Ásia.
    'Uruguai — Liga', 'Chile — Liga', 'Colômbia — Liga', 'Peru — Liga',
    'Equador — Liga', 'Bolívia — Liga', 'Venezuela — Liga',
    'Japão — Liga', 'China — 1ª Divisão',
    # Terceira leva: ligas que estavam quase inteiras inventadas. A NB I tem 12
    # clubes, a Veikkausliiga 12 e a UAE Pro League 14 — o jogo dava 18 a todas.
    'Hungria — Liga', 'Finlândia — Liga', 'Emirados Árabes Unidos — Liga',
    'México — Liga', 'Irlanda — Liga',
    'Índia — Liga', 'Coreia do Sul — Liga',
    'Romênia — 2ª Divisão', 'China — 2ª Divisão', 'Polônia — 2ª Divisão',
    'Espanha — 2ª Divisão', 'Holanda — 2ª Divisão', 'Alemanha — 4ª Divisão',
    'Argentina — 1ª Divisão',
    'Alemanha — 2ª Divisão',
    'Arábia Saudita — Liga',
    # A galesa estava com Cardiff/Swansea/Wrexham INVENTADOS, enquanto os de
    # verdade jogam na Inglaterra. Agora é a Cymru Premier real.
    'País de Gales — Liga', 'Nova Zelândia — Liga', 'Chipre — Liga',
    # Divisoes de baixo que estavam menores que a realidade — a 2a dos EUA tinha
    # DOIS clubes, a Serie B italiana tinha 12 no lugar de 20.
    'Itália — 2ª Divisão', 'Alemanha — 3ª Divisão', 'Holanda — 2ª Divisão',
    'Estados Unidos — 2ª Divisão',
    'Itália — 3ª Divisão', 'Espanha — 3ª Divisão', 'Argentina — 2ª Divisão',
}

# Quantos clubes cada DIVISAO DE BAIXO tem de verdade, pesquisado na Wikipedia.
#
# Nao da para usar o tamanho da lista de nomes: o pack europeu 2026/27 tira da
# Serie B os clubes que subiram para a Serie A (Monza, Venezia, Frosinone), e a
# lista encolhe para 17 mesmo a liga tendo 20 vagas. O que falta e preenchido com
# clube novo, que e melhor do que a divisao rodar com menos times do que tem.
TAMANHO_REAL = {
    'Itália — 2ª Divisão': 20,          # Serie B
    'Alemanha — 3ª Divisão': 20,        # 3. Liga
    'Holanda — 2ª Divisão': 20,         # Eerste Divisie
    'Estados Unidos — 2ª Divisão': 25,  # USL Championship
    # Divisões que sao grandes de verdade e estavam minusculas no jogo. O motor
    # divide liga acima de 24 clubes em grupos, que e como elas funcionam mesmo:
    # a Serie C sao tres grupos de 20, a Primera Federacion dois de 20, a Primera
    # Nacional duas zonas de 18.
    'Itália — 3ª Divisão': 60,          # Serie C
    'Espanha — 3ª Divisão': 40,         # Primera Federación
    'Argentina — 2ª Divisão': 36,
    'Espanha — 2ª Divisão': 22,         # Segunda División
    'Argentina — 1ª Divisão': 30,       # Liga Profesional, dois grupos de 15
    'Romênia — 2ª Divisão': 21,         # Liga II (22 de verdade, 1 já está na Liga I)
    'Polônia — 2ª Divisão': 18,         # I liga
    # A pirâmide inglesa: League One, League Two e National League têm 24 clubes
    # cada uma. No jogo estavam com 16, 18 e 15 — a League One acabava em abril e
    # sobrava meia liga. A League Two e a National League 26-27 vieram dos prints
    # do Gustavo (Transfermarkt); a League One saiu por eliminação, com os clubes
    # ingleses que sobraram das outras duas listas — CONFERIR com um print dele.
    'Inglaterra — 2ª Divisão': 24,      # Championship
    'Inglaterra — 3ª Divisão': 24,      # League One
    'Inglaterra — 4ª Divisão': 24,      # League Two
    'Inglaterra — 5ª Divisão': 24,      # National League
       # Primera Nacional
}

# Ligas que o pack traz mas que o jogo ainda nao tinha. Sao criadas com os clubes
# genericos que sobraram quando as ligas europeias encolheram para o tamanho real:
# o elenco muda de dono, nao e inventado nem copiado.
NOVAS_LIGAS = {
    'Bulgária — Liga': ('Bulgária', 1),
    'Israel — Liga': ('Israel', 1),
}


def clube_do_zero(liga):
    """Um clube novo com elenco no nível da divisão.

    Os jogadores são gerados, como os que o jogo já cria para completar elenco
    curto — não são inventados a partir de gente real. O nome do CLUBE é que vem
    da pesquisa e é substituído logo depois por um dos nomes verdadeiros.
    """
    import random as _r
    forcas = [p[2] for c in liga['clubs'] for p in c['players']] or [60]
    forcas.sort()
    media = forcas[len(forcas) // 2]
    POS = [('G', 'GOL', 3), ('Z', 'ZAG', 6), ('L', 'LE', 2), ('L', 'LD', 2),
           ('M', 'VOL', 4), ('M', 'MC', 4), ('M', 'MEI', 2),
           ('A', 'PE', 2), ('A', 'PD', 2), ('A', 'ATA', 4)]
    # nome de gente do país da liga (tools/nomes_paises.json)
    _n = json.load(open(os.path.join(RAIZ, 'tools', 'nomes_paises.json'), encoding='utf-8'))
    _pais = liga.get('country')
    PRI, SOB = (_n[_pais] if _pais in _n and not str(_pais).startswith('_')
                else _n['_familias'].get(_n['_familia_do_pais'].get(_pais, ''),
                                         _n['_familias']['anglo']))
    jogadores = []
    for grupo, sub, quantos in POS:
        for _ in range(quantos):
            idade = 19 + _r.randrange(14)
            ovr = max(40, min(80, int(_r.gauss(media - 1, 4))))
            pot = min(88, ovr + _r.randrange(2, 12))
            val = int(ovr * ovr * 140)
            jogadores.append([f'{_r.choice(PRI)} {_r.choice(SOB)}', grupo, ovr, pot,
                              idade, val, int(val * 0.012),
                              'L' if sub in ('LE', 'PE') and _r.random() < 0.7 else 'R',
                              grupo, sub])
    return {'n': nome_de_clube(liga.get('country'), liga), 't': 'wm', 'players': jogadores}


# Cidades de verdade, para o clube novo não sair chamado "Novo 5244" — foi o que
# apareceu na Serie B quando a criação passou depois do rename_generic.
CIDADES = {
    # Sem Cremona: a Cremonese ja e o clube daquela cidade, e o jogo mostrava
    # 'AC Cremona' e 'Cremonese' lado a lado na mesma tabela.
    'Itália': ['Livorno', 'Perugia', 'Ancona', 'Terni', 'Foggia', 'Trapani', 'Novara',
               'Lecco', 'Arezzo', 'Cosenza', 'Taranto', 'Sassari', 'Rimini', 'Pisa',
               'Siena', 'Pistoia', 'Lucca', 'Massa', 'Grosseto', 'Viterbo', 'Latina',
               'Frosinone', 'Caserta', 'Salerno', 'Potenza', 'Matera', 'Lecce',
               'Brindisi', 'Andria', 'Barletta', 'Crotone', 'Catanzaro', 'Messina',
               'Siracusa', 'Ragusa', 'Agrigento', 'Marsala', 'Alessandria', 'Asti',
               'Biella', 'Vercelli', 'Como', 'Varese', 'Bergamo', 'Brescia', 'Mantova',
               'Piacenza', 'Parma', 'Ferrara', 'Ravenna', 'Forlì', 'Cesenatico',
               'Pordenone', 'Trieste', 'Udine', 'Bolzano', 'Trento', 'Rovigo'],
    'Alemanha': ['Chemnitz', 'Halle', 'Jena', 'Erfurt', 'Oldenburg', 'Lübeck',
                 'Trier', 'Koblenz', 'Siegen', 'Bayreuth', 'Kassel', 'Fulda',
                 'Gießen', 'Marburg', 'Paderborn', 'Bielefeld', 'Herne', 'Iserlohn'],
    'Holanda': ['Breda', 'Arnhem', 'Zwolle', 'Leeuwarden', 'Almere', 'Hengelo',
                'Deventer', 'Amersfoort', 'Haarlem', 'Nijmegen'],
    'Estados Unidos': ['Charlotte', 'Memphis', 'Omaha', 'Tucson', 'Boise', 'Fresno',
                       'Reno', 'Spokane', 'Toledo', 'Wichita', 'Mobile', 'Akron'],
    'Espanha': ['Burgos', 'Huesca', 'Lugo', 'Ferrol', 'Albacete', 'Castellón',
                'Badajoz', 'Cáceres', 'Salamanca', 'Zamora', 'Ourense', 'Pontevedra',
                'Talavera', 'Linares', 'Algeciras', 'Marbella', 'Melilla', 'Ceuta',
                'Teruel', 'Soria', 'Ávila', 'Segovia', 'Cuenca', 'Guadalajara',
                'Toledo', 'Jaén', 'Almería', 'Murcia', 'Alicante', 'Elche'],
    'Argentina': ['Bahía Blanca', 'Tandil', 'Junín', 'Pergamino', 'Concordia',
                  'Paraná', 'Posadas', 'Resistencia', 'Formosa', 'Salta', 'Jujuy',
                  'Catamarca', 'La Rioja', 'San Luis', 'Neuquén', 'Río Gallegos',
                  'Trelew', 'Comodoro', 'San Juan', 'Mendoza', 'Villa María',
                  'Río Cuarto', 'Olavarría', 'Necochea', 'Chivilcoy', 'Luján'],
    'França': ['Amiens', 'Caen', 'Grenoble', 'Pau', 'Annecy', 'Laval'],
    'Inglaterra': ['Barnsley', 'Rotherham', 'Doncaster', 'Wigan', 'Crewe', 'Exeter'],
    # Sem isto o clube brasileiro que sobrava caía na lista inglesa e a Série C
    # ficava com um "Barnsley 342" no meio dos times de verdade.
    'Brasil': ['Marília', 'Rio Claro', 'Araçatuba', 'Bauru', 'Jaú', 'Franca',
               'Barretos', 'Catanduva', 'Assis', 'Itapetininga', 'Registro',
               'Ubatuba', 'Caraguatatuba', 'Itanhaém', 'Avaré', 'Lins'],
}
PREFIXO = {'Brasil': ['EC', 'AA', 'CA'],
           'Itália': ['AC', 'US', 'SS'], 'Alemanha': ['FC', 'SV', 'VfL'],
           'Holanda': ['FC', 'SC', 'VV'], 'Estados Unidos': ['', 'FC', ''],
           'Espanha': ['CD', 'CF', 'UD'], 'França': ['FC', 'AS', 'US'],
           'Inglaterra': ['', 'FC', '']}
_usados_novos = set()


def nome_de_clube(pais, liga):
    import random as _r
    ja = {c['n'] for l in (liga,) for c in l['clubs']} | _usados_novos
    cidades = CIDADES.get(pais) or CIDADES['Inglaterra']
    prefixos = PREFIXO.get(pais) or ['FC', 'SC', '']
    ja_cidade = {n.split()[-1] for n in _usados_novos}
    for cidade in _r.sample(cidades, len(cidades)):
        if cidade.split()[-1] in ja_cidade:
            continue
        for pre in prefixos:
            nome = f'{pre} {cidade}'.strip()
            if nome not in ja:
                _usados_novos.add(nome)
                return nome
    # Acabaram as combinações de prefixo + cidade. Antes eu punha um número no fim e
    # nascia o "Barnsley 342"; agora tento os sufixos, que é como clube pequeno se
    # chama de verdade.
    for cidade in _r.sample(cidades, len(cidades)):
        for suf in ('FC', 'EC', 'AC', 'Atlético', 'United'):
            nome = f'{cidade} {suf}'
            if nome not in ja:
                _usados_novos.add(nome)
                return nome
    n = f'{_r.choice(cidades)} {_r.choice(("FC", "EC", "AC"))} {len(_usados_novos) + 1}'
    _usados_novos.add(n)
    return n


def norm(t):
    t = unicodedata.normalize('NFD', t).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]', '', t)


import importlib.util as _iu
_spec = _iu.spec_from_file_location('_ml', os.path.join(RAIZ, 'tools', 'mapear_logos.py'))
_ml = _iu.module_from_spec(_spec)
_spec.loader.exec_module(_ml)
APELIDOS = _ml.ALIAS

RUIDO = set('fc sc cf ac ad ud cd rc rcd sd sv vfl vfb tsg sk jk fk kv krc kaa rsc afc osc '
            'ssc ss us as ca cs ec se aa gd cp hnk nk gnk ofk pfk bsc sfc club clube de da do '
            'the balompie calcio futebol futbol football kulubu'.split())


ESTRANHAS = str.maketrans({'ø': 'o', 'Ø': 'o', 'ß': 's', 'đ': 'd', 'ł': 'l', 'æ': 'a', 'ð': 'd'})


def nucleo(t):
    """Nome sem as siglas e o ruído, para saber se duas grafias são o mesmo clube.

    As letras que o NFD não desmonta (ø, ł, đ...) viram a vizinha latina na mão —
    senão "Bodø/Glimt" e "bodo-glimt" não se reconhecem.
    """
    t = unicodedata.normalize('NFD', t.translate(ESTRANHAS)).encode('ascii', 'ignore').decode().lower()
    ws = [w for w in re.split(r'[^a-z0-9]+', t) if w and w not in RUIDO and not w.isdigit()]
    return ''.join(ws)


def semelhanca(a, b):
    """Quanto dois nomes parecem ser o mesmo clube. 0 = nem considere.

    Usado no casamento um-para-um entre os clubes que JÁ existem na liga e a lista
    real. É o que impede o elenco de mudar de dono: se o "Manchester City" já está
    lá com o Haaland dentro, ele fica sendo o Manchester City.
    """
    na, nb = nucleo(a), nucleo(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    r = difflib.SequenceMatcher(None, na, nb).ratio()
    if (len(na) >= 4 and na in nb) or (len(nb) >= 4 and nb in na):
        return max(r, 0.80)
    return r if r >= 0.70 else 0.0


def mesmo_clube(a, b):
    """Duas grafias do mesmo clube? 'Göztepe SK' e 'Göztepe İzmir' são.

    Usado só para decidir se um nome pode ser reciclado. Errar para o lado de dizer
    "é o mesmo" apenas tira o nome do sorteio, o que não estraga nada.
    """
    na, nb = nucleo(a), nucleo(b)
    if not na or not nb:
        return False
    return na == nb or (len(na) >= 5 and na in nb) or (len(nb) >= 5 and nb in na)


def escudo_de(nome, logos):
    """Qual escudo esse nome puxaria. Devolve None se nenhum casa com certeza.

    Consulta os mesmos apelidos do mapear_logos.py — sem eles, "Stade Rennais FC"
    não seria reconhecido como o Rennes e o nome seria reciclado dentro da própria
    liga do Rennes, criando dois clubes com o mesmo escudo.
    """
    if nome in APELIDOS:
        return APELIDOS[nome]
    for s in logos:
        aberto = s.replace('-', ' ')
        if norm(aberto) == norm(nome) or (nucleo(aberto) and nucleo(aberto) == nucleo(nome)):
            return s
    return None


def forca(clube):
    """Força do elenco: soma dos 11 melhores overalls."""
    return sum(sorted((p[2] for p in clube['players']), reverse=True)[:11])


def cores_dos_escudos():
    """Lê escudos.js e devolve {chave: (cor1, cor2)}. Só o que dá para ler com certeza."""
    if not os.path.exists(ESCUDOS):
        return {}
    txt = open(ESCUDOS, encoding='utf-8').read()
    padrao = re.compile(r"^\s*'?([a-z0-9]+)'?\s*:\s*\[\s*'[a-z]+'\s*,\s*(0x[0-9a-fA-F]+)\s*,\s*(0x[0-9a-fA-F]+)", re.M)
    return {m.group(1): (int(m.group(2), 16), int(m.group(3), 16)) for m in padrao.finditer(txt)}


def main():
    dados = json.load(open(ARQ, encoding='utf-8'))
    pais_da_liga = {l['name']: l.get('country') for l in dados['leagues']}
    tabela = {k: v for k, v in json.load(open(TABELA, encoding='utf-8')).items()
              if not k.startswith('_')}

    # O pack europeu (tools/europa_2026.json, gerado pelo escudos_europa.py) traz a
    # composição OFICIAL de 23 ligas na temporada 2026/27, com escudo por clube. Onde
    # ele existe, ele manda: foi assim que se descobriu que eu tinha posto Verona,
    # Pisa e Cremonese na Serie A no lugar de Monza, Frosinone e Venezia.
    # A ordem curada à mão é preservada pelo próprio escudos_europa.py.
    if os.path.exists(EUROPA):
        oficial = json.load(open(EUROPA, encoding='utf-8'))
        tabela.update(oficial)
        # Quem o pack coloca na 1ª divisão precisa SAIR das minhas listas de 2ª e 3ª.
        # Sem isto, o Monza subia para a Serie A e continuava na Serie B ao mesmo
        # tempo, e o mesmo com Schalke, Paderborn, Elversberg, Málaga, Le Mans...
        # Compara pelo escudo E pelo miolo do nome. Só pelo escudo não bastava: o pack
        # escreve "ESTAC Troyes" onde eu escrevi "Troyes", e como o slug saiu diferente
        # o Troyes ficava na Ligue 1 e na Ligue 2 ao mesmo tempo. Aqui a comparação de
        # nome é EXATA (nucleo == nucleo), nunca "um contém o outro" — do contrário o
        # Cercle Brugge seria confundido com o Club Brugge e sumiria da liga.
        # ...e SÓ dentro do mesmo país. Sem isso o "Athletic Club" de Bilbao expulsava
        # o Athletic de Minas da Série B: sem a sigla, os dois viram "athletic".
        promovidos, nomes_promovidos = {}, {}
        for lg, itens in oficial.items():
            p = pais_da_liga.get(lg)
            promovidos.setdefault(p, set()).update(s for _n, s in itens if s)
            nomes_promovidos.setdefault(p, set()).update(nucleo(n) for n, _s in itens)
        mudou = 0
        for liga, itens in tabela.items():
            if liga in oficial:
                continue
            p = pais_da_liga.get(liga)
            enxuta = [it for it in itens
                      if it[1] not in promovidos.get(p, ())
                      and nucleo(it[0]) not in nomes_promovidos.get(p, ())]
            if len(enxuta) != len(itens):
                mudou += len(itens) - len(enxuta)
                tabela[liga] = enxuta
        COMPLETAS.update(oficial)
        print(f'{len(oficial)} ligas europeias vieram do pack 2026/27 (mandam na composição)')
        if mudou:
            print(f'   {mudou} clube(s) saíram das divisões de baixo por terem subido')
    # A ordem de força de cada liga passa a vir do valor de mercado real somado dos
    # elencos (Transfermarkt), em vez do meu chute. Só a ORDEM: quem joga a liga
    # continua vindo do pack 2026/27, que é uma temporada mais novo.
    if os.path.exists(ORDEM_TM):
        ordem = json.load(open(ORDEM_TM, encoding='utf-8'))
        n_ord = 0
        for liga, slugs in ordem.items():
            if liga not in tabela:
                continue
            pos = {s: i for i, s in enumerate(slugs)}
            antes = [s for _n, s in tabela[liga]]
            tabela[liga] = [it for _p, _i, it in sorted(
                (pos.get(it[1], 10_000), i, it) for i, it in enumerate(tabela[liga]))]
            if [s for _n, s in tabela[liga]] != antes:
                n_ord += 1
        print(f'{n_ord} ligas reordenadas pelo valor de mercado real (Transfermarkt)')

    logos = json.load(open(LOGOS, encoding='utf-8')) if os.path.exists(LOGOS) else {}
    cores = cores_dos_escudos()

    # --- confere a tabela antes de mexer em qualquer coisa -------------------
    # slug NULO é permitido: quer dizer "clube real, sem escudo oficial — desenha um".
    # A regra antiga ("só entra quem tem escudo") estava barrando nome de verdade em
    # ligas inteiras da África, da Ásia e das Américas, e o resultado era pior: o jogo
    # ficava com "FC Bloemfontein Rovers" inventado no lugar do Mamelodi Sundowns.
    problemas = []
    vistos = {}
    for liga, itens in tabela.items():
        for nome, slug in itens:
            if not slug:
                continue
            if logos and slug not in logos:
                problemas.append(f'{liga}: "{nome}" aponta para o escudo "{slug}", que não existe')
            if slug in vistos:
                problemas.append(f'escudo "{slug}" usado duas vezes: {vistos[slug]} e {nome}')
            vistos[slug] = nome
    if problemas:
        print('PAREI. A tabela tem erro — nada foi gravado:')
        for p in problemas:
            print('  -', p)
        return 1

    ligas = {l['name']: l for l in dados['leagues']}
    pais_da_liga.update({l['name']: l.get('country') for l in dados['leagues']})
    sobras = []
    for liga in tabela:
        if liga not in ligas and liga not in NOVAS_LIGAS:
            print(f'aviso: liga "{liga}" não existe no jogo, ignorada')

    # --- 1. o balde vai embora ----------------------------------------------
    balde = [l for l in dados['leagues'] if l['name'] == 'Resto do Mundo']
    if balde:
        n_clubes = len(balde[0]['clubs'])
        n_jog = sum(len(c['players']) for c in balde[0]['clubs'])
        dados['leagues'] = [l for l in dados['leagues'] if l['name'] != 'Resto do Mundo']
        print(f'"Resto do Mundo" apagado: {n_clubes} clubes e {n_jog} jogadores duplicados a menos')

    # --- 1b. repatria o clube que está na divisão errada ---------------------
    #
    # O casamento por nome tem de ser feito no PAÍS inteiro, não dentro de cada liga.
    # O base tinha o "1. FC Union Berlin" na 2ª divisão alemã, com o elenco real
    # (Kemlein, Bogdanov, Ansah, Juranović); o pack 2026/27 coloca o clube na 1ª. Como
    # eu só procurava dentro da própria liga, a 1ª não achava nenhum Union Berlin e
    # dava o nome a um clube qualquer — o elenco real ficava para trás na 2ª.
    #
    # Aqui o clube MUDA DE DIVISÃO levando o elenco, que é o que acesso e rebaixamento
    # fazem de verdade.
    alvos_do_pais = {}
    for liga, itens in tabela.items():
        if liga in INTOCAVEIS:
            continue
        p = pais_da_liga.get(liga)
        if p:
            alvos_do_pais.setdefault(p, []).extend((liga, nome) for nome, _s in itens)

    mudados = 0
    protegidos = set()
    for pais, alvos in alvos_do_pais.items():
        onde = [(l, c) for l in dados['leagues'] if l.get('country') == pais
                and l['name'] not in INTOCAVEIS for c in l['clubs']]
        pares = []
        for ci, (_l, c) in enumerate(onde):
            for ai, (_liga, nome) in enumerate(alvos):
                s = semelhanca(c['n'], nome)
                if s >= 0.80:
                    pares.append((s, ci, ai))
        pares.sort(reverse=True)
        usados_c, usados_a = set(), set()
        for s, ci, ai in pares:
            if ci in usados_c or ai in usados_a:
                continue
            usados_c.add(ci); usados_a.add(ai)
            liga_atual, clube = onde[ci]
            liga_certa = alvos[ai][0]
            # Protegido de rebaixamento: este clube ESTÁ na liga porque o nome dele
            # está na lista real. Sem isso, o Union Berlin subia da 2ª com o elenco
            # certo (12 jogadores, elenco pequeno) e o passo seguinte, que ajusta o
            # tamanho da liga, rebaixava logo o mais fraco — ou seja, ele de novo.
            protegidos.add(id(clube))
            if liga_atual['name'] == liga_certa:
                continue
            destino = ligas.get(liga_certa)
            if not destino:
                continue
            liga_atual['clubs'].remove(clube)
            destino['clubs'].append(clube)
            mudados += 1
    if mudados:
        print(f'{mudados} clube(s) mudaram de divisão levando o elenco real junto')

    # --- 2. acerta o número de vagas antes de renomear ----------------------
    # Uma liga pode precisar de mais vagas do que tem. Nesse caso sobe os clubes mais
    # fortes da divisão de baixo do mesmo país, em vez de inventar elenco.
    por_pais = {}
    for l in dados['leagues']:
        por_pais.setdefault(l.get('country'), []).append(l)

    pendentes = []
    for liga in sorted(tabela, key=lambda k: (ligas.get(k, {}).get('tier') or 9)):
        L = ligas.get(liga)
        if not L or liga in INTOCAVEIS:
            continue
        faltam = len(tabela[liga]) - len(L['clubs'])
        if faltam == 0:
            continue
        abaixo = [x for x in por_pais.get(L.get('country'), [])
                  if (x.get('tier') or 1) == (L.get('tier') or 1) + 1]

        if faltam < 0 and liga not in COMPLETAS:
            # Lista PARCIAL (escrita à mão, só com quem tem escudo oficial): as vagas
            # que sobram ficam como estão. Sem esta guarda o Canadá perdia 15 clubes
            # só porque eu conhecia 3.
            continue

        if faltam < 0:
            # A liga tem MAIS clubes do que a lista real. Os que sobram não podem
            # ficar com o nome antigo: a França tinha 20 vagas e o pack diz 18, e os
            # dois restantes continuavam "Paris Saint-Germain" e "ESTAC Troyes",
            # batendo de frente com os verdadeiros. Os mais fracos descem.
            # quem casou pelo nome fica; desce quem sobra
            fica = [c for c in L['clubs'] if id(c) in protegidos]
            resto = sorted((c for c in L['clubs'] if id(c) not in protegidos),
                           key=forca, reverse=True)
            vagas = max(0, len(tabela[liga]) - len(fica))
            descem = resto[vagas:]
            L['clubs'] = fica + resto[:vagas]
            if abaixo:
                abaixo[0]['clubs'].extend(descem)
                print(f'{liga}: {len(descem)} clube(s) desceram para "{abaixo[0]["name"]}" '
                      f'(a liga real tem {len(tabela[liga])})')
            else:
                # Sem divisão de baixo no país. Em vez de jogar fora, o elenco vai para
                # a reserva e vira a base das ligas novas (Bulgária, Israel). Assim
                # nenhum jogador é inventado nem duplicado — só muda de dono.
                sobras.extend(descem)
                print(f'{liga}: {len(descem)} clube(s) genéricos foram para a reserva '
                      f'(a liga real tem {len(tabela[liga])})')
            continue

        if not abaixo:
            # Sem divisão de baixo no país (Colômbia, Japão). Fica para a segunda
            # passada, que usa a reserva de elencos liberada pelas ligas que
            # encolheram — assim a liga chega ao tamanho real sem inventar elenco.
            pendentes.append((liga, faltam))
            print(f'{liga}: faltam {faltam} clube(s) e não há divisão de baixo — vai para a reserva')
            continue
        doadora = abaixo[0]
        # A divisão de baixo não pode ficar oca: deixa pelo menos oito clubes lá.
        livres = sorted((c for c in doadora['clubs'] if id(c) not in protegidos),
                        key=forca, reverse=True)
        podem_sair = max(0, min(len(livres), len(doadora['clubs']) - 8))
        sobem = livres[:min(faltam, podem_sair)]
        doadora['clubs'] = [c for c in doadora['clubs'] if c not in sobem]
        L['clubs'].extend(sobem)
        if sobem:
            print(f'{liga}: {len(sobem)} clube(s) subiram de "{doadora["name"]}" para abrir vaga')
        # Subiu o que dava e ainda falta? Então esta liga também vai para a reserva.
        # Sem isto a Serie B parava em 17 de 20 e a segunda holandesa em 18 de 20.
        if len(sobem) < faltam:
            pendentes.append((liga, faltam - len(sobem)))

    # --- 2a. as ligas sem divisão de baixo se completam com a reserva --------
    sobras.sort(key=forca, reverse=True)
    # A reserva atende quem precisa de menos primeiro: sem isso a 2ª divisão dos
    # Estados Unidos, que precisava de 23 clubes, engolia tudo e as ligas que
    # precisavam de dois ficavam sem.
    pendentes.sort(key=lambda x: x[1])
    for liga, faltam in pendentes:
        L = ligas[liga]
        veio_da_reserva = min(faltam, len(sobras))
        if veio_da_reserva:
            L['clubs'].extend(sobras[:veio_da_reserva])
            sobras = sobras[veio_da_reserva:]
        # Acabou a reserva e ainda faltam clubes REAIS para a liga existir do jeito
        # certo. Nesse caso o clube nasce com elenco novo, no nível da divisão — é
        # o mesmo tipo de elenco genérico que o jogo já usa para completar time
        # curto, e é melhor do que a 2ª divisão dos EUA ter dois clubes.
        criados = faltam - veio_da_reserva
        for _ in range(criados):
            L['clubs'].append(clube_do_zero(L))
        if veio_da_reserva or criados:
            partes = []
            if veio_da_reserva:
                partes.append(f'{veio_da_reserva} da reserva')
            if criados:
                partes.append(f'{criados} com elenco novo')
            print(f'{liga}: {" e ".join(partes)} para chegar ao tamanho real')

    # --- 2b. cria as ligas que o jogo ainda não tinha ------------------------
    sobras.sort(key=forca, reverse=True)
    for liga, (pais, tier) in NOVAS_LIGAS.items():
        if liga in ligas or liga not in tabela:
            continue
        quantos = len(tabela[liga])
        # A reserva nem sempre dá. Antes disso a liga simplesmente não nascia, e a
        # Bulgária e Israel — que estão no pack europeu, com clube e escudo de
        # verdade — ficavam de fora do jogo. Agora o que falta nasce com elenco
        # gerado, como já acontece nas divisões de baixo: o CLUBE é real, só os
        # jogadores é que não.
        veio_da_reserva = min(quantos, len(sobras))
        clubes = sobras[:veio_da_reserva]
        sobras = sobras[veio_da_reserva:]
        nova = {'name': liga, 'country': pais, 'tier': tier, 'real': True,
                'clubs': clubes}
        dados['leagues'].append(nova)
        ligas[liga] = nova
        por_pais.setdefault(pais, []).append(nova)
        criados = quantos - veio_da_reserva
        for _ in range(criados):
            nova['clubs'].append(clube_do_zero(nova))
        partes = []
        if veio_da_reserva: partes.append(f'{veio_da_reserva} da reserva')
        if criados: partes.append(f'{criados} com elenco novo')
        print(f'{liga} criada com {quantos} clubes ({" e ".join(partes)})')

    # --- 2c. conferência final de tamanho -----------------------------------
    # As etapas anteriores mexem no tamanho das ligas umas das outras (clube desce,
    # clube é repatriado, clube sobe), então o `faltam` calculado no meio do caminho
    # fica velho. Esta passada roda por último e olha o estado FINAL: se uma liga da
    # lista COMPLETAS ainda está menor que o número de clubes reais que eu pesquisei,
    # os que faltam nascem aqui.
    criados_no_fim = 0
    for liga in COMPLETAS:
        L = ligas.get(liga)
        if not L or liga not in tabela:
            continue
        alvo = TAMANHO_REAL.get(liga, len(tabela[liga]))
        faltam = alvo - len(L['clubs'])
        for _ in range(max(0, faltam)):
            L['clubs'].append(clube_do_zero(L))
            criados_no_fim += 1
        if faltam > 0:
            print(f'{liga}: {faltam} clube(s) criados na conferência final '
                  f'(a divisão tem {alvo} de verdade)')
    if criados_no_fim:
        print(f'{criados_no_fim} clube(s) nasceram para as ligas chegarem ao tamanho real')

    # --- 2d. sobra de gerador antigo ----------------------------------------
    # Quando eu aumentei uma liga e escrevi a lista real dela, os clubes GERADOS que
    # já estavam ali continuaram com o nome que tinham. Foi assim que a Serie C
    # italiana ficou com 'Gisborne Athletic' e 'Queenstown City' na tabela. Um clube
    # só é renomeado se não está na lista pesquisada E não veio da base original —
    # ou seja, se ninguém nunca afirmou que ele existe.
    base_por_liga = {}
    try:
        with open(os.path.join(RAIZ, 'public', 'players.base.json'), encoding='utf-8') as f:
            for l in json.load(f)['leagues']:
                base_por_liga[l['name']] = {c['n'] for c in l['clubs']}
    except OSError:
        base_por_liga = {}
    # As séries brasileiras são preenchidas por series_reais.py, que tem a própria
    # lista de clubes de verdade; aqui eu não teria como saber que 'Cascavel' é real.
    protegidos = set()
    try:
        import re as _re
        with open(os.path.join(RAIZ, 'tools', 'series_reais.py'), encoding='utf-8') as f:
            protegidos = set(_re.findall(r"'([^']+)'", f.read()))
    except OSError:
        pass
    fora_do_pais = 0
    for liga in COMPLETAS:
        L = ligas.get(liga)
        if not L or liga not in tabela:
            continue
        pesquisados = {n for n, _ in tabela[liga]}
        da_base = base_por_liga.get(liga, set())
        for c in L['clubs']:
            # 'FC Cascavel' e 'Cascavel' são o mesmo clube: comparo por palavra,
            # senão o prefixo faz um clube real passar por gerado.
            palavras = set(c['n'].split())
            if (c['n'] not in pesquisados and c['n'] not in da_base
                    and c['n'] not in protegidos and not (palavras & protegidos)):
                c['n'] = nome_de_clube(L.get('country'), L)
                fora_do_pais += 1
    if fora_do_pais:
        print(f'{fora_do_pais} clube(s) gerados ganharam nome do próprio país')

    # --- 3. renomeia por ordem de força -------------------------------------
    alias = {}
    total, parciais = 0, []
    renomeados = set()   # clubes que este script batizou
    liberados = []       # nomes que ficaram vagos, para reaproveitar na troca
    for liga, itens in tabela.items():
        L = ligas.get(liga)
        if not L:
            continue
        if liga in INTOCAVEIS:
            print(f'aviso: {liga} está na lista de intocáveis, pulei')
            continue
        # PRIMEIRO casa pelo nome, um para um. O dado base vem do SoFIFA e tem os
        # jogadores reais no clube certo — o Haaland está no Manchester City. Se eu
        # distribuir os nomes só por força do elenco, o City recebe o elenco mais
        # forte da liga, que pode ser o do Chelsea, e o Haaland troca de time. Foi
        # exatamente o que aconteceu: Haaland e Rodri foram para o Chelsea, o Salah
        # para o City e o Bellingham para o Leverkusen.
        #
        # Quem já está com o nome certo FICA. Só as vagas que sobram é que recebem os
        # nomes restantes, aí sim do elenco mais forte para o mais fraco — é assim que
        # o FC Porto entra em Portugal sem mexer no Benfica.
        pares = []
        for ci, clube in enumerate(L['clubs']):
            for ni, (nome, _s) in enumerate(itens):
                s = semelhanca(clube['n'], nome)
                if s:
                    pares.append((s, ci, ni))
        pares.sort(reverse=True)
        fixo_c, fixo_n = {}, set()
        for s, ci, ni in pares:
            if ci in fixo_c or ni in fixo_n:
                continue
            fixo_c[ci] = ni
            fixo_n.add(ni)

        livres_c = sorted((i for i in range(len(L['clubs'])) if i not in fixo_c),
                          key=lambda i: -forca(L['clubs'][i]))
        livres_n = [i for i in range(len(itens)) if i not in fixo_n]
        casamento = dict(fixo_c)
        casamento.update(zip(livres_c, livres_n))

        ordenados = [(L['clubs'][ci], itens[ni]) for ci, ni in sorted(
            casamento.items(), key=lambda kv: kv[1])]
        L['clubs'] = [c for c, _ in ordenados] + [L['clubs'][i] for i in livres_c[len(livres_n):]]

        for clube, (nome, slug) in ordenados:
            liberados.append((L.get('country'), clube['n']))
            clube['n'] = nome
            clube.pop('generic', None)
            c = cores.get(norm(nome))
            if c:
                clube['primary'], clube['secondary'] = c
            else:
                clube.pop('primary', None)
                clube.pop('secondary', None)
            if slug:
                alias[nome] = slug
            renomeados.add(id(clube))
            total += 1
        sobra = len(L['clubs']) - len(itens)
        if sobra > 0:
            parciais.append(f'{liga}: {len(itens)} reais + {sobra} que continuam com o nome antigo')

    # --- 4. troca de identidade: ninguém pode ter nome repetido -------------
    # Se a liga já tinha o clube real e o nome dele foi para um elenco mais forte,
    # sobra um clube com nome duplicado. Ele fica com um dos nomes que vagaram, de
    # preferência do mesmo país. É troca, não invenção.
    novos = {c['n'] for l in dados['leagues'] for c in l['clubs'] if id(c) in renomeados}
    # Comparar nome com nome deixa passar variação de grafia: a Arábia Saudita ficou com
    # "Al Khaleej" e "Al-Khaleej", o mesmo clube duas vezes. O miolo do nome resolve.
    #
    # Duas cautelas, cada uma paga com um erro que eu já cometi aqui:
    # 1. A comparação é EXATA (nucleo == nucleo), sem a regra de "um contém o outro" do
    #    mesmo_clube(), senão o Racing Santander vira o Racing Club.
    # 2. Só vale DENTRO DO MESMO PAÍS. O Nacional de Portugal e o Nacional do Uruguai
    #    são clubes diferentes, e o River Plate argentino não é o paraguaio.
    nucleos_por_pais = {}
    for l in dados['leagues']:
        for c in l['clubs']:
            if id(c) in renomeados and nucleo(c['n']):
                nucleos_por_pais.setdefault(l.get('country'), set()).add(nucleo(c['n']))
    usados = set(alias.values())
    # Um nome que vagou só pode ser reaproveitado se ele NÃO for outra grafia de um
    # clube que este script acabou de posicionar. Sem esse filtro o "PSV" que vagou
    # da 1ª holandesa ia parar na 2ª, e o Leverkusen apareceria na 3ª alemã.
    vagos = [p for p in liberados
             if p[1] not in novos
             and escudo_de(p[1], logos) not in usados
             and not any(mesmo_clube(p[1], n) for n in novos)]
    todos_nucleos = set().union(*nucleos_por_pais.values()) if nucleos_por_pais else set()
    # Nome que vagou só pode ser reusado se NINGUÉM estiver usando agora. O "Brusque"
    # vagou da Série B e foi parar num clube da Série C que já tinha um Brusque.
    em_uso = {}
    for l in dados['leagues']:
        for c in l['clubs']:
            em_uso.setdefault(l.get('country'), set()).add(nucleo(c['n']))
    trocas, sem_saida, convivem, fora = [], [], [], []
    for l in dados['leagues']:
        for c in l['clubs']:
            if id(c) in renomeados:
                continue
            nc = nucleo(c['n'])
            if nc not in todos_nucleos:
                continue
            # Choque DENTRO do país é duplicata de verdade e precisa sair.
            # Choque ENTRE países costuma ser legítimo: o Nacional de Portugal e o do
            # Uruguai são clubes diferentes, e o River Plate argentino não é o
            # paraguaio. Nesses eu só troco se sobrar nome no país — nunca apago.
            mesmo_pais = nc in nucleos_por_pais.get(l.get('country'), ())
            # a troca fica no mesmo país, senão nasce um Oxford United no Senegal
            pais = l.get('country')
            escolha = next((p for p in vagos
                            if p[0] == pais and nucleo(p[1]) not in em_uso.get(pais, ())), None)
            if not escolha:
                if mesmo_pais:
                    # Nos EUA os 27 clubes reais da MLS já ocupam as vagas boas: não
                    # sobra nome, e manter significaria dois times iguais na mesma
                    # liga. Sai. O elenco era genérico, não são jogadores reais.
                    sem_saida.append(f'{c["n"]} ({l["name"]}, {len(c["players"])} jogadores)')
                    fora.append(id(c))
                else:
                    convivem.append(f'{c["n"]} ({l["name"]})')
                continue
            vagos.remove(escolha)
            trocas.append(f'{c["n"]} -> {escolha[1]} ({l["name"]})')
            em_uso.setdefault(pais, set()).discard(nucleo(c['n']))
            em_uso.setdefault(pais, set()).add(nucleo(escolha[1]))
            c['n'] = escolha[1]
            c.pop('primary', None)
            c.pop('secondary', None)

    if fora:
        alvo = set(fora)
        for l in dados['leagues']:
            l['clubs'] = [c for c in l['clubs'] if id(c) not in alvo]

    # Conta pelo miolo do nome e por país, para "Al Khaleej" e "Al-Khaleej" caírem no
    # mesmo balde sem acusar o Nacional de Portugal junto com o Nacional do Uruguai.
    conta = {}
    for l in dados['leagues']:
        for c in l['clubs']:
            conta.setdefault((l.get('country'), nucleo(c['n']) or c['n']), []).append(c['n'])
    repetidos = {f"{' / '.join(sorted(set(v)))} ({k[0]})": len(v)
                 for k, v in conta.items() if len(v) > 1}

    json.dump(alias, open(ALIAS_SAIDA, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1, sort_keys=True)

    dados['meta']['leagues'] = len(dados['leagues'])
    dados['meta']['clubs'] = sum(len(l['clubs']) for l in dados['leagues'])
    dados['meta']['players'] = sum(len(c['players']) for l in dados['leagues'] for c in l['clubs'])
    json.dump(dados, open(ARQ, 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))

    print()
    print(f'{total} clubes receberam o nome real, todos com escudo oficial')
    if parciais:
        print('ligas ainda incompletas (faltou escudo oficial para o resto):')
        for p in parciais:
            print('  -', p)
    if trocas:
        print(f'{len(trocas)} clubes cederam o nome a um elenco mais forte e ficaram com outro:')
        for t in trocas:
            print('  -', t)
    if sem_saida:
        print('repetido dentro do próprio país e sem nome livre, saíram da liga:')
        for s in sem_saida:
            print('  -', s)
    if convivem:
        print('mesmo nome em país diferente, deixei quieto (pode ser clube legítimo):')
        for s in convivem:
            print('  -', s)
    if repetidos:
        print('ATENÇÃO — nome repetido em mais de um clube (não é obra deste script):')
        for k, v in sorted(repetidos.items()):
            print(f'  - {k} ({v}x)')
    print(f"agora: {dados['meta']['leagues']} ligas, {dados['meta']['clubs']} clubes, "
          f"{dados['meta']['players']} jogadores")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
