"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_json_1 = __importDefault(require("../config.json"));
const async_1 = __importDefault(require("async"));
const child_process_1 = require("child_process");
const DependencyManager_1 = __importDefault(require("./DependencyManager"));
const WifiManager_1 = require("./WifiManager");
async_1.default.series([
    function checkDependencies(nextStep) {
        DependencyManager_1.default({
            "binaries": ["dnsmasq", "hostapd", "iw"],
            "files": ["/etc/dnsmasq.conf", "/etc/hostapd/hostapd.conf"]
        }, err => {
            if (err)
                console.log(' * Dependency error, did you run `sudo npm run-script provision`?');
            else
                console.log('* no dependency errors');
            nextStep(err);
        });
    },
    function checkWifiEnabled(nextStep) {
        WifiManager_1.isWifiEnabled((err, internetAddress) => {
            if (internetAddress) {
                console.log('wifi is enabled');
                const reconfigure = config_json_1.default.accessPoint.forceReconfigure || false;
                if (reconfigure) {
                    console.log('force reconfigure enabled -> will try to enable access point');
                }
                else {
                    console.log('force reconfigure not enabled -> will stop application');
                    process.exit(0);
                }
            }
            else {
                console.log('wifi is not enabled -> will try to enable access point');
            }
            nextStep(err);
        });
    },
    function enableAccessPoint(nextStep) {
        WifiManager_1.enableAccessPointMode((err) => {
            if (err)
                console.log('... Access Point Enable ERROR: ' + err);
            else
                console.log('... Access Point Enable Success!');
            nextStep(err);
        });
    },
    function startHttpServer(nextStep) {
        console.log('Trying to launch Next.js application');
        const nextServerProcess = child_process_1.exec("npm run start:server", (err, stdout, stderr) => {
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
    if (err)
        console.log('ERROR: ' + err);
});
//# sourceMappingURL=init.js.map