import { useEffect, useMemo, useState } from "react";
import { getChildAllocations, getSeatAvailability } from "../domain/allocation";
import type { ChildNeed, Direction, Room, RoomSettings, SeatType } from "../domain/types";
import type { FamilyRequest } from "../application/dto";
import { addFamily, assignSeat, createRoom, deleteAssignment, deleteFamily, getRoom, ApiClientError } from "./api";
import { getInitialLanguage, saveLanguage, translations, type Language, type Translation } from "./i18n";
import "./styles.css";

const seatTypes: SeatType[] = ["regular", "booster", "front-facing", "rear-facing"];

const defaultSettings: RoomSettings = {
  label: "",
  staticInfo: "",
  mapLink: "",
  outboundEnabled: true,
  outboundLabel: "",
  outboundInfo: "",
  inboundEnabled: true,
  inboundLabel: "",
  inboundInfo: "",
};

const emptyFamily: FamilyRequest = {
  displayLabel: "",
  children: [{ label: "", directions: ["outbound"], seatType: "booster" }],
  seatOffers: [{ label: "", directions: ["outbound"], seatType: "booster" }],
  notes: {},
};

type RoomTab = "overview" | "family" | "plan";

export function App() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const t = translations[language];
  const [room, setRoom] = useState<Room | null>(null);
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [setupStep, setSetupStep] = useState(0);
  const [settingsDraft, setSettingsDraft] = useState<RoomSettings>(defaultSettings);
  const [familyStep, setFamilyStep] = useState(0);
  const [familyDraft, setFamilyDraft] = useState<FamilyRequest>(emptyFamily);
  const [selectedChild, setSelectedChild] = useState<{ child: ChildNeed; direction: Direction } | null>(null);
  const [activeTab, setActiveTab] = useState<RoomTab>("overview");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("room");
    if (code) void loadRoom(code);
    // Initial URL hydration only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveLanguage(language);
  }, [language]);

  const enabledDirections = useMemo(() => {
    const directions: Direction[] = [];
    if (room?.settings.outboundEnabled ?? settingsDraft.outboundEnabled) directions.push("outbound");
    if (room?.settings.inboundEnabled ?? settingsDraft.inboundEnabled) directions.push("inbound");
    return directions;
  }, [room, settingsDraft.inboundEnabled, settingsDraft.outboundEnabled]);

  const allocations = useMemo(() => (room ? getChildAllocations(room) : []), [room]);
  const seatAvailability = useMemo(() => (room ? getSeatAvailability(room) : []), [room]);
  const selectedCompatibleSeats = useMemo(() => {
    if (!selectedChild) return [];
    return seatAvailability.filter(
      (item) =>
        !item.assignment &&
        item.direction === selectedChild.direction &&
        item.seat.seatType === selectedChild.child.seatType,
    );
  }, [seatAvailability, selectedChild]);

  async function run(action: () => Promise<Room | void>) {
    setLoading(true);
    setError("");
    try {
      const nextRoom = await action();
      if (nextRoom) setRoom(nextRoom);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  async function loadRoom(code: string) {
    await run(async () => {
      const nextRoom = await getRoom(code);
      setCreatedRoom(null);
      setActiveTab("overview");
      window.history.replaceState(null, "", `/?room=${encodeURIComponent(nextRoom.code)}`);
      return nextRoom;
    });
  }

  async function handleCreateRoom() {
    await run(async () => {
      const nextRoom = await createRoom(settingsDraft);
      setCreatedRoom(nextRoom);
      window.history.replaceState(null, "", `/?room=${encodeURIComponent(nextRoom.code)}`);
      return nextRoom;
    });
  }

  async function handleAddFamily() {
    if (!room) return;
    await run(async () => {
      const nextRoom = await addFamily(room.code, familyDraft);
      setFamilyDraft(emptyFamily);
      setFamilyStep(0);
      setActiveTab("plan");
      return nextRoom;
    });
  }

  async function copyText(text: string, message: string) {
    await navigator.clipboard?.writeText(text);
    setNotice(message);
  }

  function languageChange(next: Language) {
    setLanguage(next);
    setNotice("");
  }

  if (!room) {
    const hasRoomParam = Boolean(new URLSearchParams(window.location.search).get("room"));
    return (
      <main className="app-shell">
        <Header language={language} onLanguage={languageChange} />
        <section className="hero-panel">
          <div>
            <h1 aria-label={t.appName}>🚗 {t.appName}</h1>
            <p className="privacy-copy">{t.privacy}</p>
          </div>
          <div className="landing-role-cards">
            <div className="role-card primary">
              <span className="role-card-icon" aria-hidden="true">📋</span>
              <h2>{t.createRoomRole}</h2>
              <p>{t.startNewRoom}</p>
              <OrganizerWizard
                step={setupStep}
                setStep={setSetupStep}
                draft={settingsDraft}
                setDraft={setSettingsDraft}
                onCreate={handleCreateRoom}
                loading={loading}
                t={t}
              />
            </div>
            <div className={`role-card secondary${hasRoomParam ? " highlighted" : ""}`}>
              <span className="role-card-icon" aria-hidden="true">🔑</span>
              <h2>{t.joinRoomRole}</h2>
              <p>{t.joinExistingRoom}</p>
              <JoinPanel
                code={joinCode}
                setCode={setJoinCode}
                onJoin={() => void loadRoom(joinCode)}
                loading={loading}
                t={t}
              />
            </div>
          </div>
          <Feedback error={error} notice={notice} title={t.errorTitle} />
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Header language={language} onLanguage={languageChange} />
      <section className="room-hero">
        <div>
          <p className="eyebrow">{room.code}</p>
          <h1>{room.settings.label}</h1>
          <p>
            {t.expires} <strong>{new Date(room.expiresAt).toLocaleDateString(language === "sv" ? "sv-SE" : "en-US")}</strong>
          </p>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={() => void copyText(room.code, t.codeCopied)}>
            {t.copyCode}
          </button>
          <button
            className="secondary"
            onClick={() => void copyText(`${window.location.origin}/?room=${encodeURIComponent(room.code)}`, t.linkCopied)}
          >
            {t.copyLink}
          </button>
          <button className="secondary" onClick={() => void loadRoom(room.code)}>
            {t.refresh}
          </button>
        </div>
      </section>

      {createdRoom ? (
        <section className="success-panel">
          <strong>{t.roomCreated} 🎉</strong>
          <div>
            <span className="room-code-display">{room.code}</span>
          </div>
          <div className="button-row">
            <button onClick={() => void copyText(room.code, t.codeCopied)}>{t.copyCode}</button>
            <button className="secondary" onClick={() => void copyText(window.location.href, t.linkCopied)}>
              {t.copyLink}
            </button>
          </div>
        </section>
      ) : null}

      <Feedback error={error} notice={notice} title={t.errorTitle} />

      <div className="tabs" aria-label="Room sections">
        <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>
          {t.overview}
        </button>
        <button className={activeTab === "family" ? "active" : ""} onClick={() => setActiveTab("family")}>
          {t.planFamily}
        </button>
        <button className={activeTab === "plan" ? "active" : ""} onClick={() => setActiveTab("plan")}>
          {t.currentPlan}
        </button>
      </div>

      {activeTab === "overview" ? <RoomOverview room={room} t={t} /> : null}
      {activeTab === "family" ? (
        <FamilyWizard
          step={familyStep}
          setStep={setFamilyStep}
          draft={familyDraft}
          setDraft={setFamilyDraft}
          enabledDirections={enabledDirections}
          onSave={handleAddFamily}
          loading={loading}
          t={t}
        />
      ) : null}
      {activeTab === "plan" ? (
        <PlanningOverview
          room={room}
          allocations={allocations}
          selectedChild={selectedChild}
          setSelectedChild={setSelectedChild}
          selectedCompatibleSeats={selectedCompatibleSeats}
          onAssign={(childId, seatId, direction) =>
            void run(async () => {
              const nextRoom = await assignSeat(room.code, { childId, seatId, direction });
              setSelectedChild(null);
              return nextRoom;
            })
          }
          onUnassign={(assignmentId) => void run(() => deleteAssignment(room.code, assignmentId))}
          onDeleteFamily={(familyId) => void run(() => deleteFamily(room.code, familyId))}
          t={t}
        />
      ) : null}
    </main>
  );
}

function Header({ language, onLanguage }: { language: Language; onLanguage: (language: Language) => void }) {
  return (
    <header className="topbar">
      <strong>ToddlerCarPool</strong>
      <div className="segmented" aria-label="Language">
        <button className={language === "en" ? "active" : ""} onClick={() => onLanguage("en")}>
          EN
        </button>
        <button className={language === "sv" ? "active" : ""} onClick={() => onLanguage("sv")}>
          SV
        </button>
      </div>
    </header>
  );
}

function OrganizerWizard({
  step,
  setStep,
  draft,
  setDraft,
  onCreate,
  loading,
  t,
}: {
  step: number;
  setStep: (step: number) => void;
  draft: RoomSettings;
  setDraft: (draft: RoomSettings) => void;
  onCreate: () => void;
  loading: boolean;
  t: Translation;
}) {
  return (
    <div className="wizard">
      <StepIndicator labels={[t.setupStepEvent, t.setupStepDirections, t.setupStepShare]} current={step} />
      {step === 0 ? (
        <div className="wizard-card">
          <label>
            {t.eventName}
            <input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
          </label>
          <label>
            {t.eventInfo}
            <textarea value={draft.staticInfo ?? ""} onChange={(event) => setDraft({ ...draft, staticInfo: event.target.value })} />
          </label>
          <label>
            {t.mapLink}
            <input value={draft.mapLink ?? ""} onChange={(event) => setDraft({ ...draft, mapLink: event.target.value })} />
          </label>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="wizard-card">
          <DirectionSetup
            enabled={draft.outboundEnabled}
            onEnabled={(enabled) => setDraft({ ...draft, outboundEnabled: enabled })}
            label={draft.outboundLabel}
            onLabel={(label) => setDraft({ ...draft, outboundLabel: label })}
            info={draft.outboundInfo ?? ""}
            onInfo={(info) => setDraft({ ...draft, outboundInfo: info })}
            title={t.enableOutbound}
            labelText={t.outboundLabel}
            infoText={t.outboundInfo}
          />
          <DirectionSetup
            enabled={draft.inboundEnabled}
            onEnabled={(enabled) => setDraft({ ...draft, inboundEnabled: enabled })}
            label={draft.inboundLabel}
            onLabel={(label) => setDraft({ ...draft, inboundLabel: label })}
            info={draft.inboundInfo ?? ""}
            onInfo={(info) => setDraft({ ...draft, inboundInfo: info })}
            title={t.enableInbound}
            labelText={t.inboundLabel}
            infoText={t.inboundInfo}
          />
        </div>
      ) : null}
      {step === 2 ? (
        <div className="wizard-card review-card">
          <h2>{draft.label || "Carpool event"}</h2>
          <p>{draft.staticInfo}</p>
          {draft.mapLink ? <p>{draft.mapLink}</p> : null}
          <ul>
            {draft.outboundEnabled ? <li>{draft.outboundLabel || t.outbound}</li> : null}
            {draft.inboundEnabled ? <li>{draft.inboundLabel || t.inbound}</li> : null}
          </ul>
        </div>
      ) : null}
      <div className="wizard-actions">
        <button className="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>
          {t.back}
        </button>
        {step < 2 ? (
          <button onClick={() => setStep(step + 1)}>{t.next}</button>
        ) : (
          <button onClick={onCreate} disabled={loading}>
            {t.createRoom}
          </button>
        )}
      </div>
    </div>
  );
}

function DirectionSetup({
  enabled,
  onEnabled,
  label,
  onLabel,
  info,
  onInfo,
  title,
  labelText,
  infoText,
}: {
  enabled: boolean;
  onEnabled: (enabled: boolean) => void;
  label: string;
  onLabel: (label: string) => void;
  info: string;
  onInfo: (info: string) => void;
  title: string;
  labelText: string;
  infoText: string;
}) {
  return (
    <div className="direction-box">
      <label className="switch-row">
        <input type="checkbox" checked={enabled} onChange={(event) => onEnabled(event.target.checked)} />
        {title}
      </label>
      {enabled ? (
        <>
          <label>
            {labelText}
            <input value={label} onChange={(event) => onLabel(event.target.value)} />
          </label>
          <label>
            {infoText}
            <textarea value={info} onChange={(event) => onInfo(event.target.value)} />
          </label>
        </>
      ) : null}
    </div>
  );
}

function JoinPanel({
  code,
  setCode,
  onJoin,
  loading,
  t,
}: {
  code: string;
  setCode: (code: string) => void;
  onJoin: () => void;
  loading: boolean;
  t: Translation;
}) {
  return (
    <div className="join-panel">
      <div className="join-row">
        <label>
          {t.roomCode}
          <input value={code} onChange={(event) => setCode(event.target.value)} />
        </label>
        <button className="secondary" onClick={onJoin} disabled={!code || loading}>
          {t.joinRoom}
        </button>
      </div>
    </div>
  );
}

function RoomOverview({ room, t }: { room: Room; t: Translation }) {
  return (
    <section className="overview-grid">
      <article className="panel">
        <h2>{t.eventDetails}</h2>
        {room.settings.staticInfo ? <p>{room.settings.staticInfo}</p> : null}
        {room.settings.mapLink ? (
          <a href={room.settings.mapLink} target="_blank" rel="noreferrer">
            {t.mapLink}
          </a>
        ) : null}
      </article>
      <article className="panel">
        <h2>{t.directionsIncluded}</h2>
        {room.settings.outboundEnabled ? (
          <DirectionSummary title={room.settings.outboundLabel || t.outbound} info={room.settings.outboundInfo} />
        ) : null}
        {room.settings.inboundEnabled ? (
          <DirectionSummary title={room.settings.inboundLabel || t.inbound} info={room.settings.inboundInfo} />
        ) : null}
      </article>
    </section>
  );
}

function DirectionSummary({ title, info }: { title: string; info?: string }) {
  return (
    <div className="summary-line">
      <strong>{title}</strong>
      {info ? <p>{info}</p> : null}
    </div>
  );
}

function FamilyWizard({
  step,
  setStep,
  draft,
  setDraft,
  enabledDirections,
  onSave,
  loading,
  t,
}: {
  step: number;
  setStep: (step: number) => void;
  draft: FamilyRequest;
  setDraft: (draft: FamilyRequest) => void;
  enabledDirections: Direction[];
  onSave: () => void;
  loading: boolean;
  t: Translation;
}) {
  return (
    <section className="panel wizard">
      <StepIndicator labels={[t.familyStepFamily, t.familyStepNeeds, t.familyStepOffers, t.familyStepReview]} current={step} />
      <p className="privacy-copy">{t.familyWizardHelp}</p>
      {step === 0 ? (
        <div className="wizard-card">
          <label>
            {t.familyLabel}
            <input value={draft.displayLabel} onChange={(event) => setDraft({ ...draft, displayLabel: event.target.value })} />
          </label>
        </div>
      ) : null}
      {step === 1 ? (
        <RepeatingInputs
          title={t.children}
          items={draft.children}
          itemLabel={t.childLabel}
          t={t}
          enabledDirections={enabledDirections}
          onAdd={() =>
            setDraft({
              ...draft,
              children: [...draft.children, { label: "", directions: [enabledDirections[0] ?? "outbound"], seatType: "booster" }],
            })
          }
          onChange={(children) => setDraft({ ...draft, children })}
        />
      ) : null}
      {step === 2 ? (
        <RepeatingInputs
          title={t.offeredSeats}
          items={draft.seatOffers}
          itemLabel={t.seatLabel}
          t={t}
          enabledDirections={enabledDirections}
          onAdd={() =>
            setDraft({
              ...draft,
              seatOffers: [...draft.seatOffers, { label: "", directions: [enabledDirections[0] ?? "outbound"], seatType: "booster" }],
            })
          }
          onChange={(seatOffers) => setDraft({ ...draft, seatOffers })}
        />
      ) : null}
      {step === 3 ? (
        <div className="wizard-card review-card">
          <p>{t.reviewHelp}</p>
          <h2>{draft.displayLabel || t.familyLabel}</h2>
          <p>
            {draft.children.filter((child) => child.label).length} {t.children.toLowerCase()} ·{" "}
            {draft.seatOffers.filter((seat) => seat.label).length} {t.offeredSeats.toLowerCase()}
          </p>
        </div>
      ) : null}
      <div className="wizard-actions">
        <button className="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>
          {t.back}
        </button>
        {step < 3 ? (
          <button onClick={() => setStep(step + 1)}>{t.next}</button>
        ) : (
          <button onClick={onSave} disabled={loading}>
            {t.saveFamily}
          </button>
        )}
      </div>
    </section>
  );
}

function PlanningOverview({
  room,
  allocations,
  selectedChild,
  setSelectedChild,
  selectedCompatibleSeats,
  onAssign,
  onUnassign,
  onDeleteFamily,
  t,
}: {
  room: Room;
  allocations: ReturnType<typeof getChildAllocations>;
  selectedChild: { child: ChildNeed; direction: Direction } | null;
  setSelectedChild: (selection: { child: ChildNeed; direction: Direction } | null) => void;
  selectedCompatibleSeats: ReturnType<typeof getSeatAvailability>;
  onAssign: (childId: string, seatId: string, direction: Direction) => void;
  onUnassign: (assignmentId: string) => void;
  onDeleteFamily: (familyId: string) => void;
  t: Translation;
}) {
  return (
    <>
      <div className="allocation-step-guide" aria-label="Workflow guide">
        <span>{t.allocationStep1}</span>
        <span>{t.allocationStep2}</span>
      </div>
      <section className="allocation-grid">
        <div className="panel">
          <h2>{t.chooseNeed}</h2>
          {allocations.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">👶</span>
              <p>{t.noNeeds}</p>
              <p>{t.noFamiliesHint}</p>
            </div>
          ) : null}
          {allocations.map((item) => (
            <article className={`card status-${item.status}`} key={item.child.id}>
              <div>
                <h3>{item.child.label}</h3>
                <p>{item.family.displayLabel}</p>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                  <SeatBadge seatType={item.child.seatType} t={t} />
                  <StatusBadge status={item.status} t={t} />
                </div>
              </div>
              <div className="chip-row">
                {item.missingDirections.map((direction) => (
                  <button
                    className={`chip${selectedChild?.child.id === item.child.id && selectedChild.direction === direction ? " active-need" : ""}`}
                    key={direction}
                    onClick={() => setSelectedChild({ child: item.child, direction })}
                  >
                    {directionLabel(direction, room, t)}
                  </button>
                ))}
                {item.assignments.map((assignment) => (
                  <button className="chip muted" key={assignment.id} onClick={() => onUnassign(assignment.id)}>
                    {t.unassign} {directionLabel(assignment.direction, room, t)}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="panel">
          <h2>{t.chooseSeat}</h2>
          {!selectedChild ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">👆</span>
              <p>{t.noneOpen}</p>
            </div>
          ) : null}
          {selectedChild ? (
            <div className="selection-banner">
              {selectedChild.child.label} · {directionLabel(selectedChild.direction, room, t)}
            </div>
          ) : null}
          {selectedCompatibleSeats.map((item) => (
            <article className="card" key={`${item.seat.id}-${item.direction}`}>
              <div>
                <h3>{item.seat.label}</h3>
                <p>{item.family.displayLabel}</p>
                <SeatBadge seatType={item.seat.seatType} t={t} />
              </div>
              <button
                onClick={() =>
                  selectedChild ? onAssign(selectedChild.child.id, item.seat.id, selectedChild.direction) : undefined
                }
              >
                {t.assign}
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>{t.currentPlan}</h2>
        {room.families.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">🏠</span>
            <p>{t.noFamilies}</p>
          </div>
        ) : null}
        {room.families.map((family) => (
          <article className="family-row" key={family.id}>
            <div>
              <h3>{family.displayLabel}</h3>
              <p>
                {family.children.length} {t.children.toLowerCase()} · {family.seatOffers.length}{" "}
                {t.offeredSeats.toLowerCase()}
              </p>
            </div>
            <button
              className="danger"
              onClick={() => {
                if (window.confirm(`Remove ${family.displayLabel}?`)) {
                  onDeleteFamily(family.id);
                }
              }}
            >
              {t.deleteFamily}
            </button>
          </article>
        ))}
      </section>
    </>
  );
}

function RepeatingInputs<T extends { label: string; directions: Direction[]; seatType: SeatType; note?: string }>({
  title,
  items,
  itemLabel,
  t,
  enabledDirections,
  onAdd,
  onChange,
}: {
  title: string;
  items: T[];
  itemLabel: string;
  t: Translation;
  enabledDirections: Direction[];
  onAdd: () => void;
  onChange: (items: T[]) => void;
}) {
  return (
    <div className="subpanel">
      <div className="subpanel-heading">
        <h3>{title}</h3>
        <button className="secondary" type="button" onClick={onAdd}>
          +
        </button>
      </div>
      {items.map((item, index) => (
        <div className="form-card" key={index}>
          <label>
            {itemLabel}
            <input
              value={item.label}
              onChange={(event) => onChange(items.map((entry, i) => (i === index ? { ...entry, label: event.target.value } : entry)))}
            />
          </label>
          <label>
            {t.seatType}
            <select
              value={item.seatType}
              onChange={(event) =>
                onChange(items.map((entry, i) => (i === index ? { ...entry, seatType: event.target.value as SeatType } : entry)))
              }
            >
              {seatTypes.map((seatType) => (
                <option value={seatType} key={seatType}>
                  {seatTypeIcon(seatType)} {seatTypeLabel(seatType, t)}
                </option>
              ))}
            </select>
          </label>
          <div className="checkbox-row">
            {enabledDirections.map((direction) => (
              <label key={direction}>
                <input
                  type="checkbox"
                  checked={item.directions.includes(direction)}
                  onChange={(event) =>
                    onChange(
                      items.map((entry, i) =>
                        i === index
                          ? {
                              ...entry,
                              directions: event.target.checked
                                ? [...entry.directions, direction]
                                : entry.directions.filter((value) => value !== direction),
                            }
                          : entry,
                      ),
                    )
                  }
                />
                {t[direction]}
              </label>
            ))}
          </div>
          <label>
            {t.noteOptional}
            <input
              value={item.note ?? ""}
              onChange={(event) => onChange(items.map((entry, i) => (i === index ? { ...entry, note: event.target.value } : entry)))}
            />
          </label>
        </div>
      ))}
    </div>
  );
}

function StepIndicator({ labels, current }: { labels: string[]; current: number }) {
  return (
    <ol className="stepper">
      {labels.map((label, index) => (
        <li className={index === current ? "active" : index < current ? "done" : ""} key={label}>
          <span>{index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function Feedback({ error, notice, title }: { error: string; notice: string; title: string }) {
  if (!error && !notice) return null;
  return (
    <div className={error ? "feedback error" : "feedback"}>
      <strong>{error ? title : notice}</strong>
      {error ? <p>{error}</p> : null}
    </div>
  );
}

function directionLabel(direction: Direction, room: Room, t: Translation): string {
  return direction === "outbound" ? room.settings.outboundLabel || t.outbound : room.settings.inboundLabel || t.inbound;
}

function seatTypeLabel(seatType: SeatType, t: Translation): string {
  if (seatType === "front-facing") return t.frontFacing;
  if (seatType === "rear-facing") return t.rearFacing;
  return t[seatType];
}

function seatTypeIcon(seatType: SeatType): string {
  if (seatType === "rear-facing") return "⬅️";
  if (seatType === "front-facing") return "➡️";
  if (seatType === "booster") return "🪑";
  return "💺";
}

function SeatBadge({ seatType, t }: { seatType: SeatType; t: Translation }) {
  return (
    <span className="seat-badge">
      {seatTypeIcon(seatType)} {seatTypeLabel(seatType, t)}
    </span>
  );
}

function StatusBadge({ status, t }: { status: string; t: Translation }) {
  const emoji = status === "fully-allocated" ? "✅" : status === "partially-allocated" ? "⚠️" : "❌";
  const label =
    status === "fully-allocated" ? t.fullyAllocated : status === "partially-allocated" ? t.partiallyAllocated : t.unallocated;
  return <span className={`status-badge ${status}`}>{emoji} {label}</span>;
}
