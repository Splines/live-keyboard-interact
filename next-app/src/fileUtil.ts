interface FileWithData {
    name: string,
    lastModified: number,
    data: string | ArrayBuffer | null
}

export interface FileWithRawData extends FileWithData {
    data: ArrayBuffer;
}

export interface FileWithTextData extends FileWithData {
    data: string
}

enum FileType {
    String,
    ArrayBuffer
}

export async function getFilesWithArrayBufferData(files: File[]): Promise<FileWithRawData[]> {
    return Promise.all(files.map((file: File) => getFileWithData(file, FileType.ArrayBuffer) as Promise<FileWithRawData>));
}

export async function getFilesWithTextData(files: File[]): Promise<FileWithTextData[]> {
    return Promise.all(files.map((file: File) => getFileWithData(file, FileType.String) as Promise<FileWithTextData>));
}

function getFileWithData(file: File, fileType: FileType): Promise<FileWithData> {
    return new Promise<FileWithData>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject();
        reader.onload = () => {
            resolve({
                name: file.name,
                lastModified: file.lastModified,
                data: reader.result
            });
        };
        if (fileType === FileType.String) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
}