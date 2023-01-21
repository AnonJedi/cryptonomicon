const subscriptions = new Map();

window.subscriptions = subscriptions;

export function subscribeToTickerUpdate(tickerName, cb) {
  const callbacks = subscriptions.get(tickerName) ?? [];
  subscriptions.set(tickerName, [...callbacks, cb]);
}

export function unsubscribeFromTickerUpdate(tickerName, cb) {
  const callbacks = (subscriptions.get(tickerName) ?? []).filter(
    (c) => c !== cb
  );

  if (!callbacks.length) {
    subscriptions.delete(tickerName);
    return;
  }

  subscriptions.set(tickerName, callbacks);
}

function pollTickersPrices() {
  const tickerNames = [...subscriptions.keys()];

  if (!tickerNames.length) {
    return;
  }

  const urlParams = new URLSearchParams({
    fsyms: tickerNames.join(","),
    tsyms: "USD",
    api_key: process.env.VUE_APP_API_KEY,
  });

  return fetch(
    `https://min-api.cryptocompare.com/data/pricemulti?${urlParams.toString()}`
  )
    .then((res) => res.json())
    .then((pricesData) => {
      tickerNames.forEach((t) => {
        subscriptions.get(t).forEach((cb) => {
          cb(t, pricesData[t].USD);
        });
      });
    });
}

let POLLING_INTERVAL_ID;
const POLLING_INTERVAL_MS = 3000;

export function startPriceUpdating() {
  pollTickersPrices();
  POLLING_INTERVAL_ID = setInterval(pollTickersPrices, POLLING_INTERVAL_MS);
}

export function endPriceUpdating() {
  clearInterval(POLLING_INTERVAL_ID);
}
