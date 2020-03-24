import fs from 'fs';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';

export type PdfFilenamesResponseData = {
    pdfFilenames: string[]
};

export default async (_req: NextApiRequest, res: NextApiResponse<PdfFilenamesResponseData>) => {
    const pdfDirPath: string = path.join('./public/pdfs');
    fs.readdir(pdfDirPath, (err, files) => {
        if (err) {
            console.log('Unable to scan directory: ' + err);
            return res.status(500);
            // return res.status(500).json({ status: "error", message: "Unable to scan directory - " + err });
        }
        return res.status(200).json({ pdfFilenames: files });
    });
};