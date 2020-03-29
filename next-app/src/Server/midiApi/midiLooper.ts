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
let nextCalculatedStopTime = -1; // ms
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
    } else if (nextCalculatedStopTime < 0) { // only schedule a next stop time, if there isn't already one scheduled
        const calculatedStopDiffTime: number = sequenceDuration - ((Date.now() - recordingStartTime) % sequenceDuration);
        nextCalculatedStopTime = Date.now() + calculatedStopDiffTime;
        setTimeout(() => {
            nextCalculatedStopTime = -1;
            stopRecording();
            if (isVocalHarmonyOn) {
                startRecording();
            }
        }, calculatedStopDiffTime);
    }
    recording = true;
}

function stopRecording() {
    if (outputChannel < 0) {
        // first time stopping the recorder
        sequenceDuration = Date.now() - recordingStartTime;
    }
    recording = false;
    if (nextCalculatedStopTime > 0 && Date.now() < nextCalculatedStopTime) {
        // user pressed Vocal harmony OFF before calculated end
        // don't stop this sequence yet
        console.log('User pressed Vocal harmony OFF before calculated end was reached');
        return;
    }
    if (currentSequence.length) { // TODO: change to: if there is no NOTE_ON message
        outputChannel += 1;
        startLooping(currentSequence, outputChannel);
        currentSequence = [];
    } else {
        console.log("Sequence doesn't contain any NOTE_ON messages, so won't start the looper");
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
    for (let i = 0; i < 15; i++) {
        let sequenceStartTime: number = i * sequenceDuration;
        sequence.forEach((midiLoopItem: MidiLoopItem, i: number) => {
            const deltaTime: number = sequence[i - 1]
                ? midiLoopItem.time - sequence[i - 1].time
                : (midiLoopItem.time - recordingStartTime) % sequenceDuration;
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
