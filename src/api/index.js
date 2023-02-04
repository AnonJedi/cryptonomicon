import {
  connectToChannel,
  disconnectFromChannel,
  sendDataToChannel,
  subscribeToChannelMessage,
} from "./broadcast-data";
import { INVALID_MESSAGE, SOCKET_IS_BUSY, SUCCESS_MESSAGE } from "./constants";
import {
  addSubscriptionToSymbols,
  closeConnection,
  establishConnection,
  removeSubscriptionToSymbols,
} from "./transport";

const REFERENCE_SYMBOL = "BTC";
const USD_SYMBOL = "USD";
let REFERENCE_PRICE;

const subscriptions = new Map();

subscriptions.set(REFERENCE_SYMBOL, [
  (_, price) => {
    REFERENCE_PRICE = price;
  },
]);

export function subscribeToTickerUpdate(tickerName, cb) {
  addSubscriptionToSymbols([tickerName], USD_SYMBOL);

  const callbacks = subscriptions.get(tickerName) ?? [];
  subscriptions.set(tickerName, [...callbacks, cb]);
}

export function unsubscribeFromTickerUpdate(tickerName, cb) {
  removeSubscriptionToSymbols([tickerName], USD_SYMBOL);

  const callbacks = (subscriptions.get(tickerName) ?? []).filter(
    (c) => c !== cb
  );

  if (!callbacks.length) {
    subscriptions.delete(tickerName);
    return;
  }

  subscriptions.set(tickerName, callbacks);
}

function handlePrice({ fromSymbol, toSymbol, price, type }) {
  if (type === SOCKET_IS_BUSY) {
    subscribeToChannelMessage(handlePrice);
    return;
  }

  sendDataToChannel({ fromSymbol, toSymbol, price, type });

  if (type === SUCCESS_MESSAGE) {
    let finalPrice = price;

    if (toSymbol === REFERENCE_SYMBOL && REFERENCE_PRICE !== undefined) {
      finalPrice = price * REFERENCE_PRICE;
    }

    subscriptions.get(fromSymbol)?.forEach((cb) => cb(fromSymbol, finalPrice));
    return;
  }

  if (type === INVALID_MESSAGE) {
    if (toSymbol === REFERENCE_SYMBOL) {
      subscriptions
        .get(fromSymbol)
        ?.forEach((cb) => cb(fromSymbol, undefined, true));
      return;
    }

    if (toSymbol === USD_SYMBOL) {
      addSubscriptionToSymbols([fromSymbol], REFERENCE_SYMBOL);
    }
  }
}

export function startUpdatingPrices() {
  establishConnection(handlePrice);
  addSubscriptionToSymbols([...subscriptions.keys()], USD_SYMBOL);
  connectToChannel();
}

export function stopUpdatingPrices() {
  closeConnection();
  disconnectFromChannel();
}

export { getListOfCoins } from "./transport";
