"use strict";

const fs = require('fs');
const async = require('async');
const superagent = require('superagent');
const eventproxy = require('eventproxy');
const request = require('request');
// const request = require('request').defaults({'proxy': 'http://myproxy:1234/'});
const url = require('url');
const path = require('path');

let target = 'http://idzn.net/angular/src/#/app/dashboard-v1';
let srcBase = 'http://idzn.net/angular/src/';
let hostPath = 'http://idzn.net/angular/';
// let indexPage = '';
// let indexPageUrls = [];   // 正则表达式匹配网页引用的文件    ("|')[^('|")]+\.(js|css|html)(?='|")
let indexPageName = 'index.html'
let downloadDir = 'catch_web/';
let limit = 5;
let hideFilesRelativeUrls = ['js/config.lazyload.js', 'js/config.router.js'];

async.waterfall([
  createDownloadDir,
  fetchTargetIndex,
  makeDirsForMain,
  downloadMain,
  getRemain,
  makeDirsForRemain,
  downloadRemain
],function (err, result) {
  //TODO 所有步骤完成后的回调函数
  if (err) {
    console.log('err -> end');
    console.error(err);
  } else {
    console.log('misson completed');
  }
});

function createDownloadDir(callback) {
  console.log('createDownloadDir');
  fs.exists(downloadDir, function (exist) {
    if (exist) {
      callback(null);
    } else {
      fs.mkdir(downloadDir, callback(err));
    }
  });
}

function fetchTargetIndex(callback) {
  console.log('fetchTargetIndex');
  superagent
    .get(target)
    .end(function (err, data) {
      if (err) {
        console.log('catch fail');
        callback(err);
      } else {
        // console.log('catch success');
        let indexPage = data.text;
        // console.log(indexPage);
        let indexPageUrls = indexPage.match(/("|')[^('|")]+\.(js|css|html)(?='|")/g);
        let indexPageUrlsLen = indexPageUrls.length;
        //取回来的indexPageUrls 第一个字符是 ' ，需要删除。
        while (indexPageUrlsLen--) {
          indexPageUrls[indexPageUrlsLen] = indexPageUrls[indexPageUrlsLen].slice(1);
          // console.log(indexPageUrls[indexPageUrlsLen]);
        }
        fs.writeFile(downloadDir + indexPageName, indexPage, function (err) {
          if (err) {
            // console.log('writeFile err');
            callback(err);
          } else {
            // console.log('write successfully');
            // console.log(downloadDir);
            // console.log(indexPageUrls);
            callback(null, indexPageUrls);
          }
        });
      }
    });
    console.log('fetchTargetIndex complete');
}

function makeDirsForMain(indexPageUrls, callback){
  console.log('makeDirsForMain');
  let urlObjs = makeUrlObjs(hostPath, srcBase, indexPageUrls);
  // console.log(urlObjs);
  async.each(urlObjs, function (urlObj, callback) {
    let dirPath = downloadDir + urlObj.absoluteDir;
    // console.log(dirPath);
    mkdirs(dirPath, function (err) {
      console.log('make end');
      callback(err)
    });
  }, function (err) {
    if (err) {
      callback(err);
    } else {
      console.log('makeDirsForMain end');
      callback(null, urlObjs)
    }
  });
}

function downloadMain(urlObjs, callback) {
  console.log('downloadMain start');
  download(downloadDir, limit, urlObjs, function (err) {
    if (err) {
      callback(err);
    } else {
      callback(null);
    }
  });
  // callback(null, 233);
}

function getRemain(callback) {
  console.log('getRemain start');
  let urlObjs = makeUrlObjs(hostPath, srcBase, hideFilesRelativeUrls);
  async.map(urlObjs, function (urlObj, callback) {
    console.log('the urlObj is :');
    console.log(urlObj);
    console.log(downloadDir + urlObj.absoluteUrl);
    fs.readFile(downloadDir + urlObj.absoluteUrl, 'utf8', function (err, data) {
      if (err) {
        callback(err);
      } else {
        console.log('the hide file content:');
        // console.log(data);
        console.log(Buffer.isBuffer(data));
        console.log(typeof data === "string");
        var hideRelativeUrls =  data.match(/("|')[^('|")]+\.(js|css|html)(?='|")/g);
        console.log('------------the hideRelativeUrls:--------------');
        console.log(hideRelativeUrls);
        var len = hideRelativeUrls.length;
        while (len--) {
          hideRelativeUrls[len] = hideRelativeUrls[len].slice(1);
        }
      callback(null, hideRelativeUrls);
      }
    });
  }, function (err, urlsArray) {
    if (err) {
      callback(err);
    } else {
      let size = urlsArray.length;
      // console.log('urlsArray size :');
      // console.log(size);
      let relativeUrls = [];
      while (size--) {
        relativeUrls = relativeUrls.concat(urlsArray[size]);
      }
      // console.log(relativeUrls);
      callback(null, relativeUrls);
    }
  });
}

function makeDirsForRemain(relativeUrls, callback) {
  console.log('makeDirsForRemain start');
  let urlObjs = makeUrlObjs(hostPath, srcBase, relativeUrls);
  async.each(urlObjs, function (urlObj, callback) {
    let dirPath = downloadDir + urlObj.absoluteDir;
    // console.log(dirPath);
    mkdirs(dirPath, function (err) {
      console.log('make remain Dir end' + dirPath);
      callback(err)
    });
  }, function (err) {
    if (err) {
      callback(err);
    } else {
      console.log('makeDirsForRemain end');
      callback(null, urlObjs)
    }
  });
}

function downloadRemain(urlObjs, callback) {
  console.log('downloadRemain start');
  download(downloadDir, limit, urlObjs, function (err) {
    if (err) {
      callback(err);
    } else {
      callback(null);
    }
  });
}

// 用相对地址创建对象数组，包含相对地址，绝对地址，绝对目录，完整url
function makeUrlObjs(hostPath, srcBase, relativeUrls) {
  let urlObjs = [];
  let relativeUrlsLen = relativeUrls.length;
  while (relativeUrlsLen--) {
    let total = url.resolve(srcBase, relativeUrls[relativeUrlsLen]);
    let urlObj = {
      relativeUrl: relativeUrls[relativeUrlsLen],    // 相对地址
      absoluteUrl: total.substring(hostPath.length), // 绝对地址
      absoluteDir: path.parse(total).dir.substring(hostPath.length),  //绝对路径
      totalUrl: total    //完整url
    }
    // console.log(urlObj);
    urlObjs.push(urlObj);
  }
  return urlObjs;
}


// 将相对地址变为完整url
// eg: js/jquery/jquery.js  ->  http://helloworld.com/src/js/jquery/jquery.js
//     ../lib/bootstrap/js/bootstrap.js  ->  http://helloworld.com/lib/bootstrap/js/bootstrap.js
function modifyUrls(srcBase, toBeModified) {
  let toBeModifiedLen = toBeModified.length;
  while (toBeModifiedLen--) {
    toBeModified[toBeModifiedLen] = url.resolve(srcBase, toBeModified[toBeModifiedLen]);
  }
  return toBeModified;
}

// 相对地址变绝对地址  (创建文件的时候使用)
// eg: js/jquery/jquery.js  ->  src/js/jquery/jquery.js
//     ../lib/bootstrap/js/bootstrap.js  ->  lib/bootstrap/js/bootstrap.js
function modifyAbso(hostPath, srcBase, toBeModified) {
  let toBeModifiedLen = toBeModified.length;
  while (toBeModifiedLen--) {
    toBeModified[toBeModifiedLen] = url.resolve(srcBase, toBeModified[toBeModifiedLen]).substring(hostPath.length);
    // let base = path.parse(toBeModified[toBeModifiedLen]).base;
  }
  return toBeModified;
}

// 相对地址变绝对目录（不含文件名，创建目录的时候使用）
// eg: js/jquery/jquery.js  ->  src/js/jquery
//     ../lib/bootstrap/js/bootstrap.js  ->  lib/bootstrap/js
function modifyAbsoDir(hostPath, srcBase, toBeModified) {
  let toBeModifiedLen = toBeModified.length;
  while (toBeModifiedLen--) {
    toBeModified[toBeModifiedLen] = path.parse(
      url.resolve(srcBase, toBeModified[toBeModifiedLen])
    )
    .dir
    .substring(hostPath.length);
    console.log(toBeModified[toBeModifiedLen]);
  }
}

// 创建路径目录
function mkdirs(dirPath, callback) {
  fs.exists(dirPath, function (exist) {
    if (exist) {
      // console.log(dirPath + ' is existed.');
      callback(null);
      return;
    } else {
      mkdirs(path.dirname(dirPath), function () {
        // console.log('make Dir for ' + dirPath);
        fs.mkdir(dirPath, callback);
      });
    }
  });
}

// 下载引用的文件
// function downloadFile(downloadObj) {
//   request(downloadObj.dir).pipe(fs.createWriteStream(downloadObj.url));
// }

function download(downloadDir, limit, urlObjs, callback) {

  async.eachLimit(urlObjs, limit, function (urlObj, callback) {
    let writer = fs.createWriteStream(downloadDir + urlObj.absoluteUrl);
    request.get(urlObj.totalUrl)
      .on('error', function (err) {
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!网络异常！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！');
        callback(err);
      })
      .on('response', function (response) {
        console.log('看看请求返回什么');
        console.log(response.headers['content-type']);
      })
      .pipe(writer)
      // .on('end',function () {
      //   console.log('watching the end');
      //   writer.end();
      //   callback(null);
      // });
      .on('end', function () {
        console.log('正在监听end事件');
      })
      .on('close', function () {
        console.log('文件读取完成');
        callback(null);
      })
    // callback(null);

  }, function (err) {

    if (err) {
      callback(err);
    } else {
      console.log('files download complete.');
      callback(null);
    }

  });
}
