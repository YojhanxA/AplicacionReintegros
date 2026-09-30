$excelPath = "C:\Users\USUARIO\Downloads\reintegros-full-app\reintegros-app\backend\duplicate_test.xlsx"
$venvPython = "C:\Users\USUARIO\Downloads\reintegros-full-app\.venv312-final\Scripts\python.exe"
& $venvPython -c "import pandas as pd; df = pd.DataFrame({'Placa':['ABC-123','ABC-123','XYZ-999'],'Cantidad':[1,1,2],'Descripcion':['Gato','Gato','Perro'],'Fecha':['2024-01-01','2024-01-01','2024-01-02']}); df.to_excel(r'$excelPath', index=False); print('excel_written')"

$response = Invoke-WebRequest -Uri "http://localhost:8001/api/importar" -Method Post -Form @{ file = Get-Item $excelPath }
$response.StatusCode
$response.Content
