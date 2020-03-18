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
// import fsExtra = require('fs-extra');
// import path from 'path';
// import JSZip from 'jszip';
// import { watchYamahaRegistration } from './midiHandler';
// import { linkMidiToReg } from './RegMidiAssigner';
// import { FileWithRawData, RegProcessingInfo, RegIndexMapping } from '@shared/serverAPI';
// import config from '@shared/config.json';
import config from '../init-app/config.json';

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const expressApp = express();
const nextHandler = nextApp.getRequestHandler();
const httpServer = http.createServer(expressApp);
const io = socketIo(httpServer);

const messages: string[] = [];

// socket.io server
io.on('connection', (socket: socketIo.Socket) => {
    socket.on('message', (data: string) => {
        messages.push(data);
        socket.broadcast.emit('message', messages);
    });
});

nextApp.prepare().then(() => {
    expressApp.get('/messages', (_req, res) => {
        res.json(messages);
    });

    expressApp.get('*', (req, res) => {
        return nextHandler(req, res);
    });

    httpServer.listen(`${config.server.port}`, () => {
        console.log(`listening on ${config.accessPoint.ipStatic}:${config.server.port}/`);
    });
});


// Old

// let regIndexMap: RegIndexMapping[] = [
//     {
//         regName: 'DominicsTestRegistration.RGT',
//         midiIndex: 0
//     }
// ];

// // https://flaviocopes.com/how-to-serve-react-from-same-origin/
// // https://dev.to/nburgess/creating-a-react-app-with-react-router-and-an-express-backend-33l3
// // Serve the static files from the React App

// app.use(express.static(path.join(__dirname, 'public')));

// app.get('/', (req, res) => {
//     return res.send('Dominics Reg Midi Viewer superb 1234 ;)');
// });

// app.get('/api/ping', (req, res) => {
//     console.log('=================== in ping =================');
//     return res.send('pong');
// });

// // Handle any requests that don't match the ones above
// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../ui', 'index.html'));
// });

// /////////////////////////////////////////////////////////////////////////////

// io.on('connection', (client: socketIo.Socket) => {
//     // Connect new user
//     console.log(`${new Date()} received new connection from socket id ${client.id}`);

//     client.on('putMap', (map: RegIndexMapping[]) => {
//         regIndexMap = map;
//         console.log(`new map is ${regIndexMap}`);
//     });

//     client.on('putPDF', async (pdfs: FileWithRawData[]) => {
//         // https://stackoverflow.com/a/54903986
//         await fsExtra.emptyDir(path.join(__dirname, '../..', 'public', 'pdfs'));

//         // https://stackoverflow.com/a/56908322
//         pdfs.forEach((pdf: FileWithRawData) => {
//             const filePath = path.join(__dirname, '../..', 'public', 'pdfs', pdf.name);
//             const fileStream = fs.createWriteStream(filePath);
//             fileStream.write(pdf.data);
//         });
//     });

//     // Get the name of the current pressed registration button
//     client.on('subscribeToReg', () => {
//         console.log('client subscribed to pdf');
//         watchYamahaRegistration(regIndexMap, (regFilename: string) => {
//             client.emit('reg', regFilename);
//         });
//     });

//     // --- Link Midi Files to Registration Memory Files
//     client.on('startLinkMidiFilesToReg', async (regProcessingInfo: RegProcessingInfo) => {
//         console.log('start linking midi files to reg');
//         const zippedRegFiles = new JSZip();
//         const regFolder = zippedRegFiles.folder('LinkedRegFiles');

//         const regIndexMap: RegIndexMapping[] = [];
//         for (let i = 0; i < regProcessingInfo.regFiles.length; i++) {
//             // --- Get shortened file name
//             const regFilenameFull: string = regProcessingInfo.regFiles[i].name;
//             let lastIndex: number;
//             // matches xyz.S970.RGT, xyz.S123.RGT but NOT xyz.S1234.RGT or xyz.sabc.RGT
//             const matchExtended: RegExpMatchArray | null = regFilenameFull.toUpperCase().match(/\.S\d{3}\.RGT/);
//             if (matchExtended) {
//                 lastIndex = regFilenameFull.toUpperCase().lastIndexOf(matchExtended[matchExtended.length - 1]);
//             } else {
//                 const matchNotExtended: RegExpMatchArray = regFilenameFull.toUpperCase().match(/.RGT/) as RegExpMatchArray;
//                 lastIndex = regFilenameFull.toUpperCase().lastIndexOf(matchNotExtended[matchNotExtended.length - 1]);
//             }
//             const regFilenameShort: string = regFilenameFull.substring(0, lastIndex);

//             // --- Add  the name of this registration to the mapping
//             console.log(`=== Processing file "${regFilenameFull}"`);
//             regIndexMap.push({
//                 regName: regFilenameShort,
//                 midiIndex: i
//             });

//             // --- Link MIDI to Reg
//             const currentRegFile: FileWithRawData = regProcessingInfo.regFiles[i];
//             const regData: Uint8Array = new Uint8Array(currentRegFile.data);
//             const linkedRegFileContent: Uint8Array = linkMidiToReg(regData, regProcessingInfo.buttonIndex, i);
//             regFolder.file(regFilenameFull, linkedRegFileContent.buffer);
//         }
//         zippedRegFiles.file('RegMidiMap.json', JSON.stringify(regIndexMap));
//         client.emit('getLinkedRegFiles', await zippedRegFiles.generateAsync({ type: "nodebuffer" }));
//     });
// });

// /////////////////////
// // Start listening //
// /////////////////////
// server.listen(config.server.port);
// console.log(`listening on http://${config.accessPoint.ipStatic}:${config.server.port}`)
// // console.log(`listening on ${addressInfo.hostname}:${addressInfo.port}/`);
