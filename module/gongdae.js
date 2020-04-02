const _ = require('lodash');
const Discord = require('discord.js');
const sprintf = require('sprintf-js').sprintf;
const fs = require('./firestore');
const raid = require('./raid');
const discordUtil = require('./discordUtil');
const character = require('./character');
const moment = require('moment-timezone');
const Q = require('q');
const promise = require('bluebird');

class NotFoundError extends Error {
	constructor(message) {
		super(message);
		this.name = 'NotFoundError';
	}
}

class EscapeError extends Error {
	constructor(message) {
		super(message);
		this.name = 'EscapeError';
	}
}

class ConnectWebhookError extends Error {
	constructor(message) {
		super(message);
		this.name = 'ConnectWebhookError';
	}
}

class DBError extends Error {
	constructor(message) {
		super(message);
		this.name = 'DBError';
	}
}

function registerGongdae(db, msg) {
	return new Promise(async (resolve, reject) => {
		try {
			let sendMsgArr = [],
				res = undefined,
				dbRes = undefined,
				gongdae = {
					name: undefined,
					leader: undefined,
					participants : [],
					parties: {},
					partyCnt: 0,
					personnel: 0,
					allocPeopleCnt: 0,
					raidType: undefined,
					raidImgUrl : undefined,
					status: undefined,
					startTime: moment().tz('Asia/Seoul'),
					createTime: moment().tz('Asia/Seoul')
				};
			//상태 지정
			gongdae.status = '생성';
			//공대장 디스코드 계정 설정
			gongdae.leader = msg.member.user.username;

			sendMsgArr.push(
				'공격대를 생성합니다. 생성하실 `레이드명` 선택하여 입력해주세요.'
			);
			msg.channel.send(sendMsgArr.join('\n'));

			res = await raid.showRaidAllList(db);
			msg.channel.send({ embed: res.embed });

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
					let replyRaidMsg = collected.first().content;

					//탈출 블록
					if (_.includes(['종료', '그만', '취소'], replyRaidMsg)) {
						msg.channel.send('진행을 종료합니다.');
						return resolve({ code: 1 });
					}

					//레이드 생성 여부 확인
					let dbRes = await fs.getDoc(db, 'raids', replyRaidMsg);
					if (dbRes.code === -1)
						throw new NotFoundError(
							'입력하신 레이드를 찾을 수 있습니다.'
						);

					gongdae.personnel = dbRes.data.personnel;
					gongdae.partyCnt = dbRes.data.personnel / 4;
					gongdae.raidType = dbRes.data.name;
					gongdae.raidImgUrl = dbRes.data.raidImgUrl;

					msg.channel.send('`공대명`을 입력해주세요.');
					return msg.channel.awaitMessages(filter, {
						max: 1,
						time: 60000,
						errors: ['time']
					});
				})
				.then(async collected => {
					let replyGongDaeMsg = collected.first().content;

					//공대 이름 지정
					gongdae.name = replyGongDaeMsg;

					//인원수 지정
					msg.channel.send(
						sprintf(
							'\n편성 가능 파티 수는 %d개 입니다.',
							gongdae.partyCnt
						)
					);

					let sendMsgArr = [];
					sendMsgArr.push(
						'파티명 지정을 위해 아래와 같은 형식으로 입력해주세요.(뛰어쓰기로 구분)'
					);
					sendMsgArr.push('```');
					sendMsgArr.push('일반(1개 입력시)');
					sendMsgArr.push('얼음 불(미스틱 편성시)');
					sendMsgArr.push('외부 내부 내부 내부거울(카슈편성시)');
					sendMsgArr.push('```');
					msg.channel.send(sendMsgArr.join('\n'));

					return msg.channel.awaitMessages(filter, {
						max: 1,
						time: 60000,
						errors: ['time']
					});
				})
				.then(collected => {
					let replyPartyNameMsg = collected.first().content;
					let partyNamesArr = [];

					//탈출 블록
					if (_.includes(['종료', '그만', '취소'], replyPartyNameMsg)) {
						msg.channel.send(`${index}파티 입력을 종료합니다.`);
						return resolve({ code: 1 });
					}

					if (_.includes(replyPartyNameMsg, ',')) {
						replyPartyNameMsg = replyPartyNameMsg.replace(
							/(, |,| )/gi,
							','
						);
						partyNamesArr = replyPartyNameMsg.split(',');
					} else if (_.includes(replyPartyNameMsg, ' ')) {
						partyNamesArr = replyPartyNameMsg.split(' ');
					} else partyNamesArr.push(replyPartyNameMsg);

					_.each(partyNamesArr, (item, index) => {
						gongdae['parties'][item] = {};
					});
					return fs.setDoc(db, 'gongdae', gongdae.name, gongdae);
				})
				.then(res => {
					if (res.code !== 1) throw new Error('DB Error');
					return resolve({ code: 1, name: gongdae.name });
				})
				.catch(err => {
					console.log(err.stack);
					switch (err.name) {
						case 'ReferenceError:':
						case 'TypeError:':
						case 'NotFoundError':
							resolve({ code: -1, resMsg: err.message });
							break;
						default:
							resolve({
								code: 0,
								resMsg: ':alarm_clock: 응답 시간이 초과 되었습니다.'
							});
					}
				});
		} catch (err) {
			console.log(err.stack);
			let errObj = undefined;
			switch (err.name) {
				case 'ReferenceError:':
				case 'TypeError:':
				case 'NotFoundError':
				case 'EscapeError':
					errObj = { code: -1, resMsg: err.message };
					break;
				default:
					errObj = { code: 0, resMsg: err.stack };
			}
			resolve(errObj);
		}
	});
}

function editGongdae(db, msg) {
	return new Promise(async (resolve, reject) => {
		try {
			//공대 리스트 보여주기
			let res = await showGongdaeList(db, msg);
			if (res.code === -1)
				throw new NotFoundError(
					'편성할 공대가 없습니다. 공대를 생성해주세요.'
				);

			//공대명 입력
			let collectRes = await discordUtil.collectMsg(msg, [
				'편성하실 `공대명`을 입력해주세요.'
			]);
			if (collectRes.code === -2) throw new EscapeError(collectRes.replyMsg);
			let replyGongDaeMsg = collectRes.replyMsg;

			//공대 생성 여부 확인 및 공대 정보 가져오기
			let dbRes = await fs.getDoc(db, 'gongdae', replyGongDaeMsg);
			if (dbRes.code === -1)
				throw new NotFoundError('입력하신 `공대`를 찾을 수 없습니다.');

			let gongdae = Object.assign({}, dbRes.data);

			//레이드 target정보를 가져오기.
			dbRes = await fs.getDoc(db, 'raids', gongdae.raidType);
			let targets = dbRes.data.participants;

			//레이드
			let pr_pool = _.map(Object.keys(targets), item => {
				return fs.getDoc(db, 'characters', item);
			});

			let prRes = await Promise.all(pr_pool);
			let charDataArr = _.compact(
				_.map(prRes, item => {
					return item.data;
				})
			);
			charDataArr = _.sortBy(charDataArr, ['class', 'itemLevel']);

			msg.channel.send('선택하신 레이드 참가 신청 인원 현황입니다.');

			//태그 매칭
			let raidTags = await fs.getDoc(db, 'tags', 'raids');
			let lookupParticipantEmbeds = [];

			_.each(charDataArr, async (item, index) => {
				//set Color
				let embedColor = undefined;
				if (!_.includes(Object.keys(item.tags), gongdae.raidType))
					embedColor = '0xa3a3a2';
				else {
					if (
						!_.includes(
							Object.keys(raidTags.data),
							item.tags[gongdae.raidType]
						)
					)
						embedColor = '0xa3a3a2';
					else embedColor = raidTags.data[item.tags[gongdae.raidType]];
				}

				lookupParticipantEmbeds.push({
					color: parseInt(embedColor),
					author: {
						name: sprintf(
							'%s / %s / Lv.%s',
							item.name,
							item.class,
							item.itemLevel
						),
						icon_url: item.classImage,
						url:
							'https://lostark.game.onstove.com/Profile/Character/' +
							item.name
					},
					fields: [
						{
							name: '보유시너지',
							value: item.synergy.join(', ')
						}
					]
				});
			});

			//send webhook
			let webhookRes = await discordUtil.sendWebhookEmbed(
				db,
				'raid-bot',
				lookupParticipantEmbeds
			);
			if (webhookRes.code !== 1)
				throw new ConnectWebhookError(webhookRes.resMsg);

			/*파티 편성 시작*/
			//파티명 입력 받기
			let collectMsgObj = {};
			collectRes = await _.reduce(
				Object.keys(gongdae.parties),
				(acc, item) => {
					let questionMsgArr = [];
					questionMsgArr.push(
						sprintf(
							'`%s` 파티에 편성할 인원을 아래와 같은 형태로 입력해주세요.',
							item
						)
					);
					questionMsgArr.push(
						'```홀리레트라 아올레트라 레피오트라 공팟```'
					);
					questionMsgArr.push(
						'공팟 인원 추가시 `공팟[숫자]`로 고유한 이름으로 입력해주시면 됩니다.'
					);
					return acc.then(res => {
						if (!_.isUndefined(res)) {
							//파티 편성 인원 확인
							collectMsgObj[res.data] = res.replyMsg.split(' ');
						}
						return discordUtil.collectMsg(
							msg,
							questionMsgArr,
							null,
							300000,
							item
						);
					});
				},
				Promise.resolve()
			);
			collectMsgObj[collectRes.data] = collectRes.replyMsg.split(' ');

			let successMember = [],
				failMember = [];
			//입력한 캐릭터 검증
			_.each(Object.keys(collectMsgObj), partyName => {
				_.each(collectMsgObj[partyName], member => {
					let tmpArr = _.filter(charDataArr, { name: member });
					if (!_.isEmpty(tmpArr)) {
						gongdae.parties[partyName][member] = tmpArr[0];
						gongdae.allocPeopleCnt++;
						successMember.push(member);
					} else if (_.includes(member, '공팟')) {
						gongdae.parties[partyName][member] = {
							name: member,
							class: '???',
							itemLevel: '???',
							synergy: []
						};
						gongdae.allocPeopleCnt++;
						successMember.push(member);
					} else failMember.push(member);
				});
			});

			//명령 수행 결과 보여주기
			msg.channel.send(
				sprintf(
					'```diff\n+ 추가 성공\n---%s\n- 추가 실패\n---%s```',
					successMember.join('\n---') || '없음',
					failMember.join('\n---') || '없음'
				)
			);

			//캐릭터 정보에 공대 정보 등록하기
			successMember = _.filter(successMember, member => {
				return !_.includes(member, '공팟');
			})

			//공대 정보 업데이트
			dbRes = await fs.updateDoc(db, 'gongdae', gongdae.name, gongdae);
			if (dbRes.code !== 1) throw new DBError('DB 업데이트에 실패했습니다.');
			console.log(gongdae);
			let gongdaeInfoEmbeds = [];
			gongdaeInfoEmbeds.push({
				color: parseInt(0x03fcba),
				author: {
					name: gongdae.raidType,
					icon_url:
						gongdae.raidImgUrl
				},
				participants : successMember.slice(0,),
				title: sprintf('공대명 : %s\n', gongdae.name), 
				fields : [
					{
						name: '공대장(디코계정)',
						value: '@' + gongdae.leader,
						inline: true					
					},
					{
						name: '시작시간',
						value: moment(gongdae.startTime.toDate()).format('YYYY-MM-DD HH:mm'),
						inline: true
					},
					{
						name: '진행상태',
						value: gongdae.status,
						inline: true
					}
				]
			});

			_.each(Object.keys(gongdae.parties), party => {
				let gongdaeInfoEmbed = {
					color: parseInt(0xbbf0e8),
					description: party,
					fields: []
				};

				let partyInfo = {
					characterNames: [],
					characterClasses: [],
					itemLevels: [],
					partySynergies: []
				};
				_.each(Object.keys(_.get(gongdae.parties, party)), character => {
					let characterInfo = _.get(gongdae, [
						'parties',
						party,
						character
					]);
					partyInfo.characterNames.push(_.get(characterInfo, 'name'));
					partyInfo.characterClasses.push(_.get(characterInfo, 'class'));
					partyInfo.itemLevels.push(_.get(characterInfo, 'itemLevel'));
					partyInfo.partySynergies = _.concat(
						partyInfo.partySynergies,
						_.get(characterInfo, 'synergy')
					);
				});
				partyInfo.partySynergies = _.sortBy(partyInfo.partySynergies);
				gongdaeInfoEmbed.fields.push(
					{
						name: '캐릭터명',
						value: partyInfo.characterNames.join('\n'),
						inline: true
					},
					{
						name: '클래스',
						value: partyInfo.characterClasses.join('\n'),
						inline: true
					},
					{
						name: '아이템레벨',
						value: partyInfo.itemLevels.join('\n'),
						inline: true
					},
					{
						name: '파티시너지',
						value: partyInfo.partySynergies.join(', '),
						inline: true
					}
				);
				gongdaeInfoEmbeds.push(gongdaeInfoEmbed);
			});
			console.log(gongdaeInfoEmbeds);

			//send webhook
			webhookRes = await discordUtil.sendWebhookEmbed(
				db,
				'raid-bot',
				gongdaeInfoEmbeds
			);
			if (webhookRes.code !== 1)
				throw new ConnectWebhookError(webhookRes.resMsg);

			// _.each(Object.keys(gongdae.parties), async item => {

			// 	let res = await discordUtil.collectMsg(msg, questionMsgArr);
			// 	console.log(res);
			// });

			// tasks.forEach(task => {
			// 	result = result.then(() => task());
			//   });
			//   return result;
		} catch (err) {
			let errObj = undefined;
			switch (err.name) {
				case 'NotFoundError':
				case 'EscapeError':
				case 'ConnectWebhookError':
					errObj = { code: -1, resMsg: err.message };
					break;
				default:
					errObj = { code: 0, resMsg: err.stack };
			}
			resolve(errObj);
		}
	});
}

function showGongdaeList(db, msg) {
	return new Promise(async (resolve, reject) => {
		try {
			let dbRes = await fs.getDocs(db, 'gongdae');
			if (dbRes.code === -1) throw new NotFoundError(dbRes.resMsg);
			let gongdaeNamesArr = _.map(dbRes.data, item => {
				return sprintf(
					'%s (%s/%s)',
					item.name,
					item.allocPeopleCnt,
					item.personnel
				);
			});
			let gongdaeRaidTypeArr = _.map(dbRes.data, item => {
				return item.raidType;
			});
			let gongdaeTimesArr = _.map(dbRes.data, item => {
				return moment(item.startTime.toDate()).format('YYYY-MM-DD HH:mm');
			});
			let lookupGongdaeEmbed = {
				color: 0x03fcba,
				title: '공대 목록',
				fields: [
					{
						name: '공대명 (인원)',
						value: gongdaeNamesArr.join('\n'),
						inline: true
					},
					{
						name: '레이드',
						value: gongdaeRaidTypeArr.join('\n'),
						inline: true
					},
					{
						name: '출발시간',
						value: gongdaeTimesArr.join('\n'),
						inline: true
					}
				]
			};
			msg.channel.send({ embed: lookupGongdaeEmbed });
			resolve({ code: 1 });
		} catch (err) {
			console.log(err.stack);
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

function format() {
	return new Promise(async (resolve, reject) => {
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
	});
}

//공대
module.exports.registerGongdae = registerGongdae;
module.exports.editGongdae = editGongdae;
module.exports.showGongdaeList = showGongdaeList;
