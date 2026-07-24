import type { RegulationItem } from '../types';

interface RegulationCardProps {
  item: RegulationItem;
}

/** Carte compacte d'un texte reglementaire. */
export default function RegulationCard({ item }: RegulationCardProps) {
  return (
    <article className="card regulation-card">
      <h4 className="regulation-card__title">{item.title}</h4>
      <p className="regulation-card__summary">{item.summary}</p>
      <p className="regulation-card__meta">
        {item.obligations.length} obligation{item.obligations.length > 1 ? 's' : ''} clé
      </p>
      <a
        className="regulation-card__link"
        href={item.officialUrl}
        target="_blank"
        rel="noreferrer"
      >
        Source officielle
      </a>
    </article>
  );
}
