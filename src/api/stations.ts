import stations from "../static/stations.json" assert { type: "json" };

export const availableStationsCodes = stations.stations.map(
  (s) => s.codeStation
);

export function getStations(query: string) {
  const q = query.trim().toLowerCase();
  return stations.stations.filter((s) => {
    return s.station.toLowerCase().indexOf(q) !== -1;
  });
}

export function getStationLabel(rrCode?: string) {
  return (
    stations.stations.find((s) => s.codeStation === rrCode)?.station ??
    rrCode ??
    ""
  );
}
