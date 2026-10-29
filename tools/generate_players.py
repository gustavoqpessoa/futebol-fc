#!/usr/bin/env python3
# Lê o CSV do FIFA (~37k jogadores) e gera public/players.json:
#   ligas -> clubes (distribuídos e equilibrados por overall) -> jogadores reais,
#   além de um pool de "agentes livres" (o excedente de cada liga) para o mercado.
import csv, json, re, os, unicodedata
from real_clubs import REAL
from brazil import build_brazil

# país (inglês) -> português, para nomear as ligas em PT
COUNTRY_PT = {
 "England": "Inglaterra", "Spain": "Espanha", "Italy": "Itália", "Germany": "Alemanha", "France": "França",
 "Netherlands": "Holanda", "Portugal": "Portugal", "Argentina": "Argentina", "United States": "Estados Unidos",
 "Türkiye": "Turquia", "Turkey": "Turquia", "Saudi Arabia": "Arábia Saudita", "China PR": "China", "Poland": "Polônia",
 "Korea Republic": "Coreia do Sul", "Norway": "Noruega", "Belgium": "Bélgica", "Romania": "Romênia", "Sweden": "Suécia",
 "India": "Índia", "Switzerland": "Suíça", "Austria": "Áustria", "Australia": "Austrália", "Cyprus": "Chipre",
 "Denmark": "Dinamarca", "Greece": "Grécia", "Mexico": "México", "Japan": "Japão", "Scotland": "Escócia",
 "Russia": "Rússia", "Ukraine": "Ucrânia", "Czech Republic": "Chéquia", "Croatia": "Croácia", "Colombia": "Colômbia",
 "Chile": "Chile", "Finland": "Finlândia", "Hungary": "Hungria", "Azerbaijan": "Azerbaijão", "South Africa": "África do Sul",
 "Paraguay": "Paraguai", "Uruguay": "Uruguai", "Ecuador": "Equador", "Peru": "Peru", "Bolivia": "Bolívia",
 "Republic of Ireland": "Irlanda", "United Arab Emirates": "Emirados Árabes", "Serbia": "Sérvia", "Bulgaria": "Bulgária",
 "Slovakia": "Eslováquia", "Slovenia": "Eslovênia", "Israel": "Israel", "Malaysia": "Malásia", "Canada": "Canadá",
}
# núcleo (nome da competição) em PT quando faz sentido
CORE_PT = {
 "Premier League": "Premier League", "Championship": "2ª Divisão", "League One": "3ª Divisão", "League Two": "4ª Divisão",
 "La Liga": "La Liga", "La Liga 2": "La Liga 2", "Serie A": "Serie A", "Serie B": "Serie B", "Bundesliga": "Bundesliga",
 "2. Bundesliga": "2. Bundesliga", "3. Liga": "3ª Divisão", "Ligue 1": "Ligue 1", "Ligue 2": "Ligue 2",
 "Eredivisie": "Eredivisie", "Primeira Liga": "Primeira Liga", "Major League Soccer": "MLS",
}
def pt_league_name(name, country):
    core = re.sub(r"\s*\([^)]*\)\s*", "", str(name)).strip()
    core_pt = CORE_PT.get(core, core)
    cpt = COUNTRY_PT.get(country, country)
    return f"{cpt} — {core_pt}"

SRC = "/root/.claude/uploads/0c3e0f1c-4f19-5f37-bafa-8ca776e79836/04639409-all_fifa_players.csv"
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "players.json")

def norm(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode('ascii')
    return s.lower().strip()

def num_ovr(s):
    m = re.match(r"\s*(\d+)", str(s));  return int(m.group(1)) if m else 60

def parse_money(s):
    if not s: return 0
    s = str(s).replace("€", "").replace("$", "").replace(",", "").strip()
    mult = 1.0
    if s.endswith("M"): mult, s = 1_000_000, s[:-1]
    elif s.endswith("K"): mult, s = 1_000, s[:-1]
    try: return int(float(s) * mult)
    except: return 0

# Grupo de posição do jogo: G, Z(zagueiro), L(lateral), M(meio), A(ataque)
POSMAP = {
    "GK": "G",
    "CB": "Z", "SW": "Z",
    "LB": "L", "RB": "L", "LWB": "L", "RWB": "L",
    "CDM": "M", "CM": "M", "CAM": "M", "LM": "M", "RM": "M", "DM": "M",
    "LW": "A", "RW": "A", "CF": "A", "ST": "A", "LF": "A", "RF": "A",
}
def pos_group(best_pos, position):
    for cand in [str(best_pos).strip()] + re.split(r"[,/]", str(position)):
        cand = cand.strip().upper()
        if cand in POSMAP: return POSMAP[cand]
    return "M"

# País e divisão (tier) a partir do nome da liga, p/ acesso/rebaixamento entre divisões do mesmo país.
def country_tier(league):
    l = str(league)
    country = "?"
    m = re.search(r"\(([^)]+)\)", l)
    if m: country = m.group(1)
    low = l.lower()
    tier = 1
    if re.match(r"\s*2\.", l) or "la liga 2" in low or "serie b" in low or "ligue 2" in low or "championship" in low or "2." in low or " b " in low or "segunda" in low:
        tier = 2
    if re.match(r"\s*3\.", l) or "league one" in low or "3. liga" in low or "serie c" in low:
        tier = 3
    if "league two" in low:
        tier = 4
    return country, tier

def strip_accents_ok(s):
    return s  # mantém nomes reais dos jogadores

def load():
    rows = []; seen = set()
    with open(SRC, newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for d in r:
            pid = d.get("Player ID")
            if pid in seen: continue          # DEDUP: cada jogador aparece 2x no CSV
            seen.add(pid)
            try:
                ovr = num_ovr(d.get("Overall Score"))
                pot = max(ovr, num_ovr(d.get("Potential Score")))
                age = int(float(d.get("Age") or 25))
            except: continue
            name = (d.get("Player") or "Jogador").strip()
            rows.append({
                "name": name, "nn": norm(name),
                "pos": pos_group(d.get("Best Position"), d.get("Position")),
                "ovr": ovr, "pot": pot, "age": age,
                "val": parse_money(d.get("Value")),
                "wage": parse_money(d.get("Wage")),
                "league": (d.get("League") or "Outros").strip(),
                "foot": (d.get("Preferred Foot") or "Right").strip()[:1],
            })
    return rows

# distribui jogadores de uma liga em N clubes, com gradiente de força (clubes fortes e fracos)
# composição alvo por clube: 3 G, 6 Z, 5 L, 8 M, 5 A = 27 (com folga)
TARGET = [("G", 3), ("Z", 6), ("L", 5), ("M", 8), ("A", 5)]
SQUAD_MIN, SQUAD_MAX = 18, 28

TACTIC_KEYS = ["guardiola", "posicao", "tikitaka", "total", "gegen", "relacionismo", "invertidos", "false9",
               "vertical", "catenaccio", "libero", "wm", "sacchismo", "lavolpe", "424"]

def short_league(name):
    core = re.sub(r"\s*\([^)]*\)\s*", "", str(name)).strip()  # remove "(País)"
    return core or "Liga"

def build_league(name, players):
    country, tier = country_tier(name)
    tag = short_league(name)
    n = len(players)
    # ligas pequenas ganham menos clubes (elencos cheios); realista até 20
    n_clubs = max(2, min(20, n // 24))
    # buckets por posição, ordenados por overall desc
    buckets = {g: sorted([p for p in players if p["pos"] == g], key=lambda x: -x["ovr"]) for g in "GZLMA"}
    clubs = [{"players": []} for _ in range(n_clubs)]
    # draft round-robin: clube 0 sempre pega o melhor da rodada -> gera gradiente de força
    for g, cnt in TARGET:
        b = buckets[g]; idx = 0
        for _round in range(cnt):
            for ci in range(n_clubs):
                if idx < len(b):
                    clubs[ci]["players"].append(b[idx]); idx += 1
        buckets[g] = b[idx:]  # sobra vira agente livre
    # distribui as sobras (qualquer posição) de forma equilibrada até todos terem elenco cheio
    leftovers = []
    for g in "GZLMA": leftovers += buckets[g]
    leftovers.sort(key=lambda x: -x["ovr"])
    li, ci = 0, 0
    while li < len(leftovers):
        placed = False
        for _ in range(n_clubs):
            c = clubs[ci]; ci = (ci + 1) % n_clubs
            if len(c["players"]) < SQUAD_MAX:
                c["players"].append(leftovers[li]); li += 1; placed = True; break
        if not placed: break  # todos os clubes cheios -> resto vira agente livre
    free_agents = leftovers[li:]
    # garante 1 goleiro por clube (se faltar, converte o pior jogador de linha em G)
    for c in clubs:
        if not any(p["pos"] == "G" for p in c["players"]) and c["players"]:
            worst = min(c["players"], key=lambda p: p["ovr"]); worst["pos"] = "G"
    # ordena clubes por força média (desc) e dá nome com posição na liga
    for c in clubs:
        c["avg"] = round(sum(p["ovr"] for p in c["players"]) / max(1, len(c["players"])), 1)
    clubs.sort(key=lambda c: -c["avg"])
    out_clubs = []
    for i, c in enumerate(clubs):
        out_clubs.append({
            "n": f"{tag} {i+1:02d}",
            "t": TACTIC_KEYS[i % len(TACTIC_KEYS)],
            "players": [[p["name"], p["pos"], p["ovr"], p["pot"], p["age"], p["val"], p["wage"], p["foot"]] for p in c["players"]],
        })
    return {"name": name, "country": country, "tier": tier, "clubs": out_clubs}, free_agents

# Monta uma liga com CLUBES REAIS: casa os craques por nome e distribui o resto por overall.
def build_real_league(name, players, clubdefs):
    country, tier = country_tier(name)
    clubs = [{"name": cn, "primary": pri, "secondary": sec, "tokens": [norm(t) for t in toks], "players": []} for (cn, pri, sec, toks) in clubdefs]
    pool = sorted(players, key=lambda x: -x["ovr"])
    assigned = [False] * len(pool)
    # 1) casa por nome (primeiro clube cujo token aparece no nome)
    for i, p in enumerate(pool):
        for c in clubs:
            if any(tok and tok in p["nn"] for tok in c["tokens"]):
                c["players"].append(p); assigned[i] = True; break
    # 2) distribui o restante equilibrando o tamanho dos elencos (craques já dão a força)
    rest = [p for i, p in enumerate(pool) if not assigned[i]]
    total = len(pool); n = len(clubs)
    cap = min(SQUAD_MAX, max(SQUAD_MIN, -(-total // n)))  # ceil
    for p in rest:
        c = min(clubs, key=lambda c: len(c["players"]))
        if len(c["players"]) >= cap: break
        c["players"].append(p)
    club_ids = set(id(p) for c in clubs for p in c["players"])
    free_agents = [p for p in pool if id(p) not in club_ids]
    # goleiro garantido
    for c in clubs:
        if not any(p["pos"] == "G" for p in c["players"]) and c["players"]:
            min(c["players"], key=lambda p: p["ovr"])["pos"] = "G"
    out_clubs = []
    tacts = ["guardiola", "posicao", "tikitaka", "total", "gegen", "relacionismo", "invertidos", "false9", "vertical", "catenaccio", "libero", "wm", "sacchismo", "lavolpe", "424"]
    for i, c in enumerate(clubs):
        c["players"].sort(key=lambda p: -p["ovr"])
        out_clubs.append({
            "n": c["name"], "t": tacts[i % len(tacts)], "primary": c["primary"], "secondary": c["secondary"],
            "players": [[p["name"], p["pos"], p["ovr"], p["pot"], p["age"], p["val"], p["wage"], p["foot"]] for p in c["players"]],
        })
    return {"name": name, "country": country, "tier": tier, "real": True, "clubs": out_clubs}, free_agents

def main():
    rows = load()
    by_league = {}
    for p in rows: by_league.setdefault(p["league"], []).append(p)
    leagues = []
    all_free = []
    for name, pls in sorted(by_league.items(), key=lambda kv: -len(kv[1])):
        if name == "Série A (Brazil)":
            continue  # descartada: nomes fictícios. Substituída pelo Brasileirão montado à mão.
        if name in REAL:
            lg, fa = build_real_league(name, pls, REAL[name])
        else:
            lg, fa = build_league(name, pls)
        lg["name"] = pt_league_name(name, lg["country"])  # nome da liga em português
        lg["country"] = COUNTRY_PT.get(lg["country"], lg["country"])
        leagues.append(lg); all_free += fa
    # Brasileirão A/B/C montado por nós (times e jogadores reais + overalls estimados)
    leagues.extend(build_brazil())
    # mercado global: melhores agentes livres (limita p/ não pesar)
    all_free.sort(key=lambda x: -x["ovr"])
    market = [[p["name"], p["pos"], p["ovr"], p["pot"], p["age"], p["val"], p["wage"], p["foot"], p["league"]] for p in all_free[:4000]]
    data = {
        "meta": {"players": len(rows), "leagues": len(leagues), "clubs": sum(len(l["clubs"]) for l in leagues), "market": len(market)},
        "leagues": leagues,
        "market": market,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print("meta:", data["meta"])
    print("arquivo:", os.path.getsize(OUT) // 1024, "KB")
    # amostra
    for l in leagues[:5]:
        print(f"  {l['name']:34s} tier{l['tier']} clubes={len(l['clubs']):2d}  ex: {l['clubs'][0]['n']} (avg {round(sum(p[2] for p in l['clubs'][0]['players'])/len(l['clubs'][0]['players']),1)})")

if __name__ == "__main__":
    main()
