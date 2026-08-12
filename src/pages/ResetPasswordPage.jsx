import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import '../styles/portal.css'
import '../styles/signin.css'
import { useValidateResetLinkQuery, useResetPasswordMutation } from '../features/auth/authApi'

// Landing page for the link emailed by LoginPage.jsx's "Forgot password?" flow
// (see BrokerController.ForgotPassword/AuthService.ForgotBrokerPasswordAsync).
// Mirrors the legacy RAKPBrokeragePortal's PasswordReset.aspx: validates the
// ref/token pair is still live before showing the new-password form, and
// mirrors its client-side password rule (>=8 chars, at least one letter and
// one number) — the API enforces the same rule server-side too.
function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const ref = searchParams.get('ref')
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [done, setDone] = useState(false)

  const hasLinkParams = Boolean(ref && token)
  const {
    isLoading: validating,
    isError: linkInvalid,
  } = useValidateResetLinkQuery({ ref, token }, { skip: !hasLinkParams })

  const [resetPassword, { isLoading: submitting }] = useResetPasswordMutation()

  const passwordRule = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!passwordRule.test(newPassword)) errors.newPassword = true
    if (newPassword !== confirmPassword) errors.confirmPassword = true
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setFormError('')
    try {
      await resetPassword({ ref: Number(ref), token, newPassword }).unwrap()
      setDone(true)
    } catch (err) {
      setFormError(err?.data?.message || 'We could not reset your password. Please try again.')
    }
  }

  let body
  if (!hasLinkParams || linkInvalid) {
    body = (
      <>
        <p className="lead">
          This password reset link is invalid or has expired. Please request a new one from the sign-in page.
        </p>
        <Link className="btn" to="/">
          Back to sign in
        </Link>
      </>
    )
  } else if (validating) {
    body = <p className="lead">Checking your link&hellip;</p>
  } else if (done) {
    body = (
      <>
        <p className="lead">Your password has been reset successfully.</p>
        <Link className="btn" to="/">
          Sign in
        </Link>
      </>
    )
  } else {
    body = (
      <>
        <p className="lead">Choose a new password for your broker portal account.</p>

        {formError && (
          <div className="form-error is-visible" role="alert">
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className={`field${fieldErrors.newPassword ? ' has-error' : ''}`}>
            <label htmlFor="NewPassword">New password</label>
            <div className="control">
              <input
                type={showPassword ? 'text' : 'password'}
                id="NewPassword"
                placeholder="Enter your new password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="toggle-pass"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((show) => !show)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="field-msg">Must be at least 8 characters and include a letter and a number.</p>
          </div>

          <div className={`field${fieldErrors.confirmPassword ? ' has-error' : ''}`}>
            <label htmlFor="ConfirmPassword">Confirm password</label>
            <div className="control">
              <input
                type={showPassword ? 'text' : 'password'}
                id="ConfirmPassword"
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <p className="field-msg">Passwords must match.</p>
          </div>

          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
      </>
    )
  }

  return (
    <div className="signin">
      <div className="login-wrap">
        <main className="panel-form">
          <div className="logo">
            <a href="https://www.rakproperties.ae/" aria-label="RAK Properties">
              <img src={`${import.meta.env.BASE_URL}assets/img/rak_logo.svg`} alt="RAK Properties" />
            </a>
          </div>

          <p className="eyebrow">Broker Portal</p>
          <h1>Reset your password</h1>

          {body}
        </main>

        <aside className="panel-visual" aria-hidden="true">
          <img
            className="hero"
            src="https://www.rakproperties.ae/wp-content/uploads/2024/02/investment-opp2.jpg"
            alt=""
          />
          <div className="visual-copy">
            <p className="eyebrow">Leading Community Developer in Ras Al Khaimah</p>
            <h2>Enhancing lives and places</h2>
            <p>Partner with us to offer your clients waterfront communities across Mina, Raha Island and Marjan.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default ResetPasswordPage
