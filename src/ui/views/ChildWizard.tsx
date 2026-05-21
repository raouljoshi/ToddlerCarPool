import { useState } from "react";
import type { CreateChildRequest, UpdateChildRequest } from "../../application/dto";
import type { BorrowFlags, Child, Direction } from "../../domain/types";
import type { Translation } from "../i18n";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CreateChildWizardProps {
  mode: "create";
  t: Translation;
  enabledDirections: Direction[];
  loading: boolean;
  onCancel: () => void;
  onSubmit: (request: CreateChildRequest) => void;
}

interface EditChildWizardProps {
  mode: "edit";
  child: Child;
  t: Translation;
  enabledDirections: Direction[];
  loading: boolean;
  onCancel: () => void;
  onSubmit: (request: UpdateChildRequest) => void;
}

type ChildWizardProps = CreateChildWizardProps | EditChildWizardProps;

// ── Wizard ────────────────────────────────────────────────────────────────────

export function ChildWizard(props: ChildWizardProps) {
  const { t, enabledDirections, loading, onCancel } = props;

  const steps = [t.childStepName, t.childStepDirections, t.childStepBorrow, t.childStepReview];
  const lastStep = steps.length - 1;

  const [step, setStep] = useState(0);
  const [name, setName] = useState(props.mode === "edit" ? props.child.name : "");
  const [directions, setDirections] = useState<Direction[]>(
    props.mode === "edit" ? props.child.directions : enabledDirections,
  );
  const [borrows, setBorrows] = useState<BorrowFlags>(
    props.mode === "edit"
      ? props.child.borrows
      : { booster: false, rearFacing: false, frontFacing: false },
  );

  function toggleDirection(d: Direction) {
    setDirections((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  function toggleBorrow(key: keyof BorrowFlags) {
    setBorrows((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function canAdvance(): boolean {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return directions.length > 0;
    return true;
  }

  function handleSubmit() {
    const payload = {
      name: name.trim(),
      directions,
      borrows,
    };
    if (props.mode === "create") {
      props.onSubmit(payload);
    } else {
      props.onSubmit(payload);
    }
  }

  return (
    <section className="panel wizard">
      <h2>{props.mode === "create" ? t.childWizardTitle : t.childEditCta}</h2>
      <ol className="stepper" aria-label="Steps">
        {steps.map((label, i) => {
          const cls = i === step ? "active" : i < step ? "done" : "";
          return (
            <li key={i} className={cls}>
              <span className="num">{i + 1}</span>
              {label}
            </li>
          );
        })}
      </ol>

      <div className="wizard-step">
        {/* Step 0: Name */}
        {step === 0 && (
          <label>
            {t.childName}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="e.g. Leo"
              maxLength={40}
            />
          </label>
        )}

        {/* Step 1: Directions */}
        {step === 1 && (
          <>
            <p className="muted" style={{ fontSize: "0.92rem" }}>{t.pickDirectionsChild}</p>
            <div className="checkbox-row">
              {enabledDirections.map((d) => (
                <label key={d}>
                  <input
                    type="checkbox"
                    checked={directions.includes(d)}
                    onChange={() => toggleDirection(d)}
                  />
                  <span className={`dir-pill ${d}`}>
                    {d === "outbound" ? t.outboundLabel : t.inboundLabel}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Borrow */}
        {step === 2 && (
          <>
            <p className="muted" style={{ fontSize: "0.92rem" }}>{t.pickBorrow}</p>
            <div className="checkbox-row">
              <label>
                <input
                  type="checkbox"
                  checked={borrows.booster}
                  onChange={() => toggleBorrow("booster")}
                />
                {t.borrowBooster}
              </label>
            </div>
            <div className="checkbox-row">
              <label>
                <input
                  type="checkbox"
                  checked={borrows.rearFacing}
                  onChange={() => toggleBorrow("rearFacing")}
                />
                {t.borrowRearFacing}
              </label>
            </div>
            <div className="checkbox-row">
              <label>
                <input
                  type="checkbox"
                  checked={borrows.frontFacing}
                  onChange={() => toggleBorrow("frontFacing")}
                />
                {t.borrowFrontFacing}
              </label>
            </div>
          </>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div style={{ display: "grid", gap: "12px" }}>
            <p><strong>{name}</strong></p>
            <div className="row">
              {directions.map((d) => (
                <span key={d} className={`dir-pill ${d}`}>
                  {d === "outbound" ? t.outboundLabel : t.inboundLabel}
                </span>
              ))}
            </div>
            {(borrows.booster || borrows.rearFacing || borrows.frontFacing) && (
              <div className="row">
                {borrows.booster && <span className="muted" style={{ fontSize: "0.85rem" }}>↳ {t.borrowBooster}</span>}
                {borrows.rearFacing && <span className="muted" style={{ fontSize: "0.85rem" }}>↳ {t.borrowRearFacing}</span>}
                {borrows.frontFacing && <span className="muted" style={{ fontSize: "0.85rem" }}>↳ {t.borrowFrontFacing}</span>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="wizard-actions">
        <button
          type="button"
          className="secondary"
          onClick={step === 0 ? onCancel : () => setStep(step - 1)}
        >
          {step === 0 ? t.cancel : t.back}
        </button>
        {step === lastStep ? (
          <button type="button" className="accent" onClick={handleSubmit} disabled={loading}>
            {t.saveChild}
          </button>
        ) : (
          <button type="button" onClick={() => setStep(step + 1)} disabled={!canAdvance()}>
            {t.next}
          </button>
        )}
      </div>
    </section>
  );
}
