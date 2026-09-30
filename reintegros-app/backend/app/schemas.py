from pydantic import BaseModel
from typing import Optional, List
from datetime import date

class ReintegroBase(BaseModel):
    fecha_reintegro: Optional[date] = None
    placa: Optional[str] = None
    cantidad: int
    descripcion_original: str
    descripcion_normalizada: Optional[str] = None
    institucion: Optional[str] = None

class ReintegroOut(ReintegroBase):
    id: int
    class Config:
        from_attributes = True

class ImportPreview(BaseModel):
    validos: int
    errores: int
    duplicados: int
    detalles: List[dict]

class ResumenArticulo(BaseModel):
    articulo: str
    total_cantidad: int
    registros: int

    class Config:
        from_attributes = True
