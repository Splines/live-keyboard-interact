import * as Result from './utils/result';
import { getStringSequenceNumber } from './regMidiFilesGenerator';
import { YamahaRegMemory, GPm, BHd } from './regTypes';
import { updateAllLengthFields } from './regUpdater';
import { parseReg } from './regParser';
import { regMemoryToUint8Array, getIndexToPushGpm, hasGpmType } from './utils/utils';

/**
 * Assign a MIDI file to a Registration Memory button.
 * @param data the data of the Registration Memory File
 * @param button Registration Memory button (from 0 to 7)
 * @param midiPath the MIDI path the Reg file should point to
 */
export function linkMidiToReg(regData: Uint8Array, buttonIndex: number, midiPath: string): Uint8Array {
    // --- Parse data
    let regMemory: Result.Type<YamahaRegMemory> = parseReg(regData);
    if (!Result.isSuccess(regMemory)) {
        console.error(regMemory.message);
        return new Uint8Array();
    }
    // --- Manipulate and return data
    regMemory = changeMidiSongPath(regMemory, buttonIndex, midiPath); // the actual linking happens here (!)
    regMemory = updateAllLengthFields(regMemory);
    return regMemoryToUint8Array(regMemory);
}

export function linkMidiDummyToReg(regData: Uint8Array, midiIndex: number): Uint8Array {
    // e.g. midiPath = 'I:/RegMidiFiles/RegMidi_452.mid';
    const midiPath: string = `I:/RegMidiFiles/RegMidi_${getStringSequenceNumber(midiIndex)}.mid`;
    return linkMidiToReg(regData, 0, midiPath);
}

/**
 * Changes the name of the linked MIDI file on the first Registration Memory according to the specified newMidiPath.
 * Note that this will automatically check if there is a linked MIDI file at all. If not, it will create a new
 * GPm-chunk. If there is aready a MIDI file linked, this function will just override it.
 * @param regMemory the Yamaha Registration Memory to change
 * @param newMidiPath the path to the MIDI file that will be linked to the first
 * Registration Memory button on the keyboard
 */
function changeMidiSongPath(regMemory: YamahaRegMemory, buttonIndex: number, newMidiPath: string): YamahaRegMemory {
    // --- Convert string filepath to array of hex numbers
    const newMidiPathData: number[] = [];
    for (let i = 0; i < newMidiPath.length; i++) {
        newMidiPathData.push(newMidiPath.charCodeAt(i));
    }

    // --- Search for specific GPm chunk with type 0x05/5 (MIDI Song file linked)
    let gpmChunkIndex = -1;
    for (let i = 0; i < regMemory.bhds[buttonIndex].gpms.length; i++) {
        if (regMemory.bhds[buttonIndex].gpms[i].type === 5) {
            gpmChunkIndex = i;
            break; // we have found our GPm-chunk, so no need to keep on searching
        }
    }

    // --- Adjust or create MIDI Song GPm chunk
    // adjust existing chunk
    if (gpmChunkIndex !== -1) {
        const gpm: GPm = regMemory.bhds[buttonIndex].gpms[gpmChunkIndex];
        // print old midi path
        const oldMidiPath: string[] = gpm.data.map((hexString: number, i: number) => {
            // start at index 2
            if (i < 2) { return ''; }
            return String.fromCharCode(hexString);
        });
        console.log(`Replace linked midi file "${oldMidiPath.join('')}" by "${newMidiPath}"`);
        // Adjust data
        gpm.data = [gpm.data[0]].concat([gpm.data[1]]).concat(newMidiPathData);
        // no need to update length of GPm-chunk here, this is done when the file is saved
    } else { // no gpm chunk type 5 found on this Registration Memory button ==> create new chunk
        // TODO: make sure that the whole registration group is saved when linking a NEW midi file / when no gpm chunk type 5 found
        console.log(`Link new MIDI file "${newMidiPath}"`);
        const newMidiSongGpm: GPm = {
            header: [0x47, 0x50, 0x6D],
            type: 5,
            dataLength: [0, 0], // doesn't matter, length gets updates when file is saved
            data: [0x00, 0x00].concat(newMidiPathData)
        };
        const currentBhd: BHd = regMemory.bhds[buttonIndex];

        currentBhd.gpms.splice(getIndexToPushGpm(currentBhd, 5), 0, newMidiSongGpm);

        // Insert missing GPm-chunks needed for Song Setting-Group
        if (!hasGpmType(currentBhd, 1)) {
            const newSampleTitleGpm: GPm = {
                header: [0x47, 0x50, 0x6D],
                type: 1,
                dataLength: [0, 0],
                data: [0x4E, 0x65, 0x77, 0x52, 0x65, 0x67, 0x69, 0x73, 0x74] // NewRegist
            }
            currentBhd.gpms.splice(getIndexToPushGpm(currentBhd, 1), 0, newSampleTitleGpm);
        }
        if (!hasGpmType(currentBhd, 2)) {
            const newBasicTwoGpm: GPm = {
                header: [0x47, 0x50, 0x6D],
                type: 2,
                dataLength: [0, 0],
                data: [0x7F, 0x03, 0x04, 0x02, 0x06, 0x06, 0x07, 0x02, 0x05, 0x06]
            }
            currentBhd.gpms.splice(getIndexToPushGpm(currentBhd, 2), 0, newBasicTwoGpm);
        }
        if (!hasGpmType(currentBhd, 3)) {
            const newBasicThreeGpm: GPm = {
                header: [0x47, 0x50, 0x6D],
                type: 3,
                dataLength: [0, 0],
                data: [0x00]
            }
            currentBhd.gpms.splice(getIndexToPushGpm(currentBhd, 3), 0, newBasicThreeGpm);
        }
        if (!hasGpmType(currentBhd, 4)) {
            const newSongFourGpm: GPm = {
                header: [0x47, 0x50, 0x6D],
                type: 4,
                dataLength: [0, 0],
                data: [0x64, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0xF0]
            }
            currentBhd.gpms.splice(getIndexToPushGpm(currentBhd, 4), 0, newSongFourGpm);
        }
    }
    return regMemory;
}
