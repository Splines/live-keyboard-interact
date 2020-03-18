"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const async_1 = __importDefault(require("async"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const mustache_1 = __importDefault(require("mustache"));
const config_json_1 = __importDefault(require("../config.json"));
mustache_1.default.escape = function (value) {
    return value;
};
child_process_1.exec("iw list", function (error, stdout, stderr) {
    if (stderr.match(/^nl80211 not found/)) {
        config_json_1.default.wifiDriverType = "rtl871xdrv";
    }
});
const ifconfigFieldsRegex = {
    internetAddress: /inet\s*([^\s]+)/
};
const iwconfigFieldsRegex = {
    accessPointAddress: /Access Point:\s([^\s]+)/,
    accessPointSsid: /ESSID:\"([^\"]+)\"/
};
function isWifiEnabled(callback) {
    getWifiInfo((err, wifiInfo) => {
        if (err)
            return callback(err, '');
        const internetAddress = evaluateIsWifiEnabled(wifiInfo) ? wifiInfo.internetAddress : '';
        return callback(null, internetAddress);
    });
}
exports.isWifiEnabled = isWifiEnabled;
function evaluateIsWifiEnabled(wifiInfo) {
    if (!evaluateIsAccessPointEnabled(wifiInfo) && wifiInfo.internetAddress) {
        return true;
    }
    return false;
}
function getWifiInfo(callback) {
    const wifiInfo = {
        internetAddress: '',
        accessPointAddress: '',
        accessPointSsid: ''
    };
    function runCommandAndSetFields(cmd, fields, callback) {
        child_process_1.exec(cmd, (err, stdout, stderr) => {
            if (err)
                return callback(err);
            for (let key in fields) {
                const matchString = stdout.match(fields[key]);
                if (matchString && matchString.length > 1) {
                    wifiInfo[key] = matchString[1];
                }
            }
            callback(null);
        });
    }
    async_1.default.series([
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
function enableWifiMode(callback) {
    isAccessPointEnabled((err, ssid) => {
        if (err) {
            console.log('ERRORO: ' + err);
            return callback(err);
        }
        const context = Object.assign({}, config_json_1.default.wifi);
        if (ssid) {
            console.log('Access point is enabled --> will disable');
        }
        else {
            console.log('Access point is not enabled, so will do nothing');
        }
        async_1.default.series([
            function updateWpaSupplicant(nextStep) {
                writeTemplateToFile('./assets/etc/wpa_supplicant/wpa_supplicant.conf.template', '/etc/wpa_supplicant/wpa_supplicant.conf', context, nextStep);
            },
            function updateInterfaces(nextStep) {
                writeTemplateToFile('./assets/etc/dhcpcd/dhcpcd.station.template', '/etc/dhcpcd.conf', context, nextStep);
            },
            function updateDhcpInterface(nextStep) {
                writeTemplateToFile('./assets/etc/dnsmasq/dnsmasq.station.template', '/etc/dnsmasq.conf', context, nextStep);
            },
            function updateHostapdConf(nextStep) {
                writeTemplateToFile('./assets/etc/hostapd/hostapd.station.template', '/etc/hostapd/hostapd.conf', context, nextStep);
            },
            function deletePreroutingIptableRoutes(nextStep) {
                child_process_1.exec('sudo iptables -t nat -F PREROUTING', (err, stdout, stderr) => {
                    if (err)
                        console.log('... iptables reset PREROUTING routes failed!');
                    else
                        console.log('... iptables reset PREROUTING success!');
                    nextStep(err);
                });
            },
            function restartDnsmasqService(nextStep) {
                child_process_1.exec('sudo systemctl stop dnsmasq', (err, stdout, stderr) => {
                    if (err)
                        console.log('failed to stop dnsmasq server');
                    else
                        console.log('... dnsmasq server stopped!');
                    nextStep(err);
                });
            },
            function restartHostapdService(nextStep) {
                child_process_1.exec('sudo systemctl stop hostapd', (err, stdout, stderr) => {
                    if (err)
                        console.log('failed to stop hostapd service');
                    else
                        console.log('... hostapd stopped!');
                    nextStep(err);
                });
            },
            function restartDhcpService(nextStep) {
                child_process_1.exec('sudo systemctl restart dhcpcd', (err, stdout, stderr) => {
                    if (err)
                        console.log('failed to restart dhcp service - ' + stdout);
                    else
                        console.log('... dhcdp server restarted!');
                    nextStep(err);
                });
            },
            function rebootNetworkInterfaces(nextStep) {
                rebootWirlessNetwork(config_json_1.default.wifiInterface, nextStep);
            }
        ], callback(err));
    });
}
exports.enableWifiMode = enableWifiMode;
function isAccessPointEnabled(callback) {
    getWifiInfo((err, wifiInfo) => {
        console.log('wifiInfo is: ' + wifiInfo);
        console.log('wifiInfo here is: ' + wifiInfo.accessPointSsid);
        if (err)
            return callback(err, '');
        const ssid = evaluateIsAccessPointEnabled(wifiInfo) ? wifiInfo.accessPointSsid : '';
        return callback(null, ssid);
    });
}
function evaluateIsAccessPointEnabled(wifiInfo) {
    console.log('wifi info: ' + wifiInfo.accessPointAddress);
    console.log('wifi info2: ' + wifiInfo.accessPointSsid);
    console.log('ap ssid: ' + config_json_1.default.accessPoint.ssid);
    return wifiInfo.accessPointSsid && wifiInfo.accessPointSsid === config_json_1.default.accessPoint.ssid;
}
function enableAccessPointMode(callback) {
    isAccessPointEnabled((err, resultSsid) => {
        if (err) {
            console.log('ERROR: ' + err);
            return callback(err);
        }
        if (resultSsid) {
            if (config_json_1.default.accessPoint.forceReconfigure) {
                console.log('Force reconfigure enabled - reset Access point');
            }
            else {
                console.log('Access point is enabled with SSID: ' + resultSsid);
                return callback(null);
            }
        }
        else {
            console.log('Access point is not yet enabled --> will enable');
        }
        const context = Object.assign(Object.assign({}, config_json_1.default.accessPoint), { wifiDriverType: config_json_1.default.wifiDriverType });
        async_1.default.series([
            function updateInterfaces(nextStep) {
                writeTemplateToFile('./assets/etc/dhcpcd/dhcpcd.ap.template', '/etc/dhcpcd.conf', context, nextStep);
            },
            function updateDhcpInterface(nextStep) {
                writeTemplateToFile('./assets/etc/dnsmasq/dnsmasq.ap.template', '/etc/dnsmasq.conf', context, nextStep);
            },
            function updateHostapdConf(nextStep) {
                writeTemplateToFile('./assets/etc/hostapd/hostapd.ap.template', '/etc/hostapd/hostapd.conf', context, nextStep);
            },
            function addIptablesHttpRouting(nextStep) {
                const execCommmand = `sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT ` +
                    `--to-destination ${config_json_1.default.accessPoint.ipStatic}:${config_json_1.default.server.port}`;
                child_process_1.exec(execCommmand, (err, stdout, stderr) => {
                    if (err)
                        console.log('... iptables http port redirection failed! - ' + stdout);
                    else
                        console.log('... iptables http port redirection success!');
                    nextStep(err);
                });
            },
            function addIptablesHttpsRouting(nextStep) {
                const execCommand = `sudo iptables -t nat -A PREROUTING -p tcp --dport 443 -j DNAT ` +
                    `--to-destination ${config_json_1.default.accessPoint.ipStatic}:${config_json_1.default.server.port}`;
                child_process_1.exec(execCommand, (err, stdout, stderr) => {
                    if (err)
                        console.log('... iptables https port redirection failed! - ' + stdout);
                    else
                        console.log('... iptables https port redirection success!');
                    nextStep(err);
                });
            },
            function restartDhcpService(nextStep) {
                child_process_1.exec('sudo systemctl restart dhcpcd', (err, stdout, stderr) => {
                    if (err)
                        console.log('... dhcpcd server failed! - ' + stdout);
                    else
                        console.log('... dhcpcd server restarted!');
                    nextStep(err);
                });
            },
            function rebootNetworkInterfaces(nextStep) {
                rebootWirlessNetwork(config_json_1.default.wifiInterface, nextStep);
            },
            function restartHostapdService(nextStep) {
                child_process_1.exec('sudo systemctl restart hostapd', (err, stdout, stderr) => {
                    if (err)
                        console.log('... hostapd restart failed! - ' + stdout);
                    else
                        console.log('... hostapd restarted!');
                    nextStep(err);
                });
            },
            function restartDnsmasqService(nextStep) {
                child_process_1.exec('sudo systemctl restart dnsmasq', (err, stdout, stderr) => {
                    if (err)
                        console.log('... dnsmasq restart failed! - ' + stdout);
                    else
                        console.log('... dnsmasq server restarted!');
                    nextStep(err);
                });
            }
        ], callback(err));
    });
}
exports.enableAccessPointMode = enableAccessPointMode;
function rebootWirlessNetwork(wlanInterface, callback) {
    async_1.default.series([
        function down(nextStep) {
            child_process_1.exec(`sudo ifconfig ${wlanInterface} down`, (err, stdout, stderr) => {
                if (!err)
                    console.log(`...ifconfig ${wlanInterface} down successful`);
                nextStep();
            });
        },
        function up(nextStep) {
            child_process_1.exec(`sudo ifconfig ${wlanInterface} up`, (err, stdout, stderr) => {
                if (!err)
                    console.log(`...ifconfig ${wlanInterface} up successful`);
                nextStep();
            });
        }
    ], callback);
}
function writeTemplateToFile(templatePath, filepath, context, callback) {
    async_1.default.waterfall([
        function readTemplateFile(nextStep) {
            fs_1.default.readFile(templatePath, { encoding: "utf8" }, nextStep);
        },
        function updateFile(fileData, nextStep) {
            const templateTransformed = mustache_1.default.render(fileData, context);
            fs_1.default.writeFile(filepath, templateTransformed, nextStep);
        }
    ], callback);
}
//# sourceMappingURL=WifiManager.js.map