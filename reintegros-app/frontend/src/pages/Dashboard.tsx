import { useEffect, useState } from "react";
import axios from "axios";

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard Resumen</h1>
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
