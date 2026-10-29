#!/usr/bin/env python3
"""
rebalance_br.py — conserta os OVERALLS estimados dos clubes brasileiros.

O documento do usuário (Elencos_Brasileirao.docx) trazia nome, idade, posição e país
exatos, mas NÃO trazia overall nem potencial. A estimativa antiga era "média do clube
± variação aleatória", sem olhar quem é titular — daí saíam absurdos como o terceiro
goleiro do Corinthians com overall acima do titular, e moleque da base acima do time
principal.

Aqui a nota passa a sair de uma HIERARQUIA DE ELENCO: dentro de cada clube e de cada
posição, os jogadores são ordenados por fase de carreira (idade) e recebem notas em
escada — titular, rotação, reserva, base. Garoto novo entra embaixo, mas com POTENCIAL
alto, que é o lugar certo para o talento dele aparecer.

Nome, idade, posição, pé e nacionalidade NUNCA são tocados — só overall, potencial,
valor e salário. Só mexe no Brasil; o resto do mundo vem do SoFIFA com nota real.

Uso:  python3 tools/rebalance_br.py [--dry]
"""
import json
import os
import random
import statistics
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# lê SEMPRE do arquivo original e grava no de uso — assim rodar de novo dá o mesmo
# resultado, mesmo depois de vários ajustes na tabela de overrides
ORIGEM = os.path.join(RAIZ, 'public', 'players.base.json')
ARQ = os.path.join(RAIZ, 'public', 'players.json')
OVERRIDES = os.path.join(RAIZ, 'tools', 'overrides_br.json')

# índices do array de jogador: [nome, pos, ovr, pot, idade, valor, salario, pe, elig]
NOME, POS, OVR, POT, IDADE, VAL, SAL, PE, ELIG = range(9)

# quantos titulares cada grupo de posição tem (base 4-3-3)
TITULARES = {'G': 1, 'Z': 2, 'L': 2, 'M': 3, 'A': 3}

# o quanto o jogador rende para a idade que tem (1.0 = auge)
def fase_da_carreira(idade):
    tabela = {16: 0.16, 17: 0.26, 18: 0.37, 19: 0.50, 20: 0.62, 21: 0.73,
              22: 0.83, 23: 0.91, 24: 0.96, 25: 0.99}
    if idade in tabela:
        return tabela[idade]
    if idade <= 30:
        return 1.0
    return max(0.62, 1.0 - (idade - 30) * 0.055)

# O que se espera de um jogador nessa idade. Quem já está ACIMA disso é precoce, e
# jogador precoce tem teto alto — foi o que faltava: o Breno Bidon, titular do
# Corinthians aos 21, saía com potencial 75.
ESPERADO = {16: 48, 17: 52, 18: 56, 19: 60, 20: 63, 21: 66, 22: 69, 23: 71, 24: 73}


def potencial_para(ovr, idade, rng):
    """
    Teto realista. A versão anterior dava 92 e 93 para o Gui Negão e o Dieguinho —
    reservas de 18 e 19 anos. Craque de teto 90+ é RARO: no mundo inteiro há uns
    poucos por geração. Agora o teto alto depende de o garoto já ser bom para a idade,
    e mesmo assim quase ninguém passa de 88.
    """
    # Ser "precoce" só faz sentido para quem ainda é jovem. Sem esta trava, o Depay
    # com 32 anos ganhava teto 88 por estar acima da média da idade dele.
    precoce = max(0, ovr - ESPERADO.get(idade, 75)) if idade <= 24 else 0

    if idade <= 18:
        base = rng.randint(8, 15)
    elif idade <= 21:
        base = rng.randint(6, 12)
    elif idade <= 24:
        base = rng.randint(3, 8)
    elif idade <= 28:
        base = rng.randint(0, 3)
    else:
        base = 0

    pot = ovr + base + round(precoce * 0.8)

    # Teto do teto: só quem JÁ é muito bom para a idade chega perto dos 90, e a
    # loteria do craque geracional (5%) é o único caminho para os 90+.
    limite = 78 + min(9, precoce)
    if rng.random() < 0.05:
        limite += 6
    return max(ovr, min(92, limite, pot))

# teto de overall para quem ainda é muito novo, relativo ao nível do clube
def teto_por_idade(base, idade):
    if idade <= 17:
        return base - 9
    if idade == 18:
        return base - 7
    if idade == 19:
        return base - 5
    if idade == 20:
        return base - 3
    if idade == 21:
        return base - 1.5
    return 99


def tabela_de_precos(dados):
    """Mediana de valor e salário por overall, tirada das ligas do mundo (escala SoFIFA)."""
    por_ovr = {}
    for liga in dados['leagues']:
        if liga.get('country') == 'Brasil':
            continue          # o Brasil é justamente o que está sendo corrigido
        for clube in liga['clubs']:
            for p in clube['players']:
                por_ovr.setdefault(p[OVR], ([], []))
                por_ovr[p[OVR]][0].append(p[VAL])
                por_ovr[p[OVR]][1].append(p[SAL])
    return {o: (statistics.median(v), statistics.median(s)) for o, (v, s) in por_ovr.items() if v}


def preco(tabela, ovr, idade, pot=None):
    """
    Preço de mercado. O que faltava era o POTENCIAL: no mercado de verdade um garoto
    de 19 anos com overall 67 e teto 85 custa muito mais que um jogador feito de 67,
    porque o comprador paga pelo que ele vai ser. Salário não segue esse prêmio — ele
    acompanha o que o jogador é HOJE.
    """
    for delta in range(0, 12):                    # acha o overall mais próximo que existe
        for cand in (ovr - delta, ovr + delta):
            if cand in tabela:
                val, sal = tabela[cand]
                fator = max(0.45, 1 - abs(26 - idade) * 0.05)

                premio = 1.0
                if pot and pot > ovr:
                    sobra = pot - ovr
                    # quanto mais novo, mais o mercado paga pela promessa
                    peso = 0.10 if idade <= 20 else 0.07 if idade <= 23 else 0.04 if idade <= 26 else 0.01
                    premio = 1 + sobra * peso

                return int(val * fator * premio), int(sal * fator)
    return ovr * ovr * 200, ovr * ovr * 2


def reavaliar_clube(clube, tabela, rng, ancoras):
    """ancoras: {nome: overall} — jogadores conhecidos, cuja nota é fixa."""
    jogadores = clube['players']
    if len(jogadores) < 11:
        return 0, set()

    usadas = set()
    fixo = {}
    teto_fixo = {}
    for p in jogadores:
        if p[NOME] not in ancoras:
            continue
        valor = ancoras[p[NOME]]
        # aceita 78 (só overall) ou [76, 88] (overall e potencial)
        if isinstance(valor, (list, tuple)):
            fixo[id(p)] = valor[0]
            if len(valor) > 1:
                teto_fixo[id(p)] = valor[1]
        else:
            fixo[id(p)] = valor
        usadas.add(p[NOME])

    # Nível do clube: quando há âncoras suficientes, ele sai DELAS — assim a escala do
    # clube acompanha os jogadores de verdade, em vez das notas antigas inventadas.
    if len(fixo) >= 8:
        base = sum(sorted(fixo.values(), reverse=True)[:11]) / min(11, len(fixo))
    else:
        antigo = sum(sorted((p[OVR] for p in jogadores), reverse=True)[:11]) / 11.0
        base = (sum(sorted(fixo.values(), reverse=True)[:11]) / len(fixo) + antigo) / 2 if fixo else antigo

    por_grupo = {}
    for p in jogadores:
        por_grupo.setdefault(p[POS], []).append(p)

    # De quanto o clube inteiro precisa subir ou descer para bater com as âncoras.
    # É um deslocamento só, igual para todos: mexe no nível, preserva a ordem.
    livres = [p[OVR] for p in jogadores if id(p) not in fixo]
    if fixo and livres:
        top_livres = sorted(livres, reverse=True)[:11]
        desloc = base - (sum(top_livres) / len(top_livres))
        desloc = max(-8.0, min(8.0, desloc))   # sem cambalhota: no máximo 8 pontos
    else:
        desloc = 0.0

    mudou = 0
    for grupo, lista in por_grupo.items():
        # Quem é titular: o jogador conhecido entra pela NOTA REAL dele; o desconhecido,
        # pela fase de carreira. Empate desempata pelo nome (resultado sempre igual).
        # No empate, quem tem nota conhecida fica na frente do desconhecido (o -1.5).
        # Sem isso o reserva anônimo de 25 anos passa por cima do titular consagrado —
        # que é exatamente o defeito que estamos consertando.
        def ordem(p):
            q = fixo[id(p)] if id(p) in fixo else p[OVR] - 1.5
            return (-q, p[NOME])
        lista.sort(key=ordem)
        n_tit = TITULARES.get(grupo, 2)
        teto_acima = 99

        for i, p in enumerate(lista):
            if id(p) in fixo:
                novo = fixo[id(p)]
            else:
                # A nota que o jogador JÁ TEM é a melhor informação disponível: ela
                # veio do SoFIFA e o Gustavo disse que confia nela. O que faltava era
                # só acertar a ESCALA do clube, não reescrever a hierarquia interna.
                #
                # Antes o overall do desconhecido vinha da posição na fila
                # (base + 2,5 - i), e o resultado é que os atributos trocavam de dono:
                # o Aurélio Buta, lateral do São Paulo, era 68 na base e virava 80 só
                # por cair na vaga de titular, enquanto o Young caía de 83 para 73.
                # Agora todo mundo do clube desliza junto, e quem era melhor continua
                # sendo melhor.
                alvo = p[OVR] + desloc
                alvo = min(alvo, teto_por_idade(base, p[IDADE]), teto_acima)
                novo = int(round(max(45, min(90, alvo))))

            if novo != p[OVR]:
                mudou += 1
            p[OVR] = novo
            p[POT] = teto_fixo.get(id(p)) or potencial_para(novo, p[IDADE], rng)
            p[POT] = max(p[OVR], p[POT])
            p[VAL], p[SAL] = preco(tabela, novo, p[IDADE], p[POT])
            teto_acima = novo   # ninguém do banco passa por cima de quem está na frente

    return mudou, usadas


def main():
    seco = '--dry' in sys.argv
    rng = random.Random(20260814)          # determinístico: rodar de novo dá o mesmo resultado

    origem = ORIGEM if os.path.exists(ORIGEM) else ARQ
    with open(origem, encoding='utf-8') as f:
        dados = json.load(f)

    with open(OVERRIDES, encoding='utf-8') as f:
        overrides = {k: v for k, v in json.load(f).items() if not k.startswith('_')}

    tabela = tabela_de_precos(dados)
    total_clubes = total_mudancas = 0
    aplicadas = set()

    for liga in dados['leagues']:
        if liga.get('country') != 'Brasil':
            continue
        for clube in liga['clubs']:
            m, usadas = reavaliar_clube(clube, tabela, rng, overrides.get(clube['n'], {}))
            total_mudancas += m
            aplicadas |= {(clube['n'], n) for n in usadas}
            total_clubes += 1

    pedidas = {(c, n) for c, d in overrides.items() for n in d}
    print(f'{total_clubes} clubes brasileiros reavaliados, {total_mudancas} notas ajustadas')
    print(f'{len(aplicadas)}/{len(pedidas)} overalls conhecidos aplicados')
    faltando = sorted(pedidas - aplicadas)
    if faltando:
        print('NAO ENCONTRADOS (nome nao bate com o documento):')
        for c, n in faltando:
            print(f'  {c}: {n}')

    if seco:
        print('(--dry: nada foi gravado)')
        return

    with open(ARQ, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, separators=(',', ':'))
    print(f'gravado em {ARQ}')


if __name__ == '__main__':
    main()
