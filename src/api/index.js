const AGGREGATE_MESSAGE_TYPE = "5";

const subscriptions = new Map();
let socket;

export function startPriceUpdating() {
  const wsURL = new URL("wss://streamer.cryptocompare.com/v2");
  wsURL.searchParams.append("api_key", process.env.VUE_APP_API_KEY);

  socket = new WebSocket(wsURL);

  socket.addEventListener(
    "open",
    () => {
      const tickerNames = [...subscriptions.keys()];
      socket?.send(
        JSON.stringify({
          action: "SubAdd",
          subs: tickerNames.map((t) => `5~CCCAGG~${t}~USD`),
        })
      );
    },
    {
      once: true,
    }
  );

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);

    const { FROMSYMBOL: ticker, PRICE: price, TYPE: type } = data;

    if (type !== AGGREGATE_MESSAGE_TYPE || !price) {
      return;
    }
    subscriptions.get(ticker)?.forEach((cb) => cb(ticker, price));
  });
}

export function subscribeToTickerUpdate(tickerName, cb) {
  socket?.send(
    JSON.stringify({
      action: "SubAdd",
      subs: [`5~CCCAGG~${tickerName}~USD`],
    })
  );

  const callbacks = subscriptions.get(tickerName) ?? [];
  subscriptions.set(tickerName, [...callbacks, cb]);
}

export function unsubscribeFromTickerUpdate(tickerName, cb) {
  socket?.send(
    JSON.stringify({
      action: "SubRemove",
      subs: [`5~CCCAGG~${tickerName}~USD`],
    })
  );

  const callbacks = (subscriptions.get(tickerName) ?? []).filter(
    (c) => c !== cb
  );

  if (!callbacks.length) {
    subscriptions.delete(tickerName);
    return;
  }

  subscriptions.set(tickerName, callbacks);
}

export function endPriceUpdating() {
  socket?.close();
}

export function getListOfAvailableCoins() {
  const params = new URLSearchParams({
    api_key: process.env.VUE_APP_API_KEY,
  });

  return fetch(
    `https://min-api.cryptocompare.com/data/all/coinlist?${params.toString()}`
  )
    .then((res) => res.json())
    .then(({ Data }) => Data);
}
