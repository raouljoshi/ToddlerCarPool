import { useState } from "react";
import type { AssignChildRequest } from "../../application/dto";
import {
  getCandidateVehicles,
  getChildAllocations,
  getVehicleSeatMap,
} from "../../domain/allocation";
import type { Direction, Room, Vehicle } from "../../domain/types";
import type { Language, Translation } from "../i18n";
import { fillTemplate } from "../i18n";
import { SeatSchematic } from "../components/SeatSchematic";
import { slotsToDisplayStates } from "../utils/seatUtils";

interface AllocateViewProps {
  t: Translation;
  language: Language;
  room: Room;
  childId: string;
  loading: boolean;
  onBack: () => void;
  onAssign: (request: AssignChildRequest) => Promise<void>;
}

export function AllocateView({
  t,
  room,
  childId,
  loading,
  onBack,
  onAssign,
}: AllocateViewProps) {
  const [lastVehicleId, setLastVehicleId] = useState<string | null>(null);

  const child = room.children.find((c) => c.id === childId);
  if (!child) {
    return (
      <section className="panel">
        <p className="muted">{t.unexpectedError}</p>
        <button type="button" className="secondary" onClick={onBack}>{t.back}</button>
      </section>
    );
  }

  const allocations = getChildAllocations(room);
  const childAlloc = allocations.find((a) => a.child.id === childId);
  const missingDirections = childAlloc?.missingDirections ?? child.directions;

  const childNameById = new Map(room.children.map((c) => [c.id, c.name]));

  async function handleAssign(vehicle: Vehicle, direction: Direction) {
    const request: AssignChildRequest = {
      childId,
      vehicleId: vehicle.id,
      direction,
    };
    await onAssign(request);
    setLastVehicleId(vehicle.id);
  }

  return (
    <section className="panel wizard">
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <button type="button" className="ghost" onClick={onBack} aria-label={t.back}>
          ←
        </button>
        <h2 style={{ margin: 0 }}>{fillTemplate(t.allocateTitle, { child: child.name })}</h2>
      </div>
      <p className="muted" style={{ fontSize: "0.92rem" }}>{child.name}</p>

      {missingDirections.length === 0 ? (
        <p className="empty">{t.queueEmpty}</p>
      ) : (
        <div className="allocate-section">
          {missingDirections.map((dir) => {
            const candidates = getCandidateVehicles(room, childId, dir);
            const dirLabel = dir === "outbound" ? t.outboundLabel : t.inboundLabel;
            const isSameDriver =
              lastVehicleId !== null &&
              candidates.some((v) => v.id === lastVehicleId);
            const sameDriverVehicle = isSameDriver
              ? candidates.find((v) => v.id === lastVehicleId)
              : null;

            return (
              <div key={dir} style={{ display: "grid", gap: "12px" }}>
                <div className="row">
                  <span className={`dir-pill ${dir}`}>{dirLabel}</span>
                  <span className="muted" style={{ fontSize: "0.92rem" }}>
                    {fillTemplate(t.allocateForDirection, { direction: dirLabel })}
                  </span>
                </div>

                {sameDriverVehicle && (
                  <button
                    type="button"
                    className="shortcut-chip"
                    onClick={() => void handleAssign(sameDriverVehicle, dir)}
                    disabled={loading}
                  >
                    ✓{" "}
                    {fillTemplate(
                      dir === "inbound"
                        ? t.allocateSameDriverInbound
                        : t.allocateSameDriverOutbound,
                      { driver: sameDriverVehicle.driverName },
                    )}
                  </button>
                )}

                {candidates.length === 0 ? (
                  <p className="muted" style={{ fontSize: "0.92rem" }}>
                    {fillTemplate(t.allocateNoCandidates, { direction: dirLabel })}
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: "8px" }}>
                    {candidates.map((vehicle) => {
                      const slots = getVehicleSeatMap(room, vehicle.id, dir);
                      const displaySeats = slotsToDisplayStates(slots, childNameById);
                      return (
                        <div key={vehicle.id} className="candidate-card">
                          <div style={{ display: "grid", gap: "4px" }}>
                            <strong>{vehicle.driverName}</strong>
                            <SeatSchematic
                              seats={displaySeats}
                              label={`${vehicle.driverName}'s car`}
                            />
                            <AccessoryPills
                              t={t}
                              lendsBooster={vehicle.lendsBooster}
                              lendsRearFacing={vehicle.lendsRearFacing}
                              lendsFrontFacing={vehicle.lendsFrontFacing}
                            />
                          </div>
                          <button
                            type="button"
                            className="accent"
                            onClick={() => void handleAssign(vehicle, dir)}
                            disabled={loading}
                          >
                            {t.allocateConfirm}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AccessoryPills({
  t,
  lendsBooster,
  lendsRearFacing,
  lendsFrontFacing,
}: {
  t: Translation;
  lendsBooster: boolean;
  lendsRearFacing: boolean;
  lendsFrontFacing: boolean;
}) {
  if (!lendsBooster && !lendsRearFacing && !lendsFrontFacing) return null;
  return (
    <div className="row" style={{ fontSize: "0.78rem" }}>
      {lendsBooster && <span className="muted">↳ {t.lendsBooster}</span>}
      {lendsRearFacing && <span className="muted">↳ {t.lendsRearFacing}</span>}
      {lendsFrontFacing && <span className="muted">↳ {t.lendsFrontFacing}</span>}
    </div>
  );
}
