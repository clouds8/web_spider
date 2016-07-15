"use strict";

const fs = require('fs');
const async = require('async');
const superagent = require('superagent');
const eventproxy = require('eventproxy');
const request = require('request');
const url = require('url');
const path = require('path');

let target = 'http://idzn.net/angular/src/#/app/dashboard-v1';
let srcBase = 'http://idzn.net/angular/src/';
let hostPath = 'http://idzn.net/angular/';
// let indexPage = '';
// let indexPageUrls = [];   // 正则表达式匹配网页引用的文件    ("|')[^('|")]+\.(js|css|html)(?='|")
let indexPageName = 'index'
let downloadDir = 'catch_web/';

let preWorkEP = new eventproxy

// preWorkEP.all('getIndexPageUrls', 'makeStoreFile', 'createIndexPage', function(){
//
// });
// preWorkEP.fail(function (err) {
//   console.error(err);
// });
//
// superagent
//   .get(target)
//   .end(preWorkEP.done('getIndexPageUrls', data){
//
//     return indexPageUrls;
//   })

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
});

function createDownloadDir(callback) {
  mkdir(downloadDir, callback(err));
}

function fetchTargetIndex(callback) {
  superagent
    .get(target)
    .end(function (err, data) {
      if (err) {
        callback(err);
      } else {
        let indexPage = data.text;
        let indexPageUrls = indexPage.match(/("|')[^('|")]+\.(js|css|html)(?='|")/g);
        let indexPageUrlsLen = indexPageUrls.length;
        //取回来的indexPageUrls 第一个字符是 ' ，需要删除。
        while (indexPageUrlsLen--) {
          indexPageUrls[indexPageUrlsLen] = indexPageUrls[indexPageUrlsLen].slice(1);
        }
        fs.writeFile(indexPageName, indexPage, function (err) {
          if (err) {
            callback(err);
          } else {
            callback(downloadDir, indexPageUrls)
          }
        });
      }
    });
}

function makeDirsForMain(downloadDir, indexPageUrls, callback){
  
}


superagent
  .get(target)
  .end(function (err, data) {
    if (err) {
      console.error(err);
    } else {
      indexPage = data.text;
      indexPageUrls = indexPage.match(/("|')[^('|")]+\.(js|css|html)(?='|")/g);
      // 取回来的indexPageUrls 第一个字符是 ' ，需要删除。
      let indexPageUrlsLen = indexPageUrls.length;
      while (indexPageUrlsLen--) {
        indexPageUrls[indexPageUrlsLen] = indexPageUrls[indexPageUrlsLen].slice(1);
      }
      console.log(indexPageUrls);
      fs.mkdir(downloadDir, function (err) {
        if (err) {
          console.log(err);
        } else {
          fs.writeFile(indexPageName, indexPage, function () {

          })
        }
      })
    }
  });
