"""
================================================================================
🎯 CALIBRACIÓN DE UMBRALES SEMÁNTICOS
================================================================================
Corre una lista de consultas típicas contra /buscar/semantica y muestra
los scores crudos (similitud) para calibrar los cortes Alta/Media/Baja.

Uso:
    1. Con el server corriendo (uvicorn app.main:app --reload)
    2. python calibrar_semantica.py
"""

import urllib.request
import urllib.parse
import json

# ============================================================================
# CONSULTAS DE PRUEBA
# ============================================================================
CONSULTAS = [
    "despido injustificado",
    "amparo indirecto contra orden de aprehensión",
    "violación al debido proceso",
    "pensión alimenticia",
    "divorcio necesario",
    "tortura",
    "derechos humanos",
    "responsabilidad civil por daños",
    "contrato de arrendamiento",
    "competencia económica",
]

URL_BASE = "http://127.0.0.1:8000/api/jurisprudencias/buscar/semantica"
LIMIT = 15  # solo top 15 por consulta, para ver los scores altos


def consultar(q: str):
    params = urllib.parse.urlencode({"q": q, "limit": LIMIT})
    url = f"{URL_BASE}?{params}"
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read())


def main():
    print("=" * 80)
    print("🎯 CALIBRACIÓN SEMÁNTICA — Scores reales de 10 consultas")
    print("=" * 80)

    todos_los_scores = []

    for consulta in CONSULTAS:
        print(f"\n{'─' * 80}")
        print(f"🔍 {consulta}")
        print(f"{'─' * 80}")
        try:
            data = consultar(consulta)
            tesis = data.get("tesis", [])
            if not tesis:
                print("  (sin resultados)")
                continue

            for i, t in enumerate(tesis, 1):
                sim = t.get("similitud", 0)
                todos_los_scores.append(sim)
                rubro_corto = (t.get("rubro") or "")[:65]
                print(f"  {i:2d}. {sim:.4f}  {rubro_corto}")

        except Exception as e:
            print(f"  ❌ Error: {e}")

    # ========================================================================
    # RESUMEN ESTADÍSTICO
    # ========================================================================
    print(f"\n{'=' * 80}")
    print("📊 RESUMEN ESTADÍSTICO")
    print(f"{'=' * 80}")
    if not todos_los_scores:
        print("No hay scores para analizar.")
        return

    todos_los_scores.sort(reverse=True)
    n = len(todos_los_scores)
    print(f"Total de scores: {n}")
    print(f"Máximo:  {todos_los_scores[0]:.4f}")
    print(f"Mínimo:  {todos_los_scores[-1]:.4f}")
    print(f"Mediana: {todos_los_scores[n // 2]:.4f}")
    print(f"Promedio: {sum(todos_los_scores) / n:.4f}")

    # Percentiles
    for p in (10, 25, 50, 75, 90):
        idx = int(n * p / 100)
        idx = min(idx, n - 1)
        print(f"P{p}: {todos_los_scores[idx]:.4f}")


if __name__ == "__main__":
    main()

    