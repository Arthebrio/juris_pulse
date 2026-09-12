"""
================================================================================
🔔 CONFIGURACIÓN DE LOGS - EL SISTEMA DE ALARMAS
================================================================================
Centraliza la configuración de logs para TODO el backend.

Responsabilidades:
- Escribir logs en la terminal (para ver en tiempo real).
- Escribir logs en un archivo en output/logs/backend.log (para auditar).

Uso en cualquier parte del código:
    from app.core.logging_config import logger
    logger.info("Mensaje informativo")
    logger.error("Algo salió mal")
"""

# ============================================================================
# IMPORTS
# ============================================================================
import logging
from pathlib import Path

# ============================================================================
# RUTAS DE LOGS
# ============================================================================
# Definimos dónde se guardarán los logs (output/logs/backend.log)
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
LOGS_DIR = ROOT_DIR / "output" / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)  # Creamos la carpeta si no existe
LOG_FILE = LOGS_DIR / "backend.log"

# ============================================================================
# CONFIGURACIÓN DEL LOGGER
# ============================================================================
# Formato: fecha - [nivel] - mensaje
LOG_FORMAT = "%(asctime)s - [%(levelname)s] - %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Creamos el logger principal del backend
logger = logging.getLogger("JURIS_PULSE_BACKEND")
logger.setLevel(logging.DEBUG)

# ============================================================================
# HANDLER 1: ARCHIVO (output/logs/backend.log)
# ============================================================================
# Guarda TODO (DEBUG, INFO, WARNING, ERROR) en el archivo
file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))

# ============================================================================
# HANDLER 2: CONSOLA (terminal)
# ============================================================================
# Solo muestra INFO, WARNING y ERROR en la terminal (no satura)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))

# ============================================================================
# REGISTRAR HANDLERS (evitando duplicados)
# ============================================================================
if not logger.handlers:
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)