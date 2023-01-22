let channel;

export function connectToChannel() {
  channel = new BroadcastChannel(process.env.VUE_APP_BROADCAST_CHANNEL_NAME);
}

export function sendDataToChannel(data) {
  channel?.postMessage(JSON.stringify(data));
}

export function subscribeToChannelMessage(cb) {
  if (!channel) {
    return false;
  }

  channel.onmessage = (event) => {
    cb(JSON.parse(event.data));
  };

  return true;
}

export function disconnectFromChannel() {
  channel?.close();
}
