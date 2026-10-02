import { useEffect, useState } from "react";
import axios from "axios";
import { ChevronDown, FileDown } from "lucide-react";
import { API_BASE } from "../api";

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

type OpcionesConsulta = {
  instituciones: string[];
  familias: string[];
};

type SelectorEditableProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

function SelectorEditable({
  id,
  label,
  placeholder,
  value,
  options,
  onChange,
}: SelectorEditableProps) {
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const coincidencias = options.filter((option) =>
    option
      .toLocaleLowerCase("es")
      .includes(value.trim().toLocaleLowerCase("es")),
  );

  const seleccionar = (option: string) => {
    onChange(option);
    setAbierto(false);
    setIndiceActivo(0);
  };

  const manejarTecla = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setAbierto(true);
      setIndiceActivo((indice) =>
        Math.min(indice + 1, coincidencias.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setAbierto(true);
      setIndiceActivo((indice) => Math.max(indice - 1, 0));
    } else if (
      event.key === "Enter" &&
      abierto &&
      coincidencias[indiceActivo]
    ) {
      event.preventDefault();
      seleccionar(coincidencias[indiceActivo]);
    } else if (event.key === "Escape") {
      setAbierto(false);
    }
  };

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setAbierto(false);
        }
      }}
    >
      <input
        id={id}
        type="text"
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={abierto}
        aria-controls={`${id}-opciones`}
        aria-activedescendant={
          abierto && coincidencias[indiceActivo]
            ? `${id}-opcion-${indiceActivo}`
            : undefined
        }
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setAbierto(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setIndiceActivo(0);
          setAbierto(true);
        }}
        onKeyDown={manejarTecla}
        className="w-full rounded border border-gray-300 py-2 pl-2 pr-9"
      />
      <button
        type="button"
        aria-label={`Mostrar opciones de ${label.toLowerCase()}`}
        aria-expanded={abierto}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setAbierto((open) => !open)}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-gray-600 hover:text-gray-900"
      >
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {abierto && (
        <div
          id={`${id}-opciones`}
          role="listbox"
          aria-label={`Opciones de ${label.toLowerCase()}`}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded border border-gray-300 bg-white py-1 shadow-lg"
        >
          {coincidencias.length ? (
            coincidencias.map((option, index) => (
              <div
                id={`${id}-opcion-${index}`}
                key={option}
                role="option"
                aria-selected={index === indiceActivo}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setIndiceActivo(index)}
                onClick={() => seleccionar(option)}
                className={`cursor-pointer px-3 py-2 text-sm ${index === indiceActivo ? "bg-blue-50 text-blue-800" : "text-gray-800 hover:bg-gray-50"}`}
              >
                {option}
              </div>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-gray-500">Sin coincidencias</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Consultas() {
  const [data, setData] = useState([]);
  const [opciones, setOpciones] = useState<OpcionesConsulta>({
    instituciones: [],
    familias: [],
  });
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [totalQuantity, setTotalQuantity] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [periodo, setPeriodo] = useState("todos");
  const [ordenarPor, setOrdenarPor] = useState("id_asc");
  const [exportando, setExportando] = useState(false);
  const [errorExportacion, setErrorExportacion] = useState("");
  const [filters, setFilters] = useState({
    fechaDesde: "",
    fechaHasta: "",
    articulo: "",
    placa: "",
    institucion: "",
  });

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/opciones-consulta`)
      .then((res) => setOpciones(res.data))
      .catch(console.error);
  }, []);

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
          ordenar_por: ordenarPor,
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
    ordenarPor,
    filters.fechaDesde,
    filters.fechaHasta,
    filters.articulo,
    filters.placa,
    filters.institucion,
  ]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
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
    setPeriodo("todos");
    setOrdenarPor("id_asc");
    setCurrentPage(0);
  };

  const handlePeriodoChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const valor = event.target.value;
    setPeriodo(valor);
    setCurrentPage(0);

    if (valor === "personalizado") return;
    if (valor === "todos") {
      setFilters((prev) => ({ ...prev, fechaDesde: "", fechaHasta: "" }));
      return;
    }

    const hoy = new Date();
    const fechaHasta = [
      hoy.getFullYear(),
      String(hoy.getMonth() + 1).padStart(2, "0"),
      String(hoy.getDate()).padStart(2, "0"),
    ].join("-");
    const fechaDesde =
      valor === "mes"
        ? `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`
        : `${hoy.getFullYear()}-01-01`;
    setFilters((prev) => ({ ...prev, fechaDesde, fechaHasta }));
  };

  const handleFechaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPeriodo("personalizado");
    setCurrentPage(0);
  };

  const exportarExcel = async () => {
    setExportando(true);
    setErrorExportacion("");
    try {
      const response = await axios.get(
        `${API_BASE}/api/reintegros/exportar-excel`,
        {
          params: {
            fecha_desde: filters.fechaDesde || undefined,
            fecha_hasta: filters.fechaHasta || undefined,
            articulo: filters.articulo || undefined,
            placa: filters.placa || undefined,
            institucion: filters.institucion || undefined,
            ordenar_por: ordenarPor,
          },
          responseType: "blob",
        },
      );
      const url = URL.createObjectURL(response.data);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = "informe_reintegros.xlsx";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setErrorExportacion("No se pudo generar el Excel. Intenta de nuevo.");
    } finally {
      setExportando(false);
    }
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-7">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Periodo
            <select
              value={periodo}
              onChange={handlePeriodoChange}
              className="mt-1 rounded border px-2 py-2"
            >
              <option value="todos">Todas las fechas</option>
              <option value="mes">Este mes</option>
              <option value="anio">Este año</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Fecha desde
            <input
              type="date"
              name="fechaDesde"
              value={filters.fechaDesde}
              onChange={handleFechaChange}
              className="mt-1 border rounded px-2 py-2"
            />
          </label>

          <label className="flex flex-col text-sm font-medium text-gray-700">
            Fecha hasta
            <input
              type="date"
              name="fechaHasta"
              value={filters.fechaHasta}
              onChange={handleFechaChange}
              className="mt-1 border rounded px-2 py-2"
            />
          </label>

          <label className="flex flex-col text-sm font-medium text-gray-700">
            Familia de artículo
            <SelectorEditable
              id="filtro-articulo"
              label="Familia de artículo"
              placeholder="Buscar familia"
              value={filters.articulo}
              options={opciones.familias}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, articulo: value }));
                setCurrentPage(0);
              }}
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
            <SelectorEditable
              id="filtro-institucion"
              label="Institución"
              placeholder="Buscar institución"
              value={filters.institucion}
              options={opciones.instituciones}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, institucion: value }));
                setCurrentPage(0);
              }}
            />
          </label>
        </div>

        <div className="mt-3 flex justify-end">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              Ordenar
              <select
                value={ordenarPor}
                onChange={(event) => {
                  setOrdenarPor(event.target.value);
                  setCurrentPage(0);
                }}
                className="rounded border px-2 py-2"
              >
                <option value="id_asc">Orden original</option>
                <option value="fecha_desc">Fecha: más reciente</option>
                <option value="fecha_asc">Fecha: más antigua</option>
                <option value="cantidad_desc">Cantidad: mayor a menor</option>
                <option value="cantidad_asc">Cantidad: menor a mayor</option>
                <option value="articulo_asc">Artículo: A-Z</option>
                <option value="institucion_asc">Institución: A-Z</option>
              </select>
            </label>
            <button
              type="button"
              onClick={exportarExcel}
              disabled={exportando}
              className="inline-flex items-center gap-2 rounded bg-green-700 px-3 py-2 text-sm text-white hover:bg-green-800 disabled:opacity-50"
            >
              <FileDown size={16} aria-hidden="true" />
              {exportando ? "Generando..." : "Exportar Excel"}
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded bg-gray-200 px-3 py-2 text-gray-800 hover:bg-gray-300"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
        {errorExportacion && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {errorExportacion}
          </p>
        )}
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
