import { ChevronLeft } from "lucide-react";
import type { Language } from "../i18n";

interface AppBarProps {
  language: Language;
  onLanguage: (lang: Language) => void;
  /** When set, the left slot becomes a back button instead of the brand mark. */
  onBack?: () => void;
}

export function AppBar({ language, onLanguage, onBack }: AppBarProps) {
  return (
    <header className="appbar">
      <div className="appbar-lead">
        {onBack ? (
          <button
            type="button"
            className="icon-button appbar-back"
            onClick={onBack}
            aria-label="Back"
          >
            <ChevronLeft size={22} strokeWidth={2.4} aria-hidden="true" />
          </button>
        ) : (
          <span className="brand-dot" aria-hidden="true" />
        )}
        <span className="appbar-brand" aria-label="ToddlerCarPool">
          <span>Toddler</span>
          <span>CarPool</span>
        </span>
      </div>

      <div className="segmented" role="group" aria-label="Language">
        <button
          type="button"
          className={language === "en" ? "active" : ""}
          onClick={() => onLanguage("en")}
        >
          EN
        </button>
        <button
          type="button"
          className={language === "sv" ? "active" : ""}
          onClick={() => onLanguage("sv")}
        >
          SV
        </button>
      </div>
    </header>
  );
}
