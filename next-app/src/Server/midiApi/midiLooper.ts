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

////////////
// Divers //
////////////
let tempoBpm: number = 120; // bpm
let absoluteTransposeValue = 0;
const transposeShift = 1; // TODO: user should be able to change this // Transpose +1 (absolute)

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
let sequenceCounter = 0;
interface MidiLoopSequence {
    sequenceStartTime: number; // ms
    items: MidiLoopItem[];
}

interface MidiLoopItem {
    message: ChannelVoiceMessage;
    /**
     * Time passed since the start of the sequence this item is part of
     */
    deltaTimeSequenceStart: number // number of milliseconds since the previous item
}

let recording = false;
let recordingChannel = 0; // Song MIDI channels (16 in total) // do not change to a different initial value
// TODO: add concept on how to delete missing Note off messages that stay too long in this array
// which reasons could there be for this situation to occur?
const sequences: MidiLoopSequence[] = [];

// const missingNoteOffMessages: number[] = [] // note values (first data byte)
interface MissingNoteOffMessage {
    /**
     * the key number of the NOTE_ON message
     */
    note: number;
    /**
     * the number of the sequence in which the message was recorded
     */
    sequenceNumber: number;
    /**
     * the channel in which the message was recorded
     */
    channel: number;
}
const missingNoteOffMessages: MissingNoteOffMessage[] = [];

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

    const msbCoarseTune = [0xB0, 0x65, 0x00]; // RPN MSB Coarse Tune (p.63)
    const lsbCoarseTune = [0xB0, 0x64, 0x02]; // RPN LSB Coarse Tune (p.63)
    // Check Effect button
    // TODO: add functionality later to this button
    if (!foundVocalHarmony) {
        if (areArraysEqual(message.rawData, EFFECT_ON)) {
            console.log('=== Effect on');
            outputs[outputIndex + 1].send(msbCoarseTune);
            outputs[outputIndex + 1].send(lsbCoarseTune);
            outputs[outputIndex + 1].send([0xB0, 0x06, 0x40 + transposeShift]);
            absoluteTransposeValue = transposeShift;
            transposeAllSequences(transposeShift);
            // isEffectOn = true;
        } else if (areArraysEqual(message.rawData, EFFECT_OFF)) {
            console.log('=== Effect off');
            // isEffectOn = false;
            outputs[outputIndex + 1].send(msbCoarseTune);
            outputs[outputIndex + 1].send(lsbCoarseTune);
            outputs[outputIndex + 1].send([0xB0, 0x06, 0x40]); // Tranpose 0 (absolute)
            absoluteTransposeValue = 0;
            transposeAllSequences(-transposeShift);
        }
    }
});

// Style Start/Stop
inputs[inputIndex].onMidiEvent('sys real time', (message: SystemRealTimeMessage) => {
    if (message.type as SystemRealTimeMessageType === SystemRealTimeMessageType.START) {
        // Initialize first sequence
        sequences.push({
            sequenceStartTime: Date.now(),
            items: []
        });
        startRecording();
    } else if (message.type as SystemRealTimeMessageType === SystemRealTimeMessageType.STOP) {
        stopRecording();
        midiTicksCount = 0;
    }
});

// Tempo (BPM)
inputs[inputIndex].onMidiEvent('sysex', (message: SystemExclusiveMessage) => {
    const sysExHeader: number[] = [0xF0, 0x43, 0x7E, 0x01]; // Tempo control
    for (let i = 0; i < sysExHeader.length; i++) {
        if (message.rawData[i] !== sysExHeader[i]) {
            return;
        }
    }
    tempoBpm = tempoSysExToBpm(message.rawData.slice(4, 8));
    console.log('Tempo (BPM): ' + tempoBpm);
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
        console.log('================================================================================');
        console.log('================================ SEQUENCE CUT ✂ ================================');
        console.log('================================================================================');
        sequenceCounter += 1;
        // Update sequence start time
        sequences[recordingChannel].sequenceStartTime = Date.now();
        for (let i = 0; i < recordingChannel; i++) {
            startSequencePlayback(i);
        }
        handleNewSequence(recordingChannel);
        // Prepare for next recording
        // we need to set the sequence start time regardless of whether we start a new recording or not
        // since the user could press the vocal harmony button later on
        if (isVocalHarmonyOn) {
            startRecording();
        } else {
            stopRecording();
        }
        midiTicksCount = 0;
    });
}

/**
 * This will increase the recordingChannel by 1 and initialize a new sequence
 * that can be filled with MIDI messages.
 */
function prepareForNextSequence() {
    sequences.push({
        sequenceStartTime: Date.now(),
        items: []
    });
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
    for (let i = 0; i < sequenceToLoop.items.length; i++) {
        const midiLoopItem: MidiLoopItem = sequenceToLoop.items[i];
        const messageToSend: number[] = midiLoopItem.message.getRawData();
        setTimeout(() => {
            outputs[outputIndex].send(messageToSend);
            console.log(`📣 Sent message (CH${sequenceIndex}): ${decArrayToHexDisplay(messageToSend)}`);
        }, midiLoopItem.deltaTimeSequenceStart);
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

function handleNewSequence(channel: number) {
    if (!containsAnyNoteMessage(sequences[channel].items)) {
        console.log("⌛ Sequence doesn't contain any NOTE_ON/OFF messages, so won't start the looper / skip this sequence");
        sequences[channel].items = [];
        return;
    }
    // prepare as fast as possible for next sequence so that new messages are registered correctly
    prepareForNextSequence();
    startSequencePlayback(channel);
}

// function cleanNoteOffMissing(sequenceNumber: number): void {
//     console.log('length of noteOffMissing: ' + missingNoteOffMessages.length);
//     for (let i = 0; i < missingNoteOffMessages.length; i++) {
//         if (missingNoteOffMessages[i].sequenceNumber !== sequenceNumber - 2) {
//             return;
//         }
//         missingNoteOffMessages.slice(i, 1);
//         console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ REMOVED ' + missingNoteOffMessages[i].note);
//     }
// }

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
    // Handle NOTE_OFF messages
    // Note that dealing with Yamaha keyboards, there are no NOTE_OFF messages
    // but instead NOTE_ON messages with velocity 0
    if (message.type as ChannelVoiceMessageType === ChannelVoiceMessageType.NOTE_ON) {
        if ((message as NoteOnMessage).attackVelocity === 0) {
            // NOTE_OFF message on Yamaha keyboards
            let foundNoteInMissingArray = false;
            for (let i = 0; i < missingNoteOffMessages.length; i++) {
                if (missingNoteOffMessages[i].note - absoluteTransposeValue !== (message as NoteOnMessage).note) {
                    continue;
                }
                foundNoteInMissingArray = true;
                const response = handlePotentiallyMissingNoteOffMessage(message as NoteOnMessage, missingNoteOffMessages[i], i);
                if (response === NoteOffMessageHandlingResponse.UNHANDLED) {
                    return; // (!) we don't want to include this in the current sequence (see below)
                }
            }
            if (!foundNoteInMissingArray && recording) {
                console.error(`Encountered NOTE_OFF message that is not registered in the missingNoteOffMessages`);
                return;
            }
        } else if (recording) { // don't register NOTE_ON messages when we are not recording
            // NOTE_ON message
            missingNoteOffMessages.push({
                note: (message as NoteOnMessage).note + absoluteTransposeValue,
                sequenceNumber: sequenceCounter,
                channel: recordingChannel
            });
        }
    }
    if (!recording) {
        return;
    }
    console.log('🎹 Channel Voice Message (Right1): ' + decArrayToHexDisplay(message.getRawData()));
    // TODO: what if we exceed 16 MIDI channels? --> Prevent TypeError (cannot read property of undefined)!!!
    // console.log('🎁🎁 Pushing Channel Voice Message');
    // console.log('pushing deltaTime: ' + (Date.now() - sequences[recordingChannel].sequenceStartTime));
    const messageToSend = message.type as ChannelVoiceMessageType === ChannelVoiceMessageType.NOTE_ON
        ? (message as NoteOnMessage).changeNote((message as NoteOnMessage).note + absoluteTransposeValue)
        : message;
    sequences[recordingChannel].items.push({
        message: messageToSend.changeChannel(recordingChannel),
        deltaTimeSequenceStart: Date.now() - sequences[recordingChannel].sequenceStartTime
    });
});

enum NoteOffMessageHandlingResponse {
    USUAL,
    UNHANDLED,
    ERROR
}

/**
 * 
 * @param message 
 * @param missingNoteOffIndex the index where the message was found in the missingNoteOffMessages-array
 */
function handlePotentiallyMissingNoteOffMessage(message: NoteOnMessage, missingItem: MissingNoteOffMessage, missingNoteOffIndex: number): NoteOffMessageHandlingResponse {
    switch (missingItem.sequenceNumber) {
        // key was pressed and released in the same sequence (normal case)
        case sequenceCounter:
            // console.log('Found usual NOTE_OFF message');
            missingNoteOffMessages.splice(missingNoteOffIndex, 1);
            return NoteOffMessageHandlingResponse.USUAL;

        // key was pressed and not released before sequence ended
        case sequenceCounter - 1:
            // sort the NOTE_OFF message to the previous channel
            console.log(`⚠ Found unhandled NOTE_OFF message! (pending: ${missingNoteOffMessages.length})`);
            if (!sequences[recordingChannel - 1].items.length) {
                console.error('Found a NOTE_OFF message, but no sequence prior to this one');
                return NoteOffMessageHandlingResponse.ERROR;
            }
            const messageTimeSinceSequenceStart = Date.now() - sequences[recordingChannel].sequenceStartTime;
            for (let i = 0; i < sequences[recordingChannel - 1].items.length; i++) {
                const previousSequenceItem = sequences[recordingChannel - 1].items[i];
                if (messageTimeSinceSequenceStart > previousSequenceItem.deltaTimeSequenceStart) {
                    continue;
                }
                const newNoteOffItem: MidiLoopItem = {
                    message: (message as NoteOnMessage).changeChannel(recordingChannel - 1),
                    deltaTimeSequenceStart: messageTimeSinceSequenceStart
                };
                // insert new message in sequence at index i
                sequences[recordingChannel - 1].items.splice(i, 0, newNoteOffItem);
                // we found a NOTE_OFF for the note indicated in missingNoteMessages
                // so we can remove the element from there
                missingNoteOffMessages.splice(missingNoteOffIndex, 1);
                return NoteOffMessageHandlingResponse.UNHANDLED; // we placed the new item, so this function did all it was supposed to do
            }

        // key was pressed and not released in at least one subsequent sequence (organ point)
        default:
            // key is constantly being pressed, so no need to send NOTE_ON messages in subsequent sequences
            console.log(`⚠ Found organ point (no NOTE_ON message needed)`);
            missingNoteOffMessages.splice(missingNoteOffIndex, 1);
            let found = false;
            for (let i = sequences[missingItem.channel].items.length - 1; i >= 0; i--) {
                if (sequences[missingItem.channel].items[i].message.type !== ChannelVoiceMessageType.NOTE_ON) {
                    continue;
                }
                if ((sequences[missingItem.channel].items[i].message as NoteOnMessage).attackVelocity === 0) {
                    continue;
                }
                // we are now dealing with a 'real' (velocity greater than 0) NOTE_ON message that we want to delete
                sequences[missingItem.channel].items.splice(i, 1);
                found = true;
                break;
            }
            if (!found) {
                console.error(`Missing item couldn't be found in the respective channel, so we can't remove the NOTE_ON message`);
                return NoteOffMessageHandlingResponse.ERROR;
            }
            return NoteOffMessageHandlingResponse.UNHANDLED;
    }
}

////////////////////////
// Messages redirects //
////////////////////////
// Redirect Control Change Messages (e.g. volume/effect changes, selection of another instrument in the same bank)
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

// Redirect Program Change Messages (i.e. instrument bank is changed)
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

// Redirect System Exclusive Messages
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
function containsAnyNoteMessage(items: MidiLoopItem[]): boolean {
    return items.some((item: MidiLoopItem) => {
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

/**
 * 
 * @param transposeValue range -24...0...+24
 */
function transposeAllSequences(transposeValue: number) {
    for (let i = 0; i < sequences.length; i++) {
        for (let j = 0; j < sequences[i].items.length; j++) {
            const item: MidiLoopItem = sequences[i].items[j];
            if (item.message.type !== ChannelVoiceMessageType.NOTE_ON) {
                continue;
            }
            const noteOnMessage = item.message as NoteOnMessage;
            sequences[i].items[j].message = noteOnMessage.changeNote(noteOnMessage.note + transposeValue);
        }
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

/////////////
// Cleanup //
/////////////
// see https://stackoverflow.com/a/14032965/9655481
// and https://stackoverflow.com/a/49392671/9655481
[`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType: any) => {
    process.on(eventType, (exitCode: number) => {
        console.log('========================================================');
        console.log('========================================================');
        console.log('========================================================');
        console.log('========================================================');
        if (exitCode) console.log('exitCode: ' + exitCode);
        cleanup();
        process.exit(exitCode);
    });
});

function cleanup() {
    // NOTE_OFF messages for every key on every channel (in every output)
    outputs.forEach((output: Output) => {
        for (let i = 0; i <= 127; i++) {
            for (let j = 0; j <= 15; j++) {
                output.send([0x90 + j, i, 0x00]);
            }
        }
    });
}