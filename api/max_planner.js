import got from 'got';
const client = got.extend({
    headers: {
        'x-client-app': 'MAX_JEUNE',
        'x-client-app-version': '1.31.1',
        'x-distribution-channel': 'TRAINLINE',
        'x-syg-correlation-id': '24c77428-858e-43b4-a90c-76cd35d16917',
        'Accept': 'application/json'
    }
});
const endpointGetTrains = 'https://www.maxjeune-tgvinoui.sncf/api/public/refdata/search-freeplaces-proposals';
export function getMaxableTrains(origin, destination, dateTime) {
    return client.post(endpointGetTrains, {
        json: {
            departureDateTime: dateTime.toISOString().slice(0, -5),
            destination,
            origin,
        },
        responseType: 'json'
    }).json();
}
