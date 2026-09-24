# 📓 BITÁCORA · JURIS_PULSE v3

Registro de avances, decisiones técnicas y pendientes del proyecto
de consulta quirúrgica de jurisprudencias.

**Última actualización:** 24 de septiembre de 2026
**Versión actual de la app:** 3.2.0

---

## ✅ Avances completados

### 🎨 Frontend / UX

- [x] **Rediseño de 3 pestañas:** Explorar · Preguntar · Exacta
- [x] **Modo claro / oscuro** con persistencia en `localStorage`
- [x] **Drawer** (menú lateral) con opciones
- [x] **Header fijo** con estado expandido/compacto al scroll
- [x] **Dashboard** con total de tesis y rango exacto de fechas
- [x] **Scroll infinito** con carga por lotes (200 + 100)
- [x] **Hidratación de resúmenes IA** por lotes (evita descargar 27k de golpe)
- [x] **Rediseño de tarjetas** con diseño homogéneo (3 columnas arriba + 3 abajo)
- [x] **Score discreto** en búsqueda semántica (escala visual 7.9–10.2)
- [x] **Tooltip de Resumen IA** con borde del color del modo
- [x] **Botón flotante "Regresar arriba"** que aparece al hacer scroll
- [x] **Simplificación de mensajes** redundantes (menos es más)
- [x] **Cache busting** con `?v=N` en CSS y JS
- [x] **Iconos desde jsdelivr** (más confiable en LATAM que cdnjs)
- [x] **Pull-to-refresh desactivado** (`overscroll-behavior-y: contain`)

### ⚙️ Backend

- [x] **FastAPI** con estructura: routes → services → repos
- [x] **Endpoint `/indice`** → corpus sin `resumen_ia` (11 MB vs 40 MB)
- [x] **Endpoint `/resumenes`** → resúmenes IA por lote (POST)
- [x] **Endpoint `/stats`** → total y rango de fechas exactas
- [x] **Endpoint `/buscar/semantica`** → búsqueda por embeddings
- [x] **Endpoint `/buscar/exacta`** → búsqueda literal con paginación
- [x] **Endpoint `/detalle/{registro}`** → detalle completo sin embedding
- [x] **Filtro anti-`1900-01-01`** en stats (evita fecha fantasma)
- [x] **Cache-Control** en HTML para evitar cacheo de la raíz

### 🗄️ Base de datos

- [x] **PostgreSQL local** con 27,581 tesis
- [x] **pgvector** con embeddings de 1536 dimensiones
- [x] **Índice HNSW** para búsqueda semántica rápida
- [x] **Check constraint** `check_estructura_tesis` (formato viejo O nuevo, nunca mezcla)
- [x] **Tabla replicada en Supabase** (vacía, lista para migrar)
- [x] **RLS activado** en Supabase
- [x] **3 índices creados en Supabase** (primario, único, HNSW)

### 📚 Datos

- [x] **27,581 tesis** extraídas, enriquecidas y cargadas
- [x] **Resúmenes IA** generados (80–105 palabras cada uno)
- [x] **Embeddings enriquecidos** (rubro + conceptos + resumen)
- [x] **Actualización semanal** los viernes con las tesis nuevas del SJF
- [x] **Script `calibrar_semantica.py`** para análisis de scores

### 🧠 Decisiones técnicas documentadas

- [x] **Cache busting** es estándar industrial (HTML fresco, assets con versión)
- [x] **Embeddings Matryoshka:** se pueden recortar de 1536 → 512 dims sin costo extra
- [x] **Score relativo** en vez de badges Alta/Media/Baja (los buckets son arbitrarios)
- [x] **Niveles de similitud:** convertir a escala 1-10 sumando 3 a `similitud × 10`
- [x] **Menos es más:** los colores viven en la navegación, no en el contenido
- [x] **Borde del color del modo** = contexto visual de la pestaña activa

---

## 📋 Pendientes

### 🔴 Alta prioridad

- [ ] **Migración a Supabase**
  - [ ] Reducir embeddings de 1536 → 512 dims (Matryoshka, sin costo)
  - [ ] `pg_dump` de local sin `texto_vectorial`
  - [ ] Importar en Supabase
  - [ ] Cambiar cadena de conexión en el backend
  - [ ] Probar los 6 endpoints desde Supabase

- [ ] **Búsqueda exacta insensible a mayúsculas, minúsculas y acentos**
  - Actualmente usa `ILIKE` (ignora mayúsculas/minúsculas pero **no acentos**).
  - Ejemplo del problema: "tortura" encuentra "TORTURA" pero "aplicacion" **no** encuentra "aplicación".
  - **Solución propuesta:** activar la extensión `unaccent` en PostgreSQL y cambiar la consulta a:
    ```sql
    WHERE unaccent(rubro) ILIKE unaccent(%s)
       OR unaccent(resumen_ia) ILIKE unaccent(%s)