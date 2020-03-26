const firebase = require('firebase/app');
const admin = require('firebase-admin');
const serviceAccount = require('../auth/firebaseServiceAccountKey.json');
const uuid4 = require('uuid4');
const _ = require('lodash');

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: 'https://denif-b4177.firebaseio.com'
});

function init() {
	let db = admin.firestore();
	return db;
}

//문서 전체 검색
async function getDocs(db, collectionName) {
	try {
		let docRef = db.collection(collectionName);
		let data = [];
		let snapshot = await docRef.get();
		if (snapshot.empty) return { code: -1, resMsg: '[get]no data' };
		snapshot.forEach(doc => {
			data.push(doc.data());
		});
		return { code: 1, resMsg: '[get]success', data: data };
	} catch (err) {
		console.log(err.stack);
		return { code: 0, resMsg: err.stack };
	}
}

//문서 조건 검색
async function getDoc(db, collectionName, docName) {
	try {
		let docRef = db.collection(collectionName).doc(docName);
		let doc = await docRef.get();
		if (!doc.exists) {
			return { code: -1, resMsg: '[get]no data' };
		}
		return { code: 1, resMsg: '[get]success', data: doc.data() };
	} catch (err) {
		console.log(err.stack);
		return { code: 0, resMsg: err.stack };
	}
}

//문서 삭제
async function deleteDoc(db, collectionName, docName) {
	try {
		let deleteDoc = await db
			.collection(collectionName)
			.doc(docName)
			.delete();
		return { code: 1, resMsg: '[delete]success' };
	} catch (err) {
		return { code: 0, resMsg: err.stack };
	}
}


//문서 등록 
async function setDoc(db, collectionName, docName, setData) {
	try {
		let docRef = db.collection(collectionName).doc(docName);
		let setInfo = await docRef.set(setData);
		return {code : 1, resMsg : '[set]success'};
	} catch(err) {
		return {code : 0, resMsg : err.stack};
	}
}

//문서 업데이트
async function updateDoc(db, collectionName, docName, updateData) {
	try {
		let docRef = db.collection(collectionName).doc(docName);
		let updateInfo = await docRef.update(updateData);
		return {code : 1, resMsg : '[update]success'};
	} catch(err) {
		return {code : 0, resMsg : err.stack};
	}
}

//캐릭터 등록
function registerCharacter(db, characterInfo, discordInfo) {
	return new Promise((resolve, reject)=> {
		try {
			getDoc(db, 'characters', characterInfo.name).then(res => {
				if (res.code === 1) resolve({ code : -1, resMsg : "이미 등록되어 있는 캐릭터입니다."});
				resolve({code : 1, resMsg : setDoc(db, 'characters', characterInfo.name, {
					server : characterInfo.server,
					name : characterInfo.name,
					class: characterInfo.characterClass,
					classImage : characterInfo.characterClassImage,
					itemLevel: characterInfo.itemLevel,
					guild : characterInfo.guild,
					synergy: [],
					raid: [],
					discord : {
						username : discordInfo.username,
						discriminator : discordInfo.discriminator,
						id : discordInfo.id
					} 
				})})
			});

		} catch (err) {
			resolve({code : 0, resMsg : err.stack})
		}
	});
}

//캐릭터 삭제
function deleteCharacter(db, characterName) {
	return new Promise((resolve, reject)=> {
		try {
			getDoc(db, 'characters', characterName).then(res => {
				if (res.code === -1) resolve({ code : -1, resMsg : "캐릭터 등록 [캐릭터명]` 명령을 통해 캐릭터를 등록하세요."});
				resolve(deleteDoc(db, 'characters', characterName));
			})
		} catch (err) {
			resolve({code : 0, resMsg : err.stack})
		}
	});
}

//캐릭터 아이템레벨/길드 갱신
function updateCharacter(db, updateCharacterInfo) {
	return new Promise((resolve, reject)=> {
		try {
			getDoc(db, 'characters', updateCharacterInfo.name).then(res => {
				if (res.code === -1) resolve({ code : -1, resMsg : "denif에 등록되어 있지 않은 캐릭터입니다. `캐릭터 등록 [캐릭터명]` 명령을 통해 캐릭터를 등록하세요."});
				resolve(updateDoc(db, 'characters', updateCharacterInfo.name, updateCharacterInfo));
			})
		} catch (err) {
			resolve({code : 0, resMsg : err.stack})
		}
	});
}


//레이드 등록
function registerRaid(db, raidName, personnel = 8) {
	let docRef = db.collection('raids').doc(raidName);
	let setInfo = docRef.set({
		uuid: uuid4(),
		name: raidName,
		personnel: personnel
	});
}
//전체 레이드 조회
function getRaids(db, raidName) {
	return new Promise((resolve, reject) => {
		resolve(getDocs(db, 'raids'));
	});
}

//특정 레이드 조회
function getRaid(db, raidName) {
	return new Promise((resolve, reject) => {
		resolve(getDoc(db, 'raids', raidName));
	});
}

//레이드 삭제
async function deleteRaid(db, raidName) {
	return deleteDoc(db, 'raids', raidName);
}

function lookupCharactersByCharacterName() {}

function lookupCharactersByDiscordID() {}

function lookupCharacters(db, type, command) {
	db.collection('characters')
		.get()
		.then(snapshot => {
			snapshot.forEach(doc => {
				console.log(doc.id, '=>', doc.data());
			});
		})
		.catch(err => {
			console.log('Error getting documents', err);
		});
}

//시너지 등록
function registerSynergy(db, synergyInfo) {

}

module.exports.init = init;

//레이드
module.exports.registerRaid = registerRaid;
module.exports.deleteRaid = deleteRaid;
module.exports.getRaid = getRaid;
module.exports.getRaids = getRaids;

//캐릭터
module.exports.registerCharacter = registerCharacter;
module.exports.lookupCharacters = lookupCharacters;
module.exports.deleteCharacter = deleteCharacter;
module.exports.updateCharacter = updateCharacter;
