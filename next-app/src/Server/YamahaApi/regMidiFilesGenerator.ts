/**
 * Generate MIDI files containing nothing but the bare commands to select a patch (bank select + program change).
 */

// import fs = require('fs');

// function constructRegMidiFiles() {
//     let songNr: number = 0;
//     outerLoop: for (let msb = 0; msb <= 3; msb++) {
//         for (let lsb = 0; lsb <= 127; lsb++) {
//             if (songNr > 499) { break outerLoop; }

//             // press the first Registration Memory button
//             const programChange: number = 0;

//             let data: number[] = [0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06];
//             data = data.concat([0x00, 0x00, 0x00, 0x01, 0x07, 0x80]);
//             data = data.concat([0x4D, 0x54, 0x72, 0x6B, 0x00, 0x00, 0x00, 0x0E]);
//             data = data.concat([0x00, 0xB0, 0x00, msb, 0x00, 0x20, lsb]);
//             data = data.concat([0x00, 0xC0, programChange, 0x00, 0xFF, 0x2F, 0x00]);

//             const songNrFormatted: string = getStringSequenceNumber(songNr);
//             const path: string = `./src/RegMidiFiles/RegMidi_${songNrFormatted}.mid`;
//             songNr++;

//             writeMidiFile(path, data);
//         }
//     }
//     console.log(`RegMidiFiles were saved`);
// }

// function writeMidiFile(path: string, rawData: number[]) {
//     const buffer = Buffer.from(rawData);
//     fs.writeFile(path, buffer, (err) => {
//         if (err) {
//             console.log(err.message);
//         }
//         console.log(`saved file ${path}`);
//     });
// }

export function getStringSequenceNumber(i: number) {
    return i.toString().padStart(3, '0');
}

// // https://stackoverflow.com/a/13240395
// function decToHex(d: number): string {
//     return ('0' + (Number(d).toString(16))).slice(-2).toUpperCase();
// }

// // gist.github.com/faisalman/4213592
// function decToBin(d: number) {
//     return parseInt(String(d), 10).toString(2);
// }