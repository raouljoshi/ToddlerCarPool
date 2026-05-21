export type Language = "en" | "sv";

const en = {
  appName: "ToddlerCarPool",
  brandTagline: "A calm shared room for one trip",
  introHeadline: "Plan a toddler carpool together",
  introBody:
    "Create a room and share the code. Parents add their car or child, then anyone can match children to available seats.",
  privacyNudge: "Use nicknames or display labels. Coordinate phone, address, and contact details outside the app.",
  retentionNote: "Rooms are removed from the live app 30 days after they are created.",

  /* Landing actions */
  startNewRoomTitle: "Create a room",
  startNewRoomBody: "Set the event details, choose which trips to plan, and share the code with your group.",
  startNewRoomCta: "Create a room",
  joinRoomTitle: "I have a room code",
  joinRoomBody: "Enter the code your organizer shared with you to join the planning.",
  joinRoomCta: "Join room",
  roomCode: "Room code",

  /* Organizer wizard */
  organizerWizardTitle: "Create a room",
  setupStepEvent: "Event",
  setupStepOutbound: "Outbound",
  setupStepInbound: "Inbound",
  setupStepReview: "Review",
  eventName: "Event name",
  eventInfo: "Information everyone should see",
  mapLink: "Google Maps link",
  mapLinkOpen: "Open in Google Maps",
  outbound: "Outbound",
  inbound: "Inbound",
  outboundLabel: "Outbound",
  inboundLabel: "Inbound",
  enableOutbound: "Plan the trip there",
  enableInbound: "Plan the trip home",
  time: "Time",
  timeReference: "Time refers to",
  timeReferenceDeparture: "Departure",
  timeReferenceArrival: "Arrival at destination",
  directionInfo: "Notes for this direction",
  reviewIntro: "Check the details and create the room.",
  createRoom: "Create room",

  /* Sharing */
  roomCreated: "Room created",
  copyCode: "Copy code",
  copyLink: "Copy link",
  codeCopied: "Code copied",
  linkCopied: "Link copied",
  expires: "Removed from app on",
  refresh: "Refresh",

  /* Overview */
  overviewHeading: "Overview",
  queueHeading: "Children waiting for a ride",
  queueEmpty: "No children are waiting. Add one with the + button.",
  driversHeading: "Cars and riders",
  driversEmpty: "No cars yet. Add one with the + button.",
  noCompatibleDriver: "No compatible driver for this direction yet.",

  /* + sheet */
  addVehicle: "Add a car",
  addChild: "Add a child to the queue",
  cancel: "Cancel",

  /* Vehicle wizard */
  vehicleWizardTitle: "Add a car",
  vehicleStepDriver: "Driver",
  vehicleStepSeats: "Seats",
  vehicleStepDirections: "Trips",
  vehicleStepLending: "Extras",
  vehicleStepReview: "Review",
  driverName: "Driver name",
  driverNameHint: "Use a first name or nickname.",
  seatCount: "Number of seats",
  seatCountHint: "Not including the driver's seat. Maximum 9.",
  reserveSeatHint: "Tap a seat to reserve it for one of your own children. Tap again to clear.",
  reservedRiderName: "Rider name",
  pickDirectionsVehicle: "Which trips can this car serve?",
  pickLending:
    "Do you have extra child seats you can lend to other riders in your car? Tick whatever you can bring.",
  lendsBooster: "Spare booster seat",
  lendsRearFacing: "Spare rear-facing seat",
  lendsFrontFacing: "Spare front-facing seat",
  saveVehicle: "Add this car",

  /* Child wizard */
  childWizardTitle: "Add a child",
  childStepName: "Name",
  childStepDirections: "Trips",
  childStepBorrow: "Borrow",
  childStepReview: "Review",
  childName: "Child name",
  pickDirectionsChild: "Which trips does this child need?",
  pickBorrow:
    "Does this child need to borrow a child seat? Tick the type they need. Leave unticked if they bring their own.",
  borrowBooster: "Needs to borrow a booster",
  borrowRearFacing: "Needs to borrow a rear-facing seat",
  borrowFrontFacing: "Needs to borrow a front-facing seat",
  saveChild: "Add to queue",

  /* Allocate */
  allocateTitle: "Find a ride",
  allocateForDirection: "Pick a driver for {direction}",
  allocateNoCandidates: "No compatible driver for {direction} yet. Add a car or adjust borrow needs.",
  allocateConfirm: "Confirm",
  allocateSameDriverInbound: "Use {driver} for the inbound trip too",
  allocateSameDriverOutbound: "Use {driver} for the outbound trip too",
  back: "Back",
  next: "Next",

  /* Driver group */
  driverEditCta: "Edit",
  driverDeleteCta: "Delete car",
  driverDeleteConfirm: "Delete {driver}? Reserved children will move to the queue.",
  driverHasAssignments: "Move riders to the queue before editing.",
  childEditCta: "Edit",
  childMoveToQueueCta: "Move to queue",

  /* Borrow / lending pills */
  needsBooster: "Booster",
  needsRearFacing: "Rear-facing",
  needsFrontFacing: "Front-facing",

  /* Direction review */
  directionPlanned: "Planned",

  /* Errors */
  errorTitle: "Something needs attention",
  unexpectedError: "Unexpected error. Try again in a moment.",
} as const;

export type TranslationKey = keyof typeof en;
export type Translation = Record<TranslationKey, string>;

const sv: Translation = {
  appName: "ToddlerCarPool",
  brandTagline: "Ett lugnt delat rum för en resa",
  introHeadline: "Planera en småbarnssamåkning tillsammans",
  introBody:
    "Skapa ett rum och dela koden. Föräldrar lägger till sin bil eller sitt barn, sen kan vem som helst matcha barn till lediga platser.",
  privacyNudge: "Använd smeknamn eller visningsnamn. Samordna telefon, adress och kontaktuppgifter utanför appen.",
  retentionNote: "Rum tas bort från appen 30 dagar efter att de skapats.",

  startNewRoomTitle: "Skapa ett rum",
  startNewRoomBody: "Sätt händelsedetaljer, välj vilka resor som ska planeras och dela koden.",
  startNewRoomCta: "Skapa rum",
  joinRoomTitle: "Jag har en rumskod",
  joinRoomBody: "Skriv koden som organisatören delade för att gå med i planeringen.",
  joinRoomCta: "Gå med",
  roomCode: "Rumskod",

  organizerWizardTitle: "Skapa ett rum",
  setupStepEvent: "Händelse",
  setupStepOutbound: "Utresa",
  setupStepInbound: "Hemresa",
  setupStepReview: "Granska",
  eventName: "Händelsens namn",
  eventInfo: "Information som alla ska se",
  mapLink: "Google Maps-länk",
  mapLinkOpen: "Öppna i Google Maps",
  outbound: "Utresa",
  inbound: "Hemresa",
  outboundLabel: "Utresa",
  inboundLabel: "Hemresa",
  enableOutbound: "Planera resan dit",
  enableInbound: "Planera resan hem",
  time: "Tid",
  timeReference: "Tiden gäller",
  timeReferenceDeparture: "Avresa",
  timeReferenceArrival: "Framme på platsen",
  directionInfo: "Noteringar för den här resan",
  reviewIntro: "Kontrollera detaljerna och skapa rummet.",
  createRoom: "Skapa rum",

  roomCreated: "Rum skapat",
  copyCode: "Kopiera kod",
  copyLink: "Kopiera länk",
  codeCopied: "Kod kopierad",
  linkCopied: "Länk kopierad",
  expires: "Tas bort från appen den",
  refresh: "Uppdatera",

  overviewHeading: "Översikt",
  queueHeading: "Barn som väntar på skjuts",
  queueEmpty: "Inga barn väntar. Lägg till med +-knappen.",
  driversHeading: "Bilar och passagerare",
  driversEmpty: "Inga bilar än. Lägg till med +-knappen.",
  noCompatibleDriver: "Ingen passande förare ännu.",

  addVehicle: "Lägg till en bil",
  addChild: "Lägg till ett barn i kön",
  cancel: "Avbryt",

  vehicleWizardTitle: "Lägg till en bil",
  vehicleStepDriver: "Förare",
  vehicleStepSeats: "Platser",
  vehicleStepDirections: "Resor",
  vehicleStepLending: "Utrustning",
  vehicleStepReview: "Granska",
  driverName: "Förarens namn",
  driverNameHint: "Använd ett förnamn eller smeknamn.",
  seatCount: "Antal platser",
  seatCountHint: "Räkna inte med förarens egen plats. Max 9.",
  reserveSeatHint: "Tryck på en plats för att reservera den åt ett av dina egna barn. Tryck igen för att rensa.",
  reservedRiderName: "Passagerarens namn",
  pickDirectionsVehicle: "Vilka resor kan bilen köra?",
  pickLending:
    "Har du extra bilbarnstolar du kan låna ut till andra passagerare? Bocka i det du kan ta med.",
  lendsBooster: "Extra bälteskudde",
  lendsRearFacing: "Extra bakåtvänd stol",
  lendsFrontFacing: "Extra framåtvänd stol",
  saveVehicle: "Lägg till bilen",

  childWizardTitle: "Lägg till ett barn",
  childStepName: "Namn",
  childStepDirections: "Resor",
  childStepBorrow: "Låna",
  childStepReview: "Granska",
  childName: "Barnets namn",
  pickDirectionsChild: "Vilka resor behöver barnet?",
  pickBorrow:
    "Behöver barnet låna en bilbarnstol? Bocka i vilken typ. Lämna tomt om barnet tar med sin egen.",
  borrowBooster: "Behöver låna bälteskudde",
  borrowRearFacing: "Behöver låna bakåtvänd stol",
  borrowFrontFacing: "Behöver låna framåtvänd stol",
  saveChild: "Lägg till i kön",

  allocateTitle: "Hitta en skjuts",
  allocateForDirection: "Välj förare för {direction}",
  allocateNoCandidates: "Ingen passande förare för {direction}. Lägg till en bil eller justera lånebehov.",
  allocateConfirm: "Bekräfta",
  allocateSameDriverInbound: "Använd {driver} även för hemresan",
  allocateSameDriverOutbound: "Använd {driver} även för utresan",
  back: "Tillbaka",
  next: "Nästa",

  driverEditCta: "Redigera",
  driverDeleteCta: "Ta bort bil",
  driverDeleteConfirm: "Ta bort {driver}? Reserverade barn flyttas till kön.",
  driverHasAssignments: "Flytta passagerare till kön innan du redigerar.",
  childEditCta: "Redigera",
  childMoveToQueueCta: "Flytta till kön",

  needsBooster: "Bälteskudde",
  needsRearFacing: "Bakåtvänd",
  needsFrontFacing: "Framåtvänd",

  directionPlanned: "Planerad",

  errorTitle: "Något behöver åtgärdas",
  unexpectedError: "Oväntat fel. Försök igen om en stund.",
};

export const translations: Record<Language, Translation> = { en, sv };

export function getInitialLanguage(): Language {
  const saved = localStorage.getItem("toddler-carpool-language");
  if (saved === "en" || saved === "sv") return saved;
  return navigator.language.toLowerCase().startsWith("sv") ? "sv" : "en";
}

export function saveLanguage(language: Language): void {
  localStorage.setItem("toddler-carpool-language", language);
}

export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);
}
