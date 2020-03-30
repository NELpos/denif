const _ = require('lodash');
const Discord = require('discord.js');
const sprintf = require('sprintf-js').sprintf;
const fs = require('./firestore');
const character = require('./character');

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

class TimeOutError extends Error {
	constructor(message) {
		super(message);
		this.name = 'TimeOutError';
	}
}

//레이드 등록
function registerRaid(db, raidName, personnel = 8) {
	return new Promise(async (resolve, reject) => {
		try {
			let res = await fs.getDoc(db, 'raids', raidName);
			if (res.code === 1)
				throw new DuplicateError(
					sprintf('`%s`는 이미 등록되어 레이드입니다.', raidName)
				);

			res = await fs.setDoc(db, 'raids', raidName, {
				name: raidName,
				personnel: personnel,
				participants: {},
				parties: {},
				news: {}
			});
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
function getRaids(db, raidName) {
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
function getRaid(db, raidName) {
	return new Promise(async (resolve, reject) => {
		try {
			let res = await fs.getDoc(db, 'raids', raidName);
			if (res.code !== 1)
				throw new NotFoundError(
					sprintf('`%s` 해당 레이드를 찾을 수 없습니다.', raidName)
				);

			let newsArr = [];
			if (Object.keys(res.data.news).length > 0) {
				for (var key in _(res.data.news)
					.toPairs()
					.sortBy(0)
					.fromPairs()
					.value()) {
					newsArr.push(sprintf('[%s](%s)', key, res.data.news[key]));
				}
			} else newsArr.push('없음');

			const RaidsEmbed = {
				color: 0xffa600,
				title: res.data.name,
				fields: [
					{
						name: '인원수',
						value: res.data.personnel,
						inline: true
					},
					{
						name: '공략',
						value: newsArr.join('\n'),
						inline: true
					},
					{
						name: '참가 대상자',
						value: '000'
						// value: data.participants.join('\n')
					},
					{
						name: '진행중인 공격대',
						value: '111'
						// value: Object.keys(data.parties).join('\n')
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
async function deleteRaid(db, raidName) {
	return new Promise(async (resolve, reject) => {
		try {
			//레이드 등록여부 확인
			let res = await fs.getDoc(db, 'raids', raidName);
			if (res.code === -1)
				throw new NotFoundError(
					sprintf('`%s`는 등록되지 않은 레이드입니다.', raidName)
				);
			//레이드 삭제
			res = await fs.deleteDoc(db, 'raids', raidName);
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
	try {
		let { resMsg, data } = await getRaids(db);
		let raidInfo = {
			raidsArr: [],
			personnelArr: [],
		};
		_.each(data, item => {
			raidInfo.raidsArr.push(item.name);
			raidInfo.personnelArr.push(item.personnel);
		});

		const lookupAllRaidsEmbed = {
			color: 0xd13fd1,
			title: '레이드 리스트',
			description: '등록되어 있는 전체 레이드 리스트입니다.',
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
		return { code: 1, data : raidInfo, embed: lookupAllRaidsEmbed };
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
}

//레이드 참가 리스트 조회
async function showAttendRaidList(db, params) {
	try {
		//캐릭터 등록 확인
		let { code } = await character.lookupCharacter(db, params[2]);
		if (code === -1)
			throw new NotFoundError(
				sprintf(
					'`%s`는 등록되지 않은 캐릭터명입니다\n`캐릭터 등록 [캐릭터명]`으로 신청하세요.',
					params[2]
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
			if (_.includes(Object.keys(item.participants), params[2]) === true)
				raidInfo.inParticipants.push('✅');
			else raidInfo.inParticipants.push('❌');
		});

		const lookupRaidsEmbed = {
			color: 0xc6fc03,
			title: '레이드 참가 리스트',
			description: '본인이 참가가능한 레이드를 신청하세요.',
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
		return { code: 1, data: lookupRaidsEmbed };
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
}

//레이드 참가
async function attendRaids(db, msg, params) {
	return new Promise(async (resolve, reject) => {
		try {
			let sendMsgArr = [];

			let res = await showAttendRaidList(db, params);
			if (res.code) msg.channel.send({ embed: res.data });
			else
				new Error(
					'요청하신 캐릭터에 레이드 참가현황 조회를 실패하였습니다.'
				);

			sendMsgArr.push(
				'참가하실 레이드명을 아래와 같은 형식으로 입력해주세요.'
			);
			sendMsgArr.push('```');
			sendMsgArr.push('미스틱');
			sendMsgArr.push('카이슈테르, 태만의바다 (2개 이상 입력시)');
			sendMsgArr.push('```');

			await msg.channel.send(sendMsgArr.join('\n'));

			//set msg filter
			const filter = res => {
				return res.author.id === msg.author.id;
			};

			msg.channel
				.awaitMessages(filter, {
					max: 1,
					time: 60000,
					errors: ['time']
				})
				.then(async collected => {
					let replyMsg = collected.first().content,
						attendRaidsArr = [],
						resArr = undefined,
						pr_pool = [],
						resMsgArr = [];

					if (_.includes(replyMsg, ',') || _.includes(replyMsg, ' ')) {
						replyMsg = replyMsg.replace(/(, |,| )/, ',');
						attendRaidsArr = replyMsg.split(',');
					} else attendRaidsArr.push(replyMsg);

					_.each(attendRaidsArr, async item => {
						pr_pool.push(attendRaid(db, item, params[2]));
					});
					resArr = await Promise.all(pr_pool);
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
					let res = await showAttendRaidList(db, params);
					if (res.code) msg.channel.send({ embed: res.data });
					else
						new Error(
							'요청하신 캐릭터에 레이드 참가현황 조회를 실패하였습니다.'
						);
					resolve({ code: 1 });
				})
				.catch(collected => {
					resolve({
						code: 0,
						resMsg: ':alarm_clock: 응답 시간이 초과 되었습니다.'
					});
				});
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

//레이드들 참가 취소
async function cancelRaids(db, msg, params) {
	return new Promise(async (resolve, reject) => {
		try {
			let sendMsgArr = [];

			let res = await showAttendRaidList(db, params);
			if (res.code) msg.channel.send({ embed: res.data });
			else
				new Error(
					'요청하신 캐릭터에 레이드 참가현황 조회를 실패하였습니다.'
				);

			sendMsgArr.push(
				'취소하실 레이드명을 아래와 같은 형식으로 입력해주세요.'
			);
			sendMsgArr.push('```');
			sendMsgArr.push('미스틱');
			sendMsgArr.push('카이슈테르, 태만의바다 (2개 이상 입력시)');
			sendMsgArr.push('```');

			await msg.channel.send(sendMsgArr.join('\n'));

			//set filter
			const filter = res => {
				return res.author.id === msg.author.id;
			};

			msg.channel
				.awaitMessages(filter, {
					max: 1,
					time: 60000,
					errors: ['time']
				})
				.then(async collected => {
					let replyMsg = collected.first().content,
						cancelRaidsArr = [],
						resArr = undefined,
						pr_pool = [],
						resMsgArr = [];

					if (_.includes(replyMsg, ',') || _.includes(replyMsg, ' ')) {
						replyMsg = replyMsg.replace(/(, |,| )/, ',');
						cancelRaidsArr = replyMsg.split(',');
					} else cancelRaidsArr.push(replyMsg);

					_.each(cancelRaidsArr, async item => {
						pr_pool.push(cancelRaid(db, item, params[2]));
					});
					resArr = await Promise.all(pr_pool);
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
					let res = await showAttendRaidList(db, params);
					if (res.code) msg.channel.send({ embed: res.data });
					else
						new Error(
							'요청하신 캐릭터에 레이드 참가현황 조회를 실패하였습니다.'
						);
					resolve({ code: 1 });
				})
				.catch(collected => {
					resolve({
						code: 0,
						resMsg: ':alarm_clock: 응답 시간이 초과 되었습니다.'
					});
				});
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
module.exports.showAttendRaidList = showAttendRaidList;
module.exports.showRaidAllList = showRaidAllList;
module.exports.attendRaids = attendRaids;
module.exports.cancelRaids = cancelRaids;
