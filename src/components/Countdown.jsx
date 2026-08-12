import { useEffect, useState } from 'react'

// Live-ticking HH:MM:SS countdown to an absolute timestamp (ms since epoch). Extracted from
// BookingsPage.jsx so ReservationWizard's unit-hold banner can reuse the same pattern.
function Countdown({ expiresAt }) {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()))
  useEffect(() => {
    const id = setInterval(() => setRemaining(Math.max(0, expiresAt - Date.now())), 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  const s = Math.floor(remaining / 1000)
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return (
    <span className="countdown">
      {h}:{m}:{sec}
    </span>
  )
}

export default Countdown
