import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

export default function QRScanner({ onScan, onClose }) {
  const scannerRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [error, setError] = useState(null)
  const instanceRef = useRef(null)

  useEffect(() => {
    let scanner = null

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        scanner = new Html5Qrcode('qr-reader-container')
        instanceRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            onScan(decodedText)
            scanner.stop().catch(() => {})
          },
          () => {}
        )
        setStarted(true)
      } catch (err) {
        console.error('QR Scanner error:', err)
        setError('Camera not available. Please enter details manually.')
      }
    }

    initScanner()

    return () => {
      if (instanceRef.current) {
        instanceRef.current.stop().catch(() => {})
      }
    }
  }, [onScan])

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Animated frame */}
      <div className="relative w-72 h-72 mx-auto">
        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-kidbank-purple rounded-tl-lg z-10" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-kidbank-purple rounded-tr-lg z-10" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-kidbank-purple rounded-bl-lg z-10" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-kidbank-purple rounded-br-lg z-10" />

        {/* Scanner line animation */}
        {started && (
          <div
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-kidbank-purple to-transparent z-10"
            style={{
              animation: 'scanLine 2s ease-in-out infinite',
            }}
          />
        )}

        <style>{`
          @keyframes scanLine {
            0% { top: 10%; }
            50% { top: 90%; }
            100% { top: 10%; }
          }
        `}</style>

        <div id="qr-reader-container" className="w-full h-full overflow-hidden rounded-2xl bg-gray-900" />
      </div>

      {error ? (
        <div className="text-center">
          <p className="font-display font-700 text-red-500 text-sm mb-2">{error}</p>
        </div>
      ) : !started ? (
        <div className="flex items-center gap-2 text-gray-500">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-display font-700 text-sm">Starting camera…</span>
        </div>
      ) : (
        <p className="font-display font-700 text-gray-500 text-sm text-center">
          Point camera at any QR code or barcode 📷
        </p>
      )}

      <button
        onClick={onClose}
        className="text-sm font-display font-700 text-gray-400 hover:text-gray-600 transition-colors underline"
      >
        Cancel scanning
      </button>
    </div>
  )
}
