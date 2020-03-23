import fs from 'fs';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
    pdfFiles: string[]
};

export default async (req: NextApiRequest, res: NextApiResponse<ResponseData>) => {
    if (req.method === 'POST') {
        // TODO: Implement POST endpoint
        // add file to folder public/pdfs
        res.status(200).json({ pdfFiles: [] });
    } else if (req.method === 'DELETE') {
        // TODO: Implement DELETE endpoint
        // delete file in folder public/pdfs
    } else if (req.method === 'GET') {
        const pdfDirPath: string = path.join('./public/pdfs');
        fs.readdir(pdfDirPath, (err, files) => {
            if (err) {
                console.log('Unable to scan directory: ' + err);
                return res.status(500).json({ pdfFiles: [] });
            }
            return res.status(200).json({ pdfFiles: files });
        });
    }
};