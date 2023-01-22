import { INVALID_MESSAGE, SOCKET_IS_BUSY, SUCCESS_MESSAGE } from "./constants";

const AGGREGATE_MESSAGE_TYPE = "5";
const ERROR_TYPE = "500";
const TOO_MANY_SOCKETS_TYPE = "429";
const TOO_MANY_SOCKETS_MESSAGE = "TOO_MANY_SOCKETS_MAX_1_PER_CLIENT";
const INVALID_SUB_MESSAGE = "INVALID_SUB";

let socket;

export function establishConnection(cb) {
  const wsURL = new URL("wss://streamer.cryptocompare.com/v2");
  wsURL.searchParams.append("api_key", process.env.VUE_APP_API_KEY);

  socket = new WebSocket(wsURL);

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);

    const { TYPE: type, MESSAGE: message, PRICE: price } = data;

    if (
      type === TOO_MANY_SOCKETS_TYPE &&
      message === TOO_MANY_SOCKETS_MESSAGE
    ) {
      cb({
        type: SOCKET_IS_BUSY,
      });
      return;
    }

    if (type === AGGREGATE_MESSAGE_TYPE && price !== undefined) {
      const { FROMSYMBOL: fromSymbol, TOSYMBOL: toSymbol } = data;

      cb({
        fromSymbol,
        toSymbol,
        price,
        type: SUCCESS_MESSAGE,
      });
      return;
    }

    if (type === ERROR_TYPE && message === INVALID_SUB_MESSAGE) {
      const [fromSymbol, toSymbol] =
        data.PARAMETER.split("5~CCCAGG~")[1].split("~");

      cb({
        fromSymbol,
        toSymbol,
        type: INVALID_MESSAGE,
      });
    }
  });
}

function sendMessageToWebSocket(message) {
  if (!socket) {
    return false;
  }

  const stringifiedMessage = JSON.stringify(message);

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifiedMessage);
    return;
  }

  socket.addEventListener(
    "open",
    () => {
      socket.send(stringifiedMessage);
    },
    {
      once: true,
    }
  );
}

function generateMessage(action, fromSymbols, toSymbol) {
  return {
    action: action,
    subs: fromSymbols.map((s) => `5~CCCAGG~${s}~${toSymbol}`),
  };
}

export function addSubscriptionToSymbols(fromSymbols, toSymbol) {
  sendMessageToWebSocket(generateMessage("SubAdd", fromSymbols, toSymbol));
}

export function removeSubscriptionToSymbols(fromSymbols, toSymbol) {
  sendMessageToWebSocket(generateMessage("SubRemove", fromSymbols, toSymbol));
}

export function closeConnection() {
  socket?.close();
}

export function getListOfAvailableSymbols() {
  const params = new URLSearchParams({
    api_key: process.env.VUE_APP_API_KEY,
  });

  return fetch(
    `https://min-api.cryptocompare.com/data/all/coinlist?${params.toString()}`
  )
    .then((res) => res.json())
    .then(({ Data }) => Data);
}
