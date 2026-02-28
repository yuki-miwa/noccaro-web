interface StatCardProps {
  title: string
  value: string | number
  hint?: string
}

export function StatCard({ title, value, hint }: StatCardProps) {
  return (
    <article className="stat-card">
      <p className="stat-card-title">{title}</p>
      <p className="stat-card-value">{value}</p>
      {hint ? <p className="stat-card-hint">{hint}</p> : null}
    </article>
  )
}
