import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

const PantallaPublica = lazy(() => import('./components/PantallaPublica'))
const PanelAdmin = lazy(() => import('./components/PanelAdmin'))
const ControlBox = lazy(() => import('./components/ControlBox'))
const VistaSupervisora = lazy(() => import('./components/VistaSupervisora'))
const RequireAuth = lazy(() => import('./components/RequireAuth'))

const authWrapper = (Component) => (
  <RequireAuth>
    <Component />
  </RequireAuth>
)

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 24, fontFamily: 'sans-serif' }}>Cargando...</div>}>
        <Routes>
          {/* Pantalla Pública / TV de disponibilidad (Acceso libre) */}
          <Route path="/" element={<PantallaPublica />} />

          {/* Portal del Funcionario desde el móvil (Acceso directo libre) */}
          <Route path="/funcionario" element={<ControlBox />} />
          <Route path="/box/:numero" element={<ControlBox />} />

          {/* Panel de Supervisora y Administración (Con login y autenticación) */}
          <Route path="/supervisora" element={authWrapper(VistaSupervisora)} />
          <Route path="/admin" element={<PanelAdmin />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
