import fs from 'fs';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';
import { RegIndexMapping } from '../../src/Server/serverApi';

export type RegIndexMapResponseData = {
    regIndexMap: RegIndexMapping[]
};

export default async (_req: NextApiRequest, res: NextApiResponse<RegIndexMapResponseData>) => {
    const regIndexMapPath: string = path.join('./public/RegIndexMap.json');
    if (!fs.existsSync(regIndexMapPath)) {
        return res.status(200).json({ regIndexMap: [] });
    } else {
        fs.readFile(regIndexMapPath, (err, data: Buffer) => {
            if (err) {
                return res.status(500).json({ status: "error", message: "Unable to read file - " + err });
            }
            return res.status(200).json({ regIndexMap: JSON.parse(data.toString()) });
        });
    }
};