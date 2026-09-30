import pandas as pd
import hashlib

path = r'C:\Users\USUARIO\Downloads\reintegros-full-app\reintegros-app\backend\REINTEGRO BIENES MUEBLES I.E EL DIAMANTE ABRIL 2026. OK.xlsx'
xl = pd.ExcelFile(path)
print('SHEETS:', xl.sheet_names)

for s in xl.sheet_names:
    df = xl.parse(s, header=None)
    print('\nSHEET', s, 'ROWS', len(df))

    for i in range(min(10, len(df))):
        print(i, df.iloc[i].head(12).tolist())

    header_row = None
    for idx in range(len(df)):
        row_values = [str(v).strip().replace("'", '').replace('"', '') for v in df.iloc[idx].fillna('').tolist()]
        row_values_norm = [v.lower() for v in row_values if v]
        if not row_values_norm:
            continue
        hits = set()
        for v in row_values_norm:
            if 'placa' in v:
                hits.add('placa')
            if 'cant' in v or 'cantidad' in v:
                hits.add('cantidad')
            if 'articulo' in v or 'artículo' in v or 'descripcion' in v or 'desc' in v or 'elemento' in v or 'bien' in v:
                hits.add('articulo')
            if 'fecha' in v:
                hits.add('fecha')
        if len(hits) >= 3:
            header_row = idx
            print('HEADER ROW', idx, 'HITS', hits)
            break

    if header_row is None:
        print('NO HEADER DETECTED')
        continue

    data = df.iloc[header_row + 1:].copy()
    data.columns = [str(x).strip().replace("'", '').replace('"', '') for x in df.iloc[header_row].tolist()]
    print('COLUMNS:', list(data.columns[:10]))

    hashes = {}
    dupes = []
    for idx, row in data.iterrows():
        vals = [str(v).strip() if v is not None and str(v).strip() not in ('nan', '') else '' for v in row.fillna('')]
        if len(vals) < 4:
            continue
        placa = vals[0]
        cant = vals[1]
        desc = vals[2]
        fecha = vals[3]
        if placa.lower() in ['', 'placa'] or desc.lower() in ['', 'descripcion']:
            continue
        desc_norm = desc.strip().upper()
        raw = f'{placa.strip()}-{cant.strip()}-{desc_norm}-{fecha.strip()}'
        h = hashlib.sha256(raw.encode('utf-8')).hexdigest()
        hashes.setdefault(h, []).append((idx, placa, cant, desc, fecha))

    for h, arr in hashes.items():
        if len(arr) > 1:
            dupes.append((h, arr))

    print('TOTAL DUPLICATE HASHES', len(dupes))
    for h, arr in dupes[:10]:
        print('HASH', h)
        for item in arr:
            print('  ', item)
