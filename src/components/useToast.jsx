import { useCallback, useRef, useState } from 'react'

export function useToast() {
  const [message, setMessage] = useState('')
  const [type, setType] = useState('default')
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  const showToast = useCallback((msg, toastType = 'default') => {
    setMessage(msg)
    setType(toastType)
    setVisible(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 3200)
  }, [])

  const showError = useCallback((msg) => showToast(msg, 'error'), [showToast])
  const showSuccess = useCallback((msg) => showToast(msg, 'success'), [showToast])

  const toastNode = (
    <div className={`appToast${visible ? ' show' : ''} ${type}`} role="status" aria-live="polite">
      {message}
    </div>
  )

  return { toastNode, showToast, showError, showSuccess }
}
