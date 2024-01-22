import { Message } from "./serializer.ts";
import { deserializeMessages, serializeMessages } from "./packets.ts";
import { STcpConnectionUnrequireEvent } from "./messages/STcpConnectionUnrequireEvent.ts";

export const wrapWebsocket = (
  ws: WebSocket,
  onmessage: (data: any) => void | Promise<void>,
): {
  sendMessage: (message: Message<any>) => void;
  setRealtime: (realtime: boolean) => void;
} => {
  const sendMessages = (messages: Message<any>[]) => {
    const buffer = serializeMessages(messages);
    ws.send(buffer);
  };

  let realtime = true;
  let collecting = false;
  let collectedMessages: Message<any>[] = [];
  const flushCollectedMessages = () => {
    if (!collecting) return;
    collecting = false;
    const messages = [
      ...collectedMessages,
    ].concat(realtime ? [new STcpConnectionUnrequireEvent()] : []);
    collectedMessages = [];
    sendMessages(messages);
  };

  ws.binaryType = "arraybuffer";
  ws.onmessage = async (event) => {
    if (!(event.data instanceof ArrayBuffer)) return;

    const buffer = new Uint8Array(event.data);
    try {
      const messages = deserializeMessages(buffer);

      collecting = true;
      for (const message of messages) {
        await onmessage(message);
      }
      flushCollectedMessages();
    } catch (error) {
      console.error(error);
    }
  };

  return {
    sendMessage: (message: Message<any>) => {
      if (collecting) {
        collectedMessages.push(message);
      } else {
        sendMessages([
          message,
        ].concat(realtime ? [new STcpConnectionUnrequireEvent()] : []));
      }
    },
    setRealtime: (newRealtime: boolean) => realtime = newRealtime,
  };
};
