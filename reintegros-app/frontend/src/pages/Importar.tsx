import { useState } from "react";
import axios from "axios";
import { API_BASE } from "../api";

export default function Importar() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resultado, setResultado] = useState<any>(null);

  const handleUpload = async () => {
    if (!files.length) return;

    setLoading(true);
    setUploadProgress(0);
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const progressTimer = window.setInterval(() => {
      setUploadProgress((current) => {
        const increment = Math.max(1, Math.ceil((92 - current) * 0.08));
        return Math.min(current + increment, 92);
      });
    }, 150);

    try {
      const res = await axios.post(`${API_BASE}/api/importar-masivo`, formData);
      setUploadProgress(100);
      setResultado(res.data);
    } catch (error) {
      setUploadProgress(0);
      alert("Error al importar archivos");
    } finally {
      window.clearInterval(progressTimer);
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
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          className="block w-full border border-gray-300 p-3 rounded mb-4"
        />
        <button
          onClick={handleUpload}
          disabled={!files.length || loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading
            ? `Procesando... ${uploadProgress}%`
            : `Cargar ${files.length} Archivo${files.length > 1 ? "s" : ""}`}
        </button>

        {loading && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1 text-sm text-gray-600">
              <span>Extrayendo información de los archivos...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-700 transition-all duration-150 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {resultado && (
          <div className="mt-8 border-t pt-6">
            <h2 className="text-xl font-bold mb-4">
              Resultado de la Importación Masiva
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

            {resultado.archivos?.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold mb-2">Archivos procesados:</h3>
                <ul className="list-disc pl-5 text-sm text-gray-700">
                  {resultado.archivos.map((archivo: any, index: number) => (
                    <li key={index}>
                      {archivo.archivo}: {archivo.validos} válidos,{" "}
                      {archivo.duplicados} duplicados, {archivo.errores} errores
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <h3 className="font-bold mb-2">
              Vista previa de registros procesados:
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-sm">
                    <th className="p-2 border">Archivo</th>
                    <th className="p-2 border">Fila Excel</th>
                    <th className="p-2 border">Estado</th>
                    <th className="p-2 border">Descripción Original</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.detalles.map((d: any, i: number) => (
                    <tr key={i} className="text-sm">
                      <td className="p-2 border">{d.archivo || "-"}</td>
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
