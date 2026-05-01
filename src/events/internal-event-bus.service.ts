import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

@Injectable()
export class InternalEventBus {
  private readonly emitter = new EventEmitter();

  emit<TPayload>(eventName: string, payload: TPayload): void {
    this.emitter.emit(eventName, payload);
  }

  on<TPayload>(eventName: string, listener: (payload: TPayload) => void | Promise<void>): void {
    this.emitter.on(eventName, (payload: TPayload) => {
      void listener(payload);
    });
  }
}
