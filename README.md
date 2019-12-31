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
  -p, --package <value>  node module package to do
  -V, --version          output the version number
  -v, --ver <value>      the version of the node m
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