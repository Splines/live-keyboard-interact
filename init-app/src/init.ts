/*
The MIT License (MIT)

Copyright (c) 2015 Shaba Abhiram

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// This is a modified version of the file you can find here:
// https://github.com/sabhiram/raspberry-wifi-conf/blob/master/server.js

import config from '../config.json';
import async from 'async';
import { exec } from 'child_process';
import dependencyManager from './dependencyManager';
import { isWifiEnabled, enableAccessPointMode } from './wifiManager';
import { configureSystemdService } from './serviceManager';

async.series([

    // 1. Check if we have the required dependencies installed
    function checkDependencies(nextStep) {
        dependencyManager({
            "binaries": ["dnsmasq", "hostapd", "iw"],
            "files": ["/etc/dnsmasq.conf", "/etc/hostapd/hostapd.conf"]
        }, err => {
            if (err) console.log(' * Dependency error, did you run `sudo npm run-script provision`?');
            else console.log('* no dependency errors');
            nextStep(err);
        });
    },

    // 2. Check if Wifi is enabled/connected
    function checkWifiEnabled(nextStep) {
        isWifiEnabled((err, internetAddress) => {
            if (internetAddress) {
                console.log('wifi is enabled');
                const reconfigure = config.accessPoint.forceReconfigure || false;
                if (reconfigure) {
                    console.log('force reconfigure enabled -> will try to enable access point');
                } else {
                    console.log('force reconfigure not enabled -> will stop application')
                    process.exit(0);
                }
            } else {
                console.log('wifi is not enabled -> will try to enable access point');
            }
            nextStep(err);
        });
    },

    // 3. Turn Raspberry Pi into an access point
    function enableAccessPoint(nextStep) {
        enableAccessPointMode((err) => {
            if (err) console.log('... Access Point Enable ERROR: ' + err);
            else console.log('... Access Point Enable Success!');
            nextStep(err);
        });
    },

    // 4. Configure live-key as systemd service
    function configureAppAsService(nextStep) {
        configureSystemdService((err) => {
            if (err) console.log('Error configuring live-key as a systemd service: ' + err);
            else console.log('Configured live-key as systemd service (see /etc/systemd/system/live-key.service)');
            nextStep();
        });
    },

    // 5. Host HTTP server while functioning as Access Point
    // The "server.js"-file contains all the needed logic to get a basic
    // express server up. It uses a React application.
    function startHttpServer(nextStep) {
        console.log('Trying to launch Next.js application');
        const nextServerProcess = exec("npm run start:server", (err, stdout, stderr) => {
            if (err) {
                console.log(err);
                nextStep(err);
            }
        });
        process.on('exit', () => {
            nextServerProcess.kill();
        });
    }

], (err) => {
    if (err) console.log('ERROR: ' + err);
});

