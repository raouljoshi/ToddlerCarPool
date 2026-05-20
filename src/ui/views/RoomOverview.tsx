import { useState } from "react";
import { enabledDirections, getChildAllocations, getVehicleSeatMap, vehicleAssignmentCount } from "../../domain/allocation";
import type { Child, Direction, Room, Vehicle } from "../../domain/types";
import type { Language, Translation } from "../i18n";
import { SeatSchematic } from "../components/SeatSchematic";
import { slotsToDisplayStates } from "../utils/seatUtils";

interface RoomOverviewProps {
  t: Translation;
  language: Language;
  room: Room;
  justCreated: boolean;
  loading: boolean;
  onCopyCode: () => void;
  onCopyLink: () => void;
  onRefresh: () => void;
  onAddVehicle: () => void;
  onAddChild: () => void;
  onEditVehicle: (vehicleId: string) => void;
  onEditChild: (childId: string) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onDeleteChild: (childId: string) => void;
  onUnassign: (assignmentId: string) => void;
  onAllocate: (childId: string) => void;
}

export function RoomOverview({
  t,
  language,
  room,
  justCreated,
  loading,
  onCopyCode,
  onCopyLink,
  onRefresh,
  onAddVehicle,
  onAddChild,
  onEditVehicle,
  onEditChild,
  onDeleteVehicle,
  onDeleteChild,
  onUnassign,
  onAllocate,
}: RoomOverviewProps) {
  const [showSheet, setShowSheet] = useState(false);
  const [confirmDeleteVehicle, setConfirmDeleteVehicle] = useState<string | null>(null);
  const [confirmDeleteChild, setConfirmDeleteChild] = useState<string | null>(null);

  const directions = enabledDirections(room);
  const childAllocations = getChildAllocations(room);
  const queueChildren = childAllocations.filter((a) => a.status !== "fully-allocated");
  const childNameById = new Map(room.children.map((c) => [c.id, c.name]));

  function deleteVehicle(vehicleId: string) {
    setConfirmDeleteVehicle(null);
    onDeleteVehicle(vehicleId);
  }

  function deleteChild(childId: string) {
    setConfirmDeleteChild(null);
    onDeleteChild(childId);
  }

  return (
    <>
      {/* Room hero */}
      <section className="room-hero">
        <span className="room-code-pill">{room.code}</span>
        {room.settings.label && <h1>{room.settings.label}</h1>}
        <div className="room-meta">
          <span>
            {t.expires}{" "}
            <strong>
              {new Date(room.expiresAt).toLocaleDateString(
                language === "sv" ? "sv-SE" : "en-US",
              )}
            </strong>
          </span>
          {room.settings.mapLink && (
            <a
              href={room.settings.mapLink}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--color-accent)", fontWeight: 600, fontSize: "0.92rem" }}
            >
              {t.mapLinkOpen}
            </a>
          )}
        </div>
        {room.settings.staticInfo && (
          <p className="muted" style={{ fontSize: "0.92rem" }}>{room.settings.staticInfo}</p>
        )}
        <div className="button-row">
          <button type="button" className="secondary" onClick={onCopyCode}>
            {t.copyCode}
          </button>
          <button type="button" className="secondary" onClick={onCopyLink}>
            {t.copyLink}
          </button>
          <button type="button" className="ghost" onClick={onRefresh}>
            {t.refresh}
          </button>
        </div>
        {justCreated && <p className="muted">{t.roomCreated}</p>}
      </section>

      {/* Queue: unallocated/partially-allocated children */}
      <section className="panel" style={{ marginBottom: "16px" }}>
        <div className="section-title">
          <h2>{t.queueHeading}</h2>
          <button type="button" className="ghost" onClick={onAddChild} style={{ fontSize: "0.85rem" }}>
            + {t.addChild}
          </button>
        </div>
        {queueChildren.length === 0 ? (
          <p className="empty">{t.queueEmpty}</p>
        ) : (
          <div className="queue-list">
            {queueChildren.map(({ child, missingDirections }) => (
              <QueueChildCard
                key={child.id}
                t={t}
                child={child}
                missingDirections={missingDirections}
                confirmDelete={confirmDeleteChild === child.id}
                loading={loading}
                onAllocate={() => onAllocate(child.id)}
                onEdit={() => onEditChild(child.id)}
                onDeleteRequest={() => setConfirmDeleteChild(child.id)}
                onDeleteConfirm={() => deleteChild(child.id)}
                onDeleteCancel={() => setConfirmDeleteChild(null)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Driver groups */}
      <section className="panel" style={{ marginBottom: "80px" }}>
        <div className="section-title">
          <h2>{t.driversHeading}</h2>
          <button type="button" className="ghost" onClick={onAddVehicle} style={{ fontSize: "0.85rem" }}>
            + {t.addVehicle}
          </button>
        </div>
        {room.vehicles.length === 0 ? (
          <p className="empty">{t.driversEmpty}</p>
        ) : (
          <div className="driver-list">
            {room.vehicles.map((vehicle) => (
              <DriverGroup
                key={vehicle.id}
                t={t}
                vehicle={vehicle}
                room={room}
                directions={directions}
                childNameById={childNameById}
                confirmDelete={confirmDeleteVehicle === vehicle.id}
                loading={loading}
                onEdit={() => onEditVehicle(vehicle.id)}
                onUnassign={onUnassign}
                onDeleteRequest={() => setConfirmDeleteVehicle(vehicle.id)}
                onDeleteConfirm={() => deleteVehicle(vehicle.id)}
                onDeleteCancel={() => setConfirmDeleteVehicle(null)}
              />
            ))}
          </div>
        )}
      </section>

      {/* FAB + action sheet */}
      <button
        type="button"
        className="fab"
        aria-label={t.addVehicle}
        onClick={() => setShowSheet(true)}
        disabled={loading}
      >
        +
      </button>

      {showSheet && (
        <div
          className="sheet-backdrop"
          onClick={() => setShowSheet(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                setShowSheet(false);
                onAddVehicle();
              }}
            >
              {t.addVehicle}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setShowSheet(false);
                onAddChild();
              }}
            >
              {t.addChild}
            </button>
            <button type="button" className="ghost" onClick={() => setShowSheet(false)}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Queue child card ──────────────────────────────────────────────────────────

function QueueChildCard({
  t,
  child,
  missingDirections,
  confirmDelete,
  loading,
  onAllocate,
  onEdit,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  t: Translation;
  child: Child;
  missingDirections: Direction[];
  confirmDelete: boolean;
  loading: boolean;
  onAllocate: () => void;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  return (
    <div className="queue-child">
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>{child.name}</strong>
        <div className="child-meta">
          {missingDirections.map((d) => (
            <span key={d} className={`dir-pill ${d}`}>
              {d === "outbound" ? "→" : "←"}
            </span>
          ))}
          {child.borrows.booster && (
            <span className="muted" style={{ fontSize: "0.78rem" }}>{t.needsBooster}</span>
          )}
          {child.borrows.rearFacing && (
            <span className="muted" style={{ fontSize: "0.78rem" }}>{t.needsRearFacing}</span>
          )}
          {child.borrows.frontFacing && (
            <span className="muted" style={{ fontSize: "0.78rem" }}>{t.needsFrontFacing}</span>
          )}
        </div>
        {confirmDelete && (
          <div className="row" style={{ marginTop: "8px" }}>
            <button type="button" className="danger" onClick={onDeleteConfirm} disabled={loading} style={{ fontSize: "0.85rem" }}>
              Confirm delete
            </button>
            <button type="button" className="ghost" onClick={onDeleteCancel} style={{ fontSize: "0.85rem" }}>
              {t.cancel}
            </button>
          </div>
        )}
      </div>
      <div className="row">
        <button type="button" className="secondary" onClick={onEdit} style={{ fontSize: "0.85rem" }}>
          {t.childEditCta}
        </button>
        <button type="button" className="accent" onClick={onAllocate} disabled={loading}>
          {t.allocateTitle}
        </button>
        {!confirmDelete && (
          <button type="button" className="ghost" onClick={onDeleteRequest} aria-label="Delete" style={{ fontSize: "0.85rem", minWidth: "auto", padding: "0 10px" }}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ── Driver group ──────────────────────────────────────────────────────────────

function DriverGroup({
  t,
  vehicle,
  room,
  directions,
  childNameById,
  confirmDelete,
  loading,
  onEdit,
  onUnassign,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  t: Translation;
  vehicle: Vehicle;
  room: Room;
  directions: Direction[];
  childNameById: Map<string, string>;
  confirmDelete: boolean;
  loading: boolean;
  onEdit: () => void;
  onUnassign: (assignmentId: string) => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  const hasAssignments = vehicleAssignmentCount(room, vehicle.id) > 0;
  const vehicleDirections = directions.filter((d) => vehicle.directions.includes(d));

  return (
    <div className="driver-group">
      <div className="driver-group-head">
        <div style={{ display: "grid", gap: "4px" }}>
          <strong>{vehicle.driverName}</strong>
          <div className="row">
            {vehicleDirections.map((d) => (
              <span key={d} className={`dir-pill ${d}`}>
                {d === "outbound" ? t.outboundLabel : t.inboundLabel}
              </span>
            ))}
            {(vehicle.lendsBooster || vehicle.lendsRearFacing || vehicle.lendsFrontFacing) && (
              <>
                {vehicle.lendsBooster && <span className="muted" style={{ fontSize: "0.78rem" }}>↳ {t.needsBooster}</span>}
                {vehicle.lendsRearFacing && <span className="muted" style={{ fontSize: "0.78rem" }}>↳ {t.needsRearFacing}</span>}
                {vehicle.lendsFrontFacing && <span className="muted" style={{ fontSize: "0.78rem" }}>↳ {t.needsFrontFacing}</span>}
              </>
            )}
          </div>
        </div>
        <div className="driver-group-actions">
          <button
            type="button"
            className="secondary"
            onClick={onEdit}
            disabled={hasAssignments || loading}
            title={hasAssignments ? t.driverHasAssignments : undefined}
            style={{ fontSize: "0.85rem" }}
          >
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
            <button type="button" className="ghost" onClick={onDeleteRequest} style={{ fontSize: "0.85rem", minWidth: "auto", padding: "0 10px" }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {confirmDelete && (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          {vehicle.driverName.replace("{driver}", vehicle.driverName)}
          {" "}—{" "}
          {t.driverDeleteConfirm.replace("{driver}", vehicle.driverName)}
        </p>
      )}

      <div className="driver-group-schematics">
        {vehicleDirections.map((d) => {
          const slots = getVehicleSeatMap(room, vehicle.id, d);
          const displaySeats = slotsToDisplayStates(slots, childNameById);
          const assignments = room.assignments.filter(
            (a) => a.vehicleId === vehicle.id && a.direction === d,
          );
          return (
            <div key={d} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span className={`dir-pill ${d}`}>
                {d === "outbound" ? t.outboundLabel : t.inboundLabel}
              </span>
              <SeatSchematic
                seats={displaySeats}
                label={`${vehicle.driverName} ${d}`}
              />
              {assignments.length > 0 && (
                <div style={{ display: "grid", gap: "4px" }}>
                  {assignments.map((a) => {
                    const name = childNameById.get(a.childId) ?? "?";
                    return (
                      <div key={a.id} className="row" style={{ fontSize: "0.85rem" }}>
                        <span>{name}</span>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => onUnassign(a.id)}
                          disabled={loading}
                          title={t.childMoveToQueueCta}
                          style={{ fontSize: "0.78rem", minWidth: "auto", padding: "0 8px" }}
                        >
                          {t.childMoveToQueueCta}
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
    </div>
  );
}
