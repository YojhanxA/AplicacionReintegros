import hashlib
import re
import unicodedata
from io import BytesIO

import pandas as pd
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import ArchivoImportado, Reintegro


def normalizar_texto(texto):
    if pd.isna(texto):
        return "SIN DESCRIPCION"

    texto = str(texto).strip()
    if not texto:
        return "SIN DESCRIPCION"

    texto_norm = re.sub(r"[^A-Z0-9\s]", " ", texto.upper())
    texto_norm = re.sub(r"\s+", " ", texto_norm).strip()
    if not texto_norm:
        return "SIN DESCRIPCION"

    familias = [
        ("SILLA", ["SILLA", "SILLAS", "SILLON", "SILLONES", "SIILLAS"]),
        ("TABLERO", ["TABLERO", "TABLEROS"]),
        ("MESA", ["MESA", "MESAS"]),
        ("ESCRITORIO", ["ESCRITORIO", "ESCRITORIOS"]),
        ("ARCHIVO", ["ARCHIVO", "ARCHIVOS"]),
        ("BANCADA", ["BANCADA", "BANCADAS"]),
        ("MUEBLE", ["MUEBLE", "MUEBLES"]),
    ]

    for familia, tokens in familias:
        if any(token in texto_norm for token in tokens):
            return familia

    return texto_norm


def _normalizar_busqueda(texto):
    return unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode("ascii").lower()


def _extraer_fecha_desde_hoja(df, header_row):
    if df is None or df.empty:
        return None

    inicio = max(0, header_row - 20)
    fin = min(len(df), header_row + 5)

    for idx in range(inicio, fin):
        row = df.iloc[idx].fillna("")
        etiquetas = [_normalizar_busqueda(v).strip() for v in row.tolist()]

        dia_idx = next((i for i, v in enumerate(etiquetas) if "dia" in v), None)
        mes_idx = next((i for i, v in enumerate(etiquetas) if "mes" in v), None)
        anio_idx = next((i for i, v in enumerate(etiquetas) if "ano" in v or "anio" in v or "year" in v), None)

        if dia_idx is None or mes_idx is None or anio_idx is None:
            continue

        if idx + 1 >= len(df):
            continue

        fila_valores = df.iloc[idx + 1].fillna("")
        dia = fila_valores.iloc[dia_idx] if dia_idx < len(fila_valores) else None
        mes = fila_valores.iloc[mes_idx] if mes_idx < len(fila_valores) else None
        anio = fila_valores.iloc[anio_idx] if anio_idx < len(fila_valores) else None

        def _numero(value):
            if value is None or pd.isna(value):
                return None
            texto = str(value).strip().replace(".", "").replace(",", "")
            if not texto or texto.lower() in {"nan", "none"}:
                return None
            if re.fullmatch(r"\d{1,4}", texto):
                return int(texto)
            return None

        dia_num = _numero(dia)
        mes_num = _numero(mes)
        anio_num = _numero(anio)

        if dia_num is None or mes_num is None or anio_num is None:
            continue

        if not (1 <= dia_num <= 31 and 1 <= mes_num <= 12 and 1900 <= anio_num <= 2100):
            continue

        try:
            return pd.Timestamp(year=anio_num, month=mes_num, day=dia_num)
        except ValueError:
            continue

    return None


def _valor_celda(row, col_name):
    if col_name is None:
        return None

    key = str(col_name).strip()
    if key in row.index:
        valor = row[key]
        return None if pd.isna(valor) else valor

    lower_map = {str(k).strip().lower(): k for k in row.index}
    mapped_key = lower_map.get(key.lower())
    if mapped_key is not None:
        valor = row[mapped_key]
        return None if pd.isna(valor) else valor

    return None


def _normalizar_fecha(valor):
    if valor is None or pd.isna(valor):
        return None
    if isinstance(valor, str):
        texto = valor.strip()
        if not texto:
            return None
        try:
            return pd.to_datetime(texto).date()
        except Exception:
            return None
    if isinstance(valor, pd.Timestamp):
        return valor.date()
    if hasattr(valor, "date"):
        try:
            return valor.date()
        except Exception:
            pass
    return valor


def _identificar_columnas(df):
    normalized = df.copy()
    normalized.columns = [str(c).strip().lower() for c in normalized.columns]

    col_placa = next((c for c in normalized.columns if "placa" in str(c).lower()), None)
    col_cant = next(
        (c for c in normalized.columns if "cant" in str(c).lower() or "cantidad" in str(c).lower()),
        None,
    )
    col_desc = next(
        (
            c
            for c in normalized.columns
            if "articulo" in str(c).lower()
            or "art\u00edculo" in str(c).lower()
            or "descripcion" in str(c).lower()
            or "desc" in str(c).lower()
            or "elemento" in str(c).lower()
            or "bien" in str(c).lower()
        ),
        None,
    )
    col_fecha = next((c for c in normalized.columns if "fecha" in str(c).lower()), None)
    return col_placa, col_cant, col_desc, col_fecha


def _normalizar_fila_excel(file_bytes: bytes):
    excel_file = pd.ExcelFile(BytesIO(file_bytes))
    sheets = []
    for sheet_name in excel_file.sheet_names:
        df = excel_file.parse(sheet_name, header=None)
        if df.empty:
            continue

        header_row = None
        for idx in range(len(df)):
            row_values = df.iloc[idx].fillna("").tolist()
            row_values_norm = []
            for v in row_values:
                txt = str(v).strip().strip("'\"")
                if txt:
                    row_values_norm.append(txt.lower())

            if not row_values_norm:
                continue

            hits = set()
            for v in row_values_norm:
                if "placa" in v:
                    hits.add("placa")
                if "cant" in v or "cantidad" in v:
                    hits.add("cantidad")
                if "articulo" in v or "art\xedculo" in v or "descripcion" in v or "desc" in v or "elemento" in v or "bien" in v:
                    hits.add("articulo")
                if "fecha" in v:
                    hits.add("fecha")

            if len(hits) >= 3:
                header_row = idx
                break

        if header_row is None:
            continue

        fecha_archivo = _extraer_fecha_desde_hoja(df, header_row)

        data = df.iloc[header_row + 1 :].copy()
        if data.empty:
            continue

        data.columns = [str(x).strip().strip("'\"") for x in df.iloc[header_row].tolist()]
        data = data.rename(columns=lambda x: str(x).strip().strip("'\""))
        data = data[[c for c in data.columns if str(c).strip() not in ["", "placa", "cantidad", "cant", "articulo", "descripcion", "desc", "fecha"]]]

        data = data[data.apply(
            lambda row: not all(
                str(v).strip().strip("'\"").lower() in {"", "placa", "cantidad", "cant", "articulo", "descripcion", "desc", "fecha", "nan", "none"}
                for v in row.fillna("").tolist()
            ),
            axis=1,
        )].copy()

        sheets.append((sheet_name, header_row, data, fecha_archivo))
    return sheets


def procesar_excel(file_bytes: bytes, filename: str, db: Session):
    sheets = _normalizar_fila_excel(file_bytes)
    total_registros = sum(len(df) for _, _, df, _ in sheets)
    archivo_record = ArchivoImportado(nombre_archivo=filename, total_registros=total_registros)
    db.add(archivo_record)
    db.commit()
    db.refresh(archivo_record)

    registros_validos = 0
    errores = 0
    duplicados = 0
    detalles = []
    hashes_vistos = set()

    for sheet_name, header_idx, df, fecha_archivo in sheets:
        col_placa, col_cant, col_desc, col_fecha = _identificar_columnas(df)
        if col_placa is None or col_cant is None or col_desc is None:
            continue

        for index, row in df.iterrows():
            try:
                if row.empty:
                    continue
                fila_num = header_idx + index + 2

                placa_val = _valor_celda(row, col_placa)
                desc_val = _valor_celda(row, col_desc)
                cantidad_val = _valor_celda(row, col_cant)

                placa_str = str(placa_val).strip() if placa_val is not None else ""
                desc_str = str(desc_val).strip() if desc_val is not None else ""
                cant_str = str(cantidad_val).strip() if cantidad_val is not None else ""

                if placa_str.lower() in ["placa", "nan", "none", ""]:
                    continue
                if desc_str.lower() in ["articulo", "art\xedculo", "descripcion", "desc", "cantidad", "cant", "placa", "fecha", "nan", "none", ""]:
                    continue
                if cant_str in ["", "nan", "none"]:
                    continue

                placa_clean = placa_str.strip("'\"").lower()
                desc_clean = desc_str.strip("'\"").lower()
                cant_clean = cant_str.strip("'\"").lower()

                if any(token in placa_clean for token in ["placa", "cantidad", "articulo", "descripcion", "fecha"]) or any(token in desc_clean for token in ["placa", "cantidad", "articulo", "descripcion", "fecha"]) or any(token in cant_clean for token in ["placa", "cantidad", "articulo", "descripcion", "fecha"]):
                    continue

                placa = placa_str
                if placa.endswith(".0"):
                    placa = placa[:-2]

                cantidad = int(float(cant_str.replace(",", "").replace(".", "")))

                desc_orig = desc_str or "Sin descripcion"
                desc_norm = normalizar_texto(desc_orig)

                fecha = _normalizar_fecha(fecha_archivo)
                if fecha is None:
                    fecha = _normalizar_fecha(_valor_celda(row, col_fecha))

                raw_str = f"{placa}-{cantidad}-{desc_norm}-{fecha}"
                hash_reg = hashlib.sha256(raw_str.encode("utf-8")).hexdigest()

                existe = db.query(Reintegro).filter(Reintegro.hash_registro == hash_reg).first()
                pending_hashes = {obj.hash_registro for obj in db.new if isinstance(obj, Reintegro) and obj.hash_registro}

                if hash_reg in hashes_vistos or hash_reg in pending_hashes or existe:
                    duplicados += 1
                    detalles.append({"fila": f"{sheet_name}:{fila_num}", "estado": "Duplicado", "desc": desc_orig})
                    continue

                hashes_vistos.add(hash_reg)

                nuevo_reintegro = Reintegro(
                    fecha_reintegro=fecha,
                    placa=placa,
                    cantidad=cantidad,
                    descripcion_original=desc_orig,
                    descripcion_normalizada=desc_norm,
                    hash_registro=hash_reg,
                    archivo_origen_id=archivo_record.id,
                )
                db.add(nuevo_reintegro)
                registros_validos += 1
                detalles.append({"fila": f"{sheet_name}:{fila_num}", "estado": "Ok", "desc": desc_orig})
            except Exception as e:
                errores += 1
                detalles.append({"fila": f"{sheet_name}:{index + 2}", "estado": "Error", "desc": str(e)})

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        for obj in list(db.new):
            if isinstance(obj, Reintegro) and obj.hash_registro in hashes_vistos:
                db.expunge(obj)
                duplicados += 1
                detalles.append({"fila": "N/A", "estado": "Duplicado", "desc": obj.descripcion_original})
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            for obj in list(db.new):
                if isinstance(obj, Reintegro):
                    db.expunge(obj)
                    duplicados += 1
                    detalles.append({"fila": "N/A", "estado": "Duplicado", "desc": obj.descripcion_original})
            db.commit()

    return {
        "validos": registros_validos,
        "errores": errores,
        "duplicados": duplicados,
        "detalles": detalles[:50],
    }
