import { useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8001";

export default function Importar() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${API_BASE}/api/importar`, formData);
      setResultado(res.data);
    } catch (error) {
      alert("Error al importar archivo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Importar Reintegros (Excel)</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full border border-gray-300 p-3 rounded mb-4"
        />
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Procesando..." : "Cargar Archivo"}
        </button>

        {resultado && (
          <div className="mt-8 border-t pt-6">
            <h2 className="text-xl font-bold mb-4">
              Resultado de la Importación
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded border border-green-200">
                <p className="text-green-800 font-bold">
                  Válidos: {resultado.validos}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                <p className="text-yellow-800 font-bold">
                  Duplicados: {resultado.duplicados}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded border border-red-200">
                <p className="text-red-800 font-bold">
                  Errores: {resultado.errores}
                </p>
              </div>
            </div>

            <h3 className="font-bold mb-2">
              Vista previa de registros procesados:
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-sm">
                    <th className="p-2 border">Fila Excel</th>
                    <th className="p-2 border">Estado</th>
                    <th className="p-2 border">Descripción Original</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.detalles.map((d: any, i: number) => (
                    <tr key={i} className="text-sm">
                      <td className="p-2 border">{d.fila}</td>
                      <td className="p-2 border">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${d.estado === "Ok" ? "bg-green-100 text-green-800" : d.estado === "Duplicado" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                        >
                          {d.estado}
                        </span>
                      </td>
                      <td className="p-2 border">{d.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
