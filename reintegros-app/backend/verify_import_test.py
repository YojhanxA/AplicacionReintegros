import os
import pandas as pd
from io import BytesIO

os.chdir("C:/Users/USUARIO/Downloads/reintegros-full-app/reintegros-app/backend")
from app.database import Base, engine, SessionLocal
from app.import_service import procesar_excel

Base.metadata.create_all(bind=engine)
db = SessionLocal()

df = pd.DataFrame({
    'Placa':['ABC-123','ABC-123','XYZ-999'],
    'Cantidad':[1,1,2],
    'Descripcion':['Gato','Gato','Perro'],
    'Fecha':['2024-01-01','2024-01-01','2024-01-02']
})

bio = BytesIO()
df.to_excel(bio, index=False)
bio.seek(0)

result = procesar_excel(bio.getvalue(), 'test.xlsx', db)
print(result)
db.close()
