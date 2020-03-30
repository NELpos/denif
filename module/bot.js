const _ = require('lodash');
const Discord = require('discord.js');
const sprintf = require('sprintf-js').sprintf;
const fs = require('./firestore');

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

//캐릭터 등록
function registerCharacter(db, characterInfo, discordInfo) {
	return new Promise((resolve, reject) => {
		try {
			let synergyArr = [],
				classImageUrl = undefined;
			fs.getDoc(db, 'characters', characterInfo.name)
				.then(res => {
					if (res.code === 1) {
						return resolve({
							code: -1,
							resMsg: '이미 등록되어 있는 캐릭터입니다.'
						});
					}
					//get synergy
					let conditionInfo = {
						column: characterInfo.characterClass,
						operator: '==',
						value: true
					};
					return fs.getWhereDoc(db, 'synergy', conditionInfo);
				})
				.then(res => {
					if (!_.isUndefined(res)) synergyArr = res.data;
					//get class imageUrl
					return fs.getDoc(db, 'classImage', 'imageUrl');
				})
				.then(res => {
					if (!_.isUndefined(res))
						classImageUrl = _.get(res.data, characterInfo.characterClass);
					return resolve({
						code: 1,
						resMsg: fs.setDoc(db, 'characters', characterInfo.name, {
							server: characterInfo.server,
							name: characterInfo.name,
							class: characterInfo.characterClass,
							classImage: classImageUrl,
							itemLevel: characterInfo.itemLevel,
							guild: characterInfo.guild,
							synergy: synergyArr,
							raids: {},
							parties: {},
							discord: {
								username: discordInfo.username,
								discriminator: discordInfo.discriminator,
								id: discordInfo.id
							}
						})
					});
				});
		} catch (err) {
			resolve({ code: 0, resMsg: err.stack });
		}
	});
}

//캐릭터 조회
function lookupCharacter(db, characterName) {
	return new Promise((resolve, reject) => {
		try {
			return resolve(fs.getDoc(db, 'characters', characterName));
		} catch (err) {
			resolve({ code: 0, resMsg: err.stack });
		}
	});
}

//캐릭터 전체 조회
function lookupAllCharacters(db, discordInfo) {}

//캐릭터 삭제
function deleteCharacter(db, characterName) {
	return new Promise((resolve, reject) => {
		try {
			fs.getDoc(db, 'characters', characterName).then(res => {
				if (res.code === -1)
					return resolve({
						code: -1,
						resMsg:
							'캐릭터 등록 [캐릭터명]` 명령을 통해 캐릭터를 등록하세요.'
					});
				return resolve(fs.deleteDoc(db, 'characters', characterName));
			});
		} catch (err) {
			resolve({ code: 0, resMsg: err.stack });
		}
	});
}

//캐릭터 아이템레벨/길드 갱신
function updateCharacter(db, updateCharacterInfo) {
	return new Promise((resolve, reject) => {
		try {
			fs.getDoc(db, 'characters', updateCharacterInfo.name).then(res => {
				if (res.code === -1)
					return resolve({
						code: -1,
						resMsg:
							'denif에 등록되어 있지 않은 캐릭터입니다. `캐릭터 등록 [캐릭터명]` 명령을 통해 캐릭터를 등록하세요.'
					});
				return resolve(
					fs.updateDoc(
						db,
						'characters',
						updateCharacterInfo.name,
						updateCharacterInfo
					)
				);
			});
		} catch (err) {
			resolve({ code: 0, resMsg: err.stack });
		}
	});
}

//레이드 등록
function registerRaid(db, raidName, personnel = 8) {
	return new Promise((resolve, reject) => {
		try {
			fs.getDoc(db, 'raids', raidName).then(res => {
				if (res.code === 1) {
					return resolve({
						code: -1,
						resMsg: '이미 등록되어 레이드입니다.'
					});
				}
				return resolve(
					fs.setDoc(db, 'raids', raidName, {
						name: raidName,
						personnel: personnel,
						participants: {},
						parties: {},
						news: {}
					})
				);
			});
		} catch (err) {
			resolve({ code: 0, resMsg: err.stack });
		}
	});
}
//전체 레이드 조회
function getRaids(db, raidName) {
	return new Promise((resolve, reject) => {
		try {
			resolve(fs.getDocs(db, 'raids'));
		} catch (err) {
			resolve({ code: 0, resMsg: err.stack });
		}
	});
}

//특정 레이드 조회
function getRaid(db, raidName) {
	return new Promise((resolve, reject) => {
		try {
			resolve(fs.getDoc(db, 'raids', raidName));
		} catch (err) {
			resolve({ code: 0, resMsg: err.stack });
		}
	});
}

//레이드 참가
function attendRaid(db, raidName, characterName) {
	return new Promise((resolve, reject) => {
		try {
			fs.getDoc(db, 'raids', raidName)
				.then(res => {
					if (res.code === -1)
						throw new NotFoundError('은 등록되지 않은 레이드입니다.');

					//레이드에 캐릭터 추가
					let participants = Object.assign({}, res.data.participants);
					if (
						_.includes(Object.keys(participants), characterName) === true
					)
						throw new DuplicateError('은 이미 참가신청된 레이드입니다.');

					_.set(participants, characterName, true);
					return fs.updateDoc(db, 'raids', raidName, {
						name: raidName,
						participants: participants
					});
				})
				.then(res => {
					//캐릭터에 조회
					return fs.getDoc(db, 'characters', characterName);
				})
				.then(res => {
					//캐릭터에 신청한 레이드 추가
					let raids = Object.assign({}, res.data.raids);
					_.set(raids, raidName, true);
					return resolve(
						fs.updateDoc(db, 'characters', characterName, {
							raids: raids
						})
					);
				})
				.catch(err => {
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
				});
		} catch (err) {
			switch (err.name) {
				default:
					resolve({ code: 0, resMsg: err.stack });
			}
		}
	});
}

//레이드 삭제
async function deleteRaid(db, raidName) {
	return new Promise((resolve, reject) => {
		try {
			fs.getDoc(db, 'raids', raidName).then(res => {
				if (res.code === -1) {
					return resolve({
						code: -1,
						resMsg: '등록되지 않은 레이드입니다.'
					});
				}
				return resolve(fs.deleteDoc(db, 'raids', raidName));
			});
		} catch (err) {
			resolve({ code: 0, resMsg: err.stack });
		}
	});
}

// //시너지 조회
// function getSynergy(db, synergyInfo) {
// 	return new Promise((resolve, reject) => {
// 		try {
// 			getDoc(db, 'synergy', synergyInfo.name).then(res => {
// 				if (res.code === 1)
// 					resolve({
// 						code: -1,
// 						resMsg: '이미 등록되어 있는 시너지입니다.'
// 					});
// 				resolve({
// 					code: 1,
// 					resMsg: setDoc(db, 'synergy', synergyInfo.name, {
// 						name: synergyInfo.name,
// 						characterClass: synergyInfo.class,
// 						rate: synergyInfo.rate
// 					})
// 				});
// 			});
// 		} catch (err) {
// 			resolve({ code: 0, resMsg: err.stack });
// 		}
// 	});
// }

//시너지 삭제
function deleteSynergy(db, synergyInfo) {}

//레이드 리스트 조회
async function showAttendRaidList(db, params) {
	try {
        //캐릭터 등록 확인
		let { code } = await lookupCharacter(db, params[2]);
		if (code === -1)
			throw new Error(
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

		const lookupRaidsTable = {
			color: 0xc6fc03,
			title: '레이드 참가 리스트',
			description: params[2] + '의 레이드 참가신청 리스트입니다',
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
		return { code: 1, data: lookupRaidsTable };
	} catch (err) {
		let resMsg = '[명령 실패]\n';
        if (err.name === 'DebugError') resMsg += err.stack;
        else resMsg += err.message;
        return {code : 0, resMsg : resMsg};
	}
}

//레이드 참가
async function attendRaids(msg, db, msg, params) {
	try {
		let sendMsgArr = [];

		let res = await showAttendRaidList(db, params);
		if (res.code) msg.channel.send({embed : res.data});
		else
			new Error('요청하신 캐릭터에 레이드 참가현황 조회를 실패하였습니다.');

		//set filter
		const filter = res => {
			return res.author.id === msg.author.id;
		};
		sendMsgArr.push('참가하실 레이드명을 같은 형식으로 입력해주세요.');
		sendMsgArr.push('```');
		sendMsgArr.push('미스틱');
		sendMsgArr.push('카이슈테르, 태만의바다 (2개 이상 입력시)');
		sendMsgArr.push('```');

		await msg.channel.send(sendMsgArr.join('\n')).then(() => {
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
				})
				.catch(err => {
					msg.channel.send('⏰응답 시간이 초과 되었습니다.');
				});
		});
	} catch (err) {
		console.log(err.stack);
		let replyMsg = '명령 수행에 실패했습니다.';
		if (err.name === 'DebugError')
			msg.reply(sprintf('%s\n\n```%s```', replyMsg, err.stack));
		else msg.reply(sprintf('%s\n\n%s', replyMsg, err.message));
	}
}

//레이드
module.exports.registerRaid = registerRaid;
module.exports.deleteRaid = deleteRaid;
module.exports.getRaid = getRaid;
module.exports.getRaids = getRaids;
module.exports.attendRaid = attendRaid;
module.exports.showAttendRaidList = showAttendRaidList;
module.exports.attendRaids = attendRaids;

//캐릭터
module.exports.registerCharacter = registerCharacter;
module.exports.lookupCharacter = lookupCharacter;
module.exports.lookupAllCharacters = lookupAllCharacters;
module.exports.deleteCharacter = deleteCharacter;
module.exports.updateCharacter = updateCharacter;
