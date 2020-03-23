import { FileWithRawData } from './Server/serverApi';

export async function getDataForFiles(files: File[]): Promise<FileWithRawData[]> {
    return Promise.all(files.map((file: File) => readAsArrayBufferPromise(file)));
}

function readAsArrayBufferPromise(file: File): Promise<FileWithRawData> {
    return new Promise<FileWithRawData>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject();
        reader.onload = () => {
            // this does NOT work --> error unhandled promise exception, why ???
            // resolve({ ...file, data: reader.result as ArrayBuffer});
            resolve({
                name: file.name,
                lastModified: file.lastModified,
                data: reader.result as ArrayBuffer
            });
        };
        reader.readAsArrayBuffer(file);
    });
}