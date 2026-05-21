import { useState } from "react";
import type { CreateVehicleRequest, UpdateVehicleRequest } from "../../application/dto";
import type { Direction, Vehicle } from "../../domain/types";
import { ROOM_LIMITS } from "../../domain/types";
import type { Translation } from "../i18n";
import { SeatSchematic } from "../components/SeatSchematic";
import type { SeatDisplayState } from "../components/SeatSchematic";

interface ReservedSeat {
  seatIndex: number;
  name: string;
}

// ── Create mode ──────────────────────────────────────────────────────────────

interface CreateVehicleWizardProps {
  mode: "create";
  t: Translation;
  enabledDirections: Direction[];
  loading: boolean;
  onCancel: () => void;
  onSubmit: (request: CreateVehicleRequest) => void;
}

// ── Edit mode ─────────────────────────────────────────────────────────────────

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

// ── Wizard ────────────────────────────────────────────────────────────────────

export function VehicleWizard(props: VehicleWizardProps) {
  const { t, enabledDirections, loading, onCancel } = props;

  // Create mode steps: 0=driver 1=seats 2=reserve 3=directions 4=accessories 5=review
  // Edit mode steps: 0=driver 1=directions 2=accessories 3=review
  const createSteps = [
    t.vehicleStepDriver,
    t.vehicleStepSeats,
    t.vehicleStepSeats, // reserve step shares Seats label
    t.vehicleStepDirections,
    t.vehicleStepLending,
    t.vehicleStepReview,
  ];
  const editSteps = [t.vehicleStepDriver, t.vehicleStepDirections, t.vehicleStepLending, t.vehicleStepReview];
  const steps = props.mode === "create" ? createSteps : editSteps;
  const lastStep = steps.length - 1;

  const [step, setStep] = useState(0);
  const [driverName, setDriverName] = useState(props.mode === "edit" ? props.vehicle.driverName : "");
  const [seatCount, setSeatCount] = useState(props.mode === "edit" ? props.vehicle.seatCount : 3);
  const [reserved, setReserved] = useState<ReservedSeat[]>([]);
  const [directions, setDirections] = useState<Direction[]>(
    props.mode === "edit"
      ? props.vehicle.directions
      : enabledDirections,
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
    setReserved((prev) =>
      prev.map((r) => (r.seatIndex === si ? { ...r, name } : r)),
    );
  }

  function canAdvance(): boolean {
    if (step === 0) return driverName.trim().length > 0;
    if (props.mode === "create" && step === 2) {
      // all reserved seats must have names
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

  return (
    <section className="panel wizard">
      <h2>{props.mode === "create" ? t.vehicleWizardTitle : t.driverEditCta}</h2>
      <ol className="stepper" aria-label="Steps">
        {steps
          .map((label, i) => ({ label, i }))
          .filter(({ i }) => !(props.mode === "create" && i === 2))
          .map(({ label, i }, v) => {
            // Steps 1+2 both belong to the "Seats" stepper item in create mode
            const isActive =
              props.mode === "create" && i === 1
                ? step === 1 || step === 2
                : i === step;
            const isDone =
              props.mode === "create" && i === 1 ? step > 2 : i < step;
            const cls = isActive ? "active" : isDone ? "done" : "";
            return (
              <li key={i} className={cls}>
                <span className="num">{v + 1}</span>
                {label}
              </li>
            );
          })}
      </ol>

      <div className="wizard-step">
        {/* Step 0: Driver name */}
        {step === 0 && (
          <label>
            {t.driverName}
            <input
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              autoFocus
              placeholder="e.g. Maria"
              maxLength={40}
            />
            <span className="muted" style={{ fontSize: "0.85rem" }}>{t.driverNameHint}</span>
          </label>
        )}

        {/* Step 1 (create): Seat count */}
        {props.mode === "create" && step === 1 && (
          <>
            <label>
              {t.seatCount}
              <input
                type="number"
                min={1}
                max={ROOM_LIMITS.seatsPerVehicle}
                value={seatCount}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(ROOM_LIMITS.seatsPerVehicle, Number(e.target.value)));
                  setSeatCount(v);
                  setReserved([]);
                }}
              />
              <span className="muted" style={{ fontSize: "0.85rem" }}>{t.seatCountHint}</span>
            </label>
            <SeatSchematic seats={seatsForSchematic} label={`${seatCount} passenger seats`} />
          </>
        )}

        {/* Step 2 (create): Reserve seats */}
        {props.mode === "create" && step === 2 && (
          <>
            <p className="muted" style={{ fontSize: "0.92rem" }}>{t.reserveSeatHint}</p>
            <SeatSchematic seats={seatsForSchematic} onTap={toggleReserved} />
            {reserved.length > 0 && (
              <div style={{ display: "grid", gap: "8px" }}>
                {reserved
                  .sort((a, b) => a.seatIndex - b.seatIndex)
                  .map((r) => (
                    <label key={r.seatIndex}>
                      {t.reservedRiderName} (seat {r.seatIndex + 1})
                      <input
                        value={r.name}
                        onChange={(e) => updateReservedName(r.seatIndex, e.target.value)}
                        placeholder="Child's name"
                        autoFocus={false}
                        maxLength={40}
                      />
                    </label>
                  ))}
              </div>
            )}
          </>
        )}

        {/* Directions step */}
        {((props.mode === "create" && step === 3) ||
          (props.mode === "edit" && step === 1)) && (
          <>
            <p className="muted" style={{ fontSize: "0.92rem" }}>{t.pickDirectionsVehicle}</p>
            {enabledDirections.length === 0 && (
              <p className="muted">{t.queueEmpty}</p>
            )}
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

        {/* Accessories/lending step */}
        {((props.mode === "create" && step === 4) ||
          (props.mode === "edit" && step === 2)) && (
          <>
            <p className="muted" style={{ fontSize: "0.92rem" }}>{t.pickLending}</p>
            <div className="checkbox-row">
              <label>
                <input
                  type="checkbox"
                  checked={lendsBooster}
                  onChange={(e) => setLendsBooster(e.target.checked)}
                />
                {t.lendsBooster}
              </label>
            </div>
            <div className="checkbox-row">
              <label>
                <input
                  type="checkbox"
                  checked={lendsRearFacing}
                  onChange={(e) => setLendsRearFacing(e.target.checked)}
                />
                {t.lendsRearFacing}
              </label>
            </div>
            <div className="checkbox-row">
              <label>
                <input
                  type="checkbox"
                  checked={lendsFrontFacing}
                  onChange={(e) => setLendsFrontFacing(e.target.checked)}
                />
                {t.lendsFrontFacing}
              </label>
            </div>
          </>
        )}

        {/* Review step */}
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
            {t.saveVehicle}
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
  return (
    <div style={{ display: "grid", gap: "12px" }}>
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
      {(lendsBooster || lendsRearFacing || lendsFrontFacing) && (
        <div className="row">
          {lendsBooster && <span className="muted" style={{ fontSize: "0.85rem" }}>↳ {t.lendsBooster}</span>}
          {lendsRearFacing && <span className="muted" style={{ fontSize: "0.85rem" }}>↳ {t.lendsRearFacing}</span>}
          {lendsFrontFacing && <span className="muted" style={{ fontSize: "0.85rem" }}>↳ {t.lendsFrontFacing}</span>}
        </div>
      )}
      {mode === "create" && reserved.length > 0 && (
        <div>
          <p className="muted" style={{ fontSize: "0.85rem" }}>Reserved:</p>
          {reserved
            .filter((r) => r.name.trim())
            .map((r) => (
              <p key={r.seatIndex} style={{ fontSize: "0.92rem" }}>
                Seat {r.seatIndex + 1}: {r.name}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
