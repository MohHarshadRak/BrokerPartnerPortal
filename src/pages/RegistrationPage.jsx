import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import '../styles/portal.css'
import '../styles/registration.css'
import { useGetNationalityListQuery, useGetStaffListQuery } from '../features/lookups/lookupsApi'
import {
  useCheckBrokerEmailMutation,
  useSaveBrokerRegistrationMutation,
  useResumeBrokerRegistrationQuery,
} from '../features/registration/registrationApi'

const MOBILE_CODES = ['+971', '+966', '+974', '+973', '+968', '+965', 'other']
const OWNERSHIP_TYPES = ['Private', 'Partnership', 'LLC']
const STAFF_RANGES = ['1-10', '10-20', '20-30', '30-40', '40-50', '50++']

// Every file field collected across the wizard — used to avoid re-uploading (and
// duplicating on disk) a file that was already saved on an earlier step's save.
const FILE_FIELDS = [
  'licenseFile',
  'ownerPassportFile',
  'ownerEidFile',
  'companyProfileFile',
  'signatoryFile',
  'authPersonPassportFile',
  'authPersonEidFile',
  'authPerson2PassportFile',
  'authPerson2EidFile',
  'passportFile',
  'eidFile',
  'profileFile',
]

const STEP_TITLES = {
  type: 'Registration type & email',
  company: 'Company details',
  authPerson: 'Authorized person',
  documents: 'Upload documents',
  contact: 'Contact person',
  credentials: 'Credentials',
  bank: 'Bank details',
  related: 'Related party disclosure',
}

// Field-error keys each step owns — used to clear stale errors when re-validating a step.
const STEP_FIELD_KEYS = {
  company: [
    'companyName', 'ownerName', 'ownerPassport', 'ownershipType', 'ownerNationality',
    'officeAddress', 'officeCity', 'officeCountry', 'telephone', 'email', 'mobile',
    'commercialRegNo', 'staffCount', 'tradeLicenseNo', 'tradeLicenseExpiry', 'tradeLicenseCountry',
  ],
  authPerson: ['hasAuthorizedPerson', 'authPersonName', 'authPersonPassport', 'authPersonCountry'],
  documents: [
    'licenseFile', 'ownerPassportFile', 'ownerEidFile', 'companyProfileFile', 'signatoryFile',
    'authPersonPassportFile', 'authPersonEidFile',
  ],
  contact: ['fullName', 'email', 'mobile'],
  credentials: ['emiratesId', 'freelancerAddress', 'freelancerCity', 'eidFile', 'passportFile', 'profileFile'],
  bank: ['bankAccountHolder', 'bankName', 'bankAccountNo', 'bankIban', 'bankBranch', 'bankAddress'],
  related: ['isRelatedParty', 'relatedPartyDetails'],
}

const EMPTY_FORM = {
  // Company details (agency)
  companyName: '',
  ownerName: '',
  ownerPassport: '',
  ownerNationality: '',
  ownershipType: '',
  tradeLicenseNo: '',
  tradeLicenseExpiry: '',
  tradeLicenseCountry: '',
  officeAddress: '',
  officeCity: '',
  officeCountry: '',
  telephone: '',
  website: '',
  commercialRegNo: '',
  staffCount: '',
  pastTrackRecord: '',
  licenseFile: null,
  ownerPassportFile: null,
  ownerEidFile: null,
  companyProfileFile: null,
  signatoryFile: null,

  // Authorized person (agency)
  hasAuthorizedPerson: 'no',
  authPersonName: '',
  authPersonPassport: '',
  authPersonCountry: '',
  authPersonPassportFile: null,
  authPersonEidFile: null,
  authPerson2Name: '',
  authPerson2Passport: '',
  authPerson2Country: '',
  authPerson2PassportFile: null,
  authPerson2EidFile: null,

  // Contact person (shared)
  fullName: '',
  email: '',
  mobileCode: '+971',
  mobile: '',
  nationality: '',
  dealingWith: '',

  // Credentials (freelancer)
  emiratesId: '',
  brokerCard: '',
  freelancerAddress: '',
  freelancerCity: '',
  eidFile: null,
  passportFile: null,
  profileFile: null,
  //experience: '',

  // Bank details (shared)
  bankAccountHolder: '',
  bankName: '',
  bankAccountNo: '',
  bankIban: '',
  bankBranch: '',
  bankAddress: '',

  // Related party (shared)
  isRelatedParty: 'no',
  relatedPartyDetails: '',
}

function UploadField({ label, required, hint, file, existingFileName, onChange, inputId, error }) {
  return (
    <div className={`field span-2${error ? ' has-error' : ''}`}>
      <label>
        {label} {required && <span className="req">*</span>}
      </label>
      <div className="upload">
        <span className="file-name">
          {file ? file.name : existingFileName ? `Already uploaded (${existingFileName}) — choose a file to replace it` : 'No file selected'}
        </span>
        {hint && <span className="hint">{hint}</span>}
        <button type="button" className="btn-ghost" onClick={() => document.getElementById(inputId).click()}>
          Upload file
        </button>
        <input
          type="file"
          id={inputId}
          accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp"
          style={{ display: 'none' }}
          onChange={(e) => onChange(e.target.files[0] ?? null)}
        />
      </div>
      <p className="field-msg">Please attach {label.toLowerCase()}.</p>
    </div>
  )
}

// NOTE: this page is a UI-only conversion — submission is a client-side mock
// (validates, then shows the success panel) with no real backend call yet.
// Wiring a real submission endpoint is a separate follow-up. Fields here are
// aligned with what the legacy RAKPBrokeragePortal's RegistrationForm01.aspx
// (agent) / RegistrationForm02.aspx (freelancer) actually collect, on top of
// the marketing team's new-design fields. The email-availability check (step
// 1) ports the legacy pages' BtnCheckAvailability_Click logic via the API's
// /api/Guest/checkBrokerEmail endpoint.
function RegistrationPage() {
  const [searchParams] = useSearchParams()
  const [brokerType, setBrokerType] = useState(() => {
    const type = searchParams.get('type')
    if (type === 'agency' || type === 'lease') return type
    return 'freelancer'
  })
  const { data: nationalities } = useGetNationalityListQuery()
  const { data: staffList } = useGetStaffListQuery({ flag: 11, uid: 0, key: '' })
  const staffMembers = staffList ?? []
  const [checkBrokerEmail, { isLoading: checkingEmail }] = useCheckBrokerEmailMutation()
  const [saveBrokerRegistration, { isLoading: submitting }] = useSaveBrokerRegistrationMutation()
  const [emailStatus, setEmailStatus] = useState(null)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [consent, setConsent] = useState(false)
  const [consentError, setConsentError] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [reference, setReference] = useState('')
  const [registrationId, setRegistrationId] = useState(null)
  // Tracks, per file field, the exact File object last successfully persisted — a fresh
  // File instance (the user picking a new file) always differs by reference, but resending
  // the same unchanged selection on a later step's save must not re-upload/duplicate it.
  const savedFilesRef = useRef({})
  // Filenames already on record for a resumed application (see GetBrokerRegistrationFull on
  // the API side) — a browser can't rehydrate a real File object from just a name, so these
  // are display-only: UploadField shows "already uploaded" instead of asking for a re-upload,
  // and the field's required-check treats an existing filename as already satisfied.
  const [existingFiles, setExistingFiles] = useState({})

  // Resuming via the emailed "?bid=&seccode=" link (see registrationApi.js /
  // GuestService.ResumeBrokerRegistration) — pre-fills the wizard from the saved record.
  const bid = searchParams.get('bid')
  const seccode = searchParams.get('seccode')
  const {
    data: resumeData,
    isLoading: resuming,
    isError: resumeFailed,
  } = useResumeBrokerRegistrationQuery({ bid, seccode }, { skip: !bid || !seccode })

  useEffect(() => {
    if (!resumeData) return
    setBrokerType(resumeData.brokerType === 1 ? 'agency' : resumeData.brokerType === 3 ? 'lease' : 'freelancer')
    setRegistrationId(resumeData.brokerId ?? null)
    setForm((f) => ({
      ...f,
      email: resumeData.email ?? '',
      mobile: resumeData.mobile ?? '',
      dealingWith: resumeData.dealingWith ?? '',
      bankAccountHolder: resumeData.bankAccountHolder ?? '',
      bankName: resumeData.bankName ?? '',
      bankAccountNo: resumeData.bankAccountNo ?? '',
      bankIban: resumeData.bankIban ?? '',
      bankBranch: resumeData.bankBranch ?? '',
      bankAddress: resumeData.bankAddress ?? '',
      companyName: resumeData.companyName ?? '',
      ownerName: resumeData.ownerName ?? '',
      ownerPassport: resumeData.ownerPassport ?? '',
      ownerNationality: resumeData.ownerNationality ? String(resumeData.ownerNationality) : '',
      ownershipType: resumeData.ownershipType ?? '',
      tradeLicenseNo: resumeData.tradeLicenseNo ?? '',
      tradeLicenseExpiry: resumeData.tradeLicenseExpiry ? resumeData.tradeLicenseExpiry.slice(0, 10) : '',
      tradeLicenseCountry: resumeData.tradeLicenseCountry ? String(resumeData.tradeLicenseCountry) : '',
      officeAddress: resumeData.officeAddress ?? '',
      officeCity: resumeData.officeCity ?? '',
      officeCountry: resumeData.officeCountry ? String(resumeData.officeCountry) : '',
      telephone: resumeData.telephone ?? '',
      website: resumeData.website ?? '',
      commercialRegNo: resumeData.commercialRegNo ?? '',
      staffCount: resumeData.staffCount ?? '',
      pastTrackRecord: resumeData.pastTrackRecord ?? '',
      hasAuthorizedPerson: resumeData.hasAuthorizedPerson ?? '',
      authPersonName: resumeData.authPersonName ?? '',
      authPersonPassport: resumeData.authPersonPassport ?? '',
      authPersonCountry: resumeData.authPersonCountry ? String(resumeData.authPersonCountry) : '',
      authPerson2Name: resumeData.authPerson2Name ?? '',
      authPerson2Passport: resumeData.authPerson2Passport ?? '',
      authPerson2Country: resumeData.authPerson2Country ? String(resumeData.authPerson2Country) : '',
      fullName: resumeData.fullName ?? '',
      nationality: resumeData.nationality ? String(resumeData.nationality) : '',
      emiratesId: resumeData.emiratesId ?? '',
      freelancerAddress: resumeData.freelancerAddress ?? '',
      freelancerCity: resumeData.freelancerCity ?? '',
    }))
    setExistingFiles({
      licenseFile: resumeData.licenseFileName ?? null,
      ownerPassportFile: resumeData.ownerPassportFileName ?? null,
      ownerEidFile: resumeData.ownerEidFileName ?? null,
      companyProfileFile: resumeData.companyProfileFileName ?? null,
      signatoryFile: resumeData.signatoryFileName ?? null,
      authPersonPassportFile: resumeData.authPersonPassportFileName ?? null,
      authPersonEidFile: resumeData.authPersonEidFileName ?? null,
      authPerson2PassportFile: resumeData.authPerson2PassportFileName ?? null,
      authPerson2EidFile: resumeData.authPerson2EidFileName ?? null,
      passportFile: resumeData.passportFileName ?? null,
      eidFile: resumeData.eidFileName ?? null,
      profileFile: resumeData.profileFileName ?? null,
    })
    setEmailStatus({ availability: 'available' })
    setStep(1)
  }, [resumeData])

  useEffect(() => {
    document.body.style.background = 'var(--rak-mist)'
    return () => {
      document.body.style.background = ''
    }
  }, [])

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })
  const setFile = (field) => (file) => setForm({ ...form, [field]: file })
  const setEmail = (e) => {
    setForm({ ...form, email: e.target.value })
    setEmailStatus(null)
  }

  const isAgency = brokerType === 'agency'
  const isLease = brokerType === 'lease'
  // Lease reuses the exact same company-shaped steps/fields as Agency (see
  // Broker_Lease_Registration.aspx) — it's just tagged with a different BrokerType.
  const isCompanyShaped = isAgency || isLease
  const hasAuthPerson = form.hasAuthorizedPerson === 'yes'

  const STEPS = isCompanyShaped
    ? ['type', 'company', 'authPerson', 'documents', 'bank', 'related']
    : ['type', 'contact', 'credentials', 'bank', 'related']
  const stepKey = STEPS[step]

  const handleCheckEmail = async () => {
    if (!/.+@.+\..+/.test(form.email.trim())) {
      setFieldErrors((prev) => ({ ...prev, email: true }))
      return
    }
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.email
      return next
    })
    try {
      const result = await checkBrokerEmail(form.email.trim()).unwrap()
      setEmailStatus(result)
      if (result.availability === 'available') setStep(1)
    } catch {
      setEmailStatus({ availability: 'error', message: 'Something went wrong checking your email. Please try again.' })
    }
  }

  // A required upload is satisfied either by a freshly-picked File, or by a filename already
  // on record from before (resumed application) — see `existingFiles`.
  const hasFile = (field) => Boolean(form[field] || existingFiles[field])

  function validateCompanyDetails() {
    const errors = {}
    const req = (field) => {
      if (!String(form[field] ?? '').trim()) errors[field] = true
    }
    req('companyName')
    req('ownerName')
    req('ownerPassport')
    if (!form.ownershipType) errors.ownershipType = true
    if (!form.ownerNationality) errors.ownerNationality = true
    req('officeAddress')
    req('officeCity')
    req('officeCountry')
    req('telephone')
    if (!/.+@.+\..+/.test(form.email.trim())) errors.email = true
    req('mobile')
    req('commercialRegNo')
    if (!form.staffCount) errors.staffCount = true
    req('tradeLicenseNo')
    if (!form.tradeLicenseExpiry) {
      errors.tradeLicenseExpiry = true
    } else if (new Date(form.tradeLicenseExpiry) <= new Date()) {
      errors.tradeLicenseExpiry = true
    }
    if (!form.tradeLicenseCountry) errors.tradeLicenseCountry = true
    return errors
  }

  function validateAuthorizedPerson() {
    const errors = {}
    const req = (field) => {
      if (!String(form[field] ?? '').trim()) errors[field] = true
    }
    if (!form.hasAuthorizedPerson) errors.hasAuthorizedPerson = true
    if (form.hasAuthorizedPerson === 'yes') {
      req('authPersonName')
      req('authPersonPassport')
      req('authPersonCountry')
    }
    return errors
  }

  function validateDocuments() {
    const errors = {}
    if (!hasFile('licenseFile')) errors.licenseFile = true
    if (!hasFile('ownerPassportFile')) errors.ownerPassportFile = true
    if (!hasFile('ownerEidFile')) errors.ownerEidFile = true
    if (!hasFile('companyProfileFile')) errors.companyProfileFile = true
    if (!hasFile('signatoryFile')) errors.signatoryFile = true
    if (form.hasAuthorizedPerson === 'yes') {
      if (!hasFile('authPersonPassportFile')) errors.authPersonPassportFile = true
      if (!hasFile('authPersonEidFile')) errors.authPersonEidFile = true
    }
    return errors
  }

  function validateContactPerson() {
    const errors = {}
    const req = (field) => {
      if (!String(form[field] ?? '').trim()) errors[field] = true
    }
    req('fullName')
    if (!/.+@.+\..+/.test(form.email.trim())) errors.email = true
    req('mobile')
    return errors
  }

  function validateCredentials() {
    const errors = {}
    const req = (field) => {
      if (!String(form[field] ?? '').trim()) errors[field] = true
    }
    req('emiratesId')
    req('freelancerAddress')
    req('freelancerCity')
    if (!hasFile('eidFile')) errors.eidFile = true
    if (!hasFile('passportFile')) errors.passportFile = true
    if (!hasFile('profileFile')) errors.profileFile = true
    return errors
  }

  function validateBankDetails() {
    const errors = {}
    const req = (field) => {
      if (!String(form[field] ?? '').trim()) errors[field] = true
    }
    req('bankAccountHolder')
    req('bankName')
    req('bankAccountNo')
    req('bankIban')
    req('bankBranch')
    req('bankAddress')
    return errors
  }

  function validateRelatedParty() {
    const errors = {}
    if (!form.isRelatedParty) errors.isRelatedParty = true
    if (form.isRelatedParty === 'yes' && form.relatedPartyDetails.trim().length < 6) {
      errors.relatedPartyDetails = true
    }
    return errors
  }

  const STEP_VALIDATORS = {
    company: validateCompanyDetails,
    authPerson: validateAuthorizedPerson,
    documents: validateDocuments,
    contact: validateContactPerson,
    credentials: validateCredentials,
    bank: validateBankDetails,
    related: validateRelatedParty,
  }

  const handleNext = async () => {
    const validate = STEP_VALIDATORS[stepKey]
    const errors = validate ? validate() : {}
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const k of STEP_FIELD_KEYS[stepKey] ?? []) delete next[k]
      return { ...next, ...errors }
    })
    if (Object.keys(errors).length > 0) return

    const isFinal = step === STEPS.length - 1
    if (isFinal && !consent) {
      setConsentError(true)
      return
    }
    setConsentError(false)
    setSubmitError('')

    // Save on every "Next" — the first save creates the record (registrationId null),
    // every save after that updates the same one in place, which is what makes resuming
    // via the emailed link possible even if the applicant abandons partway through.
    // Files already persisted on an earlier step are left out here so they don't get
    // re-uploaded (and duplicated on disk) every time a later step saves.
    const formToSend = { ...form }
    for (const field of FILE_FIELDS) {
      if (form[field] && form[field] === savedFilesRef.current[field]) {
        formToSend[field] = null
      }
    }

    try {
      const brokerTypeCode = isAgency ? 1 : isLease ? 3 : 2
      const result = await saveBrokerRegistration({
        brokerTypeCode,
        isCompanyShaped,
        form: formToSend,
        brokerId: registrationId,
        isFinal,
      }).unwrap()
      setRegistrationId(result.referenceId ?? registrationId)
      for (const field of FILE_FIELDS) {
        if (form[field]) savedFilesRef.current[field] = form[field]
      }
      if (isFinal) {
        setReference(result.referenceId ? `BRK-APP-${result.referenceId}` : '')
        setSubmitted(true)
      } else {
        setStep((s) => s + 1)
      }
    } catch (err) {
      setSubmitError(
        err?.data?.message ||
          (isFinal
            ? 'We could not submit your application. Please try again or contact brokers@rakproperties.ae.'
            : 'We could not save your progress. Please try again.')
      )
    }
  }

  const handleBack = () => setStep((s) => Math.max(0, s - 1))

  if (bid && seccode && (resuming || resumeFailed)) {
    return (
      <div className="registration">
        <header className="topbar">
          <div className="topbar-inner">
            <img src={`${import.meta.env.BASE_URL}assets/img/rak_logo.svg`} alt="RAK Properties" />
            <Link className="back" to="/">
              &larr; Back to sign in
            </Link>
          </div>
        </header>
        <main className="page">
          {resuming ? (
            <p className="lead">Loading your application&hellip;</p>
          ) : (
            <div className="success show" role="status">
              <p className="eyebrow">Resume link problem</p>
              <h2>We couldn&rsquo;t load your application</h2>
              <p>This link may be invalid or expired. Please contact brokers@rakproperties.ae for assistance.</p>
            </div>
          )}
        </main>
        <footer>&reg; RAK Properties 2026 &mdash; All Rights Reserved</footer>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="registration">
        <header className="topbar">
          <div className="topbar-inner">
            <img src={`${import.meta.env.BASE_URL}assets/img/rak_logo.svg`} alt="RAK Properties" />
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
          <img src={`${import.meta.env.BASE_URL}assets/img/rak_logo.svg`} alt="RAK Properties" />
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

        <ol className="stepper" aria-label="Registration progress">
          {STEPS.map((key, i) => (
            <li key={key} className={`stepper-item${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}>
              <span className="stepper-circle" aria-hidden="true">
                {i < step ? '✓' : i + 1}
              </span>
              <span className="stepper-label">{STEP_TITLES[key]}</span>
            </li>
          ))}
        </ol>

        <form onSubmit={(e) => e.preventDefault()} noValidate>
          {step === 0 && (
            <>
              <div className="type-select" role="radiogroup" aria-label="Registration type">
                <label className={`type-card${brokerType === 'freelancer' ? ' active' : ''}`}>
                  <input
                    type="radio"
                    name="BrokerType"
                    value="freelancer"
                    checked={brokerType === 'freelancer'}
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
                <label className={`type-card${isLease ? ' active' : ''}`}>
                  <input
                    type="radio"
                    name="BrokerType"
                    value="lease"
                    checked={isLease}
                    onChange={() => setBrokerType('lease')}
                  />
                  <span className="t">I am registering for Leasing</span>
                  <span className="d">Brokerage company registering to transact RAK Properties leases.</span>
                  <span className="mark" aria-hidden="true"></span>
                </label>
              </div>

              <section className="card">
                <h2>Registration email</h2>
                <p className="sub">
                  Enter the email you&rsquo;d like to register with — we&rsquo;ll check whether it&rsquo;s already on
                  file before you continue.
                </p>
                <div className="grid">
                  <div className={`field span-2${fieldErrors.email ? ' has-error' : ''}`}>
                    <label>
                      Email address <span className="req">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      autoComplete="email"
                      value={form.email}
                      onChange={setEmail}
                      disabled={checkingEmail}
                    />
                    <p className="field-msg">Please enter a valid email address.</p>
                  </div>
                </div>
                {emailStatus && emailStatus.availability !== 'available' && (
                  <p className="field-msg" style={{ display: 'block', marginBottom: 20 }}>
                    {emailStatus.message}
                  </p>
                )}
                <button type="button" className="btn" style={{ marginTop: 8 }} onClick={handleCheckEmail} disabled={checkingEmail}>
                  {checkingEmail ? 'Checking…' : 'Check availability'}
                </button>
              </section>
            </>
          )}

          {stepKey === 'company' && (
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
                <div className={`field${fieldErrors.ownerName ? ' has-error' : ''}`}>
                  <label>
                    Owner name <span className="req">*</span>
                  </label>
                  <input type="text" placeholder="Name of the owner/partner" value={form.ownerName} onChange={set('ownerName')} />
                  <p className="field-msg">Please enter the owner's name.</p>
                </div>
                <div className={`field${fieldErrors.ownershipType ? ' has-error' : ''}`}>
                  <label>
                    Type of ownership <span className="req">*</span>
                  </label>
                  <select value={form.ownershipType} onChange={set('ownershipType')}>
                    <option value="">Select</option>
                    {OWNERSHIP_TYPES.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                  <p className="field-msg">Please select the ownership type.</p>
                </div>
                <div className={`field${fieldErrors.ownerNationality ? ' has-error' : ''}`}>
                  <label>
                    Owner nationality <span className="req">*</span>
                  </label>
                  <select value={form.ownerNationality} onChange={set('ownerNationality')}>
                    <option value="">Select nationality</option>
                    {(nationalities ?? []).map((n) => (
                      <option value={n.value} key={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                  <p className="field-msg">Please select the owner's nationality.</p>
                </div>
                <div className={`field${fieldErrors.ownerPassport ? ' has-error' : ''}`}>
                  <label>
                    Owner passport no. <span className="req">*</span>
                  </label>
                  <input type="text" placeholder="Passport number" value={form.ownerPassport} onChange={set('ownerPassport')} />
                  <p className="field-msg">Please enter the owner's passport number.</p>
                </div>
                <div className={`field${fieldErrors.officeAddress ? ' has-error' : ''}`}>
                  <label>
                    Office address <span className="req">*</span>
                  </label>
                  <input type="text" value={form.officeAddress} onChange={set('officeAddress')} />
                  <p className="field-msg">Please enter your office address.</p>
                </div>
                <div className={`field${fieldErrors.officeCity ? ' has-error' : ''}`}>
                  <label>
                    City <span className="req">*</span>
                  </label>
                  <input type="text" value={form.officeCity} onChange={set('officeCity')} />
                  <p className="field-msg">Please enter your city.</p>
                </div>
                <div className={`field${fieldErrors.officeCountry ? ' has-error' : ''}`}>
                  <label>
                    Office country <span className="req">*</span>
                  </label>
                  <select value={form.officeCountry} onChange={set('officeCountry')}>
                    <option value="">Select country</option>
                    {(nationalities ?? []).map((n) => (
                      <option value={n.value} key={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                  <p className="field-msg">Please select your office country.</p>
                </div>
                <div className="field">
                  <label>Website</label>
                  <input type="text" placeholder="Optional" value={form.website} onChange={set('website')} />
                </div>
                <div className={`field${fieldErrors.telephone ? ' has-error' : ''}`}>
                  <label>
                    Telephone <span className="req">*</span>
                  </label>
                  <input type="tel" placeholder="Office landline" value={form.telephone} onChange={set('telephone')} />
                  <p className="field-msg">Please enter your office telephone number.</p>
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
                <div className={`field${fieldErrors.email ? ' has-error' : ''}`}>
                  <label>
                    Email address <span className="req">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    autoComplete="email"
                    value={form.email}
                    onChange={set('email')}
                    disabled
                  />
                  <p className="field-msg">Please enter a valid email address.</p>
                </div>
                <div className={`field${fieldErrors.commercialRegNo ? ' has-error' : ''}`}>
                  <label>
                    Commercial registration no. <span className="req">*</span>
                  </label>
                  <input type="text" value={form.commercialRegNo} onChange={set('commercialRegNo')} />
                  <p className="field-msg">Please enter your commercial registration number.</p>
                </div>
                <div className={`field${fieldErrors.staffCount ? ' has-error' : ''}`}>
                  <label>
                    No. of salaried staff <span className="req">*</span>
                  </label>
                  <select value={form.staffCount} onChange={set('staffCount')}>
                    <option value="">Select</option>
                    {STAFF_RANGES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                  <p className="field-msg">Please select a staff range.</p>
                </div>
                <div className="field">
                  <label>Currently dealing with (RAK Properties staff)</label>
                  <select value={form.dealingWith} onChange={set('dealingWith')}>
                    <option value="">Select staff member (optional)</option>
                    {staffMembers.map((o) => (
                      <option value={o.value} key={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={`field${fieldErrors.tradeLicenseNo ? ' has-error' : ''}`}>
                  <label>
                    Trade license number <span className="req">*</span>
                  </label>
                  <input type="text" placeholder="e.g. 123456" value={form.tradeLicenseNo} onChange={set('tradeLicenseNo')} />
                  <p className="field-msg">Please enter your trade license number.</p>
                </div>
                <div className={`field${fieldErrors.tradeLicenseExpiry ? ' has-error' : ''}`}>
                  <label>
                    Trade license expiry date <span className="req">*</span>
                  </label>
                  <input type="date" value={form.tradeLicenseExpiry} onChange={set('tradeLicenseExpiry')} />
                  <p className="field-msg">Please enter a future expiry date.</p>
                </div>
                <div className={`field${fieldErrors.tradeLicenseCountry ? ' has-error' : ''}`}>
                  <label>
                    Trade license country <span className="req">*</span>
                  </label>
                  <select value={form.tradeLicenseCountry} onChange={set('tradeLicenseCountry')}>
                    <option value="">Select country</option>
                    {(nationalities ?? []).map((n) => (
                      <option value={n.value} key={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                  <p className="field-msg">Please select the trade license country.</p>
                </div>
                <div className="field span-2">
                  <label>Past track record</label>
                  <textarea
                    placeholder="Notable transactions, developer partnerships…"
                    value={form.pastTrackRecord}
                    onChange={set('pastTrackRecord')}
                  />
                </div>
              </div>
            </section>
          )}

          {stepKey === 'authPerson' && (
            <section className="card">
              <h2>Authorized person</h2>
              <p className="sub">A representative authorized to sign on the company's behalf, if different from the owner.</p>
              <div className="grid">
                <div className={`field span-2${fieldErrors.hasAuthorizedPerson ? ' has-error' : ''}`}>
                  <label>
                    Is an authorized person available? <span className="req">*</span>
                  </label>
                  <div className="phone-row" style={{ gap: 24 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                      <input
                        type="radio"
                        name="HasAuthPerson"
                        checked={form.hasAuthorizedPerson === 'yes'}
                        onChange={() => setForm({ ...form, hasAuthorizedPerson: 'yes' })}
                      />
                      Yes
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                      <input
                        type="radio"
                        name="HasAuthPerson"
                        checked={form.hasAuthorizedPerson === 'no'}
                        onChange={() => setForm({ ...form, hasAuthorizedPerson: 'no' })}
                      />
                      No
                    </label>
                  </div>
                  <p className="field-msg">Please select an option.</p>
                </div>

                {hasAuthPerson && (
                  <>
                    <div className={`field${fieldErrors.authPersonName ? ' has-error' : ''}`}>
                      <label>
                        Authorized person name <span className="req">*</span>
                      </label>
                      <input type="text" value={form.authPersonName} onChange={set('authPersonName')} />
                      <p className="field-msg">Please enter the authorized person's name.</p>
                    </div>
                    <div className={`field${fieldErrors.authPersonPassport ? ' has-error' : ''}`}>
                      <label>
                        Passport no. <span className="req">*</span>
                      </label>
                      <input type="text" value={form.authPersonPassport} onChange={set('authPersonPassport')} />
                      <p className="field-msg">Please enter the passport number.</p>
                    </div>
                    <div className={`field${fieldErrors.authPersonCountry ? ' has-error' : ''}`}>
                      <label>
                        Nationality <span className="req">*</span>
                      </label>
                      <select value={form.authPersonCountry} onChange={set('authPersonCountry')}>
                        <option value="">Select nationality</option>
                        {(nationalities ?? []).map((n) => (
                          <option value={n.value} key={n.value}>
                            {n.label}
                          </option>
                        ))}
                      </select>
                      <p className="field-msg">Please select the nationality.</p>
                    </div>

                    <div className="field span-2" style={{ marginTop: 8 }}>
                      <p className="sub" style={{ marginBottom: 0 }}>
                        Second authorized person (optional)
                      </p>
                    </div>
                    <div className="field">
                      <label>Name</label>
                      <input type="text" value={form.authPerson2Name} onChange={set('authPerson2Name')} />
                    </div>
                    <div className="field">
                      <label>Passport no.</label>
                      <input type="text" value={form.authPerson2Passport} onChange={set('authPerson2Passport')} />
                    </div>
                    <div className="field">
                      <label>Nationality</label>
                      <select value={form.authPerson2Country} onChange={set('authPerson2Country')}>
                        <option value="">Select nationality</option>
                        {(nationalities ?? []).map((n) => (
                          <option value={n.value} key={n.value}>
                            {n.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {stepKey === 'documents' && (
            <section className="card">
              <h2>Upload documents</h2>
              <p className="sub">Attach copies of the documents collected in the previous steps.</p>
              <div className="grid">
                <UploadField
                  label="Trade license copy"
                  required
                  hint="PDF or image, max 5 MB"
                  file={form.licenseFile}
                  existingFileName={existingFiles.licenseFile}
                  onChange={setFile('licenseFile')}
                  inputId="TradeLicenseFile"
                  error={fieldErrors.licenseFile}
                />
                <UploadField
                  label="Owner passport copy"
                  required
                  file={form.ownerPassportFile}
                  existingFileName={existingFiles.ownerPassportFile}
                  onChange={setFile('ownerPassportFile')}
                  inputId="OwnerPassportFile"
                  error={fieldErrors.ownerPassportFile}
                />
                <UploadField
                  label="Owner Emirates ID copy"
                  required
                  file={form.ownerEidFile}
                  existingFileName={existingFiles.ownerEidFile}
                  onChange={setFile('ownerEidFile')}
                  inputId="OwnerEidFile"
                  error={fieldErrors.ownerEidFile}
                />
                <UploadField
                  label="Company profile"
                  required
                  file={form.companyProfileFile}
                  existingFileName={existingFiles.companyProfileFile}
                  onChange={setFile('companyProfileFile')}
                  inputId="CompanyProfileFile"
                  error={fieldErrors.companyProfileFile}
                />
                <UploadField
                  label="POA / MOA (signatory) copy"
                  required
                  file={form.signatoryFile}
                  existingFileName={existingFiles.signatoryFile}
                  onChange={setFile('signatoryFile')}
                  inputId="SignatoryFile"
                  error={fieldErrors.signatoryFile}
                />
                {hasAuthPerson && (
                  <>
                    <UploadField
                      label="Authorized person passport copy"
                      required
                      file={form.authPersonPassportFile}
                      existingFileName={existingFiles.authPersonPassportFile}
                      onChange={setFile('authPersonPassportFile')}
                      inputId="AuthPersonPassportFile"
                      error={fieldErrors.authPersonPassportFile}
                    />
                    <UploadField
                      label="Authorized person Emirates ID copy"
                      required
                      file={form.authPersonEidFile}
                      existingFileName={existingFiles.authPersonEidFile}
                      onChange={setFile('authPersonEidFile')}
                      inputId="AuthPersonEidFile"
                      error={fieldErrors.authPersonEidFile}
                    />
                    <UploadField
                      label="2nd authorized person passport copy"
                      file={form.authPerson2PassportFile}
                      existingFileName={existingFiles.authPerson2PassportFile}
                      onChange={setFile('authPerson2PassportFile')}
                      inputId="AuthPerson2PassportFile"
                    />
                    <UploadField
                      label="2nd authorized person Emirates ID copy"
                      file={form.authPerson2EidFile}
                      existingFileName={existingFiles.authPerson2EidFile}
                      onChange={setFile('authPerson2EidFile')}
                      inputId="AuthPerson2EidFile"
                    />
                  </>
                )}
              </div>
            </section>
          )}

          {stepKey === 'contact' && (
            <section className="card">
              <h2>Contact person</h2>
              <p className="sub">Primary contact for portal access and communications.</p>
              <div className="grid">
                <div className={`field span-2${fieldErrors.fullName ? ' has-error' : ''}`}>
                  <label>
                    Full name <span className="req">*</span>
                  </label>
                  <input type="text" placeholder="Full name" value={form.fullName} onChange={set('fullName')} />
                  <p className="field-msg">Please enter your full name.</p>
                </div>
                <div className={`field${fieldErrors.email ? ' has-error' : ''}`}>
                  <label>
                    Email address <span className="req">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    autoComplete="email"
                    value={form.email}
                    onChange={set('email')}
                    disabled
                  />
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
                  <select value={form.nationality} onChange={set('nationality')}>
                    <option value="">Select nationality</option>
                    {(nationalities ?? []).map((n) => (
                      <option value={n.value} key={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Currently dealing with (RAK Properties staff)</label>
                  <select value={form.dealingWith} onChange={set('dealingWith')}>
                    <option value="">Select staff member (optional)</option>
                    {staffMembers.map((o) => (
                      <option value={o.value} key={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          )}

          {stepKey === 'credentials' && (
            <section className="card">
              <h2>Credentials</h2>
              <p className="sub">Identification and brokerage credentials.</p>
              <div className="grid">
                <div className={`field${fieldErrors.emiratesId ? ' has-error' : ''}`}>
                  <label>
                    Passport no. <span className="req">*</span>
                  </label>
                  <input type="text" placeholder="Passport number" value={form.emiratesId} onChange={set('emiratesId')} />
                  <p className="field-msg">Please enter your passport number.</p>
                </div>
                <div className="field">
                  <label>Broker permit / RERA card no.</label>
                  <input type="text" placeholder="If available" value={form.brokerCard} onChange={set('brokerCard')} />
                </div>
                <div className={`field${fieldErrors.freelancerAddress ? ' has-error' : ''}`}>
                  <label>
                    Address <span className="req">*</span>
                  </label>
                  <input type="text" value={form.freelancerAddress} onChange={set('freelancerAddress')} />
                  <p className="field-msg">Please enter your address.</p>
                </div>
                <div className={`field${fieldErrors.freelancerCity ? ' has-error' : ''}`}>
                  <label>
                    City <span className="req">*</span>
                  </label>
                  <input type="text" value={form.freelancerCity} onChange={set('freelancerCity')} />
                  <p className="field-msg">Please enter your city.</p>
                </div>

                <UploadField
                  label="Passport copy"
                  required
                  hint="PDF or image, max 5 MB"
                  file={form.passportFile}
                  existingFileName={existingFiles.passportFile}
                  onChange={setFile('passportFile')}
                  inputId="PassportFile"
                  error={fieldErrors.passportFile}
                />
                <UploadField
                  label="Emirates ID copy"
                  required
                  file={form.eidFile}
                  existingFileName={existingFiles.eidFile}
                  onChange={setFile('eidFile')}
                  inputId="EidFile"
                  error={fieldErrors.eidFile}
                />
                <UploadField
                  label="Profile copy"
                  required
                  file={form.profileFile}
                  existingFileName={existingFiles.profileFile}
                  onChange={setFile('profileFile')}
                  inputId="ProfileFile"
                  error={fieldErrors.profileFile}
                />
              </div>
            </section>
          )}

          {stepKey === 'bank' && (
            <section className="card">
              <h2>Bank details</h2>
              <p className="sub">Used for commission payouts once your application is approved.</p>
              <div className="grid">
                <div className={`field${fieldErrors.bankAccountHolder ? ' has-error' : ''}`}>
                  <label>
                    Account holder name <span className="req">*</span>
                  </label>
                  <input type="text" value={form.bankAccountHolder} onChange={set('bankAccountHolder')} />
                  <p className="field-msg">Please enter the account holder name.</p>
                </div>
                <div className={`field${fieldErrors.bankName ? ' has-error' : ''}`}>
                  <label>
                    Bank name <span className="req">*</span>
                  </label>
                  <input type="text" value={form.bankName} onChange={set('bankName')} />
                  <p className="field-msg">Please enter the bank name.</p>
                </div>
                <div className={`field${fieldErrors.bankAccountNo ? ' has-error' : ''}`}>
                  <label>
                    Account number <span className="req">*</span>
                  </label>
                  <input type="text" value={form.bankAccountNo} onChange={set('bankAccountNo')} />
                  <p className="field-msg">Please enter the account number.</p>
                </div>
                <div className={`field${fieldErrors.bankIban ? ' has-error' : ''}`}>
                  <label>
                    IBAN number <span className="req">*</span>
                  </label>
                  <input type="text" value={form.bankIban} onChange={set('bankIban')} />
                  <p className="field-msg">Please enter the IBAN number.</p>
                </div>
                <div className={`field${fieldErrors.bankBranch ? ' has-error' : ''}`}>
                  <label>
                    Bank branch name <span className="req">*</span>
                  </label>
                  <input type="text" value={form.bankBranch} onChange={set('bankBranch')} />
                  <p className="field-msg">Please enter the bank branch name.</p>
                </div>
                <div className={`field${fieldErrors.bankAddress ? ' has-error' : ''}`}>
                  <label>
                    Bank address <span className="req">*</span>
                  </label>
                  <input type="text" value={form.bankAddress} onChange={set('bankAddress')} />
                  <p className="field-msg">Please enter the bank address.</p>
                </div>
              </div>
            </section>
          )}

          {stepKey === 'related' && (
            <>
              <section className="card">
                <h2>Related party disclosure</h2>
                <p className="sub">Required so we can review your application for any conflicts of interest.</p>
                <div className="grid">
                  <div className={`field span-2${fieldErrors.isRelatedParty ? ' has-error' : ''}`}>
                    <label>
                      Is this application related to an existing RAK Properties broker or staff member?{' '}
                      <span className="req">*</span>
                    </label>
                    <div className="phone-row" style={{ gap: 24 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                        <input
                          type="radio"
                          name="IsRelatedParty"
                          checked={form.isRelatedParty === 'yes'}
                          onChange={() => setForm({ ...form, isRelatedParty: 'yes' })}
                        />
                        Yes
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                        <input
                          type="radio"
                          name="IsRelatedParty"
                          checked={form.isRelatedParty === 'no'}
                          onChange={() => setForm({ ...form, isRelatedParty: 'no', relatedPartyDetails: '' })}
                        />
                        No
                      </label>
                    </div>
                    <p className="field-msg">Please select an option.</p>
                  </div>
                  {form.isRelatedParty === 'yes' && (
                    <div className={`field span-2${fieldErrors.relatedPartyDetails ? ' has-error' : ''}`}>
                      <label>
                        Related party details <span className="req">*</span>
                      </label>
                      <textarea
                        placeholder="Name, relationship, and role of the related broker or staff member"
                        value={form.relatedPartyDetails}
                        onChange={set('relatedPartyDetails')}
                      />
                      <p className="field-msg">Please provide details (at least a few words).</p>
                    </div>
                  )}
                </div>
              </section>

              <label className="consent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>
                  I confirm the information provided is accurate, and I agree to be contacted by RAK Properties
                  regarding my application. See our{' '}
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
            </>
          )}

          {step > 0 && submitError && (
            <p className="field-msg" style={{ display: 'block', margin: '-8px 0 20px' }}>
              {submitError}
            </p>
          )}

          {step > 0 && (
            <div className="wizard-actions">
              <button type="button" className="btn btn-outline" onClick={handleBack} disabled={submitting}>
                Back
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleNext}
                disabled={submitting || (step === STEPS.length - 1 && !consent)}
              >
                {submitting
                  ? step === STEPS.length - 1
                    ? 'Submitting…'
                    : 'Saving…'
                  : step === STEPS.length - 1
                    ? 'Submit application'
                    : 'Next'}
              </button>
            </div>
          )}
        </form>
      </main>

      <footer>&reg; RAK Properties 2026 &mdash; All Rights Reserved</footer>
    </div>
  )
}

export default RegistrationPage
