#!/usr/bin/env python3
"""aplicar_overalls.py — aplica as correções de overall que o Gustavo revisou.

Ele pediu: "me manda um arquivo que eu reviso alguns e você tem uma boa noção".
O arquivo é o CSV do Desktop; ele preenche NOVO_OVERALL / NOVO_POTENCIAL só nas
linhas que quiser e deixa o resto em branco.

A correção entra em public/players.base.json, que é a fonte do pipeline — assim ela
sobrevive a todo rebuild, em vez de ser um remendo no players.json gerado.

Uso:  python3 tools/aplicar_overalls.py "~/Desktop/OVERALLS - Serie A.csv"
"""
import csv, json, os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(RAIZ, 'public', 'players.base.json')
MANUAL = os.path.join(RAIZ, 'tools', 'overalls_manuais.json')


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    csv_path = os.path.expanduser(sys.argv[1])
    correcoes = json.load(open(MANUAL, encoding='utf-8')) if os.path.exists(MANUAL) else {}

    novas = 0
    with open(csv_path, encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            ovr = (r.get('NOVO_OVERALL') or '').strip()
            pot = (r.get('NOVO_POTENCIAL') or '').strip()
            if not ovr and not pot:
                continue
            chave = f"{r['clube']}|{r['jogador']}"
            d = correcoes.get(chave, {})
            if ovr: d['overall'] = int(ovr)
            if pot: d['potencial'] = int(pot)
            if (r.get('OBS') or '').strip(): d['obs'] = r['OBS'].strip()
            correcoes[chave] = d
            novas += 1
    json.dump(correcoes, open(MANUAL, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    print(f'{novas} correção(ões) lidas do CSV; {len(correcoes)} no total em tools/overalls_manuais.json')

    dados = json.load(open(BASE, encoding='utf-8'))
    aplicadas, nao_achei = 0, []
    for liga in dados['leagues']:
        for c in liga['clubs']:
            for p in c['players']:
                d = correcoes.get(f"{c['n']}|{p[0]}")
                if not d: continue
                if 'overall' in d: p[2] = d['overall']
                if 'potencial' in d: p[3] = max(p[2], d.get('potencial', p[3]))
                aplicadas += 1
    achadas = {k for k in correcoes}
    print(f'{aplicadas} de {len(achadas)} aplicadas na base')
    json.dump(dados, open(BASE, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('players.base.json atualizado — rode ./tools/pipeline.sh para valer no jogo')


if __name__ == '__main__':
    main()
