import { useEffect, useState } from "react";
import type { Room } from "../domain/types";
import { ApiClientError, createRoom, getRoom } from "./api";
import { HeroCars } from "./components/HeroCars";
import { getInitialLanguage, saveLanguage, translations, type Language } from "./i18n";
import "./styles.css";

type View =
  | { kind: "landing" }
  | { kind: "create-wizard" }
  | { kind: "room-overview"; justCreated: boolean };

export function App() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const t = translations[language];
  const [room, setRoom] = useState<Room | null>(null);
  const [view, setView] = useState<View>({ kind: "landing" });
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("room");
    if (code) void loadRoom(code, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveLanguage(language);
  }, [language]);

  async function loadRoom(code: string, justCreated: boolean) {
    setLoading(true);
    setError("");
    try {
      const next = await getRoom(code);
      setRoom(next);
      setView({ kind: "room-overview", justCreated });
      window.history.replaceState(null, "", `/?room=${encodeURIComponent(next.code)}`);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : t.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickCreate() {
    setLoading(true);
    setError("");
    try {
      const next = await createRoom({});
      setRoom(next);
      setView({ kind: "room-overview", justCreated: true });
      window.history.replaceState(null, "", `/?room=${encodeURIComponent(next.code)}`);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : t.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  async function copyText(text: string, message: string) {
    try {
      await navigator.clipboard?.writeText(text);
      setNotice(message);
    } catch {
      setNotice(message);
    }
  }

  return (
    <main className="app-shell">
      <Header
        language={language}
        onLanguage={(next) => {
          setLanguage(next);
          setNotice("");
        }}
      />

      {error ? <Feedback kind="error" title={t.errorTitle} message={error} /> : null}
      {notice ? <Feedback kind="info" title={notice} /> : null}

      {view.kind === "landing" ? (
        <LandingView
          t={t}
          joinCode={joinCode}
          onJoinCodeChange={setJoinCode}
          onJoin={() => joinCode && void loadRoom(joinCode, false)}
          onStartCreate={() => setView({ kind: "create-wizard" })}
          loading={loading}
          hasRoomParam={Boolean(new URLSearchParams(window.location.search).get("room"))}
        />
      ) : null}

      {view.kind === "create-wizard" ? (
        <CreateWizardShell
          t={t}
          onCancel={() => setView({ kind: "landing" })}
          onQuickCreate={handleQuickCreate}
          loading={loading}
        />
      ) : null}

      {view.kind === "room-overview" && room ? (
        <RoomOverviewShell
          t={t}
          language={language}
          room={room}
          justCreated={view.justCreated}
          onCopyCode={() => void copyText(room.code, t.codeCopied)}
          onCopyLink={() =>
            void copyText(
              `${window.location.origin}/?room=${encodeURIComponent(room.code)}`,
              t.linkCopied,
            )
          }
          onRefresh={() => void loadRoom(room.code, false)}
        />
      ) : null}
    </main>
  );
}

function Header({
  language,
  onLanguage,
}: {
  language: Language;
  onLanguage: (lang: Language) => void;
}) {
  return (
    <header className="topbar">
      <span className="brand" aria-label="ToddlerCarPool">
        <span className="brand-dot" aria-hidden="true" />
        ToddlerCarPool
      </span>
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

function LandingView({
  t,
  joinCode,
  onJoinCodeChange,
  onJoin,
  onStartCreate,
  loading,
  hasRoomParam,
}: {
  t: (typeof translations)["en"];
  joinCode: string;
  onJoinCodeChange: (code: string) => void;
  onJoin: () => void;
  onStartCreate: () => void;
  loading: boolean;
  hasRoomParam: boolean;
}) {
  return (
    <section className="landing-hero">
      <p className="eyebrow">{t.brandTagline}</p>
      <h1>{t.introHeadline}</h1>
      <p>{t.introBody}</p>
      <HeroCars />
      <div className="landing-actions">
        <article className="landing-action primary">
          <h2>{t.startNewRoomTitle}</h2>
          <p>{t.startNewRoomBody}</p>
          <div>
            <button type="button" className="accent" onClick={onStartCreate} disabled={loading}>
              {t.startNewRoomCta}
            </button>
          </div>
        </article>
        <article className={`landing-action${hasRoomParam ? " highlighted" : ""}`}>
          <h2>{t.joinRoomTitle}</h2>
          <p>{t.joinRoomBody}</p>
          <label>
            {t.roomCode}
            <input
              value={joinCode}
              onChange={(event) => onJoinCodeChange(event.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
            />
          </label>
          <div>
            <button type="button" onClick={onJoin} disabled={!joinCode || loading}>
              {t.joinRoomCta}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

function CreateWizardShell({
  t,
  onCancel,
  onQuickCreate,
  loading,
}: {
  t: (typeof translations)["en"];
  onCancel: () => void;
  onQuickCreate: () => void;
  loading: boolean;
}) {
  // Phase 4 placeholder: full multi-step wizard ships in Phase 5.
  // For now this surface lets you back out or create a default room.
  return (
    <section className="panel wizard">
      <h2>{t.organizerWizardTitle}</h2>
      <p className="muted">{t.reviewIntro}</p>
      <div className="wizard-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          {t.cancel}
        </button>
        <button type="button" className="accent" onClick={onQuickCreate} disabled={loading}>
          {t.createRoom}
        </button>
      </div>
    </section>
  );
}

function RoomOverviewShell({
  t,
  language,
  room,
  justCreated,
  onCopyCode,
  onCopyLink,
  onRefresh,
}: {
  t: (typeof translations)["en"];
  language: Language;
  room: Room;
  justCreated: boolean;
  onCopyCode: () => void;
  onCopyLink: () => void;
  onRefresh: () => void;
}) {
  return (
    <>
      <section className="room-hero">
        <span className="room-code-pill">{room.code}</span>
        {room.settings.label ? <h1>{room.settings.label}</h1> : null}
        <div className="room-meta">
          <span>
            {t.expires}{" "}
            <strong>
              {new Date(room.expiresAt).toLocaleDateString(language === "sv" ? "sv-SE" : "en-US")}
            </strong>
          </span>
        </div>
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
        {justCreated ? <p className="muted">{t.roomCreated}</p> : null}
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>{t.queueHeading}</h2>
        </div>
        <p className="empty">{t.queueEmpty}</p>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>{t.driversHeading}</h2>
        </div>
        <p className="empty">{t.driversEmpty}</p>
      </section>

      <button type="button" className="fab" aria-label="Add" disabled>
        +
      </button>
    </>
  );
}

function Feedback({
  kind,
  title,
  message,
}: {
  kind: "info" | "error";
  title: string;
  message?: string;
}) {
  return (
    <div className={kind === "error" ? "feedback error" : "feedback"} role="status">
      <strong>{title}</strong>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
