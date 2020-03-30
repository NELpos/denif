const _ = require('lodash');
const Discord = require('discord.js');
const sprintf = require('sprintf-js').sprintf;
const fs = require('./firestore');
const puppeteer = require('./puppeteer');
const raid = require('./raid');

class NotFoundError extends Error {
	constructor(message) {
		super(message);
		this.name = 'NotFoundError';
	}
}

class DuplicateError extends Error {
	constructor(message) {
		super(message);
		this.name = 'DuplicateError';
	}
}
function registerGongdae(db, msg) {
	return new Promise(async (resolve, reject )=> {
		try {
			let sendMsgArr = [], res = undefined;
			sendMsgArr.push('공격대를 생성합니다. 생성하실 `레이드명`을 입력해주세요.')
			msg.channel.send(sendMsgArr.join('\n'));

			res = await raid.showRaidAllList(db);
			msg.channel.send({embed : res.embed});

			console.log(res.data);

			//set filter
			const filter = res => {
				return res.author.id === msg.author.id;
			};
			

		} catch (err) {
			let errObj = undefined;
			switch (err.name) {
				case 'NotFoundError':
					errObj = { code: -1, resMsg: err.message };
					break;
				default:
					errObj = { code: 0, resMsg: err.stack };
			}
			resolve(errObj);
		}
	})
}
function editGongdae() {
	return new Promise(async (resolve, reject )=> {
		try {

		} catch (err) {
			let errObj = undefined;
			switch (err.name) {
				case 'NotFoundError':
					errObj = { code: -1, resMsg: err.message };
					break;
				default:
					errObj = { code: 0, resMsg: err.stack };
			}
			resolve(errObj);
		}
	})
}

function format() {
	return new Promise(async (resolve, reject )=> {
		try {

		} catch (err) {
			let errObj = undefined;
			switch (err.name) {
				case 'NotFoundError':
					errObj = { code: -1, resMsg: err.message };
					break;
				default:
					errObj = { code: 0, resMsg: err.stack };
			}
			resolve(errObj);
		}
	})
}

//공대
module.exports.registerGongdae = registerGongdae;
module.exports.editGongdae = editGongdae;
