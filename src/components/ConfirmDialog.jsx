function ConfirmDialog({ open, title, body, ctaLabel, done, onConfirm, onClose }) {
  if (!open) return null

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="confirm">
        <p className="eyebrow">{done ? 'Done' : 'Please confirm'}</p>
        <h3>{title}</h3>
        <p>{done || body}</p>
        <div className="confirm-actions">
          {!done && (
            <button className="btn" type="button" onClick={onConfirm}>
              {ctaLabel}
            </button>
          )}
          <button className="btn ghost" type="button" onClick={onClose}>
            {done ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
