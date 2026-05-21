import { useEffect, useState } from "react";
import type {
  AssignChildRequest,
  CreateChildRequest,
  CreateRoomRequest,
  CreateVehicleRequest,
  UpdateChildRequest,
  UpdateVehicleRequest,
} from "../application/dto";
import { enabledDirections } from "../domain/allocation";
import type { Room } from "../domain/types";
import {
  ApiClientError,
  assignChild,
  createChild,
  createRoom,
  createVehicle,
  deleteChild,
  deleteVehicle,
  getRoom,
  unassignChild,
  updateChild,
  updateVehicle,
} from "./api";
import { HeroCars } from "./components/HeroCars";
import { getInitialLanguage, saveLanguage, translations, type Language } from "./i18n";
import { AllocateView } from "./views/AllocateView";
import { ChildWizard } from "./views/ChildWizard";
import { OrganizerWizard } from "./views/OrganizerWizard";
import { RoomOverview } from "./views/RoomOverview";
import { VehicleWizard } from "./views/VehicleWizard";
import "./styles.css";

type View =
  | { kind: "landing" }
  | { kind: "create-wizard" }
  | { kind: "room-overview"; justCreated: boolean }
  | { kind: "add-vehicle" }
  | { kind: "add-child" }
  | { kind: "edit-vehicle"; vehicleId: string }
  | { kind: "edit-child"; childId: string }
  | { kind: "allocate"; childId: string };

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

  async function handleCreateRoom(request: CreateRoomRequest) {
    setLoading(true);
    setError("");
    try {
      const next = await createRoom(request);
      setRoom(next);
      setView({ kind: "room-overview", justCreated: true });
      window.history.replaceState(null, "", `/?room=${encodeURIComponent(next.code)}`);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : t.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateVehicle(request: CreateVehicleRequest) {
    if (!room) return;
    setLoading(true);
    setError("");
    try {
      const next = await createVehicle(room.code, request);
      setRoom(next);
      setView({ kind: "room-overview", justCreated: false });
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : t.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateVehicle(vehicleId: string, request: UpdateVehicleRequest) {
    if (!room) return;
    setLoading(true);
    setError("");
    try {
      const next = await updateVehicle(room.code, vehicleId, request);
      setRoom(next);
      setView({ kind: "room-overview", justCreated: false });
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : t.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteVehicle(vehicleId: string) {
    if (!room) return;
    setLoading(true);
    setError("");
    try {
      const next = await deleteVehicle(room.code, vehicleId);
      setRoom(next);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : t.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateChild(request: CreateChildRequest) {
    if (!room) return;
    setLoading(true);
    setError("");
    try {
      const next = await createChild(room.code, request);
      setRoom(next);
      setView({ kind: "room-overview", justCreated: false });
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : t.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateChild(childId: string, request: UpdateChildRequest) {
    if (!room) return;
    setLoading(true);
    setError("");
    try {
      const next = await updateChild(room.code, childId, request);
      setRoom(next);
      setView({ kind: "room-overview", justCreated: false });
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : t.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteChild(childId: string) {
    if (!room) return;
    setLoading(true);
    setError("");
    try {
      const next = await deleteChild(room.code, childId);
      setRoom(next);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : t.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignChild(request: AssignChildRequest) {
    if (!room) return;
    setLoading(true);
    setError("");
    try {
      const next = await assignChild(room.code, request);
      setRoom(next);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : t.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnassign(assignmentId: string) {
    if (!room) return;
    setLoading(true);
    setError("");
    try {
      const next = await unassignChild(room.code, assignmentId);
      setRoom(next);
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

  function goToOverview() {
    if (room) setView({ kind: "room-overview", justCreated: false });
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

      {view.kind === "landing" && (
        <LandingView
          t={t}
          joinCode={joinCode}
          onJoinCodeChange={setJoinCode}
          onJoin={() => joinCode && void loadRoom(joinCode, false)}
          onStartCreate={() => setView({ kind: "create-wizard" })}
          loading={loading}
          hasRoomParam={Boolean(new URLSearchParams(window.location.search).get("room"))}
        />
      )}

      {view.kind === "create-wizard" && (
        <OrganizerWizard
          t={t}
          loading={loading}
          onCancel={() => setView({ kind: "landing" })}
          onSubmit={(request) => void handleCreateRoom(request)}
        />
      )}

      {view.kind === "room-overview" && room && (
        <RoomOverview
          t={t}
          language={language}
          room={room}
          justCreated={view.justCreated}
          loading={loading}
          onCopyCode={() => void copyText(room.code, t.codeCopied)}
          onCopyLink={() =>
            void copyText(
              `${window.location.origin}/?room=${encodeURIComponent(room.code)}`,
              t.linkCopied,
            )
          }
          onRefresh={() => void loadRoom(room.code, false)}
          onAddVehicle={() => setView({ kind: "add-vehicle" })}
          onAddChild={() => setView({ kind: "add-child" })}
          onEditVehicle={(vehicleId) => setView({ kind: "edit-vehicle", vehicleId })}
          onEditChild={(childId) => setView({ kind: "edit-child", childId })}
          onDeleteVehicle={(vehicleId) => void handleDeleteVehicle(vehicleId)}
          onDeleteChild={(childId) => void handleDeleteChild(childId)}
          onUnassign={(assignmentId) => void handleUnassign(assignmentId)}
          onAllocate={(childId) => setView({ kind: "allocate", childId })}
        />
      )}

      {view.kind === "add-vehicle" && room && (
        <VehicleWizard
          mode="create"
          t={t}
          enabledDirections={enabledDirections(room)}
          loading={loading}
          onCancel={goToOverview}
          onSubmit={(request) => void handleCreateVehicle(request)}
        />
      )}

      {view.kind === "add-child" && room && (
        <ChildWizard
          mode="create"
          t={t}
          enabledDirections={enabledDirections(room)}
          loading={loading}
          onCancel={goToOverview}
          onSubmit={(request) => void handleCreateChild(request)}
        />
      )}

      {view.kind === "edit-vehicle" && room && (() => {
        const vehicle = room.vehicles.find((v) => v.id === view.vehicleId);
        if (!vehicle) return null;
        return (
          <VehicleWizard
            mode="edit"
            vehicle={vehicle}
            t={t}
            enabledDirections={enabledDirections(room)}
            loading={loading}
            onCancel={goToOverview}
            onSubmit={(request) => void handleUpdateVehicle(view.vehicleId, request)}
          />
        );
      })()}

      {view.kind === "edit-child" && room && (() => {
        const child = room.children.find((c) => c.id === view.childId);
        if (!child) return null;
        return (
          <ChildWizard
            mode="edit"
            child={child}
            t={t}
            enabledDirections={enabledDirections(room)}
            loading={loading}
            onCancel={goToOverview}
            onSubmit={(request) => void handleUpdateChild(view.childId, request)}
          />
        );
      })()}

      {view.kind === "allocate" && room && (
        <AllocateView
          t={t}
          language={language}
          room={room}
          childId={view.childId}
          loading={loading}
          onBack={goToOverview}
          onAssign={async (request) => {
            await handleAssignChild(request);
          }}
        />
      )}
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
