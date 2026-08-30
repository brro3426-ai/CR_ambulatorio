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
          <Route path="/" element={<PantallaPublica />} />
          <Route path="/supervisora" element={authWrapper(VistaSupervisora)} />
          <Route path="/box/:numero" element={authWrapper(ControlBox)} />
          <Route path="/funcionario" element={authWrapper(ControlBox)} />
          <Route path="/admin" element={<PanelAdmin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
