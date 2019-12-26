#!/usr/bin/env node

import { url } from "inspector";

const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const path = require('path');
const program = require('commander');
//const nodefetch = require('node-fetch');
const request = require("sync-request");
const semver = require('semver');
const axios = require('axios');
const fs = require('fs');

const LATEST = 'latest';
const nodeRegUrl = 'https://registry.npmjs.org/';
const dlRoot = './DL_node_modules/';

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
        .option('-l --log','verbose log.')
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



    var handledPackages: { [id: string] : string; } = {};
    var erroredPackages: { [id: string] : number; } = {};
    var jsonCache: { [id: string]: any; } = {};


    getPackageInfo(program.package,versionToDownload);

    console.log(chalk.green('Finished Downloading ' + program.package + '@' + versionToDownload + ' and its dependencies...'));

}


//  ***********
//  ** Utils **
//  ***********
function getPackageInfo(packageName: string, _packageVersion: string) {
    
    let url = nodeRegUrl + packageName;

    
    var tryJson = jsonCache[packageName];

    if(tryJson!==undefined) {  //we have the json in cache. Yay!
        if(program.log) { console.log('Got %s from cache.',packageName) };

        handlePackageJson(_packageVersion,tryJson);
    }
    else //not in cache. need to get it from registry
    {
        if(program.log) { console.log("GET: " + url) };

        var response = request('GET', url);

        if(response.statusCode===200) {
            var body = response.getBody();
            var json = JSON.parse(body);
    
            if(program.log) { console.log("GOT RESPONSE:" + url) };

            jsonCache[packageName] = json; //save the json in a cache in order not to pull from url in case we need to get this package info again.
            handlePackageJson(_packageVersion, json);
        } else {
            console.log(chalk.red('Err! URL %s returned an error code: %s'),url,response.statusCode);
        }

/*
            }).catch( (ex)=> {
                if(ex.message.includes('ECONNRESET'))   { //sometimes there is a problem getting the url so we want to retry.
                    var symbol = packageName + "@" + _packageVersion;

                    if(program.log) { console.log(chalk.yellow("ERR! there was an error fetching %s:  %s"),symbol,ex.message) };

                    var retries :  number;
                    if(erroredPackages[symbol]===undefined) {
                        retries = 0;
                    }
                    else
                    {
                        retries = erroredPackages[symbol];
                    }
                    erroredPackages[symbol] = retries++;

                    if(retries<4) {
                        if(program.log) { console.log("retrying %s [%s]",symbol,retries) }
                        getPackageInfo(packageName,_packageVersion)
                    }
                    else
                    {
                        console.log(chalk.red("ERR! FAILED GETTING %s"),symbol);
                    }
                }
                else {
                    console.log(chalk.red("ERR! There was an error processing %s@%s: %s"), packageName, _packageVersion ,ex.message);
                }
            }
                
        ); */
    }
}


function handlePackageJson(_packageVersion: string, json: any) {
    var packageVersion = _packageVersion;
    if (packageVersion === LATEST) {
        packageVersion = json['dist-tags'].latest;
    }

    //handle local file version
    //see Local Paths under http://npm.github.io/using-pkgs-docs/package-json/types-of-dependencies.html
    if(packageVersion.startsWith('file:') || packageVersion.startsWith('../') || packageVersion.startsWith('~/') || packageVersion.startsWith('./') || packageVersion.startsWith('/')) {
        //don't support local directory dependcy. to be on the safe side, download latest
        packageVersion = json['dist-tags'].latest;
    }

    //handle git dependency
    if(packageVersion.startsWith('git:') || packageVersion.startsWith('git+') || packageVersion.startsWith('github:') || packageVersion.startsWith('github+') || packageVersion.startsWith('https://github') || packageVersion.startsWith('http://github')) {
        //TODO: add support to git dependecy. for now, download latest
        console.log(chalk.yellow("Warn: github dependencies from github not supported yet. (" + packageVersion + "). Using latest version from npm instead."));
        packageVersion = json['dist-tags'].latest;
    }

    var versionInfo = parseVersion(json, packageVersion);
    if(versionInfo===undefined)
    {
        console.log(chalk.red("wasn't able to parse package version %s"),packageVersion)
        return;
    }
    var versionSymbol = json.name + "@" + versionInfo.version;
    if (handledPackages[versionSymbol] === undefined) { //if we already processed this package@version
        if (program.log) {
            console.log('processing %s@%s... getting version %s', json.name, _packageVersion, versionInfo.version);
        }


        handledPackages[versionSymbol] = versionSymbol;
        DownloadPack(versionInfo.dist.tarball);

        //Handle package depedencies
        HandleDependencies(versionInfo.dependencies);

        //Handle package devDependencies
        HandleDependencies(versionInfo.devDependencies);

        //Handle package optionalDependencies
        HandleDependencies(versionInfo.optionalDependencies);

        //Handle package peerDependencies
        HandleDependencies(versionInfo.peerDependencies);

        
    }
    else {
        if (program.log) {
            console.log(chalk.gray('already handled %s. skipping.'), versionSymbol);
        }
    }
}

//Parse the version string to get the apporiate real version.
//For example, ~version “Approximately equivalent to version”, will update you to the next patch version. ~1.2.3 will use releases from 1.2.3 to <1.3.0.
//Another example: ^version Will update you to the next minor version .will use releases up to 3.0.0.
//See: https://docs.npmjs.com/files/package.json
//Also see: https://docs.npmjs.com/misc/semver and https://docs.npmjs.com/about-semantic-versioning and https://www.npmjs.com/package/semantic-release
function parseVersion(json: any, packageVersion: string) {
    var allVersions = new Array();

    var versions = json.versions;

    if(versions===undefined) {
        console.log(chalk.red("Err! %s doesn't have versions."),json._id);
        return;
    }

    Object.keys(versions).forEach(ver => {
        allVersions.push(ver);
    });
    

    let parsedVersion = semver.maxSatisfying(allVersions,packageVersion);
    if(parsedVersion===undefined) {
        parsedVersion = json['dist-tags'].latest; //use latest in that case
        console.log(chalk.yellow("Warn: " + packageVersion + " semantic versioning error. Using latest version instead (" + json.name + "@" + parsedVersion + ")"));

    }
    return json.versions[parsedVersion];
}

//Iterate a package dependecies in order to handle their dependencies.
function HandleDependencies(dependencies: any) {
    if (dependencies !== undefined) {
        Object.keys(dependencies).forEach(dep => {
            getPackageInfo(dep, dependencies[dep]);
        });
    }
}


function DownloadPack(pack: string) {
    if (program.log) { console.log("downloading from %s",pack) };
    var dlLocation = pack.replace(nodeRegUrl,"");
    
    var pathParse = path.parse(dlRoot + dlLocation);
    var saveFolder = pathParse.dir;
    var saveFile = pathParse.base;

    //create the folder for the pack
    if(!fs.existsSync(saveFolder)) {
        fs.mkdirSync(saveFolder, { recursive: true })
    }

    DownloadFile(pack,saveFolder,saveFile);
}

async function DownloadFile(url: string, whereToSave: string, fileName: string) {

    const dlpath = path.resolve(whereToSave,fileName);
    const writer = fs.createWriteStream(dlpath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);
  

    /*return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
      })*/
}
 