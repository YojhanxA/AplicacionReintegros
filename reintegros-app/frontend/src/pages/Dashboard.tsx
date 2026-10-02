import { useEffect, useState } from "react";
import axios from "axios";
import { FileDown } from "lucide-react";
import { API_BASE } from "../api";

type ResumenArticulo = {
  articulo: string;
  total_cantidad: number;
  registros: number;
};

type ResumenInstitucion = {
  institucion: string;
  total_cantidad: number;
  registros: number;
  familias: ResumenArticulo[];
};

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_objetos: 0,
    archivos_procesados: 0,
  });
  const [totalEsConteo, setTotalEsConteo] = useState(false);
  const [resumen, setResumen] = useState<ResumenArticulo[]>([]);
  const [resumenInstituciones, setResumenInstituciones] = useState<
    ResumenInstitucion[]
  >([]);
  const [institucionSeleccionada, setInstitucionSeleccionada] = useState("");
  const [exportando, setExportando] = useState(false);
  const [modoPdf, setModoPdf] = useState<
    "general" | "institucion" | "completo"
  >("general");

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

    axios
      .get(`${API_BASE}/api/resumen-instituciones`)
      .then((res) => {
        setResumenInstituciones(res.data);
        setInstitucionSeleccionada(res.data[0]?.institucion ?? "");
      })
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
      const informeInstitucion =
        modoPdf !== "general"
          ? resumenInstituciones.find(
              (item) => item.institucion === institucionSeleccionada,
            )
          : undefined;

      documento.setFontSize(18);
      documento.text(
        modoPdf === "institucion"
          ? "Informe por institución"
          : modoPdf === "completo"
            ? "Informe general y por institución"
            : "Informe de reintegros",
        14,
        18,
      );
      documento.setFontSize(10);
      documento.text(`Generado: ${new Date().toLocaleString("es-CO")}`, 14, 26);

      if (modoPdf !== "institucion") {
        documento.text(
          `Total de objetos: ${totalObjetos.toLocaleString("es-CO")}`,
          14,
          34,
        );
        documento.text(
          `Archivos procesados/Reintegros realizados: ${stats.archivos_procesados.toLocaleString("es-CO")}`,
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
      }

      if (informeInstitucion) {
        let inicioDesglose =
          modoPdf === "institucion"
            ? 34
            : (documento as any).lastAutoTable.finalY + 12;
        if (inicioDesglose > documento.internal.pageSize.getHeight() - 35) {
          documento.addPage();
          inicioDesglose = 20;
        }
        documento.setFontSize(14);
        documento.text(
          `Desglose: ${informeInstitucion.institucion}`,
          14,
          inicioDesglose,
        );
        documento.setFontSize(10);
        documento.text(
          `Objetos: ${informeInstitucion.total_cantidad.toLocaleString("es-CO")} | Registros: ${informeInstitucion.registros.toLocaleString("es-CO")}`,
          14,
          inicioDesglose + 6,
        );
        autoTable(documento, {
          startY: inicioDesglose + 11,
          head: [["Familia", "Unidades", "Registros"]],
          body: informeInstitucion.familias.map((item) => [
            item.articulo,
            item.total_cantidad.toLocaleString("es-CO"),
            item.registros.toLocaleString("es-CO"),
          ]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [31, 41, 55] },
          margin: { left: 14, right: 14, bottom: 14 },
        });
      }

      documento.save(
        `informe-reintegros-${modoPdf}-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
    } finally {
      setExportando(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard Resumen</h1>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            Contenido PDF
            <select
              value={modoPdf}
              onChange={(event) =>
                setModoPdf(event.target.value as typeof modoPdf)
              }
              className="rounded border border-gray-300 px-3 py-2"
            >
              <option value="general">Solo resumen general</option>
              <option value="institucion">Solo institución seleccionada</option>
              <option value="completo">
                Resumen + institución seleccionada
              </option>
            </select>
          </label>
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
      </div>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
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
            Archivos Procesados/Reintegros realizados
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

      <div className="mt-6 bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-gray-500 text-sm uppercase font-semibold">
            Informe por institución
          </h2>
          <select
            value={institucionSeleccionada}
            onChange={(event) => setInstitucionSeleccionada(event.target.value)}
            className="min-w-64 rounded border border-gray-300 px-3 py-2 text-sm"
          >
            {resumenInstituciones.map((item) => (
              <option key={item.institucion} value={item.institucion}>
                {item.institucion}
              </option>
            ))}
          </select>
        </div>
        {(() => {
          const informe = resumenInstituciones.find(
            (item) => item.institucion === institucionSeleccionada,
          );
          if (!informe) {
            return (
              <p className="text-gray-500">
                Todavía no hay datos por institución.
              </p>
            );
          }
          return (
            <>
              <p className="mb-3 text-sm font-semibold text-blue-700">
                {informe.total_cantidad.toLocaleString("es-CO")} objetos en{" "}
                {informe.registros.toLocaleString("es-CO")} registros
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left border-collapse">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="p-3 border-b">Familia</th>
                      <th className="p-3 border-b">Unidades</th>
                      <th className="p-3 border-b">Registros</th>
                    </tr>
                  </thead>
                  <tbody>
                    {informe.familias.map((familia) => (
                      <tr key={familia.articulo} className="hover:bg-gray-50">
                        <td className="p-3 border-b">{familia.articulo}</td>
                        <td className="p-3 border-b">
                          {familia.total_cantidad.toLocaleString("es-CO")}
                        </td>
                        <td className="p-3 border-b">
                          {familia.registros.toLocaleString("es-CO")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
