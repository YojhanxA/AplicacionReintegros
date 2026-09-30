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
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [totalQuantity, setTotalQuantity] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [filters, setFilters] = useState({
    fechaDesde: "",
    fechaHasta: "",
    articulo: "",
    placa: "",
    institucion: "",
  });

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/reintegros`, {
        params: {
          skip: currentPage * pageSize,
          limit: pageSize,
          fecha_desde: filters.fechaDesde || undefined,
          fecha_hasta: filters.fechaHasta || undefined,
          articulo: filters.articulo || undefined,
          placa: filters.placa || undefined,
          institucion: filters.institucion || undefined,
        },
      })
      .then((res) => {
        setData(res.data);
        const totalHeader = res.headers["x-total-count"];
        setTotalCount(totalHeader === undefined ? null : Number(totalHeader));
        const quantityHeader = res.headers["x-total-quantity"];
        setTotalQuantity(
          quantityHeader === undefined ? null : Number(quantityHeader),
        );
      })
      .catch(console.error);
  }, [
    currentPage,
    pageSize,
    filters.fechaDesde,
    filters.fechaHasta,
    filters.articulo,
    filters.placa,
    filters.institucion,
  ]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(0);
  };

  const resetFilters = () => {
    setFilters({
      fechaDesde: "",
      fechaHasta: "",
      articulo: "",
      placa: "",
      institucion: "",
    });
    setCurrentPage(0);
  };

  const firstRecord = data.length === 0 ? 0 : currentPage * pageSize + 1;
  const lastRecord = currentPage * pageSize + data.length;
  const hasNextPage =
    totalCount === null
      ? data.length === pageSize
      : (currentPage + 1) * pageSize < totalCount;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Consulta de Reintegros</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Fecha desde
            <input
              type="date"
              name="fechaDesde"
              value={filters.fechaDesde}
              onChange={handleChange}
              className="mt-1 border rounded px-2 py-2"
            />
          </label>

          <label className="flex flex-col text-sm font-medium text-gray-700">
            Fecha hasta
            <input
              type="date"
              name="fechaHasta"
              value={filters.fechaHasta}
              onChange={handleChange}
              className="mt-1 border rounded px-2 py-2"
            />
          </label>

          <label className="flex flex-col text-sm font-medium text-gray-700">
            Artículo
            <input
              type="text"
              name="articulo"
              value={filters.articulo}
              onChange={handleChange}
              placeholder="SILLA"
              className="mt-1 border rounded px-2 py-2"
            />
          </label>

          <label className="flex flex-col text-sm font-medium text-gray-700">
            Placa
            <input
              type="text"
              name="placa"
              value={filters.placa}
              onChange={handleChange}
              placeholder="200200112"
              className="mt-1 border rounded px-2 py-2"
            />
          </label>

          <label className="flex flex-col text-sm font-medium text-gray-700">
            Institución
            <input
              type="text"
              name="institucion"
              value={filters.institucion}
              onChange={handleChange}
              placeholder="EL DIAMANTE"
              className="mt-1 border rounded px-2 py-2"
            />
          </label>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={resetFilters}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-3 border-b">ID</th>
              <th className="p-3 border-b">Placa</th>
              <th className="p-3 border-b">Institución</th>
              <th className="p-3 border-b">Descripción</th>
              <th className="p-3 border-b">Cant.</th>
              <th className="p-3 border-b">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  No hay registros
                </td>
              </tr>
            ) : (
              data.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-3 border-b">{item.id}</td>
                  <td className="p-3 border-b">{item.placa || "N/A"}</td>
                  <td className="p-3 border-b">
                    {item.institucion || "Sin institución"}
                  </td>
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

      <div className="mt-4 flex flex-col gap-3 rounded-lg bg-white p-4 shadow sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          Mostrando {firstRecord}-{lastRecord}
          {totalCount === null ? " registros" : ` de ${totalCount} registros`}
        </p>
        <p className="text-sm font-semibold text-blue-700">
          Total de objetos con estos filtros:{" "}
          {totalQuantity === null
            ? "calculando..."
            : totalQuantity.toLocaleString("es-CO")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            Por página
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setCurrentPage(0);
              }}
              className="rounded border border-gray-300 px-2 py-2"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
            disabled={currentPage === 0}
            className="rounded bg-gray-200 px-3 py-2 text-sm text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="px-2 text-sm text-gray-600">
            {totalCount === null
              ? `Página ${currentPage + 1}`
              : `Página ${currentPage + 1} de ${Math.max(1, Math.ceil(totalCount / pageSize))}`}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => page + 1)}
            disabled={!hasNextPage}
            className="rounded bg-gray-200 px-3 py-2 text-sm text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
