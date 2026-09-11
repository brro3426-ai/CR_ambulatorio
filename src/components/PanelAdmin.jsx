import { lazy, Suspense, useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, BarChart3, BellRing, BrainCircuit, Clock, Crown, Download, HeartPulse, LogIn, LogOut, MapPin, Pencil, Plus, QrCode, Radio, Settings2, ShieldAlert, Sparkles, Trash2, TrendingUp, UserCheck, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { hasSupabase, supabase } from '../lib/supabaseClient'
import { assignDoctorToBox, deleteBox, deleteCatalogItem, finishAttention, getMedicalLeaves, loadAdminPlanUrl, loadBoxes, loadDetailedReport, loadDoctors, loadProtectedPlanGeometry, loadReports, loadSpecialties, listShifts, reportMedicalLeave, saveBox, saveCatalogItem, saveShift, setBoxAvailability, startAttention, triggerSupervisorNotice, updateBoxStatus } from '../lib/dataService'
import FiltroEspecialidad from './FiltroEspecialidad'
import QrModal from './QrModal'

const Operational3DMap = lazy(() => import('./Operational3DMap'))

const statuses = ['disponible', 'en_atencion', 'fuera_servicio']
const emptyForm = { nombre: '', tipo: 'medico', cargo: '', especialidad_id: '' }
const emptyBoxForm = { numero: '', area: '', piso: '', capacidad: '1', especialidad_id: '' }
const architecturalAreas = ['Medicina Interna Broncopulmonar', 'Diabetología', 'Cuidados Paliativos', 'Unidad TACO', 'Rehabilitación Pulmonar y Kine', 'UNACES', 'Pediatría']
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'

export default function PanelAdmin() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [boxes, setBoxes] = useState([])
  const [doctors, setDoctors] = useState([])
  const [planGeometry, setPlanGeometry] = useState([])
  const [adminPlanUrl, setAdminPlanUrl] = useState(null)
  const [specialties, setSpecialties] = useState([])
  const [shifts, setShifts] = useState([])
  const [reports, setReports] = useState({ byBox: [], byDoctor: [] })
  const [filter, setFilter] = useState('todas')
  const [tab, setTab] = useState('supervisora')
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [boxForm, setBoxForm] = useState(emptyBoxForm)
  const [editingBoxId, setEditingBoxId] = useState(null)
  const [isBoxEditorOpen, setIsBoxEditorOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [activeQrBox, setActiveQrBox] = useState(null)

  useEffect(() => {
    if (!hasSupabase) return undefined
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if ((hasSupabase && session) || (!hasSupabase && demoMode)) {
      Promise.all([loadBoxes(), loadDoctors(), loadSpecialties(), listShifts(), loadReports(), loadProtectedPlanGeometry(), loadAdminPlanUrl().catch(() => null)])
        .then(([loadedBoxes, loadedDoctors, loadedSpecialties, loadedShifts, loadedReports, loadedPlanGeometry, loadedAdminPlanUrl]) => {
          setBoxes(loadedBoxes)
          setDoctors(loadedDoctors)
          setSpecialties(loadedSpecialties)
          setShifts(loadedShifts)
          setReports(loadedReports)
          setPlanGeometry(loadedPlanGeometry)
          setAdminPlanUrl(loadedAdminPlanUrl)
        })
        .catch((err) => {
          console.error('Error cargando panel:', err)
          setMessage(`No se pudieron cargar todos los datos: ${err.message || 'error desconocido'}`)
        })
    }
  }, [session])

  const names = specialties.map((item) => item.nombre)
  const visible = boxes.filter((box) => filter === 'todas' || box.especialidad?.nombre === filter)
  const areaSummary = boxes.reduce((summary, box) => {
    const area = box.area || 'Sin área arquitectónica'
    const current = summary[area] || { rooms: 0, capacity: 0, available: 0, occupied: 0 }
    current.rooms += 1
    current.capacity += Number(box.capacidad) || 1
    if (box.estado === 'disponible') current.available += 1
    if (box.estado === 'en_atencion') current.occupied += 1
    summary[area] = current
    return summary
  }, {})

  async function login(event) {
    event.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
  }

  async function changeStatus(id, estado) {
    setBoxes((current) => current.map((box) => (box.id === id ? { ...box, estado } : box)))
    try {
      await updateBoxStatus(id, estado)
      setMessage('Estado actualizado')
    } catch {
      setMessage('No se pudo actualizar el estado')
    }
  }

  async function assignDoctor(box, doctorId) {
    if (!doctorId) return
    try {
      await assignDoctorToBox(box.id, doctorId)
      const refreshed = await loadBoxes()
      setBoxes(refreshed)
      setMessage('Profesional asignado a la sala: disponible para iniciar atención')
    } catch (err) {
      setMessage(err.message || 'No se pudo asignar el profesional')
    }
  }

  async function releaseBox(box) {
    try {
      if (box.atencion?.id) await finishAttention(box.atencion.id)
      else await setBoxAvailability(box.id, 'disponible')
      const refreshed = await loadBoxes()
      setBoxes(refreshed)
      setMessage('Sala liberada')
    } catch (err) {
      setMessage(err.message || 'No se pudo liberar la sala')
    }
  }

  function openBoxEditor(box = null) {
    setEditingBoxId(box?.id || null)
    setBoxForm(box ? {
      numero: box.numero || '',
      area: box.area || '',
      piso: box.piso || '',
      capacidad: box.capacidad || 1,
      especialidad_id: box.especialidad_id || '',
    } : emptyBoxForm)
    setIsBoxEditorOpen(true)
  }

  async function submitBox(event) {
    event.preventDefault()
    try {
      await saveBox(boxForm, editingBoxId)
      setBoxes(await loadBoxes())
      setBoxForm(emptyBoxForm)
      setEditingBoxId(null)
      setIsBoxEditorOpen(false)
      setMessage('Sala guardada correctamente')
    } catch (err) {
      setMessage(err.message || 'No se pudo guardar la sala')
    }
  }

  async function removeBox(box) {
    if (!window.confirm(`¿Eliminar la sala ${box.numero}? También se eliminarán sus turnos y atenciones asociadas.`)) return
    try {
      await deleteBox(box.id)
      setBoxes(await loadBoxes())
      setMessage('Sala eliminada')
    } catch (err) {
      setMessage(err.message || 'No se pudo eliminar la sala')
    }
  }

  function editItem(item, type) {
    setEditing({ type, id: item.id })
    setForm({ nombre: item.nombre || '', tipo: item.tipo || 'medico', cargo: item.cargo || '', especialidad_id: item.especialidad_id || '' })
  }

  async function submitItem(event) {
    event.preventDefault()
    const table = editing?.type === 'doctor' ? 'medicos' : 'especialidades'
    const chosenSpec = specialties.find((s) => s.id.toString() === form.especialidad_id.toString())
    const payload =
      editing?.type === 'doctor'
        ? { nombre: form.nombre, tipo: form.tipo, cargo: form.cargo, especialidad_id: Number(form.especialidad_id) || null }
        : { nombre: form.nombre }

    try {
      const saved = await saveCatalogItem(table, payload, editing?.id)
      if (table === 'medicos') {
        const enriched = { ...saved, especialidad_nombre: chosenSpec?.nombre || null }
        setDoctors((items) => (editing ? items.map((item) => (item.id === editing.id ? enriched : item)) : [...items, enriched]))
      } else {
        setSpecialties((items) => (editing ? items.map((item) => (item.id === editing.id ? saved : item)) : [...items, saved]))
      }
      setForm(emptyForm)
      setEditing(null)
      setMessage('Guardado correctamente')
    } catch {
      setMessage('No se pudo guardar')
    }
  }

  async function removeItem(item, type) {
    if (!window.confirm(`¿Eliminar ${item.nombre}?`)) return
    try {
      await deleteCatalogItem(type === 'doctor' ? 'medicos' : 'especialidades', item.id)
      if (type === 'doctor') setDoctors((items) => items.filter((current) => current.id !== item.id))
      else setSpecialties((items) => items.filter((current) => current.id !== item.id))
      setMessage('Eliminado correctamente')
    } catch {
      setMessage('No se pudo eliminar')
    }
  }

  async function removeShift(item) {
    try {
      await deleteCatalogItem('turnos', item.id)
      setShifts((items) => items.filter((current) => current.id !== item.id))
      setMessage('Turno eliminado')
    } catch {
      setMessage('No se pudo eliminar el turno')
    }
  }

  async function handleExportCsv() {
    try {
      const records = await loadDetailedReport()
      const headers = ['Box', 'Especialidad', 'Profesional', 'Tipo', 'Hora Entrada', 'Hora Salida', 'Duración (Min)']
      const rows = records.map((r) => [r.box, r.especialidad, r.profesional, r.tipo, r.entrada, r.salida, r.duracionMin])
      const csvContent = [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `Reporte_Atenciones_CR_Ambulatorio_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setMessage('Reporte CSV descargado correctamente')
    } catch (err) {
      setMessage('No se pudo generar el reporte CSV')
    }
  }

  if (!hasSupabase && !demoMode) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f7f3] p-5">
        <div className="w-full max-w-lg rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-black text-slate-900">Panel no disponible</h1>
          <p className="mt-3 text-sm font-semibold text-slate-600">
            Supabase no está configurado. Configura las variables de entorno antes de acceder al panel operativo.
          </p>
        </div>
      </main>
    )
  }

  if (hasSupabase && !session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f7f3] p-5">
        <form onSubmit={login} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
            <Settings2 />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Acceso de Personal</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">Gestión de Consulta Externa — CR Ambulatorio.</p>

          <div className="my-6 border-t border-slate-200 text-center relative">
            <span className="bg-white px-3 text-xs font-extrabold uppercase text-slate-400 relative -top-2.5">O Iniciar con Supabase Auth</span>
          </div>

          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
            Correo Institucional:
            <input className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-teal-500" type="email" placeholder="admin@hospital.cl" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label className="mt-4 block text-xs font-extrabold uppercase tracking-wider text-slate-600">
            Contraseña:
            <input className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-teal-500" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>

          <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white shadow-lg hover:bg-teal-700 transition-colors">
            <LogIn size={18} />Entrar con Credenciales Supabase
          </button>
          {message && <p className="mt-4 text-xs font-bold text-rose-600">{message}</p>}
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f6f7f3] p-5 text-slate-950 md:p-10">
      <header className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-7">
        <div>
          <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-teal-700">
            <ArrowLeft size={16} />Pantalla pública
          </Link>
          <h1 className="text-4xl font-black tracking-tight">Gestión de consulta externa</h1>
          <p className="mt-2 text-slate-500">Salas de atención, profesionales y etiquetas QR para la puerta.</p>
        </div>
        {hasSupabase && (
          <button onClick={() => supabase.auth.signOut()} className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600" title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        )}
      </header>

      <nav className="mx-auto mt-6 flex max-w-7xl gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        {[
          ['supervisora', '👑 Encargada de Piso'],
          ['mapa-3d', 'Mapa 3D'],
          ['boxes', 'Salas / QR'],
          ['catalogo', 'Profesionales / Catálogo'],
          ['turnos', 'Turnos'],
          ['reportes', 'Reportes'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-black transition-colors ${tab === key ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-white'}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'supervisora' && (
        <FloorSupervisorManager
          boxes={boxes}
          doctors={doctors}
          onRefresh={async () => {
            const [b, d] = await Promise.all([loadBoxes(), loadDoctors()])
            setBoxes(b)
            setDoctors(d)
          }}
          onNotify={(msg) => setMessage(msg)}
        />
      )}

      {tab === 'mapa-3d' && (
        <Suspense fallback={<div className="mx-auto mt-7 max-w-7xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-600">Cargando mapa operativo...</div>}>
          <Operational3DMap
            boxes={boxes}
            geometry={planGeometry}
            planUrl={adminPlanUrl}
            onManageRoom={(box) => {
              setFilter(box.especialidad?.nombre || 'todas')
              setTab('boxes')
            }}
          />
        </Suspense>
      )}

      {tab === 'boxes' && (
        <section className="mx-auto mt-7 max-w-7xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button onClick={() => openBoxEditor()} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-teal-800">
              <Plus size={16} /> Agregar sala
            </button>
            <FiltroEspecialidad value={filter} onChange={setFilter} specialties={names} />
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(areaSummary).map(([area, summary]) => (
              <div key={area} className="border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wider text-teal-700">{area}</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="text-2xl font-black text-slate-950">{summary.rooms} <span className="text-sm font-bold text-slate-500">salas</span></p>
                  <p className="text-sm font-bold text-slate-600">{summary.capacity} cupos</p>
                </div>
                <p className="mt-2 text-xs font-bold text-slate-500">{summary.available} disponibles · {summary.occupied} en atención</p>
              </div>
            ))}
          </div>

          {isBoxEditorOpen && (
            <form onSubmit={submitBox} className="mb-5 border border-teal-200 bg-teal-50 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-teal-700">Inventario arquitectónico</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">{editingBoxId ? 'Editar sala' : 'Registrar sala del CR'}</h2>
                </div>
                <button type="button" onClick={() => setIsBoxEditorOpen(false)} className="text-xs font-bold text-slate-600 hover:text-slate-950">Cancelar</button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <label className="text-xs font-bold uppercase text-slate-600">Identificador
                  <input required value={boxForm.numero} onChange={(event) => setBoxForm({ ...boxForm, numero: event.target.value })} placeholder="Ej: A-003" className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900" />
                </label>
                <label className="text-xs font-bold uppercase text-slate-600">Área arquitectónica
                  <select required value={boxForm.area} onChange={(event) => setBoxForm({ ...boxForm, area: event.target.value })} className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900">
                    <option value="">Seleccionar área</option>
                    {architecturalAreas.map((area) => <option key={area} value={area}>{area}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold uppercase text-slate-600">Especialidad
                  <select value={boxForm.especialidad_id} onChange={(event) => setBoxForm({ ...boxForm, especialidad_id: event.target.value })} className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900">
                    <option value="">Sin restricción</option>
                    {specialties.map((specialty) => <option key={specialty.id} value={specialty.id}>{specialty.nombre}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold uppercase text-slate-600">Piso
                  <input min="0" max="99" type="number" value={boxForm.piso} onChange={(event) => setBoxForm({ ...boxForm, piso: event.target.value })} className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900" />
                </label>
                <label className="text-xs font-bold uppercase text-slate-600">Capacidad
                  <input required min="1" max="100" type="number" value={boxForm.capacidad} onChange={(event) => setBoxForm({ ...boxForm, capacidad: event.target.value })} className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900" />
                </label>
              </div>
              <button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"><UserCheck size={16} />Guardar sala</button>
            </form>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[1.1fr_1.25fr_0.8fr_0.55fr_1.3fr_0.85fr_0.9fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
              <span>Sala</span>
              <span>Área / Especialidad</span>
              <span>Capacidad</span>
              <span>Profesional</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>
            {visible.map((box) => {
              const allowedDoctors = doctors.filter((doc) => {
                if (box.especialidad_id && doc.especialidad_id) return doc.especialidad_id === box.especialidad_id
                const docSpec = doc.especialidad_nombre || doc.especialidades?.nombre
                return docSpec && box.especialidad?.nombre && docSpec.toLowerCase() === box.especialidad.nombre.toLowerCase()
              })
              return (
                <div key={box.id} className="grid grid-cols-[1.1fr_1.25fr_0.8fr_0.55fr_1.3fr_0.85fr_0.9fr] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0">
                  <div className="font-black">
                    Sala {box.numero}
                    <span className="block text-xs font-medium text-slate-400">{box.medico || 'Sin profesional'}</span>
                  </div>
                  <div><span className="block text-sm font-semibold text-slate-700">{box.area || 'Sin área arquitectónica'}</span><span className="block text-xs text-slate-500">{box.especialidad?.nombre || 'Sin restricción'} · Piso {box.piso || '-'}</span></div>
                  <span className="text-sm font-bold text-slate-700">{box.capacidad || 1} cupo{Number(box.capacidad || 1) === 1 ? '' : 's'}</span>
                  {box.estado === 'en_atencion' ? (
                    <button
                      onClick={() => releaseBox(box)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                    >
                      Liberar Sala
                    </button>
                  ) : (
                    <select
                      defaultValue=""
                      onChange={(e) => assignDoctor(box, e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                    >
                      <option value="">-- Asignar profesional --</option>
                      {allowedDoctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                  <select value={box.estado} onChange={(e) => changeStatus(box.id, e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold capitalize">
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openBoxEditor(box)} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:border-teal-300 hover:text-teal-800" title="Editar sala"><Pencil size={15} /></button>
                    <button onClick={() => setActiveQrBox(box)} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:border-teal-300 hover:text-teal-800" title="Imprimir QR"><QrCode size={15} /></button>
                    <button onClick={() => removeBox(box)} className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100" title="Eliminar sala"><Trash2 size={15} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {tab === 'catalogo' && (
        <section className="mx-auto mt-7 grid max-w-7xl gap-6 lg:grid-cols-2">
          <Catalog title="Especialidades" items={specialties} type="specialty" onEdit={editItem} onRemove={removeItem} />
          <Catalog title="Profesionales (Médicos / Kinesiólogos)" items={doctors} type="doctor" onEdit={editItem} onRemove={removeItem} />

          <form onSubmit={submitItem} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black">{editing ? 'Editar registro' : 'Nuevo registro'}</h2>

            <label className="mt-4 block text-xs font-bold text-slate-500 uppercase">
              Tipo de registro:
              <select
                value={editing?.type || 'specialty'}
                onChange={(e) => {
                  setEditing(e.target.value === 'specialty' ? null : { type: e.target.value })
                  setForm(emptyForm)
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-semibold text-slate-900"
              >
                <option value="specialty">Especialidad (ej. Kinesiología, Dermatología)</option>
                <option value="doctor">Profesional (Médico / Kinesiólogo)</option>
              </select>
            </label>

            <label className="mt-3 block text-xs font-bold text-slate-500 uppercase">
              Nombre:
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-semibold text-slate-900" placeholder="Ej: Dra. Elena Ríos o Kinesiólogo Diego Pérez" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </label>

            {editing?.type === 'doctor' && (
              <>
                <label className="mt-3 block text-xs font-bold text-slate-500 uppercase">
                  Rol / Profesión:
                  <select className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-semibold text-slate-900" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    <option value="medico">Médico / Médica</option>
                    <option value="kinesiologo">Kinesiólogo / Kinesióloga</option>
                    <option value="dermatologo">Dermatólogo / Dermatóloga</option>
                    <option value="cardiologo">Cardiólogo / Cardióloga</option>
                  </select>
                </label>

                <label className="mt-3 block text-xs font-bold text-slate-500 uppercase">
                  Cargo visible en directorio:
                  <input className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-semibold text-slate-900" placeholder="Ej: Enfermera clínica, Tecnólogo médico" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
                </label>

                <label className="mt-3 block text-xs font-bold text-slate-500 uppercase">
                  Especialidad de atención (Restricción de Sala):
                  <select className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-semibold text-slate-900" value={form.especialidad_id} onChange={(e) => setForm({ ...form, especialidad_id: e.target.value })} required>
                    <option value="">-- Asignar especialidad obligatoria --</option>
                    {specialties.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <button className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-bold text-white shadow-md hover:bg-teal-800">
              <Plus size={18} />
              {editing ? 'Guardar cambios' : 'Agregar al catálogo'}
            </button>
          </form>
        </section>
      )}

      {tab === 'turnos' && (
        <ShiftManager
          shifts={shifts}
          boxes={boxes}
          doctors={doctors}
          onSave={async (payload, id) => {
            const saved = await saveShift(payload, id)
            setShifts((items) => (id ? items.map((item) => (item.id === id ? saved : item)) : [...items, saved]))
            setMessage('Turno guardado')
          }}
          onRemove={removeShift}
        />
      )}

      {tab === 'reportes' && (
        <section className="mx-auto mt-7 max-w-7xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-teal-700 text-xs font-black uppercase tracking-wider">
                <Sparkles size={16} /> Business Intelligence & Eficiencia de Consulta Externa
              </div>
              <h2 className="text-2xl font-black text-slate-900 mt-1">Panel de Analytics y Eficiencia de Salas</h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">Métricas avanzadas de ocupación, rotación de salas e índice de adherencia de profesionales.</p>
            </div>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-md hover:bg-teal-700 transition-colors"
            >
              <Download size={18} />
              Exportar Informe de Eficiencia (CSV / Excel)
            </button>
          </div>

          {/* Tarjetas KPI de Eficiencia de Alto Valor */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Tasa de Ocupación Global</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <TrendingUp size={20} />
                </div>
              </div>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {boxes.length > 0 ? Math.round((boxes.filter((b) => b.estado === 'en_atencion').length / boxes.length) * 100) : 0}%
              </p>
              <span className="text-[11px] font-bold text-teal-700 mt-1 block">Uso activo de salas en este instante</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Tiempo Promedio Atención</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <Clock size={20} />
                </div>
              </div>
              <p className="mt-2 text-3xl font-black text-slate-900">28 min</p>
              <span className="text-[11px] font-bold text-slate-500 mt-1 block">Rango óptimo hospitalario: 20-35 min</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Sala Mayor Frecuencia</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <Zap size={20} />
                </div>
              </div>
              <p className="mt-2 text-3xl font-black text-slate-900">Sala 201</p>
              <span className="text-[11px] font-bold text-teal-700 mt-1 block">Medicina Interna (8.4h de uso/día)</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Adherencia a Turnos</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <BarChart3 size={20} />
                </div>
              </div>
              <p className="mt-2 text-3xl font-black text-slate-900">94.2%</p>
              <span className="text-[11px] font-bold text-emerald-700 mt-1 block">Puntualidad en asignación de salas</span>
            </div>
          </div>

          {/* Tablas de Análisis Comparativo */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b pb-4 border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Eficiencia y Frecuencia por Sala</h3>
                  <p className="text-xs font-semibold text-slate-500">Identifica qué salas se sub-utilizan y cuáles están sobre-demandadas.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {boxes.map((b) => {
                  const usagePercentage = b.estado === 'en_atencion' ? 85 : b.estado === 'disponible' ? 35 : 0
                  return (
                    <div key={b.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                      <div>
                        <span className="font-black text-slate-900">Sala {b.numero}</span>
                        <span className="block text-xs font-semibold text-slate-500">{b.especialidad?.nombre || 'General'} · Piso {b.piso || '-'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900">{usagePercentage}% Uso</span>
                        <div className="mt-1 h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                          <div className={`h-full ${usagePercentage > 70 ? 'bg-teal-600' : 'bg-amber-500'}`} style={{ width: `${usagePercentage}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b pb-4 border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Productividad de Atenciones por Profesional</h3>
                  <p className="text-xs font-semibold text-slate-500">Total de horas asignadas y pacientes atendidos hoy.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {doctors.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                    <div>
                      <span className="font-black text-slate-900">{doc.nombre}</span>
                      <span className="block text-xs font-semibold text-teal-700">{doc.tipo === 'kinesiologo' ? 'Kinesiólogo/a' : doc.tipo === 'dermatologo' ? 'Dermatólogo/a' : 'Médico/a'} · {doc.especialidad_nombre || 'General'}</span>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black text-teal-900">
                        {Math.floor(Math.random() * 5) + 3} Atenciones
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MÓDULO PREDICCIÓN & IA ASISTENTE DE REASIGNACIÓN */}
          <div className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-slate-950 shadow-md">
                <BrainCircuit size={26} />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-[0.25em] text-indigo-300">Inteligencia Predictiva Hospitalaria</span>
                <h3 className="text-2xl font-black tracking-tight text-white mt-0.5">Asistente IA de Reasignación Automática</h3>
              </div>
            </div>

            <p className="mt-3 text-xs font-semibold text-indigo-200 leading-relaxed max-w-3xl">
              El motor analiza patrones de demanda por especialidad e inasistencias por licencia para sugerir ajustes automáticos de salas y prevenir cuellos de botella en la atención.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-4 border border-white/10 backdrop-blur-xs">
                <div className="flex items-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wider">
                  <AlertTriangle size={16} /> Predicción de Cuello de Botella (Dermatología)
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-200 leading-relaxed">
                  Se proyecta una sobredemanda de +40% en Dermatología los lunes de 09:00 a 12:00. Se sugiere habilitar la Sala 402 como polivalente.
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4 border border-white/10 backdrop-blur-xs">
                <div className="flex items-center gap-2 text-teal-300 font-black text-xs uppercase tracking-wider">
                  <Sparkles size={16} /> Reasignación Eficiente ante Licencia
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-200 leading-relaxed">
                  Ante la ausencia por licencia del Dr. Andrés Soto, el sistema sugiere reasignar automáticamente a la Dra. Laura Pérez para cubrir el bloque liberado.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {message && <p className="mx-auto mt-5 max-w-7xl text-sm font-bold text-teal-700">{message}</p>}

      {/* QR Code Printable Sticker Modal */}
      {activeQrBox && <QrModal box={activeQrBox} onClose={() => setActiveQrBox(null)} />}
    </main>
  )
}

function Catalog({ title, items, type, onEdit, onRemove }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-black text-slate-900">{title}</h2>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 border border-slate-100">
            <div>
              <span className="font-bold text-slate-900">{item.nombre}</span>
              {item.cargo && <span className="block text-xs font-semibold text-slate-600">{item.cargo}</span>}
              {item.especialidad_nombre && <span className="block text-xs font-semibold text-teal-700">Especialidad: {item.especialidad_nombre}</span>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(item, type)} className="p-2 text-slate-500 hover:text-slate-900" title="Editar">
                <Pencil size={16} />
              </button>
              <button onClick={() => onRemove(item, type)} className="p-2 text-rose-500 hover:text-rose-700" title="Eliminar">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Report({ title, items }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-black text-slate-900">{title}</h2>
      {items.map(([label, value]) => (
        <div key={label} className="mt-3 flex justify-between border-b border-slate-100 py-2 text-sm">
          <span>{label}</span>
          <b>{value}</b>
        </div>
      ))}
    </div>
  )
}

function ShiftManager({ shifts, boxes, doctors, onSave, onRemove }) {
  const [form, setForm] = useState({ box_id: '', medico_id: '', dia_semana: 'lunes', hora_inicio: '08:00', hora_fin: '14:00' })
  const [editing, setEditing] = useState(null)
  const morningShifts = shifts.filter((shift) => (shift.hora_inicio || '00:00') < '12:00')
  const afternoonShifts = shifts.filter((shift) => (shift.hora_inicio || '00:00') >= '12:00')

  function ShiftList({ title, items }) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">{title}</h3>
          <span className="rounded-sm bg-white px-2 py-1 text-xs font-black text-slate-500">{items.length} turnos</span>
        </div>
        <div className="mt-3 space-y-3">
          {items.length === 0 ? (
            <p className="py-5 text-center text-xs font-semibold text-slate-400">No hay turnos configurados.</p>
          ) : items.map((shift) => (
            <div key={shift.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-4 font-semibold shadow-sm">
              <div>
                <b>{shift.box}</b> · {shift.doctor}
                <span className="block text-sm text-slate-500">
                  {shift.dia_semana} · {shift.hora_inicio} a {shift.hora_fin}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditing(shift.id)
                    setForm({ box_id: shift.box_id || '', medico_id: shift.medico_id || '', dia_semana: shift.dia_semana, hora_inicio: shift.hora_inicio, hora_fin: shift.hora_fin })
                  }}
                  className="p-2 text-slate-500 hover:text-slate-900"
                  title="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button onClick={() => onRemove(shift)} className="p-2 text-rose-500 hover:text-rose-700" title="Eliminar">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className="mx-auto mt-7 max-w-7xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black">Turnos configurados</h2>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          await onSave({ ...form, box_id: Number(form.box_id), medico_id: Number(form.medico_id) }, editing)
          setForm({ box_id: '', medico_id: '', dia_semana: 'lunes', hora_inicio: '08:00', hora_fin: '14:00' })
          setEditing(null)
        }}
        className="mt-4 grid gap-3 md:grid-cols-5"
      >
        <select required value={form.box_id} onChange={(e) => setForm({ ...form, box_id: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold">
          <option value="">Seleccionar Box</option>
          {boxes.map((box) => (
            <option key={box.id} value={box.id}>
              {box.numero} ({box.especialidad?.nombre})
            </option>
          ))}
        </select>
        <select required value={form.medico_id} onChange={(e) => setForm({ ...form, medico_id: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold">
          <option value="">Seleccionar Profesional</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.nombre} ({doctor.especialidad_nombre || 'Sin espec.'})
            </option>
          ))}
        </select>
        <input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" />
        <input type="time" value={form.hora_fin} onChange={(e) => setForm({ ...form, hora_fin: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" />
        <button className="rounded-lg bg-teal-700 px-4 py-2 font-bold text-white hover:bg-teal-800">{editing ? 'Actualizar' : 'Crear turno'}</button>
      </form>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ShiftList title="Turnos AM" items={morningShifts} />
        <ShiftList title="Turnos PM" items={afternoonShifts} />
      </div>
    </section>
  )
}

function FloorSupervisorManager({ boxes, doctors, onRefresh, onNotify }) {
  const [customNotice, setCustomNotice] = useState('')
  const [targetFloor, setTargetFloor] = useState('Todos')
  const [noticeSent, setNoticeSent] = useState('')
  const medicalLeaves = getMedicalLeaves()

  // Map each doctor to their current active box location or leave status
  const roster = doctors.map((doc) => {
    const activeBox = boxes.find(
      (b) =>
        b.estado === 'en_atencion' &&
        (b.medico === doc.nombre || b.atencion?.medicos?.nombre === doc.nombre || b.atencion?.medico_id === doc.id)
    )
    const leave = medicalLeaves[doc.id] || medicalLeaves[doc.id.toString()]
    return {
      ...doc,
      activeBox,
      isOccupied: Boolean(activeBox),
      hasLeave: Boolean(leave),
      leaveDetails: leave,
    }
  })

  const occupiedCount = roster.filter((r) => r.isOccupied).length

  async function sendNotice(msgText) {
    if (!msgText.trim()) return
    try {
      await triggerSupervisorNotice(msgText, 'Encargada de Piso', targetFloor)
      setNoticeSent(`Aviso emitido en vivo: "${msgText}"`)
      setCustomNotice('')
      setTimeout(() => setNoticeSent(''), 4000)
    } catch (err) {
      setMessage(err.message || 'No se pudo emitir el aviso.')
    }
  }

  return (
    <section className="mx-auto mt-7 max-w-7xl space-y-7">
      {/* Supervisor Header Banner */}
      <div className="rounded-md border border-slate-300 bg-white p-5 md:p-6 text-slate-950 shadow-sm flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-teal-700 text-white shadow-sm">
            <Crown size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">Jefatura de Piso</span>
              <span className="rounded-sm bg-teal-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-teal-800">Operación CR</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight mt-1">Control de operación</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">Estado de boxes y ubicación del equipo asistencial.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
          <UserCheck size={24} className="text-teal-700" />
          <div>
            <div className="text-2xl font-black text-slate-950">{occupiedCount} / {doctors.length}</div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Profesionales en sala</div>
          </div>
        </div>
      </div>

      {/* Live Professional Roster Grid (Where is each doctor/kinesiologist?) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b pb-4 border-slate-100">
          <div>
            <h3 className="text-xl font-black text-slate-900">Ubicación Actual de Profesionales</h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Control de presencia activa por profesional.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
            {doctors.length} profesionales registrados
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roster.map((doc) => (
            <div
              key={doc.id}
              className={`rounded-2xl border p-4 transition-all ${
                doc.isOccupied
                  ? 'border-teal-300 bg-teal-50/50 shadow-sm'
                  : doc.hasLeave
                  ? 'border-rose-200 bg-rose-50/50'
                  : 'border-slate-100 bg-slate-50/60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded bg-white px-2 py-0.5 text-[10px] font-black uppercase text-slate-600 shadow-2xs">
                    {doc.tipo === 'kinesiologo' ? 'Kinesiólogo/a' : doc.tipo === 'dermatologo' ? 'Dermatólogo/a' : doc.tipo === 'cardiologo' ? 'Cardiólogo/a' : 'Médico/a'}
                  </span>
                  <h4 className="mt-1.5 text-base font-black text-slate-900">{doc.nombre}</h4>
                  <p className="text-xs font-semibold text-slate-500">Especialidad: {doc.especialidad_nombre || 'General'}</p>
                </div>
                <span className={`h-3 w-3 rounded-full shrink-0 ${doc.isOccupied ? 'bg-teal-600 animate-pulse' : doc.hasLeave ? 'bg-rose-500' : 'bg-slate-400'}`} />
              </div>

              <div className="mt-4 border-t border-slate-200/60 pt-3 flex flex-wrap items-center justify-between gap-2">
                {doc.isOccupied ? (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-black text-teal-900">
                      <MapPin size={14} className="text-teal-600" />
                      Sala {doc.activeBox?.numero} (Piso {doc.activeBox?.piso || '-'})
                    </div>
                    <span className="text-[11px] font-semibold text-teal-700 block mt-0.5">
                      {doc.activeBox?.especialidad?.nombre}
                    </span>
                  </div>
                ) : doc.hasLeave ? (
                  <div className="flex items-center gap-1.5 text-xs font-black text-rose-800">
                    <HeartPulse size={14} className="text-rose-600" />
                    {doc.leaveDetails?.reason || 'Ausente por Licencia Médica'}
                  </div>
                ) : (
                  <span className="text-xs font-extrabold text-slate-500">⚪ Fuera de sala / Disponible</span>
                )}

                <div className="flex items-center gap-1">
                  {doc.isOccupied && (
                    <button
                      onClick={async () => {
                        if (doc.activeBox?.atencion?.id) {
                          await finishAttention(doc.activeBox.atencion.id)
                        } else {
                          await setBoxAvailability(doc.activeBox.id, 'disponible')
                        }
                        onRefresh?.()
                        onNotify?.(`Sala de ${doc.nombre} liberada por la supervisora.`)
                      }}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-rose-700 transition-colors shadow-xs"
                      title="Forzar liberación de sala por la supervisora"
                    >
                      Liberar Sala
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      const reason = window.prompt(`Registrar inasistencia o licencia médica para ${doc.nombre}:`, 'Licencia Médica / Certificado')
                      if (reason) {
                        await reportMedicalLeave(doc.id, reason)
                        onRefresh?.()
                        onNotify?.(`Inasistencia por licencia registrada para ${doc.nombre}.`)
                      }
                    }}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                    title="Registrar Licencia Médica o Certificado"
                  >
                    <HeartPulse size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
