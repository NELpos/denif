const mode = process.env.NODE_ENV;

const _ = require('lodash');
const Discord = require('discord.js');
const sprintf = require('sprintf-js').sprintf;

const Module = require('./module');
const {
	bot,
	raid,
	character,
	fs,
	usages,
	puppeteer,
	conf,
	gongdae,
} = Module;
const config = conf.config;

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

/* 캐릭터 */
// 등록 : 계정 등록
// 갱신 : 계정 정보 갱신
// 삭제 : 계정 삭제
// 시너지 : [시너지 ID]
// 파괴레벨 : 파괴레벨 등록 (임시)
// 무력화  : (임시)

/* 시너지 */
// 조회 : 등록된 시너지 조회
// 생성 : 시너지 생성
// 삭제 : 시너지 삭제

client.on('message', async msg => {
	let replyMsg = '',
		replyMsgArr = [],
		sendMsg = '',
		sendMsgArr = [];
	let params = msg.content.split(' ');
	let allowChannelID = ['692260599228268604'];
	let replyFlag = true;

	//don't reply bot-message, un-allow channel
	if (_.indexOf(allowChannelID, msg.channel.id) === -1) return;
	if (msg.member.user.username === 'denif-bot') return;

	try {
		let db = fs.init();
		switch (params[0]) {
			case '레이드':
				switch (params[1]) {
					case '등록':
						{
							let res = await raid.registerRaid(db,params[2], params[3]);
							if (res.code !== 1) throw new CommandError(res.resMsg);
							msg.channel.send(sprintf('`%s` 레이드가 등록되었습니다.', params[2]));
						}
						break;
					case '삭제':
						{
							let res = await raid.deleteRaid(db, params[2]);
							if (res.code !== 1) throw new CommandError(res.resMsg);
							msg.channel.send(sprintf('`%s` 레이드가 삭제되었습니다.', params[2]));
						}
						break;
					case '조회': {
						let res = await raid.getRaid(
							db,
							params[2]
						);
						if(res.code !== 1) throw new CommandError(res.resMsg);
						msg.channel.send({embed : res.embed});
						break;
					}
					case '참가신청':
						{
							if (_.isUndefined(params[2]))
								throw new CommandError(
									'`레이드 참가신청 [캐릭터명]` 으로 입력해주세요.'
								);
							let res = await raid.attendRaids(db, msg, params);
							if (res.code !== 1) throw new CommandError(res.resMsg);
						}
						break;
					case '참가현황':
						{
							if (_.isUndefined(params[2]))
								throw new CommandError(
									'`레이드 참가현황 [캐릭터명]` 으로 입력해주세요.'
								);
							let res = await raid.showAttendRaidList(db, params);
							if (res.code) msg.channel.send({ embed: res.data });
							else throw new CommandError(res.resMsg);
						}
						break;
					case '참가취소':
						{
							if (_.isUndefined(params[2]))
								throw new CommandError(
									'`레이드 참가취소 [캐릭터명]` 으로 입력해주세요.'
								);
							let res = await raid.cancelRaids(db, msg, params);

							if (res.code) msg.channel.send({ embed: res.data });
							else throw new CommandError(res.resMsg);
						}
						break;
					case '/?':
						break;
					default:
						replyMsg =
							'잘못된 레이드 명령어입니다. 레이드 /? 를 입력하여 사용법을 확인하세요.';
				}
				break;
			case '공대':
				// 공대장 : [공격대명] [캐릭터명]
				// 조회 [공격대이름] [1파티]
				// 추가/이동 [공격대이름] [캐릭터명] [파티]
				// 교환 [공격대ID] [캐릭터명] [캐릭터명]
				// 제거 [공격대ID] [캐릭터명]
				// 신청 [공격대ID]
				// 시간설정 [공격대ID] 시간
				// 알람시간설정 [공격대ID]
				// 공팟 멤버 생각
				switch (params[1]) {
					case '생성':
						let res = await gongdae.registerGongdae(db, msg);
						break;
					case '편집':
						break;
					case '공대장지정':
						break;
					case '인원추가':
						break;
					case '인원교체':
						break;
					case '인원제거':
						break;
					case '시간설정':
						break;
					case '알람시간설정':
						break;
				}
				break;
			case '캐릭터':
				switch (params[1]) {
					case '등록': {
						if (_.isUndefined(params[2]))
							throw new Error(
								'`캐릭터 등록 [캐릭터명]` 으로 입력해주세요.'
							);

						//캐릭터 등록
						let res = await character.registerCharacter(
							db,
							params,
							msg.member.user
						);
						if (res.code === 0) throw new Error(res.resMsg);
						else if (res.code === -1) throw new NotFoundError(res.resMsg);
						msg.channel.send(
							'캐릭터 등록이 완료되었습니다.\n'
						);

						break;
					}
					case '조회':
						{
							if (_.isUndefined(params[2]))
								throw new Error(
									'`캐릭터 조회 [캐릭터명]` 으로 입력해주세요.'
								);
							let res = await character.lookupCharacter(db, params[2]);
							if (res.code !== 1) throw new Error(res.resMsg);
							msg.channel.send({ embed: res.embed });
						}
						break;
					case '전체조회':
						/**/
						break;
					case '갱신': {
						if (_.isUndefined(params[2]))
							throw new Error(
								'`캐릭터 정보갱신 [캐릭터명]` 으로 입력해주세요.'
							);

						let res = await character.updateCharacter(
							db,
							params[2]
						);
						if (res.code !== 1) throw new CommandError(res.resMsg);
						msg.channel.send(sprintf("`%s` 캐릭터 정보(아이템 레벨, 길드 정보)를 갱신하였습니다.", params[2]))

						//업데이트 된 캐릭터 한번더 조회
						res = await character.lookupCharacter(db, params[2]);
						if (res.code !== 1) throw new Error(res.resMsg);
						msg.channel.send({ embed: res.embed });
					}
						break;
					case '삭제': {
						if (_.isUndefined(params[2]))
							throw new Error(
								'`캐릭터 삭제 [캐릭터명]` 으로 입력해주세요.'
							);
						let res = await character.deleteCharacter(db, params[2]);
						if (res.code === 0) throw new Error(res.resMsg);
						else if (res.code === -1) replyMsg = res.resMsg;
						else {
							replyMsg =
								'캐릭터 삭제가 완료되었습니다\n 재등록하시려면 `캐릭터 등록 [캐릭터명]`으로 등록 가능합니다';
						}
						break;
					}
				}
				break;
			default:
				/**/	
				//msg.channel.send('등록 되지 않은 명령어입니다.');
		}
	} catch (err) {
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
			default:
				msg.reply(replyMsg + err.message);
		}
	}
});
if (_.isUndefined(mode) || _.indexOf(['dev', 'prod'], mode) === -1)
	throw new Error('NODE_ENV undefined');

client.login(config.discord.token);
