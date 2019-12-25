#!/usr/bin/env node

const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const path = require('path');
const program = require('commander');
const nodefetch = require('node-fetch');
const request = require("sync-request");
const semver = require('semver');

const LATEST = 'latest';

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
    
    let url = "https://registry.npmjs.org/" + packageName;

    
    var tryJson = jsonCache[packageName];

    if(tryJson!==undefined) {  //we have the json in cache. Yay!
        if(program.log) { console.log('Got %s from cache.',packageName) };

        handlePackageJson(_packageVersion,tryJson);
    }
    else //not in cache. need to get it from registry
    {
        if(program.log) { console.log("GET: " + url) };

        var response = request('GET', url);
        var body = response.getBody();
        var json = JSON.parse(body);


        if(program.log) { console.log("GOT RESPONSE:" + url) };

        //check if we got a valid response
        if(json['error']!==undefined) {
            console.log(chalk.red('Err! URL %s returned an error: %s'),url,json['error']);
        }
        else
        {      
            jsonCache[packageName] = json; //save the json in a cache in order not to pull from url in case we need to get this package info again.
            handlePackageJson(_packageVersion, json);
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
    var versionInfo = parseVersion(json, packageVersion);
    var versionSymbol = json.name + "@" + versionInfo.version;
    if (handledPackages[versionSymbol] === undefined) { //if we already processed this package@version
        if (program.log) {
            console.log('processing %s@%s... getting version %s', json.name, _packageVersion, versionInfo.version);
        }


        handledPackages[versionSymbol] = versionSymbol;
        DownloadPack(json._id);

        //Handle package depedencies
        HandleDependencies(versionInfo.dependencies);

        //Handle package devDependencies
        HandleDependencies(versionInfo.devDependencies);

        
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
        console.log(chalk.red(packageVersion + " IS BAD"));
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
    console.log(pack);
}
 