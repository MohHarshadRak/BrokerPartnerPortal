const steps = [
  {
    number: '1',
    title: 'Sign up with UAE PASS',
    text: 'Begin securely using your verified UAE PASS account.',
  },
  {
    number: '2',
    title: 'Complete your broker profile',
    text: 'Submit your agency, license, and contact details',
  },
  {
    number: '3',
    title: 'Await approval',
    text: 'Once reviewed, approved brokers can access the portal and begin working with RAK Properties.',
  },
]

function RegistrationWorks() {
  return (
    <section className="registractionWorks">
      <div className="container">
        <div
          className="registractionWorksContainer"
          data-aos="fade-up"
          data-aos-delay="100"
          data-aos-duration="800"
        >
          <h2>How registration works</h2>
          <div className="registractionWorksCards">
            {steps.map((step) => (
              <div className="registractionCards" key={step.number}>
                <h3>{step.number}</h3>
                <div className="cardcontent">
                  <h4>{step.title}</h4>
                  <p>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default RegistrationWorks
