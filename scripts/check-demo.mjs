import { demoBoxes, demoDoctors, demoSpecialties } from '../src/lib/demoData.js'

const allowedStatuses = new Set(['disponible', 'en_atencion', 'fuera_servicio'])
const errors = []
const ids = demoBoxes.map((box) => box.id)
const codes = demoBoxes.map((box) => box.numero)
const specialtyIds = new Set(demoSpecialties.map((specialty) => specialty.id))

if (demoBoxes.length !== 49) errors.push(`Se esperaban 49 boxes y hay ${demoBoxes.length}.`)
if (demoSpecialties.length !== 7) errors.push(`Se esperaban 7 especialidades y hay ${demoSpecialties.length}.`)
if (demoDoctors.length !== 9) errors.push(`Se esperaban 9 profesionales y hay ${demoDoctors.length}.`)
if (new Set(ids).size !== ids.length) errors.push('Hay IDs de boxes duplicados.')
if (new Set(codes).size !== codes.length) errors.push('Hay códigos visibles de boxes duplicados.')

for (const box of demoBoxes) {
  if (!Number.isInteger(box.id) || box.id < 1) errors.push(`ID inválido en ${box.numero}.`)
  if (!box.numero || !box.area || !box.sector) errors.push(`Datos incompletos en el box ${box.numero || '(sin código)'}.`)
  if (!specialtyIds.has(box.especialidad_id) || !box.especialidad?.nombre) errors.push(`Especialidad inválida en ${box.numero}.`)
  if (!allowedStatuses.has(box.estado)) errors.push(`Estado inválido en ${box.numero}: ${box.estado}.`)
}

for (const doctor of demoDoctors) {
  if (!doctor.especialidad_id || !doctor.especialidad_nombre) errors.push(`Especialidad incompleta en ${doctor.nombre}.`)
  if (!specialtyIds.has(doctor.especialidad_id)) errors.push(`Especialidad inexistente en ${doctor.nombre}.`)
}

if (errors.length > 0) {
  console.error('Demo inválida:')
  errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log(`Demo válida: ${demoBoxes.length} boxes, ${demoSpecialties.length} especialidades y ${demoDoctors.length} profesionales.`)
}
