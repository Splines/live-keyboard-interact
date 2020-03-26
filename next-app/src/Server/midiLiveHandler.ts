// @ts-ignore
import easymidi = require('easymidi');
import { RegIndexMapping, RegFilenameCallback, MidiMessageCallback } from './serverApi';

// interface SysEx {
//     bytes: number[];
// }

interface ControlChange {
    controller: number,
    value: number,
    channel: number
}

// interface NoteMessage {
//     note: number,
//     velocity: number,
//     channel: number
// }

interface ProgramMessage {
    number: number,
    channel: number
}

// interface BankSelect {
//     msb: number,
//     lsb: number
// }

/////////////////////////////////////////////////
let inputMidi: any;

export function watchRegChanges(regIndexMap: RegIndexMapping[], callback: RegFilenameCallback) {
    if (!inputMidi) {
        inputMidi = initMidi();
    }
    startRegChangeHandling(inputMidi, regIndexMap, callback);
}

export function watchMidiChanges(callback: MidiMessageCallback) {
    // if (!inputMidi) {
    //     inputMidi = initMidi();
    // }
    // inputMidi.on('message', (msg: any) => {
    //     const vals = Object.keys(msg).map((key) => {
    //         return key + ": " + msg[key];
    //     });
    //     callback(vals.join(', '));
    // });

    // https://github.com/dinchak/node-easymidi/blob/master/examples/monitor_all_inputs.js
    // Monitor all MIDI inputs with a single "message" listener
    easymidi.getInputs().forEach((inputName: string) => {
        var input = new easymidi.Input(inputName);
        input.on('message', (msg: any) => {
            var vals = Object.keys(msg).map(function (key) { return key + ": " + msg[key]; });
            callback(inputName + ": " + vals.join(', '));
        });
    });
}

function initMidi() {
    // --- Get outputs and connect to standard output for Yamaha Tyros
    //const outputs: string[] = easymidi.getOutputs();
    //const output = new easymidi.Output(outputs[2]);

    // --- Get inputs
    let inputs: string[] = easymidi.getInputs();
    console.log(inputs);
    if (inputs.length <= 0) {
        console.error('found no midi device');
        process.exit(1);
    }

    // --- Connect to first available Yamaha MIDI port
    inputs = inputs.filter((input: string) => input.toLowerCase().includes('workstation'));
    if (inputs.length === 0) {
        console.error('No Yamaha midi device found!');
        process.exit(1);
    }
    const input = new easymidi.Input(inputs[0]);
    console.log(`Connected to: ${inputs[0]}`);

    return input;
}

// function getRegMap(): RegIndexMapping[] {
//     // --- Read RegIndex map from file
//     console.log(`read map ${regMapPath}`);
//     const data: string = fs.readFileSync(regMapPath).toString();
//     return JSON.parse(data);
// }

function startRegChangeHandling(inputMidi: any, regIndexMap: RegIndexMapping[], callback: RegFilenameCallback) {
    const msbValues: number[] = [];
    const lsbValues: number[] = [];

    // Log bank select (control change) and program change messages
    inputMidi.on('cc', (msg: ControlChange) => {
        // channel must be 13 [MIDI settings on Tyros: 'MIDI A/USB CH14' for part 'SONG CH1']
        if (msg.channel !== 13) { return; }
        switch (msg.controller) {
            case 0: // Bank Select MSB
                msbValues.push(msg.value);
                // console.log(`MSB = channel: ${msg.channel}, value: ${msg.value}`)
                break;
            case 32: // Bank Select LSB
                lsbValues.push(msg.value);
                // console.log(`LSB = channel: ${msg.channel}, value: ${msg.value}`)
                break;
        }
    });

    // Receive program change messages.
    inputMidi.on('program', (msg: ProgramMessage) => {
        // channel must be 13
        if (msg.channel !== 13) { return; }

        // 8 Registration Memory buttons
        if (!(msg.number >= 0 && msg.number <= 7)) { return; }

        // Check if msbValues and lsbValues exist
        if (!(msbValues && lsbValues)) { return; }

        // MSB must be in range 0 to 3
        const lastMsbValue: number = msbValues[msbValues.length - 1];
        if (!(lastMsbValue >= 0 && lastMsbValue <= 3)) { return; }
        const lastLsbValue: number = lsbValues[lsbValues.length - 1];
        console.log(`[Reg Change] channel: ${msg.channel}, MSB: ${lastMsbValue}, LSB: ${lastLsbValue}, RegistNumber: ${msg.number}`);

        // Construct Registration Memory filename out of msb and lsb value
        const regIndex: number = msbLsbToRegIndex(lastMsbValue, lastLsbValue);
        // Get Registration Memory filename for this index
        regIndexMap.some((regIndexMapping: RegIndexMapping) => {
            if (regIndexMapping.midiIndex === regIndex) {
                console.log(`Selected Registration Memory button ${msg.number} of .RGT-file ${regIndexMapping.regName}`);
                callback(regIndexMapping.regName);
                return true;
            }
            return false;
        });
    });
}

/**
 * Returns the actual reg-file index in the directory based on the values msb and lsb
 * @param msb most significant bit (see Yamaha Data sheet for your keyboard)
 * @param lsb least significant bit (see Yamaha Data sheet for your keyboard)
 */
function msbLsbToRegIndex(msb: number, lsb: number) {
    return parseInt(msb.toString(16).padStart(2, '0') + lsb.toString(16).padStart(2, '0'), 16);
}
