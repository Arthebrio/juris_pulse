from pydantic import BaseModel
from typing import Optional, List
from datetime import date

class TesisLigera(BaseModel):
    registro_digital: int
    tipo: str
    materias: Optional[List[str]] = None
    fecha_publicacion: date
    rubro: str
    resumen_ia: str

class TesisDetalle(TesisLigera):
    epoca: str
    clave_tesis: Optional[str] = None
    instancia: Optional[str] = None
    cuerpo_sustantivo: Optional[str] = None
    hechos: Optional[str] = None
    criterio_juridico: Optional[str] = None
    justificacion: Optional[str] = None