import { format, startOfHour } from "date-fns";
import fr from "date-fns/locale/fr/index.js";
import { AlertWithTrains, AlertWithItinerary } from "../api/prisma.js";
import { getStationLabel } from "../api/stations.js";
import { MaxPlannerError } from "./errors.js";
import { Itinerary, Train } from "@prisma/client";

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

export const trainSkeleton = (train: Train, itinerary: Itinerary) => `🚄 ${
  train.equipment
} ${train.number}
🕑 Départ ${format(train.departure, "HH:mm")} - Arrivée ${format(
  train.arrival,
  "HH:mm"
)}
💻 <a href="https://www.sncf-connect.com/app/fr-FR/redirect?redirection_type=SEARCH&origin_transporter_code=${
  itinerary.originId
}&destination_transporter_code=${itinerary.destinationId}&outward_date=${format(
  startOfHour(train.departure),
  "yyyy-MM-dd-HH-mm"
)}">Réserver le train sur SNCF Connect</a>`;

export const createAlertStep1 = `🆕 Une nouvelle alerte !
Pour commencer, précisez-moi la gare de départ de l'alerte.
<i>Il me faut le code résarail, en 5 lettres (FRXXX)</i>

${alertSkeleton("<i><b>Gare de départ</b></i>")}`;

export const createAlertStep2 = (
  origin: string
) => `✏️ C'est noté pour ${getStationLabel(origin)} !
Où va-t-on ? Dites-moi !
<i>Il me faut le code résarail, en 5 lettres (FRXXX)</i>

${alertSkeleton(getStationLabel(origin), "<i><b>Gare d'arrivée</b></i>")}`;

export const createAlertStep3 = (
  origin: string,
  destination: string
) => `🗒️ Notre itinéraire est fait !
Quel jour voulez-vous surveiller ?

${alertSkeleton(getStationLabel(origin), getStationLabel(destination))}`;

export const cancelMessage = "🚫 La création d'alerte a été annulée";

export const alertErrorMessage = (err: MaxPlannerError) =>
  `⚠️ Le serveur SNCF a retourné un résultat inattendu

<pre>${err.code}:${err.message}</pre>

<i>${cancelMessage}, merci de réesayer ultérieurement, ou contactez @leonekmi pour support.</i>`;

export const noTrainsMessage = `🧭 Il n'existe aucune connexion entre ces 2 gares à cette date.

• Seuls les Intercités À Réservation Obligatoire (Intercités ARO), TGV INOUI et les trains OUIGO (à partir du 10 mai 2023) sont éligibles avec l'abonnement MAX JEUNE / SENIOR.
• Vérifiez sur une application de réservation que votre itinéraire est possible sans correspondances, <i>MaxPing ne gère pas les correspondances</i>.

<i>${cancelMessage}, recommencez avec /register_alert</i>`;

export const trainsPending = "⏳ Je cherche les trains Max...";

export const createAlertStep4 = (
  alert: Partial<AlertWithItinerary>,
  trainCount: number
) => `✅ C'est tout bon !
J'ai trouvé ${trainCount} train${plural(
  trainCount
)}, si jamais un nouveau train apparaît, vous serez notifié.

${alertSkeleton(
  getStationLabel(alert.itinerary?.originId),
  getStationLabel(alert.itinerary?.destinationId),
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
  getStationLabel(alert.itinerary?.originId),
  getStationLabel(alert.itinerary?.destinationId),
  alert.date.toLocaleDateString("fr"),
  alert.itinerary.trains.length
)}`
        )
        .join("\n\n")
    : "Aucune alerte enregistrée ! Commencez avec /register_alert"
}`;

// At least one train
export const trainAlert = (
  trains: [Train, ...Train[]],
  alert: AlertWithItinerary
) =>
  `❗ ${trains.length} nouveau${plural(trains.length, "x")} train${plural(
    trains.length
  )} <b>${getStationLabel(alert.itinerary.originId)} ➡️ ${getStationLabel(
    alert.itinerary.destinationId
  )}</b> pour le <b>${format(alert.date, "d MMMM", { locale: fr })}</b> !

${trains.map((train) => trainSkeleton(train, alert.itinerary)).join("\n\n")}`;

export const showAlert = (
  alert: AlertWithTrains,
  index = 1
) => `🔔 Alerte n°${index}
${alertSkeleton(
  getStationLabel(alert.itinerary.originId),
  getStationLabel(alert.itinerary.destinationId),
  alert.date.toLocaleDateString("fr"),
  alert.itinerary.trains.length
)}

${alert.itinerary.trains
  .map((train) => trainSkeleton(train, alert.itinerary))
  .join("\n\n")}`;

export const deletionAlert = (
  alert: AlertWithItinerary
) => `🧭 Une alerte a été supprimée, car elle ne comprend aucun itinéraire possible.

${alertSkeleton(
  getStationLabel(alert.itinerary.originId),
  getStationLabel(alert.itinerary.destinationId),
  alert.date.toLocaleDateString("fr"),
  0
)}

• Seuls les Intercités À Réservation Obligatoire (Intercités ARO), TGV INOUI et les trains OUIGO (à partir du 10 mai 2023) sont éligibles avec l'abonnement MAX JEUNE / SENIOR.
• Vérifiez sur une application de réservation que votre itinéraire est possible sans correspondances, <i>MaxPing ne gère pas les correspondances</i>.

<i>MaxPing est désormais capable de détecter un itinéraire qui ne comprend aucun train éligible et prévenir l'utilisateur si tel est le cas. Si vous pensez que cette détection est erronée, merci de contacter @leonekmi avec une copie de ce message.</i>`;
