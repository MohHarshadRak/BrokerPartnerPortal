import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useLoginMutation } from '../features/auth/authApi'
import { setCredentials } from '../features/auth/authSlice'
import { useToast } from './useToast'
// TEMPORARY — remove this import and the bypass block in handleLoginSubmit once the real login API is ready.
import { TEST_CREDENTIALS, TEST_USER } from '../features/auth/devTestCredentials'

function BrokerNetwork() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { toastNode, showSuccess } = useToast()
  const [activeTab, setActiveTab] = useState('login')

  const [loginForm, setLoginForm] = useState({ username: '', password: '' })

  const [login, { isLoading: isLoginLoading, error: loginError }] = useLoginMutation()
  const [loginAttempt, setLoginAttempt] = useState(0)

  const goToDashboard = (message) => {
    showSuccess(message)
    setTimeout(() => navigate('/dashboard'), 600)
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()

    // TEMPORARY test-credential bypass — remove this block once the real login API is ready.
    if (
      loginForm.username.trim().toLowerCase() === TEST_CREDENTIALS.username &&
      loginForm.password === TEST_CREDENTIALS.password
    ) {
      dispatch(setCredentials({ user: TEST_USER, token: 'dev-test-token' }))
      goToDashboard('Welcome back, Hydar.')
      return
    }

    try {
      const data = await login(loginForm).unwrap()
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
      console.error('Login failed', err)
      setLoginAttempt((n) => n + 1)
    }
  }

  return (
    <>
    <section className="brokerNetwork">
      <div className="container">
        <div className="brokerNetworkContainer">
          <div className="brokerNetworkContent">
            <h2>Welcome to the RAK Properties Broker Network</h2>
            <div className="brokerNetworkPara">
              <p>
                Partner with one of Ras Al Khaimah’s leading real estate developers. Join the
                official RAK Properties broker network and access the tools, information, and
                support needed to serve clients with confidence.
              </p>
              <p>
                The RAK Properties Broker Portal is built to simplify the way brokers connect
                with our portfolio. Approved partners can access official project information,
                receive updates, manage their profile, and work more efficiently with the RAK
                Properties team.
              </p>
              <p>
                The journey begins with a secure registration through UAE PASS, followed by a
                simple broker profile submission and approval process.
              </p>
            </div>
          </div>

          <div className="brokerNetworkTab">
            <ul className="nav nav-pills brokerTabs" role="tablist">
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link${activeTab === 'broker' ? ' active' : ''}`}
                  type="button"
                  onClick={() => setActiveTab('broker')}
                >
                  Become a Broker
                </button>
              </li>

              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link${activeTab === 'login' ? ' active' : ''}`}
                  type="button"
                  onClick={() => setActiveTab('login')}
                >
                  Broker Login
                </button>
              </li>
            </ul>

            <div className="tab-content">
              <div className={`tab-pane fade${activeTab === 'broker' ? ' show active' : ''}`}>
                <h3>Become RAK Properties Broker</h3>
                <p>
                  Registration is done securely through UAE PASS — no separate account or
                  password to create.
                </p>

                {/* Same UAE Pass authorize URL as the login button — the old app's
                    Default.aspx wires both its sign-in and sign-up buttons to the
                    identical redirect (same client_id/redirect_uri). The distinction
                    between "log in" and "sign up" only happens after UAE Pass returns:
                    Authenticate.aspx auto-logs in a matched identity, or shows its
                    registration wizard for one it doesn't recognize yet. */}
                <a href={`${import.meta.env.VITE_API_BASE_URL}/Broker/uaepass-login`} className="uaePassBtn">
                  <img src="/assets/img/fingerprint.svg" alt="fingerprint" />
                  SIGN UP WITH UAE PASS
                </a>
                {/* Freelancers register directly, no UAE Pass — same as the old app's
                    Default.aspx linkfreelancer_Click, which redirects straight to
                    BRegister/RegistrationForm02.aspx with no login step first. */}
                <a href={`${import.meta.env.VITE_API_BASE_URL}/Broker/freelancer-signup`} className="freelancerLink">
                  Are you a Freelancer?
                </a>
              </div>

              <div className={`tab-pane fade${activeTab === 'login' ? ' show active' : ''}`}>
                <h3>Existing Broker Login</h3>

                <form onSubmit={handleLoginSubmit}>
                  <div className="formGroup">
                    <label>Username</label>
                    <input
                      type="email"
                      placeholder="Username or Email Address"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    />
                  </div>

                  <div className="formGroup">
                    <label>Password</label>
                    <input
                      type="password"
                      placeholder="Your Password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    />
                  </div>
                  {loginError && (
                    <p className="formError" key={loginAttempt}>
                      {loginError.data?.message || 'Login failed. Please check your credentials.'}
                    </p>
                  )}

                  <div className="loginActions">
                    <button type="submit" className="loginBtn" disabled={isLoginLoading}>
                      {isLoginLoading ? 'LOGGING IN...' : 'LOGIN'}
                    </button>

                    <a href="#">Forgot Password</a>
                  </div>
                </form>
                <div className="divider">
                  <span>Or</span>
                </div>

                <a href={`${import.meta.env.VITE_API_BASE_URL}/Broker/uaepass-login`} className="uaePassBtn">
                  <img src="/assets/img/fingerprint.svg" alt="fingerprint" />
                  LOG IN WITH UAE PASS
                </a>
                {/* Freelancers register directly, no UAE Pass — same as the old app's
                    Default.aspx linkfreelancer_Click, which redirects straight to
                    BRegister/RegistrationForm02.aspx with no login step first. */}
                <a href={`${import.meta.env.VITE_API_BASE_URL}/Broker/freelancer-signup`} className="freelancerLink">
                  Are you a Freelancer?
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    {toastNode}
    </>
  )
}

export default BrokerNetwork
