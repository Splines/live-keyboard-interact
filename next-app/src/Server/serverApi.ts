import io from 'socket.io-client';
import config from '../../../init-app/config.json';
import { FileWithRawData } from '../fileUtil';

const socketIp: string = process.env.NODE_ENV === 'production' ? config.accessPoint.ipStatic : 'localhost';
const socket: SocketIOClient.Socket = io(`ws://${socketIp}:${config.server.httpPort}/`, { transports: ['polling'] });

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
export function postPdfs(pdfFiles: FileWithRawData[]) {
    socket.emit('postPDFs', pdfFiles);
}

export function deletePdf(pdfFilename: string) {
    socket.emit('deletePDF', pdfFilename);
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

export function unsubscribeRegChange() {
    socket.emit('unsubscribeRegChange');
}
