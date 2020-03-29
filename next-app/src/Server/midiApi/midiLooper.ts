// Basic looper test
import { getInputNames, Input } from "./midiInput";
import { ChannelVoiceMessage, MidiMessage, SystemExclusiveMessage, NoteOnMessage } from "./midiTypes";
import { getOutputNames, Output } from "./midiOutput";
import { areArraysEqual } from "../YamahaApi/utils/nodeUtils";

// MidiMessage with unix timestamp in ms
let midiLoopRecords: [MidiMessage, number][] = [];
let recording: boolean = false;
let recordingStartTime: number = 0; // ms
let recordingStopTime: number = 0; // ms

// let sysExMicBuffer: number[][] = [];
// const sysExBufferDeleteThreshold = 200; // ms

let isVocalHarmonyOn = false;
const VOCAL_HARMONY_ON = [0xF0, 0x43, 0x10, 0x4C, 0x04, 0x00, 0x0C, 0x40, 0xF7];
const VOCAL_HARMONY_OFF = [0xF0, 0x43, 0x10, 0x4C, 0x04, 0x00, 0x0C, 0x7F, 0xF7];

let isEffectOn = false;
const EFFECT_ON = [0xF0, 0x43, 0x10, 0x4C, 0x03, 0x05, 0x0C, 0x40, 0xF7];
const EFFECT_OFF = [0xF0, 0x43, 0x10, 0x4C, 0x03, 0x05, 0x0C, 0x7F, 0xF7];

/*
============== sysex message: f0 43 10 4c 3 5 0 4c 11 f7 
============== sysex message: f0 43 10 4c 10 0 b 7f f7 
============== sysex message: f0 43 10 4c 10 0 e 40 f7 
============== sysex message: f0 43 10 4c 10 0 13 0 f7 
============== sysex message: f0 43 10 4c 10 0 12 0 f7 
============== sysex message: f0 43 10 4c 10 0 14 0 f7 
============== sysex message: f0 43 10 4c 4 0 0 40 0 f7 
*/
// let foundTalkOn = false;
// const TALK_ON = [
//     [0xF0, 0x43, 0x10, 0x4C, 0x03, 0x05, 0x00],
//     [0xF0, 0x43, 0x10, 0x4C, 0x10, 0x00, 0x0B],
//     [0xF0, 0x43, 0x10, 0x4C, 0x10, 0x00, 0x0E],
//     [0xF0, 0x43, 0x10, 0x4C, 0x10, 0x00, 0x13],
//     [0xF0, 0x43, 0x10, 0x4C, 0x10, 0x00, 0x12],
//     [0xF0, 0x43, 0x10, 0x4C, 0x10, 0x00, 0x14],
//     [0xF0, 0x43, 0x10, 0x4C, 0x04, 0x00, 0x00],
// ];

// const TALK_OFF = [
//     [0xF0, 0x43, 0x10, 0x4C, 0x04, 0x00, 0x0B],
//     [0xF0, 0x43, 0x10, 0x4C, 0x04, 0x00, 0x0C],
//     [0xF0, 0x43, 0x73, 0x01, 0x11, 0x00, 0x50, 0x10],
// ];

// const TALK_OFF_INIT = [
//     ...TALK_ON,
//     ...TALK_OFF
// ];

// Initialize input and outputs
const inputs: Input[] = [];
getInputNames().forEach((inputName: string) => {
    inputs.push(new Input(inputName));
});
const outputs: Output[] = [];
getOutputNames().forEach((outputName: string) => {
    outputs.push(new Output(outputName));
});

// delete sysExBuffer every x ms
// setInterval(() => {
//     resetSysExMic();
// }, sysExBufferDeleteThreshold);

// Recording?
inputs[1].onMidiEvent('sysex', (message: SystemExclusiveMessage) => {
    console.log('found sysex: ' + decArrayToHexDisplay(message.rawData));

    // Check Vocal Harmony button
    let foundVocalHarmony = false;
    if (areArraysEqual(message.rawData, VOCAL_HARMONY_ON)) {
        foundVocalHarmony = true;
        console.log('=== Vocal harmony on');
        isVocalHarmonyOn = true;
    } else if (areArraysEqual(message.rawData, VOCAL_HARMONY_OFF)) {
        foundVocalHarmony = true;
        console.log('=== Vocal harmony off');
        isVocalHarmonyOn = false;
    }

    // Check Effect button
    if (!foundVocalHarmony) {
        if (areArraysEqual(message.rawData, EFFECT_ON)) {
            console.log('=== Effect on');
            isEffectOn = true;
        } else if (areArraysEqual(message.rawData, EFFECT_OFF)) {
            console.log('=== Effect off');
            isEffectOn = false;
        }
    }

    /////////
    // OLD //
    /////////

    // if (!sysExMicBuffer.length) {
    //     // console.log('check for vocal harmony');
    //     if (areArraysEqual(message.rawData, VOCAL_HARMONY_ON)) {
    //         console.log('=== Vocal harmony on');
    //         foundVocalHarmony = true;
    //     } else if (areArraysEqual(message.rawData, VOCAL_HARMONY_OFF)) {
    //         console.log('=== Vocal harmony off');
    //         foundVocalHarmony = true;
    //     }
    //     if (foundVocalHarmony) { return resetSysExMic() }
    // }

    // console.log('check for talk message');

    // Check talk message
    // let foundTalkOnMessage = false;
    // for (let i = 0; i < TALK_ON.length; i++) {
    //     if (isArrayContainsArrayFromStart(message.rawData, TALK_ON[i])) {
    //         sysExMicBuffer.push(message.rawData.slice(0, TALK_ON[i].length));
    //         foundTalkOnMessage = true;
    //         break;
    //     }
    // }
    // if (!foundTalkOnMessage) {
    //     for (let i = 0; i < TALK_OFF.length; i++) {
    //         if (isArrayContainsArrayFromStart(message.rawData, TALK_OFF[i])) {
    //             foundTalkOn = false;
    //             sysExMicBuffer.push(message.rawData.slice(0, TALK_OFF[i].length));
    //             break;
    //         }
    //     }
    // }

    // console.log('Length:                                               ' + sysExMicBuffer.length);
    // // Found talk messages?
    // let foundTalkMessages = false;
    // if (areNestedArraysEqual(sysExMicBuffer, TALK_OFF_INIT)) {
    //     foundTalkMessages = true;
    //     console.log('========== TALK off init');
    // } else if (areNestedArraysEqual(sysExMicBuffer, TALK_ON)) {
    //     foundTalkOn = true;
    //     // console.log('========== might be TALK on');
    //     const currentSysExMicLength = sysExMicBuffer.length;
    //     setTimeout(() => {
    //         if (foundTalkOn && sysExMicBuffer.length === currentSysExMicLength) {
    //             console.log('TALK on');
    //             foundTalkOn = false;
    //             resetSysExMic();
    //         }
    //     }, 10);
    //     // check next time we get a sysExMessage
    // } else if (areNestedArraysEqual(sysExMicBuffer, TALK_OFF)) {
    //     foundTalkMessages = true;
    //     console.log('========== TALK off');
    // }

    // if (foundTalkMessages) {
    //     return resetSysExMic();
    // }
});

// function resetSysExMic(): void {
//     // console.log('!!! resetting !!!');
//     sysExMicBuffer = [];
// }

// /**
//  * Check if the first array contains the second array.
//  * @param array1 array that is bigger or has the same size than array2
//  * @param array2 array to be contained
//  */
// function isArrayContainsArrayFromStart(array1: number[], array2: number[]): boolean {
//     if (array2.length > array1.length) {
//         return false;
//     } else {
//         return areArraysEqual(array1.slice(0, array2.length), array2);
//     }
// }

// function areNestedArraysEqual(array1: number[][], array2: number[][]): boolean {
//     if (array1.length !== array2.length) {
//         return false;
//     }
//     for (let i = 0; i < array1.length; i++) {
//         let foundArray1ItemInArray2 = false;
//         for (let j = 0; j < array2.length; j++) {
//             if (areArraysEqual(array1[i], array2[j])) {
//                 foundArray1ItemInArray2 = true;
//             }
//         }
//         if (!foundArray1ItemInArray2) {
//             return false;
//         }
//     }
//     return true;
// }

function decArrayToHexDisplay(decArray: number[]): string {
    let hex: string = '';
    decArray.forEach((value: number) => {
        hex += value.toString(16);
        hex += ' ';
    });
    return hex;
}


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
