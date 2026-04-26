import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<div\\s*ref=\{captureRef\}\\s*className="w-full bg-white kitsch-border p-8 mb-8 relative"\\s*>/;

content = content.replace(regex, `<div
              ref={captureRef}
              className="w-full bg-[#fdfaf6] kitsch-border-full p-8 mb-8 relative border-4 border-[#3E2412]"
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-24 h-8 bg-gray-300 rounded-full shadow-inner border-2 border-gray-400 flex items-center justify-center">
                <div className="w-12 h-2 bg-gray-500 rounded-full"></div>
              </div>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 font-yangjin text-xl text-[#3E2412] bg-[#f0f0f0] px-4 py-1 kitsch-border-sm">
                냥식당 사원증
              </div>
              <div className="pt-8"></div>`);

content = content.replace(
  /className="w-24 h-24 bg-\\[#f0f0f0\\] kitsch-border rounded-full flex items-center justify-center text-5xl mb-4 shadow-md"/,
  'className="w-32 h-32 bg-white kitsch-border-full border-4 border-[#3E2412] rounded-2xl flex items-center justify-center text-6xl mb-4 shadow-xl overflow-hidden"'
);

fs.writeFileSync('src/App.tsx', content);
