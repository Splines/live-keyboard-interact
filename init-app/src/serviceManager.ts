import fs from 'fs';
import { exec } from 'child_process';

export function configureSystemdService(callback) {
    const pathTo: string = '/etc/systemd/system/live-key.service';
    fs.exists(pathTo, (exists: boolean) => {
        if (!exists) {
            exec(`sudo cp ./assets/etc/service/live-key.service ${pathTo}`, (err, stdout, stderr) => {
                if (err) {
                    console.log(`copying file to ${pathTo} failed`);
                    callback(err);
                }
                else {
                    console.log(`copied file to ${pathTo}`);
                    callback();
                }
            });
        } else {
            console.log(`service configuration file found in ${pathTo}`);
            callback();
        }
    });
}