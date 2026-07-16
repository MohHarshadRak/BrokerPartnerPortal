import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import '../styles/portal.css'
import '../styles/registration.css'

const EMIRATES = ['Ras Al Khaimah', 'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Fujairah']
const MOBILE_CODES = ['+971', '+966', '+974', '+973', '+968', '+965', 'other']

const EMPTY_FORM = {
  companyName: '',
  tradeLicenseNo: '',
  licenseEmirate: '',
  trn: '',
  licenseFile: null,
  firstName: '',
  lastName: '',
  email: '',
  mobileCode: '+971',
  mobile: '',
  nationality: '',
  emirate: '',
  emiratesId: '',
  brokerCard: '',
  idFile: null,
  experience: '',
}

// NOTE: this page is a UI-only conversion of the marketing team's new design
// (broker-registration.html) — same as that source file, submission is a
// client-side mock (validates, then shows the success panel) with no real
// backend call yet. Wiring a real submission endpoint is a separate follow-up.
function RegistrationPage() {
  const [searchParams] = useSearchParams()
  const [brokerType, setBrokerType] = useState(
    searchParams.get('type') === 'agency' ? 'agency' : 'freelancer'
  )
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [consent, setConsent] = useState(false)
  const [consentError, setConsentError] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [reference] = useState(
    () => `BRK-APP-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`
  )

  useEffect(() => {
    document.body.style.background = 'var(--rak-mist)'
    return () => {
      document.body.style.background = ''
    }
  }, [])

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const isAgency = brokerType === 'agency'

  const handleSubmit = (e) => {
    e.preventDefault()
    const errors = {}
    if (!form.firstName.trim()) errors.firstName = true
    if (!form.lastName.trim()) errors.lastName = true
    if (!/.+@.+\..+/.test(form.email.trim())) errors.email = true
    if (!form.mobile.trim()) errors.mobile = true
    if (isAgency) {
      if (!form.companyName.trim()) errors.companyName = true
      if (!form.tradeLicenseNo.trim()) errors.tradeLicenseNo = true
    } else if (!form.emiratesId.trim()) {
      errors.emiratesId = true
    }
    setFieldErrors(errors)
    setConsentError(!consent)

    if (Object.keys(errors).length === 0 && consent) {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="registration">
        <header className="topbar">
          <div className="topbar-inner">
            <img src="/assets/img/rak_logo.svg" alt="RAK Properties" />
            <Link className="back" to="/">
              &larr; Back to sign in
            </Link>
          </div>
        </header>
        <main className="page">
          <div className="success show" role="status">
            <p className="eyebrow">Application received</p>
            <h2>Thank you — your application is in review</h2>
            <p className="ref">
              Reference <b>{reference}</b> &nbsp;&middot;&nbsp; <span className="status-chip">In review</span>
            </p>
            <p>Our broker relations team is now verifying your details. Here&rsquo;s what happens next:</p>
            <ol className="next-steps">
              <li>
                <b>Verification</b> &mdash; document and licence checks, usually within 2 working days.
              </li>
              <li>
                <b>Agreement</b> &mdash; you&rsquo;ll receive the agency agreement to sign electronically.
              </li>
              <li>
                <b>Access</b> &mdash; your portal credentials arrive by email once everything is countersigned.
              </li>
            </ol>
            <p className="small">We&rsquo;ll keep you updated by email &mdash; or call toll free 800 4020 quoting your reference.</p>
            <p style={{ marginTop: 22 }}>
              <Link className="btn" to="/">
                Back to sign in
              </Link>
            </p>
          </div>
        </main>
        <footer>&reg; RAK Properties 2026 &mdash; All Rights Reserved</footer>
      </div>
    )
  }

  return (
    <div className="registration">
      <header className="topbar">
        <div className="topbar-inner">
          <img src="/assets/img/rak_logo.svg" alt="RAK Properties" />
          <Link className="back" to="/">
            &larr; Back to sign in
          </Link>
        </div>
      </header>

      <main className="page">
        <p className="eyebrow">Broker Portal &mdash; Registration</p>
        <h1>Become a RAK Properties broker</h1>
        <p className="lead">
          We would like to invite you to the RAK Properties family, so we can work together to meet your clients&rsquo;
          needs &mdash; with a dedicated portal to help you manage your portfolio with us. Choose your registration
          option below; our team will review your application and get back to you.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="type-select" role="radiogroup" aria-label="Registration type">
            <label className={`type-card${!isAgency ? ' active' : ''}`}>
              <input
                type="radio"
                name="BrokerType"
                value="freelancer"
                checked={!isAgency}
                onChange={() => setBrokerType('freelancer')}
              />
              <span className="t">I am a Freelancer</span>
              <span className="d">Independent broker registering as an individual.</span>
              <span className="mark" aria-hidden="true"></span>
            </label>
            <label className={`type-card${isAgency ? ' active' : ''}`}>
              <input
                type="radio"
                name="BrokerType"
                value="agency"
                checked={isAgency}
                onChange={() => setBrokerType('agency')}
              />
              <span className="t">I am an Agent holding a Trade License</span>
              <span className="d">Brokerage company licensed in the UAE.</span>
              <span className="mark" aria-hidden="true"></span>
            </label>
          </div>

          {isAgency && (
            <section className="card">
              <h2>Company details</h2>
              <p className="sub">As stated on your trade license.</p>
              <div className="grid">
                <div className={`field${fieldErrors.companyName ? ' has-error' : ''}`}>
                  <label>
                    Company name <span className="req">*</span>
                  </label>
                  <input type="text" placeholder="e.g. Coastal Realty LLC" value={form.companyName} onChange={set('companyName')} />
                  <p className="field-msg">Please enter your company name.</p>
                </div>
                <div className={`field${fieldErrors.tradeLicenseNo ? ' has-error' : ''}`}>
                  <label>
                    Trade license number <span className="req">*</span>
                  </label>
                  <input type="text" placeholder="e.g. 123456" value={form.tradeLicenseNo} onChange={set('tradeLicenseNo')} />
                  <p className="field-msg">Please enter your trade license number.</p>
                </div>
                <div className="field">
                  <label>License issued in</label>
                  <select value={form.licenseEmirate} onChange={set('licenseEmirate')}>
                    <option value="">Select emirate</option>
                    {EMIRATES.map((em) => (
                      <option key={em}>{em}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>TRN (tax registration no.)</label>
                  <input type="text" placeholder="Optional" value={form.trn} onChange={set('trn')} />
                </div>
                <div className="field span-2">
                  <label>
                    Trade license copy <span className="req">*</span>
                  </label>
                  <div className="upload">
                    <span className="file-name">{form.licenseFile ? form.licenseFile.name : 'No file selected'}</span>
                    <span className="hint">PDF or image, max 5&nbsp;MB</span>
                    <button type="button" className="btn-ghost" onClick={() => document.getElementById('TradeLicenseFile').click()}>
                      Upload file
                    </button>
                    <input
                      type="file"
                      id="TradeLicenseFile"
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      onChange={(e) => setForm({ ...form, licenseFile: e.target.files[0] ?? null })}
                    />
                  </div>
                  <p className="field-msg">Please attach a copy of your trade license.</p>
                </div>
              </div>
            </section>
          )}

          <section className="card">
            <h2>Contact person</h2>
            <p className="sub">Primary contact for portal access and communications.</p>
            <div className="grid">
              <div className={`field${fieldErrors.firstName ? ' has-error' : ''}`}>
                <label>
                  First name <span className="req">*</span>
                </label>
                <input type="text" placeholder="First name" value={form.firstName} onChange={set('firstName')} />
                <p className="field-msg">Please enter your first name.</p>
              </div>
              <div className={`field${fieldErrors.lastName ? ' has-error' : ''}`}>
                <label>
                  Last name <span className="req">*</span>
                </label>
                <input type="text" placeholder="Last name" value={form.lastName} onChange={set('lastName')} />
                <p className="field-msg">Please enter your last name.</p>
              </div>
              <div className={`field${fieldErrors.email ? ' has-error' : ''}`}>
                <label>
                  Email address <span className="req">*</span>
                </label>
                <input type="email" placeholder="name@company.com" autoComplete="email" value={form.email} onChange={set('email')} />
                <p className="field-msg">Please enter a valid email address.</p>
              </div>
              <div className={`field${fieldErrors.mobile ? ' has-error' : ''}`}>
                <label>
                  Mobile number <span className="req">*</span>
                </label>
                <div className="phone-row">
                  <select aria-label="Country code" value={form.mobileCode} onChange={set('mobileCode')}>
                    {MOBILE_CODES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <input type="tel" placeholder="5x xxx xxxx" autoComplete="tel" value={form.mobile} onChange={set('mobile')} />
                </div>
                <p className="field-msg">Please enter your mobile number.</p>
              </div>
              <div className="field">
                <label>Nationality</label>
                <input type="text" placeholder="Nationality" value={form.nationality} onChange={set('nationality')} />
              </div>
              <div className="field">
                <label>Emirate of operation</label>
                <select value={form.emirate} onChange={set('emirate')}>
                  <option value="">Select emirate</option>
                  {EMIRATES.map((em) => (
                    <option key={em}>{em}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {!isAgency && (
            <section className="card">
              <h2>Credentials</h2>
              <p className="sub">Identification and brokerage credentials.</p>
              <div className="grid">
                <div className={`field${fieldErrors.emiratesId ? ' has-error' : ''}`}>
                  <label>
                    Emirates ID / Passport no. <span className="req">*</span>
                  </label>
                  <input type="text" placeholder="784-XXXX-XXXXXXX-X" value={form.emiratesId} onChange={set('emiratesId')} />
                  <p className="field-msg">Please enter your Emirates ID or passport number.</p>
                </div>
                <div className="field">
                  <label>Broker permit / RERA card no.</label>
                  <input type="text" placeholder="If available" value={form.brokerCard} onChange={set('brokerCard')} />
                </div>
                <div className="field span-2">
                  <label>
                    ID copy <span className="req">*</span>
                  </label>
                  <div className="upload">
                    <span className="file-name">{form.idFile ? form.idFile.name : 'No file selected'}</span>
                    <span className="hint">PDF or image, max 5&nbsp;MB</span>
                    <button type="button" className="btn-ghost" onClick={() => document.getElementById('IdFile').click()}>
                      Upload file
                    </button>
                    <input
                      type="file"
                      id="IdFile"
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      onChange={(e) => setForm({ ...form, idFile: e.target.files[0] ?? null })}
                    />
                  </div>
                  <p className="field-msg">Please attach a copy of your ID.</p>
                </div>
                <div className="field span-2">
                  <label>Tell us about your experience</label>
                  <textarea
                    placeholder="Markets you cover, years of experience, past developer partnerships…"
                    value={form.experience}
                    onChange={set('experience')}
                  />
                </div>
              </div>
            </section>
          )}

          <label className="consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I confirm the information provided is accurate, and I agree to be contacted by RAK Properties regarding my
              application. See our{' '}
              <a href="https://www.rakproperties.ae/disclaimer/" target="_blank" rel="noopener noreferrer">
                disclaimer
              </a>
              .
            </span>
          </label>
          {consentError && (
            <p className="field-msg" style={{ display: 'block', margin: '-16px 0 20px' }}>
              Please confirm and accept before submitting.
            </p>
          )}

          <button type="submit" className="btn">
            Submit application
          </button>
        </form>
      </main>

      <footer>&reg; RAK Properties 2026 &mdash; All Rights Reserved</footer>
    </div>
  )
}

export default RegistrationPage
