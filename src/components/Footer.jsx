const socialLinks = [
  { label: 'Facebook', href: 'https://www.facebook.com/RakProperties/', className: 'icon-fb' },
  { label: 'Linkedin', href: 'https://www.linkedin.com/company/rak-properties/', className: 'icon-li' },
  { label: 'Instagram', href: 'https://www.instagram.com/rakpropofficial/', className: 'icon-ig' },
  { label: 'X', href: 'https://twitter.com/rakpropofficial', className: 'icon-x' },
]

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="row footer-top">
          <div className="col-sm-12 col-md-6">
            <ul className="social">
              {socialLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} target="_blank" rel="noreferrer" className={link.className}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-sm-12 col-md-6 text-md-end">
            <img
              src="https://www.rakproperties.ae/wp-content/themes/RAK/images/rak-logo.svg"
              className="logo"
              alt="RAK Properties"
            />
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
