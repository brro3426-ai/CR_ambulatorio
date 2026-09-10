import { hasSupabase, supabase } from './supabaseClient'
import { demoBoxes, demoDoctors, demoSpecialties } from './demoData'
import { checkClientRateLimit, sanitizeStatus, sanitizeText, validateId } from './validation'

const DEMO_STORAGE_KEY = 'cr-ambulatorio-demo-boxes'
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'

function ensureDataSource() {
  if (!hasSupabase && !demoMode) {
    throw new Error('La aplicación oficial requiere conexión con Supabase. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.')
  }
}

function getDemoBoxes() {
  if (typeof window === 'undefined') return demoBoxes
  const saved = window.localStorage.getItem(DEMO_STORAGE_KEY)
  return saved ? JSON.parse(saved) : demoBoxes
}

export function saveDemoBoxes(boxes) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(boxes))
  window.dispatchEvent(new CustomEvent('demo-boxes-changed'))
}

export async function loadBoxes() {
  ensureDataSource()
  if (!hasSupabase) return getDemoBoxes()
  const { data, error } = await supabase
    .from('boxes')
    .select('*, especialidades(nombre), asignado:medicos!boxes_asignado_medico_id_fkey(id, nombre), atenciones(id, medico_id, hora_entrada, hora_salida, medicos(nombre))')
    .order('numero')
  if (error) throw error
  return data.map((box) => {
    const activeAttentions = box.atenciones?.filter((item) => !item.hora_salida) || []
    const activeAttention = activeAttentions.length > 0 ? activeAttentions[activeAttentions.length - 1] : null
    return {
      ...box,
      estado: activeAttention ? 'en_atencion' : (box.estado === 'en_atencion' ? 'disponible' : box.estado),
      especialidad: box.especialidades,
      atencion: activeAttention,
      medico: activeAttention?.medicos?.nombre || box.asignado?.nombre || null,
      asignado_medico_id: box.asignado_medico_id || null,
      tieneAsignado: Boolean(box.asignado_medico_id),
      horaEntrada: activeAttention?.hora_entrada || null,
    }
  })
}

export async function loadPublicBoxes() {
  ensureDataSource()
  if (!hasSupabase) {
    return getDemoBoxes().map((box) => ({
      ...box,
      medico: null,
      atencion: null,
      horaEntrada: null,
      proximoMedico: null,
    }))
  }

  const { data, error } = await supabase
    .from('boxes')
    .select('id, numero, piso, sector, area, capacidad, especialidad_id, estado, especialidades(nombre)')
    .order('numero')
  if (error) throw error
  return data.map((box) => ({
    ...box,
    especialidad: box.especialidades,
    medico: null,
    atencion: null,
    horaEntrada: null,
    proximoMedico: null,
  }))
}

export async function loadAdminPlanUrl() {
  if (!hasSupabase) return null
  const buckets = ['CR', 'planos-privados']
  const paths = ['plano-cr-admin.png', 'cr/plano-cr-admin.png']
  for (const bucket of buckets) {
    const storage = supabase.storage.from(bucket)
    for (const path of paths) {
      const result = await storage.createSignedUrl(path, 60 * 30)
      if (!result.error) return result.data.signedUrl
    }
  }
  return null
}

export async function updateBoxStatus(id, estado) {
  const boxId = validateId(id, 'Box')
  const safeStatus = sanitizeStatus(estado)
  if (!hasSupabase) {
    saveDemoBoxes(getDemoBoxes().map((box) => box.id === boxId ? { ...box, estado: safeStatus } : box))
    return
  }
  const { error } = await supabase.from('boxes').update({ estado: safeStatus }).eq('id', boxId)
  if (error) throw error
}

export async function assignDoctorToBox(boxId, doctorId) {
  boxId = validateId(boxId, 'Sala')
  doctorId = validateId(doctorId, 'Profesional')
  const [boxes, doctors] = await Promise.all([loadBoxes(), loadDoctors()])
  const box = boxes.find((item) => item.id === boxId)
  const doctor = doctors.find((item) => item.id === doctorId)
  if (!box || !doctor) throw new Error('Sala o profesional no encontrado.')
  if (box.especialidad_id && doctor.especialidad_id && box.especialidad_id !== doctor.especialidad_id) {
    throw new Error(`Restricción de especialidad: ${doctor.nombre} no puede asignarse a la sala ${box.numero}.`)
  }
  if (!hasSupabase) {
    saveDemoBoxes(getDemoBoxes().map((item) => item.id === boxId ? { ...item, asignado_medico_id: doctorId, medico: doctor.nombre, tieneAsignado: true } : item))
    return
  }
  const { error } = await supabase.from('boxes').update({ asignado_medico_id: doctorId }).eq('id', boxId)
  if (error) throw error
}

export async function saveBox(payload, id) {
  const safePayload = {
    numero: sanitizeText(payload.numero, 40, 'Identificador de sala'),
    area: sanitizeText(payload.area, 120, 'Área arquitectónica'),
    piso: Number(payload.piso) || null,
    capacidad: Number(payload.capacidad),
    especialidad_id: payload.especialidad_id ? validateId(payload.especialidad_id, 'Especialidad') : null,
  }
  if (!Number.isInteger(safePayload.capacidad) || safePayload.capacidad < 1 || safePayload.capacidad > 100) {
    throw new Error('La capacidad debe ser un número entre 1 y 100.')
  }

  if (!hasSupabase) {
    const currentBoxes = getDemoBoxes()
    const duplicate = currentBoxes.find((box) => box.numero.toLowerCase() === safePayload.numero.toLowerCase() && box.id.toString() !== id?.toString())
    if (duplicate) throw new Error('Ya existe una sala con ese identificador.')
    const specialty = demoSpecialties.find((item) => item.id === safePayload.especialidad_id)
    const saved = { ...safePayload, id: id || Math.max(0, ...currentBoxes.map((box) => Number(box.id) || 0)) + 1, estado: 'disponible', medico: null, especialidad: specialty ? { nombre: specialty.nombre } : null }
    saveDemoBoxes(id ? currentBoxes.map((box) => box.id.toString() === id.toString() ? { ...box, ...saved, estado: box.estado, medico: box.medico, atencion: box.atencion, horaEntrada: box.horaEntrada } : box) : [...currentBoxes, saved])
    return saved
  }

  const query = id
    ? supabase.from('boxes').update(safePayload).eq('id', validateId(id, 'Sala'))
    : supabase.from('boxes').insert(safePayload)
  const { data, error } = await query.select().single()
  if (error) throw error
  return data
}

export async function deleteBox(id) {
  const boxId = validateId(id, 'Sala')
  if (!hasSupabase) {
    saveDemoBoxes(getDemoBoxes().filter((box) => box.id !== boxId))
    return
  }
  const { error } = await supabase.from('boxes').delete().eq('id', boxId)
  if (error) throw error
}

export async function loadDoctors() {
  ensureDataSource()
  if (!hasSupabase) return demoDoctors
  const { data, error } = await supabase.from('medicos').select('*, especialidades(nombre)').order('nombre')
  if (error) throw error
  return data.map((item) => ({ ...item, especialidad_nombre: item.especialidades?.nombre || null }))
}

export async function loadSpecialties() {
  ensureDataSource()
  if (!hasSupabase) return demoSpecialties
  const { data, error } = await supabase.from('especialidades').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function loadProtectedPlanGeometry() {
  if (!hasSupabase) return []
  const { data, error } = await supabase
    .from('plano_geometria')
    .select('tipo, referencia, area, posicion_x, posicion_y, ancho, largo, rotacion')
    .order('referencia')
  if (error) throw error
  return data
}

export async function loadReports() {
  if (!hasSupabase) return { byBox: demoBoxes.map((box) => ({ box: box.numero, average: box.estado === 'en_atencion' ? 24 : 0 })), byDoctor: [{ doctor: 'Dr. Pablo Mena', total: 4 }, { doctor: 'Dra. Sofia Vidal', total: 3 }] }
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase.from('atenciones').select('box_id, medico_id, hora_entrada, hora_salida, boxes(numero), medicos(nombre)').gte('hora_entrada', `${today}T00:00:00`)
  if (error) throw error
  const boxMap = new Map(); const doctorMap = new Map()
  data.forEach((item) => { if (item.hora_salida) { const minutes = (new Date(item.hora_salida) - new Date(item.hora_entrada)) / 60000; const key = item.boxes?.numero || item.box_id; const previous = boxMap.get(key) || { total: 0, minutes: 0 }; boxMap.set(key, { total: previous.total + 1, minutes: previous.minutes + minutes }) } const name = item.medicos?.nombre || item.medico_id; doctorMap.set(name, (doctorMap.get(name) || 0) + 1) })
  return { byBox: [...boxMap].map(([box, value]) => ({ box, average: Math.round(value.minutes / value.total) })), byDoctor: [...doctorMap].map(([doctor, total]) => ({ doctor, total })) }
}

export function getDoctorAgenda(doctorId) {
  if (typeof window === 'undefined' || !doctorId) return []
  const storageKey = `cr-ambulatorio-agenda-${doctorId}`
  const saved = window.localStorage.getItem(storageKey)
  if (saved) return JSON.parse(saved)

  const defaultAgenda = [
    { id: `ag-${doctorId}-1`, hora: '08:30', paciente: 'Paciente Demo 01', rut: '', motivo: 'Control clínico de demostración', estado: 'atendido', bloqueado: false },
    { id: `ag-${doctorId}-2`, hora: '09:15', paciente: 'Paciente Demo 02', rut: '', motivo: 'Evaluación de demostración', estado: 'pendiente', bloqueado: false },
    { id: `ag-${doctorId}-3`, hora: '10:00', paciente: 'Bloque Demo / Procedimiento', rut: '', motivo: 'Bloque reservado de demostración', estado: 'pendiente', bloqueado: true },
    { id: `ag-${doctorId}-4`, hora: '10:45', paciente: 'Paciente Demo 03', rut: '', motivo: 'Consulta de seguimiento demo', estado: 'pendiente', bloqueado: false },
    { id: `ag-${doctorId}-5`, hora: '11:30', paciente: 'Paciente Demo 04', rut: '', motivo: 'Primera atención demo', estado: 'pendiente', bloqueado: false },
  ]
  window.localStorage.setItem(storageKey, JSON.stringify(defaultAgenda))
  return defaultAgenda
}

export function saveDoctorAgenda(doctorId, agendaList) {
  if (typeof window === 'undefined' || !doctorId) return
  const storageKey = `cr-ambulatorio-agenda-${doctorId}`
  window.localStorage.setItem(storageKey, JSON.stringify(agendaList))
  window.dispatchEvent(new CustomEvent('agenda-updated', { detail: { doctorId, agendaList } }))
}

export async function setBoxAvailability(boxId, estado) {
  boxId = validateId(boxId, 'Box')
  const safeStatus = sanitizeStatus(estado)
  if (!hasSupabase) {
    saveDemoBoxes(
      getDemoBoxes().map((box) => {
        if (!(box.id === boxId || box.id.toString() === boxId.toString())) return box

        const nextBox = { ...box, estado: safeStatus }

        if (safeStatus === 'disponible') {
          nextBox.atencion = null
          nextBox.horaEntrada = null
        }

        return nextBox
      })
    )
    return
  }
  const { error } = await supabase.from('boxes').update({ estado: safeStatus }).eq('id', boxId)
  if (error) throw error
}

export async function startAttention(boxId, doctorId, doctorName) {
  checkClientRateLimit('startAttention', 15, 60000)
  boxId = validateId(boxId, 'Box')
  doctorId = validateId(doctorId, 'Profesional')
  const [boxes, doctors] = await Promise.all([loadBoxes(), loadDoctors()])
  const box = boxes.find((b) => b.id === boxId || b.id.toString() === boxId.toString())
  const doctor = doctors.find((d) => d.id === doctorId || d.id.toString() === doctorId.toString())

  if (box && doctor) {
    const boxSpecId = box.especialidad_id
    const docSpecId = doctor.especialidad_id
    const boxSpecName = box.especialidad?.nombre || ''
    const docSpecName = doctor.especialidad_nombre || doctor.especialidades?.nombre || ''

    if (boxSpecId && docSpecId && boxSpecId !== docSpecId) {
      throw new Error(`Restricción de especialidad: ${doctor.nombre} pertenece a "${docSpecName}" y el Box ${box.numero} es de "${boxSpecName}". Solo se permiten profesionales de su especialidad.`)
    }
  }

  if (!hasSupabase) {
    const attention = { id: Date.now(), medico_id: doctorId, hora_entrada: new Date().toISOString() }
    const actualDoctorName = doctorName || doctor?.nombre || 'Profesional asignado'
    saveDemoBoxes(getDemoBoxes().map((b) => b.id === boxId || b.id.toString() === boxId.toString() ? { ...b, estado: 'en_atencion', atencion: attention, medico: actualDoctorName, horaEntrada: attention.hora_entrada } : b))
    return attention
  }
  const assignment = await supabase.from('boxes').update({ asignado_medico_id: doctorId }).eq('id', boxId)
  if (assignment.error) throw assignment.error
  const { data, error } = await supabase.from('atenciones').insert({ box_id: boxId, medico_id: doctorId }).select().single()
  if (error) throw error
  return data
}

export async function finishAttention(attentionId) {
  checkClientRateLimit('finishAttention', 15, 60000)
  attentionId = validateId(attentionId, 'Atención')
  if (!hasSupabase) {
    saveDemoBoxes(getDemoBoxes().map((box) => box.atencion?.id === attentionId ? { ...box, estado: 'disponible', medico: null, atencion: null, horaEntrada: null } : box))
    return
  }
  const { error } = await supabase.from('atenciones').update({ hora_salida: new Date().toISOString() }).eq('id', attentionId)
  if (error) throw error
}

export async function reportMedicalLeave(doctorId, reason = 'Licencia médica / Justificativo') {
  doctorId = validateId(doctorId, 'Profesional')
  const [boxes, doctors] = await Promise.all([loadBoxes(), loadDoctors()])
  const doctor = doctors.find((d) => d.id === doctorId || d.id.toString() === doctorId.toString())
  if (!doctor) throw new Error('Profesional no encontrado')

  const activeBox = boxes.find(
    (b) =>
      b.estado === 'en_atencion' &&
      (b.medico === doctor.nombre ||
        b.atencion?.medicos?.nombre === doctor.nombre ||
        b.atencion?.medico_id === doctor.id ||
        b.atencion?.medico_id?.toString() === doctor.id.toString())
  )

  if (activeBox) {
    if (activeBox.atencion?.id) await finishAttention(activeBox.atencion.id)
    else await setBoxAvailability(activeBox.id, 'disponible')
  }

  const msg = `Inasistencia Registrada: ${doctor.nombre} presentó ${reason}.${activeBox ? ` Sala ${activeBox.numero} liberada de inmediato.` : ' Sin sala activa.'}`
  await triggerSupervisorNotice(msg, 'Portal Funcionario')

  if (typeof window !== 'undefined') {
    const leaves = JSON.parse(window.localStorage.getItem('cr-ambulatorio-medical-leaves') || '{}')
    leaves[doctorId] = { date: new Date().toISOString().slice(0, 10), reason, doctorName: doctor.nombre, timestamp: Date.now() }
    window.localStorage.setItem('cr-ambulatorio-medical-leaves', JSON.stringify(leaves))
    window.dispatchEvent(new CustomEvent('demo-boxes-changed'))
  }

  return { doctor, releasedBox: activeBox }
}

export function getMedicalLeaves() {
  if (typeof window === 'undefined') return {}
  const today = new Date().toISOString().slice(0, 10)
  const leaves = JSON.parse(window.localStorage.getItem('cr-ambulatorio-medical-leaves') || '{}')
  const activeToday = {}
  Object.entries(leaves).forEach(([docId, data]) => {
    if (data.date === today) activeToday[docId] = data
  })
  return activeToday
}

export async function listShifts() {
  if (!hasSupabase) return [{ id: 1, dia_semana: 'lunes', hora_inicio: '08:00', hora_fin: '14:00', box: 'B-201', doctor: 'Dra. Elena Rios' }]
  const { data, error } = await supabase.from('turnos').select('*, boxes(numero), medicos(nombre)').order('dia_semana')
  if (error) throw error
  return data.map((item) => ({ ...item, box: item.boxes?.numero, doctor: item.medicos?.nombre }))
}

export async function saveCatalogItem(table, payload, id) {
  if (!['medicos', 'especialidades'].includes(table)) throw new Error('Catálogo no permitido.')
  const safePayload = { ...payload, nombre: sanitizeText(payload.nombre, 120, 'Nombre') }
  if (table === 'medicos') safePayload.tipo = sanitizeText(payload.tipo, 30, 'Tipo')
  if (table === 'medicos') safePayload.cargo = payload.cargo ? sanitizeText(payload.cargo, 80, 'Cargo') : null
  if (!hasSupabase) return { ...safePayload, id: id || `demo-${Date.now()}` }
  const query = id ? supabase.from(table).update(safePayload).eq('id', validateId(id, 'Registro')) : supabase.from(table).insert(safePayload)
  const { data, error } = await query.select().single()
  if (error) throw error
  return data
}

export async function deleteCatalogItem(table, id) {
  if (!['medicos', 'especialidades', 'turnos'].includes(table)) throw new Error('Tabla no permitida.')
  id = validateId(id, 'Registro')
  if (!hasSupabase) return
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

export async function saveShift(payload, id) {
  if (!hasSupabase) return { ...payload, id: id || `demo-${Date.now()}`, box: 'B-201', doctor: 'Dra. Elena Rios' }
  const query = id ? supabase.from('turnos').update(payload).eq('id', id) : supabase.from('turnos').insert(payload)
  const { data, error } = await query.select('*, boxes(numero), medicos(nombre)').single()
  if (error) throw error
  return { ...data, box: data.boxes?.numero, doctor: data.medicos?.nombre }
}

export async function triggerPatientCall(boxNumero, especialidadNombre, pacienteTicket = '') {
  const eventData = {
    boxNumero: sanitizeText(boxNumero, 30, 'Box'),
    especialidadNombre: sanitizeText(especialidadNombre, 120, 'Especialidad'),
    timestamp: Date.now(),
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('cr-ambulatorio-last-call', JSON.stringify(eventData))
    window.dispatchEvent(new CustomEvent('patient-called', { detail: eventData }))
  }
  if (hasSupabase) {
    const { error } = await supabase.from('avisos').insert({ tipo: 'llamado', payload: eventData })
    if (error) throw error
  }
  return eventData
}

export async function triggerSupervisorNotice(mensaje, emisor = 'Encargada de Piso', piso = 'Todos') {
  const noticeData = {
    mensaje: sanitizeText(mensaje, 300, 'Mensaje'),
    emisor: sanitizeText(emisor, 120, 'Emisor'),
    piso: sanitizeText(piso, 60, 'Piso'),
    timestamp: Date.now(),
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('cr-ambulatorio-supervisor-notice', JSON.stringify(noticeData))
    window.dispatchEvent(new CustomEvent('supervisor-notice', { detail: noticeData }))
  }
  if (hasSupabase) {
    const { error } = await supabase.from('avisos').insert({ tipo: 'supervisora', payload: noticeData })
    if (error) throw error
  }
  return noticeData
}

export async function loadDetailedReport() {
  if (!hasSupabase) {
    return [
      { box: 'B-201', especialidad: 'Medicina Interna', profesional: 'Dra. Laura Pérez', tipo: 'Médica', entrada: '08:15', salida: '08:42', duracionMin: 27 },
      { box: 'B-202', especialidad: 'Medicina Interna', profesional: 'Dr. Andrés Soto', tipo: 'Médico', entrada: '09:00', salida: '09:22', duracionMin: 22 },
      { box: 'B-301', especialidad: 'Cardiología', profesional: 'Dra. Camila Rojas', tipo: 'Cardióloga', entrada: '09:30', salida: '10:05', duracionMin: 35 },
      { box: 'B-101', especialidad: 'Kinesiología', profesional: 'Kinesióloga Valentina Soto', tipo: 'Kinesióloga', entrada: '10:15', salida: '10:55', duracionMin: 40 },
    ]
  }
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('atenciones')
    .select('*, boxes(numero, especialidades(nombre)), medicos(nombre, tipo)')
    .gte('hora_entrada', `${today}T00:00:00`)
    .order('hora_entrada', { ascending: false })

  if (error) throw error
  return data.map((item) => {
    const min = item.hora_salida ? Math.round((new Date(item.hora_salida) - new Date(item.hora_entrada)) / 60000) : '-'
    return {
      box: item.boxes?.numero || 'Box',
      especialidad: item.boxes?.especialidades?.nombre || '-',
      profesional: item.medicos?.nombre || 'Profesional',
      tipo: item.medicos?.tipo || 'medico',
      entrada: new Date(item.hora_entrada).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      salida: item.hora_salida ? new Date(item.hora_salida).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : 'En curso',
      duracionMin: min,
    }
  })
}
