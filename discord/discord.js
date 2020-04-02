const mode = process.env.NODE_ENV;

const _ = require('lodash');
const Discord = require('discord.js');
const sprintf = require('sprintf-js').sprintf;

const Module = require('./module');
const {
	raid,
	character,
	fs,
	gongdae,
	discordUtil,
	usages
} = Module;

const db = fs.init();
const client = new Discord.Client();

class DebugError extends Error {
	constructor(message) {
		super(message);
		this.name = 'DebugError';
	}
}

class CommandError extends Error {
	constructor(message) {
		super(message);
		this.name = 'CommandError';
	}
}

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

class EscapeError extends Error {
	constructor(message) {
		super(message);
		this.name = 'EscapeError';
	}
}

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
});

/* 레이드 */
//조회 : 레이드 종류 조회
//생성 : [레이드]
//신청 : [레이드] [캐릭터명]
//신청취소 : [레이드] [캐릭터명]

/* 공격대 */
// 생성 : [레이드 종류] [공격대명]
// 공대장 : [공격대명] [캐릭터명]
// 조회 [공격대ID] [1파티]
// 추가/이동 [공격대ID] [캐릭터명] [파티]
// 교환 [공격대ID] [캐릭터명] [캐릭터명]
// 제거 [공격대ID] [캐릭터명]
// 신청 [공격대ID]
// 시간설정 [공격대ID] 시간
// 알람시간설정 [공격대ID]
// 공팟 멤버 생각

// 캐릭터 등록 [캐릭터명]
// 캐릭터 삭제 [캐릭터명]
// 캐릭터 갱신 [캐릭터명]
// 캐릭터 조회 [캐릭터명]

// 레이드 등록 [레이드명] [인원수]
// 레이드 삭제 [레이드명]
// 레이드 참가현황 [캐릭터명]
// 레이드 참가신청 [캐릭터명]
// 레이드 참가취소 [캐릭터명]

function resNavigation(res) {

}

client.on('message', async msg => {
	
	let replyMsg = '',
		replyMsgArr = [],
		sendMsg = '',
		sendMsgArr = [];
	let params = msg.content.split(' ');
	let allowChannelID = await discordUtil.getAllowChannel(db);
	let replyFlag = true;

	/*filter*/
	// don't reply webhook, reply bot-message,
	if(msg.webhookID !== null || msg.member.user.username === 'denif' ) return;

	//un-allow channel
	if (_.indexOf(allowChannelID, msg.channel.id) === -1) {
		msg.channel.send('봇이 등록되지 않은 채널입니다.');
		console.log(msg.channel.id);
		return;
	} 

	let command = params[0];
	let subCommand = params[1];

	try {
		switch (command) {
			case '레이드':
				switch (subCommand) {
					case '등록':
						{
							let res = await raid.registerRaid(db, msg);
							switch(res.code) {
								case 0:
									throw new DebugError(res.resMsg);
									break;
								case -1 : 
									throw new NotFoundError(res.resMsg);
									break;
								case -2: 
									/*Collect Escape*/
									break;
								default : 
									msg.channel.send(sprintf('`%s` 레이드가 등록되었습니다.', res.data));
							}
						}
						break;
					case '삭제':
						{
							let res = await raid.deleteRaid(db, msg);
							switch(res.code) {
								case 0:
									throw new DebugError(res.resMsg);
									break;
								case -1 : 
									throw new NotFoundError(res.resMsg);
									break;
								case -2: 
									/*Collect Escape*/
									break;
								default : 
									msg.channel.send(sprintf('`%s` 레이드가 삭제되었습니다.', res.data));
							}
						}
						break;
					case '조회': 
						{
							let res = await raid.getRaid(
								db,
								msg
							);
							switch(res.code) {
								case 0:
									throw new DebugError(res.resMsg);
									break;
								case -1 : 
									throw new NotFoundError(res.resMsg);
									break;
								case -2: 
									/*Collect Escape*/
									break;
								default : 
									msg.channel.send({ embed: res.embed });
							}
						}
						break;
					case '참가신청':
						{
							let res = await raid.attendRaids(db, msg);
							switch(res.code) {
								case 0:
									throw new DebugError(res.resMsg);
									break;
								case -1 : 
									throw new NotFoundError(res.resMsg);
									break;
								case -2: 
									/*Collect Escape*/
									break;
								default : 
									/**/
							}
						}
						break;
					case '참가현황':
						{
							let res = await raid.showAttendRaids(db, msg);
							switch(res.code) {
								case 0:
									throw new DebugError(res.resMsg);
									break;
								case -1 : 
									throw new NotFoundError(res.resMsg);
									break;
								case -2: 
									/*Collect Escape*/
									break;
								default : 
									/**/
							}
						}
						break;
					case '참가취소':
						{
							let res = await raid.cancelRaids(db, msg);
							switch(res.code) {
								case 0:
									throw new DebugError(res.resMsg);
									break;
								case -1 : 
									throw new NotFoundError(res.resMsg);
									break;
								case -2: 
									/*Collect Escape*/
									break;
								default : 
									/**/
							}
						}
						break;
					case '/?':
						let res = await usages.lookupUsages(db, command);
						switch(res.code) {
							case 0:
								throw new DebugError(res.resMsg);
								break;
							case -1 : 
								throw new NotFoundError(res.resMsg);
								break;
							default : 
								msg.channel.send({'embed' : res.embed});
						}
						break;
					default:
						msg.channel.send('잘못된 레이드 명령어입니다. `레이드 /?` 를 입력하여 사용법을 확인하세요.');
				}
				break;
			case '공대':
				switch (subCommand) {
					case '생성': {
						let res = await gongdae.registerGongdae(db, msg);
						if (res.code === 0) throw new Error(res.resMsg);
						else if (res.code === -1) throw new NotFoundError(res.resMsg);
						msg.channel.send(sprintf('`%s` 공대 생성이 완료되었습니다\n`공대 편성`명령으로 공대 인원을 편성하세요', res.name));
					}
						break;
					case '편성': {
						// await discordUtil.collectTestMsg(msg);
						let res = await gongdae.editGongdae(db, msg);
						if (res.code === 0) throw new Error(res.resMsg);
						else if (res.code === -1) throw new NotFoundError(res.resMsg);
						msg.channel.send('공대 편성이 완료되었습니다');
					}
						break;
					case '편성완료':
						break;	
					case '인원교체':
						break;
					case '인원제거':
						break;
					case '시간설정':
						break;
					case 'DM푸시':
						break;
				}
				break;
			case '캐릭터':
				switch (subCommand) {
					case '등록': {
						//캐릭터 등록
						let res = await character.registerCharacter(
							db,
							msg,
							msg.member.user
						);
						switch(res.code) {
							case 0:
								throw new DebugError(res.resMsg);
								break;
							case -1 : 
								throw new NotFoundError(res.resMsg);
								break;
							case -2: 
								/*Collect Escape*/
								break;
							default : 
								msg.channel.send(sprintf('`%s` 캐릭터 등록이 완료되었습니다.', res.characterName));
						}

						//등럭된 캐릭터 조회
						res = await character.lookupCharacterByName(db, res.characterName);
						switch(res.code) {
							case 0:
								throw new DebugError(res.resMsg);
								break;
							case -1 : 
								throw new NotFoundError(res.resMsg);
								break;
							case -2: 
								/*Collect Escape*/
								break;
							default : 
								msg.channel.send({ embed: res.embed });
						}
						break;
					}
					case '조회':
						{
							let res = await character.lookupCharacter(db, msg);
							switch(res.code) {
								case 0:
									throw new DebugError(res.resMsg);
									break;
								case -1 : 
									throw new NotFoundError(res.resMsg);
									break;
								case -2: 
									/*Collect Escape*/
									break;
								default : 
									msg.channel.send({ embed: res.embed });
							}
							break;
						}
						break;
					case '갱신': {
						let res = await character.updateCharacter(
							db, msg
						);
						switch(res.code) {
							case 0:
								throw new DebugError(res.resMsg);
								break;
							case -1 : 
								throw new NotFoundError(res.resMsg);
								break;
							case -2: 
								/*Collect Escape*/
								break;
							default : 
								msg.channel.send(sprintf("`%s` 캐릭터 정보(아이템 레벨, 길드 정보)를 갱신하였습니다.", res.characterName))
						}

						//업데이트 된 캐릭터 한번더 조회
						res = await character.lookupCharacterByName(db, res.characterName);
						switch(res.code) {
							case 0:
								throw new DebugError(res.resMsg);
								break;
							case -1 : 
								throw new NotFoundError(res.resMsg);
								break;
							case -2: 
								/*Collect Escape*/
								break;
							default : 
								msg.channel.send({ embed: res.embed });
						}
					}
						break;
					case '삭제': {
						let res = await character.deleteCharacter(db, msg);
						switch(res.code) {
							case 0:
								throw new DebugError(res.resMsg);
								break;
							case -1 : 
								throw new NotFoundError(res.resMsg);
								break;
							case -2: 
								/*Collect Escape*/
								break;
							default : 
								msg.channel.send(sprintf('`%s` 캐릭터가 삭제되었습니다.', res.characterName))
						}
						break;
					}
					case '태깅' : {
						let res = await character.updateTagCharacter(db, msg);
						switch(res.code) {
							case 0:
								throw new DebugError(res.resMsg);
								break;
							case -1 : 
								throw new NotFoundError(res.resMsg);
								break;
							case -2: 
								/*Collect Escape*/
								break;
							default : 
								msg.channel.send(sprintf('`%s` 캐릭터가 태깅되었습니다.', res.characterName))
						}
						break;
					}
					case '/?':
						let res = await usages.lookupUsages(db, command);
						switch(res.code) {
							case 0:
								throw new DebugError(res.resMsg);
								break;
							case -1 : 
								throw new NotFoundError(res.resMsg);
								break;
							default : 
								msg.channel.send({'embed' : res.embed});
						}
						break;
					default:
						msg.channel.send('잘못된 캐릭터 명령어입니다. `캐릭터 /?` 를 입력하여 사용법을 확인하세요.');
	
				}
				break;
			case '/?':
				case '/?':
					let res = await usages.lookupUsages(db, 'all');
					switch(res.code) {
						case 0:
							throw new DebugError(res.resMsg);
							break;
						case -1 : 
							throw new NotFoundError(res.resMsg);
							break;
						default : 
							msg.channel.send({'embed' : res.embed});
				}
				break;
			break;
			default:
				/**/	
				//msg.channel.send('등록 되지 않은 명령어입니다.');
		}
	} catch (err) {
		console.log(err);
		let replyMsg = '명령 수행에 실패했습니다.\n';
		switch (err.name) {
			case 'DebugError':
				msg.reply(replyMsg + '```' + err.stack + '```');
				break;
			case 'CommandError':
			case 'NotFoundError':
			case 'DuplicateError':
				msg.channel.send(err.message);
				break;
			case 'DebugError':
				msg.channel.send(sprintf('%s```%s```', replyMsg, err.stack));
				break;
			default:
				msg.reply(replyMsg + err.message);
		}
	}
});
if (_.isUndefined(mode) || _.indexOf(['dev', 'prod'], mode) === -1)
	throw new Error('NODE_ENV undefined');

discordUtil.initToken(db).then(token => {
	client.login(token);
})
