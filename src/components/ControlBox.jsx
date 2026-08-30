import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, BellRing, Calendar, CalendarClock, Check, CheckCircle2, ChevronLeft, Clock, FileText, HeartPulse, Lock, LogOut, MapPin, Megaphone, PauseCircle, PlayCircle, Plus, RefreshCw, Search, ShieldAlert, Sparkles, Stethoscope, Trash2, UserCheck, Users, UserX, Volume2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { finishAttention, getDoctorAgenda, getMedicalLeaves, loadBoxes, loadDoctors, reportMedicalLeave, saveDoctorAgenda, setBoxAvailability, triggerPatientCall, triggerSupervisorNotice } from '../lib/dataService'
import { hasSupabase, supabase } from '../lib/supabaseClient'

export default function ControlBox() {
  const { numero } = useParams()
  const [boxes, setBoxes] = useState([])
  const [doctors, setDoctors] = useState([])
  const [medicalLeaves, setMedicalLeaves] = useState(() => getMedicalLeaves())
  const [selectedDoctorId, setSelectedDoctorId] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('cr-ambulatorio-doctor-id') || ''
    }
    return ''
  })
  const [activeTab, setActiveTab] = useState('mi-sala') // 'mi-sala' | 'companeros'
  const [searchTerm, setSearchTerm] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Agenda state
  const [agenda, setAgenda] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newPatientForm, setNewPatientForm] = useState({
    hora: '09:00',
    paciente: '',
    rut: '',
    motivo: 'Consulta Clínica',
    bloqueado: false,
  })

  // Leave Modal state
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveReason, setLeaveReason] = useState('Licencia médica / Reposo por salud')

  const refreshData = async () => {
    try {
      const [nextBoxes, nextDoctors] = await Promise.all([loadBoxes(), loadDoctors()])
      setBoxes(nextBoxes)
      setDoctors(nextDoctors)
      setMedicalLeaves(getMedicalLeaves())
      if (selectedDoctorId) {
        setAgenda(getDoctorAgenda(selectedDoctorId))
      }
    } catch {
      setError('No se pudo conectar con el sistema.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-sync polling & Realtime
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
    window.addEventListener('agenda-updated', handleDemo)
    return () => {
      clearInterval(timer)
      window.removeEventListener('demo-boxes-changed', handleDemo)
      window.removeEventListener('storage', handleDemo)
      window.removeEventListener('agenda-updated', handleDemo)
    }
  }, [selectedDoctorId])

  function handleSelectDoctor(id) {
    setSelectedDoctorId(id)
    setMessage('')
    setError('')
    if (typeof window !== 'undefined') {
      if (id) {
        window.localStorage.setItem('cr-ambulatorio-doctor-id', id)
        setAgenda(getDoctorAgenda(id))
      } else {
        window.localStorage.removeItem('cr-ambulatorio-doctor-id')
        setAgenda([])
      }
    }
  }

  const currentDoctor = useMemo(() => {
    if (!selectedDoctorId) return null
    return doctors.find((d) => d.id.toString() === selectedDoctorId.toString())
  }, [doctors, selectedDoctorId])

  // Active room assigned to this doctor (whether in attention or available waiting)
  const assignedBox = useMemo(() => {
    if (!currentDoctor) return null
    return boxes.find(
      (b) =>
        b.medico === currentDoctor.nombre ||
        b.atencion?.medicos?.nombre === currentDoctor.nombre ||
        b.atencion?.medico_id === currentDoctor.id ||
        b.atencion?.medico_id?.toString() === currentDoctor.id?.toString()
    )
  }, [boxes, currentDoctor])

  // Map each doctor to their live location or medical leave status
  const roster = useMemo(() => {
    return doctors.map((doc) => {
      const activeBox = boxes.find(
        (b) =>
          (b.medico === doc.nombre || b.atencion?.medicos?.nombre === doc.nombre || b.atencion?.medico_id === doc.id)
      )
      const leave = medicalLeaves[doc.id] || medicalLeaves[doc.id.toString()]
      return {
        ...doc,
        activeBox,
        isOccupied: Boolean(activeBox && activeBox.estado === 'en_atencion'),
        isAssigned: Boolean(activeBox),
        hasLeave: Boolean(leave),
        leaveDetails: leave,
      }
    })
  }, [doctors, boxes, medicalLeaves])

  const filteredRoster = useMemo(() => {
    if (!searchTerm.trim()) return roster
    const term = searchTerm.toLowerCase()
    return roster.filter(
      (r) =>
        r.nombre.toLowerCase().includes(term) ||
        (r.especialidad_nombre && r.especialidad_nombre.toLowerCase().includes(term)) ||
        r.tipo.toLowerCase().includes(term) ||
        (r.activeBox && r.activeBox.numero.toLowerCase().includes(term))
    )
  }, [roster, searchTerm])

  const hasMyDoctorLeave = Boolean(currentDoctor && (medicalLeaves[currentDoctor.id] || medicalLeaves[currentDoctor.id?.toString()]))

  // Quick live status change by professional
  async function handleToggleStatus(newStatus) {
    if (!assignedBox) return
    try {
      await setBoxAvailability(assignedBox.id, newStatus)
      setMessage(newStatus === 'disponible' ? '✓ Sala marcada como DISPONIBLE (Lista para recibir paciente).' : '✓ Sala marcada EN ATENCIÓN (Consulta en curso).')
      refreshData()
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el estado de la sala.')
    }
  }

  // Call / Start attention for a patient from agenda
  async function handleCallPatient(item) {
    if (!assignedBox) return
    try {
      const updatedAgenda = agenda.map((a) => (a.id === item.id ? { ...a, estado: 'en_atencion' } : a.estado === 'en_atencion' ? { ...a, estado: 'pendiente' } : a))
      saveDoctorAgenda(currentDoctor.id, updatedAgenda)
      setAgenda(updatedAgenda)

      // Set room to 'en_atencion'
      await setBoxAvailability(assignedBox.id, 'en_atencion')

      // Announce patient on public TVs
      await triggerPatientCall(assignedBox.numero, assignedBox.especialidad?.nombre || 'Consulta Externa', item.paciente)

      setMessage(`📢 Llamando a ${item.paciente}. La Sala ${assignedBox.numero} pasó a EN ATENCIÓN.`)
      refreshData()
    } catch (err) {
      setError(err.message || 'Error al iniciar atención del paciente.')
    }
  }

  // Finish consultation for a patient -> Room returns to DISPONIBLE automatically!
  async function handleFinishPatient(item) {
    if (!assignedBox) return
    try {
      const updatedAgenda = agenda.map((a) => (a.id === item.id ? { ...a, estado: 'atendido' } : a))
      saveDoctorAgenda(currentDoctor.id, updatedAgenda)
      setAgenda(updatedAgenda)

      // AUTOMATICALLY set room to 'disponible' while KEEPING room assigned to the doctor!
      await setBoxAvailability(assignedBox.id, 'disponible')

      setMessage(`✓ Atención de ${item.paciente} finalizada. La Sala ${assignedBox.numero} ahora aparece DISPONIBLE (en verde) para tu próximo paciente.`)
      refreshData()
    } catch (err) {
      setError(err.message || 'Error al finalizar atención.')
    }
  }

  // Add new patient or block slot
  function handleAddPatientSubmit(e) {
    e.preventDefault()
    if (!currentDoctor) return
    const newItem = {
      id: `ag-${Date.now()}`,
      hora: newPatientForm.hora,
      paciente: newPatientForm.bloqueado ? (newPatientForm.paciente || 'Bloque Reservado / Pausa') : newPatientForm.paciente,
      rut: newPatientForm.rut,
      motivo: newPatientForm.motivo,
      estado: 'pendiente',
      bloqueado: newPatientForm.bloqueado,
    }
    const updated = [...agenda, newItem].sort((a, b) => a.hora.localeCompare(b.hora))
    saveDoctorAgenda(currentDoctor.id, updated)
    setAgenda(updated)
    setShowAddModal(false)
    setNewPatientForm({ hora: '09:00', paciente: '', rut: '', motivo: 'Consulta Clínica', bloqueado: false })
    setMessage('Cita / Bloqueo añadido a tu agenda del día.')
  }

  // Remove patient slot
  function handleRemovePatient(itemId) {
    if (!currentDoctor) return
    const updated = agenda.filter((a) => a.id !== itemId)
    saveDoctorAgenda(currentDoctor.id, updated)
    setAgenda(updated)
  }

  async function handleReportLeave() {
    if (!currentDoctor) return
    try {
      await reportMedicalLeave(currentDoctor.id, leaveReason)
      setMessage(`Se ha registrado tu inasistencia por "${leaveReason}". Tu sala ha sido liberada de inmediato para reasignación.`)
      setShowLeaveModal(false)
      refreshData()
    } catch (err) {
      setError(err.message || 'No se pudo registrar la inasistencia.')
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f7f3] text-slate-500">
        <div className="flex items-center gap-2 font-bold">
          <RefreshCw className="animate-spin" /> Cargando portal móvil del funcionario...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f6f7f3] p-4 text-slate-950 md:p-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-teal-700 hover:underline">
          <ChevronLeft size={16} /> Ver Pantalla TV de Disponibilidad
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl md:p-7">
          {/* Header Portal Móvil */}
          <div className="flex items-start justify-between border-b pb-5 border-slate-100">
            <div>
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-700">Acceso Móvil Personal</span>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Portal del Funcionario</h1>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">Gestión de Agenda, Estado de Sala y Compañeros</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 shadow-xs">
              <Stethoscope size={24} />
            </div>
          </div>

          {/* Identification Dropdown (Logged In Doctor Selector) */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
              Identificación de Funcionario:
              <select
                value={selectedDoctorId}
                onChange={(e) => handleSelectDoctor(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-500"
              >
                <option value="">-- Seleccionar mi cuenta de Funcionario --</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.nombre} ({doc.tipo === 'kinesiologo' ? 'Kinesiólogo/a' : doc.tipo === 'dermatologo' ? 'Dermatólogo/a' : doc.tipo === 'cardiologo' ? 'Cardiólogo/a' : 'Médico/a'})
                  </option>
                ))}
              </select>
            </label>

            {currentDoctor && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-white p-3 border border-slate-200/80 text-xs">
                <div>
                  <span className="font-extrabold text-slate-900">{currentDoctor.nombre}</span>
                  <span className="block font-semibold text-teal-700">
                    {currentDoctor.tipo === 'kinesiologo' ? 'Kinesiólogo/a' : currentDoctor.tipo === 'dermatologo' ? 'Dermatólogo/a' : currentDoctor.tipo === 'cardiologo' ? 'Cardiólogo/a' : 'Médico/a'} · {currentDoctor.especialidad_nombre || 'Consulta Externa'}
                  </span>
                </div>
                <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-teal-800">
                  Identificado
                </span>
              </div>
            )}
          </div>

          {/* Navigation Tabs: Mi Sala & Agenda vs Ubicación de Compañeros */}
          <nav className="mt-5 flex rounded-2xl bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab('mi-sala')}
              className={`flex-1 rounded-xl py-2.5 text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === 'mi-sala' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck size={16} /> Mi Sala & Agenda
            </button>
            <button
              onClick={() => setActiveTab('companeros')}
              className={`flex-1 rounded-xl py-2.5 text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === 'companeros' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users size={16} /> Dónde están mis Compañeros ({doctors.length})
            </button>
          </nav>

          {/* TAB 1: MI SALA, INTERRUPTOR DE ESTADO Y AGENDA DE PACIENTES */}
          {activeTab === 'mi-sala' && (
            <div className="mt-5 space-y-6">
              {currentDoctor ? (
                <div>
                  {hasMyDoctorLeave ? (
                    /* REGISTRÓ LICENCIA MÉDICA / INASISTENCIA */
                    <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-5 text-rose-950 animate-in fade-in">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-200 text-rose-900 font-bold">
                          <HeartPulse size={20} />
                        </div>
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider text-rose-800">Estado de Asistencia</span>
                          <h3 className="text-lg font-black text-rose-950">Inasistencia por Licencia Registrada</h3>
                        </div>
                      </div>
                      <p className="mt-3 text-xs font-semibold leading-relaxed text-rose-900">
                        Has notificado justificativo/licencia médica para el día de hoy. Tu sala ha sido liberada automáticamente para que la supervisora la asigne a otro funcionario si corresponde.
                      </p>
                    </div>
                  ) : assignedBox ? (
                    /* TIENE SALA ASIGNADA ACTIVA */
                    <div className="space-y-6">
                      {/* Tarjeta de Sala Asignada */}
                      <div className="rounded-2xl border-2 border-teal-600 bg-teal-50/80 p-5 text-slate-900 shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-3 py-1 text-xs font-black text-white uppercase">
                            <UserCheck size={14} /> Sala Asignada
                          </span>
                          <span className="text-xs font-extrabold text-teal-900">Piso {assignedBox.piso || '-'}</span>
                        </div>

                        <div className="mt-3">
                          <span className="text-xs font-extrabold uppercase text-teal-700 tracking-wider">Tu Sala de Consulta:</span>
                          <h2 className="text-4xl font-black tracking-tight text-teal-950 mt-0.5">
                            SALA {assignedBox.numero}
                          </h2>
                          <p className="text-xs font-bold text-teal-800">
                            {assignedBox.especialidad?.nombre || 'Consulta Externa'}
                          </p>
                        </div>

                        {/* Control Rápido de Estado en Tiempo Real (Disponible vs En Atención) */}
                        <div className="mt-5 rounded-2xl bg-white p-4 border border-teal-200 shadow-2xs">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                            Estado en Vivo en Pantallas del Hospital:
                          </span>

                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => handleToggleStatus('disponible')}
                              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black transition-all ${
                                assignedBox.estado === 'disponible'
                                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                              🟢 Disponible (Listo / Esperando)
                            </button>

                            <button
                              onClick={() => handleToggleStatus('en_atencion')}
                              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black transition-all ${
                                assignedBox.estado === 'en_atencion'
                                  ? 'bg-teal-700 text-white shadow-md ring-2 ring-teal-300'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              <span className="h-2.5 w-2.5 rounded-full bg-teal-300 animate-pulse" />
                              🔴 En Atención (Con Paciente)
                            </button>
                          </div>

                          <p className="mt-2 text-[11px] font-semibold text-slate-500">
                            {assignedBox.estado === 'disponible'
                              ? '✓ Tu sala aparece en verde (Disponible) en las pantallas de pasillo para que el próximo paciente sepa que puedes atenderlo, manteniendo tu asignación.'
                              : '✓ Tu sala aparece ocupada (En atención) indicando consulta en progreso.'}
                          </p>
                        </div>
                      </div>

                      {/* PANEL DE AGENDA DE PACIENTES DEL PROFESIONAL */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 border-slate-100">
                          <div>
                            <div className="flex items-center gap-2 text-teal-700 text-xs font-black uppercase tracking-wider">
                              <CalendarClock size={16} /> Agenda de Pacientes del Día
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mt-0.5">Control de Citas y Turnos</h3>
                          </div>
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-black text-white hover:bg-teal-800 transition-colors shadow-xs"
                          >
                            <Plus size={15} /> Agendar Paciente / Bloquear
                          </button>
                        </div>

                        {/* Lista de Citas */}
                        <div className="mt-4 space-y-3">
                          {agenda.length === 0 ? (
                            <div className="rounded-xl bg-slate-50 p-6 text-center text-xs font-bold text-slate-500">
                              No tienes citas registradas para hoy. Usa el botón "+ Agendar Paciente" para agregar pacientes.
                            </div>
                          ) : (
                            agenda.map((item) => (
                              <div
                                key={item.id}
                                className={`rounded-2xl border p-4 transition-all ${
                                  item.estado === 'en_atencion'
                                    ? 'border-teal-400 bg-teal-50/70 shadow-sm'
                                    : item.estado === 'atendido'
                                    ? 'border-slate-200 bg-slate-50/70 opacity-70'
                                    : item.bloqueado
                                    ? 'border-amber-200 bg-amber-50/60'
                                    : 'border-slate-200 bg-white'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-xs font-mono">
                                      {item.hora}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-black text-sm text-slate-900">{item.paciente}</h4>
                                        {item.bloqueado && (
                                          <span className="flex items-center gap-1 rounded bg-amber-200 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-900">
                                            <Lock size={10} /> Bloqueo
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                        {item.motivo} {item.rut ? `· RUT: ${item.rut}` : ''}
                                      </p>
                                    </div>
                                  </div>

                                  <span
                                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                                      item.estado === 'en_atencion'
                                        ? 'bg-teal-700 text-white animate-pulse'
                                        : item.estado === 'atendido'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {item.estado === 'en_atencion' ? 'En Atención' : item.estado === 'atendido' ? '✓ Atendido' : 'Pendiente'}
                                  </span>
                                </div>

                                {/* Botones de Acción de Paciente */}
                                <div className="mt-3 border-t border-slate-200/60 pt-2.5 flex items-center justify-between gap-2">
                                  <div>
                                    {item.estado === 'pendiente' && (
                                      <button
                                        onClick={() => handleCallPatient(item)}
                                        className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-1.5 text-xs font-black text-white hover:bg-teal-800 shadow-2xs"
                                      >
                                        <Megaphone size={14} /> Llamar a Sala
                                      </button>
                                    )}

                                    {item.estado === 'en_atencion' && (
                                      <button
                                        onClick={() => handleFinishPatient(item)}
                                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-emerald-700 shadow-2xs"
                                      >
                                        <Check size={14} /> Finalizar Consulta (Liberar a Disponible)
                                      </button>
                                    )}

                                    {item.estado === 'atendido' && (
                                      <span className="text-xs font-bold text-emerald-700">✓ Consulta finalizada</span>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => handleRemovePatient(item.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                                    title="Eliminar cita"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Botones de Cierre de Jornada y Licencia */}
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <button
                          onClick={async () => {
                            try {
                              const attentionId = assignedBox.atencion?.id || `demo-active-${assignedBox.id}`
                              await finishAttention(attentionId)
                              setMessage(`Has cerrado tu jornada y liberado completamente la Sala ${assignedBox.numero}.`)
                              await refreshData()
                            } catch {
                              setError('No se pudo liberar la sala.')
                            }
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-xs font-black text-white shadow-md hover:bg-slate-800 transition-colors"
                        >
                          <LogOut size={16} /> Cerrar Turno Completo / Desocupar Sala {assignedBox.numero}
                        </button>

                        <button
                          onClick={() => setShowLeaveModal(true)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 py-3 text-xs font-black text-rose-800 hover:bg-rose-100 transition-colors"
                        >
                          <HeartPulse size={16} className="text-rose-600" /> Presentar Licencia Médica / Justificativo (Liberación Inmediata)
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* NO TIENE SALA ASIGNADA HOY AÚN */
                    <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/80 p-5 text-amber-950 animate-in fade-in">
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
                        Hola <strong>{currentDoctor.nombre}</strong>. La Encargada de Piso aún no te ha asignado una sala. Apenas te asignen un box, podrás gestionar tu agenda y llamar pacientes.
                      </p>

                      <div className="mt-4 pt-3 border-t border-amber-200">
                        <button
                          onClick={() => setShowLeaveModal(true)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white py-2.5 text-xs font-black text-rose-800 hover:bg-rose-50 transition-colors"
                        >
                          <HeartPulse size={16} className="text-rose-600" /> Notificar Licencia / Inasistencia Médica
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-100 p-6 text-center text-slate-500 font-bold text-xs">
                  👈 Selecciona tu nombre de funcionario en la casilla superior para ver tu sala asignada y agenda.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UBICACIÓN EN TIEMPO REAL DE COMPAÑEROS FUNCIONARIOS */}
          {activeTab === 'companeros' && (
            <div className="mt-5 space-y-4">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar compañero por nombre o especialidad..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-3">
                {filteredRoster.map((doc) => (
                  <div
                    key={doc.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      doc.isOccupied
                        ? 'border-teal-300 bg-teal-50/50 shadow-2xs'
                        : doc.hasLeave
                        ? 'border-rose-200 bg-rose-50/50'
                        : 'border-slate-200 bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="rounded bg-white px-2 py-0.5 text-[9px] font-black uppercase text-slate-700 shadow-2xs">
                          {doc.tipo === 'kinesiologo' ? 'Kinesiólogo/a' : doc.tipo === 'dermatologo' ? 'Dermatólogo/a' : doc.tipo === 'cardiologo' ? 'Cardiólogo/a' : 'Médico/a'}
                        </span>
                        <h4 className="mt-1 text-sm font-black text-slate-900">{doc.nombre}</h4>
                        <p className="text-[11px] font-semibold text-slate-500">{doc.especialidad_nombre || 'General'}</p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          doc.isOccupied
                            ? 'bg-teal-700 text-white'
                            : doc.hasLeave
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${doc.isOccupied ? 'bg-teal-300 animate-ping' : doc.hasLeave ? 'bg-rose-200' : 'bg-slate-400'}`} />
                        {doc.isOccupied ? 'En Sala' : doc.hasLeave ? 'Licencia' : 'Disponible'}
                      </span>
                    </div>

                    <div className="mt-3 border-t border-slate-200/70 pt-2.5 flex items-center justify-between text-xs">
                      {doc.isAssigned ? (
                        <div className="flex items-center gap-1.5 font-black text-teal-900">
                          <MapPin size={14} className="text-teal-600 shrink-0" />
                          Ubicado/a en Sala {doc.activeBox?.numero} (Piso {doc.activeBox?.piso || '-'})
                        </div>
                      ) : doc.hasLeave ? (
                        <div className="flex items-center gap-1.5 font-extrabold text-rose-800">
                          <HeartPulse size={14} className="text-rose-600 shrink-0" />
                          {doc.leaveDetails?.reason || 'Ausente por Licencia Médica'}
                        </div>
                      ) : (
                        <span className="font-extrabold text-slate-500">⚪ Sin sala asignada actualmente</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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

      {/* MODAL AGREGAR PACIENTE / BLOQUEO DE HORA */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in">
          <form onSubmit={handleAddPatientSubmit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-2.5 text-teal-700">
              <CalendarClock size={24} />
              <h3 className="text-xl font-black text-slate-900">Agendar Cita o Bloqueo</h3>
            </div>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              Programa un paciente o reserva una ventana horaria en tu jornada.
            </p>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-black uppercase text-slate-700">
                  Hora de Atención:
                  <input
                    type="time"
                    required
                    value={newPatientForm.hora}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, hora: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-500"
                  />
                </label>

                <label className="block text-xs font-black uppercase text-slate-700">
                  Tipo / Bloqueo:
                  <select
                    value={newPatientForm.bloqueado ? 'bloqueo' : 'paciente'}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, bloqueado: e.target.value === 'bloqueo' })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-500"
                  >
                    <option value="paciente">Paciente Clínico</option>
                    <option value="bloqueo">Bloqueo de Hora / Pausa</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs font-black uppercase text-slate-700">
                {newPatientForm.bloqueado ? 'Descripción del Bloqueo:' : 'Nombre del Paciente:'}
                <input
                  type="text"
                  required
                  placeholder={newPatientForm.bloqueado ? 'Ej. Revisión de Fichas / Pausa Colación' : 'Ej. Camila Andrea Vargas'}
                  value={newPatientForm.paciente}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, paciente: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-500"
                />
              </label>

              {!newPatientForm.bloqueado && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-black uppercase text-slate-700">
                    RUT / Ficha:
                    <input
                      type="text"
                      placeholder="Ej. 19.450.887-3"
                      value={newPatientForm.rut}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, rut: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-500"
                    />
                  </label>

                  <label className="block text-xs font-black uppercase text-slate-700">
                    Motivo de Consulta:
                    <input
                      type="text"
                      placeholder="Ej. Control de Presión"
                      value={newPatientForm.motivo}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, motivo: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-500"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-teal-700 py-2.5 text-xs font-black text-white shadow-md hover:bg-teal-800"
              >
                Guardar en Agenda
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL REGISTRO DE LICENCIA / ENFERMEDAD */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-700">
              <HeartPulse size={28} />
              <h3 className="text-xl font-black text-slate-900">Declarar Licencia Médica / Inasistencia</h3>
            </div>

            <p className="mt-2 text-xs font-semibold text-slate-600 leading-relaxed">
              Hola <strong>{currentDoctor?.nombre}</strong>. Al declarar tu inasistencia o presentar certificado médico, tu sala asignada se liberará <strong>de inmediato</strong> para que la Encargada de Piso pueda reasignarla a otro colega.
            </p>

            <label className="mt-4 block text-xs font-black uppercase text-slate-700">
              Motivo / Detalle del Justificativo:
              <select
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs font-bold text-slate-900 outline-none focus:border-teal-500"
              >
                <option value="Licencia Médica / Reposo Sanitario">Licencia Médica / Reposo Sanitario</option>
                <option value="Certificado Médico de Urgencia">Certificado Médico de Urgencia</option>
                <option value="Permiso Administrativo / Justificado">Permiso Administrativo / Justificado</option>
                <option value="Imprevisto de Salud">Imprevisto de Salud</option>
              </select>
            </label>

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleReportLeave}
                className="flex-1 rounded-xl bg-rose-600 py-3 text-xs font-black text-white shadow-md hover:bg-rose-700"
              >
                Confirmar y Liberar Sala
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
