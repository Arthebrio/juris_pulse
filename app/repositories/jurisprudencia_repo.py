"""
================================================================================
⚙️ REPOSITORIO DE JURISPRUDENCIA - EL MOTOR DEL AUTO
================================================================================
Se conecta a PostgreSQL y ejecuta consultas sobre la tabla 'jurisprudencias'.

Responsabilidades:
- Establecer la conexión a la base de datos.
- Ejecutar consultas SQL (SELECT, INSERT, etc.).
- Devolver los resultados como listas de diccionarios.

NO tiene lógica de negocio. Eso vive en app/services/jurisprudencia.py

Uso:
    from app.repositories.jurisprudencia import jurisprudencia_repo
    resultados = jurisprudencia_repo.buscar_por_embedding(embedding, limite=10)
"""

# ============================================================================
# IMPORTS
# ============================================================================
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.core.logging_config import logger


# ============================================================================
# CLASE PRINCIPAL DEL REPOSITORIO
# ============================================================================
class JurisprudenciaRepository:
    """
    Repositorio de acceso a datos para la tabla 'jurisprudencias'.
    """

    # ------------------------------------------------------------------------
    # CONEXIÓN A LA BASE DE DATOS
    # ------------------------------------------------------------------------
    def _get_connection(self):
        """
        Establece una conexión a PostgreSQL usando las credenciales de settings.
        Devuelve un objeto de conexión de psycopg2.
        """
        try:
            conn = psycopg2.connect(
                dbname=settings.DB_NAME,
                user=settings.DB_USER,
                password=settings.DB_PASSWORD,
                host=settings.DB_HOST,
                port=settings.DB_PORT
            )
            logger.debug(f"✅ Conexión exitosa a PostgreSQL: {settings.DB_NAME}")
            return conn
        except Exception as e:
            logger.error(f"❌ Error al conectar a PostgreSQL: {e}")
            raise

    # ------------------------------------------------------------------------
    # MÉTODO 1: LISTADO LIGERO (para el frontend) [LEGACY]
    # ------------------------------------------------------------------------
    def obtener_todas_ligeras(self) -> List[Dict[str, Any]]:
        """
        Devuelve un listado ligero de todas las tesis.
        Solo trae los campos necesarios para el frontend.

        ⚠️ LEGACY: con 27,000+ tesis este método pesa ~40 MB.
        Usar obtener_indice() para la carga inicial del frontend.
        """
        logger.info("📥 Obteniendo listado ligero de todas las tesis...")
        conn = self._get_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                SELECT 
                    registro_digital,
                    tipo,
                    epoca,
                    materia,
                    fecha_publicacion,
                    rubro,
                    resumen_ia
                FROM jurisprudencias
                ORDER BY registro_digital DESC;
            """)
            resultados = cur.fetchall()
            logger.info(f"✅ Se obtuvieron {len(resultados)} tesis (listado ligero).")
            return [dict(r) for r in resultados]
        except Exception as e:
            logger.error(f"❌ Error en obtener_todas_ligeras: {e}")
            return []
        finally:
            conn.close()

    # ------------------------------------------------------------------------
    # MÉTODO 1-BIS: ÍNDICE LIGERO (carga inicial del frontend)
    # ------------------------------------------------------------------------
    def obtener_indice(self) -> List[Dict[str, Any]]:
        """
        Devuelve SOLO el índice del corpus (sin resumen_ia).
        Diseñado para cargarse completo al inicio y alimentar el dashboard
        y los filtros locales sin saturar al navegador.

        Campos devueltos:
        - registro_digital, tipo, materia, epoca, fecha_publicacion, rubro
        """
        logger.info("📥 Obteniendo índice del corpus (sin resumen_ia)...")
        conn = self._get_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                SELECT 
                    registro_digital,
                    tipo,
                    materia,
                    epoca,
                    fecha_publicacion,
                    rubro
                FROM jurisprudencias
                ORDER BY registro_digital DESC;
            """)
            resultados = cur.fetchall()
            logger.info(f"✅ Índice obtenido: {len(resultados)} tesis.")
            return [dict(r) for r in resultados]
        except Exception as e:
            logger.error(f"❌ Error en obtener_indice: {e}")
            return []
        finally:
            conn.close()

    # ------------------------------------------------------------------------
    # MÉTODO 1-TER: RESÚMENES IA POR LOTE
    # ------------------------------------------------------------------------
    def obtener_resumenes(self, registros: List[int]) -> Dict[int, str]:
        """
        Devuelve el resumen_ia SOLO de los registros solicitados.
        Se usa desde el frontend para "hidratar" las tarjetas visibles
        sin traer 27,000 resúmenes de golpe.

        Recibe: lista de registro_digital (ej. [2009773, 2009774, ...])
        Devuelve: dict {registro_digital: resumen_ia}
        """
        if not registros:
            return {}

        logger.info(f"📥 Obteniendo resúmenes IA para {len(registros)} registros...")
        conn = self._get_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                SELECT registro_digital, resumen_ia
                FROM jurisprudencias
                WHERE registro_digital = ANY(%s);
            """, (registros,))
            filas = cur.fetchall()
            resultado = {r["registro_digital"]: r["resumen_ia"] for r in filas}
            logger.info(f"✅ {len(resultado)} resúmenes obtenidos.")
            return resultado
        except Exception as e:
            logger.error(f"❌ Error en obtener_resumenes: {e}")
            return {}
        finally:
            conn.close()

    # ------------------------------------------------------------------------
    # MÉTODO 2: DETALLE COMPLETO (para la cortina)
    # ------------------------------------------------------------------------
    def obtener_detalle(self, registro_digital: int) -> Optional[Dict[str, Any]]:
        """
        Devuelve el detalle completo de una tesis por su registro_digital.
        Excluye el campo 'embedding' (es pesado y no lo necesita el frontend).
        """
        logger.info(f"📥 Obteniendo detalle del registro: {registro_digital}")
        conn = self._get_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                SELECT 
                    registro_digital,
                    tipo,
                    epoca,
                    materia,
                    expediente,
                    fecha_publicacion,
                    fecha_normalizada,
                    instancia,
                    rubro,
                    resumen_ia,
                    hechos,
                    criterio_juridico,
                    justificacion,
                    texto,
                    clave_tesis,
                    archivo_origen
                FROM jurisprudencias
                WHERE registro_digital = %s;
            """, (registro_digital,))
            resultado = cur.fetchone()
            if resultado:
                logger.info(f"✅ Detalle obtenido para registro {registro_digital}.")
                return dict(resultado)
            else:
                logger.warning(f"⚠️ No se encontró el registro {registro_digital}.")
                return None
        except Exception as e:
            logger.error(f"❌ Error en obtener_detalle: {e}")
            return None
        finally:
            conn.close()

    # ------------------------------------------------------------------------
    # MÉTODO 3: BÚSQUEDA SEMÁNTICA (el corazón del motor)
    # ------------------------------------------------------------------------
    def buscar_por_embedding(self, embedding: list, limite: int = 10) -> List[Dict[str, Any]]:
        """
        Busca tesis por similitud semántica usando pgvector.
        Devuelve las tesis más cercanas al embedding proporcionado.
        """
        logger.info(f"🔍 Buscando por similitud semántica (límite: {limite})...")
        conn = self._get_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                SELECT 
                    registro_digital,
                    tipo,
                    epoca,
                    materia,
                    fecha_publicacion,
                    rubro,
                    resumen_ia,
                    (1 - (embedding <=> %s::vector)) AS similitud
                FROM jurisprudencias
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT %s;
            """, (embedding, embedding, limite))
            resultados = cur.fetchall()
            logger.info(f"✅ Búsqueda semántica completada. {len(resultados)} resultados.")
            return [dict(r) for r in resultados]
        except Exception as e:
            logger.error(f"❌ Error en buscar_por_embedding: {e}")
            return []
        finally:
            conn.close()


# ============================================================================
# INSTANCIA GLOBAL (Singleton)
# ============================================================================
# Se crea UNA sola instancia del repositorio para toda la aplicación.
# Así no creamos conexiones innecesarias.
jurisprudencia_repo = JurisprudenciaRepository()