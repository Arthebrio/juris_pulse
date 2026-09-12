import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

# Si las variables no están definidas, el programa fallará con un error claro
if not url or not key:
    raise ValueError("SUPABASE_URL y SUPABASE_KEY deben estar definidas en el archivo .env")

# Esta es la instancia global de tu cliente de Supabase
supabase: Client = create_client(url, key)