import { useState } from "react";
import { Car, Plus, Users } from "lucide-react";

interface FabProps {
  addVehicleLabel: string;
  addChildLabel: string;
  onAddVehicle: () => void;
  onAddChild: () => void;
}

export function Fab({
  addVehicleLabel,
  addChildLabel,
  onAddVehicle,
  onAddChild,
}: FabProps) {
  const [open, setOpen] = useState(false);

  function pick(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <>
      {open && (
        <div
          className="fab-scrim"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className={`fab-dock${open ? " open" : ""}`}>
        {open && (
          <div className="fab-actions">
            <button
              type="button"
              className="fab-action"
              onClick={() => pick(onAddVehicle)}
            >
              <span>{addVehicleLabel}</span>
              <span className="fab-action-icon">
                <Car size={20} strokeWidth={2.2} aria-hidden="true" />
              </span>
            </button>
            <button
              type="button"
              className="fab-action"
              onClick={() => pick(onAddChild)}
            >
              <span>{addChildLabel}</span>
              <span className="fab-action-icon">
                <Users size={20} strokeWidth={2.2} aria-hidden="true" />
              </span>
            </button>
          </div>
        )}
        <button
          type="button"
          className="fab"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Add"}
        >
          <Plus size={26} strokeWidth={2.6} aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
