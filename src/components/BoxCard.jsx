import { useEffect, useState } from 'react'
import { Activity, CalendarClock, DoorOpen, MousePointerClick, Stethoscope, UserRound } from 'lucide-react'

const states = {
  disponible: {
    label: 'Disponible',
    icon: DoorOpen,
    lightClass: 'border-slate-200 bg-white text-slate-900 shadow-xs hover:border-slate-400',
    darkClass: 'border-slate-800 bg-slate-900 text-slate-100 hover:border-slate-600',
    dot: 'bg-emerald-500',
  },
  en_atencion: {
    label: 'En atención',
    icon: Activity,
    lightClass: 'border-teal-500/30 bg-teal-50/70 text-slate-900 shadow-sm hover:border-teal-500',
    darkClass: 'border-teal-700/60 bg-teal-950/40 text-teal-100 hover:border-teal-500',
    dot: 'bg-teal-500',
  },
  fuera_servicio: {
    label: 'Fuera de servicio',
    icon: Activity,
    lightClass: 'border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-400',
    darkClass: 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500',
    dot: 'bg-slate-400',
  },
}

function elapsedTimeInfo(timestamp) {
  if (!timestamp) return { text: 'hace un momento', minutes: 0, status: 'normal' }
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000))
  let status = 'normal'
  if (minutes >= 35) status = 'prolongada'
  else if (minutes >= 20) status = 'extendida'

  const text = minutes < 1 ? 'hace un momento' : `hace ${minutes} min`
  return { text, minutes, status }
}

export default function BoxCard({
  numero,
  especialidad,
  medico,
  estado,
  horaEntrada,
  equipamiento = [],
  proximoMedico = null,
  piso = null,
  onClick,
  isDarkMode = false,
}) {
  const [, setNow] = useState(Date.now())
  useEffect(() => {
    if (estado !== 'en_atencion') return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(timer)
  }, [estado])

  const current = states[estado] || states.disponible
  const cardTheme = isDarkMode ? current.darkClass : current.lightClass
  const Icon = current.icon
  const timeInfo = estado === 'en_atencion' ? elapsedTimeInfo(horaEntrada) : null

  return (
    <article
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${onClick ? 'cursor-pointer' : ''} ${cardTheme}`}
    >
      <div className={`absolute left-0 top-0 h-full w-1.5 ${current.dot}`} />

      <div>
        <div className="flex items-start justify-between gap-3 pl-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-60">Sala</p>
              {piso && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white/80 text-slate-700'}`}>
                  Piso {piso}
                </span>
              )}
            </div>
            <h3 className="mt-1 text-4xl font-black tracking-tight">{numero}</h3>
          </div>
          <div className="flex items-center gap-2">
            {onClick && (
              <span className={`hidden items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black uppercase shadow-xs group-hover:inline-flex ${isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-white/80 text-slate-700'}`}>
                <MousePointerClick size={12} /> Registrar Uso
              </span>
            )}
            <Icon size={27} strokeWidth={2.2} aria-hidden="true" />
          </div>
        </div>

        <div className="mt-5 border-t border-current/10 pt-4 pl-2">
          <p className="text-xs font-black uppercase tracking-wider opacity-60">{especialidad}</p>

          {/* Equipment Badges (Eptura Engage Style) */}
          {equipamiento.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {equipamiento.map((eq) => (
                <span key={eq} className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isDarkMode ? 'bg-slate-800/80 text-slate-300' : 'bg-white/70 text-slate-700'}`}>
                  {eq}
                </span>
              ))}
            </div>
          )}

          {estado === 'disponible' ? (
            <div className="mt-4">
              <p className="text-xl font-bold uppercase tracking-wide opacity-50">Disponible</p>
              {proximoMedico && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-extrabold opacity-75">
                  <CalendarClock size={13} className="shrink-0 text-teal-600" />
                  Próximo profesional: {proximoMedico}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <div className="rounded-xl bg-teal-600/10 p-2.5 border border-teal-600/20">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 block">Profesional Asignado:</span>
                <p className="flex items-center gap-2 text-lg font-black mt-0.5">
                  <UserRound size={18} className="text-teal-600" />
                  {medico || 'Profesional asignado'}
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-xs font-bold opacity-70">
                  {timeInfo ? timeInfo.text : current.label}
                </p>
                {timeInfo && timeInfo.status === 'prolongada' && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">
                    Uso prolongado (&gt;35m)
                  </span>
                )}
                {timeInfo && timeInfo.status === 'extendida' && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">
                    Uso extendido (&gt;20m)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-current/10 pt-3 pl-2 flex items-center justify-between">
        <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide ${isDarkMode ? 'bg-black/40' : 'bg-white/60'}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${current.dot}`} />
          {estado === 'en_atencion' ? 'Ocupado' : current.label}
        </p>
        {onClick && (
          <span className="text-xs font-extrabold opacity-75 group-hover:underline">
            {estado === 'en_atencion' ? 'Liberar Sala →' : 'Registrar Ingreso →'}
          </span>
        )}
      </div>
    </article>
  )
}
