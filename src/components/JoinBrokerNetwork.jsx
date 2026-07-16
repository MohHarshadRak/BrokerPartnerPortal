const cards = [
  {
    image: '/uploads/Frame1.png',
    alt: 'official project access',
    title: 'Official project access',
    text: 'Stay informed with verified project details, availability updates, and sales resources.',
  },
  {
    image: '/uploads/Frame2.png',
    alt: 'clear onboarding journey',
    title: 'Clear onboarding journey',
    text: 'Stay informed with verified project details, availability updates, and sales resources.',
  },
  {
    image: '/uploads/Frame3.png',
    alt: 'Dedicated broker support',
    title: 'Dedicated broker support',
    text: 'Stay informed with verified project details, availability updates, and sales resources.',
  },
  {
    image: '/uploads/Frame4.png',
    alt: 'Confidence for your clients',
    title: 'Confidence for your clients',
    text: 'Stay informed with verified project details, availability updates, and sales resources.',
  },
]

function JoinBrokerNetwork() {
  return (
    <section className="joinTheBrokerNetwork">
      <div className="container">
        <h2 data-aos="fade-up" data-aos-delay="100" data-aos-duration="800">
          Why join the broker network?
        </h2>
      </div>
      <div
        className="joinTheBrokerNetworkCards"
        data-aos="fade-up"
        data-aos-delay="100"
        data-aos-duration="800"
      >
        {cards.map((card) => (
          <div className="brokerNetworkCard" key={card.title}>
            <img src={card.image} alt={card.alt} />
            <div className="cardContent">
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default JoinBrokerNetwork
