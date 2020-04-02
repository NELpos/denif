const _ = require('lodash');
const Discord = require('discord.js');
const sprintf = require('sprintf-js').sprintf;
const fs = require('./firestore');
const character = require('./character');
const discordUtil = require('./discordUtil');

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

class EscapeError extends Error {
	constructor(message) {
		super(message);
		this.name = 'EscapeError';
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

//레이드 등록
function registerRaid(db, msg) {
	return new Promise(async (resolve, reject) => {
		try {
			//공대명 입력
			let collectRes = await discordUtil.collectMsg(msg, [
				'등록하실 `레이드명`을 입력해주세요.'
			]);

			if (collectRes.code === -2) throw new EscapeError(collectRes.replyMsg);
			let raidName = collectRes.replyMsg;

			let res = await fs.getDoc(db, 'raids', raidName);
			if (res.code === 1)
				throw new DuplicateError(
					sprintf('`%s`는 이미 등록되어 레이드입니다.', raidName)
				);

			//
			collectRes = await discordUtil.collectMsg(msg, [
				'참가가능한 `인원수`를 입력해주세요.'
			]);
			if (collectRes.code === -2) throw new EscapeError(collectRes.replyMsg);
			let personnel = parseInt(collectRes.replyMsg);

			res = await fs.setDoc(db, 'raids', raidName, {
				name: raidName,
				personnel: personnel,
				participants: {},
				parties: {},
				strategy: {},
				imageUrl: ''
			});

			//레이드 이름 반환
			res.data = raidName;
			resolve(res);
		} catch (err) {
			switch (err.name) {
				case 'DuplicateError':
					resolve({ code: 2, resMsg: err.message });
					break;
				default:
					resolve({ code: 0, resMsg: err.stack });
			}
		}
	});
}
//전체 레이드 조회
function getRaids(db) {
	return new Promise(async (resolve, reject) => {
		try {
			let res = await fs.getDocs(db, 'raids');
			resolve(res);
		} catch (err) {
			resolve({ code: 0, resMsg: err.stack });
		}
	});
}

//특정 레이드 조회
function getRaid(db, msg) {
	return new Promise(async (resolve, reject) => {
		try {
			//전체 레이드 리스트 보여주기
			let res = await showRaidAllList(db);
			if (res.code === 1) msg.channel.send({ embed: res.embed });
			else if (res.code === -1) throw new NotFoundError(res.resMsg);
			else throw new Error(res.resMsg);

			//레이드명 입력
			let collectRes = await discordUtil.collectMsg(msg, [
				'조회하실 `레이드명`을 입력해주세요.'
			]);

			if (collectRes.code === -2) throw new EscapeError(collectRes.replyMsg);
			let raidName = collectRes.replyMsg;

			//레이드 등록 여부 확인
			let dbRes = await fs.getDoc(db, 'raids', raidName);
			if (dbRes.code !== 1)
				throw new NotFoundError(
					sprintf('`%s` 해당 레이드를 찾을 수 없습니다.', raidName)
				);
			let raidData = dbRes.data;

			//공략
			let strategyArr = [];
			if (Object.keys(raidData.strategy).length > 0) {
				for (var key in _(raidData.strategy)
					.toPairs()
					.sortBy(0)
					.fromPairs()
					.value()) {
					strategyArr.push(
						sprintf('[%s](%s)', key, raidData.strategy[key])
					);
				}
			} else strategyArr.push('없음');

			//참가자
			let participantsStr = '';
			if (Object.keys(raidData.participants).length > 0)
				participantsStr = Object.keys(raidData.participants).join(', ');
			else participantsStr = '없음';

			//공격대 조회
			dbRes = await fs.getWhereDoc(db, 'gongdae', {
				column: 'raidType',
				operator: '==',
				value: raidData.name
			});
			let gongDaeListArr = [];
			if (dbRes.code === -1) gongDaeListArr.push('없음');
			else gongDaeListArr = dbRes.data.slice(0);

			const RaidsEmbed = {
				color: parseInt('0xffa600'),
				author: {
					name: raidData.name,
					icon_url: raidData.imageUrl
				},
				fields: [
					{
						name: '인원수',
						value: raidData.personnel,
						inline: true
					},
					{
						name: '공략',
						value: strategyArr.join(' '),
						inline: true
					},
					{
						name: '참가자',
						value: participantsStr
					},
					{
						name: '등록된 공격대',
						value: gongDaeListArr.join('\n')
					}
				],
				timestamp: new Date()
			};

			resolve({ code: 1, embed: RaidsEmbed });
		} catch (err) {
			switch (err.name) {
				case 'NotFoundError':
					resolve({ code: -1, resMsg: err.message });
					break;
				default:
					resolve({ code: 0, resMsg: err.stack });
			}
		}
	});
}

//레이드 참가
function attendRaid(db, raidName, characterName) {
	return new Promise(async (resolve, reject) => {
		try {
			let res = await fs.getDoc(db, 'raids', raidName);
			if (res.code === -1)
				throw new NotFoundError('은 등록되지 않은 레이드입니다.');

			//레이드에 캐릭터 추가
			let participants = Object.assign({}, res.data.participants);
			if (_.includes(Object.keys(participants), characterName) === true)
				throw new DuplicateError('은 이미 참가신청된 레이드입니다.');

			_.set(participants, characterName, true);
			await fs.updateDoc(db, 'raids', raidName, {
				name: raidName,
				participants: participants
			});

			//캐릭터에 조회
			res = await fs.getDoc(db, 'characters', characterName);

			//캐릭터에 신청한 레이드 추가
			let raids = Object.assign({}, res.data.raids);
			_.set(raids, raidName, true);

			res = fs.updateDoc(db, 'characters', characterName, { raids: raids });
			resolve(res);
		} catch (err) {
			switch (err.name) {
				case 'NotFoundError':
					resolve({ code: -1, resMsg: err.message });
					break;
				case 'DuplicateError':
					resolve({ code: 2, resMsg: err.message });
					break;
				default:
					resolve({ code: 0, resMsg: err.stack });
			}
		}
	});
}

//레이드 삭제
async function deleteRaid(db, msg) {
	return new Promise(async (resolve, reject) => {
		try {
			//공대명 입력
			let collectRes = await discordUtil.collectMsg(msg, [
				'등록하실 `레이드명`을 입력해주세요.'
			]);

			if (collectRes.code === -2) throw new EscapeError(collectRes.replyMsg);
			let raidName = collectRes.replyMsg;

			//레이드 등록여부 확인
			let res = await fs.getDoc(db, 'raids', raidName);
			if (res.code === -1)
				throw new NotFoundError(
					sprintf('`%s`는 등록되지 않은 레이드입니다.', raidName)
				);
			//레이드 삭제
			res = await fs.deleteDoc(db, 'raids', raidName);
			res.data = raidName;
			resolve(res);
		} catch (err) {
			switch (err.name) {
				case 'NotFoundError':
					resolve({ code: -1, resMsg: err.message });
					break;
				case 'DuplicateError':
					resolve({ code: 2, resMsg: err.message });
					break;
				default:
					resolve({ code: 0, resMsg: err.stack });
			}
		}
	});
}
//레이드 전체 리스트 조회
async function showRaidAllList(db) {
	return new Promise(async (resolve, reject) => {
		try {
			let { resMsg, data } = await getRaids(db);
			let raidInfo = {
				raidsArr: [],
				personnelArr: []
			};
			_.each(data, item => {
				raidInfo.raidsArr.push(item.name);
				raidInfo.personnelArr.push(item.personnel);
			});

			const lookupAllRaidsEmbed = {
				color: parseInt('0xffa600'),
				title: '레이드 목록',
				fields: [
					{
						name: '레이드명',
						value: raidInfo.raidsArr.join('\n'),
						inline: true
					},
					{
						name: '인원수',
						value: raidInfo.personnelArr.join('\n'),
						inline: true
					}
				]
			};
			resolve({ code: 1, data: raidInfo, embed: lookupAllRaidsEmbed });
		} catch (err) {
			switch (err.name) {
				case 'NotFoundError':
					resolve({ code: -1, resMsg: err.message });
					break;
				case 'DuplicateError':
					resolve({ code: 2, resMsg: err.message });
					break;
				default:
					resolve({ code: 0, resMsg: err.stack });
			}
		}
	});
}

//레이드 참가 리스트 조회
async function showAttendRaidList(db, characterName) {
	try {
		//캐릭터 등록 확인
		let { code } = await character.lookupCharacterByName(db, characterName);
		if (code === -1)
			throw new NotFoundError(
				sprintf(
					'`%s`는 등록되지 않은 캐릭터명입니다\n`캐릭터 등록 [캐릭터명]`으로 신청하세요.',
					characterName
				)
			);

		let { resMsg, data } = await getRaids(db);
		let raidInfo = {
			raidsArr: [],
			personnelArr: [],
			inParticipants: []
		};
		_.each(data, item => {
			raidInfo.raidsArr.push(item.name);
			raidInfo.personnelArr.push(item.personnel);
			if (_.includes(Object.keys(item.participants), characterName) === true)
				raidInfo.inParticipants.push('✅');
			else raidInfo.inParticipants.push('❌');
		});

		const lookupRaidsEmbed = {
			color: 0xc6fc03,
			title: '레이드 목록',
			fields: [
				{
					name: '레이드명',
					value: raidInfo.raidsArr.join('\n'),
					inline: true
				},
				{
					name: '인원수',
					value: raidInfo.personnelArr.join('\n'),
					inline: true
				},
				{
					name: '신청여부',
					value: raidInfo.inParticipants.join('\n'),
					inline: true
				}
			]
		};
		return { code: 1, embed: lookupRaidsEmbed };
	} catch (err) {
		switch (err.name) {
			case 'NotFoundError':
				return { code: -1, resMsg: err.message };
				break;
			case 'DuplicateError':
				return { code: 2, resMsg: err.message };
				break;
			default:
				return { code: 0, resMsg: err.stack };
		}
	}
}

//레이드 참가
async function attendRaids(db, msg) {
	return new Promise(async (resolve, reject) => {
		try {
			//캐릭터명 입력
			let collectRes = await discordUtil.collectMsg(msg, [
				'조회하실 `캐릭터명`을 입력해주세요.'
			]);

			if (collectRes.code === -2) throw new EscapeError(collectRes.replyMsg);
			let characterName = collectRes.replyMsg;

			let listRes = await showAttendRaidList(db, characterName);
			if (listRes.code === 1) msg.channel.send({ embed: listRes.embed });
			else if (listRes.code === -1)
				throw new NotFoundError(listRes.listResMsg);
			else throw new Error(listRes.resMsg);

            let sendMsgArr = [];
			sendMsgArr.push(
				'참가하실 `레이드명`을 입력해주세요. 2개 이상 입력은 스페이스로 구분합니다.'
			);
			sendMsgArr.push('```');
			sendMsgArr.push('미스틱');
			sendMsgArr.push('카슈4페 태만의바다-하드 (2개 이상 입력시)');
			sendMsgArr.push('```');

			//참가할 레이드 리스트 입력
			collectRes = await discordUtil.collectMsg(msg, sendMsgArr);
			if (collectRes.code === -2) throw new EscapeError(collectRes.replyMsg);
            let replyMsg = collectRes.replyMsg;

            let attendRaidsArr = [],
				resArr = undefined,
				prPool = [],
				resMsgArr = [];

			if (_.includes(replyMsg, ',')) {
				replyMsg = replyMsg.replace(/(, |,| )/gi, ',');
				attendRaidsArr = replyMsg.split(',');
			} else if (_.includes(replyMsg, ' ')) {
				attendRaidsArr = replyMsg.split(' ');
			} else attendRaidsArr.push(replyMsg);

			_.each(attendRaidsArr, async item => {
				prPool.push(attendRaid(db, item, characterName));
			});
			resArr = await Promise.all(prPool);
			_.each(resArr, (item, index) => {
				if (item.code === 1)
					resMsgArr.push(
						sprintf(
							'`%s` 참가신청이 완료되었습니다.',
							attendRaidsArr[index],
							item.resMsg
						)
					);
				else
					resMsgArr.push(
						sprintf('`%s`%s', attendRaidsArr[index], item.resMsg)
					);
			});
			msg.channel.send(sprintf('%s', resMsgArr.join('\n')));

			//레이드 참가 리스트 재조회
			let res = await showAttendRaidList(db, characterName);
			if (res.code) msg.channel.send({ embed: res.embed });
			else
				new Error(
					'요청하신 캐릭터에 레이드 참가현황 조회를 실패하였습니다.'
                );
            //success
			resolve({ code: 1 });
		} catch (err) {
			switch (err.name) {
				case 'NotFoundError':
					resolve({ code: -1, resMsg: err.message });
					break;
				case 'DuplicateError':
					resolve({ code: 2, resMsg: err.message });
					break;
				default:
					resolve({ code: 0, resMsg: err.stack });
			}
		}
	});
}
//레이드 참가 취소
function cancelRaid(db, raidName, characterName) {
	return new Promise(async (resolve, reject) => {
		try {
			let res = await fs.getDoc(db, 'raids', raidName);
			if (res.code === -1)
				throw new NotFoundError('은 등록되지 않은 레이드입니다.');

			//레이드에 캐릭터 삭제
			let participants = Object.assign({}, res.data.participants);
			if (_.includes(Object.keys(participants), characterName) === false)
				throw new DuplicateError('은 등록되지 않은 레이드입니다.');

			delete participants[characterName];
			await fs.updateDoc(db, 'raids', raidName, {
				name: raidName,
				participants: participants
			});

			//캐릭터에 조회
			res = await fs.getDoc(db, 'characters', characterName);

			//캐릭터에 신청한 레이드 추가
			let raids = Object.assign({}, res.data.raids);
			delete raids[raidName];

			res = fs.updateDoc(db, 'characters', characterName, { raids: raids });
			resolve(res);
		} catch (err) {
			switch (err.name) {
				case 'NotFoundError':
					resolve({ code: -1, resMsg: err.message });
					break;
				case 'DuplicateError':
					resolve({ code: 2, resMsg: err.message });
					break;
				default:
					resolve({ code: 0, resMsg: err.stack });
			}
		}
	});
}

//레이드 참가현황 조회
async function showAttendRaids(db, msg) {
	return new Promise(async (resolve, reject) => {
		try {

            //캐릭터명 입력
			let collectRes = await discordUtil.collectMsg(msg, [
				'조회하실 `캐릭터명`을 입력해주세요.'
			]);

			if (collectRes.code === -2) throw new EscapeError(collectRes.replyMsg);
			let characterName = collectRes.replyMsg;

			let listRes = await showAttendRaidList(db, characterName);
			if (listRes.code === 1) msg.channel.send({ embed: listRes.embed });
			else if (listRes.code === -1)
				throw new NotFoundError(listRes.listResMsg);
            else throw new Error(listRes.resMsg);
            resolve({ code: 1 });
		} catch (err) {
			switch (err.name) {
				case 'NotFoundError':
					resolve({ code: -1, resMsg: err.message });
					break;
				case 'DuplicateError':
					resolve({ code: 2, resMsg: err.message });
					break;
				default:
					resolve({ code: 0, resMsg: err.stack });
			}
		}
	});
}

//레이드 참가 취소
async function cancelRaids(db, msg) {
	return new Promise(async (resolve, reject) => {
		try {

            //캐릭터명 입력
			let collectRes = await discordUtil.collectMsg(msg, [
				'참가 취소하실 `캐릭터명`을 입력해주세요.'
			]);

			if (collectRes.code === -2) throw new EscapeError(collectRes.replyMsg);
			let characterName = collectRes.replyMsg;

			let listRes = await showAttendRaidList(db, characterName);
			if (listRes.code === 1) msg.channel.send({ embed: listRes.embed });
			else if (listRes.code === -1)
				throw new NotFoundError(listRes.listResMsg);
            else throw new Error(listRes.resMsg);

            let sendMsgArr = [];
			sendMsgArr.push(
				'참가 취소하실 `레이드`명을 입력해주세요. 2개 이상 입력은 스페이스로 구분합니다.'
			);
			sendMsgArr.push('```');
			sendMsgArr.push('미스틱');
			sendMsgArr.push('카슈4페 태만의바다-하드 (2개 이상 입력시)');
			sendMsgArr.push('```');

			//참가할 레이드 리스트 입력
			collectRes = await discordUtil.collectMsg(msg, sendMsgArr);
			if (collectRes.code === -2) throw new EscapeError(collectRes.replyMsg);
            let replyMsg = collectRes.replyMsg;

            let attendRaidsArr = [],
				resArr = undefined,
				prPool = [],
				resMsgArr = [];

			if (_.includes(replyMsg, ',')) {
				replyMsg = replyMsg.replace(/(, |,| )/gi, ',');
				attendRaidsArr = replyMsg.split(',');
			} else if (_.includes(replyMsg, ' ')) {
				attendRaidsArr = replyMsg.split(' ');
			} else attendRaidsArr.push(replyMsg);

			_.each(attendRaidsArr, async item => {
				prPool.push(cancelRaid(db, item, characterName));
			});
            resArr = await Promise.all(prPool);
            _.each(resArr, (item, index) => {
                if (item.code === 1)
                    resMsgArr.push(
                        sprintf(
                            '`%s` 참가취소가 완료되었습니다.',
                            cancelRaidsArr[index],
                            item.resMsg
                        )
                    );
                else
                    resMsgArr.push(
                        sprintf('`%s`%s', cancelRaidsArr[index], item.resMsg)
                    );
            });
            msg.channel.send(sprintf('%s', resMsgArr.join('\n')));

            //레이드 참가 리스트 재조회
            let res = await showAttendRaidList(db, characterName);
            if (res.code) msg.channel.send({ embed: res.data });
            else
                new Error(
                    '요청하신 캐릭터에 레이드 참가현황 조회를 실패하였습니다.'
                );
            //success
            resolve({ code: 1 });
		} catch (err) {
			switch (err.name) {
				case 'NotFoundError':
					resolve({ code: -1, resMsg: err.message });
					break;
				case 'DuplicateError':
					resolve({ code: 2, resMsg: err.message });
					break;
				default:
					resolve({ code: 0, resMsg: err.stack });
			}
		}
	});
}

//

//레이드
module.exports.registerRaid = registerRaid;
module.exports.deleteRaid = deleteRaid;
module.exports.getRaid = getRaid;
module.exports.getRaids = getRaids;
module.exports.attendRaid = attendRaid;
module.exports.showAttendRaids = showAttendRaids;
module.exports.showAttendRaidList = showAttendRaidList;
module.exports.showRaidAllList = showRaidAllList;
module.exports.attendRaids = attendRaids;
module.exports.cancelRaids = cancelRaids;
