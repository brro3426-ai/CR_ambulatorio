import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock, LayoutGrid, MonitorDot, RefreshCw, ShieldCheck } from 'lucide-react'
import BoxCard from './BoxCard'
import { hasSupabase, supabase } from '../lib/supabaseClient'
import { loadPublicBoxes } from '../lib/dataService'

export default function PantallaPublica() {
  const [boxes, setBoxes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [time, setTime] = useState(new Date())
  const [activeSpecialtyIndex, setActiveSpecialtyIndex] = useState(0)
  const previousBoxesRef = useRef([])

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const reloadData = () => {
    setError('')
    return loadPublicBoxes().then((data) => {
      previousBoxesRef.current = data
      setBoxes(data)
    }).catch((err) => setError(err.message || 'No se pudo actualizar la disponibilidad.'))
  }

  useEffect(() => {
    let mounted = true
    loadPublicBoxes()
      .then((data) => {
        if (mounted) {
          previousBoxesRef.current = data
          setBoxes(data)
        }
      })
      .catch((reason) => mounted && setError(reason.message || 'No se pudo cargar la disponibilidad.'))
      .finally(() => mounted && setLoading(false))

    // 2.5s Polling fallback for guaranteed live TV updates
    const timer = setInterval(() => {
      if (mounted) reloadData()
    }, 2500)

    if (!hasSupabase) {
      const refreshDemo = () => reloadData()
      window.addEventListener('demo-boxes-changed', refreshDemo)
      window.addEventListener('storage', refreshDemo)
      return () => {
        mounted = false
        clearInterval(timer)
        window.removeEventListener('demo-boxes-changed', refreshDemo)
        window.removeEventListener('storage', refreshDemo)
      }
    }

    const channel = supabase
      .channel('availability-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boxes' }, reloadData)
    .subscribe()

    return () => {
      mounted = false
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [])

  const specialties = useMemo(() => [...new Set(boxes.map((box) => box.especialidad?.nombre).filter(Boolean))], [boxes])
  const activeSpecialty = specialties[activeSpecialtyIndex] || specialties[0]
  const visible = boxes.filter((box) => box.especialidad?.nombre === activeSpecialty)
  const available = visible.filter((box) => box.estado === 'disponible').length
  const inAttention = visible.filter((box) => box.estado === 'en_atencion').length

  useEffect(() => {
    if (specialties.length < 2) return undefined
    setActiveSpecialtyIndex((current) => current % specialties.length)
    const timer = setInterval(() => setActiveSpecialtyIndex((current) => (current + 1) % specialties.length), 15000)
    return () => clearInterval(timer)
  }, [specialties.length])

  const grouped = visible.reduce((groups, box) => {
    const key = box.especialidad?.nombre || 'Sin especialidad'
    ;(groups[key] ||= []).push(box)
    return groups
  }, {})

  const formattedDate = time.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const formattedTime = time.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#edf1f2] px-5 py-6 text-slate-950 md:px-10 md:py-9">
      <header className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-5 border-b-2 border-slate-300 pb-6">
        <div>
          <div className="mb-3 flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em] text-teal-500">
            <MonitorDot size={20} />
            CR Ambulatorio · Tótem TV
          </div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">Disponibilidad de Salas</h1>
          <p className="mt-3 text-base text-slate-500">Disponibilidad en tiempo real</p>
        </div>

        {/* PRO Kiosk Controls Bar */}
        <div className="flex items-center gap-3">
          {/* Live Digital Clock */}
          <div className="flex items-center gap-3 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-slate-800 shadow-sm">
            <Clock size={20} className="text-teal-600" />
            <div className="text-right">
              <div className="text-lg font-black tracking-tight font-mono">{formattedTime}</div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-60">{formattedDate}</div>
            </div>
          </div>

        </div>
      </header>

      <div className="mx-auto mt-6 flex max-w-7xl items-center justify-between border-l-4 border-teal-700 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">Área en pantalla</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{activeSpecialty || 'Cargando áreas'}</h2>
        </div>
        <div className="text-right text-sm font-bold text-slate-500">
          <span className="text-slate-950">{available}</span> libres · <span className="text-slate-950">{inAttention}</span> en atención
          <div className="mt-1 text-xs font-semibold">Vista {specialties.length ? activeSpecialtyIndex + 1 : 0} de {specialties.length}</div>
        </div>
      </div>

      {error && (
        <div className="mx-auto mt-6 flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <span>No se pudo cargar la disponibilidad: {error}</span>
          <button onClick={reloadData} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-black text-white hover:bg-rose-800">Reintentar</button>
        </div>
      )}

      {loading ? (
        <div className="mx-auto flex max-w-7xl items-center gap-3 py-20 text-slate-500">
          <RefreshCw className="animate-spin" />Cargando disponibilidad...
        </div>
      ) : !error && boxes.length === 0 ? (
        <div className="mx-auto max-w-7xl py-20 text-center">
          <LayoutGrid className="mx-auto text-slate-400" size={32} />
          <h2 className="mt-3 text-xl font-black text-slate-900">No hay boxes disponibles</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">El inventario aún no tiene salas publicables para este entorno.</p>
        </div>
      ) : (
        <section className="mx-auto max-w-7xl space-y-10 py-8">
          {Object.entries(grouped).map(([specialty, items]) => (
            <div key={specialty}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black tracking-tight text-slate-900">{specialty}</h2>
                  <span className="rounded-sm bg-slate-200 px-2.5 py-1 text-xs font-black text-slate-600">{items.length} boxes</span>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((box) => (
                  <div key={box.id} className="relative">
                    <BoxCard
                      numero={box.numero}
                      especialidad={specialty}
                      medico={box.medico}
                      estado={box.estado}
                      horaEntrada={box.horaEntrada}
                      equipamiento={box.equipamiento}
                      proximoMedico={box.proximoMedico}
                      piso={box.piso}
                      isDarkMode={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <footer className="mx-auto mt-8 flex max-w-7xl items-center gap-2 border-t border-slate-300 pt-5 text-xs font-semibold text-slate-500">
        <ShieldCheck size={16} className="shrink-0 text-teal-600" />
        <span>Pantalla pública protegida: muestra solo disponibilidad de boxes. No expone pacientes, agendas ni datos clínicos.</span>
      </footer>
    </main>
  )
}
