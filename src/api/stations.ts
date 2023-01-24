import stations from "../static/stations.json" assert { type: "json" };

export function getStations(query: string) {
  const q = query.trim().toLowerCase();
  return stations.stations
    .filter((s) => {
      return s.station.toLowerCase().indexOf(q) !== -1;
    })
    .slice(0, 50); // Telegram allows only 50 results
}

export function getStationLabel(rrCode?: string) {
  return (
    stations.stations.find((s) => s.codeStation === rrCode)?.station ?? rrCode
  );
}
