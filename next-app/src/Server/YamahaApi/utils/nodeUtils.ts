/**
 * @param array The array to slice
 * @param start The beginning of the specified portion of the array.
 * @param length The length of the sub-array beginning at start.
 */
export function sliceByLength(array: number[], start: number, length: number): number[] {
    return array.slice(start, start + length);
}

// https://stackoverflow.com/a/9034019
export function decToHex(decimal: number, charsCount: number): string {
    return (decimal + Math.pow(16, charsCount)).toString(16).slice(-charsCount).toUpperCase();
}

// https://stackoverflow.com/a/13240395
// function decToHex2(d: number): string {
//     return ('0' + (Number(d).toString(16))).slice(-2).toUpperCase();
// }

// https://stackoverflow.com/a/9034019
// export function decToHex(decimal: number, charsCount: number) {
//     return (decimal + Math.pow(16, charsCount)).toString(16).slice(-charsCount).toUpperCase();
// }

// gist.github.com/faisalman/4213592
export function decToBin(d: number) {
    return parseInt(String(d), 10).toString(2);
}

/**
 * Convert decimal number to hex numbers and fill up array with 0s up to the specified byte length.
 * Note that this does NOT make sure that the actual length of the array will be byteLength. It is just
 * filling up the remaining indices in the array if there are any.
 * @param dec the decimal number to convert to hex numbers
 * @param byteLength desired byte length up to which  remaining indices are filled with 0s
 */
export function decToHexNumbers(dec: number, byteLength: number): number[] {
    const hexLength: number = byteLength * 2;
    const hexString: string = dec.toString(16).padStart(hexLength, '0');
    const hexNumbers: number[] = [];
    for (let i = 0; i < hexLength; i += 2) {
        hexNumbers.push(parseInt(hexString.substr(i, 2), 16));
    }
    const missingBytes: number = byteLength - hexNumbers.length;
    if (missingBytes > 0) {
        for (let i = 0; i < missingBytes; i++) {
            hexNumbers.unshift(0);
        }
    }
    return hexNumbers;
}

export function hexArrayToDec(hex: number[]): number {
    let hexString: string = '';
    hex.forEach((value: number) => {
        hexString += value.toString(16).padStart(2, '0');
    });
    return parseInt(hexString, 16);
}

export function concatJsonNumberValues(json: string): number[] {
    const numbers: number[] = [];
    JSON.parse(json, (_, value) => {
        if (typeof value !== 'object' && typeof value === 'number') {
            numbers.push(value);
        }
    });
    return numbers;
}

// https://stackoverflow.com/a/4025958
export function areArraysEqual(arr1: any, arr2: any) {
    if (arr1.length !== arr2.length) { return false; }
    for (let i = arr1.length; i--;) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}

// https://stackoverflow.com/a/20798567
export function findAllIndexesForValue(array: number[], searchValue: number): number[] {
    const indexes: number[] = [];
    array.forEach((value: number, i: number) => {
        if (value === searchValue) {
            indexes.push(i);
        }
    });
    return indexes;
}

export function findFirstIndexForArray(array: number[], searchValues: number[]): number[] {
    if (!array || !searchValues) {
        return [];
    }

    const firstSearchValueIndexes: number[] = findAllIndexesForValue(array, searchValues[0]);
    if (!firstSearchValueIndexes) {
        return [];
    }

    firstSearchValueIndexes.forEach((index: number) => {
        let isSearchArray = true;
        searchValues.slice(1).every((value: number, i: number) => {
            if (!array[index + 1 + i] || array[index + 1 + i] !== value) {
                isSearchArray = false;
                return false;
            }
        });
        if (isSearchArray) {
            return index;
        }
    });

    return [];
}

export function findAllIndexesForArray(array: number[], searchValues: number[]): number[] {
    if (!array || !searchValues) {
        return [];
    }

    const firstSearchValueIndexes: number[] = findAllIndexesForValue(array, searchValues[0]);
    if (!firstSearchValueIndexes) {
        return [];
    }

    const indexes: number[] = [];
    firstSearchValueIndexes.forEach((index: number) => {
        let isSearchArray = true;
        searchValues.slice(1, searchValues.length + 1).every((value: number, i: number) => {
            if (!array[index + 1 + i] || array[index + 1 + i] !== value) {
                isSearchArray = false;
                return false;
            }
        });
        if (isSearchArray) {
            indexes.push(index);
        }
    });

    return indexes;
}

export function copyDeep(object: Object): Object {
    return JSON.parse(JSON.stringify(object));
}