"""
================================================================================
🔑 CONFIGURACIÓN CENTRALIZADA - EL LLAVERO DEL AUTO
================================================================================
Carga las variables del archivo .env y las expone como un objeto 'settings'.
Todas las piezas del auto (motor, computadora, tablero) usan este llavero.
"""

# ============================================================================
# IMPORTS
# ============================================================================
import os
from pathlib import Path
from dotenv import load_dotenv

# ============================================================================
# CARGA DEL ARCHIVO .env
# ============================================================================
# La raíz del proyecto está 3 niveles arriba de este archivo:
# app/core/config.py -> app/core -> app -> RAÍZ
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = ROOT_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# ============================================================================
# CLASE DE CONFIGURACIÓN
# ============================================================================
class Settings:
    """Configuración centralizada del proyecto (dual: local + nube)"""

    def __init__(self):
        # --- METADATOS ---
        self.PROJECT_NAME = "JURIS_PULSE_V3"
        self.DEBUG = os.getenv("DEBUG", "False").lower() == "true"

        # --- RUTAS ---
        self.ROOT_DIR = ROOT_DIR
        self.STATIC_DIR = ROOT_DIR / "static"
        self.TEMPLATES_DIR = ROOT_DIR / "templates"
        self.DATA_DIR = ROOT_DIR / "static" / "data"

        # --- SUPABASE (desde .env) ---
        self.SUPABASE_URL = os.getenv("SUPABASE_URL")
        self.SUPABASE_KEY = os.getenv("SUPABASE_KEY")
        self.USE_SUPABASE = os.getenv("USE_SUPABASE", "False").lower() == "true"

        # --- OPENAI (desde .env) ---
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

        # --- BASE DE DATOS LOCAL (PostgreSQL) ---
        self.DB_ENGINE = os.getenv("DB_ENGINE", "postgresql")
        self.DB_NAME = os.getenv("DB_NAME", "practica_legal")
        self.DB_USER = os.getenv("DB_USER", "postgres")
        self.DB_PASSWORD = os.getenv("DB_PASSWORD", "6419")
        self.DB_HOST = os.getenv("DB_HOST", "localhost")
        self.DB_PORT = os.getenv("DB_PORT", "5432")

        # --- URL DE CONEXIÓN (para SQLAlchemy, si se usa) ---
        self.DATABASE_URL = (
            f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@"
            f"{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    def get_db_url(self) -> str:
        """Devuelve la URL de conexión a la base de datos."""
        return self.DATABASE_URL


# ============================================================================
# INSTANCIA GLOBAL
# ============================================================================
# Se crea UNA sola instancia para toda la aplicación.
settings = Settings()