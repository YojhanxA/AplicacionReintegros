import pandas as pd
from io import BytesIO
from app.database import Base, engine, SessionLocal
from app.import_service import procesar_excel

Base.metadata.create_all(bind=engine)
db = SessionLocal()

df = pd.DataFrame({
    'Placa': ['ABC-123', 'XYZ-999'],
    'Cantidad': [1, 2],
    'Articulo': ['SILLA', 'MESA'],
    'Fecha': ['2024-01-01', '2024-01-02'],
})

bio = BytesIO()
df.to_excel(bio, index=False)
bio.seek(0)

print(procesar_excel(bio.getvalue(), 'test.xlsx', db))
db.close()
