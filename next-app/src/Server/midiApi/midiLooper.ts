import { getInputNames, Input } from "./midiInput";
import { getOutputNames, Output } from "./midiOutput";
// import {MidiMessage} from './midiTypes';
import { SystemExclusiveMessage, /*SystemExclusiveMessageType*/ } from './midiTypes';
import { SystemRealTimeMessage, SystemRealTimeMessageType } from './midiTypes';
// import {SystemCommonMessage, SystemCommonMessageType} from './midiTypes';
import { ChannelVoiceMessage, ChannelVoiceMessageType, NoteOnMessage, ControlChangeMessage, ProgramChangeMessage } from './midiTypes';
import { areArraysEqual, decArrayToHexDisplay } from "../YamahaApi/utils/nodeUtils";

//////////////
// MIDI I/O //
//////////////
let inputs: Input[] = [];
let outputs: Output[] = [];
const inputIndex = 1;
const outputIndex = 1;
initMidiIo();

////////////////
// MIDI Clock //
////////////////
let midiTicksCount = 0; // 24 messages are sent per quarter note
timePlaybackAndRecordings();

/////////////////////////////
// Buttons on Yamaha Tyros //
/////////////////////////////
let isVocalHarmonyOn = false;
const VOCAL_HARMONY_ON = [0xF0, 0x43, 0x10, 0x4C, 0x04, 0x00, 0x0C, 0x40, 0xF7];
const VOCAL_HARMONY_OFF = [0xF0, 0x43, 0x10, 0x4C, 0x04, 0x00, 0x0C, 0x7F, 0xF7];
// let isEffectOn = false;
const EFFECT_ON = [0xF0, 0x43, 0x10, 0x4C, 0x03, 0x05, 0x0C, 0x40, 0xF7];
const EFFECT_OFF = [0xF0, 0x43, 0x10, 0x4C, 0x03, 0x05, 0x0C, 0x7F, 0xF7];

/////////////////////////////////
// Sequence recording settings // 
/////////////////////////////////
// standard: one sequence is 4 measures long --> can't be changed while playing
const sequenceLengthInMeasures = 4; // TODO: user should be able to change this
const numeratorTimeSignature = 4; // TODO: user should be able to change this
const denominatorTimeSignature = 4; // TODO: user should be able to change this
// how many quarter notes fit in one measure?
const quarterNotesPerMeasure = (numeratorTimeSignature * 4) / denominatorTimeSignature;
const quarterNotesPerSequence = quarterNotesPerMeasure * sequenceLengthInMeasures;
const midiTicksPerSequence = quarterNotesPerSequence * 24; // 24 MIDI Clock messages are sent per quarter note

/////////////////////////////////
// Sequence recordings storage //
/////////////////////////////////
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
// let nextCalculatedStopTime = -1; // ms
const sequences: MidiLoopSequence[] = new Array(16); // root data structure for recorded sequences
// const sequences: MidiLoopSequence[] = Array(16).fill([]); // will pass []-Object by reference 😒
for (let i = 0; i < sequences.length; i++) {
    sequences[i] = [];
}

// let currentSequence: MidiLoopSequence = [];
// TODO: add concept on how to delete missing Note off messages that stay too long in this array
// which reasons could there be for this situation to occur?
const missingNoteOffMessages: number[] = [] // note values (first data byte)
let tempoBpm: number = 120; // bpm

/**
 * Initialize MIDI inputs and outputs
 */
function initMidiIo() {
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

//////////////////////////
// Keyboard interaction //
//////////////////////////
// Vocal Harmony and Effect buttons
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

// Style Start
inputs[inputIndex].onMidiEvent('sys real time', (message: SystemRealTimeMessage) => {
    if (message.type as SystemRealTimeMessageType === SystemRealTimeMessageType.START) {
        recordingStartTime = Date.now();
        startRecording();
    }
});

/////////////////
// Tempo (BPM) //
/////////////////
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
    return Math.floor(60000000 / totalTempo);
    // return 60000000 / totalTempo;
}

//////////////////////////////
// Sequence timing/playback //
//////////////////////////////
/**
 * Listen to MIDI Clock messages sent by the Tyros (0xF8) 24x per quarter note
 * and time playback of already recorded sequences
 */
function timePlaybackAndRecordings() {
    inputs[inputIndex].onMidiEvent('sys real time', (message: SystemRealTimeMessage) => {
        if (message.type !== SystemRealTimeMessageType.TIMING_CLOCK) {
            return;
        }
        midiTicksCount += 1;
        if (midiTicksCount !== midiTicksPerSequence) {
            return;
        }
        console.log('================================ SEQUENCE CUT ✂ ================================');
        sequenceDuration = Date.now() - recordingStartTime;
        for (let i = 0; i < recordingChannel; i++) {
            startSequencePlayback(i);
        }
        handleNewRecording(recordingChannel);
        recordingStartTime = Date.now();
        // Prepare for next recording
        if (isVocalHarmonyOn) {
            startRecording();
        } else {
            stopRecording();
        }
        midiTicksCount = 0;
    });
}

function increaseRecordingChannel() {
    recordingChannel += 1;
    console.log(`Recording Channel increased ↑ to CH ${recordingChannel}`);
}

/**
 * 
 * @param i Sequence index in sequences array
 * @param sequence 
 */
function startSequencePlayback(sequenceIndex: number) {
    console.log('🎧 Playback sequence on CH' + sequenceIndex);
    const sequenceToLoop = sequences[sequenceIndex];
    let timePassed: number = 0;
    for (let i = 0; i < sequenceToLoop.length; i++) {
        const midiLoopItem: MidiLoopItem = sequenceToLoop[i];
        const messageToSend: number[] = midiLoopItem.message.getRawData();
        setTimeout(() => {
            outputs[outputIndex].send(messageToSend);
            console.log(`📣 Sent message (CH${sequenceIndex}): ${decArrayToHexDisplay(messageToSend)}`);
        }, midiLoopItem.deltaTime + timePassed);
        timePassed += midiLoopItem.deltaTime;
    }
}

function startRecording() {
    recording = true;
    console.log(`Live! Now recording for Song CH(${recordingChannel})...`);
}

function stopRecording() {
    recording = false;
    console.log(`...Stopped recording for Song CH(${recordingChannel})`);
    if (midiTicksCount !== midiTicksPerSequence) {
        // user pressed vocal harmony OFF before calculated end
        console.log('User pressed Vocal Harmony OFF before calculated end was reached');
    }
}

function handleNewRecording(channel: number) {
    if (!containsAnyNoteMessage(sequences[channel])) {
        console.log("❌ Sequence doesn't contain any NOTE_ON/OFF messages, so won't start the looper / skip this sequence");
        sequences[recordingChannel] = [];
        return;
    }
    increaseRecordingChannel(); // increase as fast as possible for new messages to be registered correctly
    startSequencePlayback(channel);
    for (let i = 0; i < sequences[channel].length; i++) {
        const midiLoopItem: MidiLoopItem = sequences[channel][i];
        if ((midiLoopItem.message as ChannelVoiceMessage).type === ChannelVoiceMessageType.NOTE_ON) {
            const noteOnMessage: NoteOnMessage = midiLoopItem.message as NoteOnMessage;
            if (noteOnMessage.attackVelocity !== 0) { // 'real' NOTE_ON message
                missingNoteOffMessages.push(noteOnMessage.note);
            } else { // NOTE_OFF message (NOTE_ON message with attack velocity 0)
                const firstIndex: number = missingNoteOffMessages.indexOf(noteOnMessage.note);
                if (firstIndex !== -1) {
                    missingNoteOffMessages.splice(firstIndex, 1);
                } else {
                    console.error('Should not happen since we are absorbing these messing prior to saving them in the sequence!');
                }
            }
        }
    }
}

////////////////////////
// Messages recording //
////////////////////////
// Record Channel Voice Messages
inputs[inputIndex].onMidiEvent('channel voice message', (message: ChannelVoiceMessage) => {
    if (message.type === undefined) {
        return;
    }
    if (message.channel !== 0) {
        return;
    }
    console.log('🎹 Channel Voice Message (Right1): ' + decArrayToHexDisplay(message.getRawData()));
    if (message.type as ChannelVoiceMessageType === ChannelVoiceMessageType.NOTE_ON
        && (message as NoteOnMessage).attackVelocity === 0) { // NOTE_OFF message (Yamaha)
        if (missingNoteOffMessages.includes((message as NoteOnMessage).note)) {
            // Put NOTE_OFF message to beginning of last sequence
            console.log(`found unhandled NOTE_OFF! (pending: ${missingNoteOffMessages.length})`);

            if (!sequences[recordingChannel - 1]) {
                console.error('Should never happen: found a NOTE_OFF message in the first sequence');
            } else {
                const insertTime: number = Date.now() - sequenceDuration;
                for (let i = 0; i < sequences[recordingChannel - 1].length; i++) {
                    if (insertTime <= sequences[recordingChannel - 1][i].time) {
                        const deltaTime: number = i === 0
                            ? (insertTime - recordingStartTime) % sequenceDuration
                            : insertTime - sequences[recordingChannel - 1][i - 1].time;
                        const newNoteOffItem: MidiLoopItem = {
                            message: (message as NoteOnMessage).changeChannel(recordingChannel - 1),
                            time: insertTime,
                            deltaTime: deltaTime
                        };
                        const nextItem: MidiLoopItem = sequences[recordingChannel - 1][i];
                        nextItem.deltaTime = nextItem.time - insertTime;
                        // insert new message in sequence at index i
                        sequences[recordingChannel - 1].splice(i, 0, newNoteOffItem);

                        // we found a NOTE_OFF for the note indicated in missingNoteMessages
                        // so we can remove the element from there
                        missingNoteOffMessages.splice(missingNoteOffMessages.lastIndexOf((message as NoteOnMessage).note), 1);
                        return; // we don't want to include this in the current sequence! (see below)
                    }
                }
            }
        }
    }
    if (!recording) {
        return;
    }
    // TODO: what if we exceed 16 MIDI channels? --> Prevent TypeError (cannot read property of undefined)!!!
    sequences[recordingChannel].push({
        message: message.changeChannel(recordingChannel),
        time: Date.now(),
        deltaTime: calculateDeltaTime(sequences[recordingChannel])
    });
});

function calculateDeltaTime(currentSequence: MidiLoopSequence): number {
    if (!currentSequence.length) { // first MIDI event in this sequence
        // return sequenceDuration
        //     ? (Date.now() - recordingStartTime) % sequenceDuration
        //     : Date.now() - recordingStartTime;
        return Date.now() - recordingStartTime;
    } else { // second, third ... MIDI event in this sequence
        return Date.now() - currentSequence[currentSequence.length - 1].time
    }
}

// Record Control Change Messages (e.g. volume/effect changes, selection of another instrument in the same bank)
inputs[inputIndex].onMidiEvent('cc', (message: ControlChangeMessage) => {
    // we want this to apply for situations when we don't record as well (!)
    if (message.type === undefined) {
        return;
    }
    if (message.channel !== 0) {
        return;
    }
    console.log('🎹 Control Change Message for next song channels (Right1): ' + decArrayToHexDisplay(message.getRawData()));
    sendToOpenSongChannels(message);
});

// Record Program Change Messages (i.e. instrument bank is changed)
inputs[inputIndex].onMidiEvent('program', (message: ProgramChangeMessage) => {
    if (message.type === undefined) {
        return;
    }
    if (message.channel !== 0) {
        return;
    }
    console.log('🎹 Program change message for next song channels (Righ1): ' + decArrayToHexDisplay(message.getRawData()));
    sendToOpenSongChannels(message);
});

// Record System Exclusive Messages
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

/////////////
// Utility //
/////////////
function containsAnyNoteMessage(sequence: MidiLoopSequence): boolean {
    return sequence.some((item: MidiLoopItem) => {
        if (item.message.type === ChannelVoiceMessageType.NOTE_ON
            || item.message.type === ChannelVoiceMessageType.NOTE_OFF) {
            return true;
        }
        return false;
    });
}

function sendToOpenSongChannels(message: ChannelVoiceMessage): void {
    for (let i = recordingChannel; i <= 15; i++) { // 16 MIDI Channels
        outputs[outputIndex].send(message.changeChannel(i).getRawData());
    }
}

// inputs[inputIndex].onMidiEvent('message', (message: MidiMessage) => {
//     if (!message.type) {
//         if (message.rawData) {
//             return console.log('~~ type is undefined: ' + decArrayToHexDisplay(message.rawData));
//         }
//         return console.log('~~ type undefined');
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
