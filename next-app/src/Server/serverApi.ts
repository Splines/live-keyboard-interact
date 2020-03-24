import io from 'socket.io-client';
import config from '../../../init-app/config.json';
import { FileWithRawData } from '../fileUtil';

const socket: SocketIOClient.Socket = io(`ws://${config.accessPoint.ipStatic}:${config.server.port}/`, { transports: ['polling'] });
// only for development
// const socket: SocketIOClient.Socket = io(`ws://localhost:${config.server.port}/`, { transports: ['polling'] });

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
export async function postPdfs(pdfFiles: FileWithRawData[]) {
    socket.emit('postPDFs', pdfFiles);
}

//////////////
// JSON Map //
//////////////
export async function postMap(regIndexMap: RegIndexMapping[]) {
    socket.emit('postMap', regIndexMap);
}

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
