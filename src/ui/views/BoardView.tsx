import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Car,
  MapPin,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import {
  assignmentsForVehicleDirection,
  enabledDirections,
  getChildAllocations,
  getVehicleSeatMap,
  validateAssignment,
} from "../../domain/allocation";
import type { AssignChildRequest } from "../../application/dto";
import type { ErrorCode } from "../../domain/result";
import type { Child, Direction, DirectionMeta, Room, Vehicle } from "../../domain/types";
import type { Language, Translation } from "../i18n";
import { CarGraphic } from "../components/CarGraphic";
import { Fab } from "../components/Fab";
import { SeatSchematic, type SeatDisplayState } from "../components/SeatSchematic";
import { slotsToDisplayStates } from "../utils/seatUtils";

interface BoardViewProps {
  t: Translation;
  language: Language;
  room: Room;
  justCreated: boolean;
  loading: boolean;
  onCopyLink: () => void;
  onOpenDetails: () => void;
  onAddVehicle: () => void;
  onAddChild: () => void;
  onEditVehicle: (vehicleId: string) => void;
  onEditChild: (childId: string) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onDeleteChild: (childId: string) => void;
  onUnassign: (assignmentId: string) => void;
  onAssign: (request: AssignChildRequest) => void;
}

function formatDate(date: string, language: Language): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(language === "sv" ? "sv-SE" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function BoardView({
  t,
  language,
  room,
  justCreated,
  loading,
  onCopyLink,
  onOpenDetails,
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

  function directionLabel(direction: Direction) {
    return direction === "outbound" ? t.outboundLabel : t.inboundLabel;
  }

  function directionMeta(direction: Direction): DirectionMeta {
    return direction === "outbound" ? room.settings.outbound : room.settings.inbound;
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

  const date = room.settings.date;
  const mapLink = room.settings.mapLink;
  const staticInfo = room.settings.staticInfo;
  const timed = directions
    .map((direction) => ({ direction, meta: directionMeta(direction) }))
    .filter((entry) => entry.meta.time);

  return (
    <>
      <section className="board-head">
        <div className="board-head-top">
          <h1>{room.settings.label}</h1>
          <div className="board-head-actions">
            <button
              type="button"
              className="icon-button"
              onClick={onCopyLink}
              aria-label={t.share}
            >
              <Share2 size={19} strokeWidth={2.2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={onOpenDetails}
              aria-label={t.editEvent}
            >
              <Pencil size={19} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="board-meta">
          {date && (
            <span className="board-meta-item">
              <Calendar size={15} strokeWidth={2.2} aria-hidden="true" />
              {formatDate(date, language)}
            </span>
          )}
          {timed.map(({ direction, meta }) => (
            <span key={direction} className={`board-meta-item dir ${direction}`}>
              {directionLabel(direction)} {meta.time}
            </span>
          ))}
        </div>

        {staticInfo && <p className="muted board-desc">{staticInfo}</p>}

        {mapLink && (
          <a className="board-map" href={mapLink} target="_blank" rel="noreferrer">
            <MapPin size={16} strokeWidth={2.2} aria-hidden="true" />
            {t.openInMaps}
          </a>
        )}

        {justCreated && <p className="muted">{t.roomCreated}</p>}
      </section>

      {directions.length > 1 && (
        <div className="dir-toggle" role="tablist" aria-label={t.boardDirectionTabs}>
          {directions.map((direction) => {
            const count = waitingCount(direction);
            const isActive = activeDirection === direction;
            return (
              <button
                key={direction}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`dir-toggle-btn ${direction}${isActive ? " active" : ""}`}
                onClick={() => setSelectedDirection(direction)}
              >
                <CarGraphic direction={direction} className="dir-toggle-car" />
                <span className="dir-toggle-label">
                  {direction === "inbound" && (
                    <ArrowLeft size={16} strokeWidth={2.6} aria-hidden="true" />
                  )}
                  {directionLabel(direction)}
                  {direction === "outbound" && (
                    <ArrowRight size={16} strokeWidth={2.6} aria-hidden="true" />
                  )}
                </span>
                <span className="dir-toggle-count">
                  {count === 0 ? t.boardAllSeated : t.boardWaitingCount.replace("{count}", String(count))}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <QueueList
        t={t}
        directionLabel={directionLabel(activeDirection)}
        childrenWaiting={waitingChildren}
        loading={loading}
        selectedChildId={selectedChild?.id ?? null}
        confirmDeleteChild={confirmDeleteChild}
        boardMessage={boardMessage}
        onSelectChild={selectWaitingChild}
        onEdit={onEditChild}
        onDeleteRequest={setConfirmDeleteChild}
        onDeleteConfirm={deleteChild}
        onDeleteCancel={() => setConfirmDeleteChild(null)}
      />

      <section className="car-board" aria-label={t.boardLabel}>
        {servingVehicles.length === 0 ? (
          <div className="board-empty">
            <Car size={40} strokeWidth={1.8} aria-hidden="true" />
            <h2>{t.boardNoCarsTitle}</h2>
            <p className="muted">{t.boardNoCarsBody}</p>
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
                <Car size={18} strokeWidth={2} aria-hidden="true" />
                {t.boardCarNotServing
                  .replace("{driver}", vehicle.driverName)
                  .replace("{direction}", directionLabel(activeDirection))}
              </button>
            ))}
          </div>
        )}
      </section>

      <Fab
        addVehicleLabel={t.addVehicle}
        addChildLabel={t.addChild}
        onAddVehicle={onAddVehicle}
        onAddChild={onAddChild}
      />
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

  const extras = [
    vehicle.lendsBooster ? t.needsBooster : "",
    vehicle.lendsRearFacing ? t.needsRearFacing : "",
    vehicle.lendsFrontFacing ? t.needsFrontFacing : "",
  ].filter(Boolean);

  return (
    <article className="car-card">
      <header className="car-card-head">
        <strong className="car-driver">{vehicle.driverName}</strong>
        {extras.length > 0 && (
          <span className="car-extras">{extras.join(" · ")}</span>
        )}
        <div className="car-card-actions">
          <button
            type="button"
            className="icon-button"
            onClick={onEdit}
            aria-label={t.driverEditCta}
          >
            <Pencil size={17} strokeWidth={2.2} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-button danger-icon"
            onClick={onDeleteRequest}
            aria-label={t.driverDeleteCta}
          >
            <Trash2 size={17} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      </header>

      {confirmDelete && (
        <div className="confirm-row">
          <span className="muted">
            {t.driverDeleteConfirm.replace("{driver}", vehicle.driverName)}
          </span>
          <div className="row">
            <button type="button" className="danger" onClick={onDeleteConfirm} disabled={loading}>
              {t.driverDeleteCta}
            </button>
            <button type="button" className="ghost" onClick={onDeleteCancel}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      <SeatSchematic
        seats={displaySeats}
        direction={direction}
        label={`${vehicle.driverName} ${direction}`}
        onTap={onSeatTap}
      />

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
    </article>
  );
}

function QueueList({
  t,
  directionLabel,
  childrenWaiting,
  loading,
  selectedChildId,
  confirmDeleteChild,
  boardMessage,
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
  boardMessage: string;
  onSelectChild: (childId: string) => void;
  onEdit: (childId: string) => void;
  onDeleteRequest: (childId: string) => void;
  onDeleteConfirm: (childId: string) => void;
  onDeleteCancel: () => void;
}) {
  return (
    <section className="queue" aria-label={t.boardWaitingForSeat}>
      <p className="queue-head">
        {t.boardWaitingForSeat}
        <span className="queue-head-dir">{directionLabel}</span>
      </p>

      {childrenWaiting.length === 0 ? (
        <p className="queue-empty muted">{t.boardNoWaitingChildren}</p>
      ) : (
        <ul className="queue-list">
          {childrenWaiting.map((child) => {
            const armed = selectedChildId === child.id;
            const confirming = confirmDeleteChild === child.id;
            return (
              <li key={child.id} className={`queue-row${armed ? " armed" : ""}`}>
                <button
                  type="button"
                  className="queue-row-name"
                  onClick={() => onSelectChild(child.id)}
                  disabled={loading}
                  aria-pressed={armed}
                >
                  <span className="queue-avatar" aria-hidden="true">
                    {(child.name.trim()[0] ?? "?").toUpperCase()}
                  </span>
                  <span className="queue-row-text">
                    {child.name}
                    {armed && <span className="queue-row-cue">{t.boardTapSeat}</span>}
                  </span>
                </button>
                {confirming ? (
                  <div className="queue-row-actions">
                    <button
                      type="button"
                      className="danger compact-button"
                      onClick={() => onDeleteConfirm(child.id)}
                      disabled={loading}
                    >
                      {t.childDeleteCta}
                    </button>
                    <button type="button" className="ghost compact-button" onClick={onDeleteCancel}>
                      {t.cancel}
                    </button>
                  </div>
                ) : (
                  <div className="queue-row-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => onEdit(child.id)}
                      aria-label={t.childEditCta}
                    >
                      <Pencil size={16} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="icon-button danger-icon"
                      onClick={() => onDeleteRequest(child.id)}
                      aria-label={t.childDeleteCta}
                    >
                      <Trash2 size={16} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {boardMessage && (
        <p className="board-inline-message" role="status">
          {boardMessage}
        </p>
      )}
    </section>
  );
}

function assignmentErrorCopy(t: Translation, code: ErrorCode): string {
  if (code === "INCOMPATIBLE_ACCESSORY") return t.boardSeatUnavailable;
  if (code === "DIRECTION_NOT_NEEDED_OR_OFFERED") return t.boardSeatUnavailable;
  if (code === "SEAT_ALREADY_ASSIGNED") return t.boardSeatUnavailable;
  if (code === "SEAT_NOT_FOUND") return t.boardSeatUnavailable;
  return t.unexpectedError;
}
