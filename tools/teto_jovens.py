#!/usr/bin/env python3
"""teto_jovens.py — a régua que o Gustavo usou, aplicada ao resto do Brasil.

Ele revisou a Série A de Athletico até Flamengo e resumiu o que estava errado:
"tinha jogadores totalmente desconhecidos, meninos da base com um overall muito
grande, e outros meninos da base com potencial pequeno".

Duas coisas saíram das 136 correções dele:

1. UM TETO DE OVERALL POR IDADE. Depois da revisão, o melhor jogador de 19 anos dos
   clubes que ele viu tem 75; o de 17 tem 69; o de 22 tem 76. Garoto de 19 anos com
   77 de overall seria titular de seleção — e havia vários.

2. O POTENCIAL ESTAVA GRUDADO NUM NÚMERO SÓ. O pipeline calcula potencial como
   "overall + folga média da faixa de idade", e a folga de quem tem até 19 anos é
   +10,7. Resultado: 53 jogadores brasileiros com potencial EXATAMENTE 87, seis deles
   no mesmo elenco do Flamengo. Ele espalhou esses números na mão, de 77 a 83.

Aqui a margem varia por jogador, de forma determinística (sai do nome, então o mesmo
jogador tem sempre a mesma margem — não muda a cada rebuild).

Só mexe em clube BRASILEIRO: o resto do mundo tem overall do SoFIFA, que é fonte de
verdade. Roda antes do overalls_manuais.py, que tem a palavra final.
"""
import json
import os
import zlib

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ = os.path.join(RAIZ, 'public', 'players.json')

# O maior overall que sobrou em cada idade depois da revisão do Gustavo, na SÉRIE A.
TETO_POR_IDADE = {16: 65, 17: 69, 18: 71, 19: 75, 20: 75, 21: 76, 22: 76, 23: 78,
                  24: 79, 25: 79, 26: 79}

# O teto acompanha a divisão. Um garoto de 19 anos na Série A pode ter 75; na Série D,
# onde a média do elenco é 52, ele não pode ter o mesmo teto. O desconto sai da
# diferença de média entre a divisão e a Série A, medida no próprio jogo.
DESCONTO_DIVISAO = {
    'Brasileirão Série A': 0,
    'Brasileirão Série B': 5,
    'Brasileirão Série C': 7,
    'Brasileirão Série D': 19,
}

# A correção média por idade que ele aplicou, contando também quem ele deixou parado.
# É suave de propósito: o efeito forte está no teto. Aqui só se conserta o viés de
# fundo — o modelo que deriva overall do valor de mercado infla adolescente (que vale
# muito por ser promessa) e subestima veterano (que vale pouco e joga bem). Medido:
# quem ele SUBIU valia €2,6 mi na mediana; quem ele BAIXOU valia €12,9 mi.
VIES_IDADE = [(18, -1), (21, -1), (24, 0), (27, +1), (34, +1), (99, +1)]


def vies_de(idade):
    for ate, d in VIES_IDADE:
        if idade <= ate:
            return d
    return 0

# Quanto o jogador ainda pode crescer, por faixa. É uma FAIXA, não um número: era o
# número fixo que fazia meio elenco terminar com o mesmo potencial.
MARGEM = [(19, 8, 15), (21, 7, 13), (23, 5, 10), (25, 3, 8), (28, 1, 5), (31, 0, 2), (99, 0, 1)]


def margem_de(nome, idade):
    for ate, lo, hi in MARGEM:
        if idade <= ate:
            # determinístico: o mesmo nome dá sempre a mesma margem
            h = zlib.crc32(nome.encode('utf-8'))
            return lo + h % (hi - lo + 1)
    return 1


def main():
    dados = json.load(open(ARQ, encoding='utf-8'))
    cortados, potMexido, ajustados = 0, 0, 0
    for liga in dados['leagues']:
        if liga.get('country') != 'Brasil':
            continue
        desconto = DESCONTO_DIVISAO.get(liga['name'], 4)
        for c in liga['clubs']:
            for p in c['players']:
                nome, ovr, pot, idade = p[0], p[2], p[3], p[4]
                # viés de idade: o adolescente desce um ponto, o veterano sobe um
                d = vies_de(idade)
                if d:
                    p[2] = max(35, min(95, p[2] + d))
                    ajustados += 1
                teto = TETO_POR_IDADE.get(idade)
                if teto is not None:
                    teto = max(40, teto - desconto)
                if teto and p[2] > teto:
                    p[2] = teto
                    cortados += 1
                novo_pot = p[2] + margem_de(nome, idade)
                # o potencial nunca encolhe abaixo do overall nem passa de 95
                novo_pot = max(p[2], min(95, novo_pot))
                if novo_pot != pot:
                    p[3] = novo_pot
                    potMexido += 1

    json.dump(dados, open(ARQ, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'{cortados} overall(s) cortados pelo teto da idade, {ajustados} ajustados pelo '
          f'viés de idade, {potMexido} potenciais espalhados (clubes brasileiros)')


if __name__ == '__main__':
    main()
