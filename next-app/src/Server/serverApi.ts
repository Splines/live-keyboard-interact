import io from 'socket.io-client';
import config from '../../../init-app/config.json';

// const socket: SocketIOClient.Socket = io(`ws://${config.accessPoint.ipStatic}:${config.server.port}/`, { transports: ['polling'] });
// only for development
const socket: SocketIOClient.Socket = io(`ws://localhost:${config.server.port}/`, { transports: ['polling'] });

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

/////////
// PDF //
/////////
export async function putPdfs(pdfFiles: FileWithRawData[]) {
    socket.emit('putPDFs', pdfFiles);
}

// interface PdfFilenamesCallback {
//     (pdfFilenames: string): void;
// }

// export async function getPdfFilenames(callback: PdfFilenamesCallback) {
//     socket.on('pdfFilenames', (pdfFilenames: string) => callback(pdfFilenames));
//     socket.emit('subscribePdfFilenames');
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
