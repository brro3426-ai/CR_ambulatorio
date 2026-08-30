import { useEffect, useState } from 'react'
import { Activity, CalendarClock, DoorOpen, MousePointerClick, Stethoscope, UserRound } from 'lucide-react'

const states = {
  disponible: {
    label: 'DISPONIBLE',
    badgeClass: 'bg-emerald-600 text-white border-emerald-700 shadow-sm',
    lightClass: 'border-emerald-300 bg-white text-slate-900 shadow-xs hover:border-emerald-500 hover:shadow-md',
    darkClass: 'border-emerald-800/80 bg-slate-900 text-slate-100 hover:border-emerald-500',
    dot: 'bg-emerald-500',
    dotGlow: 'bg-emerald-400 animate-pulse',
  },
  en_atencion: {
    label: 'OCUPADO / EN ATENCIÓN',
    badgeClass: 'bg-rose-600 text-white border-rose-700 shadow-sm animate-pulse',
    lightClass: 'border-rose-300 bg-rose-50/40 text-slate-900 shadow-sm hover:border-rose-500 hover:shadow-md',
    darkClass: 'border-rose-800/80 bg-rose-950/30 text-rose-100 hover:border-rose-500',
    dot: 'bg-rose-500',
    dotGlow: 'bg-rose-400 animate-ping',
  },
  fuera_servicio: {
    label: 'FUERA DE SERVICIO',
    badgeClass: 'bg-slate-500 text-white border-slate-600',
    lightClass: 'border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-400',
    darkClass: 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500',
    dot: 'bg-slate-400',
    dotGlow: 'bg-slate-300',
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
            {/* BADGE DE ESTADO GIGANTE Y VISIBLE: DISPONIBLE vs OCUPADO */}
            <span className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black uppercase tracking-wider ${current.badgeClass}`}>
              <span className={`h-2 w-2 rounded-full bg-white`} />
              {estado === 'en_atencion' ? 'OCUPADO' : estado === 'disponible' ? 'DISPONIBLE' : 'FUERA DE SERVICIO'}
            </span>
          </div>
        </div>

        <div className="mt-4 border-t border-current/10 pt-4 pl-2">
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
            <div className="mt-3">
              {medico ? (
                <div className="rounded-xl bg-emerald-500/10 p-3 border border-emerald-500/30">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">Profesional en Sala (Listo para atender):</span>
                  <p className="flex items-center gap-2 text-base font-black text-emerald-950 mt-0.5">
                    <UserRound size={17} className="text-emerald-700" />
                    {medico}
                  </p>
                  <span className="text-[11px] font-bold text-emerald-700 mt-1 block">🟢 Sala Libre · Esperando llamado de paciente</span>
                </div>
              ) : proximoMedico ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-extrabold opacity-75">
                  <CalendarClock size={13} className="shrink-0 text-teal-600" />
                  Próximo profesional: {proximoMedico}
                </p>
              ) : (
                <p className="text-sm font-black text-emerald-700 uppercase mt-2">✓ Sala libre para asignación</p>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <div className="rounded-xl bg-rose-500/10 p-3 border border-rose-500/30">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 block">Consulta en Curso con:</span>
                <p className="flex items-center gap-2 text-base font-black text-rose-950 mt-0.5">
                  <UserRound size={17} className="text-rose-700" />
                  {medico || 'Profesional asignado'}
                </p>
                <span className="text-[11px] font-black text-rose-700 mt-1 block">🔴 Paciente en atención dentro de sala</span>
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

      <div className="mt-4 border-t border-current/10 pt-3 pl-2 flex items-center justify-between">
        <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${isDarkMode ? 'bg-black/40' : 'bg-white/60'}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${current.dot}`} />
          {estado === 'en_atencion' ? '🔴 OCUPADO' : estado === 'disponible' ? '🟢 DISPONIBLE' : '⚪ FUERA DE SERVICIO'}
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
