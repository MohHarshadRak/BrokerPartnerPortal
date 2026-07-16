import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useGetCommissionsSummaryQuery, useGetCommissionsQuery, useSubmitInvoiceMutation } from '../features/commissions/commissionsApi'
import { useToast } from '../components/useToast'

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'paid', label: 'Paid' },
]

function CommissionsPage() {
  const user = useSelector((state) => state.auth.user)
  const { data: summary } = useGetCommissionsSummaryQuery()
  const { data: commissions } = useGetCommissionsQuery()
  const [submitInvoice] = useSubmitInvoiceMutation()
  const { toastNode, showError, showSuccess, showToast } = useToast()

  const [statusFilter, setStatusFilter] = useState('all')
  const [statementOpen, setStatementOpen] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [invoiceLine, setInvoiceLine] = useState(null)
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceFile, setInvoiceFile] = useState(null)
  const [invoiceSent, setInvoiceSent] = useState(false)

  const rows = commissions ?? []
  const filteredRows = useMemo(() => rows.filter((r) => statusFilter === 'all' || r.status === statusFilter), [rows, statusFilter])

  const handleSubmitInvoice = async () => {
    try {
      await submitInvoice({ id: invoiceLine.id, invoiceNo }).unwrap()
      setInvoiceSent(true)
      showSuccess('Invoice submitted successfully.')
    } catch {
      showError('Could not submit the invoice — please try again.')
    }
  }

  const closeInvoice = () => {
    setInvoiceLine(null)
    setInvoiceNo('')
    setInvoiceFile(null)
    setInvoiceSent(false)
  }

  return (
    <>
      <div className="head">
        <div>
          <p className="eyebrow">Broker Portal</p>
          <h1>Commissions</h1>
        </div>
        <button className="btn" type="button" onClick={() => setStatementOpen(true)}>
          Download statement
        </button>
      </div>

      <section className="kpis" aria-label="Commission summary">
        <div className="kpi">
          <p className="label">Earned YTD</p>
          <p className="value">{summary?.earnedYtd ?? 'AED 0'}</p>
          <p className="sub">{summary?.earnedYtdSub ?? ''}</p>
        </div>
        <div className="kpi">
          <p className="label">Paid out</p>
          <p className="value">{summary?.paidOut ?? 'AED 0'}</p>
          <p className="sub">{summary?.paidOutSub ?? ''}</p>
        </div>
        <div className="kpi">
          <p className="label">Pending</p>
          <p className="value">{summary?.pending ?? 'AED 0'}</p>
          <p className="sub">{summary?.pendingSub ?? ''}</p>
        </div>
        <div className="kpi">
          <p className="label">Next payout run</p>
          <p className="value">{summary?.nextPayoutDate ?? '—'}</p>
          <p className="sub">monthly cycle</p>
        </div>
      </section>

      <section className="card" aria-label="Commission lines">
        <div className="card-head">
          <h2>Commission lines</h2>
          <div className="filters" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map((f) => (
              <button key={f.key} className={`chip${statusFilter === f.key ? ' active' : ''}`} type="button" onClick={() => setStatusFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Deal</th>
                <th>Client</th>
                <th>Booking ref</th>
                <th>Sale value (AED)</th>
                <th>Rate</th>
                <th>Commission (AED)</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="nm">{c.dealName}</span>
                    <span className="sub">{c.subLabel}</span>
                  </td>
                  <td>{c.clientName}</td>
                  <td>{c.bookingRef}</td>
                  <td>{c.saleValueAed?.toLocaleString()}</td>
                  <td>{c.rate}</td>
                  <td className="amount">{c.commissionAed?.toLocaleString()}</td>
                  <td>
                    <span className={`status ${c.status}`}>{c.statusLabel ?? c.status}</span>
                  </td>
                  <td>
                    {c.status === 'pending' && (
                      <Link className="row-cta" to={`/bookings#${c.bookingRef ?? ''}`}>
                        Track milestones
                      </Link>
                    )}
                    {c.status === 'approved' && (
                      <button className="row-cta" onClick={() => setInvoiceLine(c)}>
                        Submit invoice
                      </button>
                    )}
                    {c.status === 'paid' && (
                      <button className="row-cta" onClick={() => setReceipt(c)}>
                        Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={8}>No commission lines yet.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>Total</td>
                <td className="amount">{summary?.earnedYtd ?? 'AED 0'}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="info">
        <div className="card">
          <h3>How payouts work</h3>
          <p>
            Commission is released once the linked payment milestone is received from your client and your tax invoice is
            approved. Payout runs are processed monthly on the 25th — submit invoices at least 5 working days before the run.
          </p>
          <p style={{ marginTop: 12 }}>
            <button className="row-cta" onClick={() => setPolicyOpen(true)}>
              Commission policy &amp; agency agreement (PDF) &rarr;
            </button>
          </p>
        </div>
        <div className="card navy">
          <h3>Questions about a payment?</h3>
          <p>Broker relations team · Toll free 800 4020 · Sun–Thu, 9am–6pm GST</p>
          <a className="btn" href="https://www.rakproperties.ae/contact" target="_blank" rel="noopener noreferrer">
            Contact us
          </a>
        </div>
      </div>

      {statementOpen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Commission statement" onClick={(e) => e.target === e.currentTarget && setStatementOpen(false)}>
          <div className="stmt">
            <div className="stmt-top">
              <img src="/assets/img/rak_logo.svg" alt="RAK Properties" />
              <div className="stmt-meta">
                <p className="eyebrow">Commission statement</p>
                <p>
                  <b>{user?.fullName ?? 'Broker'}</b>
                  {user?.agency && ` · ${user.agency}`}
                  {user?.uid && ` · Broker ID ${user.uid}`}
                </p>
                <p>Period to date · Issued {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Ref</th>
                  <th>Rate</th>
                  <th>Commission (AED)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>{c.dealName}</td>
                    <td>{c.bookingRef}</td>
                    <td>{c.rate}</td>
                    <td className="amount">{c.commissionAed?.toLocaleString()}</td>
                    <td>{c.statusLabel ?? c.status}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ color: 'var(--rak-navy-60)' }}>
                      No commission lines yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="stmt-totals">
              <div className="row">
                <span>Paid to date</span>
                <b>{summary?.paidOut ?? 'AED 0'}</b>
              </div>
              <div className="row">
                <span>Pending</span>
                <b>{summary?.pending ?? 'AED 0'}</b>
              </div>
              <div className="row total">
                <span>Total earned</span>
                <span>{summary?.earnedYtd ?? 'AED 0'}</span>
              </div>
            </div>
            <p className="stmt-note">
              All amounts in AED, exclusive of VAT. This statement is generated for reference — final figures follow your
              agency agreement and approved tax invoices. For queries, contact broker relations on toll free 800 4020.
            </p>
            <div className="stmt-actions">
              <button className="btn" type="button" onClick={() => window.print()}>
                Print / save as PDF
              </button>
              <button className="btn ghost" type="button" onClick={() => setStatementOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Payout receipt" onClick={(e) => e.target === e.currentTarget && setReceipt(null)}>
          <div className="stmt" style={{ maxWidth: 520 }}>
            <div className="stmt-top">
              <img src="/assets/img/rak_logo.svg" alt="RAK Properties" />
              <div className="stmt-meta">
                <p className="eyebrow">Payout receipt</p>
              </div>
            </div>
            <div className="stmt-totals" style={{ borderTop: 'none', paddingTop: 10 }}>
              <div className="row">
                <span>Deal</span>
                <b>{receipt.dealName}</b>
              </div>
              <div className="row">
                <span>Booking reference</span>
                <b>{receipt.bookingRef}</b>
              </div>
              <div className="row">
                <span>Paid on</span>
                <b>{receipt.paidOn ?? '—'}</b>
              </div>
              <div className="row">
                <span>Payment reference</span>
                <b>{receipt.paymentRef ?? '—'}</b>
              </div>
              <div className="row total">
                <span>Amount paid</span>
                <span>AED {receipt.commissionAed?.toLocaleString()}</span>
              </div>
            </div>
            <p className="stmt-note">
              Paid by bank transfer to your registered account, exclusive of VAT. For queries quote the payment
              reference — toll free 800 4020.
            </p>
            <div className="stmt-actions">
              <button className="btn" type="button" onClick={() => window.print()}>
                Print / save as PDF
              </button>
              <button className="btn ghost" type="button" onClick={() => setReceipt(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {invoiceLine && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Submit tax invoice" onClick={(e) => e.target === e.currentTarget && closeInvoice()}>
          <div className="stmt" style={{ maxWidth: 520 }}>
            <p className="eyebrow">Approved commission</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, margin: '8px 0 4px' }}>
              Submit tax invoice — AED {invoiceLine.commissionAed?.toLocaleString()}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--rak-navy-60)', marginBottom: 18 }}>
              {invoiceLine.dealName} · Booking {invoiceLine.bookingRef}. Quote your TRN and the booking reference on the invoice.
            </p>
            {!invoiceSent ? (
              <>
                <label>Invoice number</label>
                <input type="text" placeholder="e.g. INV-2026-031" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} style={{ marginBottom: 16 }} />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    background: 'var(--rak-mist)',
                    border: '1px dashed var(--rak-navy-20)',
                    padding: '9px 14px',
                    flexWrap: 'wrap',
                    marginBottom: 16,
                  }}
                >
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-medium)' }}>
                    {invoiceFile ? invoiceFile.name : 'No file selected'}
                  </span>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ minWidth: 0, height: 32, lineHeight: '29px', padding: '0 18px', fontSize: 10 }}
                    onClick={() => document.getElementById('InvFile').click()}
                  >
                    Upload PDF
                  </button>
                  <input
                    type="file"
                    id="InvFile"
                    accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => setInvoiceFile(e.target.files[0] ?? null)}
                  />
                </div>
                <div className="stmt-actions">
                  <button className="btn" type="button" onClick={handleSubmitInvoice}>
                    Submit invoice
                  </button>
                  <button className="btn ghost" type="button" onClick={closeInvoice}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="stmt-note" style={{ color: '#2e5238' }}>
                  ✓ Invoice received — once approved it joins the next payout run.
                </p>
                <div className="stmt-actions">
                  <button className="btn ghost" type="button" onClick={closeInvoice}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {policyOpen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Commission policy and agency agreement" onClick={(e) => e.target === e.currentTarget && setPolicyOpen(false)}>
          <div className="stmt">
            <div className="stmt-top">
              <img src="/assets/img/rak_logo.svg" alt="RAK Properties" />
              <div className="stmt-meta">
                <p className="eyebrow">Commission policy &amp; agency agreement</p>
                <p>
                  <b>Key terms — summary for brokers</b>
                </p>
              </div>
            </div>
            <div className="body">
              <h4>Commission rates</h4>
              <p>Standard rate of 2% of the net sale value, with 2.5% on selected launches as announced per campaign.</p>
              <h4>Payout cycle</h4>
              <p>Commission is released milestone by milestone, joining the next monthly payout run on the 25th.</p>
              <h4>Lead protection</h4>
              <p>Registered leads are protected for 60 days from approval.</p>
              <h4>Invoicing requirements</h4>
              <p>Tax invoices must quote your TRN, the booking reference and the commission line amount.</p>
              <h4>Marketing &amp; conduct</h4>
              <p>
                All advertising of RAK Properties projects uses the approved assets in your marketing toolkits. Listings,
                pricing and campaign material require prior written approval from the broker relations team.
              </p>
            </div>
            <p className="stmt-note">This summary is provided for convenience — the signed agency agreement governs in full.</p>
            <div className="stmt-actions">
              <button className="btn" type="button" onClick={() => window.print()}>
                Print / save as PDF
              </button>
              <a
                className="btn ghost"
                href="#"
                style={{ minWidth: 0 }}
                onClick={(e) => {
                  e.preventDefault()
                  showToast("The signed agreement hasn't been attached yet — broker relations can share it directly.")
                }}
              >
                Download full agreement
              </a>
              <button className="btn ghost" type="button" onClick={() => setPolicyOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </>
  )
}

export default CommissionsPage
