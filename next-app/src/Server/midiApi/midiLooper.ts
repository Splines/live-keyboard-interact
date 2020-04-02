// Basic looper test
import { getInputNames, Input } from "./midiInput";
import { ChannelVoiceMessage, SystemExclusiveMessage, ControlChangeMessage, ProgramChangeMessage, ChannelVoiceMessageType, SystemRealTimeMessageType, SystemRealTimeMessage } from "./midiTypes";
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
let outputChannel = -1; // Song MIDI channels (16 in total)
let recordingStartTime = -1; // ms
let sequenceDuration = 0; // ms
let nextCalculatedStopTime = -1; // ms
let currentSequence: MidiLoopSequence = [];
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

// https://www.psrtutorial.com/forum/index.php/topic,48303.msg378566.html#msg378566
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
        if (outputChannel >= 0) {
            // not first time starting the recorder
            startRecording();
        }
    } else if (areArraysEqual(message.rawData, VOCAL_HARMONY_OFF)) {
        foundVocalHarmony = true;
        console.log('=== Vocal harmony off');
        isVocalHarmonyOn = false;
        if (outputChannel >= 0) {
            // not first time stopping the recorder
            stopRecording();
        }
    }

    // Check Effect button
    // TODO: add functionality later on for playing without recording to effect button
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
    console.log('=== recorder started ===');
    console.log('========================================');
    console.log('========================================');
    recording = true;
    if (outputChannel < 0) {
        // first time starting the recorder
        recordingStartTime = Date.now();
        const beatDurationMs: number = 60000 / tempoBpm;
        sequenceDuration = sequenceNumberOfBars * 4 * beatDurationMs;
        setTimeout(stopRecording, sequenceDuration);
    } else if (nextCalculatedStopTime < 0) { // only schedule a next stop time, if there isn't already one scheduled
        const calculatedStopDiffTime: number = sequenceDuration - ((Date.now() - recordingStartTime) % sequenceDuration);
        nextCalculatedStopTime = Date.now() + calculatedStopDiffTime;
        setTimeout(() => {
            nextCalculatedStopTime = -1;
            stopRecording();
            if (isVocalHarmonyOn) {
                startRecording(); // start again automatically
            }
        }, calculatedStopDiffTime);
    }
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
        return;
    }
    if (containsAnyNoteMessage(currentSequence)) {
        outputChannel += 1;
        console.log('==============================================');
        console.log('==============================================');
        console.log('==============================================');
        console.log('==============================================');
        console.log('==============================================');
        console.log('outputChannel + 1 ========================================= +1');
        console.log('==============================================');
        console.log('==============================================');
        console.log('==============================================');
        console.log('==============================================');
        console.log('==============================================');
        startLooping(currentSequence);
    } else {
        console.log("Sequence doesn't contain any NOTE_ON/OFF messages, so won't start the looper");
    }
    currentSequence = [];
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

function startLooping(sequence: MidiLoopSequence) {
    if (sequenceDuration <= 0) {
        // should never happen!
        return console.error('The sequence duration is not set while attempting to start looping.');
    }
    console.log('~~~ started the looper ~~~');
    let timePassed: number = 0;
    sequence.forEach((midiLoopItem: MidiLoopItem) => {
        const messageToSend: number[] = midiLoopItem.message.getRawData();
        startLoopCycle(messageToSend, midiLoopItem.deltaTime + timePassed);
        timePassed += midiLoopItem.deltaTime;
    });
}

function startLoopCycle(messageToSend: number[], scheduleTime: number) {
    // console.log('scheduling for: ' + scheduleTime + ' ms');
    setTimeout(() => {
        outputs[outputIndex].send(messageToSend);
        console.log('sent message: ' + decArrayToHexDisplay(messageToSend));
    }, scheduleTime);
    // repeat after every sequenceDuration
    setTimeout(() => startLoopCycle(messageToSend, scheduleTime), sequenceDuration);
}

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
    currentSequence.push({
        message: message.changeChannel(outputChannel + 1),
        time: Date.now(),
        deltaTime: calculateDeltaTime()
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

function calculateDeltaTime(): number {
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
    console.log('Control Change message for next song channels (R1): ' + decArrayToHexDisplay(message.getRawData()));
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
    sendToOpenSongChannels(message);
});

function sendToOpenSongChannels(message: ChannelVoiceMessage): void {
    for (let i = outputChannel + 1; i <= 15; i++) { // 16 MIDI Channels
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
