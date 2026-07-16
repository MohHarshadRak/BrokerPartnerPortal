import { useState } from 'react'

const menuLinks = [
  { label: 'Home', href: 'https://www.rakproperties.ae/' },
  { label: 'Properties', href: 'https://www.rakproperties.ae/our-properties/' },
  { label: 'Mina', href: 'https://mina.rakproperties.ae/' },
  {
    label: 'The Strand',
    href: 'https://thestrand.ae/?utm_source=RAKP_Website&utm_medium=Homepage_menu',
  },
  { label: 'Hospitality', href: 'https://www.rakproperties.ae/hospitality/' },
  { label: 'Leasing', href: 'https://www.rakproperties.ae/leasing/' },
  { label: 'Marina', href: 'https://www.rakproperties.ae/lagoon-marina/' },
  { label: 'About us', href: 'https://www.rakproperties.ae/about-rak-properties/' },
  { label: 'Ras Al Khaimah', href: 'https://www.rakproperties.ae/discover-rak/' },
  { label: 'Insights', href: 'https://www.rakproperties.ae/knowledge' },
  { label: 'News', href: 'https://www.rakproperties.ae/news/' },
  { label: 'Investor HUB', href: 'https://www.rakproperties.ae/investor-hub/' },
]

function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <div
        id="menu-trigger"
        className={`hamburger hamburger--collapse${menuOpen ? ' is-active' : ''}`}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <div className="hamburger-box">
          <div className="hamburger-inner"></div>
        </div>
        <p>MENU</p>
      </div>

      <div className="buy-rent">
        <a href="https://www.rakproperties.ae/our-properties/" target="_blank" rel="noreferrer" className="buy-btn">
          BUY
        </a>
        <a href="https://www.rakproperties.ae/leasing/" target="_blank" rel="noreferrer" className="buy-btn">
          RENT
        </a>
      </div>

      <div className="menu-bar">
        <a href="https://www.rakproperties.ae/" className="logo d-none d-lg-block">
          <img src="https://www.rakproperties.ae/wp-content/themes/RAK/images/rak-logo-vertical.svg" alt="RAK Properties" />
        </a>
        <a href="https://www.rakproperties.ae/" className="mob-logo d-lg-none">
          <img src="https://www.rakproperties.ae/wp-content/themes/RAK/images/rak-logo-mob.svg" alt="RAK Properties" />
        </a>
      </div>

      <div className={`menu-wrap${menuOpen ? ' is-open' : ''}`}>
        <div className="buy-rent2">
          <a href="https://www.rakproperties.ae/our-properties/" target="_blank" rel="noreferrer" className="buy-btn">
            BUY
          </a>
          <a href="https://www.rakproperties.ae/leasing/" target="_blank" rel="noreferrer" className="buy-btn">
            RENT
          </a>
        </div>
        <ul className="menu">
          {menuLinks.map((link) => (
            <li key={link.label}>
              <a href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <a href="https://www.rakproperties.ae/contact/" className="btn btn2" target="_blank" rel="noreferrer">
              Contact us
            </a>
          </li>
        </ul>
        <img
          src="https://www.rakproperties.ae/wp-content/themes/RAK/images/rak-logo-short-bc2.svg"
          className="logo"
          alt="RAK Properties"
        />
      </div>
    </>
  )
}

export default Navigation
