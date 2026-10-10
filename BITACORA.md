# 📓 BITÁCORA · JurisTech_mx

Registro de avances, decisiones y estado del proyecto.
La deuda técnica vive en `DEUDA_TECNICA.md` (no duplicar aquí).

**Última actualización:** 03 de octubre de 2026
**Versión activa:** v3.3.0
**Estado:** En producción · aceptando feedback de usuarios reales.

---

## 🏗️ Arquitectura (las 2 carpetas)

El proyecto vive en **dos carpetas independientes**:

### 📁 `practica_python/` — La Fábrica (local, Linux Mint)
Donde se procesa y enriquece la información **antes** de publicarla.

- Recibe los PDFs semanales del SJF en `data/`.
- Extrae texto (`modulo1_*.py`).
- Enriquece con IA (`modulo1_5_enriquecimiento.py`).
- Genera embeddings (`poblar_*.py`).
- Puebla la **BD local** (`practica_legal`).
- **Sube a Supabase** con `subir_a_supabase.py`.
- Scripts auxiliares de auditoría y análisis.

**Aquí NO se hace frontend ni backend.** Solo procesamiento de datos.

### 📁 `juris_pulse_v3/` — La Aplicación (deployable)
Lo que ve el usuario.

- **Backend:** FastAPI en `app/`.
- **Frontend:** HTML/CSS/JS en `templates/` y `static/`.
- **Deploy:** Render (plan Free).
- **BD de producción:** Supabase.
- **BD local de desarrollo:** `practica_legal` (misma que la fábrica).

**Aquí NO se procesan PDFs.** Solo se sirven datos.

### 🗄️ Bases de datos
- **Local (`practica_legal`):** fuente de verdad. Solo la toca la fábrica.
- **Supabase:** espejo público. Solo lo lee la aplicación.
- **Actualización:** cada viernes, la fábrica procesa lo nuevo y sube a Supabase.

---

## 🎯 Estado actual

### ✅ Backend
- FastAPI en Render (plan Free).
- Switch local/Supabase con `DB_ENV`.
- Embeddings adaptativos: 1536 (local) / 512 (Supabase).
- 6 endpoints funcionales: `/indice`, `/stats`, `/resumenes`, `/buscar/semantica`, `/buscar/exacta`, `/detalle/{reg}`, `/eventos/registrar`, `/eventos/stats`.

### ✅ Frontend
- 3 pestañas: **Explorar**, **Preguntar**, **Exacta**.
- Búsqueda semántica con IA (score 1-10).
- Búsqueda exacta sobre 5 campos con `unaccent`.
- Resaltado de término en amarillo (tarjetas + cortina).
- Modo claro / oscuro persistente.
- Modal de bienvenida (primera visita del día).
- Tooltip de Resumen IA.
- Botón "Regresar arriba".
- Modal "Acerca de".
- Drawer con contacto.
- Cache busting (`?v=N`).
- Favicon 404 (deuda técnica).

### ✅ Datos
- **27,665 tesis** en local y Supabase.
- Embeddings de 512 dims (Matryoshka, sin pérdida perceptible).
- Índice HNSW (Supabase) para búsqueda semántica.
- Índice GIN trigramas (Supabase) para búsqueda exacta.
- `unaccent` activado en ambos entornos.

### ✅ Infraestructura
- GitHub: `Arthebrio/juris_pulse`.
- Render: `juris-pulse.onrender.com` (auto-deploy).
- Supabase: proyecto `lonayjblwyjzagijonfu`.

### ✅ Contador de eventos
- Tabla `eventos` en Supabase: `(fecha, tipo, contador)`.
- Registra: `visita`, `busqueda_semantica`, `busqueda_exacta`, `copiar_tesis`.
- Stats mostradas en consola del navegador (F12).
- Costo OpenAI estimado visible.

---

## 🎨 Marca

- **Nombre visible:** `JurisTech_mx`.
- **Nombre de carpetas/repo:** `juris_pulse_v3` / `juris_pulse` (no se cambia).
- **Claim:** "Consulta quirúrgica de jurisprudencias del SJF".
- **Copyright:** "© 2026 JurisTech_mx · Todos los derechos reservados".

---

## 📅 Ritual del viernes

1. **Bajar** los PDFs del SJF → `practica_python/data/`.
2. **Procesar** con el pipeline de la fábrica (extraer → enriquecer → embeddings).
3. **Poblar** la BD local (`practica_legal`).
4. **Rellenar** `embedding_512` de las nuevas:
   ```sql
   UPDATE jurisprudencias SET embedding_512 = (SELECT ('[' || array_to_string((string_to_array(trim(both '[]' from embedding::text), ','))[1:512], ',') || ']')::vector(512)) WHERE embedding_512 IS NULL;