import { Message, Streamer } from "../serializer.ts";

export class SNSConfigSuccessv2 extends Message<{
  typeSymbol: bigint;
  idSymbol: bigint;
  config: any;
}> {
  public defaultInit(): void {
    this.data = {
      typeSymbol: 0xffffffffffffffffn,
      idSymbol: 0xffffffffffffffffn,
      config: {},
    };
  }

  stream(streamer: Streamer) {
    this.data.typeSymbol = streamer.streamUint64(this.data.typeSymbol);
    this.data.idSymbol = streamer.streamUint64(this.data.idSymbol);
    this.data.config = streamer.streamZstdCompressedFrame((streamer) => {
      streamer.streamNullTerminatedJson(this.data.config);
    });
  }
}
