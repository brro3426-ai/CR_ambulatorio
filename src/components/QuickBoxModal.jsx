import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, DoorOpen, LogIn, LogOut, Megaphone, ShieldAlert, Stethoscope, UserRound, X } from 'lucide-react'
import { finishAttention, loadDoctors, startAttention, triggerPatientCall } from '../lib/dataService'

function elapsedTime(timestamp) {
  if (!timestamp) return 'hace un momento'
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000))
  return minutes < 1 ? 'hace un momento' : `hace ${minutes} min`
}

export default function QuickBoxModal({ box, onClose, onRefresh }) {
  const [doctors, setDoctors] = useState([])
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [patientTicket, setPatientTicket] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadDoctors().then(setDoctors).catch(() => setError('No se pudieron cargar los profesionales.'))
  }, [])

  // Strict specialty matching rule
  const allowedDoctors = useMemo(() => {
    if (!box) return []
    return doctors.filter((doc) => {
      if (box.especialidad_id && doc.especialidad_id) {
        return doc.especialidad_id === box.especialidad_id
      }
      if (box.especialidad?.nombre && (doc.especialidad_nombre || doc.especialidades?.nombre)) {
        const docSpec = doc.especialidad_nombre || doc.especialidades?.nombre
        return docSpec.toLowerCase() === box.especialidad.nombre.toLowerCase()
      }
      return false
    })
  }, [doctors, box])

  if (!box) return null

  const isOccupied = box.estado === 'en_atencion'
  const isOutOfService = box.estado === 'fuera_servicio'
  const activeAttention = box.atencion

  async function handleCallPatient() {
    try {
      await triggerPatientCall(box.numero, box.especialidad?.nombre || '', patientTicket)
      setMessage(`Anuncio de voz emitido a Pantalla TV para Box ${box.numero}${patientTicket ? ` (${patientTicket})` : ''}`)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'No se pudo emitir el llamado.')
    }
  }

  async function handleStart() {
    setError('')
    setMessage('')
    if (!selectedDoctorId) {
      setError('Por favor selecciona un profesional.')
      return
    }
    const chosenDoctor = doctors.find((d) => d.id.toString() === selectedDoctorId.toString())
    setSubmitting(true)
    try {
      await startAttention(box.id, Number(selectedDoctorId), chosenDoctor?.nombre)
      setMessage(`Registro de ocupación iniciado con ${chosenDoctor?.nombre} en el Box ${box.numero}`)
      setTimeout(() => {
        onRefresh?.()
        onClose?.()
      }, 1200)
    } catch (err) {
      setError(err.message || 'No se pudo iniciar el registro.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFinish() {
    setError('')
    setMessage('')
    const attentionId = activeAttention?.id || box.atencion?.id
    setSubmitting(true)
    try {
      if (attentionId) {
        await finishAttention(attentionId)
      } else {
        // Fallback for demo boxes without active attention object
        await finishAttention(`demo-active-${box.id}`)
      }
      setMessage(`Sesión en Box ${box.numero} finalizada. La sala ahora está disponible.`)
      setTimeout(() => {
        onRefresh?.()
        onClose?.()
      }, 1200)
    } catch (err) {
      setError(err.message || 'No se pudo finalizar la atención.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
          title="Cerrar"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 pr-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <Stethoscope size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">Gestión Inmediata</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold text-slate-600">Piso {box.piso || '-'}</span>
            </div>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Box {box.numero}</h2>
            <p className="text-sm font-semibold text-slate-500">{box.especialidad?.nombre || 'Consulta Externa'}</p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">Estado de ocupación:</span>
          {isOccupied ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-black uppercase text-rose-900">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              Sala Ocupada ({elapsedTime(box.horaEntrada || activeAttention?.hora_entrada)})
            </span>
          ) : isOutOfService ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1.5 text-xs font-black uppercase text-slate-700">
              Fuera de servicio
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black uppercase text-emerald-900">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Disponible / Libre
            </span>
          )}
        </div>

        {/* Actions based on status */}
        <div className="mt-6">
          {isOccupied ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5">
              <p className="text-xs font-black uppercase tracking-wider text-rose-700">Profesional presente en sala</p>
              <p className="mt-2 flex items-center gap-2 text-xl font-black text-rose-950">
                <UserRound size={22} className="text-rose-600" />
                {box.medico || activeAttention?.medicos?.nombre || 'Profesional asignado'}
              </p>
              <p className="mt-1 text-xs font-semibold text-rose-700">
                Ocupado desde: {elapsedTime(box.horaEntrada || activeAttention?.hora_entrada)}
              </p>

              <button
                onClick={handleFinish}
                disabled={submitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-4 text-base font-black text-white shadow-lg shadow-rose-600/30 transition-all hover:bg-rose-700 active:scale-[0.98] disabled:opacity-50"
              >
                <LogOut size={20} />
                {submitting ? 'Liberando sala...' : 'Registrar Salida de Sala / Liberar Box'}
              </button>
            </div>
          ) : isOutOfService ? (
            <div className="rounded-2xl bg-slate-100 p-5 text-center">
              <AlertTriangle className="mx-auto text-amber-600" size={32} />
              <p className="mt-2 font-bold text-slate-700">Esta sala está marcada como fuera de servicio.</p>
              <p className="mt-1 text-xs text-slate-500">Puedes cambiar su estado en el panel de administración.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Specialty Restriction Banner */}
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-xs font-bold leading-relaxed">
                  <span className="font-extrabold uppercase">Asignación de sala:</span> Box {box.numero} asignado a <strong className="underline">{box.especialidad?.nombre}</strong>. Solo se permite ingreso de profesionales habilitados.
                </p>
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Seleccionar profesional que ingresa ({box.especialidad?.nombre}):
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-semibold text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">-- Elige profesional de {box.especialidad?.nombre} --</option>
                  {allowedDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.nombre} ({doc.tipo === 'kinesiologo' ? 'Kinesiólogo/a' : doc.tipo === 'dermatologo' ? 'Dermatólogo/a' : doc.tipo === 'cardiologo' ? 'Cardiólogo/a' : 'Médico/a'})
                    </option>
                  ))}
                </select>
                {allowedDoctors.length === 0 && (
                  <p className="mt-2 text-xs font-bold text-rose-600">
                    No hay profesionales registrados para {box.especialidad?.nombre}. Puedes agregar uno en el Panel de Gestión.
                  </p>
                )}
              </div>

              {/* Eptura Engage Instant Booking Duration Selector */}
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Tiempo estimado de ocupación de sala:
                </label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`rounded-xl border py-2.5 text-xs font-black transition-all ${
                        durationMinutes === mins
                          ? 'border-teal-600 bg-teal-700 text-white shadow-md'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-right text-[11px] font-bold text-slate-500">
                  Liberación estimada:{' '}
                  <strong className="text-teal-700">
                    {new Date(Date.now() + durationMinutes * 60000).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  </strong>
                </p>
              </div>

              <button
                onClick={handleStart}
                disabled={submitting || allowedDoctors.length === 0}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-4 text-base font-black text-white shadow-lg shadow-teal-700/30 transition-all hover:bg-teal-800 active:scale-[0.98] disabled:opacity-50"
              >
                <LogIn size={20} />
                {submitting ? 'Registrando ingreso...' : 'Registrar Ingreso de Profesional'}
              </button>
            </div>
          )}
        </div>

        {/* Feedback messages */}
        {message && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 animate-in fade-in">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800 animate-in fade-in">
            <AlertTriangle size={18} className="shrink-0 text-rose-600" />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
