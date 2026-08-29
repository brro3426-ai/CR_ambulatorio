import { useEffect, useState } from 'react'
import { ArrowLeft, BellRing, Crown, Download, LogIn, LogOut, MapPin, Pencil, Plus, QrCode, Radio, Settings2, ShieldAlert, Trash2, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { hasSupabase, supabase } from '../lib/supabaseClient'
import { deleteCatalogItem, finishAttention, loadBoxes, loadDetailedReport, loadDoctors, loadReports, loadSpecialties, listShifts, saveCatalogItem, saveShift, triggerSupervisorNotice, updateBoxStatus } from '../lib/dataService'
import FiltroEspecialidad from './FiltroEspecialidad'
import QrModal from './QrModal'

const statuses = ['disponible', 'en_atencion', 'fuera_servicio']
const emptyForm = { nombre: '', tipo: 'medico', especialidad_id: '' }
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'

export default function PanelAdmin() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [boxes, setBoxes] = useState([])
  const [doctors, setDoctors] = useState([])
  const [specialties, setSpecialties] = useState([])
  const [shifts, setShifts] = useState([])
  const [reports, setReports] = useState({ byBox: [], byDoctor: [] })
  const [filter, setFilter] = useState('todas')
  const [tab, setTab] = useState('supervisora')
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
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
      Promise.all([loadBoxes(), loadDoctors(), loadSpecialties(), listShifts(), loadReports()])
        .then(([loadedBoxes, loadedDoctors, loadedSpecialties, loadedShifts, loadedReports]) => {
          setBoxes(loadedBoxes)
          setDoctors(loadedDoctors)
          setSpecialties(loadedSpecialties)
          setShifts(loadedShifts)
          setReports(loadedReports)
        })
        .catch((err) => {
          console.error('Error cargando panel:', err)
          setMessage(`No se pudieron cargar todos los datos: ${err.message || 'error desconocido'}`)
        })
    }
  }, [session])

  const names = specialties.map((item) => item.nombre)
  const visible = boxes.filter((box) => filter === 'todas' || box.especialidad?.nombre === filter)

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

  function editItem(item, type) {
    setEditing({ type, id: item.id })
    setForm({ nombre: item.nombre || '', tipo: item.tipo || 'medico', especialidad_id: item.especialidad_id || '' })
  }

  async function submitItem(event) {
    event.preventDefault()
    const table = editing?.type === 'doctor' ? 'medicos' : 'especialidades'
    const chosenSpec = specialties.find((s) => s.id.toString() === form.especialidad_id.toString())
    const payload =
      editing?.type === 'doctor'
        ? { nombre: form.nombre, tipo: form.tipo, especialidad_id: Number(form.especialidad_id) || null }
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
          <p className="mt-2 text-slate-500">Boxes médicos, profesionales y etiquetas QR para la puerta.</p>
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
          ['boxes', 'Boxes / QR'],
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

      {tab === 'boxes' && (
        <section className="mx-auto mt-7 max-w-7xl">
          <div className="mb-4 flex justify-end">
            <FiltroEspecialidad value={filter} onChange={setFilter} specialties={names} />
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[1.2fr_1fr_0.7fr_1fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
              <span>Box</span>
              <span>Especialidad</span>
              <span>Piso</span>
              <span>Estado</span>
              <span>Etiqueta QR</span>
            </div>
            {visible.map((box) => (
              <div key={box.id} className="grid grid-cols-[1.2fr_1fr_0.7fr_1fr_0.8fr] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0">
                <div className="font-black">
                  {box.numero}
                  <span className="block text-xs font-medium text-slate-400">{box.medico || 'Sin profesional'}</span>
                </div>
                <span className="text-sm font-semibold text-slate-600">{box.especialidad?.nombre}</span>
                <span className="text-sm text-slate-500">{box.piso || '-'}</span>
                <select value={box.estado} onChange={(e) => changeStatus(box.id, e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold capitalize">
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setActiveQrBox(box)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300"
                >
                  <QrCode size={14} /> Imprimir QR
                </button>
              </div>
            ))}
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
                  Especialidad de atención (Restricción de Box):
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
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-900">Métricas y Reportes de Consulta Externa</h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">Exporta el registro de atenciones diarias para auditoría hospitalaria.</p>
            </div>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-md hover:bg-teal-700 transition-colors"
            >
              <Download size={18} />
              Exportar Atenciones del Día (CSV / Excel)
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Report title="Tiempo promedio por box (hoy)" items={reports.byBox.map((item) => [item.box, `${item.average} min`])} />
            <Report title="Atenciones por profesional (hoy)" items={reports.byDoctor.map((item) => [item.doctor, item.total])} />
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
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {shifts.map((shift) => (
          <div key={shift.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-4 font-semibold border border-slate-100">
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
    </section>
  )
}

function FloorSupervisorManager({ boxes, doctors, onRefresh, onNotify }) {
  const [customNotice, setCustomNotice] = useState('')
  const [targetFloor, setTargetFloor] = useState('Todos')
  const [noticeSent, setNoticeSent] = useState('')

  // Map each doctor to their current active box location
  const roster = doctors.map((doc) => {
    const activeBox = boxes.find(
      (b) =>
        b.estado === 'en_atencion' &&
        (b.medico === doc.nombre || b.atencion?.medicos?.nombre === doc.nombre || b.atencion?.medico_id === doc.id)
    )
    return {
      ...doc,
      activeBox,
      isOccupied: Boolean(activeBox),
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
      <div className="rounded-3xl border border-teal-200 bg-gradient-to-r from-teal-900 to-slate-900 p-6 md:p-8 text-white shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500 text-slate-950 shadow-lg">
            <Crown size={36} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-[0.25em] text-teal-300">Modulo de Control</span>
              <span className="rounded-full bg-teal-800 px-2.5 py-0.5 text-[10px] font-black uppercase text-teal-200">Supervisora de Piso</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight mt-1">Localización y Control de Personal en Tiempo Real</h2>
            <p className="text-xs font-semibold text-teal-200 mt-1">
              Monitoreo centralizado: Sabe exactamente en qué sala está cada médico o kinesiólogo y emite avisos a los equipos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-3 border border-white/10">
          <UserCheck size={28} className="text-teal-400" />
          <div>
            <div className="text-2xl font-black">{occupiedCount} / {doctors.length}</div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-teal-200">Profesionales en Sala</div>
          </div>
        </div>
      </div>

      {/* Broadcast Notices Control Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Radio size={22} className="text-teal-700 animate-pulse" />
          <h3 className="text-xl font-black text-slate-900">Centro de Notificaciones & Avisos Masivos a Pantallas</h3>
        </div>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Envía comunicados instantáneos con señal sonora y voz a todas las pantallas TV del edificio y celulares de los boxes.
        </p>

        {/* Quick notice buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ' Alerta: Encargada de Piso requiere asistencia',
            '📋 Recordatorio: Favor cerrar sesión al salir de sala',
            '🕒 Cambio de Turno Clínico en progreso',
            '☕ Inicio de Pausa de Almuerzo / Colación',
          ].map((preset) => (
            <button
              key={preset}
              onClick={() => sendNotice(preset)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-300 transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Custom notice form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendNotice(customNotice)
          }}
          className="mt-4 flex flex-wrap gap-3"
        >
          <input
            type="text"
            value={customNotice}
            onChange={(e) => setCustomNotice(e.target.value)}
            placeholder="Escribe un aviso personalizado para transmitir a todo el CR Ambulatorio..."
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-3 font-extrabold text-white shadow-md hover:bg-teal-800 transition-colors"
          >
            <BellRing size={18} /> Transmitir Aviso en Vivo
          </button>
        </form>

        {noticeSent && (
          <p className="mt-3 flex items-center gap-2 text-xs font-black text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
            ✓ {noticeSent}
          </p>
        )}
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
                  ? 'border-rose-200 bg-rose-50/50 shadow-sm'
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
                <span className={`h-3 w-3 rounded-full shrink-0 ${doc.isOccupied ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
              </div>

              <div className="mt-4 border-t border-slate-200/60 pt-3 flex items-center justify-between">
                {doc.isOccupied ? (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-black text-rose-900">
                      <MapPin size={14} className="text-rose-600" />
                      Box {doc.activeBox?.numero} (Piso {doc.activeBox?.piso || '-'})
                    </div>
                    <span className="text-[11px] font-semibold text-rose-700 block mt-0.5">
                      {doc.activeBox?.especialidad?.nombre}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-extrabold text-emerald-700">⚪ Fuera de sala / Disponible</span>
                )}

                {doc.isOccupied && (
                  <button
                    onClick={async () => {
                      if (doc.activeBox?.atencion?.id) {
                        await finishAttention(doc.activeBox.atencion.id)
                      } else {
                        await finishAttention(`demo-active-${doc.activeBox.id}`)
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
