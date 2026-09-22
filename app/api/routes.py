"""
================================================================================
🎛️ TABLERO DE RUTAS - LOS ENDPOINTS DE LA API
================================================================================
Expone los endpoints que el frontend consume.

Endpoints:
- GET /api/jurisprudencias/todas                → Listado ligero completo [LEGACY, pesado]
- GET /api/jurisprudencias/indice               → Índice ligero (sin resumen_ia) ← CARGA INICIAL
- POST /api/jurisprudencias/resumenes           → Resúmenes IA por lote
- GET /api/jurisprudencias/detalle/{registro}   → Detalle de una tesis
- GET /api/jurisprudencias/buscar/semantica     → Búsqueda semántica
"""

# ============================================================================
# IMPORTS
# ============================================================================
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from app.services.jurisprudencia_svc import jurisprudencia_service
from app.core.logging_config import logger


# ============================================================================
# MODELOS DE ENTRADA
# ============================================================================
class PeticionResumenes(BaseModel):
    """Cuerpo de la petición POST /resumenes"""
    registros: List[int]


# ============================================================================
# ROUTER
# ============================================================================
router = APIRouter(
    prefix="/api/jurisprudencias",
    tags=["Jurisprudencias"]
)


# ============================================================================
# ENDPOINT 0: LISTADO LIGERO COMPLETO (LEGACY - pesado con 27k tesis)
# ============================================================================
@router.get("/todas")
async def obtener_todas():
    """
    Listado ligero COMPLETO (incluye resumen_ia).
    ⚠️ Con 27,000+ tesis pesa ~40 MB. Se conserva por compatibilidad.
    """
    try:
        logger.info("🌐 GET /todas")
        tesis = jurisprudencia_service.obtener_listado_ligero()
        return {
            "success": True,
            "total": len(tesis),
            "tesis": tesis
        }
    except Exception as e:
        logger.error(f"❌ Error en /todas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ENDPOINT 1: ÍNDICE LIGERO (para carga inicial del frontend)
# ============================================================================
@router.get("/indice")
async def obtener_indice():
    """
    Devuelve el índice del corpus (sin resumen_ia).
    Diseñado para cargarse completo al arrancar: alimenta el dashboard
    y los filtros locales sin saturar al navegador.
    """
    try:
        logger.info("🌐 GET /indice")
        tesis = jurisprudencia_service.obtener_indice()
        return {
            "success": True,
            "total": len(tesis),
            "tesis": tesis
        }
    except Exception as e:
        logger.error(f"❌ Error en /indice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ENDPOINT 2: RESÚMENES IA POR LOTE
# ============================================================================
@router.post("/resumenes")
async def obtener_resumenes(peticion: PeticionResumenes):
    """
    Recibe una lista de registros y devuelve sus resumen_ia.
    El frontend lo usa para hidratar las tarjetas visibles sin traer
    los 27,000 resúmenes de golpe.

    Body: { "registros": [2009773, 2009774, ...] }
    Response: { "success": true, "resumenes": { "2009773": "...", ... } }
    """
    try:
        logger.info(f"🌐 POST /resumenes ({len(peticion.registros)} registros)")
        if len(peticion.registros) > 500:
            raise HTTPException(
                status_code=400,
                detail="Máximo 500 registros por petición."
            )
        resumenes = jurisprudencia_service.obtener_resumenes(peticion.registros)
        return {
            "success": True,
            "total": len(resumenes),
            "resumenes": resumenes
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en /resumenes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINT 2-TER: BÚSQUEDA EXACTA (literal)
# ============================================================================
@router.get("/buscar/exacta")
async def buscar_exacta(
    q: str,
    tipo: str = None,
    materia: str = None,
    offset: int = 0,
    limit: int = 100,
):
    """
    Búsqueda literal en rubro y resumen_ia (ILIKE, ignora mayúsculas).
    NO tolera errores ortográficos. NO gasta tokens.

    Params:
      - q:       texto a buscar (obligatorio)
      - tipo:    'Jurisprudencia' | 'Aislada' (opcional)
      - materia: 'Penal' | 'Civil' | ... (opcional)
      - offset:  desde qué fila empezar (default 0)
      - limit:   cuántas devolver (default 100, máx 200)
    """
    try:
        logger.info(f"🌐 GET /buscar/exacta?q={q}&offset={offset}&limit={limit}")

        if not q or len(q.strip()) < 2:
            raise HTTPException(
                status_code=400,
                detail="La consulta debe tener al menos 2 caracteres."
            )

        # Topes de seguridad
        limit = min(max(limit, 1), 200)
        offset = max(offset, 0)

        resultado = jurisprudencia_service.buscar_exacta(
            consulta=q.strip(),
            tipo=tipo,
            materia=materia,
            offset=offset,
            limit=limit,
        )
        return {
            "success": True,
            "total": resultado["total"],
            "resultados": resultado["resultados"],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en /buscar/exacta: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINT 2-BIS: ESTADÍSTICAS DEL CORPUS
# ============================================================================
@router.get("/stats")
async def obtener_stats():
    """
    Devuelve estadísticas del corpus: total de tesis y rango de fechas.

    El frontend lo usa para el dashboard:
      📊 27,575 tesis
      📅 Del 13 de mayo de 2013 al 11 de septiembre de 2026
    """
    try:
        logger.info("🌐 GET /stats")
        stats = jurisprudencia_service.obtener_stats()
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"❌ Error en /stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ENDPOINT 3: DETALLE DE UNA TESIS
# ============================================================================
@router.get("/detalle/{registro_digital}")
async def obtener_detalle(registro_digital: int):
    """
    Devuelve el detalle completo de una tesis.
    El frontend lo usa para la cortina de detalle.
    """
    try:
        logger.info(f"🌐 GET /detalle/{registro_digital}")
        tesis = jurisprudencia_service.obtener_detalle(registro_digital)
        if not tesis:
            raise HTTPException(status_code=404, detail="Tesis no encontrada")
        return {
            "success": True,
            "tesis": tesis
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en /detalle/{registro_digital}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ENDPOINT 4: BÚSQUEDA SEMÁNTICA (la joya de la corona)
# ============================================================================
@router.get("/buscar/semantica")
async def buscar_semantica(q: str, limit: int = 10):
    """
    Búsqueda semántica: recibe un texto, genera su embedding internamente
    y devuelve las tesis más similares.
    """
    try:
        logger.info(f"🌐 GET /buscar/semantica?q={q}&limit={limit}")
        if not q or len(q.strip()) < 3:
            raise HTTPException(
                status_code=400,
                detail="La consulta debe tener al menos 3 caracteres."
            )
        # Tope de seguridad
        limit = min(max(limit, 1), 50)

        resultados = jurisprudencia_service.buscar_semantica(q, limite=limit)
        return {
            "success": True,
            "total": len(resultados),
            "tesis": resultados
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en /buscar/semantica: {e}")
        raise HTTPException(status_code=500, detail=str(e))