interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;

  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;

   addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void;

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void;
}


interface Navigator {
  serial: {
    requestPort(): Promise<SerialPort>;
  };
}