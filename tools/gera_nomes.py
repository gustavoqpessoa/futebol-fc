#!/usr/bin/env python3
"""
gera_nomes.py — tools/nomes_paises.json vira src/career/nomes.js.

O jogo precisa dos nomes DENTRO do bundle (a base é criada no navegador, sem
servidor por trás), e o pipeline precisa deles em Python (os jogadores que
completam elenco curto). A fonte é uma só: o JSON.
"""
import json
import os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRADA = os.path.join(RAIZ, 'tools', 'nomes_paises.json')
SAIDA = os.path.join(RAIZ, 'src', 'career', 'nomes.js')

d = json.load(open(ENTRADA, encoding='utf-8'))
paises = {k: v for k, v in d.items() if not k.startswith('_')}
familias = d['_familias']
de_familia = d['_familia_do_pais']

j = lambda x: json.dumps(x, ensure_ascii=False)

with open(SAIDA, 'w', encoding='utf-8') as f:
    f.write(f'''// nomes.js — GERADO por tools/gera_nomes.py a partir de tools/nomes_paises.json.
// Não edite aqui: edite o JSON e rode o pipeline.
//
// O Gustavo, olhando a base do Bolton Wanderers: "os jogadores da minha base se
// chamam Murilo Alves, Wesley Peixoto, Caio Pinto — só que eles são ingleses. Não
// tem inglês com esse nome". Todo jogador criado pelo jogo saía com nome brasileiro,
// em qualquer país do mundo.

export const NOMES_PAIS = {j(paises)};

export const NOMES_FAMILIA = {j(familias)};

const FAMILIA_DO_PAIS = {j(de_familia)};

/** Os dois baldes de nome de um país: [primeiros, sobrenomes].
 *
 *  Quando o país tem pouca gente na lista, a família entra junto: o Gustavo viu a
 *  base do Vaduz com "os nomes muito repetidos, todos os sobrenomes de algum jogador
 *  do time principal". Poucos nomes num balde pequeno repetem rápido. */
export function baldesDe(pais) {{
  const doPais = NOMES_PAIS[pais];
  const daFamilia = NOMES_FAMILIA[FAMILIA_DO_PAIS[pais] || ''] || NOMES_FAMILIA.anglo;
  if (!doPais) return daFamilia;
  if (doPais[0].length >= 14) return doPais;
  // o nome do país entra duas vezes: ele continua sendo a cara do lugar
  return [doPais[0].concat(doPais[0], daFamilia[0]), doPais[1].concat(doPais[1], daFamilia[1])];
}}

/** Um nome inteiro do país. `rnd` é a função de sorteio (0..1). */
export function nomeDoPais(pais, rnd = Math.random) {{
  const [pri, sob] = baldesDe(pais);
  return `${{pri[Math.floor(rnd() * pri.length)]}} ${{sob[Math.floor(rnd() * sob.length)]}}`;
}}
''')

print(f'{len(paises)} países + {len(familias)} famílias -> src/career/nomes.js')
