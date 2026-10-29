#!/usr/bin/env python3
"""
restaurar_nomes.py — devolve o nome REAL aos jogadores da Série A.

O pipeline antigo tinha um "dedup" que renomeava jogador cujo nome já existia em
outro clube. Como Vitinho, Allan e Matheus Pereira são nomes comuns no futebol
brasileiro, eles viraram "Davi Reis Macedo", "Danilo Ramos" e "Juan Tavares" —
jogadores que não existem. O documento do usuário é a fonte da verdade, e nomes
repetidos entre clubes diferentes são normais no futebol de verdade.

Casa o jogador inventado com o real pelo par (idade, posição) dentro do mesmo clube.

Uso:  python3 tools/restaurar_nomes.py
"""
import json
import os
import re
import zipfile

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCX = os.path.join(RAIZ, 'tools', 'Elencos_Brasileirao.docx')
ARQ = os.path.join(RAIZ, 'public', 'players.json')

GRUPO = {'GK': 'G', 'Goleiro': 'G', 'DC': 'Z', 'Zagueiro': 'Z', 'DL': 'L', 'DR': 'L',
         'DM': 'M', 'MC': 'M', 'Meio-campista': 'M', 'ML': 'M', 'MR': 'M', 'AM': 'M',
         'LW': 'A', 'RW': 'A', 'ST': 'A', 'Atacante': 'A'}


def elencos_do_documento():
    z = zipfile.ZipFile(DOCX)
    xml = re.sub(r'</w:p>', '\n', z.read('word/document.xml').decode('utf-8'))
    linhas = [l.strip() for l in re.sub(r'<[^>]+>', '', xml).split('\n') if l.strip()]
    cabecalhos = {'Jogador', 'Idade', 'Posição', 'País',
                  'Elencos — Brasileirão', 'Jogador · Idade · Posição · País'}
    elencos, clube, i = {}, None, 0
    while i < len(linhas):
        m = re.match(r'^(.+?)\s*\(\d+ jogadores\)$', linhas[i])
        if m:
            clube = m.group(1).strip()
            elencos.setdefault(clube, [])
            i += 1
            continue
        if linhas[i] in cabecalhos:
            i += 1
            continue
        if i + 3 < len(linhas) and re.match(r'^\d{1,2}$', linhas[i + 1]):
            nome, idade, pos = linhas[i], int(linhas[i + 1]), linhas[i + 2]
            g = GRUPO.get(pos.split('/')[0].strip(), 'M')
            elencos[clube].append({'nome': nome, 'idade': idade, 'grupo': g})
            i += 4
            continue
        i += 1
    return elencos


def main():
    docs = elencos_do_documento()
    with open(ARQ, encoding='utf-8') as f:
        dados = json.load(f)

    trocados, exemplos = 0, []
    for liga in dados['leagues']:
        if liga['name'] != 'Brasileirão Série A':
            continue
        for clube in liga['clubs']:
            reais = docs.get(clube['n'])
            if not reais:
                continue
            naBase = {p[0] for p in clube['players']}
            # quem o documento tem e a base perdeu
            faltando = [r for r in reais if r['nome'] not in naBase]
            # quem a base tem e o documento não conhece (foi renomeado)
            nomesDoc = {r['nome'] for r in reais}
            sobrando = [p for p in clube['players'] if p[0] not in nomesDoc]

            for real in faltando:
                # casa por idade e grupo; se não achar, aceita só a idade
                alvo = next((p for p in sobrando if p[4] == real['idade'] and p[1] == real['grupo']), None)
                if alvo is None:
                    alvo = next((p for p in sobrando if p[4] == real['idade']), None)
                if alvo is None:
                    continue
                if len(exemplos) < 12:
                    exemplos.append(f"{clube['n']}: {alvo[0]} -> {real['nome']}")
                alvo[0] = real['nome']
                sobrando.remove(alvo)
                trocados += 1

    print(f'{trocados} jogadores inventados receberam o nome real do documento')
    for e in exemplos:
        print('  ', e)

    with open(ARQ, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, separators=(',', ':'))
    print(f'gravado em {ARQ}')


if __name__ == '__main__':
    main()
