import { YamahaRegMemory, BHd, GPm } from "../regTypes";

/**
 * Get the shortened Registration Memory filename without the .RGT suffix.
 * If there is an icon number in front of .RGT, this will get cut off as well.
 * 
 * *Examples*:
 * - Test.S970.RGT --> Test
 * - Test2.RGT --> Test2
 * @param filename the equivalent of a FQDN, just for a .RGT files
 */
export function getShortenedRegFilename(filename: string): string {
    let lastIndex: number;
    // matches xyz.S970.RGT, xyz.s123.RGT but NOT xyz.S1234.RGT or xyz.sabc.RGT
    const matchExtended: RegExpMatchArray | null = filename.toUpperCase().match(/\.S\d{3}\.RGT/);
    if (matchExtended) { // cut off "S970.RGT"
        lastIndex = filename.toUpperCase().lastIndexOf(matchExtended[matchExtended.length - 1]);
    } else { // only cut off ".RGT"
        const matchNotExtended: RegExpMatchArray = filename.toUpperCase().match(/.RGT/) as RegExpMatchArray;
        lastIndex = filename.toUpperCase().lastIndexOf(matchNotExtended[matchNotExtended.length - 1]);
    }
    return filename.substring(0, lastIndex);
}

export function regMemoryToUint8Array(regMemory: YamahaRegMemory): Uint8Array {
    const regMemoryNumbersConcatenated: number[] = concatJsonNumberValues(JSON.stringify(regMemory));
    return Uint8Array.from(regMemoryNumbersConcatenated);
}

function concatJsonNumberValues(json: string): number[] {
    const numbers: number[] = [];
    JSON.parse(json, (_key, value) => {
        if (typeof value !== 'object' && typeof value === 'number') {
            numbers.push(value);
        }
    });
    return numbers;
}

export function getIndexToPushGpm(bhd: BHd, gpmType: number) {
    // find index where to push
    let gpmIndexAfterWhichToPush: number = 0;
    bhd.gpms.some((gpm: GPm) => {
        if (gpm.type < gpmType) {
            gpmIndexAfterWhichToPush = gpm.type;
            return false;
        } else {
            return true;
        }
    });
    return gpmIndexAfterWhichToPush;
}

export function hasGpmType(bhd: BHd, gpmType: number) {
    for (let i = 0; i < bhd.gpms.length; i++) {
        if (bhd.gpms[i].type === gpmType) {
            return true;
        }
    }
    return false;
}

// /**
//  * Convert decimal number to hex numbers and fill up array  with 0s up to the specified byte length.
//  * Note that this does NOT make sure that the actual length of the array will be byteLength. It is just
//  * filling up the remaining indices in the array if there are any.
//  * @param dec the decimal number to convert to hex numbers
//  * @param byteLength desired byte length up to which  remaining indices are filled with 0s
//  */
// export function decToHexNumbers(dec: number, byteLength: number): number[] {
//     const hexLength: number = byteLength * 2;
//     const hexString: string = dec.toString(16).padStart(hexLength, '0');
//     const hexNumbers: number[] = [];
//     for (let i = 0; i < hexLength; i += 2) {
//         hexNumbers.push(parseInt(hexString.substr(i, 2), 16));
//     }
//     const missingBytes: number = byteLength - hexNumbers.length;
//     if (missingBytes > 0) {
//         for (let i = 0; i < missingBytes; i++) {
//             hexNumbers.unshift(0);
//         }
//     }
//     return hexNumbers;
// }