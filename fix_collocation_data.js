import fs from 'fs';
let content = fs.readFileSync('src/CollocationData.ts', 'utf8');

const newItems = `const DEFAULT_COLLOCATIONS: CollocationType[] = [
  { id: '1', baseWord: '결심을', correctSauce: '굳히다', wrongSauces: ['단단하다', '만들다', '세우다'], description: '마음을 흔들리지 않게 단단히 정할 때 "결심을 굳히다"라고 쓴다냥.', category: '감정/태도' },
  { id: '2', baseWord: '갈등을', correctSauce: '해소하다', wrongSauces: ['풀다', '없애다', '지우다'], description: '엉킨 갈등 상황을 시원하게 해결할 때 쓰는 고급스러운 표현이다냥.', category: '감정/태도' },
  { id: '3', baseWord: '기대치에', correctSauce: '부응하다', wrongSauces: ['맞추다', '따르다', '오르다'], description: '남들이 바라는 수준을 만족시킬 때 "부응하다"라고 하는 거다냥.', category: '비즈니스' },
  { id: '4', baseWord: '성적을', correctSauce: '거두다', wrongSauces: ['얻다', '받다', '모으다'], description: '노력의 결과로 좋은 성적을 얻었을 땐 "거두다"가 제맛이지냥.', category: '학업' },
  { id: '5', baseWord: '여력을', correctSauce: '남기다', wrongSauces: ['두다', '버티다', '아끼다'], description: '어떤 일을 하고 남은 힘이나 돈을 뜻할 땐 "여력을 남기다"다냥.', category: '비즈니스' },
  { id: '6', baseWord: '영향을', correctSauce: '미치다', wrongSauces: ['주다', '던지다', '떨치다'], description: '어떤 사물이나 현상이 다른 것에 작용할 때는 "미치다"라는 표현이 가장 어울리지.', category: '일반/사회' },
  { id: '7', baseWord: '관심을', correctSauce: '기울이다', wrongSauces: ['쏟다', '부치다', '던지다'], description: '어떤 대상에 마음을 끌어 쓸 때 "기울이다"라는 표현을 쓴단다.', category: '감정/태도' },
  { id: '8', baseWord: '의견을', correctSauce: '수렴하다', wrongSauces: ['모으다', '수집하다', '줍다'], description: '여러 사람의 의견을 하나로 모아들일 때 쓰는 세련된 표현이야.', category: '비즈니스' },
  { id: '9', baseWord: '결론을', correctSauce: '도출하다', wrongSauces: ['꺼내다', '뽑다', '만들다'], description: '논리적인 과정을 거쳐 결론을 끌어냈다면 "도출하다"가 정답이지.', category: '학업/비즈니스' },
  { id: '10', baseWord: '비중을', correctSauce: '차지하다', wrongSauces: ['먹다', '채우다', '가지다'], description: '어떤 부분이나 역할이 속해있는 비율을 나타낼 때 쓰는 말이다냥.', category: '비즈니스' },
  { id: '11', baseWord: '진위를', correctSauce: '가리다', wrongSauces: ['밝히다', '알다', '찾다'], description: '진짜와 가짜를 구별할 때 쓴단다.', category: '일반/사회' },
  { id: '12', baseWord: '물의를', correctSauce: '빚다', wrongSauces: ['만들다', '치다', '부르다'], description: '세상 사람들의 비판이나 논란을 일으킬 때 "물의를 빚다"라고 한단다.', category: '일반/사회' },
  { id: '13', baseWord: '오명을', correctSauce: '씻다', wrongSauces: ['지우다', '털다', '버리다'], description: '억울하거나 부끄러운 평판을 없앨 때는 "오명을 씻다"라고 하는 거야.', category: '일반/사회' },
  { id: '14', baseWord: '심혈을', correctSauce: '기울이다', wrongSauces: ['다하다', '바치다', '쏟다'], description: '온갖 정성을 다할 때 "심혈을 기울이다"가 정답이지.', category: '감정/태도' },
  { id: '15', baseWord: '가닥을', correctSauce: '잡다', wrongSauces: ['치다', '풀다', '자르다'], description: '복잡한 일의 갈피를 잡아 나갈 때 "가닥을 잡다"라고 표현한다냥.', category: '일반/사회' },
  { id: '16', baseWord: '곤욕을', correctSauce: '치르다', wrongSauces: ['겪다', '당하다', '느끼다'], description: '심한 모욕이나 참기 힘든 일을 겪었을 때는 "곤욕을 치르다"야.', category: '감정/태도' },
  { id: '17', baseWord: '눈시울을', correctSauce: '붉히다', wrongSauces: ['적시다', '흘리다', '떨다'], description: '눈물이 날 만큼 감동하거나 슬플 때 "눈시울을 붉히다"라고 하지.', category: '감정/태도' },
  { id: '18', baseWord: '종지부를', correctSauce: '찍다', wrongSauces: ['맺다', '치다', '누르다'], description: '어떤 일을 끝맺을 때 "종지부를 찍다"라고 쓰는 것이란다.', category: '비즈니스' },
  { id: '19', baseWord: '박차를', correctSauce: '가하다', wrongSauces: ['주다', '더하다', '넣다'], description: '더욱 분발하여 힘을 낼 때 "박차를 가하다"라고 표현한다냥.', category: '비즈니스' },
  { id: '20', baseWord: '기틀을', correctSauce: '마련하다', wrongSauces: ['세우다', '만들다', '다지다'], description: '어떤 일의 바탕이나 중심을 세울 때 "기틀을 마련하다"라고 하지.', category: '일반/사회' }
];`;

content = content.replace(/const DEFAULT_COLLOCATIONS: CollocationType\[\] = \[([\s\S]*?)\];/g, newItems);

let getFallback = `export async function getCollocations(): Promise<CollocationType[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'collocations'));
    let fetched = querySnapshot.empty ? [] : querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CollocationType));
    
    // Merge remote with DEFAULT_COLLOCATIONS
    const merged = [...fetched];
    for (const def of DEFAULT_COLLOCATIONS) {
      if (!merged.find(m => m.baseWord === def.baseWord)) {
        merged.push(def);
      }
    }
    return merged;
  } catch (err) {
    return DEFAULT_COLLOCATIONS;
  }
}`;

content = content.replace(/export async function getCollocations\(\): Promise<CollocationType\[\]> \{[\s\S]*$/, getFallback);

fs.writeFileSync('src/CollocationData.ts', content);
