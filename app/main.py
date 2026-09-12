from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from app.api.routes import router as api_router

app = FastAPI(title="JURIS_PULSE_V3", version="1.0.0")

# CORS...
# API router...
app.include_router(api_router)

# Montar archivos estáticos
static_dir = Path(__file__).resolve().parent.parent / "static"
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Ruta raíz: servir index.html
@app.get("/")
async def root():
    index_path = Path(__file__).resolve().parent.parent / "templates" / "index.html"
    return FileResponse(str(index_path))