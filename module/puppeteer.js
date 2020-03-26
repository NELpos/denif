const puppeteer = require('puppeteer');
const _ = require('lodash');

function getCharacter(characterName) {
	return new Promise(async (resolve, reject) => {
        const browser = await puppeteer.launch({ headless: true });
		try {
			const page = await browser.newPage();
			await page.goto(
				'https://lostark.game.onstove.com/Profile/Character/' +
					characterName
            );

            //Not Found Check
            let pageText = await page.evaluate(()=> document.body.innerHTML);
            if (_.includes(pageText, "캐릭터명을 확인해주세요.")) resolve({code : -1, resMsg : "로스트아크에 생성된 캐릭터가 없습니다. 캐릭터명을 확인해주세요."})
            
			//서버
			let elServerHandle = await page.$x(
				'//*[@id="lostark-wrapper"]/div/main/div/div[2]/div[2]/div[1]/div[1]/div[1]/span[2]'
			);
			let server = await page.evaluate(
				el => el.textContent,
				elServerHandle[0]
			);

			//클래스
			let elClassHandle = await page.$x(
				'//*[@id="lostark-wrapper"]/div/main/div/div[2]/div[2]/div[1]/div[1]/div[3]/span[2]'
			);
			let characterClass = await page.evaluate(
				el => el.textContent,
				elClassHandle[0]
			);

			//클래스 이미지

			let characterClassImage = await page.evaluate(sel => {
				return document
					.querySelector(sel)
					.getAttribute('src')
					.replace('//', 'https://');
			}, '#lostark-wrapper > div > main > div > div.profile-ingame > div.profile-characters > ul > li:nth-child(1) > a > div.user-thumb > img');

			//길드
			let elGuildHandle = await page.$x(
				'//*[@id="lostark-wrapper"]/div/main/div/div[2]/div[2]/div[1]/div[1]/div[2]/span[2]'
			);
			let guild = await page.evaluate(
				el => el.textContent,
				elGuildHandle[0]
			);

			//아이템 레벨
			let elItemLevelHandle = await page.$x(
				'//*[@id="lostark-wrapper"]/div/main/div/div[2]/div[2]/div[1]/div[2]/div[1]/span[2]/text()'
			);
			let itemLevel = await page.evaluate(
				el => el.textContent,
				elItemLevelHandle[0]
            );

			resolve({
				code: 1,
				resMsg: 'success',
				characterInfo: {
                    server : server,
					name: characterName,
					characterClass: characterClass,
					characterClassImage: characterClassImage,
					guild: guild,
					itemLevel: itemLevel
				}
			});
		} catch (err) {
			resolve({ code: 0, resMsg: err.stack });
		} finally {
            await browser.close();
        }
	});
}

function getItemLevel(characterName) {
	return new Promise(async (resolve, reject) => {
        const browser = await puppeteer.launch({ headless: true });
		try {
			const page = await browser.newPage();
			await page.goto(
				'https://lostark.game.onstove.com/Profile/Character/' +
					characterName
            );

            //Not Found Check
            let pageText = await page.evaluate(()=> document.body.innerHTML);
            if (_.includes(pageText, "캐릭터명을 확인해주세요.")) resolve({code : -1, resMsg : "로스트아크에 생성된 캐릭터가 없습니다. 캐릭터명을 확인해주세요."})
        
			//길드
			let elGuildHandle = await page.$x(
				'//*[@id="lostark-wrapper"]/div/main/div/div[2]/div[2]/div[1]/div[1]/div[2]/span[2]'
			);
			let guild = await page.evaluate(
				el => el.textContent,
				elGuildHandle[0]
			);

			//아이템 레벨
			let elItemLevelHandle = await page.$x(
				'//*[@id="lostark-wrapper"]/div/main/div/div[2]/div[2]/div[1]/div[2]/div[1]/span[2]/text()'
			);
			let itemLevel = await page.evaluate(
				el => el.textContent,
				elItemLevelHandle[0]
            );

			resolve({
				code: 1,
				resMsg: 'success',
				characterInfo: {
                    name: characterName,
					guild: guild,
					itemLevel: itemLevel
				}
			});
		} catch (err) {
			resolve({ code: 0, resMsg: err.stack });
		} finally {
            await browser.close();
        }
	});
}

module.exports.getCharacter = getCharacter;
module.exports.getItemLevel = getItemLevel;

