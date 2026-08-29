import { useEffect, useMemo, useRef, useState } from 'react'
import { BellRing, Building2, Clock, LayoutGrid, Maximize2, Megaphone, Minimize2, MonitorDot, Moon, MousePointerClick, QrCode, Radio, RefreshCw, ShieldCheck, Sun, Volume2, VolumeX, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import BoxCard from './BoxCard'
import FiltroEspecialidad from './FiltroEspecialidad'
import QuickBoxModal from './QuickBoxModal'
import QrModal from './QrModal'
import EpturaFloorPlan from './EpturaFloorPlan'
import { hasSupabase, supabase } from '../lib/supabaseClient'
import { loadBoxes } from '../lib/dataService'

function speakAnnouncement(text) {
  // Sound disabled per user requirement
  return
}

function playChime() {
  // Sound disabled per user requirement
  return
}

export default function PantallaPublica() {
  const [boxes, setBoxes] = useState([])
  const [filter, setFilter] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeModalBox, setActiveModalBox] = useState(null)
  const [activeQrBox, setActiveQrBox] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'floorplan'
  const [time, setTime] = useState(new Date())
  const [patientCallBanner, setPatientCallBanner] = useState(null)
  const [supervisorNoticeBanner, setSupervisorNoticeBanner] = useState(null)
  const previousBoxesRef = useRef([])

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Supervisor Floor Notice Listener
  useEffect(() => {
    const handleSupervisorNotice = (event) => {
      const detail = event.detail || (event.key === 'cr-ambulatorio-supervisor-notice' ? JSON.parse(event.newValue || '{}') : null)
      if (!detail || !detail.mensaje) return
      setSupervisorNoticeBanner(detail)
      playChime()

      if (isSoundEnabled) {
        speakAnnouncement(`Aviso de la encargada de piso: ${detail.mensaje}`)
      }

      setTimeout(() => {
        setSupervisorNoticeBanner(null)
      }, 10000)
    }

    window.addEventListener('supervisor-notice', handleSupervisorNotice)
    window.addEventListener('storage', handleSupervisorNotice)
    return () => {
      window.removeEventListener('supervisor-notice', handleSupervisorNotice)
      window.removeEventListener('storage', handleSupervisorNotice)
    }
  }, [isSoundEnabled])

  // Patient Callout Listener (Voz y Banner)
  useEffect(() => {
    const handleCall = (event) => {
      const detail = event.detail || (event.key === 'cr-ambulatorio-last-call' ? JSON.parse(event.newValue || '{}') : null)
      if (!detail || !detail.boxNumero) return
      setPatientCallBanner(detail)
      playChime()

      if (isSoundEnabled) {
        const announcementText = `Atención paciente, favor dirigirse al Box ${detail.boxNumero}, ${detail.especialidadNombre}`
        speakAnnouncement(announcementText)
      }

      setTimeout(() => {
        setPatientCallBanner(null)
      }, 9000)
    }

    window.addEventListener('patient-called', handleCall)
    window.addEventListener('storage', handleCall)
    return () => {
      window.removeEventListener('patient-called', handleCall)
      window.removeEventListener('storage', handleCall)
    }
  }, [isSoundEnabled])

  const reloadData = () =>
    loadBoxes().then((data) => {
      // Compare status changes to play chime
      if (previousBoxesRef.current.length > 0 && isSoundEnabled) {
        const hasChanged = data.some((b) => {
          const prev = previousBoxesRef.current.find((p) => p.id === b.id)
          return prev && prev.estado !== b.estado
        })
        if (hasChanged) playChime()
      }
      previousBoxesRef.current = data
      setBoxes(data)
    }).catch((err) => setError(err.message))

  useEffect(() => {
    let mounted = true
    loadBoxes()
      .then((data) => {
        if (mounted) {
          previousBoxesRef.current = data
          setBoxes(data)
        }
      })
      .catch((reason) => mounted && setError(reason.message))
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atenciones' }, reloadData)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'avisos' }, ({ new: aviso }) => {
      const detail = aviso?.payload
      if (aviso?.tipo === 'llamado' && detail?.boxNumero) {
        window.dispatchEvent(new CustomEvent('patient-called', { detail }))
      }
      if (aviso?.tipo === 'supervisora' && detail?.mensaje) {
        window.dispatchEvent(new CustomEvent('supervisor-notice', { detail }))
      }
    })
    .subscribe()

    return () => {
      mounted = false
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const specialties = useMemo(() => [...new Set(boxes.map((box) => box.especialidad?.nombre).filter(Boolean))], [boxes])
  const visible = boxes.filter((box) => filter === 'todas' || box.especialidad?.nombre === filter)
  const available = visible.filter((box) => box.estado === 'disponible').length
  const inAttention = visible.filter((box) => box.estado === 'en_atencion').length
  const occupancyRate = visible.length > 0 ? Math.round((inAttention / visible.length) * 100) : 0

  const grouped = visible.reduce((groups, box) => {
    const key = box.especialidad?.nombre || 'Sin especialidad'
    ;(groups[key] ||= []).push(box)
    return groups
  }, {})

  const formattedDate = time.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const formattedTime = time.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <main className={`min-h-screen transition-colors duration-300 px-5 py-6 md:px-10 md:py-9 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#f6f7f3] text-slate-950'}`}>
      <header className={`mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-5 border-b pb-7 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <div>
          <div className="mb-3 flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em] text-teal-500">
            <MonitorDot size={20} />
            CR Ambulatorio · Tótem TV
          </div>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">Disponibilidad de Boxes</h1>
          <p className={`mt-3 text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Consulta externa · {hasSupabase ? 'Conectado a Supabase Realtime' : 'Modo demostración'}
          </p>
        </div>

        {/* PRO Kiosk Controls Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Digital Clock */}
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 shadow-sm ${isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`}>
            <Clock size={20} className="text-teal-600" />
            <div className="text-right">
              <div className="text-lg font-black tracking-tight font-mono">{formattedTime}</div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-60">{formattedDate}</div>
            </div>
          </div>

          <FiltroEspecialidad value={filter} onChange={setFilter} specialties={specialties} />

          {/* Eptura Engage View Mode Switcher */}
          <div className={`flex items-center rounded-2xl border p-1 shadow-sm ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${viewMode === 'grid' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              title="Vista Grilla por Especialidad"
            >
              <LayoutGrid size={15} /> Grilla
            </button>
            <button
              onClick={() => setViewMode('floorplan')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${viewMode === 'floorplan' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              title="Mapa Arquitectónico de Pisos (Eptura Engage Style)"
            >
              <Building2 size={15} /> Mapa Pisos (Eptura)
            </button>
          </div>

          {/* Theme Switcher */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${isDarkMode ? 'border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
            title={isDarkMode ? 'Modo Claro' : 'Modo Oscuro TV'}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${isSoundEnabled ? (isDarkMode ? 'border-teal-800 bg-teal-950/60 text-teal-400' : 'border-teal-200 bg-teal-50 text-teal-700') : (isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-500' : 'border-slate-200 bg-white text-slate-400')}`}
            title={isSoundEnabled ? 'Sonido de cambio activado' : 'Sonido silenciado'}
          >
            {isSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className={`hidden h-11 w-11 items-center justify-center rounded-2xl border transition-all md:flex ${isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
            title="Pantalla Completa Kiosk"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </header>

      {/* Capacity & Status Gauge */}
      <div className={`mx-auto mt-6 flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 shadow-xs ${isDarkMode ? 'border-teal-900/60 bg-teal-950/30 text-teal-200' : 'border-teal-200 bg-teal-50/80 text-slate-800'}`}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider opacity-75">Ocupación Global:</span>
          <div className="h-3 w-28 overflow-hidden rounded-full bg-slate-300">
            <div className="h-full bg-teal-600 transition-all duration-500" style={{ width: `${occupancyRate}%` }} />
          </div>
          <span className="text-xs font-black">({occupancyRate}%)</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-black text-emerald-600">{available} libres</div>
          <div className="rounded-xl bg-rose-500/20 px-4 py-2 text-sm font-black text-rose-600">{inAttention} ocupados</div>
        </div>
      </div>

      {error && <div className="mx-auto mt-6 max-w-7xl rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">No se pudo cargar Supabase: {error}</div>}

      {loading ? (
        <div className="mx-auto flex max-w-7xl items-center gap-3 py-20 text-slate-500">
          <RefreshCw className="animate-spin" />Cargando disponibilidad...
        </div>
      ) : viewMode === 'floorplan' ? (
        <section className="mx-auto max-w-7xl py-8">
          <EpturaFloorPlan
            boxes={visible}
            isDarkMode={isDarkMode}
          />
        </section>
      ) : (
        <section className="mx-auto max-w-7xl space-y-10 py-8">
          {Object.entries(grouped).map(([specialty, items]) => (
            <div key={specialty}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{specialty}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{items.length} boxes</span>
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
                      isDarkMode={isDarkMode}
                      onClick={() => setActiveModalBox(box)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Quick Box Assign / Release Modal */}
      {activeModalBox && (
        <QuickBoxModal
          box={activeModalBox}
          onClose={() => setActiveModalBox(null)}
          onRefresh={reloadData}
        />
      )}

      {/* QR Code Printable Sticker Modal */}
      {activeQrBox && (
        <QrModal
          box={activeQrBox}
          onClose={() => setActiveQrBox(null)}
        />
      )}
    </main>
  )
}
