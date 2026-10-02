from io import BytesIO
import os
from threading import RLock
from time import monotonic

import pandas as pd
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import func, inspect, text
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import engine, Base, get_db
from app import models, schemas, import_service
from app.import_service import normalizar_texto

# Crear base de datos
Base.metadata.create_all(bind=engine)
if "institucion" not in {column["name"] for column in inspect(engine).get_columns("reintegros")}:
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE reintegros ADD COLUMN institucion VARCHAR(255)"))

app = FastAPI(title="API Reintegros")

frontend_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_URL", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        *frontend_origins,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Total-Quantity"],
)


_RESUMEN_CACHE_TTL = 300
_resumen_cache = {}
_resumen_cache_lock = RLock()


def _obtener_cacheado(clave, cargar):
    with _resumen_cache_lock:
        ahora = monotonic()
        entrada = _resumen_cache.get(clave)
        if entrada and entrada[0] > ahora:
            return entrada[1]

        resultado = cargar()
        _resumen_cache[clave] = (ahora + _RESUMEN_CACHE_TTL, resultado)
        return resultado


def _invalidar_cache_resumenes():
    with _resumen_cache_lock:
        _resumen_cache.clear()


def _filtrar_reintegros(db, fecha_desde, fecha_hasta, articulo, placa, institucion):
    query = db.query(models.Reintegro)

    if fecha_desde:
        query = query.filter(models.Reintegro.fecha_reintegro >= fecha_desde)
    if fecha_hasta:
        query = query.filter(models.Reintegro.fecha_reintegro <= fecha_hasta)
    if placa:
        query = query.filter(models.Reintegro.placa.ilike(f"%{placa}%"))
    if institucion:
        query = query.filter(models.Reintegro.institucion.ilike(f"%{institucion}%"))
    if articulo:
        candidatos = query.with_entities(
            models.Reintegro.id,
            models.Reintegro.descripcion_original,
        ).all()
        ids_coincidentes = [
            registro_id
            for registro_id, descripcion in candidatos
            if normalizar_texto(descripcion) == articulo
        ]
        query = query.filter(models.Reintegro.id.in_(ids_coincidentes))

    return query


def _ordenar_reintegros(query, ordenar_por):
    ordenes = {
        "fecha_desc": models.Reintegro.fecha_reintegro.desc(),
        "fecha_asc": models.Reintegro.fecha_reintegro.asc(),
        "cantidad_desc": models.Reintegro.cantidad.desc(),
        "cantidad_asc": models.Reintegro.cantidad.asc(),
        "articulo_asc": models.Reintegro.descripcion_original.asc(),
        "articulo_desc": models.Reintegro.descripcion_original.desc(),
        "institucion_asc": models.Reintegro.institucion.asc(),
        "institucion_desc": models.Reintegro.institucion.desc(),
    }
    return query.order_by(ordenes.get(ordenar_por, models.Reintegro.id.asc()))


@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    def cargar_stats():
        total_objetos = db.query(func.coalesce(func.sum(models.Reintegro.cantidad), 0)).scalar()
        archivos = db.query(models.ArchivoImportado).count()
        return {"total_objetos": total_objetos, "archivos_procesados": archivos}

    return _obtener_cacheado("stats", cargar_stats)


@app.get("/api/opciones-consulta")
def opciones_consulta(db: Session = Depends(get_db)):
    def cargar_opciones():
        instituciones = [
            institucion
            for (institucion,) in db.query(models.Reintegro.institucion)
            .filter(models.Reintegro.institucion.isnot(None))
            .distinct()
            .order_by(models.Reintegro.institucion)
            .all()
            if institucion and institucion.strip()
        ]
        descripciones = db.query(models.Reintegro.descripcion_original).all()
        familias = sorted({normalizar_texto(descripcion) for (descripcion,) in descripciones})
        return {"instituciones": instituciones, "familias": familias}

    return _obtener_cacheado("opciones-consulta", cargar_opciones)


@app.get("/api/resumen-instituciones")
def resumen_instituciones(db: Session = Depends(get_db)):
    def cargar_resumen():
        rows = db.query(
            models.Reintegro.institucion,
            models.Reintegro.descripcion_original,
            models.Reintegro.cantidad,
        ).all()
        instituciones = {}

        for institucion, descripcion, cantidad in rows:
            nombre = (institucion or "SIN INSTITUCION").strip() or "SIN INSTITUCION"
            llave_institucion = nombre.casefold()
            informe = instituciones.setdefault(
                llave_institucion,
                {"institucion": nombre, "total_cantidad": 0, "registros": 0, "familias": {}},
            )
            articulo = normalizar_texto(descripcion)
            familia = informe["familias"].setdefault(
                articulo, {"articulo": articulo, "total_cantidad": 0, "registros": 0}
            )
            unidades = int(cantidad or 0)
            informe["total_cantidad"] += unidades
            informe["registros"] += 1
            familia["total_cantidad"] += unidades
            familia["registros"] += 1

        resultado = []
        for informe in instituciones.values():
            informe["familias"] = sorted(
                informe["familias"].values(),
                key=lambda familia: familia["total_cantidad"],
                reverse=True,
            )
            resultado.append(informe)

        return sorted(resultado, key=lambda informe: informe["total_cantidad"], reverse=True)

    return _obtener_cacheado("resumen-instituciones", cargar_resumen)


@app.post("/api/importar", response_model=schemas.ImportPreview)
def importar_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="El archivo debe ser Excel")

    content = file.file.read()
    try:
        return import_service.procesar_excel(content, file.filename, db)
    finally:
        _invalidar_cache_resumenes()

@app.post("/api/importar-masivo")
def importar_excel_masivo(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    if not files:
        raise HTTPException(status_code=400, detail="Debes enviar al menos un archivo")

    resumen = {
        "validos": 0,
        "errores": 0,
        "duplicados": 0,
        "detalles": [],
        "archivos": [],
    }

    for file in files:
        if not file.filename or not file.filename.lower().endswith(('.xlsx', '.xls')):
            resumen["errores"] += 1
            resumen["detalles"].append({"archivo": file.filename or "archivo_desconocido", "estado": "Error", "desc": "El archivo debe ser Excel"})
            continue

        try:
            content = file.file.read()
            try:
                resultado = import_service.procesar_excel(content, file.filename, db)
            finally:
                _invalidar_cache_resumenes()
            resumen["validos"] += resultado.get("validos", 0)
            resumen["errores"] += resultado.get("errores", 0)
            resumen["duplicados"] += resultado.get("duplicados", 0)
            resumen["archivos"].append({
                "archivo": file.filename,
                "validos": resultado.get("validos", 0),
                "errores": resultado.get("errores", 0),
                "duplicados": resultado.get("duplicados", 0),
            })

            for detalle in resultado.get("detalles", []):
                resumen["detalles"].append({"archivo": file.filename, **detalle})
        except Exception as exc:
            resumen["errores"] += 1
            resumen["detalles"].append({"archivo": file.filename, "estado": "Error", "desc": str(exc)})

    return resumen

@app.get("/api/reintegros", response_model=List[schemas.ReintegroOut])
def listar_reintegros(
    response: Response,
    skip: int = 0,
    limit: int = 100,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    articulo: Optional[str] = None,
    placa: Optional[str] = None,
    institucion: Optional[str] = None,
    ordenar_por: str = "id_asc",
    db: Session = Depends(get_db),
):
    query = _filtrar_reintegros(db, fecha_desde, fecha_hasta, articulo, placa, institucion)

    response.headers["X-Total-Count"] = str(query.count())
    response.headers["X-Total-Quantity"] = str(
        query.with_entities(func.coalesce(func.sum(models.Reintegro.cantidad), 0)).scalar()
    )
    reintegros = _ordenar_reintegros(query, ordenar_por).offset(skip).limit(limit).all()
    return reintegros


@app.get("/api/reintegros/exportar-excel")
def exportar_reintegros_excel(
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    articulo: Optional[str] = None,
    placa: Optional[str] = None,
    institucion: Optional[str] = None,
    ordenar_por: str = "id_asc",
    db: Session = Depends(get_db),
):
    query = _filtrar_reintegros(db, fecha_desde, fecha_hasta, articulo, placa, institucion)
    reintegros = _ordenar_reintegros(query, ordenar_por).all()
    filas = [
        {
            "ID": reintegro.id,
            "Fecha": reintegro.fecha_reintegro,
            "Placa": reintegro.placa,
            "Institución": reintegro.institucion or "SIN INSTITUCION",
            "Familia": normalizar_texto(reintegro.descripcion_original),
            "Descripción original": reintegro.descripcion_original,
            "Cantidad": reintegro.cantidad,
        }
        for reintegro in reintegros
    ]
    buffer = BytesIO()
    pd.DataFrame(filas).to_excel(buffer, index=False, sheet_name="Reintegros")
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="informe_reintegros.xlsx"'},
    )


@app.get("/api/resumen-articulos", response_model=List[schemas.ResumenArticulo])
def resumen_articulos(db: Session = Depends(get_db)):
    def cargar_resumen():
        rows = db.query(models.Reintegro.descripcion_original, models.Reintegro.cantidad).all()
        acumulado = {}
        for descripcion, cantidad in rows:
            articulo = normalizar_texto(descripcion)
            resumen = acumulado.setdefault(articulo, {"total_cantidad": 0, "registros": 0})
            resumen["total_cantidad"] += int(cantidad or 0)
            resumen["registros"] += 1

        return [
            schemas.ResumenArticulo(
                articulo=articulo,
                total_cantidad=valores["total_cantidad"],
                registros=valores["registros"],
            )
            for articulo, valores in sorted(
                acumulado.items(), key=lambda item: item[1]["total_cantidad"], reverse=True
            )
        ]

    return _obtener_cacheado("resumen-articulos", cargar_resumen)
