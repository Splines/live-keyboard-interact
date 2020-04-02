// Basic looper test
import { getInputNames, Input } from "./midiInput";
import { ChannelVoiceMessage, SystemExclusiveMessage, ControlChangeMessage, ProgramChangeMessage, ChannelVoiceMessageType, SystemRealTimeMessageType, SystemRealTimeMessage, NoteOnMessage } from "./midiTypes";
import { getOutputNames, Output } from "./midiOutput";
import { areArraysEqual, decArrayToHexDisplay } from "../YamahaApi/utils/nodeUtils";

/////////////
// Devices //
/////////////
let inputs: Input[] = [];
let outputs: Output[] = [];
init();
const inputIndex = 1;
const outputIndex = 1;

///////////////
// Recording //
///////////////
interface MidiLoopSequence extends Array<MidiLoopItem> { };

interface MidiLoopItem {
    message: ChannelVoiceMessage;
    time: number // unix time of record in milliseconds (ms)
    deltaTime: number // number of milliseconds since the previous item
}

let recording = false;
let recordingChannel = 0; // Song MIDI channels (16 in total)
let recordingStartTime = -1; // ms
let sequenceDuration = 0; // ms
let nextCalculatedStopTime = -1; // ms
const sequences: MidiLoopSequence[] = new Array(16); // root data structure for recorded sequences
// const sequences: MidiLoopSequence[] = Array(16).fill([]); // will pas []-Object by reference 😒
for (let i = 0; i < sequences.length; i++) {
    sequences[i] = [];
}

// let currentSequence: MidiLoopSequence = [];
const missingNoteOffMessages: number[] = [] // note values (first data byte)
let tempoBpm: number = 120; // bpm
const sequenceNumberOfBars = 4; // we assume 4/4

/////////////////////////
// Buttons on keyboard //
/////////////////////////
let isVocalHarmonyOn = false;
const VOCAL_HARMONY_ON = [0xF0, 0x43, 0x10, 0x4C, 0x04, 0x00, 0x0C, 0x40, 0xF7];
const VOCAL_HARMONY_OFF = [0xF0, 0x43, 0x10, 0x4C, 0x04, 0x00, 0x0C, 0x7F, 0xF7];

// let isEffectOn = false;
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

// Tempo control
inputs[inputIndex].onMidiEvent('sysex', (message: SystemExclusiveMessage) => {
    const sysExHeader: number[] = [0xF0, 0x43, 0x7E, 0x01]; // Tempo control
    for (let i = 0; i < sysExHeader.length; i++) {
        if (message.rawData[i] !== sysExHeader[i]) {
            return;
        }
    }
    tempoBpm = tempoSysExToBpm(message.rawData.slice(4, 8));
    console.log('tempo (BPM): ' + tempoBpm);
});

// see more information on how the algorithm works here
// https://www.psrtutorial.com/forum/index.php/topic,48303.msg378566.html#msg378566
// http://midi.teragonaudio.com/tech/midifile/ppqn.htm
function tempoSysExToBpm(tempoBytes: number[]): number {
    const totalTempo: number = (tempoBytes[0] << 21) + (tempoBytes[1] << 14) + (tempoBytes[2] << 7) + tempoBytes[3];
    // return Math.floor(60000000 / totalTempo);
    return 60000000 / totalTempo;
}

// React to keyboard buttons
inputs[inputIndex].onMidiEvent('sysex', (message: SystemExclusiveMessage) => {
    // Check Vocal Harmony button
    let foundVocalHarmony = false;
    if (areArraysEqual(message.rawData, VOCAL_HARMONY_ON)) {
        foundVocalHarmony = true;
        console.log('=== Vocal harmony on');
        isVocalHarmonyOn = true;
        if (recordingChannel !== 0) {
            // not first time starting the recorder
            startRecording();
        }
    } else if (areArraysEqual(message.rawData, VOCAL_HARMONY_OFF)) {
        foundVocalHarmony = true;
        console.log('=== Vocal harmony off');
        isVocalHarmonyOn = false;
        if (recordingChannel !== 0) {
            // not first time stopping the recorder
            stopRecording();
        }
    }

    // Check Effect button
    // TODO: add functionality later to this button
    if (!foundVocalHarmony) {
        if (areArraysEqual(message.rawData, EFFECT_ON)) {
            console.log('=== Effect on');
            // isEffectOn = true;
        } else if (areArraysEqual(message.rawData, EFFECT_OFF)) {
            console.log('=== Effect off');
            // isEffectOn = false;
        }
    }
});

inputs[inputIndex].onMidiEvent('sys real time', (message: SystemRealTimeMessage) => {
    if (message.type as SystemRealTimeMessageType === SystemRealTimeMessageType.START) {
        startRecording();
    }
});

function startRecording() {
    console.log('========================================');
    console.log('========================================');
    console.log('=== recorder is on ;) ===');
    console.log('========================================');
    console.log('========================================');
    recording = true;
    if (recordingChannel === 0) {
        // first time starting the recorder
        recordingStartTime = Date.now();
        const beatDurationMs: number = 60000 / tempoBpm;
        sequenceDuration = sequenceNumberOfBars * 4 * beatDurationMs;
        scheduleLooperRestart(sequenceDuration);
    } else if (nextCalculatedStopTime < 0) {
        // only schedule a next stop, if there isn't already one scheduled
        scheduleLooperRestart(sequenceDuration - ((Date.now() - recordingStartTime) % sequenceDuration));
    }
}

function scheduleLooperRestart(deltaTime: number): void {
    nextCalculatedStopTime = Date.now() + deltaTime;
    setTimeout(() => {
        nextCalculatedStopTime = -1;
        stopRecording();
        if (isVocalHarmonyOn) {
            startRecording(); // directly start again with recording of a new sequence
        }
    }, deltaTime);
}

function stopRecording() {
    recording = false;
    // if (outputChannel < 0) {
    //     // first time stopping the recorder
    //     sequenceDuration = Date.now() - recordingStartTime;
    // }
    if (nextCalculatedStopTime > 0 && Date.now() < nextCalculatedStopTime) {
        // user pressed vocal harmony OFF before calculated end
        // don't stop this sequence yet
        console.log('User pressed Vocal harmony OFF before calculated end was reached');
    } else if (containsAnyNoteMessage(sequences[recordingChannel])) {
        recordingChannel += 1; // set recording channel as fast as possible for next sequence
        console.log('==============================================');
        console.log('==============================================');
        console.log('==============================================');
        console.log('RecordingChannel + 1 ========================================= +1');
        console.log('==============================================');
        console.log('==============================================');
        console.log('==============================================');
        startLoopingSequence(recordingChannel - 1);
    } else {
        console.log("Sequence doesn't contain any NOTE_ON/OFF messages, so won't start the looper");
        sequences[recordingChannel] = [];
    }
}

function containsAnyNoteMessage(sequence: MidiLoopSequence): boolean {
    return sequence.some((item: MidiLoopItem) => {
        if (item.message.type === ChannelVoiceMessageType.NOTE_ON
            || item.message.type === ChannelVoiceMessageType.NOTE_OFF) {
            return true;
        }
        return false;
    });
}

/**
 * 
 * @param i Sequence index in sequences array
 * @param sequence 
 */
function startLoopingSequence(sequenceIndex: number) {
    if (sequenceDuration <= 0) {
        // should never happen!
        return console.error('The sequence duration is not set while attempting to start looping.');
    }
    // this is when new changes in already registered sequences are recognized by the looper
    const sequenceToLoop = sequences[sequenceIndex];
    setTimeout(() => startLoopingSequence(sequenceIndex), sequenceDuration); // actual looping
    // console.log(`~~~ started playback for channel ${sequenceIndex} ~~~`);
    let timePassed: number = 0;
    for (let i = 0; i < sequenceToLoop.length; i++) {
        const midiLoopItem: MidiLoopItem = sequenceToLoop[i];
        const messageToSend: number[] = midiLoopItem.message.getRawData();
        setTimeout(() => {
            outputs[outputIndex].send(messageToSend);
            console.log('sent message: ' + decArrayToHexDisplay(messageToSend));
        }, midiLoopItem.deltaTime + timePassed);
        // startLoopCycle(messageToSend, midiLoopItem.deltaTime + timePassed);
        timePassed += midiLoopItem.deltaTime;
    }
}

// function startLoopCycle(messageToSend: number[], scheduleTime: number) {
//     // console.log('scheduling for: ' + scheduleTime + ' ms');
//     setTimeout(() => {
//         outputs[outputIndex].send(messageToSend);
//         console.log('sent message: ' + decArrayToHexDisplay(messageToSend));
//     }, scheduleTime);
//     // repeat after every sequenceDuration
//     setTimeout(() => startLoopCycle(messageToSend, scheduleTime), sequenceDuration);
// }

// Recording event handler
inputs[inputIndex].onMidiEvent('channel voice message', (message: ChannelVoiceMessage) => {
    if (!recording) {
        return;
    }
    if (message.type === undefined) {
        return;
    }
    if (message.channel !== 0) {
        return;
    }
    console.log('Channel voice message (R1): ' + decArrayToHexDisplay(message.getRawData()));
    if (message.type as ChannelVoiceMessageType === ChannelVoiceMessageType.NOTE_ON
        && (message as NoteOnMessage).attackVelocity === 0) { // NOTE_OF message on Tyros
        if (missingNoteOffMessages.includes((message as NoteOnMessage).note)) {
            // Put NOTE_OFF message to beginning of last sequence
            console.log('found unhandled NOTE_OFF!');
        }
    }
    // TODO: what if we exceed 16 MIDI channels? --> Prevent TypeError (cannot read property of undefined)!!!
    sequences[recordingChannel].push({
        message: message.changeChannel(recordingChannel),
        time: Date.now(),
        deltaTime: calculateDeltaTime(sequences[recordingChannel])
    });
});

// inputs[inputIndex].onMidiEvent('sysex', (message: SystemExclusiveMessage) => {
//     if (!recording) {
//         return;
//     }
//     if (message.type === undefined) {
//         return;
//     }
//     console.log('SysEx message: ' + message);
//     currentSequence.push({
//         message: message,
//         time: Date.now(),
//         deltaTime: calculateDeltaTime()
//     })
// });

function calculateDeltaTime(currentSequence: MidiLoopSequence): number {
    if (!currentSequence.length) { // first MIDI event in this sequence
        return sequenceDuration
            ? (Date.now() - recordingStartTime) % sequenceDuration
            : Date.now() - recordingStartTime;
    } else { // second, third ... MIDI event in this sequence
        return Date.now() - currentSequence[currentSequence.length - 1].time
    }
}

// Handle voice changes
inputs[inputIndex].onMidiEvent('cc', (message: ControlChangeMessage) => {
    // we want this to apply for situations when we don't record as well (!)
    if (message.type === undefined) {
        return;
    }
    if (message.channel !== 0) {
        return;
    }
    console.log('Control change message for next song channels (R1): ' + decArrayToHexDisplay(message.getRawData()));
    // if (message.controllerNumber === 0x00 || message.controllerNumber === 0x20) {
    sendToOpenSongChannels(message);
    // }
});

inputs[inputIndex].onMidiEvent('program', (message: ProgramChangeMessage) => {
    if (message.type === undefined) {
        return;
    }
    if (message.channel !== 0) {
        return;
    }
    console.log('Program change message for next song channels (R1^): ' + decArrayToHexDisplay(message.getRawData()));
    sendToOpenSongChannels(message);
});

function sendToOpenSongChannels(message: ChannelVoiceMessage): void {
    for (let i = recordingChannel; i <= 15; i++) { // 16 MIDI Channels
        outputs[outputIndex].send(message.changeChannel(i).getRawData());
    }
}

// inputs[inputIndex].onMidiEvent('message', (message: MidiMessage) => {
//     if (!message.type) {
//         if (message.rawData) {
//             return console.log('type is undefined: ' + decArrayToHexDisplay(message.rawData));
//         }
//         return console.log('type undefined');
//     }
//     if (message.type in ChannelVoiceMessageType) {
//         const rawData: number[] = (message as ChannelVoiceMessage).getRawData();
//         console.log('~~ channel voice msg: ' + decArrayToHexDisplay(rawData));
//     } else if (message.type in SystemExclusiveMessageType) {
//         const rawData: number[] = (message as SystemExclusiveMessage).rawData;
//         console.log('~~ SysEx msg: ' + decArrayToHexDisplay(rawData));
//     } else if (message.type in SystemCommonMessageType) {
//         const rawData: number[] = (message as SystemCommonMessage).rawData;
//         console.log('~~ System common: ' + decArrayToHexDisplay(rawData));
//     } else if (message.type in SystemRealTimeMessageType) {
//         const rawData: number[] = (message as SystemRealTimeMessage).rawData;
//         console.log('~~ System Real time msg: ' + decArrayToHexDisplay(rawData));
//     }
// });

// function outputSequence() {
//     sequences.forEach((sequence: MidiLoopSequence) => {
//         console.log('~= Sequence ~=');
//         sequence.forEach((midiLoopItem: MidiLoopItem) => {
//             console.log('=== Midi Loop Item');
//             const vals = (Object.keys(midiLoopItem) as Array<keyof MidiLoopItem>).map(function (key) { return key + ": " + midiLoopItem[key]; });
//             console.log(vals.join(', '));
//         });
//     });
// }
