"""
================================================================================
🔑 CONFIGURACIÓN CENTRALIZADA - EL LLAVERO DEL AUTO
================================================================================
Carga las variables del archivo .env y las expone como un objeto 'settings'.
Todas las piezas del auto (motor, computadora, tablero) usan este llavero.

MODO DUAL:
  - DB_ENV=local     → lee de la base local (Linux Mint)
  - DB_ENV=supabase  → lee de la nube (Supabase Pooler)

Cambiar entre ambos es tan simple como editar el .env y reiniciar el server.
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

        # --- SUPABASE (API REST: URL + ANON_KEY) ---
        self.SUPABASE_URL = os.getenv("SUPABASE_URL")
        self.SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

        # --- OPENAI ---
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

        # --- SELECTOR DE BASE DE DATOS ---
        # 'local' → Linux Mint · 'supabase' → Nube
        self.DB_ENV = os.getenv("DB_ENV", "local").strip().lower()

        # --- BASE DE DATOS LOCAL (Linux Mint) ---
        self.DB_LOCAL_NAME = os.getenv("DB_LOCAL_NAME", "practica_legal")
        self.DB_LOCAL_USER = os.getenv("DB_LOCAL_USER", "agr")
        self.DB_LOCAL_PASSWORD = os.getenv("DB_LOCAL_PASSWORD", "6419")
        self.DB_LOCAL_HOST = os.getenv("DB_LOCAL_HOST", "localhost")
        self.DB_LOCAL_PORT = os.getenv("DB_LOCAL_PORT", "5432")

        # --- BASE DE DATOS SUPABASE (Session Pooler) ---
        self.DB_SUPABASE_NAME = os.getenv("DB_SUPABASE_NAME", "postgres")
        self.DB_SUPABASE_USER = os.getenv("DB_SUPABASE_USER", "")
        self.DB_SUPABASE_PASSWORD = os.getenv("DB_SUPABASE_PASSWORD", "")
        self.DB_SUPABASE_HOST = os.getenv("DB_SUPABASE_HOST", "")
        self.DB_SUPABASE_PORT = os.getenv("DB_SUPABASE_PORT", "5432")

        # --- RESOLUCIÓN DEL MODO ACTIVO ---
        # Estas son las variables que usa el repositorio (jurisprudencia_repo.py).
        # Se llenan según el valor de DB_ENV.
        if self.DB_ENV == "supabase":
            self.DB_NAME = self.DB_SUPABASE_NAME
            self.DB_USER = self.DB_SUPABASE_USER
            self.DB_PASSWORD = self.DB_SUPABASE_PASSWORD
            self.DB_HOST = self.DB_SUPABASE_HOST
            self.DB_PORT = self.DB_SUPABASE_PORT
        else:  # local (default)
            self.DB_NAME = self.DB_LOCAL_NAME
            self.DB_USER = self.DB_LOCAL_USER
            self.DB_PASSWORD = self.DB_LOCAL_PASSWORD
            self.DB_HOST = self.DB_LOCAL_HOST
            self.DB_PORT = self.DB_LOCAL_PORT

               # --- COLUMNA DE EMBEDDING SEGÚN EL MODO ---
        # Local: 'embedding' (1536 dims)
        # Supabase: 'embedding' (512 dims)
        # (Aunque se llamen igual, las dimensiones son distintas; el nombre de
        #  columna es el mismo en ambos lados. Se accede vía EMBEDDING_COLUMN
        #  para que el código sea explícito y fácil de cambiar en el futuro.)
        self.EMBEDDING_COLUMN = "embedding"

        # --- DIMENSIONES DEL EMBEDDING SEGÚN EL MODO ---
        # Local: 1536 dims (embeddings completos, ya poblados)
        # Supabase: 512 dims (embeddings reducidos con Matryoshka)
        self.EMBEDDING_DIMENSIONS = 512 if self.DB_ENV == "supabase" else 1536

         
              
        # --- URL DE CONEXIÓN (por si algún módulo la necesita completa) ---
        self.DATABASE_URL = (
            f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@"
            f"{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    def get_db_url(self) -> str:
        """Devuelve la URL de conexión a la base de datos activa."""
        return self.DATABASE_URL

    def resumen_modo(self) -> str:
        """Devuelve un resumen legible del modo activo (para logs)."""
        if self.DB_ENV == "supabase":
            return f"☁️  Supabase ({self.DB_HOST})"
        return f"🏠  Local ({self.DB_HOST}/{self.DB_NAME})"


# ============================================================================
# INSTANCIA GLOBAL
# ============================================================================
# Se crea UNA sola instancia para toda la aplicación.
settings = Settings()