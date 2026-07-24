import type { RegulationItem } from '../types';

interface RegulationCardProps {
  item: RegulationItem;
  /** Langue d'affichage des libelles chrome (defaut francais). */
  lang?: 'fr' | 'en';
}

/** Carte compacte d'un texte reglementaire. */
export default function RegulationCard({ item, lang = 'fr' }: RegulationCardProps) {
  const count = item.obligations.length;
  return (
    <article className="card regulation-card">
      <h4 className="regulation-card__title">{item.title}</h4>
      <p className="regulation-card__summary">{item.summary}</p>
      <p className="regulation-card__meta">
        {lang === 'en'
          ? `${count} key obligation${count > 1 ? 's' : ''}`
          : `${count} obligation${count > 1 ? 's' : ''} clé`}
      </p>
      <a
        className="regulation-card__link"
        href={item.officialUrl}
        target="_blank"
        rel="noreferrer"
      >
        {lang === 'en' ? 'Official source' : 'Source officielle'}
      </a>
    </article>
  );
}
