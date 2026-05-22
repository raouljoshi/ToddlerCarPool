import { Check } from "lucide-react";
import type { Direction } from "../../domain/types";
import { CarGraphic } from "./CarGraphic";

interface DirectionPickerProps {
  options: Direction[];
  selected: Direction[];
  labelFor: (direction: Direction) => string;
  onToggle: (direction: Direction) => void;
}

/** Visual there/home selector built on the car graphic. */
export function DirectionPicker({
  options,
  selected,
  labelFor,
  onToggle,
}: DirectionPickerProps) {
  return (
    <div className="dir-picker">
      {options.map((direction) => {
        const isOn = selected.includes(direction);
        return (
          <button
            key={direction}
            type="button"
            className={`dir-choice ${direction}${isOn ? " on" : ""}`}
            onClick={() => onToggle(direction)}
            aria-pressed={isOn}
          >
            <CarGraphic direction={direction} className="dir-choice-car" />
            <span className="dir-choice-label">{labelFor(direction)}</span>
            <span className="dir-choice-tick" aria-hidden="true">
              {isOn && <Check size={14} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
