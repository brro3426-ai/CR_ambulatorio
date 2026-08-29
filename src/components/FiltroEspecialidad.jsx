export default function FiltroEspecialidad({ value, onChange, specialties }) {
  return (
    <label className="flex items-center gap-3 text-sm font-bold text-slate-600">
      <span>Especialidad</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
        <option value="todas">Todas</option>
        {specialties.map((specialty) => <option key={specialty} value={specialty}>{specialty}</option>)}
      </select>
    </label>
  )
}
