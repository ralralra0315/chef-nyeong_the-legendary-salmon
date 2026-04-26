import { collection, getDocs, setDoc, doc, OperationType, handleFirestoreError } from './firebase';
import { db } from './firebase';

export interface CollocationType {
  id: string;
  baseWord: string;
  correctSauce: string;
  wrongSauces: string[];
  description: string;
  category: string;
}

const DEFAULT_COLLOCATIONS: CollocationType[] = [
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
  { id: '20', baseWord: '기틀을', correctSauce: '마련하다', wrongSauces: ['세우다', '만들다', '다지다'], description: '어떤 일의 바탕이나 중심을 세울 때 "기틀을 마련하다"라고 하지.', category: '일반/사회' },
  { id: '21', baseWord: '흥정을', correctSauce: '붙이다', wrongSauces: ['깎다', '치다', '던지다'], description: '물건을 사고팔 때 값을 의논하는 일은 "흥정을 붙이다"라고 한다냥.', category: '비즈니스' },
  { id: '22', baseWord: '추파를', correctSauce: '던지다', wrongSauces: ['날리다', '뿌리다', '보내다'], description: '환심을 사려고 은근히 보내는 눈길은 "던지다"와 어울린다냥.', category: '감정/태도' },
  { id: '23', baseWord: '원한을', correctSauce: '사다', wrongSauces: ['지다', '받다', '먹다'], description: '남에게 원망스럽고 억울한 마음을 갖게 했을 때는 "원한을 사다"지.', category: '감정/태도' },
  { id: '24', baseWord: '타격을', correctSauce: '입다', wrongSauces: ['맞다', '받다', '당하다'], description: '큰 손해나 피해를 당했을 때는 "타격을 입다"라고 표현해야 제맛이다냥.', category: '비즈니스' },
  { id: '25', baseWord: '생색을', correctSauce: '내다', wrongSauces: ['주다', '부리다', '피우다'], description: '다른 사람 앞에 당당히 나설 수 있을 만큼 체면을 세우는 행동이지.', category: '일반/사회' },
  { id: '26', baseWord: '책임을', correctSauce: '전가하다', wrongSauces: ['피하다', '미루다', '버리다'], description: '자신의 책임을 남에게 떠넘길 때는 고급스럽게 "전가하다"라고 쓴단다.', category: '비즈니스' },
  { id: '27', baseWord: '모범을', correctSauce: '보이다', wrongSauces: ['서다', '만들다', '행하다'], description: '본받아 배울 만한 대상을 남에게 행동으로 나타내는 거지.', category: '학업/비즈니스' },
  { id: '28', baseWord: '이의를', correctSauce: '제기하다', wrongSauces: ['말하다', '꺼내다', '던지다'], description: '다른 의견이나 반대하는 뜻을 내세울 때 "제기하다"가 어울려.', category: '비즈니스' },
  { id: '29', baseWord: '침묵을', correctSauce: '지키다', wrongSauces: ['다물다', '잠그다', '막다'], description: '아무 말도 없이 가만히 있는 상태를 유지할 때는 "지키다"를 쓴단다.', category: '감정/태도' },
  { id: '30', baseWord: '갈피를', correctSauce: '잡다', wrongSauces: ['찾다', '알다', '깨닫다'], description: '얽힌 일의 가닥을 찾아낼 때 "갈피를 잡다"라고 한단다.', category: '일반/사회' },
  { id: '31', baseWord: '허를', correctSauce: '찌르다', wrongSauces: ['파다', '치다', '뚫다'], description: '상대가 방심하고 있는 틈이나 약점을 노릴 때 쓰는 표현이야.', category: '비즈니스' },
  { id: '32', baseWord: '사활을', correctSauce: '걸다', wrongSauces: ['바치다', '쏟다', '다하다'], description: '죽고 사는 것을 걸 정도로 중대한 결심을 묘사하는 거다냥.', category: '비즈니스' },
  { id: '33', baseWord: '이윤을', correctSauce: '창출하다', wrongSauces: ['만들다', '얻다', '낳다'], description: '새로운 이익이나 가치를 만들어 내는 것을 "창출하다"라고 한단다.', category: '비즈니스' },
  { id: '34', baseWord: '여지를', correctSauce: '남기다', wrongSauces: ['두다', '열다', '주다'], description: '어떤 일이 일어날 가능성이나 돌려 생각할 틈을 남겨둘 때 쓴단다.', category: '일반/사회' },
  { id: '35', baseWord: '초석을', correctSauce: '다지다', wrongSauces: ['박다', '묻다', '세우다'], description: '어떤 일의 기초를 튼튼하게 할 때 "초석을 다지다"라고 한단다.', category: '일반/사회' },
  { id: '36', baseWord: '방점을', correctSauce: '찍다', wrongSauces: ['두다', '놓다', '그리다'], description: '어떤 사실을 특히 강조하거나 주목하게 할 때 "방점을 찍다"라고 해.', category: '비즈니스' },
  { id: '37', baseWord: '어깃장을', correctSauce: '놓다', wrongSauces: ['치다', '부리다', '피우다'], description: '일부러 남의 뜻을 어기거나 방해할 때 "어깃장을 놓다"라고 쓴단다.', category: '감정/태도' },
  { id: '38', baseWord: '빈축을', correctSauce: '사다', wrongSauces: ['받다', '얻다', '치다'], description: '남에게 눈총을 받거나 미움을 받을 짓을 했을 때 쓰는 말이야.', category: '일반/사회' },
  { id: '39', baseWord: '일침을', correctSauce: '가하다', wrongSauces: ['찌르다', '던지다', '때리다'], description: '따끔한 경고나 충고를 할 때 "일침을 가하다"라고 표현한다냥.', category: '일반/사회' },
  { id: '40', baseWord: '경종을', correctSauce: '울리다', wrongSauces: ['치다', '때리다', '알리다'], description: '사회에 강한 경고나 주의를 줄 때 "경종을 울리다"라고 쓴단다.', category: '일반/사회' },
  { id: '41', baseWord: '덜미를', correctSauce: '잡히다', wrongSauces: ['물리다', '뜯기다', '채이다'], description: '나쁜 짓을 하다가 발각되거나 꼼짝 못하게 되었을 때 쓰지.', category: '일반/사회' },
  { id: '42', baseWord: '눈도장을', correctSauce: '찍다', wrongSauces: ['누르다', '내다', '받다'], description: '윗사람에게 은근히 자신의 존재를 알릴 때 "눈도장을 찍다"라고 해.', category: '비즈니스' },
  { id: '43', baseWord: '마각을', correctSauce: '드러내다', wrongSauces: ['보이다', '펼치다', '알리다'], description: '숨기고 있던 음흉한 본성이나 사실을 나타낼 때는 "마각을 드러내다"야.', category: '일반/사회' },
  { id: '44', baseWord: '피치를', correctSauce: '올리다', wrongSauces: ['높이다', '당기다', '더하다'], description: '능률이나 속도를 한껏 높일 때 "피치를 올리다"라고 쓴단다.', category: '비즈니스' },
  { id: '45', baseWord: '수갑을', correctSauce: '채우다', wrongSauces: ['묶다', '걸다', '감다'], description: '범인의 손목에 수갑을 잠글 때는 "채우다"라는 동사가 딱 맞지.', category: '일반/사회' },
];

export async function getCollocations(): Promise<CollocationType[]> {
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
}