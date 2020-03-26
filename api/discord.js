const _ = require('lodash');
const Discord = require('discord.js');
const Module = require('./module');
const { firestore, usages, puppeteer } = Module;
const sprintf = require('sprintf-js').sprintf;
const client = new Discord.Client();

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

/**/
// param 1 : 유형 >> 레이드, 공격대, 캐릭터, 시너지
// param 2 : 명령 >> 생성, 수정, 삭제
// param 3 : 인자 1
// param 4 : 인자 2

client.on('message', async msg => {
	let replyMsg = '';
	let params = msg.content.split(' ');

	//don't reply bot-message
	if (msg.member.user.username === 'denif-bot') return;
	try {
		let db = firestore.init();
		switch (params[0]) {
			case '레이드':
				switch (params[1]) {
					case '생성':
					case '삭제':
						{
							let { code, resMsg, data } = await firestore.getRaid(
								db,
								params[2]
							);
							if (code > 0) {
								if (params[1] === '생성')
									replyMsg = '이미 등록되어 있는 레이드입니다.';
								else {
									firestore.deleteRaid(db, params[2]);
									replyMsg = '레이드를 삭제하였습니다.';
								}
							} else if (code === -1) {
								if (params[1] === '생성') {
									firestore.registerRaid(db, params[2], params[3]); //2 : 레이드 이름, 3: 레이드 명수(default 8)
									replyMsg = '레이드가 생성되었습니다.';
								} else replyMsg = '입력하신 레이드를 찾을 수 없습니다.';
							} else replyMsg = resMsg; //error msg
						}
						break;
					case '전체조회':
						{
							let { code, resMsg, data } = await firestore.getRaids(db);
							let raidsArr = _.map(data, item => {
								return sprintf(
									'%s | %s인',
									item.name,
									item.personnel,
									item.uuid
								);
							});
							replyMsg = sprintf(
								'```\n레이드명 | 참가인원수\n--------------------\n%s\n```\n참가 신청하지 않은 레이드가 있다면\n`레이드 참가신청 [레이드명] [캐릭터명]`을 입력해주세요.\n(최초 1회만 신청필요)',
								raidsArr.join('\n')
							);
						}
						break;
					case '조회': {
						let { code, resMsg, data } = await firestore.getRaid(
							db,
							params[2]
						);
						if (code > 0) replyMsg = data;
						else if (code === -1)
							replyMsg = '입력하신 레이드를 찾을 수 없습니다.';
						else replyMsg = resMsg;
					}
					case '/?':
						break;
					default:
						replyMsg =
							'잘못된 레이드 명령어입니다. 레이드 /? 를 입력하여 사용법을 확인하세요.';
				}
				break;
			case '공격대':
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
						break;
					case '레이드신청조회':
						break;
					case '공대장':
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
						//캐릭터 정보 수집 
						let res = await puppeteer.getCharacter(params[2]);
						if (res.code === 0) throw new Error(res.resMsg);
						else if (res.code === -1) replyMsg = res.resMsg;
						else {
							//DB 등록
							res = await firestore.registerCharacter(
								db,
								res.characterInfo,
								msg.member.user
							);
							if (res.code === 0) throw new Error(res.resMsg);
							else if (res.code === -1) replyMsg = res.resMsg;
							else {
								replyMsg =
									'캐릭터 등록이 완료되었습니다\n 등록하신 정보는 `캐릭터 조회 [캐릭터명]`으로 조회 가능합니다';
							}
							break;
						}
					}
					case '조회' : 
						/** */
						break;
					case '전체조회' : 
						/**/
						break;
					case '정보갱신' : 
						let res = await puppeteer.getItemLevel(params[2]);
						if (res.code === 0) throw new Error(res.resMsg);
						else if (res.code === -1) replyMsg = res.resMsg;
						else {
							//DB 등록
							res = await firestore.updateCharacter(
								db,
								res.characterInfo
							);
							if (res.code === 0) throw new Error(res.resMsg);
							else if (res.code === -1) replyMsg = res.resMsg;
							else {
								replyMsg =
									'캐릭터 아이템 레벨과 길드 정보를 갱신하였습니다.\n 변경하신 정보는 `캐릭터 조회 [캐릭터명]`으로 조회 가능합니다';
							}
						}
						break;
					case '삭제': {
						let res = await firestore.deleteCharacter(db, params[2]);
						if (res.code === 0) throw new Error(res.resMsg);
						else if (res.code === -1) replyMsg = res.resMsg;
						else {
							replyMsg =
								'캐릭터 삭제가 완료되었습니다\n 재등록하시려면 `캐릭터 등록 [캐릭터명]`으로 등록 가능합니다';
						}
						break;
					}
					case '레이드 신청':
						break;
					case '시너지 등록':
						break;
				}
				break;
			case '시너지':
				break;
			/**/
			default:
				replyMsg = '잘못된 명령어입니다. 도움말을 참고하세요.';
		}
		msg.reply(replyMsg);
	} catch (err) {
		console.log(err.stack);
		let replyMsg = '명령 수행에 실패했습니다.\n[오류 메세지]\n';
		msg.reply(replyMsg + '```' + err.stack + '```');
	}
});

client.login('NjkyMjYxMTg3MzAzMjQzNzk2.Xnr9cg.hlgVbroO6cIEZCUg5yfLWQd1e20');
