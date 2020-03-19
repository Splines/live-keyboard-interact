import JSZip from 'jszip';
import { linkMidiDummyToReg } from './YamahaApi/regMidiAssigner';
import { RegIndexMapping, FileWithRawData } from './serverApi';
import { getShortenedRegFilename } from './YamahaApi/utils/utils';

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