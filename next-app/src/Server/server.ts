// Next.js with socket.io: https://github.com/sergiodxa/next-socket.io/blob/master/server.js

// https://medium.com/factory-mind/websocket-node-js-express-step-by-step-using-typescript-725114ad5fe4
// https://blog.logrocket.com/websockets-tutorial-how-to-go-real-time-with-node-and-react-8e4693fbf843/
// The web has traveled a long way to support full-duplex (or two-way)
// communication between a client and server. This is the prime intention of the
// WebSocket protocol: to provide persistent real-time communication between the
// client and the server over a single TCP socket connection.

// https://medium.com/dailyjs/combining-react-with-socket-io-for-real-time-goodness-d26168429a34

import express from 'express';
import http from 'http';
import next from 'next';
import socketIo from 'socket.io';
import path from 'path';
import fs from 'fs';

// import { watchYamahaRegistration } from './midiHandler';
// import { linkMidiToReg } from './RegMidiAssigner';
import config from '../../../init-app/config.json';
import { RegIndexMapping } from './serverApi';
import { FileWithRawData } from '../fileUtil';
import { linkMidiToRegAndMap, addPdfFilesToServer, saveRegIndexMap } from './webSocketsHandler';
import { watchRegChanges } from './midiLiveHandler';

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const expressApp = express();
const nextHandler = nextApp.getRequestHandler();
const httpServer = http.createServer(expressApp);
const io = socketIo(httpServer);

export const staticLiveFilesFolderPath: string = process.env.NODE_ENV === 'production'
    ? path.join(__dirname + '../../../../..', 'static-live-files') // additional .. to go out of dist folder
    : path.join(__dirname + '../../..', 'static-live-files');

let regIndexMap: RegIndexMapping[] = [
    // default
    {
        regName: 'Test.RGT',
        midiIndex: 0
    }
];

///////////////////////////////////
// Socket.io server (Websockets) //
///////////////////////////////////
require('./serverApi'); // inti socket.io-client to socket.io connection
io.on('connection', (socket: socketIo.Socket) => {
    // Connect new user
    console.log(`${new Date()} received new connection from socket id ${socket.id}`);

    // === Save PDF files on server
    socket.on('postPDFs', async (pdfFiles: FileWithRawData[]) => {
        addPdfFilesToServer(pdfFiles);
    });

    // === Save JSON RegIndexMap on server
    socket.on('postMap', (regIndexMap: RegIndexMapping[]) => {
        saveRegIndexMap(regIndexMap);
    });

    // === Link Midi Files to Registration Memory Files
    socket.on('subscribeLinkMidiToReg', (regFiles: FileWithRawData[]) => {
        linkMidiToRegAndMap(socket, regFiles);
    });

    // === RegChange
    socket.on('subscribeRegChange', () => {
        console.log(`client (socket id ${socket.id}) subscribed to RegChange`);
        watchRegChanges(regIndexMap /*can't be changed later on (!)*/, (regFilename: string) => {
            socket.emit('regChange', regFilename);
        });
    });
});

//////////////////////////////////
// Next.js + Express (Frontend) //
//////////////////////////////////
export type PdfFilenamesResponseData = {
    pdfFilenames: string[]
};

export type RegIndexMapResponseData = {
    regIndexMap: RegIndexMapping[]
};

nextApp.prepare().then(() => {
    // Static Live files
    expressApp.use(express.static('static-live-files'));

    expressApp.get('/api/pdfs', (_req, res: express.Response<PdfFilenamesResponseData>) => {
        const pdfDirPath: string = path.join(staticLiveFilesFolderPath, 'pdfs');
        fs.readdir(pdfDirPath, (err, files) => {
            if (err) {
                console.log('Unable to scan directory: ' + err);
                return res.status(500);
                // return res.status(500).json({ status: "error", message: "Unable to scan directory - " + err });
            }
            return res.status(200).json({ pdfFilenames: files });
        });
    });

    expressApp.get('/api/map', (_req, res: express.Response<RegIndexMapResponseData>) => {
        const regIndexMapPath: string = path.join(staticLiveFilesFolderPath, 'RegIndexMap.json');
        if (!fs.existsSync(regIndexMapPath)) {
            return res.status(200).json({ regIndexMap: [] });
        } else {
            fs.readFile(regIndexMapPath, (err, data: Buffer) => {
                if (err) {
                    return res.status(500);
                    // return res.status(500).json({ status: "error", message: "Unable to read file - " + err });
                }
                return res.status(200).json({ regIndexMap: JSON.parse(data.toString()) });
            });
        }
    });

    expressApp.get('/regIndexMap', (_req, res) => {
        res.json(regIndexMap);
    });

    expressApp.get('/api/ping', (_req, res) => {
        console.log('=================== in ping =================');
        return res.send('pong');
    });

    expressApp.get('*', (req, res) => {
        return nextHandler(req, res);
    });

    httpServer.listen(`${config.server.port}`, () => {
        if (process.env.NODE_ENV === 'production') {
            console.log(`listening on ${config.accessPoint.ipStatic}:${config.server.port}/`);
        } else {
            console.log(`listening on localhost:${config.server.port}/`);
        }
    });
});
