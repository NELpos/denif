const _ = require('lodash');
const Discord = require('discord.js');
const sprintf = require('sprintf-js').sprintf;
const fs = require('./firestore');
const raid = require('./raid');
const puppeteer = require('./puppeteer');
const discordUtil = require('./discordUtil');

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

//캐릭터 등록
function registerCharacter(db, msg, discordInfo) {
	//characterInfo, discordInfo)
	return new Promise(async (resolve, reject) => {
		try {
			//캐릭터 등록
			let collectRes = await discordUtil.collectMsg(msg, [
				'봇에 등록하실 `로아 캐릭터명(영어 대소문자 구분)`을 입력해주세요.\n```ex) Achilles도```'
			]);

			if (collectRes.code === -2) throw new EscapeError(collectRes.replyMsg);
			let characterName = collectRes.replyMsg;

			//캐릭터 중복 확인
			let dbRes = await fs.getDoc(db, 'characters', characterName);
			if (dbRes.code === 1) {
				return resolve({
					code: -1,
					resMsg: '데니프에 이미 등록되어 있는 캐릭터입니다.'
				});
			}

			//공식홈페이지에서 캐릭터 정보수집
			let pupRes = await puppeteer.getCharacter(characterName);
			if (pupRes.code === 0) throw new Error(pupRes.resMsg);
			else if (pupRes.code === -1) throw new NotFoundError(pupRes.resMsg);

			let synergyArr = [],
				classImageUrl = undefined,
				characterInfo = pupRes.characterInfo;

			//캐릭터 시너지 가져오기
			let conditionInfo = {
				column: characterInfo.characterClass,
				operator: '==',
				value: true
			};
			dbRes = await fs.getWhereDoc(db, 'synergy', conditionInfo);
			if (!_.isUndefined(dbRes)) synergyArr = dbRes.data;

			//get class imageUrl
			dbRes = await fs.getDoc(db, 'classImage', 'imageUrl');

			if (!_.isUndefined(dbRes))
				classImageUrl = _.get(dbRes.data, characterInfo.characterClass);

			//캐릭터 등록
			dbRes = await fs.setDoc(db, 'characters', characterInfo.name, {
				server: characterInfo.server,
				name: characterInfo.name,
				class: characterInfo.characterClass,
				classImage: classImageUrl,
				itemLevel: characterInfo.itemLevel,
				guild: characterInfo.guild,
				synergy: synergyArr,
				parties: {},
				tags: {},
				discord: {
					username: discordInfo.username,
					discriminator: discordInfo.discriminator,
					id: discordInfo.id
				}
			});

			dbRes.characterName = characterName;
			resolve(dbRes);
		} catch (err) {
			let errObj = undefined;
			switch (err.name) {
				case 'NotFoundError':
					errObj = { code: -1, resMsg: err.message };
					break;
				case 'EscapeError':
					errObj = { code: -2, resMsg: err.message };
					break;
				default:
					errObj = { code: 0, resMsg: err.stack };
			}
			resolve(errObj);
		}
	});
}
//캐릭터 이름으로 조회
function lookupCharacterByName(db, characterName) {
	return new Promise(async (resolve, reject) => {
		try {
			let dbRes = await fs.getDoc(db, 'characters', characterName);
			if (dbRes.code === -1)
				throw new NotFoundError(
					'등록되어 있는 캐릭터가 아닙니다. 캐릭터를 등록해주세요.'
				);
			let charData = dbRes.data;

			//레이드 공격대 정보 가져오기.
			let raidConditionInfo = {
				column: 'participants.' + characterName,
				operator: '==',
				value: true
			};
			(dbRes = await fs.getWhereDoc(db, 'raids', raidConditionInfo)),
				(attendRaidsArr = []);
			let raidData = dbRes.data;
			//레이드, 공격대 없는 것처리
			if (!_.isUndefined(raidData)) attendRaidsArr = raidData.slice(0);
			else attendRaidsArr.push('없음');

			//다른 계정 조회
			dbRes = await fs.getWhereDoc(db, 'characters', {
				column: 'discord.username',
				operator: '==',
				value: charData.discord.username
			});
			let otherCharacters = [];
			if (dbRes.data.length === 0) otherCharacters.push('없음');
			otherCharacters = dbRes.data.slice(0);

			if (Object.keys(charData.parties).length === 0)
				charData.parties = { 없음: true };

			const lookupCharacterEmbed = {
				color: 0x0099ff,
				title: sprintf('Lv : %s', charData.itemLevel),
				author: {
					name: charData.name,
					icon_url: charData.classImage,
					url:
						'https://lostark.game.onstove.com/Profile/Character/' +
						charData.name
				},
				description: sprintf('%s', charData.class),
				fields: [
					{
						name: '서버',
						value: charData.server,
						inline: true
					},
					{
						name: '길드',
						value: charData.guild,
						inline: true
					},
					{
						name: '디코계정',
						value: '@' + charData.discord.username,
						inline: true
					},
					{
						name: '보유 시너지',
						value: charData.synergy.join('\n')
					},
					{
						name: '참가중인 레이드',
						value: attendRaidsArr.join('\n')
					},
					{
						name: '진행중인 공대',
						value: Object.keys(charData.parties).join('\n')
					},
					{
						name: '다른 캐릭터',
						value: otherCharacters.join('\n')
					}
				],
				timestamp: new Date()
			};
			resolve({ code: 1, embed: lookupCharacterEmbed });
		} catch (err) {
			let errObj = undefined;
			switch (err.name) {
				case 'NotFoundError':
					errObj = { code: -1, resMsg: err.message };
					break;
				case 'EscapeError':
					errObj = { code: -2, resMsg: err.message };
					break;
				default:
					errObj = { code: 0, resMsg: err.stack };
			}
			resolve(errObj);
		}
	});
}

//캐릭터 조회
function lookupCharacter(db, msg) {
	return new Promise(async (resolve, reject) => {
		try {
			//캐릭터 조회
			let collectRes = await discordUtil.collectMsg(msg, [
				'조회하실 `로아 캐릭터명(영어 대소문자 구분)`을 입력해주세요.\n```ex) Achilles도```'
			]);

			if (collectRes.code === -2) throw new EscapeError(collectRes.replyMsg);
			let characterName = collectRes.replyMsg;

			let dbRes = await fs.getDoc(db, 'characters', characterName);
			if (dbRes.code === -1)
				throw new NotFoundError(
					'등록되어 있는 캐릭터가 아닙니다. 캐릭터를 등록해주세요.'
				);
			let charData = dbRes.data;

			//레이드 공격대 정보 가져오기.
			let raidConditionInfo = {
				column: 'participants.' + characterName,
				operator: '==',
				value: true
			};
			(dbRes = await fs.getWhereDoc(db, 'raids', raidConditionInfo)),
				(attendRaidsArr = []);
			let raidData = dbRes.data;
			//레이드, 공격대 없는 것처리
			if (!_.isUndefined(raidData)) attendRaidsArr = raidData.slice(0);
			else attendRaidsArr.push('없음');

			//다른 계정 조회
			dbRes = await fs.getWhereDoc(db, 'characters', {
				column: 'discord.username',
				operator: '==',
				value: charData.discord.username
			});
			let otherCharacters = [];
			if (dbRes.data.length === 0) otherCharacters.push('없음');
			otherCharacters = dbRes.data.slice(0);

			if (Object.keys(charData.parties).length === 0)
				charData.parties = { 없음: true };

			const lookupCharacterEmbed = {
				color: 0x0099ff,
				title: sprintf('Lv : %s', charData.itemLevel),
				author: {
					name: charData.name,
					icon_url: charData.classImage,
					url:
						'https://lostark.game.onstove.com/Profile/Character/' +
						charData.name
				},
				description: sprintf('%s', charData.class),
				fields: [
					{
						name: '서버',
						value: charData.server,
						inline: true
					},
					{
						name: '길드',
						value: charData.guild,
						inline: true
					},
					{
						name: '디코계정',
						value: '@' + charData.discord.username,
						inline: true
					},
					{
						name: '보유 시너지',
						value: charData.synergy.join('\n')
					},
					{
						name: '참가중인 레이드',
						value: attendRaidsArr.join('\n')
					},
					{
						name: '진행중인 공대',
						value: Object.keys(charData.parties).join('\n')
					},
					{
						name: '다른 캐릭터',
						value: otherCharacters.join('\n')
					}
				],
				timestamp: new Date()
			};
			resolve({ code: 1, embed: lookupCharacterEmbed });
		} catch (err) {
			let errObj = undefined;
			switch (err.name) {
				case 'NotFoundError':
					errObj = { code: -1, resMsg: err.message };
					break;
				case 'EscapeError':
					errObj = { code: -2, resMsg: err.message };
					break;
				default:
					errObj = { code: 0, resMsg: err.stack };
			}
			resolve(errObj);
		}
	});
}

//캐릭터 삭제
function deleteCharacter(db, msg) {
	return new Promise(async (resolve, reject) => {
		try {
			//캐릭터 조회
			let collectRes = await discordUtil.collectMsg(msg, [
				'삭제하실 `로아 캐릭터명(영어 대소문자 구분)`을 입력해주세요.\n```ex) Achilles도```'
			]);

			if (collectRes.code === -2) throw new EscapeError(collectRes.replyMsg);
			let characterName = collectRes.replyMsg;

			//등록 여부 확인
			let res = await fs.getDoc(db, 'characters', characterName);
			if (res.code === -1)
				resolve({
					code: -1,
					resMsg: '캐릭터 등록` 명령을 통해 캐릭터를 등록하세요.'
				});
			res = await fs.deleteDoc(db, 'characters', characterName);
			res.characterName = characterName;
			resolve(res);
		} catch (err) {
			resolve({ code: 0, resMsg: err.stack });
		}
	});
}

//캐릭터 아이템레벨/길드 갱신
function updateCharacter(db, msg) {
	return new Promise(async (resolve, reject) => {
		try {
			//캐릭터 조회
			let collectRes = await discordUtil.collectMsg(msg, [
				'갱신하실 `로아 캐릭터명(영어 대소문자 구분)`을 입력해주세요.\n```ex) Achilles도```'
			]);

			if (collectRes.code === -2) throw new EscapeError(collectRes.replyMsg);
			let characterName = collectRes.replyMsg;

			//캐릭터 등록 확인
			let dbRes = await fs.getDoc(db, 'characters', characterName);
			if (dbRes.code === -1)
				throw new NotFoundError(
					'봇에 등록되어 있지 않은 캐릭터입니다. `캐릭터 등록` 명령을 통해 캐릭터를 등록하세요.'
				);

			//공식 홈페이지 정보 파싱
			let pupRes = await puppeteer.getItemLevel(characterName);

			if (pupRes.code !== 1) throw new Error(pupRes.resMsg);
			let updateCharacterInfo = pupRes.characterInfo;

			await fs.updateDoc(
				db,
				'characters',
				updateCharacterInfo.name,
				updateCharacterInfo
			);
			resolve({ code: 1, characterName: characterName });
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
	});
}

//캐릭터 태깅
function updateTagCharacter(db, msg) {
	return new Promise(async (resolve, reject) => {
		try {
			//캐릭터 조회
			let collectRes = await discordUtil.collectMsg(msg, [
				'태깅하실 `로아 캐릭터명(영어 대소문자 구분)`을 입력해주세요.\n```ex) Achilles도```'
			]);

			if (collectRes.code === -2) throw new EscapeError(collectRes.replyMsg);
			let characterName = collectRes.replyMsg;

			//캐릭터 등록 확인
			let res = await fs.getDoc(db, 'characters', characterName);
			if (res.code === -1)
				throw new NotFoundError(
					'봇에 등록되어 있지 않은 캐릭터입니다. `캐릭터 등록 [캐릭터명]` 명령을 통해 캐릭터를 등록하세요.'
				);

			//레이드 목록 조회
			res = await raid.showAttendRaidList(db, characterName);
			switch (res.code) {
				case 1:
					msg.channel.send({ embed: res.embed });
					break;
				case -1:
					throw new NotFoundError(res.resMsg);
				default:
					throw new Error(res.resMsg);
			}

			let sendMsgArr = [];
			sendMsgArr.push(
				'태킹하실 `레이드명`을 입력해주세요. 2개 이상 입력은 스페이스로 구분합니다.'
			);
			sendMsgArr.push('```');
			sendMsgArr.push('미스틱');
			sendMsgArr.push('카슈4페 태만의바다-하드 (2개 이상 입력시)');
			sendMsgArr.push('```');

			collectRes = await discordUtil.collectMsg(msg, sendMsgArr);
			let tagRaidsArr = [];
			let replyRaidMsg = collectRes.replyMsg;

			//레이드 정보 수집
			let raidRes = await raid.getRaids(db);
			let raidData = _.map(raidRes.data, item => {return item.name} );

			if (_.includes(replyRaidMsg, ',')) {
				replyRaidMsg = replyRaidMsg.replace(/(, |,| )/gi, ',');
				tagRaidsArr = replyRaidMsg.split(',');
			} else if (_.includes(replyRaidMsg, ' ')) {
				tagRaidsArr = replyRaidMsg.split(' ');
			} else tagRaidsArr.push(replyRaidMsg);

			//레이드 입력 데이터 검증
			if (
				_.intersection(raidData, tagRaidsArr).length !== tagRaidsArr.length
			)
				throw new NotFoundError('입력하신 레이드를 찾을 수 없습니다.');

			let dbRes = await fs.getDoc(db, 'tags', 'raids');
			let tagData = Object.keys(dbRes.data);
			sendMsgArr = [];
			sendMsgArr.push('태깅하실 태그를 선택해주세요.');
			sendMsgArr.push('```');
			sendMsgArr.push(tagData.join('\n'));
			sendMsgArr.push('```');

			//태그 정보 입력
			collectRes = await discordUtil.collectMsg(msg, sendMsgArr);
			let replyTagMsg = collectRes.replyMsg;

			//태그 입력 검증
			if (!_.includes(tagData, replyTagMsg))
				throw new NotFoundError('잘못된 태그 정보를 입력하셨습니다.');

			let raidTags = {};
			_.each(tagRaidsArr, item => {
				raidTags[item] = replyTagMsg;
			});

			//캐릭터 태깅
			await fs.updateDoc(db, 'characters', characterName, {
				tags: raidTags
			});
			resolve({ code: 1, characterName : characterName });
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
	});
}

//캐릭터
module.exports.registerCharacter = registerCharacter;
module.exports.lookupCharacter = lookupCharacter;
module.exports.lookupCharacterByName = lookupCharacterByName;
module.exports.deleteCharacter = deleteCharacter;
module.exports.updateCharacter = updateCharacter;
module.exports.updateTagCharacter = updateTagCharacter;
