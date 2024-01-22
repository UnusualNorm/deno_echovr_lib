import { Message, Streamer } from "../serializer.ts";

export class UnknownMessage extends Message<Record<string, never>> {
  public defaultInit(): void {
    this.data = {};
  }

  stream(_streamer: Streamer) {
  }
}
