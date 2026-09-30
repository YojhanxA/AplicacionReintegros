from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
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
    expose_headers=["X-Total-Count", "X-Total-Quantity"],
)

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    total_objetos = db.query(func.coalesce(func.sum(models.Reintegro.cantidad), 0)).scalar()
    archivos = db.query(models.ArchivoImportado).count()
    return {"total_objetos": total_objetos, "archivos_procesados": archivos}

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
    response: Response,
    skip: int = 0,
    limit: int = 100,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    articulo: Optional[str] = None,
    placa: Optional[str] = None,
    institucion: Optional[str] = None,
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
    if institucion:
        query = query.filter(models.Reintegro.institucion.ilike(f"%{institucion}%"))

    response.headers["X-Total-Count"] = str(query.count())
    response.headers["X-Total-Quantity"] = str(
        query.with_entities(func.coalesce(func.sum(models.Reintegro.cantidad), 0)).scalar()
    )
    reintegros = query.order_by(models.Reintegro.id).offset(skip).limit(limit).all()
    return reintegros

@app.get("/api/resumen-articulos", response_model=List[schemas.ResumenArticulo])
def resumen_articulos(db: Session = Depends(get_db)):
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
