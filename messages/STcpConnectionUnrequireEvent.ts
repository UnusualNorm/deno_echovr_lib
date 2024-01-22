import { Message, Streamer } from "../serializer.ts";

export class STcpConnectionUnrequireEvent extends Message<{
  unused: number;
}> {
  public defaultInit(): void {
    this.data = {
      unused: 0,
    };
  }

  stream(streamer: Streamer) {
    this.data.unused = streamer.streamUint8(this.data.unused);
  }
}
