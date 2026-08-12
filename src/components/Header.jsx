function Header() {
  return (
    <header>
      <div className="container">
        <div className="headerContent">
          <a href="https://www.rakproperties.ae/">
            <img src={`${import.meta.env.BASE_URL}assets/img/rak_logo.svg`} alt="RAK Properties" />
          </a>
          <h1>
            RAK Properties <br />
            Broker Partner Portal
          </h1>
        </div>
      </div>
    </header>
  )
}

export default Header
