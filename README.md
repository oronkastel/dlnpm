# dlnpm
Download npm packages as .tgz files in order to be used in private npm repository (such as Nexus).

## Installing
Use npm to install this tool.
```
npm i dlnpm -g
```

## How To Use
Run dlnpm from command line.
```
Options:
  -p, --package <value>  node module package to download.
  -v, --ver <value>      the version of the node module specified. Default: Latest.
  -V, --version          output the version number.
  -i, --ignore <value>   ignore list filename.
  -l --log               verbose log.
  -h, --help             output usage information.
```
dlnpm will download the npm package specified by the -p option and all of its depedencies (including development dependencies). The packages will be downloaded as .tgz files which should be copied to your private npm repository.

## Versions
### 0.0.1
First release. Buggy and not all options were implemented.
### 0.0.2
Fixes bug where in some situations packages files were created but not downloaded (files were sized 0Kb).
The solution uses curl which is not a good solution, but a good one will come soon.
### 0.0.3
Support the -i --ignore option.

Download packages asynchronically still doesn't work :(
### 0.0.4
Minor fix with the npm packging.

## Ignore list
The ignore list file lists all the dependencies we don't want to process and download. Usually used in order to maintain a list of modules we already downloaded.
The file should be a text file in the format of packge-version in each line. for example:
```
yaml-0.2.3
vows-0.5.13
prova-3.0.0
```
When ignore list is used, a file named DL.TXT will be created with the new modules downloaded. This should be added to a future ignore list file.