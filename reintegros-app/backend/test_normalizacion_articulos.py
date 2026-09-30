import unittest

import pandas as pd

from app.import_service import _extraer_fecha_desde_hoja, _extraer_institucion_desde_hoja, normalizar_texto


class NormalizacionArticulosTest(unittest.TestCase):
    def test_sillas_se_agrupan_juntas(self):
        self.assertEqual(normalizar_texto('Silla Universitaria'), 'SILLA')
        self.assertEqual(normalizar_texto('Silla de escritorio ejecutiva'), 'SILLA')
        self.assertEqual(normalizar_texto('SILLAS PLASTICAS'), 'SILLA')

    def test_tableros_se_agrupan_juntos(self):
        self.assertEqual(normalizar_texto('Tablero metal mdf'), 'TABLERO')
        self.assertEqual(normalizar_texto('TABLERO DE MADERA'), 'TABLERO')

    def test_articulos_del_mismo_tipo_se_agrupan_en_familias(self):
        casos = {
            'COMPUTADOR PORTATIL HP PROBOOK 240 GB': 'COMPUTADOR PORTATIL',
            'PORTATIL COMPAQ PRESARIO': 'COMPUTADOR PORTATIL',
            '325 PUPITRES CON BANDEJA DE 5 A 11': 'PUPITRE',
            '116 PUESTOS DE TRABAJO AULA SECUNDARIA': 'PUESTO DE TRABAJO',
            '36 TABURETES PREESCOLAR METAL MADERA': 'BUTACO / TABURETE',
            '49 BUTACOS METALICOS PARA LABORATORIO': 'BUTACO / TABURETE',
            'TABLETA APRIX': 'TABLET',
            'ESTANTE METÁLICO CON PUERTA': 'ESTANTE',
            'CÁMARA INFRARROJA': 'CAMARA',
            'LOCKER METÁLICO S/N COMPARTIMIENTOS': 'LOCKER',
            'TELEVISOR LED 40': 'TELEVISOR',
        }
        for descripcion, familia in casos.items():
            with self.subTest(descripcion=descripcion):
                self.assertEqual(normalizar_texto(descripcion), familia)

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

    def test_extrae_institucion_de_la_dependencia(self):
        df = pd.DataFrame([
            ['', '', '', '', '', ''],
            ['', 'RESPONSABLE', 'DEPENDENCIA', 'DOCUMENTO', '', ''],
            ['', 'NOMBRE RESPONSABLE', 'INSTITUCION EDUCATIVA EL DIAMANTE', '123456', '', ''],
            ['PLACA', 'CANT.', 'ARTÍCULO', 'MARCA', '', ''],
        ])

        institucion = _extraer_institucion_desde_hoja(df, 3)
        self.assertEqual(institucion, 'INSTITUCION EDUCATIVA EL DIAMANTE')


if __name__ == '__main__':
    unittest.main()
