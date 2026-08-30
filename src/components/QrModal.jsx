import { Printer, QrCode, Stethoscope, X } from 'lucide-react'

export default function QrModal({ box, onClose }) {
  if (!box) return null

  const targetUrl = `${window.location.origin}/box/${encodeURIComponent(box.numero)}`
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`

  function handlePrint() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta QR - Sala ${box.numero}</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; color: #0f172a; }
            .card { border: 4px solid #0f172a; border-radius: 24px; padding: 32px; max-width: 380px; margin: 0 auto; background: #ffffff; }
            .badge { background: #0f172a; color: #ffffff; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 6px 16px; border-radius: 20px; font-size: 12px; display: inline-block; }
            h1 { font-size: 48px; font-weight: 900; margin: 12px 0 4px 0; }
            p { font-size: 16px; color: #475569; font-weight: 700; margin: 0 0 24px 0; }
            img { width: 240px; height: 240px; border-radius: 12px; margin-bottom: 20px; }
            .footer { font-size: 12px; font-weight: 800; color: #0f766e; text-transform: uppercase; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">CR Ambulatorio · Piso ${box.piso || '-'}</span>
            <h1>SALA ${box.numero}</h1>
            <p>${box.especialidad?.nombre || 'Consulta Externa'}</p>
            <img src="${qrImageUrl}" alt="QR Code Sala ${box.numero}" />
            <div class="footer">Escanea para iniciar o finalizar atención</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8 text-center text-slate-900">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
          title="Cerrar"
        >
          <X size={20} />
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <QrCode size={30} />
        </div>

        <span className="mt-4 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-600">
          Piso {box.piso || '-'} · {box.especialidad?.nombre || 'Consulta Externa'}
        </span>

        <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-900">BOX {box.numero}</h2>
        <p className="mt-1 text-xs font-bold text-slate-500">Etiqueta QR lista para pegar en la puerta de la sala</p>

        {/* QR Image Box */}
        <div className="my-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 flex flex-col items-center justify-center">
          <img
            src={qrImageUrl}
            alt={`QR Box ${box.numero}`}
            className="h-56 w-56 rounded-xl border border-slate-200 shadow-md bg-white p-2"
          />
          <p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-teal-800">
            {targetUrl}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 py-3.5 text-sm font-black text-white shadow-lg transition-all hover:bg-teal-700 active:scale-[0.98]"
          >
            <Printer size={18} />
            Imprimir Etiqueta QR
          </button>
        </div>
      </div>
    </div>
  )
}
