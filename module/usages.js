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

function lookupUsages(db, docName) {
	return new Promise(async (resolve, reject) => {
		try {
			let dbRes = await fs.getDoc(db, 'usages' , docName);
			if (dbRes.code === -1)
				throw new NotFoundError(
					'등록되어 있는 캐릭터가 아닙니다. 캐릭터를 등록해주세요.'
                );
            let usagesData = dbRes.data;
            usagesData = _.sortBy(usagesData, ['index']);

            if(docName === 'all') docName = docName.replace('all', '전체');

			const lookupUsagesEmbed = {
				color: 0xebe834,
				title: docName + ' 명령 도움말',
				description: sprintf('%s 관련 명령어 사용 설명서입니다.', docName),
                fields: [
                    {
                        name: '명령어',
                        value: '```' + _.map(usagesData, item =>{return item['command']}).join('\n') + '```',
                        inline: true
                    },
                    {
                        name: '설명',
                        value: '```diff\n+' + _.map(usagesData, item =>{return item.usages}).join('\n+') + '```',
                        inline: true
                    }
                ]
			};
			resolve({ code: 1, embed: lookupUsagesEmbed });
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


//도움말
module.exports.lookupUsages = lookupUsages;
