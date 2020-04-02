const mode = process.env.NODE_ENV;
const fs = require('./firestore');
const rp = require('request-promise');
const _ = require('lodash');
const webhook = require("webhook-discord")
let hook = undefined;

class ConnectWebhookError extends Error {
	constructor(message) {
		super(message);
		this.name = 'ConnectWebhookError';
	}
}

class SendWebhookError extends Error {
	constructor(message) {
		super(message);
		this.name = 'SendWebhookError';
	}
}

async function sendWebhookEmbed(db, channelName, embeds) {
	return new Promise(async (resolve, reject) => {
		try {
			let dbRes = await fs.getDoc(db, 'webhook', channelName);
			if(dbRes.code !== 1 ) throw new ConnectWebhookError('웹훅 URL 조회에 실패했습니다.');

			//generate new token
			let options = {
				method: 'POST',
				url: dbRes.data['webhookUrl'],
				body: {
					username: 'denif',
					avatar_url : 'https://cdn.discordapp.com/attachments/692260599228268604/694832578309390356/sm_skill_01_19.png',
					// embeds : embeds
					embeds : embeds
				},
				json: true
			};
			let res = await rp(options);
			resolve({code : 1, data : res});
		} catch(err) {
			console.log(err.stack);
			let errObj = undefined;
			switch (err.name) {
				case 'SendWebhookError:':
					errObj = { code: -1, resMsg: err.message };
					break;
				default:
					errObj = { code: 0, resMsg: err.stack };
			}
			resolve(errObj);
	
		}
	})
}

function initToken(db) {
	return new Promise(async (resolve, reject) => {
		try {
			//get token
			let getDBRes = await fs.getDoc(db, 'discord', 'bot'),
				clientID = getDBRes.data[mode].clientID;

			//generate new token
			let options = {
				method: 'POST',
				url: `https://discordapp.com/api/v6/applications/${clientID}/bot/reset`,
				headers: {
					authorization: getDBRes.data[mode].token
				}
			};
			let res = JSON.parse(await rp(options));
			return resolve(res.token);
		} catch(err) {
			console.log(err.stack);
		}

	});
}

function getAllowChannel(db) {
	return new Promise(async (resolve, reject) => {
		//get Allow Channel
		let getDBRes = await fs.getDoc(db, 'discord', 'channelID');

		return resolve(Object.keys(getDBRes.data));

	});
}
async function collectMsg(msg, 
	questionArr,
	escapeTxt = '입력 진행을 종료합니다',
	waitTime = 60000,
	returnData = undefined
	) {
	return new Promise(async (resolve, reject) => {
		try {
			//set filter
			const filter = res => {
				return res.author.id === msg.author.id;
			};
	
			//send question msg
			msg.channel.send(questionArr.join('\n'));
	
			//recieve reply msg
			let collected = await msg.channel.awaitMessages(filter, {max:1, time : waitTime, errors: ['time'] })
			replyMsg =  await collected.first().content;
			//탈출 블록
			if (_.includes(['종료', '그만', '취소'], replyMsg)) {
				msg.channel.send(escapeTxt);
				return resolve({ code: -2 });
			}
			return resolve({ code: 1, replyMsg: replyMsg, data : returnData});
		} catch(err) {
			//Timeout Error (empty Collection)
			if (Object.keys(err).length === 0) {
				msg.channel.send('Timeout Error');
				return resolve({code : -2});
			} else return resolve({code : 0, resMsg : err.message})
	
		}
	})

}

module.exports.getAllowChannel = getAllowChannel;
module.exports.initToken = initToken;
module.exports.collectMsg = collectMsg;
module.exports.sendWebhookEmbed = sendWebhookEmbed;