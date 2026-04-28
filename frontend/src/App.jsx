import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Results from './pages/Results';
import Contribute from './pages/Contribute';
import Admin from './pages/Admin';
import { useSocket } from './hooks/useSocket';

function AppRoutes() {
  useSocket(); // inicializar socket global una vez
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/lobby/:code" element={<Lobby />} />
      <Route path="/game/:code" element={<Game />} />
      <Route path="/results/:code" element={<Results />} />
      <Route path="/contribute" element={<Contribute />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
