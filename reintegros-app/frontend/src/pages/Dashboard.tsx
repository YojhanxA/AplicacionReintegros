import { useEffect, useState } from "react";
import axios from "axios";
import { FileDown } from "lucide-react";

const API_BASE = "http://localhost:8001";

type ResumenArticulo = {
  articulo: string;
  total_cantidad: number;
  registros: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_objetos: 0,
    archivos_procesados: 0,
  });
  const [totalEsConteo, setTotalEsConteo] = useState(false);
  const [resumen, setResumen] = useState<ResumenArticulo[]>([]);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/stats`)
      .then((res) => {
        const tieneTotalObjetos = res.data.total_objetos !== undefined;
        setStats({
          total_objetos: Number(
            res.data.total_objetos ?? res.data.total_registros ?? 0,
          ),
          archivos_procesados: Number(res.data.archivos_procesados ?? 0),
        });
        setTotalEsConteo(!tieneTotalObjetos);
      })
      .catch(console.error);

    axios
      .get(`${API_BASE}/api/resumen-articulos`)
      .then((res) => setResumen(res.data))
      .catch(console.error);
  }, []);

  const exportarInforme = async () => {
    if (!resumen.length) return;

    setExportando(true);
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const documento = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const totalObjetos = resumen.reduce(
        (total, item) => total + item.total_cantidad,
        0,
      );
      const totalRegistros = resumen.reduce(
        (total, item) => total + item.registros,
        0,
      );

      documento.setFontSize(18);
      documento.text("Informe de reintegros", 14, 18);
      documento.setFontSize(10);
      documento.text(`Generado: ${new Date().toLocaleString("es-CO")}`, 14, 26);
      documento.text(
        `Total de objetos: ${totalObjetos.toLocaleString("es-CO")}`,
        14,
        34,
      );
      documento.text(
        `Archivos procesados: ${stats.archivos_procesados.toLocaleString("es-CO")}`,
        14,
        40,
      );

      autoTable(documento, {
        startY: 47,
        head: [["Familia / artículo", "Unidades", "Registros"]],
        body: resumen.map((item) => [
          item.articulo,
          item.total_cantidad.toLocaleString("es-CO"),
          item.registros.toLocaleString("es-CO"),
        ]),
        foot: [
          [
            "TOTAL",
            totalObjetos.toLocaleString("es-CO"),
            totalRegistros.toLocaleString("es-CO"),
          ],
        ],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [31, 41, 55] },
        footStyles: {
          fillColor: [239, 246, 255],
          textColor: [29, 78, 216],
          fontStyle: "bold",
        },
        margin: { left: 14, right: 14, bottom: 14 },
        didDrawPage: ({ pageNumber }) => {
          documento.setFontSize(8);
          documento.text(
            `Página ${pageNumber}`,
            documento.internal.pageSize.getWidth() - 14,
            documento.internal.pageSize.getHeight() - 7,
            { align: "right" },
          );
        },
      });

      documento.save(
        `informe-reintegros-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
    } finally {
      setExportando(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard Resumen</h1>
        <button
          type="button"
          onClick={exportarInforme}
          disabled={!resumen.length || exportando}
          className="inline-flex items-center gap-2 rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileDown size={18} aria-hidden="true" />
          {exportando ? "Generando PDF..." : "Exportar informe PDF"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-gray-500 text-sm uppercase font-semibold">
            {totalEsConteo ? "Total de reintegros" : "Total de objetos"}
          </h2>
          <p className="text-4xl font-bold text-blue-600 mt-2">
            {stats.total_objetos.toLocaleString("es-CO")}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-gray-500 text-sm uppercase font-semibold">
            Archivos Procesados
          </h2>
          <p className="text-4xl font-bold text-green-600 mt-2">
            {stats.archivos_procesados}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-gray-500 text-sm uppercase font-semibold mb-4">
          Resumen por artículo
        </h2>
        <div className="space-y-3">
          {resumen.length === 0 ? (
            <p className="text-gray-500">Todavía no hay datos resumidos.</p>
          ) : (
            resumen.map((item) => (
              <div
                key={item.articulo}
                className="flex items-center justify-between border-b pb-2"
              >
                <span className="font-medium">{item.articulo}</span>
                <span className="text-blue-700 font-bold">
                  {item.total_cantidad}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
