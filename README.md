# JURIS_PULSE · Consulta Quirúrgica de Jurisprudencia

> Sistema local para consultar, filtrar y buscar por significado las tesis de la
> Suprema Corte de Justicia de la Nación (SCJN). Combina la velocidad de un
> listado filtrable con la potencia de la búsqueda semántica mediante
> embeddings vectoriales.

---

## 📌 Estado del proyecto

| Pieza | Estado | Notas |
| :--- | :--- | :--- |
| **Base de datos** | ✅ Funcionando | PostgreSQL 16 + pgvector, 4,792 tesis cargadas |
| **Pipeline de ingesta** | ✅ Funcionando | Extracción, enriquecimiento, embeddings, carga |
| **Backend (FastAPI)** | ✅ Funcionando | 3 endpoints: listado, detalle, búsqueda semántica |
| **Frontend (HTML/JS/CSS)** | ✅ Funcionando | Dos modos: filtros y semántica |
| **Búsqueda semántica** | ✅ Funcionando | Similitudes entre 0.55 y 0.65 según consulta |
| **Función "tesis similares"** | ⏳ Backlog | Botón en la cortina para buscar tesis parecidas |
| **Telemetría real** | ⏳ Backlog | Contador de búsquedas desde el backend |
| **Migración a Supabase** | ⏳ Backlog | Para publicar en la nube |

---

## 🗺️ Arquitectura general

El sistema tiene **tres capas independientes** que se comunican entre sí:

---

## 🛠️ Tecnologías usadas

| Capa | Tecnología | Versión | Propósito |
| :--- | :--- | :--- | :--- |
| Base de datos | PostgreSQL | 16 | Almacenamiento relacional |
| Extensión vectorial | pgvector | 0.6+ | Búsqueda por similitud |
| Backend | FastAPI | 0.111 | Framework de API |
| Servidor | uvicorn | 0.30 | Servidor ASGI |
| IA (embeddings) | OpenAI `text-embedding-3-small` | API | Vectorización de tesis y consultas |
| IA (resúmenes) | OpenAI `gpt-4o-mini` | API | Generación de resúmenes de tesis |
| Extracción | pdfplumber | — | Lectura de PDFs del Semanario |
| Frontend | HTML + CSS + JavaScript | Vanilla | Sin frameworks |

---

## 🚀 Cómo ejecutar el proyecto

### 1. Backend

```bash
cd ~/proyectos/juris_pulse_v3
source venv/bin/activate.fish
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000


cd ~/proyectos/practica_python
source venv/bin/activate.fish

# 1. Extraer PDFs del Semanario
python modulo1_moderno.py    # o modulo1_definitivo.py

# 2. Enriquecer con IA (resumen + cerebro oculto)
python modulo1_5_enriquecimiento.py

# 3. Cargar a PostgreSQL y generar embeddings
python poblar_moderno.py      # o poblar_antiguo.py


---

## 🧠 Lo que acabas de leer (puntos clave)

1. **El README es tu bitácora.** No es solo para otros, es para **ti mismo** en 3 meses.
2. **La sección "Decisiones de diseño" es la más valiosa.** Explica el **por qué** de cada decisión.
3. **La bitácora documenta el experimento fallido.** Eso es método científico.
4. **El backlog está vivo.** Se actualiza con cada hito.
5. **La filosofía "menos es más" está presente.** Pero con fundamento, no por dogma.

---

## 📌 Mi reflexión final

Tocayo, este README es más que documentación. Es **la memoria del proyecto**. Cuando vuelvas en 3 meses y te preguntes "¿por qué demonios hice esto así?", el README tendrá la respuesta.

**El experimento del embedding corto es la joya del documento.** Porque demuestra que no estás improvisando: estás **experimentando, midiendo y decidiendo**.

---

### 📌 ¿Qué hacemos ahora?

**Guarda el README en `juris_pulse_v3/README.md`** y dime:

1. ¿Quieres que ajustemos algo del README?
2. ¿Prefieres que sigamos poblando la base de datos?
3. ¿O quieres explorar el siguiente punto del backlog?

**Tú decides, tocayo.** ☕️🧠🚗

📋 Deuda técnica apuntada

    □

    Reemplazar 1900-01-01 por NULL en el extractor (futuras cargas).
    □

    2025258 — investigar por qué no carga.
    □

    165034 — borrar (no existe, colado en auditoría).
    □

    Telemetría formal (cuando haya ~50 usuarios).
    □

    Log ligero de búsquedas semánticas (2-3 líneas).
    □

    Migración a Supabase (cuando decidas).
    □

    Reducción de dimensiones de embeddings (opcional, futuro).
    □

    Fase 7 del rediseño: calibración de umbrales de similitud.

   📋 Deuda técnica apuntada

    □

    Badge "Coincide en resumen IA" en búsqueda exacta (cuando el match no está en rubro). 