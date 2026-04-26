import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. "냥식당 신선고 (냉장고)" -> "냥식당 신선고"
content = content.replace(/냥식당 신선고 \(냉장고\)/g, "냥식당 신선고");

// 2. Profile issue - download link might not work if it doesn't give a proper name.
// Wait, maybe we need to ensure the capture actually gives the name. And ensure that it's correctly rendered.
// "냥식당 사원증 다운로드"
content = content.replace(/download="nyang_chef_profile.png"/g, 'download="냥식당_사원증.png"');

// 3. Kitchen motion
const oldMotion = `                        <motion.div
                          initial={{ y: -50, scale: 1.2, opacity: 0 }}
                          animate={{
                            y: 0,
                            scale:
                              fusionState === "success" ? [1.2, 1, 1.3, 0] : 1,
                            opacity:
                              fusionState === "success" ? [1, 1, 1, 0] : 1,
                            rotate:
                              fusionState === "fail" ? [-10, 10, -10, 0] : -2,
                          }}
                          transition={{
                            duration: fusionState === "success" ? 1.2 : 0.4,
                          }}`;

const newMotion = `                        <motion.div
                          initial={{ y: -150, scale: 0.8, opacity: 0 }}
                          animate={{
                            y: fusionState === "success" 
                              ? [-150, 0, -30, 10, 40] 
                              : [-150, 0, -10, 20],
                            scale: fusionState === "success" 
                              ? [0.8, 1.2, 0.9, 1.5, 0] 
                              : [0.8, 1, 1.1, 0],
                            opacity: [0, 1, 1, 1, 0],
                            rotate: fusionState === "success" 
                              ? [0, 10, -10, 180, 360] 
                              : [0, -20, 20, 0],
                          }}
                          transition={{
                            duration: fusionState === "success" ? 1.0 : 0.6,
                            ease: "easeInOut"
                          }}`;

content = content.replace(oldMotion, newMotion);

fs.writeFileSync('src/App.tsx', content);
