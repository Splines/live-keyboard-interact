import async from 'async';
import fs from 'fs';
import mustache from 'mustache';

mustache.escape = function (value) {
    // disable escaping as seen here
    // https://stackoverflow.com/a/23057003/9655481
    return value;
}

/**
 * Helper function to write a given template to a file based on a given context.
 * @param templatePath the path to the template
 * @param filepath the path to the output file
 * @param context the config
 * @param callback a callback
 */
export function writeTemplateToFile(templatePath: string, filepath: string, context, callback) {
    async.waterfall([
        function readTemplateFile(nextStep) {
            fs.readFile(templatePath, { encoding: "utf8" }, nextStep);
        },
        function updateFile(fileData, nextStep) {
            // Parse template file by using config.json
            const templateTransformed = mustache.render(fileData, context);
            fs.writeFile(filepath, templateTransformed, nextStep);
        }
    ], callback);
}
