

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
