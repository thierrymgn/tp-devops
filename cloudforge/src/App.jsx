import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/layout/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateVM from './pages/CreateVM.jsx';
import VMDetail from './pages/VMDetail.jsx';
import { api } from './api/client.js';

export default function App() {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    api.getNodes().then(setNodes).catch(console.error);
  }, []);

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <Header nodes={nodes} />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard nodes={nodes} />} />
            <Route path="/create" element={<CreateVM />} />
            <Route path="/vm/:id" element={<VMDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
