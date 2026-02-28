interface PlaceholderPageProps {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
      </div>
      <p className="empty-text">{description}</p>
      <p className="empty-text">The detailed implementation for this screen is in the next commit step.</p>
    </section>
  )
}
