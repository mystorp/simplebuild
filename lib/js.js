var UglifyJS = require('uglify-js');
var browserify = require('browserify');
var through = require('through');
var babel = require('babel-core');

var utils = require('../utils');
var es2015_path = require.resolve('babel-preset-es2015');

exports.execute = execute;

exports.buildInMemory = buildInMemory;

/*
 *
 * @params config.input
 * @params config.output
 * @params config.commonjs
 * @params config.es6
 * @return Promise
 */
function execute(task) {
    return concat(task).then(function(result){
        if(task.output_minify) {
            return minify(result, task.output_minify);
        } else {
            return result;
        }
    });
}

function concat(task, save) {
    var result = Promise.resolve(task.input);
    if(task.es6) {
        result = result.then(compile2es5);
		task.commonjs = true;
    }
	if(task.commonjs) {
        result = result.then(bundle);
    }
    return result.then(function(objects){
		// 如果没有翻译 es6 代码，也没有打包，objects 是文件名数组
		return objects.map(function(obj){
			if(obj.code) {
				return obj;
			} else {
				return {file: obj, code: utils.readfile(obj)};
			}
		});
    }).then(function(objects){
		var contentlist = [], allcode, ret;
		objects.forEach(function(obj, i){
			if(obj.file) {
				if(i === 0) {
					contentlist.push('/* file: ' + obj.file + ' */\n');
				} else {
					contentlist.push('\n/* file: ' + obj.file + ' */\n');
				}
			}
			contentlist.push(obj.code);
		});
		allcode = contentlist.join('');
		if(task.output && save !== false) {
			utils.writefile(task.output, allcode);
		}
        // 将依赖的文件加入到返回值里面
        ret = {file: task.output, code: allcode};
        if(objects.length === 1 && task.commonjs) {
            ret.dependencies = objects[0].dependencies;
        }
		return ret;
    });
}

function compile2es5(input) {
	var objects = [];
	input.forEach(function(file){
		var result = babel.transformFileSync(file, {
			presets: [es2015_path]
		});
		objects.push({code: result.code, file: file, es6: true});
	});
	return Promise.resolve(objects);
}

function bundle(input) {
	var es6 = input[0].es6, files, b, deps = [];
	if(es6) {
		files = input.map(function(obj){
			return obj.file;
		});
	} else {
		files = input;
	}
	b = browserify(files, {});
    b.on('file', function(file){
        deps.push(file);
    });
	if(es6) {
		b.transform(function(file){
			var data;
			input.forEach(function(obj){
				if(obj.file === file) {
					data = obj.code;
				}
			});
			if(!data) {
				data = babel.transformFileSync(file, {presets: [es2015_path]}).code;
			}
			return through(function(){}, function(){
				this.queue('/* file: ' + file + '*/');
				this.queue(data);
				this.queue(null);
			});
		});
	}
	return new Promise(function(resolve, reject){
		b.bundle(function(err, buf){
			if(err) {
				reject(err);
			} else {
				resolve([{code: buf, dependencies: deps}]);
			}
		});
	});
}

function minify(input, output) {
    var result = UglifyJS.minify(input.code, {
        fromString: true
    });
    utils.writefile(output, result.code);
    return Promise.resolve({code: result.code, file: output});
}

/**
 * 这个函数被 route 用来通知文件变化，并更新缓存
 * @param e.file 发生变化的文件
 * @param e.task build 配置对象
 * @return promise
 */
function buildInMemory(asset) {
	return concat(asset, false);
}
