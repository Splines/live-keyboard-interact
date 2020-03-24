import JSZip from 'jszip';
import fs from 'fs';
// import fsExtra from 'fs-extra';
import path from 'path';
import { linkMidiDummyToReg } from './YamahaApi/regMidiAssigner';
import { RegIndexMapping } from './serverApi';
import { FileWithRawData } from '../fileUtil';
import { getShortenedRegFilename } from './YamahaApi/utils/utils';
import { staticLiveFilesFolderPath } from './server';

/**
 * Links dummy MIDI files to the given Reg files and sends the mapping to the sockt client.
 * @param regFiles 
 */
export async function linkMidiToRegAndMap(socket: SocketIO.Socket, regFiles: FileWithRawData[]): Promise<RegIndexMapping[]> {
    // TODO: it is assumed that the regFiles have at least the ".RGT" suffix
    console.log(`[LinkMidi2Reg] Start linking midi files to ${regFiles.length} reg files`);
    const zippedRegFiles = new JSZip();
    const regFolder = zippedRegFiles.folder('LinkedRegFiles');

    const regIndexMap: RegIndexMapping[] = [];
    for (let i = 0; i < regFiles.length; i++) {
        const regFilenameFull: string = regFiles[i].name;

        // --- Add the name of this registration to the mapping
        console.log(`[LinkMidi2Reg] Processing file "${regFilenameFull}"`);
        regIndexMap.push({
            regName: getShortenedRegFilename(regFilenameFull),
            midiIndex: i
        });

        // --- Link Midi to Reg
        const regData: Uint8Array = new Uint8Array(regFiles[i].data);
        const linkedRegFileContent: Uint8Array = linkMidiDummyToReg(regData, i);
        regFolder.file(regFilenameFull, linkedRegFileContent.buffer);
    }
    zippedRegFiles.file('RegIndexMap.json', JSON.stringify(regIndexMap));
    socket.emit('linkedMidiToReg', await zippedRegFiles.generateAsync({ type: "nodebuffer" }));
    return regIndexMap;
}

export function addPdfFilesToServer(pdfFiles: FileWithRawData[]) {
    https://stackoverflow.com/a/54903986
    // await fsExtra.emptyDir(path.join(__dirname, '../../', 'public', 'pdfs'));

    // https://stackoverflow.com/a/56908322
    pdfFiles.forEach((pdfFile: FileWithRawData) => {
        const filePath = path.join(staticLiveFilesFolderPath, 'pdfs', pdfFile.name);
        const fileStream = fs.createWriteStream(filePath);
        fileStream.write(pdfFile.data);
    });
}

export function deletePdfFileFromServer(pdfFilename: string) {
    const filePath = path.join(staticLiveFilesFolderPath, 'pdfs', pdfFilename);
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(err);
        }
    });
}
