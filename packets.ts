import { Message, ReadStreamer, WriteStreamer } from "./serializer.ts";
import { symbolCache } from "./symbolCache.ts";

import { SNSConfigFailurev2 } from "./messages/SNSConfigFailurev2.ts";
import { SNSConfigRequestv2 } from "./messages/SNSConfigRequestv2.ts";
import { SNSConfigSuccessv2 } from "./messages/SNSConfigSuccessv2.ts";
import { STcpConnectionUnrequireEvent } from "./messages/STcpConnectionUnrequireEvent.ts";
import { UnknownMessage } from "./messages/UnknownMessage.ts";

export const PACKET_HEADER = 0xbb8ce7a278bb40f6n;

export const symbolToMessage = (
  symbol: bigint,
): Message<any> => {
  switch (symbol) {
    case symbolCache["SNSConfigFailurev2"]:
      return new SNSConfigFailurev2();
    case symbolCache["SNSConfigRequestv2"]:
      return new SNSConfigRequestv2();
    case symbolCache["SNSConfigSuccessv2"]:
      return new SNSConfigSuccessv2();
    case symbolCache["STcpConnectionUnrequireEvent"]:
      return new STcpConnectionUnrequireEvent();
    default:
      return new UnknownMessage();
  }
};

export const serializeMessages = (
  messages: Message<any>[],
): Uint8Array => {
  const packetBuffers: Uint8Array[] = [];
  for (const message of messages) {
    const messageStreamer = new WriteStreamer();
    message.stream(messageStreamer);
    const messageBuffer = messageStreamer.getBuffer();
    const messageSize = messageBuffer.length;
    const packetStreamer = new WriteStreamer();
    packetStreamer.streamUint64(PACKET_HEADER);
    const symbol = message.getSymbol();
    packetStreamer.streamSint64(symbol);
    packetStreamer.streamUint64(BigInt(messageSize));
    packetStreamer.buffers.push(messageBuffer);
    packetBuffers.push(packetStreamer.getBuffer());
  }

  let offset = 0;
  for (const buffer of packetBuffers) {
    offset += buffer.length;
  }
  const outputBuffer = new Uint8Array(offset);
  offset = 0;
  for (const buffer of packetBuffers) {
    outputBuffer.set(buffer, offset);
    offset += buffer.length;
  }
  return outputBuffer;
};

export const deserializeMessages = (
  buffer: Uint8Array,
): Message<any>[] => {
  const messages: Message<any>[] = [];
  let offset = 0;
  let remainingBuffer = buffer;
  while (remainingBuffer.length > 0) {
    const packetStreamer = new ReadStreamer(remainingBuffer);
    const packetHeader = packetStreamer.streamUint64(0n);
    if (packetHeader !== PACKET_HEADER) {
      throw new Error(`Invalid packet header ${packetHeader}`);
    }
    const symbol = packetStreamer.streamSint64(0n);
    const messageSize = packetStreamer.streamUint64(0n);
    const messageBuffer = remainingBuffer.slice(
      packetStreamer.offset,
      packetStreamer.offset + Number(messageSize),
    );
    const messageStreamer = new ReadStreamer(messageBuffer);
    const message = symbolToMessage(symbol);
    message.stream(messageStreamer);
    messages.push(message);
    offset += packetStreamer.offset + Number(messageSize);
    remainingBuffer = buffer.slice(offset);
  }
  return messages;
};
