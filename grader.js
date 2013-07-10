#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio.  Teaches command line application development
and basic DOM parsing.

References:

  + cheerio
    - https://github.com/MatthewMueller/cheerio
    - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
    - http://maxogden.com/scraping-withnode.html

  + commander.js
    - https://github.com/visionmedia/commander.js
    - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

  + JSON
    - http://en.wikipedia.org/wiki/JSON
    - https://developer.mozilla.org/en-US/docs/JSON
    - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2

  + restler
    - http://github.com/danwrong/restler

  + util

*/

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var util = require('util');

var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";
var URL_DEFAULT = "http://safe-mountain-5602.herokuapp.com";

var DEBUG_LEVEL = 0;   // 0 = no debug

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var assertUrlForm = function(inUrl) {
    var instr = inUrl.toString();
    if (DEBUG_LEVEL == 1) { console.error(instr); }
    if (inUrl.slice(0,4)!="http") {
        console.log("%s must start with http.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var cheerioHtmlStr = function(htmlStr) {
    // uses cheerio to parse a string containing an html document.
    return cheerio.load(htmlStr);
};

var loadChecks = function(checksfile) {
    // loads a list of tags that need to be checked for
    return JSON.parse(fs.readFileSync(checksfile));
};

var buildfn = function(checksfile) {
    // creates the function to use as the 'complete' action when reading
    // from the url.
    //
    // the function created is parameterised by "checksfile", the path
    // to the file to check.
    var response2console = function(result, response) {
        if (result instanceof Error) {
            console.error('Error: ' + util.format(result.message));
        } else {
            var checkJson = checkHtml(result, checksfile);
            var outJson = JSON.stringify(checkJson, null, 4);
            console.log(outJson);
        }
    };
    return response2console;
};

var checkHtml = function(htmlIn, checksFile) {
    // function does:
    //  1) uses cheerio to parse the html based on input type - jquery style
    //  2) uses JSON to load list of tags to check for in html
    //  3) uses jquery to search html input for each tag in list
    //
    // Input:
    //   - htmlIn : a string containing an html document
    //   - checksfile : string containing a path to the JSON format list of html tags to check for
    //
    // Output:
    //   An object with each of the tags set as true or 
    //   false based on presence in the html
    //
    $ = cheerioHtmlStr(htmlIn);
    
    var checks = loadChecks(checksFile).sort();
    var out = {};
    
    for(var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }	
    return out;
};

var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

var checkHtmlFile = function(htmlFile,checkFile) {
    return checkHtml(fs.readFileSync(program.file), program.checks);
};

if(require.main == module) {
    program
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .option('-f, --file [html_file]', 'Path to index.html', clone(assertFileExists))
        .option('-u, --url [url]', 'URL of html to check', clone(assertUrlForm), URL_DEFAULT)
        .parse(process.argv);
    
    if(program.file) {
        console.error("Checking %s for tags listed in %s.\n",program.file,program.checks);
        var checkJson = checkHtmlFile(program.file, program.checks);
        var outJson = JSON.stringify(checkJson, null, 4);
        console.log(outJson);
    } else if(program.url) { 
	console.error("Checking \"%s\" for tags listed in \"%s\"",program.url, program.checks);
        var checkJson2Console = buildfn(program.checks);
        rest.get(program.url).on('complete',checkJson2Console);
    } else {
        program.help();
    }
} else {
    exports.checkHtml = checkHtml;
    exports.checkHtmlFile = checkHtmlFile;
}
