import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const cauldronRegex = /<div className="w-64 h-64 kitsch-border-full bg-\\[#f0f0f0\\] text-black flex items-center justify-center relative overflow-hidden shadow-md z-20 mx-auto mt-4">[\\s\\S]*?<\/div>/;

const newCauldron = `<div className="w-[260px] h-[260px] rounded-full bg-[#1A1A1A] text-white flex flex-col items-center justify-center relative shadow-[inset_-8px_-8px_16px_rgba(0,0,0,0.5),0_12px_24px_rgba(0,0,0,0.3)] z-20 mx-auto mt-4 border-[12px] border-[#3D3D3D]">
  {/* Frying pan handle */}
  <div className="absolute top-1/2 -right-[120px] w-[100px] h-8 bg-[#1A1A1A] -translate-y-1/2 z-0 rounded-r-xl border-[4px] border-[#3D3D3D] shadow-lg"></div>
  <div className="flex flex-col items-center justify-center z-10 p-4 text-center">
    <span className="text-4xl mb-2">🍳</span>
    <h3 className="font-yangjin text-lg text-white drop-shadow-md">요리 냄비 (드래그)</h3>
    {kitchenIngredients.length > 0 && (
      <span className="text-sm bg-white/20 px-3 py-1 rounded-full mt-2 kitsch-border z-10">{kitchenIngredients.length}개 / 최대 2개</span>
    )}
  </div>
</div>`;
content = content.replace(cauldronRegex, newCauldron);

content = content.replace(
  /className="p-8 bg-white kitsch-border"/g,
  'className="p-8 bg-[#ECC9A8] kitsch-border border-[#C19A6B] shadow-inner"'
);

fs.writeFileSync('src/App.tsx', content);
