import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8001";

const formatFecha = (fecha: string | null | undefined) => {
  if (!fecha) return "N/A";

  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [year, month, day] = fecha.split("-").map(Number);
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  }

  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return fecha;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

export default function Consultas() {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/reintegros`)
      .then((res) => setData(res.data))
      .catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Consulta de Reintegros</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-3 border-b">ID</th>
              <th className="p-3 border-b">Placa</th>
              <th className="p-3 border-b">Descripción</th>
              <th className="p-3 border-b">Cant.</th>
              <th className="p-3 border-b">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No hay registros
                </td>
              </tr>
            ) : (
              data.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-3 border-b">{item.id}</td>
                  <td className="p-3 border-b">{item.placa || "N/A"}</td>
                  <td className="p-3 border-b">
                    {item.descripcion_normalizada}
                  </td>
                  <td className="p-3 border-b">{item.cantidad}</td>
                  <td className="p-3 border-b">
                    {formatFecha(item.fecha_reintegro)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
