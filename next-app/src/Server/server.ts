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
import { linkMidiToRegAndMap, addPdfFilesToServer, deletePdfFileFromServer } from './webSocketsHandler';
import { watchRegChanges, watchMidiChanges } from './midiLiveHandler';

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const expressApp = express();
const nextHandler = nextApp.getRequestHandler();

const rootNextAppFolderPath: string = process.env.NODE_ENV === 'production'
    ? path.join(__dirname + '../../../../..') // additional .. to go out of dist folder
    : path.join(__dirname + '../../..');
export const staticLiveFilesFolderPath: string = path.join(rootNextAppFolderPath, 'static-live-files');

const httpServer = http.createServer(expressApp);
const domainName = 'www.live-keyboard-interact.com';
const io = socketIo(httpServer);

let regIndexMap: RegIndexMapping[] = [
    // default
    {
        regName: 'SampleRegistration',
        midiIndex: 0
    }
];

///////////////////////////////////
// Socket.io server (Websockets) //
///////////////////////////////////
require('./serverApi'); // init socket.io-client to socket.io connection
const subscriptionSet = new Set<string>();
io.on('connection', (socket: socketIo.Socket) => {
    // Connect new user
    console.log(`${new Date()} received new connection from socket id ${socket.id}`);

    // === Save PDF files on server
    socket.on('postPDFs', (pdfFiles: FileWithRawData[]) => {
        addPdfFilesToServer(pdfFiles);
    });

    // === Delete PDF file from server
    socket.on('deletePDF', (pdfFilename: string) => {
        deletePdfFileFromServer(pdfFilename);
    })

    // === Save JSON RegIndexMap on server
    socket.on('postMap', (regIndexMap: RegIndexMapping[]) => {
        regIndexMap = regIndexMap;
    });

    // === Link Midi Files to Registration Memory Files
    socket.on('subscribeLinkMidiToReg', async (regFiles: FileWithRawData[]) => {
        regIndexMap = await linkMidiToRegAndMap(socket, regFiles);
    });

    // === Midi Messages
    socket.on('subscribeMidiMessage', () => {
        watchMidiChanges((newMessage: string) => {
            socket.emit('midiMessage', newMessage);
        })
    });

    // === RegChange
    socket.on('subscribeRegChange', () => {
        console.log(`client (socket id ${socket.id}) subscribed to RegChange`);
        subscriptionSet.add(socket.id);
        watchRegChanges(regIndexMap /*can't be changed later on (!)*/, (regFilename: string) => {
            if (subscriptionSet.has(socket.id)) {
                socket.emit('regChange', regFilename);
            }
        });
    });

    socket.on('unsubscribeRegChange', () => {
        subscriptionSet.delete(socket.id);
    })
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

    expressApp.use((req, res, next) => {
        if (process.env.NODE_ENV !== 'production') {
            return next();
        }
        // no double slashes (https://stackoverflow.com/a/17543050/9655481)
        //see expressApp.get('//*')
        // if user comes from another domain, redirect them to domainName
        if (req.originalUrl === '/redirect') { // for Microsoft connectivity check
            return res.redirect(301, `http://${domainName}`);
        }
        if (req.get('host') !== domainName) {
            return res.redirect(301, `http://${domainName}` + req.originalUrl);
        }
        return next();
    });

    expressApp.get('//*', (_req, res, next) => {
        if (process.env.NODE_ENV !== 'production') {
            return next();
        }
        return res.redirect(301, `http://${domainName}`);
    });

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
        res.status(200).json({ regIndexMap: regIndexMap });
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
            console.log(`http listening on ${config.accessPoint.ipStatic}:${config.server.port}/`);
        } else {
            console.log(`http listening on localhost:${config.server.port}/`);
        }
    });
});

// We are not using an https server for express here since that would require
// a TRUSTED certificate and that's too much effort for a home-use project.
// Of course, we could use a self-signed certificate but that would lead to
// security warnings in most modern browsers (!)

// const httpsOptions = {
//     key: fs.readFileSync(path.join(rootNextAppFolderPath, 'server.key')), // private key
//     cert: fs.readFileSync(path.join(rootNextAppFolderPath, 'server.csr')) // Certificate Signing Request
// };

// const httpsServer = https.createServer(httpsOptions, (req, res) => {
//     const redirectPath = process.env.NODE_ENV === 'production'
//         ? `http://${domainName}` + req.url
//         : `http://localhost` + req.url
//     res.writeHead(301, {
//         "Location": redirectPath
//     });
// });
// httpsServer.listen(config.server.httpsPort);
