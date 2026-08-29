const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g

export function sanitizeText(value, maxLength, fieldName) {
  if (typeof value !== 'string') throw new Error(`${fieldName} debe ser texto.`)
  const sanitized = value.replace(CONTROL_CHARS, '').trim()
  if (!sanitized) throw new Error(`${fieldName} no puede estar vacío.`)
  if (sanitized.length > maxLength) throw new Error(`${fieldName} supera el máximo permitido.`)
  return sanitized
}

export function validateId(value, fieldName) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) throw new Error(`${fieldName} no es válido.`)
  return id
}

export function sanitizeStatus(value) {
  const allowed = ['disponible', 'en_atencion', 'fuera_servicio']
  if (!allowed.includes(value)) throw new Error('Estado no válido.')
  return value
}
