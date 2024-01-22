import { z } from "../deps.ts";
import { Streamer } from "../serializer.ts";
import { Message } from "../serializer.ts";

interface ErrorInfo {
  type: string;
  id: string;
  errorcode: number;
  error: string;
}

const errorInfoSchema = z.object({
  type: z.string(),
  id: z.string(),
  errorcode: z.number(),
  error: z.string(),
}).strict();

export class SNSConfigFailurev2 extends Message<{
  typeSymbol: bigint;
  idSymbol: bigint;
  errorInfo: ErrorInfo;
}> {
  public defaultInit(): void {
    this.data = {
      typeSymbol: 0xffffffffffffffffn,
      idSymbol: 0xffffffffffffffffn,
      errorInfo: {
        type: "",
        id: "",
        errorcode: 0,
        error: "",
      },
    };
  }

  stream(streamer: Streamer) {
    this.data.typeSymbol = streamer.streamUint64(this.data.typeSymbol);
    this.data.idSymbol = streamer.streamUint64(this.data.idSymbol);
    this.data.errorInfo = streamer.streamNullTerminatedJson(
      this.data.errorInfo,
      errorInfoSchema,
    );
  }
}
