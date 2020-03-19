import config from '../../../init-app/config.json';
import io from 'socket.io-client';

const socket: SocketIOClient.Socket = io(`ws://${config.accessPoint.ipStatic}:${config.server.port}/`, { transports: ['polling'] });
// only for development
// const socket: SocketIOClient.Socket = io(`ws://localhost:${config.server.port}/`, { transports: ['polling'] });

export interface FileWithRawData {
    name: string;
    lastModified: number;
    data: ArrayBuffer;
}

////////////
// RegMap //
////////////
export interface RegIndexMapping {
    regName: string;
    midiIndex: number;
}

interface ZippedRegFilesCallback {
    (zippedRegFiles: ArrayBuffer): void;
}

export function subscribeLinkMidiFilesToReg(regFiles: FileWithRawData[], callback: ZippedRegFilesCallback) {
    socket.on('linkedMidiToReg', (zippedRegFiles: ArrayBuffer) => callback(zippedRegFiles));
    socket.emit('subscribeLinkMidiToReg', regFiles);
}

////////////
// PDFMap //
////////////
// export function putPDFMap(pdfFiles: FileWithRawData[]) {
//     socket.emit('putPDFMap', pdfFiles);
// }

///////////////
// RegChange //
///////////////
export interface RegFilenameCallback {
    (regFilename: string): void;
}

export function subscribeRegChange(callback: RegFilenameCallback) {
    socket.on('regChange', (regFilename: string) => callback(regFilename));
    socket.emit('subscribeRegChange');
}
