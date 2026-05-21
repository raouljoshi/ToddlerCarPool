import { useMemo, useState } from "react";
import {
  assignmentsForVehicleDirection,
  enabledDirections,
  getChildAllocations,
  getVehicleSeatMap,
  validateAssignment,
} from "../../domain/allocation";
import type { AssignChildRequest } from "../../application/dto";
import type { ErrorCode } from "../../domain/result";
import type { Child, Direction, Room, Vehicle } from "../../domain/types";
import type { Language, Translation } from "../i18n";
import { CarIcon, PeopleWaitingIcon } from "../components/icons";
import { SeatSchematic, type SeatDisplayState } from "../components/SeatSchematic";
import { slotsToDisplayStates } from "../utils/seatUtils";

interface BoardViewProps {
  t: Translation;
  language: Language;
  room: Room;
  justCreated: boolean;
  loading: boolean;
  onCopyCode: () => void;
  onCopyLink: () => void;
  onOpenDetails: () => void;
  onRefresh: () => void;
  onAddVehicle: () => void;
  onAddChild: () => void;
  onEditVehicle: (vehicleId: string) => void;
  onEditChild: (childId: string) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onDeleteChild: (childId: string) => void;
  onUnassign: (assignmentId: string) => void;
  onAssign: (request: AssignChildRequest) => void;
}

export function BoardView({
  t,
  language,
  room,
  justCreated,
  loading,
  onCopyCode,
  onCopyLink,
  onOpenDetails,
  onRefresh,
  onAddVehicle,
  onAddChild,
  onEditVehicle,
  onEditChild,
  onDeleteVehicle,
  onDeleteChild,
  onUnassign,
  onAssign,
}: BoardViewProps) {
  const directions = enabledDirections(room);
  const [selectedDirection, setSelectedDirection] = useState<Direction>(directions[0] ?? "outbound");
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [boardMessage, setBoardMessage] = useState("");
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [confirmDeleteVehicle, setConfirmDeleteVehicle] = useState<string | null>(null);
  const [confirmDeleteChild, setConfirmDeleteChild] = useState<string | null>(null);
  const activeDirection = directions.includes(selectedDirection)
    ? selectedDirection
    : directions[0] ?? "outbound";

  const childNameById = useMemo(
    () => new Map(room.children.map((child) => [child.id, child.name])),
    [room.children],
  );
  const allocations = getChildAllocations(room);
  const waitingChildren = allocations
    .filter((allocation) => allocation.missingDirections.includes(activeDirection))
    .map((allocation) => allocation.child);
  const selectedChild = waitingChildren.find((child) => child.id === selectedChildId);
  const servingVehicles = room.vehicles.filter((vehicle) =>
    vehicle.directions.includes(activeDirection),
  );
  const inactiveVehicles = room.vehicles.filter(
    (vehicle) => !vehicle.directions.includes(activeDirection),
  );
  const openSeatCount = servingVehicles.reduce((sum, vehicle) => {
    const used = assignmentsForVehicleDirection(room, vehicle.id, activeDirection).length;
    return sum + Math.max(0, vehicle.seatCount - used);
  }, 0);
  const expiryDate = new Date(room.expiresAt).toLocaleDateString(
    language === "sv" ? "sv-SE" : "en-US",
  );

  function directionLabel(direction: Direction) {
    return direction === "outbound" ? t.outboundLabel : t.inboundLabel;
  }

  function waitingCount(direction: Direction) {
    return allocations.filter((allocation) => allocation.missingDirections.includes(direction)).length;
  }

  function deleteVehicle(vehicleId: string) {
    setConfirmDeleteVehicle(null);
    onDeleteVehicle(vehicleId);
  }

  function deleteChild(childId: string) {
    setConfirmDeleteChild(null);
    onDeleteChild(childId);
  }

  function selectWaitingChild(childId: string) {
    const nextId = selectedChildId === childId ? null : childId;
    setSelectedChildId(nextId);
    setActiveAssignmentId(null);
    setBoardMessage("");
  }

  function cancelSelection() {
    setSelectedChildId(null);
    setBoardMessage("");
  }

  function handleSeatTap(vehicle: Vehicle, seatIndex: number) {
    setActiveAssignmentId(null);
    const assignment = room.assignments.find(
      (candidate) =>
        candidate.vehicleId === vehicle.id &&
        candidate.direction === activeDirection &&
        candidate.seatIndex === seatIndex,
    );
    if (assignment) {
      setSelectedChildId(null);
      setBoardMessage("");
      setActiveAssignmentId(assignment.id);
      return;
    }

    if (!selectedChild) {
      setBoardMessage(t.boardSelectChildFirst);
      return;
    }

    const request = {
      childId: selectedChild.id,
      vehicleId: vehicle.id,
      direction: activeDirection,
      seatIndex,
    };
    const result = validateAssignment(room, request);
    if (!result.ok) {
      setBoardMessage(assignmentErrorCopy(t, result.error.code));
      return;
    }

    setSelectedChildId(null);
    setBoardMessage("");
    onAssign(request);
  }

  return (
    <>
      <section className="board-hero">
        <div className="board-title-row">
          <div>
            <p className="eyebrow">{t.boardEyebrow}</p>
            <h1>{room.settings.label}</h1>
          </div>
          <button type="button" className="room-code-pill board-code" onClick={onCopyCode}>
            {t.codeLabel} {room.code}
          </button>
        </div>

        <div className="board-share-row">
          <button type="button" className="accent" onClick={onAddVehicle} disabled={loading}>
            {t.addVehicle}
          </button>
          <button type="button" className="secondary" onClick={onCopyLink}>
            {t.copyLink}
          </button>
          <button type="button" className="secondary" onClick={onOpenDetails}>
            {t.tripDetails}
          </button>
          <button type="button" className="ghost" onClick={onRefresh} disabled={loading}>
            {t.refresh}
          </button>
          <span className="board-expiry">
            {t.expires} <strong>{expiryDate}</strong>
          </span>
        </div>

        {justCreated && <p className="muted">{t.roomCreated}</p>}

        {directions.length > 1 && (
          <div className="direction-tabs" role="tablist" aria-label={t.boardDirectionTabs}>
            {directions.map((direction) => {
              const count = waitingCount(direction);
              return (
                <button
                  key={direction}
                  type="button"
                  role="tab"
                  aria-selected={activeDirection === direction}
                  className={activeDirection === direction ? "active" : ""}
                  onClick={() => setSelectedDirection(direction)}
                >
                  <span>{directionLabel(direction)}</span>
                  <span className="tab-count">
                    {count === 0 ? t.boardAllSeated : String(count)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className={`board-summary${selectedChild ? " selecting" : ""}`} aria-live="polite">
          <strong>
            {selectedChild
              ? t.boardSelectedChild.replace("{child}", selectedChild.name)
              : waitingChildren.length === 0
              ? t.boardAllSeated
              : t.boardWaitingCount.replace("{count}", String(waitingChildren.length))}
          </strong>
          <span>{selectedChild ? t.boardTapSeat : t.boardOpenSeats.replace("{count}", String(openSeatCount))}</span>
          {selectedChild && (
            <button type="button" className="ghost compact-button" onClick={cancelSelection}>
              {t.boardCancelSelection}
            </button>
          )}
        </div>

        {boardMessage && <p className="board-inline-message" role="status">{boardMessage}</p>}
      </section>

      <section className="board-layout" aria-label={t.boardLabel}>
        <div className="car-board">
          {servingVehicles.length === 0 ? (
            <div className="board-empty">
              <CarIcon className="board-empty-icon" />
              <h2>{t.boardNoCarsTitle}</h2>
              <p>{t.boardNoCarsBody}</p>
              <button type="button" className="accent" onClick={onAddVehicle}>
                {t.boardAddYourCar}
              </button>
              <button type="button" className="ghost" onClick={onAddChild}>
                {t.boardAddChildInstead}
              </button>
            </div>
          ) : (
            servingVehicles.map((vehicle) => (
              <CarBoardCard
                key={vehicle.id}
                t={t}
                vehicle={vehicle}
                room={room}
                direction={activeDirection}
                childNameById={childNameById}
                loading={loading}
                selectedChild={selectedChild}
                activeAssignmentId={activeAssignmentId}
                confirmDelete={confirmDeleteVehicle === vehicle.id}
                onSeatTap={(seatIndex) => handleSeatTap(vehicle, seatIndex)}
                onEdit={() => onEditVehicle(vehicle.id)}
                onEditChild={onEditChild}
                onDeleteRequest={() => setConfirmDeleteVehicle(vehicle.id)}
                onDeleteConfirm={() => deleteVehicle(vehicle.id)}
                onDeleteCancel={() => setConfirmDeleteVehicle(null)}
                onUnassign={(assignmentId) => {
                  setActiveAssignmentId(null);
                  onUnassign(assignmentId);
                }}
                onCloseSeatAction={() => setActiveAssignmentId(null)}
              />
            ))
          )}

          {inactiveVehicles.length > 0 && (
            <div className="inactive-car-list">
              {inactiveVehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  type="button"
                  className="inactive-car"
                  onClick={() => onEditVehicle(vehicle.id)}
                >
                  <CarIcon className="inline-icon" />
                  {t.boardCarNotServing
                    .replace("{driver}", vehicle.driverName)
                    .replace("{direction}", directionLabel(activeDirection))}
                </button>
              ))}
            </div>
          )}
        </div>

        <WaitingTray
          t={t}
          directionLabel={directionLabel(activeDirection)}
          childrenWaiting={waitingChildren}
          loading={loading}
          selectedChildId={selectedChild?.id ?? null}
          confirmDeleteChild={confirmDeleteChild}
          onAddChild={onAddChild}
          onSelectChild={selectWaitingChild}
          onEdit={onEditChild}
          onDeleteRequest={setConfirmDeleteChild}
          onDeleteConfirm={deleteChild}
          onDeleteCancel={() => setConfirmDeleteChild(null)}
        />
      </section>

    </>
  );
}

function CarBoardCard({
  t,
  vehicle,
  room,
  direction,
  childNameById,
  loading,
  selectedChild,
  activeAssignmentId,
  confirmDelete,
  onSeatTap,
  onEdit,
  onEditChild,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onUnassign,
  onCloseSeatAction,
}: {
  t: Translation;
  vehicle: Vehicle;
  room: Room;
  direction: Direction;
  childNameById: Map<string, string>;
  loading: boolean;
  selectedChild?: Child;
  activeAssignmentId: string | null;
  confirmDelete: boolean;
  onSeatTap: (seatIndex: number) => void;
  onEdit: () => void;
  onEditChild: (childId: string) => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onUnassign: (assignmentId: string) => void;
  onCloseSeatAction: () => void;
}) {
  const slots = getVehicleSeatMap(room, vehicle.id, direction);
  const displaySeats = selectedChild
    ? slots.map<SeatDisplayState>((slot) => {
        if (slot.state.kind !== "empty") {
          const name = childNameById.get(slot.state.childId) ?? "?";
          return { kind: "assigned", name };
        }
        const result = validateAssignment(room, {
          childId: selectedChild.id,
          vehicleId: vehicle.id,
          direction,
          seatIndex: slot.index,
        });
        if (result.ok) return { kind: "available", name: selectedChild.name };
        return { kind: "unavailable", reason: assignmentErrorCopy(t, result.error.code) };
      })
    : slotsToDisplayStates(slots, childNameById);
  const assignments = assignmentsForVehicleDirection(room, vehicle.id, direction);
  const activeAssignment = assignments.find((assignment) => assignment.id === activeAssignmentId);
  const activeChildName = activeAssignment ? childNameById.get(activeAssignment.childId) ?? "?" : "";
  const openSeats = Math.max(0, vehicle.seatCount - assignments.length);

  return (
    <article className="car-board-card">
      <header className="car-board-head">
        <div>
          <p className="car-kicker">
            <CarIcon className="inline-icon" />
            {t.boardCar}
          </p>
          <h2>{vehicle.driverName}</h2>
        </div>
        <span className="car-seat-count">
          {openSeats}/{vehicle.seatCount}
        </span>
        <div className="car-card-actions">
          <button type="button" className="secondary" onClick={onEdit} style={{ fontSize: "0.85rem" }}>
            {t.driverEditCta}
          </button>
          {confirmDelete ? (
            <>
              <button type="button" className="danger" onClick={onDeleteConfirm} disabled={loading} style={{ fontSize: "0.85rem" }}>
                {t.driverDeleteCta}
              </button>
              <button type="button" className="ghost" onClick={onDeleteCancel} style={{ fontSize: "0.85rem" }}>
                {t.cancel}
              </button>
            </>
          ) : (
            <button type="button" className="ghost" onClick={onDeleteRequest} aria-label={t.driverDeleteCta}>
              x
            </button>
          )}
        </div>
      </header>

      {confirmDelete && (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          {t.driverDeleteConfirm.replace("{driver}", vehicle.driverName)}
        </p>
      )}

      <SeatSchematic seats={displaySeats} label={`${vehicle.driverName} ${direction}`} onTap={onSeatTap} />

      {activeAssignment && (
        <div className="seat-action-card">
          <div>
            <strong>{t.boardSeatOccupiedTitle.replace("{child}", activeChildName)}</strong>
            <p className="muted">
              {t.boardSeatOccupiedMeta
                .replace("{direction}", direction === "outbound" ? t.outboundLabel : t.inboundLabel)
                .replace("{driver}", vehicle.driverName)
                .replace("{seat}", String(activeAssignment.seatIndex + 1))}
            </p>
          </div>
          <div className="seat-action-buttons">
            <button type="button" className="accent" onClick={() => onUnassign(activeAssignment.id)} disabled={loading}>
              {t.childMoveToQueueCta}
            </button>
            <button type="button" className="secondary" onClick={() => onEditChild(activeAssignment.childId)}>
              {t.childEditCta}
            </button>
            <button type="button" className="ghost" onClick={onCloseSeatAction}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      <div className="car-card-foot">
        <AccessorySummary t={t} vehicle={vehicle} />
      </div>

      {assignments.length > 0 && (
        <div className="seated-riders">
          {assignments.map((assignment) => (
            <button
              key={assignment.id}
              type="button"
              className="seated-rider"
              onClick={() => onSeatTap(assignment.seatIndex)}
              disabled={loading}
              title={t.childMoveToQueueCta}
            >
              {childNameById.get(assignment.childId) ?? "?"}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function WaitingTray({
  t,
  directionLabel,
  childrenWaiting,
  loading,
  selectedChildId,
  confirmDeleteChild,
  onAddChild,
  onSelectChild,
  onEdit,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  t: Translation;
  directionLabel: string;
  childrenWaiting: Child[];
  loading: boolean;
  selectedChildId: string | null;
  confirmDeleteChild: string | null;
  onAddChild: () => void;
  onSelectChild: (childId: string) => void;
  onEdit: (childId: string) => void;
  onDeleteRequest: (childId: string) => void;
  onDeleteConfirm: (childId: string) => void;
  onDeleteCancel: () => void;
}) {
  return (
    <aside className="waiting-tray" aria-label={t.boardWaitingForSeat}>
      <div className="waiting-tray-head">
        <div>
          <p className="car-kicker">
            <PeopleWaitingIcon className="inline-icon" />
            {directionLabel}
          </p>
          <h2>{t.boardWaitingForSeat}</h2>
        </div>
        <button type="button" className="ghost" onClick={onAddChild}>
          + {t.addChildShort}
        </button>
      </div>

      {childrenWaiting.length === 0 ? (
        <p className="empty compact">{t.boardNoWaitingChildren}</p>
      ) : (
        <div className="child-token-list">
          {childrenWaiting.map((child) => (
            <div key={child.id} className="child-token-card">
              <button
                type="button"
                className={`child-token${selectedChildId === child.id ? " selected" : ""}`}
                onClick={() => onSelectChild(child.id)}
                disabled={loading}
                aria-pressed={selectedChildId === child.id}
              >
                {child.name}
              </button>
              {confirmDeleteChild === child.id ? (
                <div className="row">
                  <button type="button" className="danger" onClick={() => onDeleteConfirm(child.id)} disabled={loading}>
                    {t.childDeleteCta}
                  </button>
                  <button type="button" className="ghost" onClick={onDeleteCancel}>
                    {t.cancel}
                  </button>
                </div>
              ) : (
                <div className="child-token-actions">
                  <button type="button" className="ghost" onClick={() => onEdit(child.id)}>
                    {t.childEditCta}
                  </button>
                  <button type="button" className="ghost" onClick={() => onDeleteRequest(child.id)}>
                    {t.childDeleteCta}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

function assignmentErrorCopy(t: Translation, code: ErrorCode): string {
  if (code === "INCOMPATIBLE_ACCESSORY") return t.boardSeatUnavailable;
  if (code === "DIRECTION_NOT_NEEDED_OR_OFFERED") return t.boardSeatUnavailable;
  if (code === "SEAT_ALREADY_ASSIGNED") return t.boardSeatUnavailable;
  if (code === "SEAT_NOT_FOUND") return t.boardSeatUnavailable;
  return t.unexpectedError;
}

function AccessorySummary({ t, vehicle }: { t: Translation; vehicle: Vehicle }) {
  const labels = [
    vehicle.lendsBooster ? t.needsBooster : "",
    vehicle.lendsRearFacing ? t.needsRearFacing : "",
    vehicle.lendsFrontFacing ? t.needsFrontFacing : "",
  ].filter(Boolean);

  if (labels.length === 0) return <span className="muted">{t.boardNoExtras}</span>;
  return (
    <span className="muted">
      {t.boardExtras}: {labels.join(", ")}
    </span>
  );
}
