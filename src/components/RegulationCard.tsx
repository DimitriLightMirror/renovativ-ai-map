import type { RegulationItem } from '../types';

interface RegulationCardProps {
  item: RegulationItem;
}

/** Compact card for a regulation or incentive item. */
export default function RegulationCard({ item }: RegulationCardProps) {
  return (
    <article className="card regulation-card">
      <h4 className="regulation-card__title">{item.title}</h4>
      <p className="regulation-card__summary">{item.summary}</p>
      <p className="regulation-card__meta">
        {item.obligations.length} key point{item.obligations.length > 1 ? 's' : ''}
      </p>
      <a
        className="regulation-card__link"
        href={item.officialUrl}
        target="_blank"
        rel="noreferrer"
      >
        Official source
      </a>
    </article>
  );
}
