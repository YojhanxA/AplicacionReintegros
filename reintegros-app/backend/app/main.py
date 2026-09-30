from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import engine, Base, get_db
from app import models, schemas, import_service

# Crear base de datos
Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Reintegros")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    total_reintegros = db.query(models.Reintegro).count()
    archivos = db.query(models.ArchivoImportado).count()
    return {"total_registros": total_reintegros, "archivos_procesados": archivos}

@app.post("/api/importar", response_model=schemas.ImportPreview)
def importar_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="El archivo debe ser Excel")

    content = file.file.read()
    resultados = import_service.procesar_excel(content, file.filename, db)
    return resultados

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
            resultado = import_service.procesar_excel(content, file.filename, db)
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
    skip: int = 0,
    limit: int = 100,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    articulo: Optional[str] = None,
    placa: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Reintegro)

    if fecha_desde:
        query = query.filter(models.Reintegro.fecha_reintegro >= fecha_desde)
    if fecha_hasta:
        query = query.filter(models.Reintegro.fecha_reintegro <= fecha_hasta)
    if articulo:
        query = query.filter(models.Reintegro.descripcion_normalizada.ilike(f"%{articulo}%"))
    if placa:
        query = query.filter(models.Reintegro.placa.ilike(f"%{placa}%"))

    reintegros = query.offset(skip).limit(limit).all()
    return reintegros

@app.get("/api/resumen-articulos", response_model=List[schemas.ResumenArticulo])
def resumen_articulos(db: Session = Depends(get_db)):
    rows = (
        db.query(
            models.Reintegro.descripcion_normalizada.label("articulo"),
            func.sum(models.Reintegro.cantidad).label("total_cantidad"),
            func.count(models.Reintegro.id).label("registros"),
        )
        .group_by(models.Reintegro.descripcion_normalizada)
        .order_by(func.sum(models.Reintegro.cantidad).desc())
        .all()
    )
    return [
        schemas.ResumenArticulo(
            articulo=row.articulo or "SIN DESCRIPCION",
            total_cantidad=int(row.total_cantidad or 0),
            registros=int(row.registros or 0),
        )
        for row in rows
    ]
