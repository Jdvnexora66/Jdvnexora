import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Database, LoaderCircle } from 'lucide-react';

export type ModuleMetric = {
  label: string;
  value: string | number;
  note?: string;
};

type ModuleDataOverviewProps = {
  sources: string[];
  metrics?: ModuleMetric[];
  loading?: boolean;
  error?: boolean;
  caption?: string;
};

/**
 * A transparent, data-backed summary for métier pages.
 * Values must be supplied by the page from data already loaded from its real source.
 * This component never fabricates values or performs its own database query.
 */
export default function ModuleDataOverview({
  sources,
  metrics = [],
  loading = false,
  error = false,
  caption = 'Les indicateurs reflètent les données chargées par ce module.',
}: ModuleDataOverviewProps) {
  const status = loading
    ? { label: 'Chargement des données', className: 'is-loading' }
    : error
      ? { label: 'Lecture à vérifier', className: 'has-error' }
      : { label: 'État de lecture disponible', className: 'is-ready' };

  return (
    <section className="module-data-overview" aria-label="Synthèse et sources du module" aria-busy={loading}>
      <div className="module-data-overview-head">
        <div className="module-data-overview-label">
          <span className="module-data-overview-kicker">SYNTHÈSE MÉTIER</span>
          <span className="module-data-overview-caption">{caption}</span>
        </div>
        <span className={`module-data-status ${status.className}`} role={error ? 'alert' : 'status'}>
          {loading ? <LoaderCircle size={14} className="module-data-spin" /> : error ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          {status.label}
        </span>
      </div>
      {metrics.length > 0 && (
        <div className="module-data-metrics">
          {metrics.map((metric) => (
            <article className="module-data-metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              {metric.note && <small>{metric.note}</small>}
            </article>
          ))}
        </div>
      )}
      <div className="module-data-sources">
        <span className="module-data-sources-label"><Database size={14} /> Sources raccordées</span>
        <div className="module-data-source-list">
          {sources.map((source) => <span className="module-data-source" key={source}>{source}</span>)}
        </div>
      </div>
    </section>
  );
}
