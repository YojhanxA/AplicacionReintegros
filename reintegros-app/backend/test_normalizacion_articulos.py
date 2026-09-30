import unittest

import pandas as pd

from app.import_service import _extraer_fecha_desde_hoja, normalizar_texto


class NormalizacionArticulosTest(unittest.TestCase):
    def test_sillas_se_agrupan_juntas(self):
        self.assertEqual(normalizar_texto('Silla Universitaria'), 'SILLA')
        self.assertEqual(normalizar_texto('Silla de escritorio ejecutiva'), 'SILLA')
        self.assertEqual(normalizar_texto('SILLAS PLASTICAS'), 'SILLA')

    def test_tableros_se_agrupan_juntos(self):
        self.assertEqual(normalizar_texto('Tablero metal mdf'), 'TABLERO')
        self.assertEqual(normalizar_texto('TABLERO DE MADERA'), 'TABLERO')

    def test_extrae_fecha_compartida_en_dia_mes_anio(self):
        df = pd.DataFrame([
            ['', '', '', '', 'FECHA', 'DÍA', 'MES', 'AÑO'],
            ['', '', '', '', '', '29', '5', '2026'],
            ['PLACA', 'CANT.', 'ARTÍCULO', 'MARCA'],
            ['200200112', 40, 'SILLAS PLASTICAS', ''],
        ])

        fecha = _extraer_fecha_desde_hoja(df, 2)
        self.assertIsNotNone(fecha)
        self.assertEqual(fecha.date().isoformat(), '2026-05-29')


if __name__ == '__main__':
    unittest.main()
