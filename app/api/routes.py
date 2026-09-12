"""
================================================================================
🎛️ TABLERO DE RUTAS - LOS ENDPOINTS DE LA API
================================================================================
Expone los endpoints que el frontend consume.

Endpoints:
- GET /api/jurisprudencias/todas                → Listado ligero (poda de árbol)
- GET /api/jurisprudencias/detalle/{registro}   → Detalle de una tesis
- GET /api/jurisprudencias/buscar/semantica     → Búsqueda semántica
"""

# ============================================================================
# IMPORTS
# ============================================================================
from fastapi import APIRouter, HTTPException
from app.services.jurisprudencia_svc import jurisprudencia_service
from app.core.logging_config import logger


# ============================================================================
# ROUTER
# ============================================================================
router = APIRouter(
    prefix="/api/jurisprudencias",
    tags=["Jurisprudencias"]
)


# ============================================================================
# ENDPOINT 1: LISTADO LIGERO (para la poda de árbol del frontend)
# ============================================================================
@router.get("/todas")
async def obtener_todas():
    """
    Devuelve el listado ligero de todas las tesis.
    El frontend lo usa para la poda de árbol (filtros locales).
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
# ENDPOINT 2: DETALLE DE UNA TESIS
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
# ENDPOINT 3: BÚSQUEDA SEMÁNTICA (la joya de la corona)
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