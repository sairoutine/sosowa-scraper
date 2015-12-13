#!/usr/local/bin/node
"use strict";

var Promise = require('bluebird');
var ElasticSearch = require('elasticsearch');
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

// インデックス名
var index_name = 'ssw';
// タイプ名
var type_name = 'thread';

Promise.resolve()
.then(function() {
	// インデックスの作成
	return elasticsearch.indices.create({
		"index": index_name,
	});
})
.then(function() {
	// インデックスを一旦クローズ
	return elasticsearch.indices.close({
		"index": index_name,
	});
})
.then(function() {
	// インデックスのデフォルトのセッティング
	return elasticsearch.indices.putSettings({
		"index": index_name,
		"body": {
			"analysis": {
				filter: {
					pos_filter: {type: "kuromoji_part_of_speech", stoptags: ["助詞-格助詞-一般", "助詞-終助詞"]},
					greek_lowercase_filter: {type: "lowercase", language: "greek"}
				},
				analyzer: {
					kuromoji_analyzer: {
						type: "custom",
						tokenizer: "kuromoji_tokenizer",
						/*
						 * kuromoji_baseform: 動詞と形容詞を原型に戻す
						 * pos_filter: 除外する品詞
						 * greek_lowercase_filter: 英字を小文字に統一
						 * 全角英数字を半角、半角カタカナを全角に
						 */
						filter: ["kuromoji_baseform", "pos_filter", "greek_lowercase_filter", "cjk_width"]
					}
				}
			}
		}
	});
})
.then(function() {
	// インデックスをオープン
	return elasticsearch.indices.open({
		"index": index_name,
	});
})
.then(function() {
	process.exit(0);
});

