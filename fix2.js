import fs from 'fs';

const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// replace y2k -> kitsch
content = content.replace(/y2k-/g, 'kitsch-');

// shop items
content = content.replace(
  /const LOUNGE_SHOP_ITEMS = \[[\s\S]*?\];/,
  "const LOUNGE_SHOP_ITEMS = [" +
  "{ id: 'pen', name: '만년필', price: 50, icon: '🖋️' }," +
  "{ id: 'dict', name: '국어사전', price: 70, icon: '📖' }," +
  "{ id: 'lamp', name: '원고지 무드등', price: 100, icon: '🏮' }," +
  "{ id: 'fairy', name: '맞춤법 요정', price: 150, icon: '🧚' }," +
  "{ id: 'desk', name: '책장 세트', price: 200, icon: '📚' }," +
  "{ id: 'lavalamp', name: '라바 램프', price: 60, icon: '🌋' }," +
  "];"
);

// user profile interface
content = content.replace(
  "purchasedItems: string[];",
  "purchasedItems: string[];\n  furniturePositions?: Record<string, {x: number, y: number}>;"
);

// initialize state 1
content = content.replace(
  "if (!data.purchasedItems) data.purchasedItems = [];",
  "if (!data.purchasedItems) data.purchasedItems = [];\n            if (!data.furniturePositions) data.furniturePositions = {};"
);

// initialize state 2
content = content.replace(
  "purchasedItems: [],",
  "purchasedItems: [],\n              furniturePositions: {},"
);

// handle Share error
const shareNew = `  const handleShare = async () => {\n    const text = \`나는 스승님 밑에서 수련해 현재 [\${getLevelInfo(userProfile?.salmons || 0).title}] 직급이 되었다냥! 너도 냥식당에 입사해볼래?\\n\\n내 연어 코인: \${userProfile?.salmons}개\\n수집한 레시피: \${userProfile?.collectedRecipes.length}개\`;\n    try {\n      if(navigator.clipboard && navigator.clipboard.writeText) {\n        await navigator.clipboard.writeText(text);\n        alert("클립보드에 복사되었습니다! 카카오톡이나 SNS에 붙여넣기 하여 자랑해보세요.");\n      } else {\n        prompt("아래 텍스트를 복사하여 공유하세요!", text);\n      }\n    } catch (e) {\n      prompt("아래 텍스트를 복사하여 공유하세요!", text);\n    }\n  };`;
content = content.replace(/  const handleShare = async \(\) => {[\s\S]*?  };/, shareNew);

// update lounge rendering
const oldLoungeRegex = /<div className="flex flex-wrap gap-4 mt-4">([\s\S]*?)<\/div>/;
// In order to not mess up, let's just write exactly the string to be replaced.
const oldLoungeContent = `<div className="w-full bg-white kitsch-border p-6 mb-12 min-h-[200px] relative">
               <h3 className="absolute -top-4 left-4 bg-[var(--color-kitsch-pink)] text-white px-3 py-1 font-yangjin kitsch-border-sm">내 인테리어</h3>
               {(userProfile?.purchasedItems?.length || 0) > 0 ? (
                 <div className="flex flex-wrap gap-4 mt-4">
                   {(userProfile?.purchasedItems || []).map(itemId => {
                     const item = LOUNGE_SHOP_ITEMS.find(i => i.id === itemId);
                     if(!item) return null;
                     return (
                        <div key={itemId} className="text-6xl animate-bounce" title={item.name}>{item.icon}</div>
                     )
                   })}
                 </div>
               ) : (
                 <p className="mt-8 text-center font-bold text-gray-500">아직 아무것도 없다... 상점에서 구매해보자!</p>
               )}
             </div>`;

const newLoungeContent = `<div className="w-full bg-[#fdfaf6] kitsch-border-sm mb-12 min-h-[250px] relative overflow-hidden">
               <h3 className="absolute top-2 left-4 px-3 py-1 font-yangjin text-gray-400 z-0 opacity-50 text-2xl">내 방앗간</h3>
               {(userProfile?.purchasedItems?.length || 0) > 0 ? (
                 <div className="absolute inset-0 w-full h-full">
                   {(userProfile?.purchasedItems || []).map(itemId => {
                     const item = LOUNGE_SHOP_ITEMS.find(i => i.id === itemId);
                     if(!item) return null;
                     const pos = userProfile?.furniturePositions?.[itemId] || {x: 50, y: 50};
                     return (
                        <motion.div 
                          key={itemId}
                          drag 
                          dragMomentum={false}
                          onDragEnd={async (e, info) => {
                             if (!userProfile) return;
                             try {
                               const newPositions = {
                                 ...(userProfile.furniturePositions || {}),
                                 [itemId]: {
                                    x: (userProfile.furniturePositions?.[itemId]?.x || 50) + info.offset.x,
                                    y: (userProfile.furniturePositions?.[itemId]?.y || 50) + info.offset.y
                                 }
                               };
                               await setDoc(doc(db, 'users', userProfile.uid), {
                                 furniturePositions: newPositions,
                                 updatedAt: serverTimestamp()
                               }, { merge: true });
                               setUserProfile({ ...userProfile, furniturePositions: newPositions });
                             } catch(err) {
                               console.log(err);
                             }
                          }}
                          initial={pos}
                          animate={pos}
                          className="absolute text-5xl cursor-grab active:cursor-grabbing hover:scale-110 transition-transform bg-white/40 rounded-full w-20 h-20 flex items-center justify-center shadow-md border-2 border-dashed border-[var(--color-kitsch-blue)]" 
                          title={item.name}
                        >
                          {item.icon}
                        </motion.div>
                     )
                   })}
                 </div>
               ) : (
                 <p className="mt-20 text-center font-bold text-gray-500 relative z-10">아직 아무것도 없다... 상점에서 아이템을 사볼까?</p>
               )}
             </div>`;

content = content.replace(oldLoungeContent, newLoungeContent);

fs.writeFileSync(path, content);
