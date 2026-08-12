import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import '../styles/portal.css'
import '../styles/signin.css'
import { useLoginMutation, useForgotPasswordMutation } from '../features/auth/authApi'
import { setCredentials, logout } from '../features/auth/authSlice'
import { useToast } from '../components/useToast'
// TEMPORARY — remove this import and the bypass block in handleSubmit once the real login API is ready.
import { TEST_CREDENTIALS, TEST_USER } from '../features/auth/devTestCredentials'

// UAE Pass login is still fully working (see /api/Broker/uaepass-login) — this
// new design just doesn't show it. Kept wired but hidden per product decision;
// flip to true to bring the button back without touching anything else here.
const SHOW_UAE_PASS = false

function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { toastNode, showSuccess } = useToast()
  const forgotInputRef = useRef(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')

  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotId, setForgotId] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotError, setForgotError] = useState('')

  const [login, { isLoading }] = useLoginMutation()
  const [forgotPassword, { isLoading: sendingForgotLink }] = useForgotPasswordMutation()

  // If the legacy app's logout sent the browser back here (?loggedOut=1), any
  // token from an earlier SSO handoff is stale — clear it so a stray token in
  // localStorage can't silently keep this app "logged in" after the user
  // explicitly logged out on the old side.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('loggedOut') === '1') {
      dispatch(logout())
    }
    // Registration "resume" emails link back to this bare root (see PortalSettings:SignInUrl
    // on the API) — forward bid/seccode straight into the registration wizard.
    if (params.get('bid') && params.get('seccode')) {
      navigate(`/register?${params.toString()}`, { replace: true })
    }
  }, [dispatch, navigate])

  const goToDashboard = (message) => {
    showSuccess(message)
    setTimeout(() => navigate('/dashboard'), 600)
  }

  const toggleForgot = (e) => {
    e.preventDefault()
    setForgotOpen((open) => !open)
    setForgotSent(false)
    setForgotError('')
  }

  useEffect(() => {
    if (forgotOpen) forgotInputRef.current?.focus()
  }, [forgotOpen])

  const sendForgotLink = async () => {
    if (!forgotId.trim()) return
    setForgotError('')
    try {
      await forgotPassword(forgotId.trim()).unwrap()
      setForgotSent(true)
    } catch (err) {
      setForgotError(err?.data?.message || 'We could not send a reset link. Please try again.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!username.trim()) errors.username = true
    if (!password.trim()) errors.password = true
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setFormError('')

    // TEMPORARY test-credential bypass — remove this block once the real login API is ready.
    if (username.trim().toLowerCase() === TEST_CREDENTIALS.username && password === TEST_CREDENTIALS.password) {
      dispatch(setCredentials({ user: TEST_USER, token: 'dev-test-token' }))
      goToDashboard('Welcome back, Hydar.')
      return
    }

    try {
      const data = await login({ username, password }).unwrap()
      dispatch(setCredentials(data))

      // The new portal's job is authenticating the broker, not hosting their
      // dashboard — hand off to the legacy app's own session via the signed
      // URL the API returned, same as the UAE Pass flow already does.
      if (data.oldAppSsoUrl) {
        showSuccess('Welcome back.')
        setTimeout(() => {
          window.location.href = data.oldAppSsoUrl
        }, 600)
        return
      }

      goToDashboard('Welcome back.')
    } catch (err) {
      setFormError(err?.data?.message || 'Incorrect username or password. Please try again or reset your password.')
    }
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
          <h1>Welcome back</h1>
          <p className="lead">Sign in to manage your portfolio, inventory and leads with RAK Properties.</p>

          {formError && (
            <div className="form-error is-visible" role="alert">
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className={`field${fieldErrors.username ? ' has-error' : ''}`}>
              <label htmlFor="UserName">Username</label>
              <div className="control">
                <input
                  type="text"
                  id="UserName"
                  placeholder="Enter your username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <p className="field-msg">Please enter your username.</p>
            </div>

            <div className={`field${fieldErrors.password ? ' has-error' : ''}`}>
              <label htmlFor="Password">Password</label>
              <div className="control">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="Password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <p className="field-msg">Please enter your password.</p>
            </div>

            <div className="row-between">
              <label className="remember">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Keep me signed in
              </label>
              <a className="link-soft" href="#" onClick={toggleForgot}>
                Forgot password?
              </a>
            </div>

            <div className={`forgot-box${forgotOpen ? ' show' : ''}`}>
              <p>Enter your registered email and we&rsquo;ll send you a reset link.</p>
              <div className="forgot-row">
                <input
                  type="email"
                  placeholder="Registered email"
                  aria-label="Registered email"
                  ref={forgotInputRef}
                  value={forgotId}
                  onChange={(e) => setForgotId(e.target.value)}
                  disabled={sendingForgotLink}
                />
                <button type="button" className="btn-small" onClick={sendForgotLink} disabled={sendingForgotLink}>
                  {sendingForgotLink ? 'Sending…' : 'Send link'}
                </button>
              </div>
              {forgotError && <p className="forgot-error show">{forgotError}</p>}
              <p className={`forgot-ok${forgotSent ? ' show' : ''}`}>
                &#10003; A password reset link is on its way to your email.
              </p>
            </div>

            <button type="submit" className="btn" disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {SHOW_UAE_PASS && (
            <>
              <div className="divider">Or</div>
              <a
                href={`${import.meta.env.VITE_API_BASE_URL}/Broker/uaepass-login`}
                className="btn btn-outline"
              >
                Sign in with UAE Pass
              </a>
            </>
          )}

          <div className="divider">New to RAK Properties?</div>
          <p className="join-copy">
            Become a RAK Properties broker &mdash; join our network and manage your clients&rsquo; portfolio with us
            through a dedicated portal. Pick your registration option and our team will get back to you.
          </p>

          <div className="reg-options">
            <Link className="reg-card" to="/register?type=freelancer">
              <span className="t">Freelancer</span>
              <span className="d">Independent agents registering with a personal profile.</span>
              <span className="go">Register &rarr;</span>
            </Link>
            <Link className="reg-card" to="/register?type=agency">
              <span className="t">Licensed Agency</span>
              <span className="d">Agents holding a valid trade license for brokerage.</span>
              <span className="go">Register &rarr;</span>
            </Link>
            <Link className="reg-card" to="/register?type=lease">
              <span className="t">Leasing Broker</span>
              <span className="d">Brokerage companies registering to transact RAK Properties leases.</span>
              <span className="go">Register &rarr;</span>
            </Link>
          </div>

          <div className="page-foot">
            <span>&reg; RAK Properties 2026 &mdash; All Rights Reserved</span>
            <a href="https://www.rakproperties.ae/our-properties/" target="_blank" rel="noopener noreferrer">
              Our properties
            </a>
            <a href="https://www.rakproperties.ae/contact" target="_blank" rel="noopener noreferrer">
              Contact us
            </a>
          </div>
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
      {toastNode}
    </div>
  )
}

export default LoginPage
