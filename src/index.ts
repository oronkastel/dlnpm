#!/usr/bin/env node

const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const path = require('path');
const program = require('commander');
const nodefetch = require('node-fetch');
const semver = require('semver');

const LATEST = 'LATEST';

//Writing banner to console
clear();

console.log(
    chalk.green(
        figlet.textSync('dlnpm', { horizontalLayout: 'full' })
    )
);

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
};

//If -p or --package was given in command line. This parameter is a must.
if(!program.package) {
    console.log(chalk.red('ERR! You must specify package to download!\n'));
    program.outputHelp();
}
else{
    let versionToDownload : string;
    versionToDownload = program.ver === undefined ? LATEST : program.ver;

    console.log('Downloading ' + program.package + '@' + versionToDownload + ' and its dependencies...');

    

    getPackageInfo(program.package,versionToDownload);
}


//  ***********
//  ** Utils **
//  ***********
function getPackageInfo(packageName: string, packageVersion: string) {
    let url = "https://registry.npmjs.org/" + packageName;

    let settings = { method: "Get" };


    nodefetch(url,settings)
        .then(res => res.json())
        .then((json) => {

            if(packageVersion===LATEST){
                packageVersion = json['dist-tags'].latest;
            }
            let versionInfo = parseVersion(json, packageVersion);

            console.log('processing %s@%s... getting version %s', json.name,packageVersion,versionInfo.version);

            //Handle package depedencies
            HandleDependencies(versionInfo.dependencies); 
            
            //Handle package devDependencies
            HandleDependencies(versionInfo.devDependencies); 
 
        }).catch( (ex)=> {
            console.log(chalk.red("ERR! " + ex));
        }
            
        );
}


//Parse the version string to get the apporiate real version.
//For example, ~version “Approximately equivalent to version”, will update you to the next patch version. ~1.2.3 will use releases from 1.2.3 to <1.3.0.
//Another example: ^version Will update you to the next minor version .will use releases up to 3.0.0.
//See: https://docs.npmjs.com/files/package.json
//Also see: https://docs.npmjs.com/misc/semver and https://docs.npmjs.com/about-semantic-versioning and https://www.npmjs.com/package/semantic-release
function parseVersion(json: any, packageVersion: string) {
    var allVersions = new Array();

    Object.keys(json.versions).forEach(ver => {
        allVersions.push(ver);
    });
    

    let parsedVersion = semver.maxSatisfying(allVersions,packageVersion);
    return json.versions[parsedVersion];
}

//Iterate a package dependecies in order to handle their dependencies.
function HandleDependencies(dependencies: any) {
    if (dependencies !== undefined) {
        Object.keys(dependencies).forEach(dep => {
            //!!!!!! TODO: only if the package not already handled before... !!!!!!
            getPackageInfo(dep, dependencies[dep]);
        });
    }
}
