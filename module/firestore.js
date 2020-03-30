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

class NotFoundError extends Error {
	constructor(message) {
		super(message);
		this.name = 'NotFoundError';
	}
}

//문서 전체 검색
async function getDocs(db, collectionName) {
	return new Promise(async (resolve, reject) => {
		try {
			let docRef = db.collection(collectionName);
				data = [],
				snapshot = await docRef.get();
			if (snapshot.empty) throw new NotFoundError('[get]not found docs');
			snapshot.forEach(doc => {
				data.push(doc.data());
			});
			return resolve({ code: 1, resMsg: '[get]success', data: data });
		} catch (err) {
			let errObj = undefined;
			switch(err.name) {
				case 'NotFoundError':
					errObj = { code: -1, resMsg: err.stack };
					break;
				default :
					errObj = { code: 0, resMsg: err.stack };
			}
			return resolve(errObj);
		}
	})
}

//문서 검색
async function getDoc(db, collectionName, docName) {
	return new Promise(async (resolve, reject) => {
		try {
			let docRef = db.collection(collectionName).doc(docName);
			let doc = await docRef.get();
			if (!doc.exists) throw new NotFoundError('[get]not found doc');
			return resolve({ code: 1, resMsg: '[get]success', data: doc.data()});
		} catch (err) {
			let errObj = undefined;
			switch(err.name) {
				case 'NotFoundError':
					errObj = { code: -1, resMsg: err.stack };
					break;
				default :
					errObj = { code: 0, resMsg: err.stack };
			}
			return resolve(errObj);
		}
	})

}

//문서 조건 검색
async function getWhereDoc(db, collectionName, conditionInfo) {
	return new Promise(async (resolve, reject) => {
		try {
			let docRef = db
				.collection(collectionName)
				.where(
					conditionInfo.column,
					conditionInfo.operator,
					conditionInfo.value
				);
			let snapshot = await docRef.get();
			let docDataArr = [];
			if (snapshot.empty) throw new NotFoundError('[get]not found doc'); 
			snapshot.forEach(doc => {
				docDataArr.push(doc.id);
			});
			return resolve({ code: 1, resMsg: '[get]success', data: docDataArr });
		} catch (err) {
			let errObj = undefined;
			switch(err.name) {
				case 'NotFoundError':
					errObj = { code: -1, resMsg: err.stack };
					break;
				default :
					errObj = { code: 0, resMsg: err.stack };
			}
			return resolve(errObj);
		}
	})
}

//문서 삭제
async function deleteDoc(db, collectionName, docName) {
	return new Promise(async (resolve, reject) => {
		try {
			let deleteDoc = await db
				.collection(collectionName)
				.doc(docName)
				.delete();
			resolve({ code: 1, resMsg: '[delete]success' });
		} catch (err) {
			let errObj = undefined;
			switch(err.name) {
				default :
					errObj = { code: 0, resMsg: err.stack };
			}
			resolve(errObj);
		}
	})

}

//문서 등록
async function setDoc(db, collectionName, docName, setData) {
	return new Promise(async (resolve, reject) => {
		try {
			let docRef = db.collection(collectionName).doc(docName);
			let setInfo = await docRef.set(setData);
			return resolve({ code: 1, resMsg: '[set]success' });
		} catch (err) {
			let errObj = undefined;
			switch(err.name) {
				default :
					errObj = { code: 0, resMsg: err.stack };
			}
			return resolve(errObj);
		}
	})
}

//문서 업데이트
async function updateDoc(db, collectionName, docName, updateData) {
	return new Promise(async (resolve, reject) => {
		try {
			let docRef = db.collection(collectionName).doc(docName);
			let updateInfo = await docRef.update(updateData);
			return resolve({ code: 1, resMsg: '[update]success' });
		} catch (err) {
			let errObj = undefined;
			switch(err.name) {
				default :
					errObj = { code: 0, resMsg: err.stack };
			}
			return resolve(errObj);		}
	})

}

module.exports.init = init;
module.exports.getDocs = getDocs;
module.exports.getDoc = getDoc;
module.exports.getWhereDoc = getWhereDoc;
module.exports.deleteDoc = deleteDoc;
module.exports.setDoc = setDoc;
module.exports.updateDoc = updateDoc;
