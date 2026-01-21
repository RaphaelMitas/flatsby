declare module "@ungap/structured-clone" {
  const structuredClone: <T>(
    value: T,
    options?: StructuredSerializeOptions,
  ) => T;
  export default structuredClone;
}

declare module "react-native/Libraries/Utilities/PolyfillFunctions" {
  export function polyfillGlobal(name: string, getValue: () => unknown): void;
}

declare module "@stardazed/streams-text-encoding" {
  export class TextEncoderStream extends TransformStream<string, Uint8Array> {
    readonly encoding: string;
  }
  export class TextDecoderStream extends TransformStream<BufferSource, string> {
    readonly encoding: string;
    readonly fatal: boolean;
    readonly ignoreBOM: boolean;
  }
}

declare module "web-streams-polyfill" {
  export class ReadableStream<R = unknown> {
    constructor(
      underlyingSource?: UnderlyingSource<R>,
      strategy?: QueuingStrategy<R>,
    );
    readonly locked: boolean;
    cancel(reason?: unknown): Promise<void>;
    getReader(): ReadableStreamDefaultReader<R>;
    pipeThrough<T>(
      transform: ReadableWritablePair<T, R>,
      options?: StreamPipeOptions,
    ): ReadableStream<T>;
    pipeTo(dest: WritableStream<R>, options?: StreamPipeOptions): Promise<void>;
    tee(): [ReadableStream<R>, ReadableStream<R>];
  }
}
