"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const async_1 = __importDefault(require("async"));
const WifiManager_1 = require("./WifiManager");
async_1.default.series([
    function enableWifi(nextStep) {
        WifiManager_1.enableWifiMode((err) => {
            if (err)
                console.log('... Wifi Enable ERROR: ' + err);
            else
                console.log('... Wifi Enable Success!');
            nextStep(err);
        });
    }
], (err) => {
    if (err)
        console.log('ERROR: ' + err);
});
//# sourceMappingURL=initRevert.js.map