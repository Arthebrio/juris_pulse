"""
================================================================================
🔧 SERVICIO DE JURISPRUDENCIA - LA COMPUTADORA A BORDO
================================================================================
Orquesta las operaciones del backend. Usa el motor (repositorio) para acceder
a los datos y aplica la lógica de negocio.

Responsabilidades:
- Generar embeddings para búsquedas semánticas (llamando a OpenAI).
- Orquestar las operaciones entre el repositorio y la API.
- Aplicar reglas de negocio.

NO se conecta directamente a PostgreSQL. Eso lo hace el motor.

Uso:
    from app.services.jurisprudencia_svc import jurisprudencia_service
    resultados = jurisprudencia_service.buscar_semantica("amparo", limite=10)
"""

# ============================================================================
# IMPORTS
# ============================================================================
from openai import OpenAI
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.core.logging_config import logger
from app.repositories.jurisprudencia_repo import jurisprudencia_repo


# ============================================================================
# CLASE PRINCIPAL DEL SERVICIO
# ============================================================================
class JurisprudenciaService:
    """
    Servicio de lógica de negocio para jurisprudencias.
    """

    # ------------------------------------------------------------------------
    # INICIALIZACIÓN
    # ------------------------------------------------------------------------
    def __init__(self):
        """
        Inicializa el cliente de OpenAI para generar embeddings.
        """
        if not settings.OPENAI_API_KEY:
            logger.error("❌ No se encontró OPENAI_API_KEY en el .env")
            raise ValueError("OPENAI_API_KEY no está configurada.")

        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.modelo_embedding = "text-embedding-3-small"  # 1536 dimensiones
        logger.info("🔧 Servicio de jurisprudencia inicializado.")

    # ------------------------------------------------------------------------
    # MÉTODO PRIVADO: GENERAR EMBEDDING DE UN TEXTO
    # ------------------------------------------------------------------------
    def _generar_embedding(self, texto: str) -> Optional[list]:
        """
        Genera un embedding (vector de 1536 dimensiones) a partir de un texto.
        Usa OpenAI para hacerlo.
        """
        try:
            logger.debug(f"🧠 Generando embedding para texto de {len(texto)} caracteres...")
            response = self.openai_client.embeddings.create(
                model=self.modelo_embedding,
                input=texto[:8000]  # Límite de OpenAI
            )
            embedding = response.data[0].embedding
            logger.debug(f"✅ Embedding generado ({len(embedding)} dimensiones).")
            return embedding
        except Exception as e:
            logger.error(f"❌ Error al generar embedding: {e}")
            return None

    # ------------------------------------------------------------------------
    # MÉTODO 1: BÚSQUEDA SEMÁNTICA
    # ------------------------------------------------------------------------
    def buscar_semantica(self, consulta: str, limite: int = 10) -> List[Dict[str, Any]]:
        """
        Realiza una búsqueda semántica:
        1. Genera el embedding de la consulta.
        2. Pide al motor que busque tesis similares.
        """
        logger.info(f"🔍 Búsqueda semántica: \"{consulta}\" (límite: {limite})")

        # 1. Generar el embedding de la consulta
        embedding = self._generar_embedding(consulta)
        if not embedding:
            logger.error("❌ No se pudo generar el embedding de la consulta.")
            return []

        # 2. Pedir al motor que busque por similitud
        resultados = jurisprudencia_repo.buscar_por_embedding(embedding, limite)

        # 3. Log del resultado
        logger.info(f"✅ Búsqueda semántica completada. {len(resultados)} resultados.")
        return resultados

    # ------------------------------------------------------------------------
    # MÉTODO 2: LISTADO LIGERO (para el frontend y la poda de árbol)
    # ------------------------------------------------------------------------
    def obtener_listado_ligero(self) -> List[Dict[str, Any]]:
        """
        Devuelve el listado ligero de todas las tesis.
        Delega al motor.
        """
        logger.info("📥 Solicitando listado ligero al motor...")
        return jurisprudencia_repo.obtener_todas_ligeras()

    # ------------------------------------------------------------------------
    # MÉTODO 3: DETALLE DE UNA TESIS
    # ------------------------------------------------------------------------
    def obtener_detalle(self, registro_digital: int) -> Optional[Dict[str, Any]]:
        """
        Devuelve el detalle completo de una tesis.
        Delega al motor.
        """
        logger.info(f"📥 Solicitando detalle del registro {registro_digital} al motor...")
        return jurisprudencia_repo.obtener_detalle(registro_digital)


# ============================================================================
# INSTANCIA GLOBAL (Singleton)
# ============================================================================
# Se crea UNA sola instancia para toda la aplicación.
jurisprudencia_service = JurisprudenciaService()