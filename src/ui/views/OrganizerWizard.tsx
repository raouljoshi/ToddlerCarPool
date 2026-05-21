import { useState } from "react";
import type { CreateRoomRequest } from "../../application/dto";
import type { DirectionMeta, TimeReference } from "../../domain/types";
import type { Translation } from "../i18n";

interface WizardState {
  label: string;
  staticInfo: string;
  mapLink: string;
  outboundEnabled: boolean;
  outboundTime: string;
  outboundTimeReference: TimeReference;
  outboundInfo: string;
  inboundEnabled: boolean;
  inboundTime: string;
  inboundTimeReference: TimeReference;
  inboundInfo: string;
}

const STEPS = ["event", "outbound", "inbound", "review"] as const;
type Step = (typeof STEPS)[number];

function stepIndex(step: Step) {
  return STEPS.indexOf(step);
}

interface OrganizerWizardProps {
  t: Translation;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (request: CreateRoomRequest) => void;
}

export function OrganizerWizard({ t, loading, onCancel, onSubmit }: OrganizerWizardProps) {
  const [step, setStep] = useState<Step>("event");
  const [form, setForm] = useState<WizardState>({
    label: "",
    staticInfo: "",
    mapLink: "",
    outboundEnabled: true,
    outboundTime: "",
    outboundTimeReference: "departure",
    outboundInfo: "",
    inboundEnabled: false,
    inboundTime: "",
    inboundTimeReference: "departure",
    inboundInfo: "",
  });

  function field<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function canAdvance(): boolean {
    if (step === "event") return form.label.trim().length > 0;
    return true;
  }

  function handleSubmit() {
    const outbound: DirectionMeta = {
      enabled: form.outboundEnabled,
      time: form.outboundEnabled && form.outboundTime ? form.outboundTime : undefined,
      timeReference:
        form.outboundEnabled && form.outboundTime
          ? form.outboundTimeReference
          : undefined,
      info: form.outboundEnabled && form.outboundInfo ? form.outboundInfo : undefined,
    };
    const inbound: DirectionMeta = {
      enabled: form.inboundEnabled,
      time: form.inboundEnabled && form.inboundTime ? form.inboundTime : undefined,
      timeReference:
        form.inboundEnabled && form.inboundTime ? form.inboundTimeReference : undefined,
      info: form.inboundEnabled && form.inboundInfo ? form.inboundInfo : undefined,
    };
    onSubmit({
      label: form.label.trim(),
      staticInfo: form.staticInfo.trim() || undefined,
      mapLink: form.mapLink.trim() || undefined,
      outbound,
      inbound,
    });
  }

  const si = stepIndex(step);
  const isFirst = si === 0;
  const isLast = si === STEPS.length - 1;

  function stepLabel(s: Step) {
    if (s === "event") return t.setupStepEvent;
    if (s === "outbound") return t.setupStepOutbound;
    if (s === "inbound") return t.setupStepInbound;
    return t.setupStepReview;
  }

  return (
    <section className="panel wizard">
      <ol className="stepper" aria-label="Wizard steps">
        {STEPS.map((s) => {
          const idx = stepIndex(s);
          const cls =
            s === step ? "active" : idx < stepIndex(step) ? "done" : "";
          return (
            <li key={s} className={cls}>
              <span className="num">{idx + 1}</span>
              {stepLabel(s)}
            </li>
          );
        })}
      </ol>

      <div className="wizard-step">
        {step === "event" && (
          <>
            <label>
              {t.eventName}
              <input
                value={form.label}
                onChange={(e) => field("label", e.target.value)}
                autoFocus
                placeholder="e.g. Sara's birthday party"
              />
            </label>
            <label>
              {t.eventInfo} <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 400 }}>(optional)</span>
              <textarea
                value={form.staticInfo}
                onChange={(e) => field("staticInfo", e.target.value)}
                placeholder="Address, notes for everyone…"
              />
            </label>
            <label>
              {t.mapLink} <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 400 }}>(optional)</span>
              <input
                type="url"
                value={form.mapLink}
                onChange={(e) => field("mapLink", e.target.value)}
                placeholder="https://maps.google.com/…"
              />
            </label>
          </>
        )}

        {(step === "outbound" || step === "inbound") && (
          <DirectionStep
            t={t}
            direction={step}
            enabled={step === "outbound" ? form.outboundEnabled : form.inboundEnabled}
            time={step === "outbound" ? form.outboundTime : form.inboundTime}
            timeReference={
              step === "outbound" ? form.outboundTimeReference : form.inboundTimeReference
            }
            info={step === "outbound" ? form.outboundInfo : form.inboundInfo}
            onEnabled={(v) =>
              field(step === "outbound" ? "outboundEnabled" : "inboundEnabled", v)
            }
            onTime={(v) => field(step === "outbound" ? "outboundTime" : "inboundTime", v)}
            onTimeReference={(v) =>
              field(
                step === "outbound" ? "outboundTimeReference" : "inboundTimeReference",
                v,
              )
            }
            onInfo={(v) => field(step === "outbound" ? "outboundInfo" : "inboundInfo", v)}
          />
        )}

        {step === "review" && (
          <ReviewStep t={t} form={form} />
        )}
      </div>

      <div className="wizard-actions">
        <button type="button" className="secondary" onClick={isFirst ? onCancel : () => setStep(STEPS[si - 1])}>
          {isFirst ? t.cancel : t.back}
        </button>
        {isLast ? (
          <button
            type="button"
            className="accent"
            onClick={handleSubmit}
            disabled={loading}
          >
            {t.createRoom}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep(STEPS[si + 1])}
            disabled={!canAdvance()}
          >
            {t.next}
          </button>
        )}
      </div>
    </section>
  );
}

function DirectionStep({
  t,
  direction,
  enabled,
  time,
  timeReference,
  info,
  onEnabled,
  onTime,
  onTimeReference,
  onInfo,
}: {
  t: Translation;
  direction: "outbound" | "inbound";
  enabled: boolean;
  time: string;
  timeReference: TimeReference;
  info: string;
  onEnabled: (v: boolean) => void;
  onTime: (v: string) => void;
  onTimeReference: (v: TimeReference) => void;
  onInfo: (v: string) => void;
}) {
  return (
    <>
      <div className="checkbox-row">
        <label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabled(e.target.checked)}
          />
          {direction === "outbound" ? t.enableOutbound : t.enableInbound}
        </label>
      </div>

      {enabled && (
        <>
          <label>
            {t.time}
            <input
              type="time"
              value={time}
              onChange={(e) => onTime(e.target.value)}
            />
          </label>
          {time && (
            <div>
              <p className="muted" style={{ fontSize: "0.92rem", marginBottom: "8px" }}>
                {t.timeReference}
              </p>
              <div className="segmented" role="group" aria-label={t.timeReference}>
                <button
                  type="button"
                  className={timeReference === "departure" ? "active" : ""}
                  onClick={() => onTimeReference("departure")}
                >
                  {t.timeReferenceDeparture}
                </button>
                <button
                  type="button"
                  className={timeReference === "arrival" ? "active" : ""}
                  onClick={() => onTimeReference("arrival")}
                >
                  {t.timeReferenceArrival}
                </button>
              </div>
            </div>
          )}
          <label>
            {t.directionInfo}
            <textarea
              value={info}
              onChange={(e) => onInfo(e.target.value)}
              placeholder="Optional notes for this trip…"
            />
          </label>
        </>
      )}
    </>
  );
}

function ReviewStep({ t, form }: { t: Translation; form: WizardState }) {
  return (
    <div style={{ display: "grid", gap: "12px" }}>
      <p className="muted" style={{ fontSize: "0.92rem" }}>{t.reviewIntro}</p>
      <div className="card" style={{ padding: "12px 16px", display: "grid", gap: "8px" }}>
        <p>
          <strong>{form.label}</strong>
        </p>
        {form.staticInfo && <p className="muted">{form.staticInfo}</p>}
        {form.mapLink && (
          <p>
            <a href={form.mapLink} target="_blank" rel="noreferrer" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
              {t.mapLinkOpen}
            </a>
          </p>
        )}
      </div>
      <DirectionSummary
        label={t.outboundLabel}
        enabled={form.outboundEnabled}
        time={form.outboundTime}
        timeReference={form.outboundTimeReference}
        info={form.outboundInfo}
        t={t}
        colorClass="outbound"
      />
      <DirectionSummary
        label={t.inboundLabel}
        enabled={form.inboundEnabled}
        time={form.inboundTime}
        timeReference={form.inboundTimeReference}
        info={form.inboundInfo}
        t={t}
        colorClass="inbound"
      />
    </div>
  );
}

function DirectionSummary({
  label,
  enabled,
  time,
  timeReference,
  info,
  t,
  colorClass,
}: {
  label: string;
  enabled: boolean;
  time: string;
  timeReference: TimeReference;
  info: string;
  t: Translation;
  colorClass: "outbound" | "inbound";
}) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
      <span className={`dir-pill ${colorClass}`}>{label}</span>
      {enabled ? (
        <div style={{ fontSize: "0.92rem", color: "var(--color-ink-muted)", display: "grid", gap: "2px" }}>
          {time && (
            <span>
              {timeReference === "departure" ? t.timeReferenceDeparture : t.timeReferenceArrival}
              {" "}{time}
            </span>
          )}
          {info && <span>{info}</span>}
          {!time && !info && <span>{t.directionPlanned}</span>}
        </div>
      ) : (
        <span className="muted" style={{ fontSize: "0.92rem" }}>Not planned</span>
      )}
    </div>
  );
}
