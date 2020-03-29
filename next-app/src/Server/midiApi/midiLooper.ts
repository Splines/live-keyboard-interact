// Basic looper test
import { getInputNames, Input } from "./midiInput";
import { ChannelVoiceMessage, SystemExclusiveMessage } from "./midiTypes";
import { getOutputNames, Output } from "./midiOutput";
import { areArraysEqual } from "../YamahaApi/utils/nodeUtils";

////////////
// Device //
////////////
let inputs: Input[] = [];
let outputs: Output[] = [];
init();

///////////////
// Recording //
///////////////
interface MidiLoopSequence extends Array<MidiLoopItem> { };

interface MidiLoopItem {
    message: ChannelVoiceMessage;
    time: number // unix time of record in milliseconds (ms)
}

let recording = false;
let outputChannel = -1; // Song MIDI channels (16 in total)
let recordingStartTime = -1; // ms
let sequenceDuration = -1; // ms
let currentSequence: MidiLoopSequence = [];

/////////////////////////
// Buttons on keyboard //
/////////////////////////
let isVocalHarmonyOn = false;
const VOCAL_HARMONY_ON = [0xF0, 0x43, 0x10, 0x4C, 0x04, 0x00, 0x0C, 0x40, 0xF7];
const VOCAL_HARMONY_OFF = [0xF0, 0x43, 0x10, 0x4C, 0x04, 0x00, 0x0C, 0x7F, 0xF7];

let isEffectOn = false;
const EFFECT_ON = [0xF0, 0x43, 0x10, 0x4C, 0x03, 0x05, 0x0C, 0x40, 0xF7];
const EFFECT_OFF = [0xF0, 0x43, 0x10, 0x4C, 0x03, 0x05, 0x0C, 0x7F, 0xF7];

/**
 * Initialize inputs and outputs.
 */
function init() {
    console.log('INPUTS');
    getInputNames().forEach((inputName: string) => {
        console.log(inputName);
        inputs.push(new Input(inputName));
    });
    console.log('OUTPUTS');
    getOutputNames().forEach((outputName: string) => {
        console.log(outputName);
        outputs.push(new Output(outputName));
    });
}

// React to keyboard buttons
inputs[1].onMidiEvent('sysex', (message: SystemExclusiveMessage) => {
    // Check Vocal Harmony button
    let foundVocalHarmony = false;
    if (areArraysEqual(message.rawData, VOCAL_HARMONY_ON)) {
        foundVocalHarmony = true;
        console.log('=== Vocal harmony on');
        isVocalHarmonyOn = true;
        startRecording();
    } else if (areArraysEqual(message.rawData, VOCAL_HARMONY_OFF)) {
        foundVocalHarmony = true;
        console.log('=== Vocal harmony off');
        isVocalHarmonyOn = false;
        stopRecording();
    }

    // Check Effect button
    // TODO: add functionality later on for playing without recording to effect button
    if (!foundVocalHarmony) {
        if (areArraysEqual(message.rawData, EFFECT_ON)) {
            console.log('=== Effect on');
            isEffectOn = true;
        } else if (areArraysEqual(message.rawData, EFFECT_OFF)) {
            console.log('=== Effect off');
            isEffectOn = false;
        }
    }
});

function startRecording() {
    if (outputChannel < 0) {
        // first time starting the recorder
        recordingStartTime = Date.now();
    }
    recording = true;
}

function stopRecording() {
    if (outputChannel < 0) {
        // first time stopping the recorder
        sequenceDuration = Date.now() - recordingStartTime;
    }
    recording = false;
    if (currentSequence.length) {
        outputChannel += 1;
        startLooping(currentSequence, outputChannel);
        currentSequence = [];
    } else {
        console.log("Sequence is empty, so won't start the looper");
    }
}

function startLooping(sequence: MidiLoopSequence, channel: number) {
    if (sequenceDuration <= 0) {
        // should never happen!
        return console.error('The sequence duration is not set while attempting to start looping.');
    }
    if (recordingStartTime <= 0) {
        // should never happen!
        return console.error('The recording start time is not set while attempting to start looping.');
    }

    console.log('started the looper');
    for (let i = 0; i < 5; i++) {
        let sequenceStartTime: number = i * sequenceDuration;
        sequence.forEach((midiLoopItem: MidiLoopItem, i: number) => {
            const deltaTime: number = sequence[i - 1] ? midiLoopItem.time - sequence[i - 1].time : midiLoopItem.time - recordingStartTime;
            const messageToSend: number[] = midiLoopItem.message.changeChannel(channel).getRawData();
            setTimeout(() => {
                outputs[1].send(messageToSend);
                console.log('sent message: ' + messageToSend);
            }, deltaTime + sequenceStartTime);
            sequenceStartTime += deltaTime;
        });
    }
}

// Recording event handler
inputs[1].onMidiEvent('channel voice message', (message: ChannelVoiceMessage) => {
    if (!recording) {
        return;
    }
    if (message.type === undefined) {
        return;
    }
    if (message.channel !== 0) {
        return;
    }
    console.log('Channel voice message: ' + message.getRawData());
    currentSequence.push({
        message: message,
        time: Date.now()
    });
});



/////////////
// Utility //
/////////////
// function decArrayToHexDisplay(decArray: number[]): string {
//     let hex: string = '';
//     decArray.forEach((value: number) => {
//         hex += value.toString(16);
//         hex += ' ';
//     });
//     return hex;
// }

// getInputNames().forEach((inputName: string) => {
//     const input = new Input(inputName);
//     // input.onMidiEvent('message', (message: MidiMessage) => {
//     //     const vals: any = Object.keys(message).map((key: string) => {
//     //         if (message.type === undefined) {
//     //             return;
//     //         }
//     //         return key + ": " + message[key as keyof MidiMessage];
//     //     });
//     //     console.log(inputName + ': ' + vals.join(', '));
//     // });

//     input.onMidiEvent('channel voice message', (message: ChannelVoiceMessage) => {
//         if (message.type === undefined) {
//             return;
//         }
//         if (recording) {
//             midiLoopRecords.push([message, Date.now()]);
//         }

//         const vals: any = Object.keys(message).map((key: string) => {
//             return key + ": " + message[key as keyof MidiMessage];
//         });
//         if (vals) {
//             console.log('channel voice message: ' + vals.join(', '));
//         }
//     });

//     input.onMidiEvent('noteon', (message: NoteOnMessage) => {
//         if (message.note === 96 && message.attackVelocity > 0) {
//             for (let i = 0; i <= 127; i++) {
//                 outputs.forEach((output: Output) => output.send([0x90, i, 0])); // note off for all keys
//             }
//         }
//     });

//     input.onMidiEvent('sysex', (message: SystemExclusiveMessage) => {
//         let messageHex: string = '';
//         message.rawData.forEach((value: number) => {
//             messageHex += value.toString(16);
//             messageHex += ' ';
//         });
//         console.log('============== sysex message: ' + messageHex);

//         if (areArraysEqual(message.rawData, VOCAL_HARMONY_ON)) {
//             // vocal harmony on
//             recordingStartTime = Date.now();
//             recording = true;
//         } else if (areArraysEqual(message.rawData, VOCAL_HARMONY_OFF)) {
//             // vocal harmony off
//             recordingStopTime = Date.now();
//             recording = false;

//             // start looper
//             const sequenceLength: number = recordingStopTime - recordingStartTime;
//             for (let i = 0; i < 5; i++) {
//                 let imaginaryTimePassed: number = i * sequenceLength;
//                 midiLoopRecords.forEach((record: [MidiMessage, number], i: number) => {
//                     const deltaMs: number = midiLoopRecords[i - 1] ? record[1] - midiLoopRecords[i - 1][1] : record[1] - recordingStartTime;
//                     setTimeout(() => {
//                         outputs.forEach((output: Output) => output.send(record[0].rawData));
//                     }, deltaMs + imaginaryTimePassed);
//                     imaginaryTimePassed += deltaMs;
//                 });
//             }
//             midiLoopRecords = [];
//         }
//     });

//     input.onMidiEvent('noteon', (message: NoteOnMessage) => {
//         if (message.note === 95 && message.attackVelocity > 0) {
//             outputs.forEach((output: Output) => output.send([0x92, 0x40, 80]));
//             setTimeout(() => {
//                 outputs.forEach((output: Output) => output.send([0x92, 0x40, 0])); // note off for all keys
//             }, 20);
//         }
//     });
// });
