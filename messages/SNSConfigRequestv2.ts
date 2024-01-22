import { z } from "../deps.ts";
import { Message, Streamer } from "../serializer.ts";

interface ConfigInfo {
  type: string;
  id: string;
}

const configInfoSchema = z.object({
  type: z.string(),
  id: z.string(),
}).strict();

export class SNSConfigRequestv2 extends Message<{
  typeSymbolTail: number;
  configInfo: ConfigInfo;
}> {
  public defaultInit(): void {
    this.data = {
      typeSymbolTail: 0,
      configInfo: {
        type: "",
        id: "",
      },
    };
  }

  public stream(streamer: Streamer): void {
    this.data.typeSymbolTail = streamer.streamUint8(this.data.typeSymbolTail);
    this.data.configInfo = streamer.streamNullTerminatedJson(
      this.data.configInfo,
      configInfoSchema,
    );
  }
}
