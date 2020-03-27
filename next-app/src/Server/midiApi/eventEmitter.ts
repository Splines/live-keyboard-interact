// see https://rjzaworski.com/2019/10/event-emitters-in-typescript
type EventMap = Record<string, any>;
type EventReceiver<L> = (params: L) => void;

export interface Emitter<T extends EventMap> {
    on<K extends string & keyof T>(eventName: K, fn: EventReceiver<T[K]>): Emitter<T>;
    off<K extends string & keyof T>(eventName: K, fn: EventReceiver<T[K]>): Emitter<T>;
    emit<K extends string & keyof T>(eventName: K, params: T[K]): boolean;
}

export function typedEventEmitter<T extends EventMap>(): Emitter<T> {
    const listeners: {
        [K in keyof EventMap]?: Array<(p: EventMap[K]) => void>;
    } = {};

    return {
        on(key, fn) {
            listeners[key] = (listeners[key] || []).concat(fn);
            return this;
        },
        off(key, fn) {
            listeners[key] = (listeners[key] || []).filter(f => f !== fn);
            return this;
        },
        emit(key, data) {
            const eventListeners = listeners[key];
            if (!eventListeners) { return false; }
            eventListeners.forEach(function (fn) {
                fn(data);
            });
            return true;
        }
    }
}

// Not typed approach
// https://www.freecodecamp.org/news/how-to-code-your-own-event-emitter-in-node-js-a-step-by-step-guide-e13b7e7908e1/

// export class EventEmitter {
//     listeners: any = {}; // key-value pair (hash to store the listeners)

//     addListener(event: string, fn: any) {
//         this.listeners[event] = this.listeners[event] || [];
//         this.listeners[event].push(fn);
//         return this;
//     }

//     on(event: string, fn: any) {
//         return this.addListener(event, fn);
//     }

//     removeListener(event: string, fn: any) {
//         let listeners: any = this.listeners[event];
//         if (!listeners) {
//             return this;
//         }
//         for (let i = 0; i < listeners.length; i++) {
//             if (listeners[i] === fn) {
//                 listeners.splice(i, 1);
//                 break;
//             }
//         }
//         return this;
//     }

//     off(event: string, fn: any) {
//         return this.removeListener(event, fn);
//     }

//     once(event: string, fn: any) {
//         this.listeners[event] = this.listeners[event] || [];
//         const onceWrapper = () => {
//             fn();
//             this.off(event, onceWrapper);
//         };
//         this.listeners[event].push(onceWrapper);
//         return this;
//     }

//     emit(event: string, ...args: any) {
//         const listeners = this.listeners[event];
//         if (!listeners) {
//             return false;
//         }
//         listeners.forEach((listener: any) => {
//             listener(...args);
//         });
//         return true;
//     }

//     listenerCount(event: string) {
//         const listeners: any = this.listeners[event] || [];
//         return listeners.length;
//     }

//     rawListeners(event: string) {
//         return this.listeners[event];
//     }
// }

// const eventEmitter = new EventEmitter();
// eventEmitter.addListener('test-event', () => console.log('test one'));
