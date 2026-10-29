#!/bin/sh
# Cadeia de dados completa, na ordem certa.
# Sempre parte de public/players.base.json, entao pode rodar quantas vezes quiser.
set -e
cd "$(dirname "$0")/.."
python3 tools/rebalance_br.py
python3 tools/rename_generic.py
python3 tools/restaurar_nomes.py
python3 tools/posicoes_br.py
python3 tools/gerar_logos.py
python3 tools/escudos_europa.py    # pack europeu 2026-27: escudos + composicao das ligas
python3 tools/transfermarkt.py     # valor de mercado real + ordem das ligas por valor
python3 tools/mapear_logos.py      # liga clube -> escudo (precisa vir antes)
python3 tools/series_reais.py      # Serie C e D com os clubes reais
python3 tools/ligas_reais.py       # cada clube real na liga certa (usa a ordem acima)
python3 tools/elencos_reais.py     # elenco real do TM para quem tinha elenco generico
python3 tools/posicoes_finas.py    # LE/LD, PE/PD e elenco minimo de 22 em todo clube
python3 tools/nomes_gerados.py     # jogador inventado ganha nome do pais do clube
python3 tools/mapear_logos.py      # remapeia, agora com os nomes reais das ligas
cp public/logos.json public/mapa_logos.json dist/ 2>/dev/null || true

python3 tools/gera_nomes.py    # nome de gente por pais -> src/career/nomes.js
python3 tools/gera_formatos.py  # formato real de cada liga vira regra no motor
python3 tools/nacionalidades.py  # de que pais e cada jogador
python3 tools/gera_copas.py  # formato real de cada copa
python3 tools/coerencia_overall.py
python3 tools/teto_jovens.py       # a regua que o Gustavo usou, no resto do Brasil
python3 tools/overalls_manuais.py  # a revisao do Gustavo manda em tudo — roda por ultimo  # nota alta demais para o valor real do jogador
