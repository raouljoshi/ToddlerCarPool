import { defaultTimeReference, type Direction, type DirectionMeta } from "../../domain/types";
import type { Translation } from "../i18n";

export type DirectionTimingDraft = Pick<DirectionMeta, "time" | "timeReference" | "info">;

export function timingDraft(meta: DirectionMeta, direction: Direction): DirectionTimingDraft {
  return {
    time: meta.time ?? "",
    timeReference: meta.timeReference ?? defaultTimeReference(direction),
    info: meta.info ?? "",
  };
}

export function directionLabel(t: Translation, direction: Direction): string {
  return direction === "outbound" ? t.outboundLabel : t.inboundLabel;
}
