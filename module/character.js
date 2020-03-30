const _ = require('lodash');
const Discord = require('discord.js');
const sprintf = require('sprintf-js').sprintf;
const fs = require('./firestore');
const puppeteer = require('./puppeteer');

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
function registerCharacter(db, params, discordInfo) {
	//characterInfo, discordInfo)
	return new Promise(async (resolve, reject) => {
		try {
			//캐릭터 정보수집
			let res = await puppeteer.getCharacter(params[2]);
			if (res.code === 0) throw new Error(res.resMsg);
			else if (res.code === -1) throw new NotFoundError(res.resMsg);

			let synergyArr = [],
				classImageUrl = undefined,
				characterInfo = res.characterInfo;

			res = await fs.getDoc(db, 'characters', characterInfo.name);
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
			res = await fs.getWhereDoc(db, 'synergy', conditionInfo);
			if (!_.isUndefined(res)) synergyArr = res.data;

			//get class imageUrl
			res = await fs.getDoc(db, 'classImage', 'imageUrl');

			if (!_.isUndefined(res))
				classImageUrl = _.get(res.data, characterInfo.characterClass);

			resolve({
				code: 1,
				resMsg: await fs.setDoc(db, 'characters', characterInfo.name, {
					server: characterInfo.server,
					name: characterInfo.name,
					class: characterInfo.characterClass,
					classImage: classImageUrl,
					itemLevel: characterInfo.itemLevel,
					guild: characterInfo.guild,
					synergy: synergyArr,
					parties: {},
					discord: {
						username: discordInfo.username,
						discriminator: discordInfo.discriminator,
						id: discordInfo.id
					}
				})
			});
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

//캐릭터 조회
function lookupCharacter(db, characterName) {
	return new Promise(async (resolve, reject) => {
		try {
			let charRes = await fs.getDoc(db, 'characters', characterName);
			if (charRes.code === -1)
				throw new NotFoundError(
					'등록되어 있는 캐릭터가 아닙니다. 캐릭터를 등록해주세요.'
				);

			//레이드 공격대 정보 가져오기.
			let raidConditionInfo = {
				column: 'participants.' + characterName,
				operator: '==',
				value: true
			};
			let raidRes = await fs.getWhereDoc(db, 'raids', raidConditionInfo),
				attendRaidsArr = [];
			
			if (!_.isUndefined(raidRes.data))
				attendRaidsArr = raidRes.data.slice(0);
			else attendRaidsArr.push('없음');

			//레이드, 공격대 없는 거처리

			if (Object.keys(charRes.data.parties).length === 0)
				charRes.data.parties = { 없음: true };

			const lookupCharacterEmbed = {
				color: 0x0099ff,
				title: sprintf('Lv : %s', charRes.data.itemLevel),
				author: {
					name: charRes.data.name,
					icon_url: charRes.data.classImage,
					url:
						'https://lostark.game.onstove.com/Profile/Character/' +
						charRes.data.name
				},
				description: sprintf('클래스 : %s', charRes.data.class),
				fields: [
					{
						name: '서버',
						value: charRes.data.server,
						inline: true
					},
					{
						name: '길드',
						value: charRes.data.guild,
						inline: true
					},
					{
						name: '디코계정',
						value: '@' + charRes.data.discord.username,
						inline: true
					},
					{
						name: '보유 시너지',
						value: charRes.data.synergy.join('\n')
					},
					{
						name: '참가중인 레이드',
						value: attendRaidsArr.join('\n')
					},
					{
						name: '진행예정인 공격대',
						value: Object.keys(charRes.data.parties).join('\n')
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
				default:
					errObj = { code: 0, resMsg: err.stack };
			}
			resolve(errObj);
		}
	});
}

//캐릭터 전체 조회
function lookupAllCharacters(db, discordInfo) {}

//캐릭터 삭제
function deleteCharacter(db, characterName) {
	return new Promise(async (resolve, reject) => {
		try {
			let res = await fs.getDoc(db, 'characters', characterName);
			if (res.code === -1)
				resolve({
					code: -1,
					resMsg:
						'캐릭터 등록 [캐릭터명]` 명령을 통해 캐릭터를 등록하세요.'
				});
			res = await fs.deleteDoc(db, 'characters', characterName);
			resolve(res);
		} catch (err) {
			resolve({ code: 0, resMsg: err.stack });
		}
	});
}

//캐릭터 아이템레벨/길드 갱신
function updateCharacter(db, characterName) {
	return new Promise(async (resolve, reject) => {
		try {
			let res = await puppeteer.getItemLevel(characterName);

			if (res.code !== 1) throw new Error(res.resMsg);
			let updateCharacterInfo = res.characterInfo;

			res = await fs.getDoc(db, 'characters', updateCharacterInfo.name);
			if (res.code === -1)
				throw new NotFoundError(
					'denif에 등록되어 있지 않은 캐릭터입니다. `캐릭터 등록 [캐릭터명]` 명령을 통해 캐릭터를 등록하세요.'
				);

			await fs.updateDoc(
				db,
				'characters',
				updateCharacterInfo.name,
				updateCharacterInfo
			);
			resolve({ code: 1 });
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
module.exports.lookupAllCharacters = lookupAllCharacters;
module.exports.deleteCharacter = deleteCharacter;
module.exports.updateCharacter = updateCharacter;
