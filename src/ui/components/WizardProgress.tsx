interface WizardProgressProps {
  total: number;
  current: number;
}

export function WizardProgress({ total, current }: WizardProgressProps) {
  return (
    <div className="wiz-progress">
      <div className="wiz-progress-track">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`wiz-progress-seg${i <= current ? " on" : ""}`} />
        ))}
      </div>
    </div>
  );
}
