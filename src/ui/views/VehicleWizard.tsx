import { useState } from "react";
import { Minus, Plus, ArrowRight, Check, ChevronLeft } from "lucide-react";
import type { CreateVehicleRequest, UpdateVehicleRequest } from "../../application/dto";
import type { Direction, Vehicle } from "../../domain/types";
import { ROOM_LIMITS } from "../../domain/types";
import type { Translation } from "../i18n";
import { DirectionPicker } from "../components/DirectionPicker";
import { SeatSchematic } from "../components/SeatSchematic";
import type { SeatDisplayState } from "../components/SeatSchematic";
import { WizardProgress } from "../components/WizardProgress";

interface ReservedSeat {
  seatIndex: number;
  name: string;
}

interface CreateVehicleWizardProps {
  mode: "create";
  t: Translation;
  enabledDirections: Direction[];
  loading: boolean;
  onCancel: () => void;
  onSubmit: (request: CreateVehicleRequest) => void;
}

interface EditVehicleWizardProps {
  mode: "edit";
  vehicle: Vehicle;
  t: Translation;
  enabledDirections: Direction[];
  loading: boolean;
  onCancel: () => void;
  onSubmit: (request: UpdateVehicleRequest) => void;
}

type VehicleWizardProps = CreateVehicleWizardProps | EditVehicleWizardProps;

export function VehicleWizard(props: VehicleWizardProps) {
  const { t, enabledDirections, loading, onCancel } = props;

  // Create: 0=driver 1=seats 2=reserve 3=directions 4=accessories 5=review
  // Edit:   0=driver 1=directions 2=accessories 3=review
  const lastStep = props.mode === "create" ? 5 : 3;
  const progressTotal = props.mode === "create" ? 5 : 4;

  const [step, setStep] = useState(0);
  const [driverName, setDriverName] = useState(props.mode === "edit" ? props.vehicle.driverName : "");
  const [seatCount, setSeatCount] = useState(props.mode === "edit" ? props.vehicle.seatCount : 3);
  const [reserved, setReserved] = useState<ReservedSeat[]>([]);
  const [directions, setDirections] = useState<Direction[]>(
    props.mode === "edit" ? props.vehicle.directions : enabledDirections,
  );
  const [lendsBooster, setLendsBooster] = useState(
    props.mode === "edit" ? props.vehicle.lendsBooster : false,
  );
  const [lendsRearFacing, setLendsRearFacing] = useState(
    props.mode === "edit" ? props.vehicle.lendsRearFacing : false,
  );
  const [lendsFrontFacing, setLendsFrontFacing] = useState(
    props.mode === "edit" ? props.vehicle.lendsFrontFacing : false,
  );

  function progressCurrent(): number {
    if (props.mode === "create") {
      if (step === 2) return 1;
      if (step > 2) return step - 1;
    }
    return step;
  }

  function toggleDirection(d: Direction) {
    setDirections((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  function toggleReserved(si: number) {
    setReserved((prev) => {
      const existing = prev.find((r) => r.seatIndex === si);
      if (existing) return prev.filter((r) => r.seatIndex !== si);
      return [...prev, { seatIndex: si, name: "" }];
    });
  }

  function updateReservedName(si: number, name: string) {
    setReserved((prev) => prev.map((r) => (r.seatIndex === si ? { ...r, name } : r)));
  }

  function changeSeatCount(delta: number) {
    const next = Math.max(1, Math.min(ROOM_LIMITS.seatsPerVehicle, seatCount + delta));
    if (next === seatCount) return;
    setSeatCount(next);
    setReserved((prev) => prev.filter((r) => r.seatIndex < next));
  }

  function canAdvance(): boolean {
    if (step === 0) return driverName.trim().length > 0;
    if (props.mode === "create" && step === 2) {
      return reserved.every((r) => r.name.trim().length > 0);
    }
    const dirStep = props.mode === "create" ? 3 : 1;
    if (step === dirStep) return directions.length > 0;
    return true;
  }

  const seatsForSchematic: SeatDisplayState[] = Array.from({ length: seatCount }, (_, i) => {
    const r = reserved.find((x) => x.seatIndex === i);
    if (r) return { kind: "reserved", name: r.name };
    return { kind: "empty" };
  });
  const previewDirection = directions[0] ?? "outbound";

  function buildCreateRequest(): CreateVehicleRequest {
    return {
      driverName: driverName.trim(),
      seatCount,
      directions,
      lendsBooster,
      lendsRearFacing,
      lendsFrontFacing,
      reservedRiders: reserved
        .filter((r) => r.name.trim())
        .map((r) => ({ seatIndex: r.seatIndex, name: r.name.trim() })),
    };
  }

  function buildEditRequest(): UpdateVehicleRequest {
    return {
      driverName: driverName.trim(),
      directions,
      lendsBooster,
      lendsRearFacing,
      lendsFrontFacing,
    };
  }

  function handleSubmit() {
    if (props.mode === "create") {
      props.onSubmit(buildCreateRequest());
    } else {
      props.onSubmit(buildEditRequest());
    }
  }

  const prompts: Record<number, string> = props.mode === "create"
    ? {
        0: t.promptDriverName,
        1: t.promptSeatCount,
        2: t.promptReserveSeats,
        3: t.promptVehicleDirections,
        4: t.promptVehicleExtras,
        5: t.promptVehicleReview,
      }
    : {
        0: t.promptDriverName,
        1: t.promptVehicleDirections,
        2: t.promptVehicleExtras,
        3: t.promptVehicleReview,
      };

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
        <WizardProgress total={progressTotal} current={progressCurrent()} />
      </div>

      <div className="wizard-step">
        <p className="wizard-prompt">{prompts[step]}</p>

        {step === 0 && (
          <input
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            autoFocus
            placeholder="e.g. Maria"
            maxLength={40}
          />
        )}

        {props.mode === "create" && step === 1 && (
          <>
            <div className="seat-count-picker">
              <div className="stepper-control" role="group" aria-label={t.seatCount}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => changeSeatCount(-1)}
                  disabled={seatCount <= 1}
                  aria-label={t.seatCountDecrease}
                >
                  <Minus size={18} strokeWidth={2.6} aria-hidden="true" />
                </button>
                <strong aria-live="polite">{seatCount}</strong>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => changeSeatCount(1)}
                  disabled={seatCount >= ROOM_LIMITS.seatsPerVehicle}
                  aria-label={t.seatCountIncrease}
                >
                  <Plus size={18} strokeWidth={2.6} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="seat-preview">
              <SeatSchematic
                seats={seatsForSchematic}
                direction={previewDirection}
                label={`${seatCount} passenger seats`}
              />
            </div>
          </>
        )}

        {props.mode === "create" && step === 2 && (
          <>
            <SeatSchematic
              seats={seatsForSchematic}
              direction={previewDirection}
              onTap={toggleReserved}
            />
            {reserved.length > 0 && (
              <div className="reserved-names">
                {reserved
                  .sort((a, b) => a.seatIndex - b.seatIndex)
                  .map((r) => (
                    <label key={r.seatIndex}>
                      {t.reservedRiderName} · {t.seat} {r.seatIndex + 1}
                      <input
                        value={r.name}
                        onChange={(e) => updateReservedName(r.seatIndex, e.target.value)}
                        placeholder="Child's name"
                        maxLength={40}
                      />
                    </label>
                  ))}
              </div>
            )}
          </>
        )}

        {((props.mode === "create" && step === 3) ||
          (props.mode === "edit" && step === 1)) && (
          <DirectionPicker
            options={enabledDirections}
            selected={directions}
            labelFor={(d) => (d === "outbound" ? t.outboundLabel : t.inboundLabel)}
            onToggle={toggleDirection}
          />
        )}

        {((props.mode === "create" && step === 4) ||
          (props.mode === "edit" && step === 2)) && (
          <div className="checkbox-row visual-choice-grid">
            <label>
              <input
                type="checkbox"
                checked={lendsBooster}
                onChange={(e) => setLendsBooster(e.target.checked)}
              />
              {t.lendsBooster}
            </label>
            <label>
              <input
                type="checkbox"
                checked={lendsRearFacing}
                onChange={(e) => setLendsRearFacing(e.target.checked)}
              />
              {t.lendsRearFacing}
            </label>
            <label>
              <input
                type="checkbox"
                checked={lendsFrontFacing}
                onChange={(e) => setLendsFrontFacing(e.target.checked)}
              />
              {t.lendsFrontFacing}
            </label>
          </div>
        )}

        {step === lastStep && (
          <VehicleReview
            t={t}
            driverName={driverName}
            seatCount={props.mode === "create" ? seatCount : props.vehicle.seatCount}
            reserved={reserved}
            directions={directions}
            lendsBooster={lendsBooster}
            lendsRearFacing={lendsRearFacing}
            lendsFrontFacing={lendsFrontFacing}
            mode={props.mode}
          />
        )}
      </div>

      <div className="wiz-nav">
        {step === lastStep ? (
          <button
            type="button"
            className="wiz-advance accent"
            onClick={handleSubmit}
            disabled={loading}
            aria-label={t.saveVehicle}
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

function VehicleReview({
  t,
  driverName,
  seatCount,
  reserved,
  directions,
  lendsBooster,
  lendsRearFacing,
  lendsFrontFacing,
  mode,
}: {
  t: Translation;
  driverName: string;
  seatCount: number;
  reserved: ReservedSeat[];
  directions: Direction[];
  lendsBooster: boolean;
  lendsRearFacing: boolean;
  lendsFrontFacing: boolean;
  mode: "create" | "edit";
}) {
  const extras = [
    lendsBooster ? t.lendsBooster : "",
    lendsRearFacing ? t.lendsRearFacing : "",
    lendsFrontFacing ? t.lendsFrontFacing : "",
  ].filter(Boolean);

  return (
    <div className="review-card">
      <p>
        <strong>{driverName}</strong>
        {mode === "create" && (
          <span className="muted"> · {seatCount} {seatCount === 1 ? "seat" : "seats"}</span>
        )}
      </p>
      <div className="row">
        {directions.map((d) => (
          <span key={d} className={`dir-pill ${d}`}>
            {d === "outbound" ? t.outboundLabel : t.inboundLabel}
          </span>
        ))}
      </div>
      {extras.length > 0 && <p className="muted hint">{extras.join(" · ")}</p>}
      {mode === "create" &&
        reserved
          .filter((r) => r.name.trim())
          .map((r) => (
            <p key={r.seatIndex} className="hint">
              {t.seat} {r.seatIndex + 1}: {r.name}
            </p>
          ))}
    </div>
  );
}
