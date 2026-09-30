import { Routes, Route, Link } from 'react-router-dom';
import { Home, Upload, Database } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Importar from './pages/Importar';
import Consultas from './pages/Consultas';

function App() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-white flex flex-col">
        <div className="p-4 text-xl font-bold border-b border-slate-700">
          Reintegros Inst.
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className="flex items-center space-x-3 p-3 rounded hover:bg-slate-700">
            <Home size={20} /> <span>Dashboard</span>
          </Link>
          <Link to="/importar" className="flex items-center space-x-3 p-3 rounded hover:bg-slate-700">
            <Upload size={20} /> <span>Importar Excel</span>
          </Link>
          <Link to="/consultas" className="flex items-center space-x-3 p-3 rounded hover:bg-slate-700">
            <Database size={20} /> <span>Consultas</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
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
