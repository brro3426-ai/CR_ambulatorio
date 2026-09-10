import { Building2, Stethoscope } from 'lucide-react'

const nonClinicalSpaces = {
  'Cuidados Paliativos': ['Oficina', 'Comité oncológico', 'Sala de conversaciones'],
  'Unidad TACO': ['Oficina administrativa', 'Sala de charlas'],
  'Rehabilitación Pulmonar y Kine': ['Gimnasio'],
}

const legacyReferences = {
  'MIB-SV': 'A-001', 'MIB-01': 'A-002', 'MIB-02': 'A-003', 'MIB-03': 'A-004', 'MIB-04': 'A-005', 'MIB-05': 'A-006', 'MIB-06': 'A-007', 'MIB-PROC': 'A-008',
  'DIAB-01': 'B-001', 'DIAB-02': 'B-002', 'DIAB-03': 'B-003', 'DIAB-04': 'B-004', 'DIAB-05': 'B-005', 'DIAB-06': 'B-006', 'DIAB-07': 'B-007', 'DIAB-08': 'B-008', 'DIAB-PROC-01': 'B-011', 'DIAB-PROC-02': 'B-012', 'DIAB-PROC-03': 'B-013',
  'CPAL-01': 'C-001', 'CPAL-02': 'C-002', 'CPAL-03': 'C-003', 'CPAL-04': 'C-004', 'CPAL-05': 'C-005', 'CPAL-06': 'C-006', 'CPAL-07': 'C-007', 'CPAL-PROC': 'C-015',
  'TACO-01': 'C-009', 'TACO-02': 'C-010', 'TACO-03': 'C-011',
  'UNACES-01': 'E1-01', 'UNACES-PROC-01': 'E1-02', 'UNACES-PROC-02': 'E1-03',
  'REHAB-01': 'E2-01', 'REHAB-02': 'E2-02', 'REHAB-03': 'E2-03', 'REHAB-04': 'E2-04', 'REHAB-05': 'E2-05',
  'PED-01': 'H-001', 'PED-02': 'H-002', 'PED-03': 'H-003', 'PED-04': 'H-004', 'PED-05': 'H-005', 'PED-06': 'H-006', 'PED-07': 'H-007', 'PED-08': 'H-008', 'PED-09': 'H-009', 'PED-PROC-01': 'H-010', 'PED-PROC-02': 'H-011',
}

const nonClinicalReferences = {
  Oficina: 'C-009',
  'Comité oncológico': 'C-010',
  'Sala de conversaciones': 'C-012',
  'Oficina administrativa': [1989, 2986],
  'Sala de charlas': [1817, 2783],
  Gimnasio: [1042, 1862],
}

const stateColor = {
  disponible: 'bg-emerald-500',
  asignada: 'bg-slate-500',
  en_atencion: 'bg-rose-600',
  fuera_servicio: 'bg-slate-300',
}

function roomState(box) {
  if (box.estado === 'en_atencion') return 'en_atencion'
  if (box.estado === 'fuera_servicio') return 'fuera_servicio'
  if (box.tieneAsignado || box.asignado_medico_id) return 'asignada'
  return 'disponible'
}

function labelForState(state) {
  return {
    disponible: 'Disponible',
    asignada: 'Asignada',
    en_atencion: 'En atención',
    fuera_servicio: 'Fuera de servicio',
  }[state]
}

export default function OperationalFloorPlan({ boxes, geometry, planUrl, selectedArea, onSelectArea, selectedBoxId, onSelectBox, onManageRoom, readOnly = false }) {
  const grouped = boxes.reduce((groups, box) => {
    const area = box.area || 'Sin área arquitectónica'
    ;(groups[area] ||= []).push(box)
    return groups
  }, {})
  const areas = Object.keys(grouped)
  const visibleAreas = selectedArea === 'Todas las áreas' ? areas : areas.filter((area) => area === selectedArea)
  const visibleBoxes = visibleAreas.flatMap((area) => grouped[area])
  const selectedBox = visibleBoxes.find((box) => box.id === selectedBoxId) || null
  const geometryByReference = new Map(geometry.map((item) => [item.referencia, item]))
  const pointFor = (reference) => {
    const item = Array.isArray(reference) ? { posicion_x: reference[0], posicion_y: reference[1] } : geometryByReference.get(reference)
    if (!item) return null
    return { left: `${100 - (Number(item.posicion_y) / 3370) * 100}%`, top: `${(Number(item.posicion_x) / 2384) * 100}%` }
  }

  return (
    <section className="grid overflow-hidden xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 bg-slate-100 p-4 sm:p-6">
        {planUrl ? <div className="relative mx-auto min-w-[52rem] overflow-hidden border border-slate-300 bg-white shadow-inner" style={{ aspectRatio: '3370 / 2384' }}>
          <img src={planUrl} alt="Planta arquitectónica privada del CR" className="absolute inset-0 h-full w-full object-contain" />
          {visibleBoxes.map((box) => {
            const point = pointFor(legacyReferences[box.numero])
            if (!point) return null
            const state = roomState(box)
            return <button key={box.id} type="button" onClick={() => onSelectBox(box.id)} title={`${box.numero}: ${labelForState(state)}`} className={`absolute z-10 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-[7px] font-black text-white shadow-md ring-2 transition hover:scale-125 ${stateColor[state]} ${selectedBoxId === box.id ? 'ring-blue-600 scale-125' : 'ring-black/15'}`} style={point}>{box.numero.replace(/[^0-9]/g, '').slice(-2) || 'SV'}</button>
          })}
          {visibleAreas.flatMap((area) => nonClinicalSpaces[area] || []).map((space) => {
            const point = pointFor(nonClinicalReferences[space])
            if (!point) return null
            return <div key={space} className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 border border-slate-400 bg-white/95 px-1.5 py-1 text-center text-[8px] font-black text-slate-700 shadow-sm" style={point}>{space}</div>
          })}
        </div> : <div className="grid min-h-[34rem] place-items-center border border-amber-300 bg-amber-50 p-8 text-center text-sm font-bold text-amber-900">Falta cargar la planta privada en el almacenamiento seguro de Supabase.</div>}
      </div>
      <aside className="border-t border-slate-200 bg-white p-5 xl:border-l xl:border-t-0">
        {selectedBox ? (
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-teal-700">Sala seleccionada</p>
            <h3 className="mt-1 text-3xl font-black text-slate-950">{selectedBox.numero}</h3>
            <p className="mt-1 text-sm font-bold text-slate-600">{selectedBox.area}</p>
            <div className="mt-5 space-y-3 border-y border-slate-200 py-4 text-sm">
              <p><span className="font-bold text-slate-500">Especialidad:</span><br />{selectedBox.especialidad?.nombre || 'Sin especialidad'}</p>
              <p><span className="font-bold text-slate-500">Estado:</span><br /><span className="font-black text-slate-700">{labelForState(roomState(selectedBox))}</span></p>
              {selectedBox.medico && <p><span className="font-bold text-slate-500">Funcionario:</span><br />{selectedBox.medico}</p>}
            </div>
            {!readOnly && <button type="button" onClick={() => onManageRoom?.(selectedBox)} className="mt-5 flex w-full items-center justify-center gap-2 bg-teal-700 px-4 py-3 text-sm font-black text-white hover:bg-teal-800"><Stethoscope size={17} />Abrir para asignación</button>}
          </div>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div><Building2 size={30} className="mx-auto text-teal-700" /><h3 className="mt-3 text-lg font-black text-slate-900">Seleccione una sala</h3><p className="mt-2 text-sm text-slate-500">Los círculos indican disponibilidad y las cajas blancas son espacios de referencia.</p></div>
          </div>
        )}
        <div className="mt-6 border-t border-slate-200 pt-4 text-xs font-bold text-slate-600"><p className="mb-2 flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-emerald-500" />Disponible</p><p className="mb-2 flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-slate-500" />Asignada</p><p className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-rose-600" />En atención</p></div>
      </aside>
    </section>
  )
}
