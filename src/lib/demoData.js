export const demoSpecialties = [
  { id: 1, nombre: 'Medicina interna' },
  { id: 2, nombre: 'Diabetología' },
  { id: 3, nombre: 'Cuidados paliativos' },
  { id: 4, nombre: 'Unidad TACO' },
  { id: 5, nombre: 'Rehabilitación y kinesiología' },
  { id: 6, nombre: 'UNACES' },
  { id: 7, nombre: 'Pediatría' },
]

const realAreaDefinitions = [
  { area: 'Medicina interna broncopulmonar', sector: 'Pasillo A', prefix: 'MIB', specialtyId: 1, rooms: ['Box toma de signos vitales', 'Box 1', 'Box 2', 'Box 3', 'Box 4', 'Box 5', 'Box 6', 'Box procedimientos'] },
  { area: 'Diabetología', sector: 'Pasillo E', prefix: 'DIAB', specialtyId: 2, rooms: ['Box 1', 'Box 2', 'Box 3', 'Box 4', 'Box 5', 'Box 6', 'Box 7', 'Box 8', 'Box procedimientos 1', 'Box procedimientos 2', 'Box procedimientos 3'] },
  { area: 'Cuidados paliativos', sector: 'Pasillo D', prefix: 'PAL', specialtyId: 3, rooms: ['Box 1', 'Box 2', 'Box 3', 'Box 4', 'Box 5', 'Box 6', 'Box 7', 'Box procedimientos'] },
  { area: 'Unidad TACO', sector: 'Pasillo F', prefix: 'TACO', specialtyId: 4, rooms: ['Box 1', 'Box 2', 'Box 3'] },
  { area: 'Rehabilitación pulmonar y kine', sector: 'Pasillo A', prefix: 'REH', specialtyId: 5, rooms: ['Box 1', 'Box 2', 'Box 3', 'Box 4', 'Box 5'] },
  { area: 'UNACES', sector: 'Área clínica', prefix: 'UNA', specialtyId: 6, rooms: ['Box 1', 'Box procedimientos 1', 'Box procedimientos 2'] },
  { area: 'Pediatría', sector: 'Pasillo B', prefix: 'PED', specialtyId: 7, rooms: ['Box 1', 'Box 2', 'Box 3', 'Box 4', 'Box 5', 'Box 6', 'Box 7', 'Box 8', 'Box 9', 'Box procedimientos 1', 'Box procedimientos 2'] },
]

const roomCode = (prefix, room, index) => {
  if (room === 'Box toma de signos vitales') return `${prefix}-SV`
  if (room.startsWith('Box procedimientos')) return `${prefix}-PROC${room.replace('Box procedimientos', '').trim() || ''}`
  return `${prefix}-${String(index).padStart(2, '0')}`
}

export const demoBoxes = realAreaDefinitions.flatMap((definition, areaIndex) => definition.rooms.map((room, index) => ({
  id: realAreaDefinitions.slice(0, areaIndex).reduce((total, previousArea) => total + previousArea.rooms.length, 0) + index + 1,
  numero: roomCode(definition.prefix, room, index + 1),
  nombre: room,
  piso: null,
  sector: definition.sector,
  area: definition.area,
  capacidad: 1,
  especialidad_id: definition.specialtyId,
  especialidad: { nombre: demoSpecialties.find((item) => item.id === definition.specialtyId)?.nombre },
  equipamiento: room.includes('procedimientos') ? ['Camilla clínica', 'Lavamanos', 'PC Ficha'] : ['Camilla clínica', 'PC Ficha'],
  estado: index === 1 && definition.prefix !== 'TACO' ? 'en_atencion' : index === 2 && definition.prefix === 'MIB' ? 'fuera_servicio' : 'disponible',
  medico: index === 1 && definition.prefix !== 'TACO' ? 'Profesional asignado' : null,
}))).map((box) => box.estado === 'en_atencion'
  ? {
      ...box,
      atencion: { id: 10000 + box.id, medico_id: box.especialidad_id, hora_entrada: new Date(Date.now() - 12 * 60000).toISOString() },
      horaEntrada: new Date(Date.now() - 12 * 60000).toISOString(),
    }
  : box)

export const demoDoctors = [
  { id: 1, nombre: 'Dra. Elena Ríos', tipo: 'medico', especialidad_id: 1, especialidad_nombre: 'Medicina interna' },
  { id: 2, nombre: 'Dr. Pablo Mena', tipo: 'medico', especialidad_id: 1, especialidad_nombre: 'Medicina interna' },
  { id: 3, nombre: 'Dra. Camila Rojas', tipo: 'medico', especialidad_id: 2, especialidad_nombre: 'Diabetología' },
  { id: 4, nombre: 'Dr. Nicolás Vera', tipo: 'medico', especialidad_id: 3, especialidad_nombre: 'Cuidados paliativos' },
  { id: 5, nombre: 'Dra. Paula Silva', tipo: 'medico', especialidad_id: 7, especialidad_nombre: 'Pediatría' },
  { id: 6, nombre: 'Dra. Irene Soto', tipo: 'medico', especialidad_id: 6, especialidad_nombre: 'UNACES' },
  { id: 7, nombre: 'Dr. Mateo Cruz', tipo: 'medico', especialidad_id: 4, especialidad_nombre: 'Unidad TACO' },
  { id: 8, nombre: 'Kinesióloga Valentina Soto', tipo: 'kinesiologo', especialidad_id: 5, especialidad_nombre: 'Rehabilitación y kinesiología' },
  { id: 9, nombre: 'Kinesiólogo Diego Pérez', tipo: 'kinesiologo', especialidad_id: 5, especialidad_nombre: 'Rehabilitación y kinesiología' },
]
