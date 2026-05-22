import { useState } from "react";
import { ArrowRight, Check, ChevronLeft } from "lucide-react";
import type { CreateChildRequest, UpdateChildRequest } from "../../application/dto";
import type { BorrowFlags, Child, Direction } from "../../domain/types";
import type { Translation } from "../i18n";
import { DirectionPicker } from "../components/DirectionPicker";
import { WizardProgress } from "../components/WizardProgress";

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

export function ChildWizard(props: ChildWizardProps) {
  const { t, enabledDirections, loading, onCancel } = props;

  const lastStep = 3;
  const progressTotal = 4;

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
    const payload = { name: name.trim(), directions, borrows };
    props.onSubmit(payload);
  }

  const childInitial = (name.trim()[0] ?? "?").toUpperCase();

  const prompts = [
    t.promptChildName,
    t.promptChildDirections,
    t.promptChildBorrow,
    t.promptChildReview,
  ];

  return (
    <section className="panel wizard">
      <div className="wiz-header">
        <button
          type="button"
          className="wiz-back"
          onClick={step === 0 ? onCancel : () => setStep(step - 1)}
          aria-label={step === 0 ? t.cancel : t.back}
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <WizardProgress total={progressTotal} current={step} />
      </div>

      <div className="wizard-step">
        <p className="wizard-prompt">{prompts[step]}</p>

        {step === 0 && (
          <div className="child-preview-layout">
            <div className="child-preview-card" aria-hidden="true">
              <span className="child-avatar">{childInitial}</span>
              <strong>{name.trim() || t.childName}</strong>
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="e.g. Leo"
              maxLength={40}
            />
          </div>
        )}

        {step === 1 && (
          <DirectionPicker
            options={enabledDirections}
            selected={directions}
            labelFor={(d) => (d === "outbound" ? t.outboundLabel : t.inboundLabel)}
            onToggle={toggleDirection}
          />
        )}

        {step === 2 && (
          <div className="checkbox-row visual-choice-grid">
            <label>
              <input
                type="checkbox"
                checked={borrows.booster}
                onChange={() => toggleBorrow("booster")}
              />
              {t.borrowBooster}
            </label>
            <label>
              <input
                type="checkbox"
                checked={borrows.rearFacing}
                onChange={() => toggleBorrow("rearFacing")}
              />
              {t.borrowRearFacing}
            </label>
            <label>
              <input
                type="checkbox"
                checked={borrows.frontFacing}
                onChange={() => toggleBorrow("frontFacing")}
              />
              {t.borrowFrontFacing}
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="review-card">
            <div className="child-review-head">
              <span className="child-avatar">{childInitial}</span>
              <strong>{name}</strong>
            </div>
            <div className="row">
              {directions.map((d) => (
                <span key={d} className={`dir-pill ${d}`}>
                  {d === "outbound" ? t.outboundLabel : t.inboundLabel}
                </span>
              ))}
            </div>
            {(borrows.booster || borrows.rearFacing || borrows.frontFacing) && (
              <p className="muted hint">
                {[
                  borrows.booster ? t.borrowBooster : "",
                  borrows.rearFacing ? t.borrowRearFacing : "",
                  borrows.frontFacing ? t.borrowFrontFacing : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="wiz-nav">
        {step === lastStep ? (
          <button
            type="button"
            className="wiz-advance accent"
            onClick={handleSubmit}
            disabled={loading}
            aria-label={t.saveChild}
          >
            <Check size={22} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            type="button"
            className="wiz-advance"
            onClick={() => setStep(step + 1)}
            disabled={!canAdvance()}
            aria-label={t.next}
          >
            <ArrowRight size={22} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </section>
  );
}
