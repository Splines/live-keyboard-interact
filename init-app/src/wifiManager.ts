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
// https://github.com/sabhiram/raspberry-wifi-conf/blob/master/app/wifi_manager.js

import async from 'async';
import { exec } from 'child_process';
import config from '../config.json';
import { writeTemplateToFile } from './util';

interface AccessPointConfigContext {
    wifiDriverType: string;
    forceReconfigure: boolean;
    wifiInterface: string;
    ssid: string;
    passphrase: string;
    channel: number;
    ipStatic: string;
    ipSubnetRangeStart: string;
    ipSubnetRangeEnd: string;
}

interface WifiConfigContext {
    ssid: string;
    passphrase: string;
    countryCode: string;
}

interface ErrorCallback {
    (err: any): void;
}

// Detect which wifi driver we should use, the rtl871xdrv or the nl80211
exec("iw list", function (error, stdout, stderr) {
    if (stderr.match(/^nl80211 not found/)) {
        config.wifiDriverType = "rtl871xdrv";
    }
});

// Hack: this just assumes that the outbound interface will be "wlan0"
const ifconfigFieldsRegex = {
    internetAddress: /inet\s*([^\s]+)/
};
const iwconfigFieldsRegex = {
    accessPointAddress: /Access Point:\s([^\s]+)/,
    accessPointSsid: /ESSID:\"([^\"]+)\"/
};

////////////////////////////
// Wifi related functions //
////////////////////////////

interface WifiEnabledCallback {
    (err: any, internetAddress: string);
}

export function isWifiEnabled(callback: WifiEnabledCallback) {
    getWifiInfo((err, wifiInfo): WifiInfoCallback => {
        if (err) return callback(err, '');
        const internetAddress: string = evaluateIsWifiEnabled(wifiInfo) ? wifiInfo.internetAddress : '';
        return callback(null, internetAddress);
    });
}

function evaluateIsWifiEnabled(wifiInfo: WifiInfo): boolean {
    // if we are not an Access Point
    // and we have a valid Internet address
    // ==> then Wifi is enabled!
    if (!evaluateIsAccessPointEnabled(wifiInfo) && wifiInfo.internetAddress) {
        return true;
    }
    return false;
}

interface WifiInfo {
    internetAddress: string;
    accessPointAddress: string;
    accessPointSsid: string;
}

interface WifiInfoCallback {
    (err, info: WifiInfo): void;
}

function getWifiInfo(callback: WifiInfoCallback) {
    const wifiInfo: WifiInfo = {
        internetAddress: '',
        accessPointAddress: '',
        accessPointSsid: ''
    };

    // Inner function which runs a given command and sets a bunch
    // of fields
    function runCommandAndSetFields(cmd: string, fields, callback) {
        exec(cmd, (err, stdout, stderr) => {
            if (err) return callback(err);
            for (let key in fields) {
                const matchString = stdout.match(fields[key]);
                if (matchString && matchString.length > 1) {
                    wifiInfo[key] = matchString[1];
                }
            }
            callback(null);
        });
    }

    // Run a bunch of commands and aggregate info
    async.series([
        function runIfconfig(nextStep) {
            runCommandAndSetFields('ifconfig wlan0', ifconfigFieldsRegex, nextStep);
        },
        function runIwconfig(nextStep) {
            runCommandAndSetFields('iwconfig wlan0', iwconfigFieldsRegex, nextStep);
        }
    ], (err) => {
        return callback(err, wifiInfo);
    });
}

/**
 * Disables Access Point mode and reverts to a Wifi connection.
 * @param callback a callback
 */
export function enableWifiMode(callback) {
    isAccessPointEnabled((err, ssid) => {
        if (err) {
            console.log('ERRORO: ' + err);
            return callback(err);
        }

        const context: WifiConfigContext = {
            ...config.wifi
        }

        if (ssid) {
            console.log('Access point is enabled --> will disable');
        } else {
            console.log('Access point is not enabled, so will do nothing');
            // TODO: still restart WIFI in this case
            // return callback(null);
            // TODO: why is ssid empty in this case?!
        }

        async.series([

            // Add new network
            function updateWpaSupplicant(nextStep) {
                writeTemplateToFile(
                    './assets/etc/wpa_supplicant/wpa_supplicant.conf.template',
                    '/etc/wpa_supplicant/wpa_supplicant.conf',
                    context, nextStep
                );
            },

            // Get rid of static ip address in DHCP Server
            function updateInterfaces(nextStep) {
                writeTemplateToFile(
                    './assets/etc/dhcpcd/dhcpcd.station.template',
                    '/etc/dhcpcd.conf',
                    context, nextStep
                );
            },

            // Disable the DHCP server provided by dnsmasq
            function updateDhcpInterface(nextStep) {
                writeTemplateToFile(
                    './assets/etc/dnsmasq/dnsmasq.station.template',
                    '/etc/dnsmasq.conf',
                    context, nextStep
                );
            },

            // Disable the access point host software (hostapd)
            function updateHostapdConf(nextStep) {
                writeTemplateToFile(
                    './assets/etc/hostapd/hostapd.station.template',
                    '/etc/hostapd/hostapd.conf',
                    context, nextStep
                );
            },

            // set up via https://raspberrypi.stackexchange.com/a/41370/112713
            function deletePreroutingIptableRoutes(nextStep) {
                exec('sudo iptables -t nat -F PREROUTING', (err, stdout, stderr) => {
                    if (err) console.log('... iptables reset PREROUTING routes failed!');
                    else console.log('... iptables reset PREROUTING success!');
                    nextStep(err);
                });
            },

            function restartDnsmasqService(nextStep) {
                exec('sudo systemctl stop dnsmasq', (err, stdout, stderr) => {
                    if (err) console.log('failed to stop dnsmasq server');
                    else console.log('... dnsmasq server stopped!');
                    nextStep(err);
                });
            },

            function restartHostapdService(nextStep) {
                exec('sudo systemctl stop hostapd', (err, stdout, stderr) => {
                    if (err) console.log('failed to stop hostapd service');
                    else console.log('... hostapd stopped!');
                    nextStep(err);
                });
            },

            function restartDhcpService(nextStep) {
                exec('sudo systemctl restart dhcpcd', (err, stdout, stderr) => {
                    if (err) console.log('failed to restart dhcp service - ' + stdout);
                    else console.log('... dhcdp server restarted!');
                    nextStep(err);
                });
            },

            function rebootNetworkInterfaces(nextStep) {
                rebootWirlessNetwork(config.wifiInterface, nextStep);
            }

        ], callback(err));

    });
}


////////////////////////////////////
// Access Point related functions //
////////////////////////////////////

interface AccessPointEnabledCallback {
    (err: any, ssid: string);
}

function isAccessPointEnabled(callback: AccessPointEnabledCallback) {
    getWifiInfo((err, wifiInfo): WifiInfoCallback => {
        console.log('wifiInfo is: ' + wifiInfo);
        console.log('wifiInfo here is: ' + wifiInfo.accessPointSsid);
        if (err) return callback(err, '');
        const ssid: string = evaluateIsAccessPointEnabled(wifiInfo) ? wifiInfo.accessPointSsid : '';
        return callback(null, ssid);
    });
}

function evaluateIsAccessPointEnabled(wifiInfo: WifiInfo) {
    console.log('wifi info: ' + wifiInfo.accessPointAddress);
    console.log('wifi info2: ' + wifiInfo.accessPointSsid);
    console.log('ap ssid: ' + config.accessPoint.ssid);
    return wifiInfo.accessPointSsid && wifiInfo.accessPointSsid === config.accessPoint.ssid;
}

/**
 * Enables the Access point.
 * This assumes that both dnsmasq and hostapd are installed using $sudo npm run-script provision.
 * @param accessPointSsid the SSID for the Access point
 * @param callback a callback
 */
export function enableAccessPointMode(callback) {
    isAccessPointEnabled((err, resultSsid) => {
        if (err) {
            console.log('ERROR: ' + err);
            return callback(err);
        }

        if (resultSsid) {
            if (config.accessPoint.forceReconfigure) {
                console.log('Force reconfigure enabled - reset Access point');
            } else {
                console.log('Access point is enabled with SSID: ' + resultSsid);
                return callback(null);
            }
        } else {
            console.log('Access point is not yet enabled --> will enable');
        }

        const context: AccessPointConfigContext = {
            ...config.accessPoint,
            wifiDriverType: config.wifiDriverType
        };

        async.series([
            // see https://www.raspberrypi.org/documentation/configuration/wireless/access-point.md

            // We are configuring a standalone network to act as a server, so the Raspberry Pi
            // needs to have a static IP address assigned to the wirless port.
            function updateInterfaces(nextStep) {
                writeTemplateToFile(
                    './assets/etc/dhcpcd/dhcpcd.ap.template',
                    '/etc/dhcpcd.conf',
                    context, nextStep
                );
            },

            // Configure the DHCP server provided by dnsmasq
            function updateDhcpInterface(nextStep) {
                writeTemplateToFile(
                    './assets/etc/dnsmasq/dnsmasq.ap.template',
                    '/etc/dnsmasq.conf',
                    context, nextStep
                );
            },

            // Configure the access point host software (hostapd)
            function updateHostapdConf(nextStep) {
                writeTemplateToFile(
                    './assets/etc/hostapd/hostapd.ap.template',
                    '/etc/hostapd/hostapd.conf',
                    context, nextStep
                );
            },

            // https://raspberrypi.stackexchange.com/a/41370/112713
            function addIptablesHttpRouting(nextStep) {
                const execCommmand = `sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT ` +
                    `--to-destination ${config.accessPoint.ipStatic}:${config.server.httpPort}`
                exec(execCommmand, (err, stdout, stderr) => {
                    if (err) console.log('... iptables http port redirection failed! - ' + stdout);
                    else console.log('... iptables http port redirection success!');
                    nextStep(err);
                });
            },

            // https://raspberrypi.stackexchange.com/a/41370/112713
            function addIptablesHttpsRouting(nextStep) {
                const execCommand = `sudo iptables -t nat -A PREROUTING -p tcp --dport 443 -j DNAT ` +
                    `--to-destination ${config.accessPoint.ipStatic}:${config.server.httpsPort}`;
                exec(execCommand, (err, stdout, stderr) => {
                    if (err) console.log('... iptables https port redirection failed! - ' + stdout);
                    else console.log('... iptables https port redirection success!');
                    nextStep(err);
                });
            },

            // https://www.engetsu-consulting.com/blog/raspberry-pi-raspbian-rogue-access-point-ap-landing-page-captive-portal
            // function addIptablesMasquerade(nextStep) {
            //     const execCommand = `sudo iptables -t nat -A POSTROUTING -j MASQUERADE`;
            //     exec(execCommand, (err, stdout, stderr) => {
            //         if (err) console.log('... iptables add masquerade failed! - ' + stdout);
            //         else console.log('... iptables add masquerade success!');
            //         nextStep(err);
            //     });
            // },

            function restartDhcpService(nextStep) {
                exec('sudo systemctl restart dhcpcd', (err, stdout, stderr) => {
                    if (err) console.log('... dhcpcd server failed! - ' + stdout);
                    else console.log('... dhcpcd server restarted!');
                    nextStep(err);
                });
            },

            function rebootNetworkInterfaces(nextStep) {
                rebootWirlessNetwork(config.wifiInterface, nextStep);
            },

            function restartHostapdService(nextStep) {
                exec('sudo systemctl restart hostapd', (err, stdout, stderr) => {
                    if (err) console.log('... hostapd restart failed! - ' + stdout);
                    else console.log('... hostapd restarted!');
                    nextStep(err);
                });
            },

            function restartDnsmasqService(nextStep) {
                exec('sudo systemctl restart dnsmasq', (err, stdout, stderr) => {
                    if (err) console.log('... dnsmasq restart failed! - ' + stdout);
                    else console.log('... dnsmasq server restarted!');
                    nextStep(err);
                });
            }
        ], callback(err));

    });
}

/**
 * Reboots the given WLAN interface.
 * @param wlanInterface the WLAN iinterface to reboot
 * @param callback a nextStep-callback
 */
function rebootWirlessNetwork(wlanInterface, callback: ErrorCallback) {
    async.series([
        function down(nextStep) {
            exec(`sudo ifconfig ${wlanInterface} down`, (err, stdout, stderr) => {
                if (!err) console.log(`...ifconfig ${wlanInterface} down successful`);
                nextStep();
            });
        },
        function up(nextStep) {
            exec(`sudo ifconfig ${wlanInterface} up`, (err, stdout, stderr) => {
                if (!err) console.log(`...ifconfig ${wlanInterface} up successful`);
                nextStep();
            });
        }
    ], callback);
}
