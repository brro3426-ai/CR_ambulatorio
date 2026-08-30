import { useEffect, useState } from 'react'
import { ArrowLeft, BellRing, Building2, Crown, DoorOpen, HeartPulse, MapPin, Radio, ShieldCheck, Stethoscope, UserCheck, UserX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { finishAttention, getMedicalLeaves, loadBoxes, loadDoctors, reportMedicalLeave, startAttention, triggerSupervisorNotice } from '../lib/dataService'
import { hasSupabase, supabase } from '../lib/supabaseClient'

export default function VistaSupervisora() {
  const [boxes, setBoxes] = useState([])
  const [doctors, setDoctors] = useState([])
  const [medicalLeaves, setMedicalLeaves] = useState(() => getMedicalLeaves())
  const [loading, setLoading] = useState(true)
  const [customNotice, setCustomNotice] = useState('')
  const [noticeSent, setNoticeSent] = useState('')

  const refreshData = () => {
    Promise.all([loadBoxes(), loadDoctors()])
      .then(([loadedBoxes, loadedDoctors]) => {
        setBoxes(loadedBoxes)
        setDoctors(loadedDoctors)
        setMedicalLeaves(getMedicalLeaves())
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refreshData()
    const timer = setInterval(refreshData, 2500)

    if (!hasSupabase) {
      const handleDemo = () => refreshData()
      window.addEventListener('demo-boxes-changed', handleDemo)
      window.addEventListener('storage', handleDemo)
      return () => {
        clearInterval(timer)
        window.removeEventListener('demo-boxes-changed', handleDemo)
        window.removeEventListener('storage', handleDemo)
      }
    }

    const channel = supabase
      .channel('supervisor-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boxes' }, refreshData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atenciones' }, refreshData)
      .subscribe()

    return () => {
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [])

  // Map doctors to their active location or leave status
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
  const availableBoxesCount = boxes.filter((b) => b.estado === 'disponible').length

  async function sendNotice(msgText) {
    if (!msgText.trim()) return
    try {
      await triggerSupervisorNotice(msgText, 'Encargada de Piso', 'Todos los sectores')
      setNoticeSent(`Aviso emitido a pantallas y móviles: "${msgText}"`)
      setCustomNotice('')
      setTimeout(() => setNoticeSent(''), 4000)
    } catch (err) {
      setNoticeSent(err.message || 'No se pudo emitir el aviso.')
    }
  }

  const [assigningDoc, setAssigningDoc] = useState(null)
  const [selectedBoxId, setSelectedBoxId] = useState('')

  async function handleAssignDoctor(event) {
    event.preventDefault()
    if (!assigningDoc || !selectedBoxId) return
    const targetBox = boxes.find((b) => b.id.toString() === selectedBoxId.toString())
    if (!targetBox) return
    try {
      await startAttention(targetBox.id, assigningDoc.id, assigningDoc.nombre)
      await triggerSupervisorNotice(`Profesional ${assigningDoc.nombre} asignado/a a Box ${targetBox.numero}`, 'Encargada de Piso')
      setNoticeSent(`Profesional ${assigningDoc.nombre} asignado/a exitosamente a Box ${targetBox.numero}`)
      setAssigningDoc(null)
      setSelectedBoxId('')
      refreshData()
      setTimeout(() => setNoticeSent(''), 4000)
    } catch (err) {
      alert(err.message || 'No se pudo asignar el profesional.')
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f3] p-5 text-slate-950 md:p-10">
      {/* Header */}
      <header className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-teal-700">
            <Crown size={16} /> Estación de Control Directo
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-5xl">Tablero de Encargada de Piso</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Supervisión exclusiva de ubicación de personal, estado de salas y avisos masivos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-100">
            <ArrowLeft size={14} className="inline mr-1" /> Ver TV Pública
          </Link>
          <Link to="/admin" className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white hover:bg-teal-700">
            Configuración / Catálogo Admin
          </Link>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="mx-auto mt-6 grid max-w-7xl gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">Personal en Sala</span>
            <p className="text-3xl font-black text-slate-900 mt-1">{occupiedCount} / {doctors.length}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <UserCheck size={24} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">Salas Disponibles</span>
            <p className="text-3xl font-black text-slate-900 mt-1">{availableBoxesCount} de {boxes.length}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <DoorOpen size={24} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">Estado de Red</span>
            <p className="text-base font-black text-teal-700 mt-1 flex items-center gap-1.5">
              <ShieldCheck size={18} /> {hasSupabase ? 'Supabase Realtime' : 'Modo Simulación Activo'}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <Building2 size={24} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mx-auto mt-10 max-w-7xl text-center font-bold text-slate-500">Cargando ubicación de personal...</div>
      ) : (
        <section className="mx-auto mt-8 max-w-7xl space-y-8">
          {/* Broadcast Notices Control Panel */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
                <Radio size={20} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Emisión de Comunicados Masivos en Vivo</h2>
                <p className="text-xs font-semibold text-slate-500">Envía alertas visuales y de voz directamente a las pantallas TV del edificio y celulares.</p>
              </div>
            </div>

            {/* Quick notice buttons */}
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                ' Alerta: Encargada de Piso requiere asistencia en pasillo',
                '📋 Recordatorio: Favor registrar salida al terminar la consulta',
                '🕒 Cambio de Turno Clínico en progreso',
                '☕ Inicio de Pausa de Almuerzo / Colación',
              ].map((preset) => (
                <button
                  key={preset}
                  onClick={() => sendNotice(preset)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-extrabold text-slate-800 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-300 transition-all active:scale-95"
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
                placeholder="Escribe un comunicado para transmitir a todas las pantallas de los pisos..."
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
              <p className="mt-3 flex items-center gap-2 text-xs font-black text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200 animate-in fade-in">
                ✓ {noticeSent}
              </p>
            )}
          </div>

          {/* Professional Roster & Map Location */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900">Ubicación Actual del Personal por Sala</h2>
                <p className="text-xs font-semibold text-slate-500">Mapeo de médicos, kinesiólogos y especialistas presentes.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3.5 py-1 text-xs font-black text-slate-700">
                {roster.length} Profesionales registrados
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {roster.map((doc) => (
                <div
                  key={doc.id}
                  className={`relative overflow-hidden rounded-2xl border-2 p-5 transition-all ${
                    doc.isOccupied
                      ? 'border-teal-400 bg-teal-50/50 shadow-sm'
                      : doc.hasLeave
                      ? 'border-rose-200 bg-rose-50/50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className={`absolute left-0 top-0 h-full w-1.5 ${doc.isOccupied ? 'bg-teal-600' : doc.hasLeave ? 'bg-rose-500' : 'bg-slate-300'}`} />

                  <div className="pl-2">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-700">
                        {doc.tipo === 'kinesiologo' ? 'Kinesiólogo/a' : doc.tipo === 'dermatologo' ? 'Dermatólogo/a' : doc.tipo === 'cardiologo' ? 'Cardiólogo/a' : 'Médico/a'}
                      </span>
                      <span className={`flex items-center gap-1 text-[11px] font-extrabold ${doc.isOccupied ? 'text-teal-700' : doc.hasLeave ? 'text-rose-700' : 'text-slate-400'}`}>
                        <span className={`h-2 w-2 rounded-full ${doc.isOccupied ? 'bg-teal-600' : doc.hasLeave ? 'bg-rose-500' : 'bg-slate-300'}`} />
                        {doc.isOccupied ? 'EN SALA' : doc.hasLeave ? 'LICENCIA' : 'DISPONIBLE'}
                      </span>
                    </div>

                    <h3 className="mt-2 text-lg font-black text-slate-900">{doc.nombre}</h3>
                    <p className="text-xs font-bold text-slate-500">Especialidad: {doc.especialidad_nombre || 'General'}</p>

                    <div className="mt-4 border-t border-current/10 pt-3 flex flex-wrap items-center justify-between gap-2">
                      {doc.isOccupied ? (
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                            <MapPin size={15} className="text-teal-600" />
                            UBICADO EN SALA {doc.activeBox?.numero}
                          </div>
                          <span className="text-[11px] font-bold text-teal-700 block mt-0.5">
                            Piso {doc.activeBox?.piso || '-'} · {doc.activeBox?.especialidad?.nombre}
                          </span>
                        </div>
                      ) : doc.hasLeave ? (
                        <div className="flex items-center gap-1.5 text-xs font-black text-rose-800">
                          <HeartPulse size={15} className="text-rose-600" />
                          {doc.leaveDetails?.reason || 'Ausente por Licencia Médica'}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <UserX size={15} className="text-slate-400" />
                          Sin sala ocupada
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        {doc.isOccupied ? (
                          <button
                            onClick={async () => {
                              const attentionId = doc.activeBox.atencion?.id || `demo-active-${doc.activeBox.id}`
                              await finishAttention(attentionId)
                              await triggerSupervisorNotice(`Sala ${doc.activeBox.numero} liberada por la encargada de piso`, 'Encargada de Piso')
                              refreshData()
                            }}
                            className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-black text-white hover:bg-rose-600 transition-colors shadow-sm"
                            title="Liberar sala por la supervisora"
                          >
                            Liberar Sala
                          </button>
                        ) : (
                          <button
                            onClick={() => setAssigningDoc(doc)}
                            className="rounded-xl bg-teal-700 px-3 py-1.5 text-xs font-black text-white hover:bg-teal-800 transition-colors shadow-sm"
                          >
                            + Asignar a Sala
                          </button>
                        )}

                        <button
                          onClick={async () => {
                            const reason = window.prompt(`Registrar inasistencia o licencia médica para ${doc.nombre}:`, 'Licencia Médica / Certificado')
                            if (reason) {
                              await reportMedicalLeave(doc.id, reason)
                              refreshData()
                            }
                          }}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                          title="Registrar Licencia Médica o Certificado"
                        >
                          <HeartPulse size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Supervisor Assign Modal */}
      {assigningDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleAssignDoctor}
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8"
          >
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-teal-700">Asignación por Supervisora</span>
                <h3 className="text-2xl font-black text-slate-900">{assigningDoc.nombre}</h3>
                <p className="text-xs font-bold text-slate-500">Especialidad: {assigningDoc.especialidad_nombre || 'General'}</p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningDoc(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Seleccionar Box Habilitado ({assigningDoc.especialidad_nombre}):
                <select
                  required
                  value={selectedBoxId}
                  onChange={(e) => setSelectedBoxId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-teal-500"
                >
                  <option value="">-- Elige Box disponible --</option>
                  {boxes
                    .filter((b) => {
                      if (b.estado === 'fuera_servicio') return false
                      if (b.especialidad_id && assigningDoc.especialidad_id) {
                        return b.especialidad_id === assigningDoc.especialidad_id
                      }
                      if (b.especialidad?.nombre && assigningDoc.especialidad_nombre) {
                        return b.especialidad.nombre.toLowerCase() === assigningDoc.especialidad_nombre.toLowerCase()
                      }
                      return true
                    })
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        Box {b.numero} (Piso {b.piso || '-'}) {b.estado === 'en_atencion' ? '· (Ocupado actualmente)' : '· Disponible'}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setAssigningDoc(null)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-teal-700 py-3 text-sm font-black text-white hover:bg-teal-800 shadow-md"
              >
                Asignar Sala Ahora
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}
