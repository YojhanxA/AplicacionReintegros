from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.database import Base

class ArchivoImportado(Base):
    __tablename__ = "archivos_importados"
    id = Column(Integer, primary_key=True, index=True)
    nombre_archivo = Column(String(255), nullable=False)
    total_registros = Column(Integer, default=0)
    fecha_carga = Column(DateTime(timezone=True), server_default=func.now())

class Reintegro(Base):
    __tablename__ = "reintegros"
    id = Column(Integer, primary_key=True, index=True)
    fecha_reintegro = Column(Date, index=True, nullable=True)
    placa = Column(String(100), index=True, nullable=True)
    cantidad = Column(Integer, nullable=False, default=1)
    descripcion_original = Column(Text, nullable=False)
    descripcion_normalizada = Column(String(255), index=True, nullable=True)
    institucion = Column(String(255), index=True, nullable=True)
    hash_registro = Column(String(64), unique=True, index=True, nullable=False)
    archivo_origen_id = Column(Integer, ForeignKey("archivos_importados.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
