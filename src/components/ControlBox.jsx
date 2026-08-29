import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronLeft, LogOut, RefreshCw, Stethoscope, UserCheck, UserX } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { finishAttention, loadBoxes, loadDoctors } from '../lib/dataService'
import { hasSupabase, supabase } from '../lib/supabaseClient'

export default function ControlBox() {
  const { numero } = useParams()
  const [boxes, setBoxes] = useState([])
  const [doctors, setDoctors] = useState([])
  const [selectedDoctorId, setSelectedDoctorId] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('cr-ambulatorio-doctor-id') || ''
    }
    return ''
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const refreshData = async () => {
    try {
      const [nextBoxes, nextDoctors] = await Promise.all([loadBoxes(), loadDoctors()])
      setBoxes(nextBoxes)
      setDoctors(nextDoctors)
    } catch {
      setError('No se pudo conectar con el sistema.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-sync polling every 3 seconds & Realtime
  useEffect(() => {
    refreshData()
    const timer = setInterval(refreshData, 3000)

    if (hasSupabase) {
      const channel = supabase
        .channel('control-box-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'boxes' }, refreshData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'atenciones' }, refreshData)
        .subscribe()
      return () => {
        clearInterval(timer)
        supabase.removeChannel(channel)
      }
    }

    const handleDemo = () => refreshData()
    window.addEventListener('demo-boxes-changed', handleDemo)
    window.addEventListener('storage', handleDemo)
    return () => {
      clearInterval(timer)
      window.removeEventListener('demo-boxes-changed', handleDemo)
      window.removeEventListener('storage', handleDemo)
    }
  }, [])

  function handleSelectDoctor(id) {
    setSelectedDoctorId(id)
    setMessage('')
    setError('')
    if (typeof window !== 'undefined') {
      if (id) {
        window.localStorage.setItem('cr-ambulatorio-doctor-id', id)
      } else {
        window.localStorage.removeItem('cr-ambulatorio-doctor-id')
      }
    }
  }

  const currentDoctor = useMemo(() => {
    if (!selectedDoctorId) return null
    return doctors.find((d) => d.id.toString() === selectedDoctorId.toString())
  }, [doctors, selectedDoctorId])

  // Active room assigned to this doctor
  const assignedBox = useMemo(() => {
    if (!currentDoctor) return null
    return boxes.find(
      (b) =>
        b.estado === 'en_atencion' &&
        (b.medico === currentDoctor.nombre ||
          b.atencion?.medicos?.nombre === currentDoctor.nombre ||
          b.atencion?.medico_id === currentDoctor.id ||
          b.atencion?.medico_id?.toString() === currentDoctor.id?.toString())
    )
  }, [boxes, currentDoctor])

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f7f3] text-slate-500">
        <div className="flex items-center gap-2 font-bold">
          <RefreshCw className="animate-spin" /> Cargando portal móvil del profesional...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f6f7f3] p-5 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-lg flex-col justify-center">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:underline">
          <ChevronLeft size={18} /> Ver TV Pública de Disponibilidad
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">Acceso Móvil Personal</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Portal del Profesional</h1>
              <p className="mt-1 text-xs font-semibold text-slate-500">Consulta de Asignación de Sala por la Encargada de Piso</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <Stethoscope size={24} />
            </div>
          </div>

          {/* Selector de Nombre del Profesional */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
              Selecciona tu Nombre:
              <select
                value={selectedDoctorId}
                onChange={(e) => handleSelectDoctor(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-bold text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">-- Seleccionar Profesional (Médico / Kine) --</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.nombre} ({doc.especialidad_nombre || 'General'})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Asignación en tiempo real */}
          {currentDoctor ? (
            <div className="mt-6">
              {assignedBox ? (
                /* TIENE SALA ASIGNADA */
                <div className="rounded-2xl border-2 border-teal-600 bg-teal-50 p-6 text-slate-900 shadow-md animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-3 py-1 text-xs font-black text-white uppercase">
                      <UserCheck size={14} /> Sala Asignada Activa
                    </span>
                    <span className="text-xs font-extrabold text-teal-900">Piso {assignedBox.piso || '-'}</span>
                  </div>

                  <div className="mt-4">
                    <span className="text-xs font-extrabold uppercase text-teal-700 tracking-wider">Ubicación asignada:</span>
                    <h2 className="text-5xl font-black tracking-tight text-teal-950 mt-1">
                      BOX {assignedBox.numero}
                    </h2>
                    <p className="text-sm font-black text-teal-800 mt-1">
                      {assignedBox.especialidad?.nombre || 'Consulta Externa'}
                    </p>
                  </div>

                  <div className="mt-4 rounded-xl bg-white p-3.5 border border-teal-200 text-xs font-bold text-slate-700 leading-relaxed shadow-2xs">
                    📍 La supervisora te ha asignado la sala <strong>Box {assignedBox.numero}</strong>. Los pacientes y la pantalla del pasillo ven tu ubicación en tiempo real.
                  </div>

                  <button
                    onClick={async () => {
                      try {
                        const attentionId = assignedBox.atencion?.id || `demo-active-${assignedBox.id}`
                        await finishAttention(attentionId)
                        setMessage(`Has liberado la sala Box ${assignedBox.numero}.`)
                        await refreshData()
                      } catch {
                        setError('No se pudo liberar la sala.')
                      }
                    }}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-4 text-sm font-black text-white shadow-lg hover:bg-rose-700 transition-colors"
                  >
                    <LogOut size={18} /> Liberar Sala / Terminar Turno en Box {assignedBox.numero}
                  </button>
                </div>
              ) : (
                /* AÚN NO TIENE SALA ASIGNADA */
                <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/80 p-6 text-amber-950 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900 font-bold">
                      <UserX size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-amber-800">Estado de Asignación</span>
                      <h3 className="text-lg font-black text-amber-950">Aún no tienes sala asignada</h3>
                    </div>
                  </div>

                  <p className="mt-3 text-xs font-semibold text-amber-900 leading-relaxed">
                    Hola <strong>{currentDoctor.nombre}</strong>. La Encargada de Piso aún no te ha asignado un Box. Esta pantalla cambiará automáticamente apenas la supervisora te asigne una sala.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-slate-100 p-6 text-center text-slate-500 font-bold text-xs">
              👈 Selecciona tu nombre arriba para consultar qué sala tienes asignada.
            </div>
          )}

          {message && (
            <p className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 animate-in fade-in border border-emerald-200">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              {message}
            </p>
          )}

          {error && (
            <p className="mt-5 flex items-center gap-2 rounded-xl bg-rose-50 p-3.5 text-xs font-bold text-rose-800 animate-in fade-in border border-rose-200">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              {error}
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
