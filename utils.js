var path = require('path');
var fs = require('fs');
var crypto = require('crypto');

var json = require('comment-json');
var Mock = require('mockjs');

exports.resolve_path = resolve_path;
exports.eachfile = eachfile;
exports.readfile = readfile;
exports.writefile = writefile;
exports.md5 = md5;
exports.filemd5 = filemd5;
exports.config_error = config_error;
exports.check_conflict = check_conflict;
exports.invalid_output_error = invalid_output_error;
exports.readable_time = readable_time;
exports.load_config = load_config;
exports.make_response = make_response;


function resolve_path(input) {
	if(!input) { return input; }
	if(Array.isArray(input)) {
		return input.map(function(p){
			return path.resolve(p);
		});
	} else {
		return path.resolve(input);
	}

}

function eachfile(input, callback) {
	if(!Array.isArray(input)) {
		input = [input];
	}
	input.forEach(function(f){
		var content = fs.readFileSync(f, 'utf-8');
		callback(content, f);
	});
}

function readfile(input) {
    return fs.readFileSync(input, 'utf-8');
}

function writefile(file, content) {
	var oldmd5 = filemd5(file);
	var newmd5 = md5(content);
	// 如果文件已经存在，并且将要写入的内容和现有内容一致
	if(oldmd5 === newmd5) { return; }
	fs.writeFileSync(file, content);
}

function md5(str) {
	var hash = crypto.createHash('md5');
	hash.update(str);
	return hash.digest('hex');
}

function filemd5(file) {
	try {
		var content = fs.readFileSync(file);
		return md5(content);
	} catch(e) {
		return null;
	}
}

function config_error(field) {
	return Promise.reject(new Error("config error for field \"" + field + '"'));
}


function check_conflict(input, output) {
	var conflict = false;
	input.forEach(function(f){
		if(f === output) {
			conflict = true;
			return false;
		}
	});
	return conflict;
}

function invalid_output_error() {
	return Promise.reject("config for output can't be one of input");
}

function readable_time(time) {
	var parts = [], ms, seconds, sec, minutes, min, hours;
	ms = time % 1000;
	seconds = (time - ms) / 1000;
	sec = seconds % 60;
	minutes = (seconds - sec) / 60;
	min = minutes % 60;
	hours = (minutes - min) / 60;
	if(hours > 0) {
		parts.push(hours + 'h');
	}
	if(min > 0) {
		parts.push(miin + 'm');
	}
	if(sec > 0) {
		parts.push(sec + 's');
	}
	if(ms > 0) {
		parts.push(ms + 'ms');
	}
	return parts.join('');
}


function load_config(cfgfile) {
    var content = readfile(cfgfile);
    return json.parse(content, null, true);
}


function make_response(resp, file) {
    var content = readfile(file);
    resp.json(Mock.mock(json.parse(content)));
}
