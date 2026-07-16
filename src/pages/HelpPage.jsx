import { useState } from 'react'
import { Link } from 'react-router-dom'

const FAQ_SECTIONS = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'How do I get access to the portal?',
        search:
          'Register as a freelancer or a licensed agency. Our team verifies your documents (usually within 2 working days), sends the agency agreement for electronic signature, and emails your credentials once countersigned.',
        a: (
          <>
            <Link to="/register">Register</Link> as a freelancer or a licensed agency. Our team verifies your documents
            (usually within 2 working days), sends the agency agreement for electronic signature, and emails your
            credentials once countersigned.
          </>
        ),
      },
      {
        q: 'What documents do I need to register?',
        a: 'Freelancers: Emirates ID or passport, and your broker permit / RERA card if you hold one. Agencies: trade licence copy, licence number and the authorised signatory’s details. Files upload as PDF or image, up to 5 MB.',
      },
      {
        q: 'I forgot my password — what do I do?',
        a: 'On the sign-in page, choose "Forgot password?", enter your username or registered email, and a reset link is sent to you.',
      },
      {
        q: 'My trade licence is expiring — does it affect my account?',
        a: 'Yes — an expired licence pauses new reservations until it’s renewed. You’ll see an alert in your profile ahead of the expiry date; send the renewed licence to broker relations to keep everything active.',
      },
    ],
  },
  {
    title: 'Projects & resources',
    items: [
      {
        q: 'Where do I find brochures, factsheets and floor plans?',
        a: "Open any project in Projects & resources — its marketing toolkit sits beside the overview with brochures, factsheets, floor plans and image packs. If an asset shows Request, it hasn't been attached yet — broker relations can share it directly.",
      },
      {
        q: 'How current is the availability shown?',
        a: 'Unit availability is live from our inventory. You can filter within a project by unit number, bedrooms, size and price — and reserve directly from any available unit.',
      },
      {
        q: 'How do I follow construction progress?',
        a: 'Each project page includes construction updates — monthly progress by discipline (enabling, structure, finishes, MEP, external) with an overall figure and a video walkthrough, mirroring the public site.',
      },
      {
        q: 'What are the two masterplans?',
        a: 'Mina — the urban island destination across Downtown Mina, Raha Island and Hayat Island. The Strand — the new people-first community in the Marjan Beach District, opening with Lunara.',
      },
    ],
  },
  {
    title: 'Leads',
    items: [
      {
        q: 'How do I register a lead?',
        a: 'Go to My leads → Register a lead and enter your client’s details as they appear on their Emirates ID or passport, attach the passport copy (max 4 MB) and submit. You’ll receive a Lead ID immediately.',
      },
      {
        q: 'How long is my lead protected?',
        a: '60 days from approval. Protection follows the first valid registration — duplicates are resolved in favour of the earlier record.',
      },
      {
        q: 'What do the lead statuses mean?',
        a: 'New — registered, not yet contacted. Contacted — first conversation logged. Site visit — appointment booked. Negotiation — actively discussing a unit. Won — converted to a booking. Lost — closed, can be re-opened.',
      },
      {
        q: 'How do site visits work?',
        a: 'From a contacted lead, choose Book site visit — your client receives an invitation for the Mina sales centre and the sales team prepares the units of interest.',
      },
    ],
  },
  {
    title: 'Reservations & bookings',
    items: [
      {
        q: 'How do I reserve a unit?',
        search:
          "From any available unit choose Reserve, or go to Bookings → New reservation. Select the project, unit, your registered lead and the payment plan, upload the client's ID, and place the reservation. Complete the reservation, including payment, within 20 minutes — one 20-minute postponement is allowed. A land registration fee of AED 3,000 applies at reservation.",
        a: (
          <>
            From any available unit choose <b>Reserve</b>, or go to <Link to="/bookings?new=1">Bookings → New reservation</Link>.
            Select the project, unit, your registered lead and the payment plan, upload the client's ID, and place the
            reservation.
            <ul>
              <li>
                Complete the reservation, including payment, within <b>20 minutes</b> — one 20-minute postponement is
                allowed.
              </li>
              <li>
                A land registration fee of <b>AED 3,000</b> applies at reservation.
              </li>
            </ul>
          </>
        ),
      },
      {
        q: 'What’s the difference between a hold and an EOI?',
        a: 'A hold keeps the unit for your client for 48 hours with no payment. An EOI of AED 50,000 secures it beyond the hold while the down payment is collected.',
      },
      {
        q: 'Which payment plans are available?',
        a: 'Plans vary by project and unit — typically Standard 50/50, 40/60, and post-handover options (60/40, 50/50 PHPP).',
      },
      {
        q: 'Can I add a joint buyer?',
        a: 'Yes — tick Add a joint buyer in the reservation form and enter their name, passport number and mobile.',
      },
      {
        q: 'What do the booking statuses mean?',
        a: 'On hold — 48-hour hold, no payment yet. EOI paid — secured while the down payment is collected. Reserved — down payment received. SPA signed — milestone payments under way. Completed — fully paid and handed over.',
      },
    ],
  },
  {
    title: 'Commissions',
    items: [
      {
        q: 'When do I get paid?',
        a: 'Commission releases milestone by milestone: once the linked client payment is received and your tax invoice is approved, the amount joins the next monthly payout run on the 25th.',
      },
      {
        q: 'What are the commission rates?',
        a: 'Standard 2% of net sale value, with 2.5% on selected launches as announced per campaign.',
      },
      {
        q: 'How do I submit my invoice?',
        a: 'When a commission line shows Approved, choose Submit invoice, enter the invoice number and upload the PDF.',
      },
      {
        q: 'Where are my statements and receipts?',
        a: 'Download statement on the Commissions page gives you a print-ready statement of all lines; every paid line has a Receipt with the payment reference.',
      },
    ],
  },
]

function HelpPage() {
  const [query, setQuery] = useState('')
  const term = query.trim().toLowerCase()

  const sections = FAQ_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !term || `${item.q} ${item.search ?? item.a}`.toLowerCase().includes(term)),
  })).filter((section) => section.items.length > 0)

  return (
    <div className="page narrow" style={{ padding: 0 }}>
      <p className="eyebrow">Broker Portal</p>
      <h1>Help &amp; FAQ</h1>
      <p className="lead">Everything you need to know about working with RAK Properties — from your first lead to your commission payout.</p>

      <div className="quickstart" aria-label="Quick start">
        <div className="qs">
          <p className="n">1</p>
          <p className="t">Register your lead</p>
          <p>
            Protect your client for 60 days — <Link to="/leads?register=1">register a lead</Link> before anything else.
          </p>
        </div>
        <div className="qs">
          <p className="n">2</p>
          <p className="t">Share the project</p>
          <p>
            Brochures, floor plans and live availability in <Link to="/projects">Projects &amp; resources</Link>.
          </p>
        </div>
        <div className="qs">
          <p className="n">3</p>
          <p className="t">Reserve the unit</p>
          <p>
            Hold, take the EOI and <Link to="/bookings?new=1">create the reservation</Link> — within 20 minutes.
          </p>
        </div>
        <div className="qs">
          <p className="n">4</p>
          <p className="t">Get paid</p>
          <p>
            Track milestones and invoices under <Link to="/commissions">Commissions</Link>. Payouts run on the 25th.
          </p>
        </div>
      </div>

      <div className="faq-search">
        <input
          type="search"
          placeholder='Search the FAQ — e.g. "lead protection", "payment plan", "invoice"…'
          aria-label="Search the FAQ"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {sections.map((section) => (
        <section className="faq-section" key={section.title}>
          <h2>{section.title}</h2>
          {section.items.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <div className="answer">{item.a}</div>
            </details>
          ))}
        </section>
      ))}

      {sections.length === 0 && (
        <p className="no-results show">No answers match your search — try different words, or call us on toll free 800 4020.</p>
      )}

      <section className="help-support">
        <div>
          <p className="eyebrow">Still need a hand?</p>
          <h3>Broker relations team</h3>
          <p>
            Toll free 800 4020 · Sun–Thu, 9am–6pm GST
            <br />
            Sales Pavilion, Gate No.1, Mina, Ras Al Khaimah · Dubai office, Bay Square Building 8, Business Bay
          </p>
        </div>
        <a className="btn" href="https://www.rakproperties.ae/contact" target="_blank" rel="noopener noreferrer">
          Contact us
        </a>
      </section>
    </div>
  )
}

export default HelpPage
