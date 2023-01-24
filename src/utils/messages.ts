import { Alert, Train } from "@prisma/client";
import { format, startOfHour } from "date-fns";
import fr from "date-fns/locale/fr/index.js";
import { AlertWithTrains } from "../api/prisma.js";
import { getStationLabel } from "../api/stations.js";

const plural = (v: number, s?: string) => (v > 1 ? s || "s" : "");

export const welcomeMessage = `👋 Salut ! Je suis MaxPing, je suis là pour trouver automatiquement les nouveaux trains maxables.
Commencez dès maintenant en utilisant /register_alert pour créer votre première alerte !`;

export const alertSkeleton = (
  origin = "<i>Gare de départ</i>",
  destination = "<i>Gare d'arrivée</i>",
  date = "<i>date</i>",
  trainCount?: number
) =>
  `🚄 ${origin} ➡️ ${destination}
📅 Jour : ${date}` +
  (typeof trainCount === "number"
    ? `\n🔎 ${trainCount} train${plural(trainCount)} disponible${plural(
        trainCount
      )}`
    : "");

export const trainSkeleton = (train: Train) => `🚄 ${train.equipment} ${
  train.number
}
🕑 Départ ${format(train.departure, "HH:mm")} - Arrivée ${format(
  train.arrival,
  "HH:mm"
)}
💻 <a href="https://www.sncf-connect.com/app/fr-FR/redirect?redirection_type=SEARCH&origin_transporter_code=${
  train.originId
}&destination_transporter_code=${train.destinationId}&outward_date=${format(
  startOfHour(train.departure),
  "yyyy-MM-dd-HH-mm"
)}">Réserver le train sur SNCF Connect</a>`;

export const createAlertStep1 = `🆕 Une nouvelle alerte !
Pour commencer, précisez-moi la gare de départ de l'alerte.
<i>Il me faut le code résarail, en 5 lettres (FRXXX)</i>

${alertSkeleton("<i><b>Gare de départ</b></i>")}`;

export const createAlertStep2 = (
  alert: Partial<Alert>
) => `✏️ C'est noté pour ${alert.origin} !
Où va-t-on ? Dites-moi !
<i>Il me faut le code résarail, en 5 lettres (FRXXX)</i>

${alertSkeleton(
  getStationLabel(alert.origin),
  "<i><b>Gare d'arrivée</b></i>"
)}`;

export const createAlertStep3 = (
  alert: Partial<Alert>
) => `🗒️ Notre itinéraire est fait !
Quel jour voulez-vous surveiller ?

${alertSkeleton(
  getStationLabel(alert.origin),
  getStationLabel(alert.destination)
)}`;

export const trainsPending = "⏳ Je cherche les trains Max...";

export const createAlertStep4 = (
  alert: Partial<Alert>,
  trainCount: number
) => `✅ C'est tout bon !
J'ai trouvé ${trainCount} train${plural(
  trainCount
)}, si jamais un nouveau train apparaît, vous serez notifié.

${alertSkeleton(
  getStationLabel(alert.origin),
  getStationLabel(alert.destination),
  alert.date?.toLocaleDateString("fr")
)}`;

export const viewAlerts = (alerts: AlertWithTrains[]) => `📑 Voici vos alertes

${
  alerts.length > 0
    ? alerts
        .map(
          (alert, index) =>
            `🔔 Alerte n°${index + 1}
${alertSkeleton(
  getStationLabel(alert.origin),
  getStationLabel(alert.destination),
  alert.date.toLocaleDateString("fr"),
  alert.trains.length
)}`
        )
        .join("\n\n")
    : "Aucune alerte enregistrée ! Commencez avec /register_alert"
}
  
<i>Utilisez /show_alert pour voir les trains liés à chaque alerte et supprimer des alertes</i>`;

// At least one train
export const trainAlert = (trains: [Train, ...Train[]], alert: Alert) =>
  `❗ ${trains.length} nouveau${plural(trains.length, "x")} train${plural(
    trains.length
  )} <b>${getStationLabel(alert.origin)} ➡️ ${getStationLabel(
    alert.destination
  )}</b> pour le <b>${format(alert.date, "d MMMM", { locale: fr })}</b> !

${trains.map(trainSkeleton).join("\n\n")}`;

export const showAlert = (
  alert: AlertWithTrains,
  index = 1
) => `🔔 Alerte n°${index}
${alertSkeleton(
  getStationLabel(alert.origin),
  getStationLabel(alert.destination),
  alert.date.toLocaleDateString("fr"),
  alert.trains.length
)}

${alert.trains.map(trainSkeleton).join("\n\n")}`;
