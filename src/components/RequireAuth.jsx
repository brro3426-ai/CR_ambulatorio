import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { hasSupabase, supabase } from '../lib/supabaseClient'

const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'

export default function RequireAuth({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(hasSupabase)

  useEffect(() => {
    if (!hasSupabase) return undefined

    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session)
        setLoading(false)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  if (!hasSupabase && !demoMode) return <Navigate to="/admin" replace />
  if (!hasSupabase && demoMode) return children
  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f6f7f3] text-slate-500">Verificando acceso...</main>
  if (!session) return <Navigate to="/admin" replace />
  return children
}
