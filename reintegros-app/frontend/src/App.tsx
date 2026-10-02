import { useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { Home, Upload, Database, Menu, X } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Importar from "./pages/Importar";
import Consultas from "./pages/Consultas";

function App() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gray-100 md:h-screen">
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 bg-slate-800 px-4 text-white shadow md:hidden">
        <button
          type="button"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
          aria-controls="navegacion-principal"
          className="flex h-10 w-10 items-center justify-center rounded hover:bg-slate-700"
        >
          {menuAbierto ? <X size={22} /> : <Menu size={22} />}
        </button>
        <span className="font-bold">Reintegros Inst.</span>
      </header>

      {menuAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuAbierto(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        id="navegacion-principal"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-slate-800 text-white transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${menuAbierto ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="border-b border-slate-700 p-4 text-xl font-bold">
          Reintegros Inst.
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link
            to="/"
            onClick={() => setMenuAbierto(false)}
            className="flex items-center space-x-3 p-3 rounded hover:bg-slate-700"
          >
            <Home size={20} /> <span>Dashboard</span>
          </Link>
          <Link
            to="/importar"
            onClick={() => setMenuAbierto(false)}
            className="flex items-center space-x-3 p-3 rounded hover:bg-slate-700"
          >
            <Upload size={20} /> <span>Importar Excel</span>
          </Link>
          <Link
            to="/consultas"
            onClick={() => setMenuAbierto(false)}
            className="flex items-center space-x-3 p-3 rounded hover:bg-slate-700"
          >
            <Database size={20} /> <span>Consultas</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-6 pt-20 md:p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/importar" element={<Importar />} />
          <Route path="/consultas" element={<Consultas />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
