#!/usr/bin/node
"use strict";

var Promise = require('bluebird');
var ElasticSearch = require('elasticsearch');
var request = require('request');
var moment = require("moment");
var fs = require('fs');



// 作品集の最大値(2015/12/11 時点で209)
var MAX_SUBJECT = 209;

// インデックス名
var index_name = 'ssw';
// タイプ名
var type_name = 'thread';

var elasticsearch = new ElasticSearch.Client({
		"host": {
			"protocol": "http",
			"host": "localhost",
			"port": 9200
		},
		"log": "error",
		"apiVersion": "2.0",
		"requestTimeout": 3000,
		"keepAlive": true,
		"maxSockets": 10,
		"minSockets": 1
});

// 作品集のURL一覧
var subjects = [];
for(var i = 1; i <= MAX_SUBJECT; i++) {
	subjects.push("http://coolier.dip.jp/sosowa/ssw_l/" + i + ".json");
}


console.log('[BEGIN]作品のサブジェクト一覧取得');
var entries = [];
subjects.reduce(function(promise, subject_url) {
	return promise.then(function() {
		return new Promise(function(resolve, reject) {
			request(subject_url, function (error, response, body) {
				if (error || response.statusCode !== 200) { return reject(); }
				var data = JSON.parse(body);

				data.entries.forEach(function(entry) {
					entries.push("http://coolier.dip.jp/sosowa/ssw_l/0/" + entry.id + ".json");
				});
				resolve();
			});
		});
	});
}, Promise.resolve())
.then(function() {
	console.log('count: ' + entries.length);

	fs.writeFile('subjects.json', JSON.stringify(entries));

	console.log('[END]作品のサブジェクト一覧取得');
})
.then(function() {
	console.log('[BEGIN]作品の個別ページ取得');

	return entries.reduce(function(promise, entry_url) {
		return promise.then(function() {
			return new Promise(function(resolve, reject) {
				request(entry_url, function (error, response, body) {
					if (error || response.statusCode !== 200) { return reject(); }
					var data = JSON.parse(body);

					// 投稿日を付与
					var timestamp = moment.unix(data.entry.dateTime).format("YYYY-MM-DD");
					data.timestamp = timestamp;

					// 不要なデータは削除
					delete data.formattedBody;
					delete data.formattedAfterword;

					resolve(data);
				});
			})
			.then(function(data) {
				console.log(entry_url);

				return elasticsearch.create({
						index: index_name,
						type: type_name,
						body: data
				});
			})
			.catch(function(err){
				console.log(err);
			});
		});
	}, Promise.resolve());
})
.then(function() {
	console.log('[END]作品の個別ページ取得');
	process.exit(0);
});

