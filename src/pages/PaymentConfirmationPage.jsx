import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useConfirmPaymentQuery } from '../features/bookings/bookingsApi'

// Lands here after the MIGS/VPC gateway redirects the broker's browser back from payment
// (see BookingsService.BuildPaymentGatewayRedirectUrl's vpc_ReturnURL). The vpc_ fields arrive
// as query params; this page forwards them to the backend as an authenticated request (the
// broker's JWT is still in local storage from before the gateway detour) rather than the
// gateway itself hitting an anonymous backend endpoint, since a bearer token can't otherwise
// survive that round trip. Also doubles as the printable reservation receipt — reuses the same
// .stmt statement/receipt design as CommissionsPage's payout receipt, for a consistent look
// across every receipt in the app.
function PaymentConfirmationPage() {
  const [searchParams] = useSearchParams()

  const vpcParams = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams])
  const hasVpcParams = Object.keys(vpcParams).length > 0

  const { data, error, isLoading } = useConfirmPaymentQuery(vpcParams, { skip: !hasVpcParams })

  const handlePrint = () => window.print()

  if (!hasVpcParams) {
    return (
      <div className="card">
        <div className="card-head">
          <h2>Payment Confirmation</h2>
        </div>
        <div className="pad">
          <p>
            No payment response was found on this page. If you were sent here directly, return to{' '}
            <Link to="/bookings">Bookings</Link>.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-head">
          <h2>Payment Confirmation</h2>
        </div>
        <div className="pad">
          <p>Confirming your payment&hellip;</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="card">
        <div className="card-head">
          <h2>Payment Confirmation</h2>
        </div>
        <div className="pad">
          <p>We couldn&rsquo;t confirm this payment. Please contact support with your transaction reference.</p>
          <p>
            <Link to="/bookings">Back to Bookings</Link>
          </p>
        </div>
      </div>
    )
  }

  const rows = [
    [data.isEoi ? 'Hold Ref' : 'Reservation No', data.reservationId || '—'],
    ['Transaction Ref', data.transactionRefNo || '—'],
    ['Property', data.propertyName || '—'],
    ['Unit No', data.unitNo || '—'],
    ['Client Name', data.clientName || '—'],
    ['Lead Ref', data.leadId || '—'],
    ['Email', data.payeeEmail || '—'],
    ['Mobile', data.payeeMobile || '—'],
    ['Nationality', data.nationality || '—'],
    ['Passport No', data.passport || '—'],
  ]

  return (
    <div className="stmt" style={{ maxWidth: 520 }}>
      <div className="stmt-top">
        <img src={`${import.meta.env.BASE_URL}assets/img/rak_logo.svg`} alt="RAK Properties" />
        <div className="stmt-meta">
          <p className="eyebrow">{data.isEoi ? 'EOI Receipt' : 'Reservation Receipt'}</p>
          <span className={`status ${data.success ? 'done' : 'cancelled'}`}>
            {data.success ? 'Confirmed' : 'Not Confirmed'}
          </span>
        </div>
      </div>

      <div className="stmt-totals" style={{ borderTop: 'none', paddingTop: 10 }}>
        {rows.map(([label, value]) => (
          <div className="row" key={label}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
        <div className="row total">
          <span>Amount Paid</span>
          <span>AED {Number(data.amount || 0).toLocaleString()}</span>
        </div>
      </div>

      <p className="stmt-note">{data.message}</p>

      <div className="stmt-actions no-print">
        <button className="btn" type="button" onClick={handlePrint}>
          Print / save as PDF
        </button>
        <Link className="btn ghost" to="/bookings">
          Back to Bookings
        </Link>
      </div>
    </div>
  )
}

export default PaymentConfirmationPage
