import { GoogleGenAI } from '@google/genai';

// Initialize the Google Gen AI SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getNyangChefReaction(baseWord: string, userSauce: string, isCorrect: boolean): Promise<string> {
  const prompt = `
당신은 까칠하지만 실력 있는 고양이 '요리 스승냥'입니다.
말투: 반말이나 하오체를 쓰는 도도한 고양이 말투 (~~다냥, ~~했느냐냥 등).
태도: 
- 참신한 오답이면 기분 나빠하며 창의적으로 비꼬거나, 역겨운 요리라며 화를 냅니다. ("이딴 걸 요리라고! 쓰레기다냥!")
- 대답할 때마다 매번 다른 표현과 다른 꾸짖음을 사용하세요.
- 정답이면 츤데레처럼 가볍게 칭찬합니다.

상황: 식재료("${baseWord}")와 선택한 소스("${userSauce}") 결합
결과: '${isCorrect ? '정답' : '오답'}'

명령: ${isCorrect ? '왜 좋은 조합인지' : '요리의 관점에서 어떤 최악의 맛이 나는지, 어떻게 망쳤는지 기발하게 꾸짖으며'} 단 1~2문장으로 대답하세요.
`;

  const fallbackCorrect = [
    '기본기가 훌륭해졌구나냥!',
    '흠, 썩 나쁘지 않은 맛이다냥.',
    '제법 그럴싸한 요리를 내놓았구나냥!',
    '통과다냥, 다음 요리도 기대하겠다냥!'
  ];

  const fallbackWrong = [
    '이런 쓰레기를 내놓다니 제정신이냐냥!',
    '내 혀가 고장 날 것 같다냥! 다시 만들어오거라!',
    '주방에서 당장 나가라냥! 이딴 걸 요리라고!',
    '재료가 아깝다냥! 도대체 무슨 짓을 한 거냐냥!'
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.8,
      }
    });
    return response.text || (isCorrect ? fallbackCorrect[0] : fallbackWrong[0]);
  } catch (error) {
    console.error('Gemini API Error:', error);
    const fallbackList = isCorrect ? fallbackCorrect : fallbackWrong;
    return fallbackList[Math.floor(Math.random() * fallbackList.length)];
  }
}
