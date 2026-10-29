# -*- coding: utf-8 -*-
"""Transforma tools/formatos_ligas.json (pesquisa na Wikipédia) no módulo que o
jogo lê. Rodar sempre que o JSON mudar: assim o que foi pesquisado vira regra
dentro da partida, e não fica só num arquivo de anotação."""
import json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = json.load(open(f'{R}/tools/formatos_ligas.json', encoding='utf-8'))

fora = {}
for pais, d in F.items():
    if pais.startswith('_') or not isinstance(d, dict):
        continue
    reg = {'formato': d.get('formato', 'pontos_corridos')}
    # Quantas vezes cada clube enfrenta cada adversário na fase regular. Quase toda
    # liga joga 2 (turno e returno); as pequenas jogam 3 ou 4 para encher a temporada.
    if d.get('turnos'): reg['turnos'] = d['turnos']
    if d.get('calendario'): reg['calendario'] = d['calendario']
    if d.get('detalhe'): reg['detalhe'] = d['detalhe']
    if d.get('observacao'): reg['observacao'] = d['observacao']
    if d.get('repescagem'): reg['repescagem'] = d['repescagem']
    fora[pais] = reg

# Quem divide a temporada em dois grupos no fim, e como. Só entram os países cujo
# formato foi conferido na fonte; o resto joga pontos corridos e pronto.
SPLIT = {
    'Escócia':          {'grupos': [6, 6],    'pontos': 'mantem',  'jogos': 5},
    'Bélgica':          {'grupos': [6, 12],   'pontos': 'metade',  'jogos': 10},
    'Áustria':          {'grupos': [6, 6],    'pontos': 'metade',  'jogos': 10},
    'Dinamarca':        {'grupos': [6, 6],    'pontos': 'mantem',  'jogos': 10},
    'Suíça':            {'grupos': [6, 6],    'pontos': 'mantem',  'jogos': 5},
    'Grécia':           {'grupos': [4, 10],   'pontos': 'mantem',  'jogos': 6},
    'Romênia':          {'grupos': [6, 10],   'pontos': 'metade',  'jogos': 10},
    'República Tcheca': {'grupos': [6, 10],   'pontos': 'mantem',  'jogos': 5},
    # 'jogos' pode ser uma lista, um número por grupo: na Sérvia o grupo de 6 joga 5
    # rodadas e o de 8 joga 7, que é todo mundo contra todo mundo uma vez.
    'Sérvia':           {'grupos': [6, 8],    'pontos': 'mantem',  'jogos': [5, 7]},
    'Chipre':           {'grupos': [6, 8],    'pontos': 'mantem',  'jogos': 10},
    'Israel':           {'grupos': [6, 8],    'pontos': 'mantem',  'jogos': 10},
    'Bulgária':         {'grupos': [4, 4, 6], 'pontos': 'mantem',  'jogos': [6, 6, 5]},
    'Finlândia':        {'grupos': [6, 6],    'pontos': 'mantem',  'jogos': 5},
    'País de Gales':    {'grupos': [6, 4, 6], 'pontos': 'mantem',  'jogos': 5},
    'Coreia do Sul':    {'grupos': [6, 6],    'pontos': 'mantem',  'jogos': 5},
}
for pais, s in SPLIT.items():
    if pais in fora:
        fora[pais]['split'] = s

txt = ['// GERADO por tools/gera_formatos.py a partir de tools/formatos_ligas.json.',
       '// Não editar à mão: mexa no JSON e rode o pipeline de novo.',
       '// Cada liga é o campeonato do país como ele é de verdade — quem divide a',
       '// temporada em dois grupos no fim divide aqui também.',
       'export const FORMATOS = ' + json.dumps(fora, ensure_ascii=False, indent=1) + ';',
       '',
       'export function formatoDoPais(pais) { return FORMATOS[pais] || null; }',
       '/** Só a 1ª divisão joga o formato do país; as de baixo são pontos corridos. */',
       '/** Quantas vezes cada clube enfrenta cada adversario na fase regular da 1a divisao.',
       '  A hungara e a escocesa jogam 3 vezes, a irlandesa 4; o resto joga turno e returno. */',
       'export function turnosDaLiga(pais, tier) {',
       '  if ((tier || 1) !== 1) return 2;',
       '  const f = FORMATOS[pais];',
       '  return (f && f.turnos) || 2;',
       '}',
       'export function splitDaLiga(pais, tier) {',
       '  if ((tier || 1) !== 1) return null;',
       '  const f = FORMATOS[pais];',
       '  return (f && f.split) || null;',
       '}', '']
open(f'{R}/src/career/formatos.js', 'w', encoding='utf-8').write('\n'.join(txt))
print(f'{len(fora)} ligas -> src/career/formatos.js ({sum(1 for v in fora.values() if "split" in v)} com fase final)')
