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
// import fs from 'fs';
// import path from 'path';

// import { watchYamahaRegistration } from './midiHandler';
// import { linkMidiToReg } from './RegMidiAssigner';
import config from '../../../init-app/config.json';
import { RegIndexMapping, FileWithRawData } from './serverApi';
import { linkMidiToRegAndMap } from './webSocketsHandler';
import { watchRegChanges } from './midiLiveHandler';

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const expressApp = express();
const nextHandler = nextApp.getRequestHandler();
const httpServer = http.createServer(expressApp);
const io = socketIo(httpServer);

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
console.log('test');
require('./serverApi'); // inti socket.io-client to socket.io connection
io.on('connection', (socket: socketIo.Socket) => {
    // Connect new user
    console.log(`${new Date()} received new connection from socket id ${socket.id}`);

    // === PDFMap
    // socket.on('putPDFMap', async (pdfs: FileWithRawData[]) => {
    //     // https://stackoverflow.com/a/54903986
    //     await fsExtra.emptyDir(path.join(__dirname, '../..', 'public', 'pdfs'));

    //     // https://stackoverflow.com/a/56908322
    //     pdfs.forEach((pdf: FileWithRawData) => {
    //         const filePath = path.join(__dirname, '../..', 'public', 'pdfs', pdf.name);
    //         const fileStream = fs.createWriteStream(filePath);
    //         fileStream.write(pdf.data);
    //     });
    // });

    // === Link Midi Files to Registration Memory Files
    socket.on('subscribeLinkMidiToReg', async (regFiles: FileWithRawData[]) => {
        linkMidiToRegAndMap(socket, regFiles).then((newRegIndexMap: RegIndexMapping[]) => {
            regIndexMap = newRegIndexMap;
        });
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
nextApp.prepare().then(() => {
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
        console.log(`listening on ${config.accessPoint.ipStatic}:${config.server.port}/`);
        // console.log(`listening on localhost:${config.server.port}/`);
    });
});
