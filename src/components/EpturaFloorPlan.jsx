import { useMemo, useState } from 'react'
import { Activity, Building2, DoorOpen, Layers, MapPin, Sparkles, UserRound, Wrench } from 'lucide-react'

export default function EpturaFloorPlan({ boxes, onBoxClick, isDarkMode = false }) {
  const [selectedFloor, setSelectedFloor] = useState('all')

  const floors = useMemo(() => {
    const floorNumbers = [...new Set(boxes.map((b) => b.piso).filter(Boolean))].sort((a, b) => a - b)
    return floorNumbers
  }, [boxes])

  const filteredBoxes = useMemo(() => {
    if (selectedFloor === 'all') return boxes
    return boxes.filter((b) => b.piso === Number(selectedFloor))
  }, [boxes, selectedFloor])

  const groupedByFloor = useMemo(() => {
    return filteredBoxes.reduce((acc, b) => {
      const p = b.piso || 1
      ;(acc[p] ||= []).push(b)
      return acc
    }, {})
  }, [filteredBoxes])

  return (
    <div className={`rounded-3xl border p-6 transition-colors duration-300 shadow-xl ${isDarkMode ? 'border-slate-800 bg-slate-900/90 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}>
      {/* Top Header & Floor Selector (Eptura Engage Style) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5 border-current/10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
            <Building2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-teal-500">Plano Arquitectónico</span>
              <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-teal-600">Eptura Engage Style</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">Mapa Interactivo de Pisos y Salas</h2>
          </div>
        </div>

        {/* Floor Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedFloor('all')}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${selectedFloor === 'all' ? 'bg-teal-600 text-white shadow-md' : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`}
          >
            <Layers size={14} /> Todos los Pisos ({boxes.length})
          </button>
          {floors.map((fl) => (
            <button
              key={fl}
              onClick={() => setSelectedFloor(fl.toString())}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${selectedFloor === fl.toString() ? 'bg-teal-600 text-white shadow-md' : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`}
            >
              Piso {fl}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Floor Plan Corridor View */}
      <div className="mt-6 space-y-8">
        {Object.entries(groupedByFloor).map(([floorNum, floorBoxes]) => (
          <div key={floorNum} className={`rounded-2xl border p-5 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50/70'}`}>
            <div className="mb-4 flex items-center justify-between border-b pb-3 border-current/10">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-teal-500" />
                <h3 className="text-lg font-black uppercase tracking-wide">Piso {floorNum} — Sector Consulta Externa</h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold opacity-75">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Disponible ({floorBoxes.filter((b) => b.estado === 'disponible').length})</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" /> En atención ({floorBoxes.filter((b) => b.estado === 'en_atencion').length})</span>
              </div>
            </div>

            {/* Floor Map Layout (Corridor Architectural Grid) */}
            <div className="relative rounded-xl border-2 border-dashed border-current/15 p-5 bg-gradient-to-r from-teal-500/5 via-transparent to-teal-500/5">
              <div className="absolute top-2 left-4 text-[10px] font-black uppercase tracking-[0.25em] opacity-40">PASILLO PRINCIPAL PISO {floorNum}</div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {floorBoxes.map((box) => {
                  const isOccupied = box.estado === 'en_atencion'
                  const isOutOfService = box.estado === 'fuera_servicio'

                  return (
                    <div
                      key={box.id}
                      onClick={() => onBoxClick?.(box)}
                      className={`group relative flex flex-col justify-between rounded-xl border-2 p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                        isOccupied
                          ? (isDarkMode ? 'border-rose-600/70 bg-rose-950/40 text-rose-100' : 'border-rose-300 bg-rose-50 text-rose-950')
                          : isOutOfService
                          ? (isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-400' : 'border-slate-300 bg-slate-100 text-slate-600')
                          : (isDarkMode ? 'border-emerald-600/70 bg-emerald-950/40 text-emerald-100' : 'border-emerald-300 bg-emerald-50 text-emerald-950')
                      }`}
                    >
                      {/* Live status dot glow */}
                      <div className={`absolute top-3 right-3 h-3 w-3 rounded-full ${isOccupied ? 'bg-rose-500 animate-ping' : isOutOfService ? 'bg-slate-400' : 'bg-emerald-500'}`} />

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider opacity-60">SALA</span>
                          <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-extrabold">{box.sector || 'Pasillo'}</span>
                        </div>
                        <h4 className="mt-1 text-3xl font-black">{box.numero}</h4>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide opacity-75">{box.especialidad?.nombre}</p>

                        {/* Equipment badges */}
                        {box.equipamiento?.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {box.equipamiento.map((eq) => (
                              <span key={eq} className="rounded bg-white/60 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-800">
                                {eq}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 border-t border-current/10 pt-3">
                        {isOccupied ? (
                          <div>
                            <p className="flex items-center gap-1.5 text-xs font-extrabold">
                              <UserRound size={14} />
                              {box.medico || 'En consulta'}
                            </p>
                            <span className="mt-1 inline-block text-[10px] font-bold text-rose-600">Ocupada · Clic para liberar →</span>
                          </div>
                        ) : isOutOfService ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold">
                            <Wrench size={14} /> Mantenimiento
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-black uppercase text-emerald-600">✓ Sala Lista</p>
                            <span className="mt-1 inline-block text-[10px] font-bold opacity-75 group-hover:underline">Reserva Inmediata Eptura →</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
