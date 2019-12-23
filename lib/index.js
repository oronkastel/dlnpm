#!/usr/bin/env node
"use strict";
var chalk = require('chalk');
var clear = require('clear');
var figlet = require('figlet');
var path = require('path');
var program = require('commander');
var nodefetch = require('node-fetch');
var LATEST = 'LATEST';
//Writing banner to console
clear();
console.log(chalk.green(figlet.textSync('dlnpm', { horizontalLayout: 'full' })));
//Defining cli parameters
program.version('0.0.1')
    .description('Download npm packages as .tgz files in order to be used in private npm repository.')
    .option('-p, --package <value>', 'node module package to download.')
    .option('-v, --ver <value>', 'the version of the node module specified. Default: Latest.')
    .option('-i, --ignore <value>', 'ignore list filename.')
    .parse(process.argv);
//If no parameters were given in command line
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
;
//If -p or --package was given in command line. This parameter is a must.
if (!program.package) {
    console.log(chalk.red('ERR! You must specify package to download!\n'));
    program.outputHelp();
}
else {
    var versionToDownload = void 0;
    versionToDownload = program.ver === undefined ? LATEST : program.ver;
    console.log('Downloading ' + program.package + '@' + versionToDownload + ' and its dependencies...');
    getPackageInfo(program.package, program.ver);
}
//  ***********
//  ** Utils **
//  ***********
function getPackageInfo(packageName, packageVersion) {
    var url = "https://registry.npmjs.org/debug";
    var settings = { method: "Get" };
    nodefetch(url, settings)
        .then(function (res) { return res.json(); })
        .then(function (json) {
        console.log(json.description);
        if (packageVersion === LATEST) {
            packageVersion = json.dist - tags.latest;
        }
        console.log(json.versions[packageVersion].version);
    });
}
