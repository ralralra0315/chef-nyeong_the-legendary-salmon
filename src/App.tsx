import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  db,
  handleFirestoreError,
  OperationType,
} from "./firebase";
import { getDoc, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { CollocationType, getCollocations } from "./CollocationData";
import { playSound, speakTTS } from "./services/audioService";
import { getNyangChefReaction } from "./services/geminiService";
import {
  LogOut,
  Loader2,
  BookOpen,
  Home,
  Utensils,
  XCircle,
  User,
  Camera,
  Share2,
  ScrollText,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toPng } from "html-to-image";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const WaterDropCursor = () => {
  useEffect(() => {
    let lastTime = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastTime > 120) {
        lastTime = now;
        const drop = document.createElement("div");
        drop.textContent = "💧";
        drop.className = "fixed pointer-events-none z-[9999] transition-all duration-700 ease-out";
        drop.style.left = `${e.clientX}px`;
        drop.style.top = `${e.clientY}px`;
        drop.style.transform = "translate(-50%, -50%) scale(0.5)";
        drop.style.opacity = "0.8";

        document.body.appendChild(drop);
        void drop.offsetWidth;

        drop.style.transform = `translate(${(Math.random() - 0.5) * 40}px, -${Math.random() * 50 + 20}px) scale(1.2)`;
        drop.style.opacity = "0";

        setTimeout(() => {
          drop.remove();
        }, 700);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return null;
};

interface UserProfile {
  uid: string;
  nickname: string;
  level: number;
  salmons: number;
  collectedRecipes: string[];
  wrongRecipes: string[];
  purchasedItems: string[];
  furniturePositions?: Record<string, { x: number; y: number }>;
  profileIcon?: string;
}

const LEVEL_TITLES = [
  { threshold: 0, title: "설거지 요정", icon: "🧼" },
  { threshold: 100, title: "채소 썰기 달인", icon: "🔪" },
  { threshold: 250, title: "불판의 지배자", icon: "🔥" },
  { threshold: 500, title: "부주방장", icon: "👨‍🍳" },
  { threshold: 1000, title: "총괄 셰프", icon: "👑" },
];

const LOUNGE_SHOP_ITEMS = [
  { id: "pen", name: "맞춤법 만년필", price: 50, icon: "🖋️" },
  { id: "dict", name: "표준국어대사전", price: 100, icon: "📖" },
  { id: "lamp", name: "원고지 무드등", price: 150, icon: "🏮" },
  { id: "fairy", name: "맞춤법 요정", price: 300, icon: "🧚" },
  { id: "desk", name: "작가의 책장", price: 800, icon: "📚" },
  { id: "lavalamp", name: "라바 램프", price: 200, icon: "🌋" },
  { id: "pen_ladle", name: "만년필 국자", price: 120, icon: "🥄" },
  { id: "manuscript_board", name: "원고지 도마", price: 180, icon: "🪵" },
  { id: "typewriter_stove", name: "타자기 화덕", price: 400, icon: "🖨️" },
  { id: "book_pot", name: "백과사전 냄비", price: 350, icon: "🥘" },
  {
    id: "shakespeare_quill",
    name: "셰익스피어 깃털펜",
    price: 600,
    icon: "🪶",
  },
  { id: "hemingway_glass", name: "헤밍웨이 마티니 잔", price: 550, icon: "🍸" },
  { id: "yundongju_pot", name: "별 헤는 냄비", price: 700, icon: "✨" },
  { id: "kim_choyeop_lantern", name: "우리가 빛의 속도로 갈 수 있다면 랜턴", price: 800, icon: "🚀" },
  { id: "choi_eunyoung_basket", name: "쇼코의 미소 바구니", price: 650, icon: "🧺" },
  { id: "jo_yeeun_teddy", name: "스노볼 드라이브 눈송이 램프", price: 500, icon: "❄️" },
  { id: "gu_byeongmo_agami", name: "아가미의 반짝이는 물방울 장식", price: 750, icon: "🫧" },
  { id: "gu_byeongmo_bakery", name: "위저드 베이커리 마법 오븐", price: 900, icon: "🥨" },
  { id: "kim_choyeop_green", name: "지구 끝의 온실 식물", price: 550, icon: "🪴" },
  { id: "jo_yeeun_cocktail", name: "칵테일, 러브, 좀비 브로치", price: 450, icon: "🍹" },
  { id: "woolf_desk", name: "자기만의 방 열쇠", price: 120, icon: "🗝️" },
  { id: "kafka_bug", name: "아침의 갑충", price: 150, icon: "🪲" },
  { id: "hankang_plant", name: "햇빛을 쬐는 화분", price: 200, icon: "🪴" },
  { id: "hankang_snow", name: "채식주의자의 토마토", price: 250, icon: "🍅" },
];

function getLevelInfo(salmons: number) {
  let matched = LEVEL_TITLES[0];
  let nextLevel = LEVEL_TITLES[1];
  let levelIndex = 1;
  for (let i = 0; i < LEVEL_TITLES.length; i++) {
    if (salmons >= LEVEL_TITLES[i].threshold) {
      matched = LEVEL_TITLES[i];
      levelIndex = i + 1;
      nextLevel = LEVEL_TITLES[i + 1] || null;
    }
  }
  return {
    title: matched.title,
    icon: matched.icon,
    level: levelIndex,
    nextLevel,
  };
}

const getIngredientShape = (category: string) => {
  if (category.includes('감정')) return 'rounded-[3rem] border-rose-300 bg-rose-50'; 
  if (category.includes('비즈니스')) return 'rounded-none border-blue-400 bg-blue-50'; 
  if (category.includes('학업')) return 'rounded-[3rem_0_3rem_0] border-emerald-300 bg-emerald-50'; 
  if (category.includes('일반') || category.includes('사회')) return 'rounded-2xl border-amber-400 bg-amber-50'; 
  return 'rounded-xl border-[#E6D5B8] bg-[#FFFDF0]';
};

const getIngredientIcon = (category: string) => {
  if (category.includes('감정')) return '🍅';
  if (category.includes('비즈니스')) return '🥩';
  if (category.includes('학업')) return '🥬';
  if (category.includes('일반') || category.includes('사회')) return '🥐';
  return '🌿';
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [collocations, setCollocations] = useState<CollocationType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [draggedSauce, setDraggedSauce] = useState<string | null>(null);
  const [chefReaction, setChefReaction] = useState<string>(
    "어이 수습, 빨리 요리를 시작해라!",
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const [fusionState, setFusionState] = useState<"idle" | "processing" | "success" | "fail">("idle");
  const [catFaceStatus, setCatFaceStatus] = useState<"idle" | "waiting" | "success" | "fail">("idle");
  const [activeTab, setActiveTab] = useState<
    "kitchen" | "encyclopedia" | "lounge" | "wrong" | "profile" | "secretRecipe"
  >("kitchen");

  const captureRef = useRef<HTMLDivElement>(null);
  const [editNickname, setEditNickname] = useState("");

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [shareText, setShareText] = useState<string | null>(null);

  const [secretProblems, setSecretProblems] = useState<CollocationType[]>([]);
  const [secretAnswers, setSecretAnswers] = useState<string[]>(['', '', '', '', '']);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [secretWrongIndices, setSecretWrongIndices] = useState<number[]>([]);
  const [hasFailedSecretOnce, setHasFailedSecretOnce] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const AVAILABLE_ICONS = ["👩‍🍳", "👨‍🍳", "🧑‍🍳", "🐱", "🐶", "🐻", "🦊", "🐼", "🐸", "👽", "🤖", "👻", "🦄", "🍀", "🍎"];

  const handleChangeIcon = async (icon: string) => {
    if (!userProfile) return;
    try {
      await setDoc(
        doc(db, "users", userProfile.uid),
        {
          profileIcon: icon,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setUserProfile({ ...userProfile, profileIcon: icon });
      setShowIconPicker(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Helper for Chosung
  const getChosung = (str: string) => {
    const cho = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    let result = '';
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i) - 44032;
      if (code > -1 && code < 11172) {
        result += cho[Math.floor(code / 588)];
      } else {
        result += str.charAt(i);
      }
    }
    return result;
  };

  // Global button click sound
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      // Button click sound
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === 'button' ||
        target.closest('button') ||
        target.classList.contains('kitsch-button') ||
        target.classList.contains('kitsch-button-sm')
      ) {
        playSound('click');
      }
    };
    
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('touchstart', handleGlobalClick, { passive: true });
    
    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const data = await getCollocations();
        setCollocations(data);

        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            // Ensure array fields exist in state even if not in old DB
            if (!data.purchasedItems) data.purchasedItems = [];
            if (!data.furniturePositions) data.furniturePositions = {};
            if (!data.wrongRecipes) data.wrongRecipes = [];
            if (!data.collectedRecipes) data.collectedRecipes = [];
            if (data.salmons === undefined) data.salmons = 200;
            if (!data.profileIcon) data.profileIcon = "👩‍🍳";
            setUserProfile(data);
            setEditNickname(data.nickname);
          } else {
            const newUser: UserProfile & {
              email: string;
              createdAt: any;
              updatedAt: any;
            } = {
              uid: currentUser.uid,
              nickname: currentUser.displayName || "수습 셰프",
              level: 1,
              salmons: 200,
              collectedRecipes: [],
              wrongRecipes: [],
              purchasedItems: [],
              furniturePositions: {},
              profileIcon: "👩‍🍳",
              email: currentUser.email || "",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(userDocRef, newUser);
            setUserProfile(newUser as UserProfile);
            setEditNickname(newUser.nickname);
          }
        } catch (error) {
          try {
            handleFirestoreError(error, OperationType.GET, "users");
          } catch (e) {
            console.error("Failed to load user profile.", e);
          }
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error", error);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const initSecretRecipe = useCallback(() => {
    if (collocations.length === 0) return;
    const byCat = collocations.reduce((acc, curr) => {
      acc[curr.category] = acc[curr.category] || [];
      acc[curr.category].push(curr);
      return acc;
    }, {} as Record<string, CollocationType[]>);
    
    const validCats = Object.keys(byCat).filter(k => byCat[k].length >= 5);
    const selectedCat = validCats[Math.floor(Math.random() * validCats.length)] || Object.keys(byCat)[0];
    const pool = validCats.length > 0 ? byCat[selectedCat] : collocations;
    
    // shuffle array
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setSecretProblems(shuffled.slice(0, 5));
    setSecretAnswers(['', '', '', '', '']);
    setSecretWrongIndices([]);
    setHasFailedSecretOnce(false);
    setShowSecretModal(false);
  }, [collocations]);

  useEffect(() => {
    if (activeTab === 'secretRecipe' && secretProblems.length === 0) {
      initSecretRecipe();
      const msg = "비법 레시피를 복원해 보라냥! 5개 모두 맞혀야 한다냥!";
      setChefReaction(msg);
    }
  }, [activeTab, secretProblems.length, initSecretRecipe]);

  const handleSecretSubmit = async () => {
    const wrongIdxs = secretProblems
      .map((p, i) => p.correctSauce === secretAnswers[i].trim() ? -1 : i)
      .filter((i) => i !== -1);

    if (wrongIdxs.length === 0) {
      playSound("fusion");
      setSecretWrongIndices([]);
      const msg = "훌륭하다냥! 비법 레시피를 완벽하게 복원했다냥!";
      setChefReaction(msg);
      speakTTS(msg);
      
      if (userProfile) {
        const newSalmons = (userProfile.salmons || 0) + 50;
        const newLevel = getLevelInfo(newSalmons).level;
        const updatedRecipes = [...(userProfile.collectedRecipes || [])];
        
        secretProblems.forEach(p => {
          if (!updatedRecipes.includes(p.id)) {
            updatedRecipes.push(p.id);
          }
        });
        
        try {
          const updates = {
            salmons: newSalmons,
            level: newLevel,
            collectedRecipes: updatedRecipes,
            updatedAt: serverTimestamp(),
          };
          await setDoc(doc(db, "users", userProfile.uid), updates, { merge: true });
          setUserProfile({ ...userProfile, ...updates } as UserProfile);
        } catch (e) {
          console.error("Failed to update profile", e);
        }
      }
      setShowSecretModal(true);
    } else {
      playSound("wrong");
      setSecretWrongIndices(wrongIdxs);
      setHasFailedSecretOnce(true);
      const msg = `틀린 부분이 ${wrongIdxs.length}개 있다냥! 붉은 표시를 다시 확인해보라냥!`;
      setChefReaction(msg);
      speakTTS(msg);
    }
  };

  const handleDrop = async (sauce: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setDraggedSauce(sauce);
    
    const currentProblem = collocations[currentIndex];
    const isCorrect = sauce === currentProblem.correctSauce;

    playSound(isCorrect ? "fusion" : "wrong");
    setFusionState(isCorrect ? "success" : "fail");
    setCatFaceStatus(isCorrect ? "success" : "fail");

    const fallbackCorrect = [
      '기본기가 훌륭해졌구나!',
      '흠, 썩 나쁘지 않은 맛이구나.',
      '제법 그럴싸한 요리를 내놓았구나!',
      '통과다, 다음 요리도 기대하겠다!'
    ];
    const fallbackWrong = [
      '이런 쓰레기를 내놓다니 제정신이냐!',
      '내 혀가 고장 날 것 같구나! 다시 만들어오거라!',
      '당장 다시 해오거라! 이딴 걸 요리라고!',
      '재료가 아깝다! 도대체 무슨 짓을 한 거냐!'
    ];
    const reactionMsg = isCorrect 
      ? fallbackCorrect[Math.floor(Math.random() * fallbackCorrect.length)]
      : fallbackWrong[Math.floor(Math.random() * fallbackWrong.length)];

    setChefReaction(reactionMsg);
    speakTTS(reactionMsg);

    const checkTime = 3000;

    if (userProfile) {
      if (isCorrect) {
        let updatedRecipes = [...(userProfile.collectedRecipes || [])];
        if (!updatedRecipes.includes(currentProblem.id)) {
          updatedRecipes.push(currentProblem.id);
        }
        let updatedWrong = (userProfile.wrongRecipes || []).filter(
          (r) => r !== currentProblem.id,
        );
        const newSalmons = (userProfile.salmons || 0) + 10;
        const newLevel = getLevelInfo(newSalmons).level;

        try {
          const updates = {
            collectedRecipes: updatedRecipes,
            wrongRecipes: updatedWrong,
            salmons: newSalmons,
            level: newLevel,
            updatedAt: serverTimestamp(),
          };
          setDoc(doc(db, "users", userProfile.uid), updates, { merge: true })
            .catch(e => console.error("Failed to update profile", e));
          setUserProfile({ ...userProfile, ...updates } as UserProfile);
        } catch (e) {
          console.error("Failed to update profile", e);
        }
      } else {
        let updatedWrong = [...(userProfile.wrongRecipes || [])];
        if (!updatedWrong.includes(currentProblem.id)) {
          updatedWrong.push(currentProblem.id);
          try {
            setDoc(
              doc(db, "users", userProfile.uid),
              { wrongRecipes: updatedWrong, updatedAt: serverTimestamp() },
              { merge: true },
            ).catch(e => console.error("Failed to update wrong recipes", e));
            setUserProfile({
              ...userProfile,
              wrongRecipes: updatedWrong,
            } as UserProfile);
          } catch (e) {
            console.error("Failed to update wrong recipes", e);
          }
        }
      }
    }

    if (isCorrect) {
      setTimeout(() => {
        setIsProcessing(false);
        setFusionState("idle");
        setCatFaceStatus("idle");
        setDraggedSauce(null);
        setCurrentIndex((prev) =>
          collocations.length > 0 ? (prev + 1) % collocations.length : 0,
        );
        setChefReaction("다음 식재료를 가져오너라!");
      }, checkTime);
    } else {
      setTimeout(() => {
        setIsProcessing(false);
        setFusionState("idle");
        setCatFaceStatus("idle");
        setDraggedSauce(null);
      }, checkTime);
    }
  };

  const handleUpdateNickname = async () => {
    if (
      !userProfile ||
      !editNickname.trim() ||
      editNickname === userProfile.nickname
    )
      return;
    try {
      await setDoc(
        doc(db, "users", userProfile.uid),
        {
          nickname: editNickname,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setUserProfile({ ...userProfile, nickname: editNickname });
      alert("프로필이 변경되었습니다!");
    } catch (e) {
      console.error(e);
    }
  };

  const handlePurchase = async (item: (typeof LOUNGE_SHOP_ITEMS)[0]) => {
    if (!userProfile) return;
    if (userProfile.salmons < item.price) {
      alert("연어가 부족합니다!");
      return;
    }
    if (userProfile.purchasedItems.includes(item.id)) {
      alert("이미 구매한 아이템입니다.");
      return;
    }

    const newSalmons = userProfile.salmons - item.price;
    const newItems = [...userProfile.purchasedItems, item.id];

    try {
      await setDoc(
        doc(db, "users", userProfile.uid),
        {
          salmons: newSalmons,
          purchasedItems: newItems,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setUserProfile({
        ...userProfile,
        salmons: newSalmons,
        purchasedItems: newItems,
      });
      alert(`${item.name} 조각을 구매했습니다!`);
    } catch (e) {
      console.error("Purchase failed", e);
    }
  };

  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = async () => {
    if (captureRef.current) {
      setIsCapturing(true);
      try {
        const image = await toPng(captureRef.current, {
          backgroundColor: '#fdfaf6',
          pixelRatio: 2,
        });
        
        // Automatic download
        const link = document.createElement("a");
        link.href = image;
        link.download = "냥식당_사원증.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Optional: still set if you want the modal, but usually direct download is preferred
        // setCapturedImage(image); 
      } catch (err) {
        console.error("Capture failed", err);
        alert("캡처 중 오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const handleShare = () => {
    const text = `나는 스승냥 밑에서 수련해 현재 [${getLevelInfo(userProfile?.salmons || 0).title}] 직급이 되었다냥! 너도 냥식당에 입사해볼래?\n\n내 연어 코인: ${userProfile?.salmons}개\n수집한 레시피: ${userProfile?.collectedRecipes.length}개`;
    setShareText(text);
  };

  const executeCopy = async () => {
    if (!shareText) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
        alert(
          "클립보드에 복사되었습니다! 카카오톡이나 SNS에 붙여넣기 하여 자랑해보세요.",
        );
      } else {
        console.log("Clipboard API not available");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f0f0]">
        <Loader2 className="w-12 h-12 text-black animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <WaterDropCursor />
        <div className="min-h-[100dvh] overflow-y-auto flex flex-col items-center justify-center p-6 py-24 text-center space-y-8 bg-[#fdfaf6] font-sans relative select-none">
          {/* Floating background elements */}
          <motion.div 
            animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }} 
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="fixed top-20 left-10 text-6xl opacity-30 drop-shadow-sm pointer-events-none"
          >
            🐟
          </motion.div>
          <motion.div 
            animate={{ y: [10, -10, 10], rotate: [0, -10, 0] }} 
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
            className="fixed top-40 right-16 text-6xl opacity-30 drop-shadow-sm pointer-events-none"
          >
            🍳
          </motion.div>
          <motion.div 
            animate={{ y: [-15, 15, -15], rotate: [0, 15, 0] }} 
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 2 }}
            className="fixed bottom-32 left-20 text-6xl opacity-30 drop-shadow-sm pointer-events-none"
          >
            🧂
          </motion.div>
          <motion.div 
            animate={{ y: [15, -15, 15], rotate: [0, -5, 0] }} 
            transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 0.5 }}
            className="fixed bottom-40 right-10 text-6xl opacity-30 drop-shadow-sm pointer-events-none"
          >
            🔪
          </motion.div>

          <div
            className="fixed inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(#8B5A2B 2px, transparent 2px), linear-gradient(90deg, #8B5A2B 2px, transparent 2px)",
              backgroundSize: "40px 40px",
            }}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="z-10 bg-[#FFF8E7] p-8 md:p-12 border-8 border-[#5A3A22] rounded-[40px] shadow-[0_20px_40px_rgba(0,0,0,0.2)] relative max-w-2xl w-full mx-4 mt-8"
          >
            {/* Restaurant Sign Graphic */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#8B5A2B] border-4 border-[#3E2723] rounded-xl flex items-center justify-center flex-col shadow-lg">
              <div className="absolute -top-8 left-6 w-3 h-10 bg-[#3E2723] rounded-t-sm"></div>
              <div className="absolute -top-8 right-6 w-3 h-10 bg-[#3E2723] rounded-t-sm"></div>
              <span className="text-3xl drop-shadow-sm">🍣</span>
              <span className="font-yangjin text-[#FFF8E7] text-2xl tracking-widest mt-1 drop-shadow-md">냥식당</span>
            </div>

            <div className="mt-8 space-y-6">
              <h1 className="text-4xl md:text-5xl text-center font-yangjin text-[#3E2723] drop-shadow-sm leading-tight">
                냥식당: <br className="md:hidden" />
                <span className="text-[#E05236]">전설의 연어 레시피</span>
              </h1>
              
              <div className="bg-white/80 p-6 rounded-2xl border-4 border-[#8B5A2B]/20 text-left space-y-4 shadow-inner">
                <p className="font-sans text-lg text-[#5A3A22] leading-relaxed break-keep font-medium">
                  호반의 도시 <strong>춘천</strong>, 맑고 푸른 소양강이 흐르는 이곳에 까다로운 입맛을 가진 스승냥이 세운 <strong>냥식당</strong>이 있습니다냥.
                  명물 닭갈비와 막국수만큼이나 소문난 이곳의 비밀은, 완벽한 요리를 선보인 수습생에게만 귀한 <strong>'황금 연어'</strong>가 듬뿍 하사된다는 사실!
                </p>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-[#8B5A2B]/30 to-transparent my-4"></div>
                <p className="font-sans text-lg text-[#5A3A22] leading-relaxed break-keep font-medium text-center">
                  당신은 오늘 냥식당의 수습생으로 발탁되었습니다.
                  재료를 완벽하게 배합하고 연어를 모아, 전설의 <span className="text-[#E05236] font-bold">총괄 셰프</span> 자리에 오르세요냥!
                </p>
              </div>

              <button
                onClick={handleLogin}
                className="group relative inline-flex items-center justify-center bg-[#D44000] text-[#FFF8E7] px-8 py-5 border-4 border-[#8B2B00] font-yangjin text-2xl hover:bg-[#E65100] transition-all hover:scale-105 mt-6 shadow-xl w-full md:w-auto overflow-hidden animate-[float_3s_ease-in-out_infinite]"
                style={{ borderRadius: "100px 30px 100px 30px" }}
              >
                <span className="mr-3 text-4xl group-hover:rotate-12 transition-transform">🎽</span>
                앞치마 두르고 주방 들어가기
              </button>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  const currentProblem = collocations[currentIndex];
  if (!currentProblem && collocations.length > 0) {
    setCurrentIndex(0);
  }

  const { title: userLevelTitle, icon: userLevelIcon } = getLevelInfo(
    userProfile?.salmons || 0,
  );

  return (
    <>
      <WaterDropCursor />
      <div className="w-full min-h-screen bg-[#fdfaf6] text-black relative flex flex-col select-none">
      {/* Header Navigation */}
      <nav className="w-full p-4 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0 z-30 shrink-0 bg-white kitsch-border-sm mx-4 mt-4 max-w-[calc(100%-2rem)] self-center relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-[#f0f0f0]"></div>
        <div className="flex items-center space-x-4 mt-2">
          <div className="w-12 h-12 bg-[#f0f0f0] kitsch-border-sm flex items-center justify-center text-2xl font-bold shadow-sm -rotate-3">
            🍥
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-yangjin text-black drop-shadow-sm tracking-wide">
              냥식당
            </h1>
            <div className="text-sm font-black bg-[#f0f0f0] kitsch-border-sm px-2 py-0.5 inline-block -rotate-2">
              {userLevelIcon} {userLevelTitle}
            </div>
          </div>
        </div>
        <div className="flex space-x-3 md:space-x-4 mt-2 items-center">
          <div className="flex items-center space-x-2 bg-white px-3 py-2 kitsch-border-sm font-yangjin text-lg">
            <span>🐟</span>
            <span>x {userProfile?.salmons || 0}</span>
          </div>
          <button
            onClick={handleLogout}
            className="kitsch-button-sm w-12 h-12 bg-[#f0f0f0] text-black kitsch-border-sm flex items-center justify-center hover:bg-[#f0f0f0]"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative mt-2  mb-10">
        {activeTab === "kitchen" && (
          <main className="flex-1 flex flex-col items-center justify-start  overflow-x-hidden px-4 pb-48 w-full z-10 space-y-6 pt-4  relative">
            <div className="absolute top-0 w-full h-8 bg-gradient-to-b from-[var(--color-kitsch-pink)] to-transparent opacity-20" />
            {currentProblem ? (
              <>
                {/* Kitchen Workspace Container */}
                <div className="w-full max-w-[750px] mt-4 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-[#D2A679] border-8 border-[#8B5A2B] rounded-3xl shadow-[inset_0_0_40px_rgba(101,67,33,0.3),0_15px_30px_rgba(0,0,0,0.2)] flex flex-col md:flex-row items-center justify-around p-6 md:p-8 relative min-h-[350px]">
                  {/* Title / Info */}
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#3E2412] text-white px-8 py-2 rounded-full font-yangjin z-20 text-xl flex items-center gap-2 whitespace-nowrap shadow-[inset_0_-2px_10px_rgba(0,0,0,0.5),0_5px_10px_rgba(0,0,0,0.3)] border-2 border-[#5C3A21]">
                    냥식당 주방 (LEVEL{" "}
                    {getLevelInfo(userProfile?.salmons || 0).level})
                  </div>

                  {/* Base Word / Ingredients */}
                  <div className="flex flex-col items-center z-10 w-full md:w-1/3 mb-4 md:mb-0 mt-4 md:mt-0 shrink-0">
                    <div className={cn("w-40 h-48 md:w-44 md:h-52 flex flex-col items-center justify-center relative shadow-[2px_5px_10px_rgba(0,0,0,0.15)] overflow-hidden before:content-[''] before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] before:opacity-60 before:pointer-events-none shrink-0 aspect-[4/5] border", getIngredientShape(currentProblem.category))}>
                      {/* tape effect */}
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-white/40 backdrop-blur-sm shadow-sm rotate-2 z-10"></div>

                      <div className="mt-4 bg-[#8B5A2B] text-white font-yangjin px-3 py-1 rounded-sm text-xs shrink-0 shadow-inner z-10">
                        {currentProblem.category} 재료
                      </div>
                      <div className="text-5xl md:text-6xl my-2 drop-shadow-md z-10">{getIngredientIcon(currentProblem.category)}</div>
                      <div className="font-yangjin text-xl md:text-2xl text-center px-2 py-1 text-[#5A3A1B] w-10/12 break-keep shrink-0 bg-white/50 backdrop-blur-sm rounded z-10">
                        {currentProblem.baseWord}
                      </div>
                    </div>
                  </div>

                  <div className="text-4xl md:text-5xl font-yangjin text-black animate-bounce z-10 mx-2 drop-shadow-[0_2px_2px_rgba(255,255,255,0.5)]">
                    +
                  </div>

                  {/* Drop Zone (Cauldron) */}
                  <div className="flex flex-col items-center z-10 relative shrink-0 w-full md:w-1/3 h-48 mt-4 md:mt-0 justify-center">
                    <AnimatePresence>
                      {fusionState !== "idle" && draggedSauce ? (
                        <motion.div
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
                          }}
                          className={cn(
                            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full flex flex-col items-center justify-center z-50 shadow-2xl",
                            fusionState === "success"
                              ? "bg-gradient-to-br from-yellow-100 to-yellow-300 border-4 border-yellow-400"
                              : "bg-gradient-to-br from-red-500 to-red-700 text-white border-4 border-red-800",
                          )}
                        >
                          <div className="text-5xl mb-2 drop-shadow-lg">
                            {fusionState === "success" ? "✨" : "💥"}
                          </div>
                          <div className="font-yangjin text-lg text-center px-4 bg-white/90 text-black rounded-full py-1 shadow-inner">
                            {draggedSauce}
                          </div>
                        </motion.div>
                      ) : (
                        <div className="relative w-56 h-56 mt-6 shrink-0 aspect-[1/1]">
                           <div className="absolute inset-0 bg-gradient-to-br from-[#2C2C2C] to-[#121212] rounded-full shadow-[inset_0_0_40px_rgba(0,0,0,0.8),15px_15px_30px_rgba(0,0,0,0.5)] border-[8px] border-[#3D3D3D] flex items-center justify-center z-20 overflow-hidden ring-8 ring-[#2A2A2A]">
                             <div className="w-[180%] h-[180%] absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-[spin_60s_linear_infinite] pointer-events-none"></div>
                             <div className="flex flex-col items-center text-center">
                               <span className="text-4xl opacity-80 mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                                 🍳
                               </span>
                               <span className="font-yangjin text-white text-sm drop-shadow-md">
                                 소스 넣기
                               </span>
                             </div>
                           </div>
                           <div className="absolute top-1/2 -right-20 w-28 h-8 bg-gradient-to-r from-[#222] to-[#111] -translate-y-1/2 z-10 rounded-r-xl border-[4px] border-[#3D3D3D] shadow-[5px_10px_15px_rgba(0,0,0,0.5)]">
                             <div className="w-3 h-3 rounded-full bg-black absolute right-3 top-1/2 -translate-y-1/2 shadow-inner"></div>
                           </div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Sauce Options List (Potions) */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 justify-items-center md:flex md:flex-row md:justify-center md:gap-6 md:flex-wrap w-full max-w-[280px] md:max-w-3xl mt-4 md:mt-6 px-4 mx-auto">
                  {[currentProblem.correctSauce, ...currentProblem.wrongSauces]
                    .sort((a, b) => a.localeCompare(b))
                    .map((sauce) => (
                      <motion.div
                        key={sauce}
                        drag={!isProcessing}
                        dragSnapToOrigin={true}
                        onDragStart={() => playSound("cook")}
                        onDragEnd={(_, info) => {
                          if (info.offset.y < -80) handleDrop(sauce);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileDrag={{ scale: 1.1, zIndex: 50 }}
                        className={cn(
                          "flex flex-col items-center justify-end pb-0 cursor-grab active:cursor-grabbing w-20 md:w-24 relative overflow-visible shrink-0 aspect-[1/1.5]",
                          isProcessing && "opacity-50 pointer-events-none",
                        )}
                      >
                        <div className="w-6 h-6 absolute -top-4 bg-gradient-to-b from-red-500 to-red-400 rounded-t border-b-2 border-red-600 shadow-sm z-0 left-1/2 -translate-x-1/2"></div>
                        <div className="w-16 h-24 md:w-20 md:h-28 bg-gradient-to-b from-white/80 to-gray-100 backdrop-blur-sm rounded-b-xl rounded-t-2xl shadow-[0_8px_16px_rgba(0,0,0,0.15),inset_2px_0_5px_rgba(255,255,255,0.8),inset_-2px_0_5px_rgba(0,0,0,0.1)] flex flex-col items-center justify-end relative z-10 transition-transform border border-gray-300 overflow-hidden shrink-0">
                          <div className="w-full h-full absolute inset-0 bg-gradient-to-b from-red-500/10 to-transparent pointer-events-none"></div>
                          <div className="w-14 md:w-16 h-10 md:h-12 mb-3 bg-white flex flex-col items-center justify-center text-[11px] md:text-[13px] border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.1)] rounded text-gray-800 z-20">
                            <span className="font-yangjin leading-tight break-keep px-1 text-center font-bold relative z-10">
                              {sauce}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-black animate-spin" />
              </div>
            )}
          </main>
        )}

        {activeTab === "secretRecipe" && (
          <main className="flex-1 p-4 md:p-6 w-full max-w-5xl mx-auto z-10 pb-32 min-h-0 bg-transparent flex flex-col items-center overflow-y-auto">
            <h2 className="text-4xl font-yangjin mb-8 text-center bg-[#f0f0f0] inline-block px-6 py-2 kitsch-border self-center shrink-0 shadow-sm">
              비법 레시피
            </h2>
            <div className="w-full max-w-[550px] bg-[#FFFDE7] bg-[url('https://www.transparenttextures.com/patterns/lined-paper.png')] border-4 border-[#E0E0E0] rounded-r-2xl rounded-l-md p-6 md:p-10 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] relative mt-4">
              {/* Notebook spiral rings */}
              <div className="absolute left-[-18px] md:left-[-22px] top-8 bottom-8 flex flex-col justify-between z-20">
                {Array.from({length: 6}).map((_, i) => (
                  <div key={i} className="flex items-center -rotate-6">
                     <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white border-4 border-[#E0E0E0] shadow-inner z-10"></div>
                     <div className="w-8 h-3 md:w-10 md:h-4 bg-gray-500 rounded-full -ml-3 md:-ml-4 shadow-sm z-0"></div>
                  </div>
                ))}
              </div>
              
              <div className="font-yangjin text-2xl text-center mb-10 text-indigo-900 border-b-2 border-indigo-300 pb-4 flex justify-center items-center gap-2">
                <span className="text-3xl">📝</span> [{secretProblems[0]?.category || '비밀'}] 특급 레시피
              </div>
              
              <div className="flex flex-col gap-6 font-yangjin text-xl md:text-2xl text-gray-800 leading-none break-keep pl-6 md:pl-8">
                {secretProblems.map((p, idx) => {
                  const isWrong = secretWrongIndices.includes(idx);
                  return (
                  <div key={p.id} className="flex flex-col gap-1 pb-3 border-b border-gray-200 border-dashed">
                    <div className="flex justify-between items-center gap-1 md:gap-2 flex-wrap">
                      <span className="shrink-0">{idx + 1}. {p.baseWord}</span>
                      <motion.input 
                        type="text"
                        animate={(!secretAnswers[idx] && !isWrong) ? { y: [0, -3, 0], rotate: [0, -1, 1, 0] } : (isWrong ? { x: [-5, 5, -5, 5, 0] } : {})}
                        transition={isWrong ? { duration: 0.4 } : { repeat: Infinity, duration: 2, ease: "easeInOut", delay: idx * 0.15 }}
                        className={cn(
                          "border-b-4 bg-white/80 text-center focus:outline-none focus:bg-white focus:border-indigo-500 w-28 md:w-32 mx-1 px-1 py-1 rounded shadow-sm transition-colors text-indigo-700",
                          isWrong ? "border-red-600 bg-red-50 text-red-700 font-bold placeholder-red-300" : (!secretAnswers[idx] ? "border-rose-400" : "border-indigo-400")
                        )}
                        value={secretAnswers[idx]}
                        onChange={(e) => {
                          const newAnswers = [...secretAnswers];
                          newAnswers[idx] = e.target.value;
                          setSecretAnswers(newAnswers);
                          if (isWrong) {
                            setSecretWrongIndices(prev => prev.filter(i => i !== idx));
                          }
                        }}
                        placeholder={isWrong && hasFailedSecretOnce ? `초성: ${getChosung(p.correctSauce)}` : "(입력)"}
                      />
                    </div>
                    {isWrong && hasFailedSecretOnce && (
                       <span className="text-sm text-red-500 font-body self-end pr-2 pt-1">정답 힌트: {getChosung(p.correctSauce)}</span>
                    )}
                  </div>
                )})}
              </div>
              
              <div className="mt-14 flex justify-center ml-4 md:ml-8">
                <button 
                  onClick={handleSecretSubmit}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-yangjin py-3 px-10 rounded-full shadow-[0_5px_0_theme(colors.indigo.900)] text-xl md:text-2xl transition-transform active:translate-y-1 active:shadow-[0_0px_0_theme(colors.indigo.900)] cursor-pointer"
                >
                  복원하기
                </button>
              </div>
            </div>
          </main>
        )}

        {activeTab === "encyclopedia" && (
          <main className="flex-1 p-6  w-full max-w-5xl mx-auto z-10 pb-32 min-h-0 bg-transparent flex flex-col">
            <h2 className="text-4xl font-yangjin mb-8 text-center drop-shadow-sm shrink-0">
              냥식당 신선고
            </h2>

            <div className="w-full bg-[#E8ECEF] rounded-[32px] border-[12px] border-[#D1D5DB] p-6 md:p-12 flex flex-col gap-6 relative overflow-hidden shadow-[inset_0_20px_50px_rgba(0,0,0,0.05),0_20px_40px_rgba(0,0,0,0.15)]">
              {/* Fridge Handle */}
              <div className="absolute top-20 right-4 w-10 h-72 bg-gradient-to-r from-[#E5E7EB] to-[#D1D5DB] rounded-full z-20 shadow-[inset_-2px_0_5px_rgba(0,0,0,0.1),2px_0_10px_rgba(0,0,0,0.1)] border border-[#9CA3AF]"></div>
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-4 bg-[#BDBDBD] rounded-full z-20 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)]"></div>

              {/* Inner Fridge Base */}
              <div className="bg-[#FFFFFF] rounded-2xl p-6 pb-12 w-full h-full relative shadow-[inset_0_10px_30px_rgba(0,0,0,0.08)] border-4 border-[#E2E8F0]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-14 gap-x-6 relative z-10 pt-4">
                  {collocations.map((col) => {
                    const isCollected = (
                      userProfile?.collectedRecipes || []
                    ).includes(col.id);
                    return (
                      <div
                        key={col.id}
                        className="relative flex flex-col items-center"
                      >
                        {/* Shelf styling underneath */}
                        <div className="absolute -bottom-4 w-[115%] h-8 bg-gradient-to-b from-[#F0F2F5] to-[#E2E8F0] border-b-[4px] border-[#CBD5E1] rounded-[4px] -z-10 shadow-[0_15px_15px_rgba(0,0,0,0.1)] backdrop-blur-sm bg-opacity-70"></div>

                        <div
                          className={cn(
                            "w-full p-5 rounded-xl border border-gray-200 relative shadow-[0_10px_20px_rgba(0,0,0,0.05),inset_0_0_20px_rgba(255,255,255,0.5)] ",
                            isCollected
                              ? "bg-gradient-to-br from-white to-gray-50"
                              : "bg-blue-100/50 opacity-90 backdrop-blur-md grayscale drop-shadow-[0_4px_16px_rgba(0,150,255,0.1)]",
                          )}
                        >
                          <div className="absolute -top-4 -right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shadow-[0_4px_10px_rgba(0,0,0,0.1)] border border-gray-100">
                            {isCollected ? "🍲" : "🧊"}
                          </div>
                          <span className="bg-gray-100 text-gray-700 px-3 py-1 text-xs font-yangjin mb-3 inline-block rounded-full shadow-sm border border-gray-200">
                            {col.category}
                          </span>
                          <h3 className="text-xl font-yangjin mb-2 mt-1 drop-shadow-sm text-gray-800">
                            {col.baseWord} {col.correctSauce}
                          </h3>
                          {isCollected ? (
                            <p className="text-sm leading-relaxed bg-white p-3 rounded-lg border border-gray-200 font-bold shadow-inner">
                              {col.description}
                            </p>
                          ) : (
                            <p className="text-sm text-blue-900/60 font-bold">
                              꽁꽁 얼어있는 재료!
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </main>
        )}

        {activeTab === "wrong" && (
          <main className="flex-1 p-6  w-full max-w-5xl mx-auto z-10 pb-32 min-h-0 bg-transparent flex flex-col">
            <h2
              className="text-4xl font-yangjin mb-8 text-center text-[#8B5A2B] drop-shadow-sm shrink-0"
            >
              먼지 쌓인 서랍 보관함
            </h2>
            {!(userProfile?.wrongRecipes?.length > 0) ? (
              <div className="text-center mt-20 text-2xl font-yangjin bg-[#E6C280] kitsch-border border-[#8B5A2B] shadow-inner p-10 text-[#8B5A2B]">
                🐾 서랍이 텅 비었어요! 밀린 오답이 하나도 없네요! 🐾
              </div>
            ) : (
              <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto p-6 md:p-10 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-[#C19A6B] rounded-2xl border-[16px] border-[#5E3A1A] shadow-[inset_0_20px_50px_rgba(0,0,0,0.4),0_20px_40px_rgba(0,0,0,0.2)] relative">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#3E2412] rounded-full shadow-[inset_0_-2px_5px_rgba(0,0,0,0.5)] flex justify-center">
                  <div className="w-16 h-3 bg-gradient-to-b from-[#b87333] to-[#8a5322] rounded-full mt-1 shadow-sm"></div>
                </div>
                <div className="mt-6 flex flex-col gap-6">
                {(userProfile?.wrongRecipes || []).map((id) => {
                  const col = collocations.find(
                    (c) => String(c.id) === String(id),
                  );
                  if (!col) return null;
                  return (
                    <div
                      key={col.id}
                      className="p-6 bg-[#FFFDF0] rounded-sm p-6 relative hover:-translate-y-2 transition-transform shadow-[2px_4px_10px_rgba(0,0,0,0.2),inset_0_0_20px_rgba(212,163,115,0.1)] border border-[#E6D5B8] before:content-[''] before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] before:opacity-50 before:pointer-events-none"
                    >
                      <h3 className="text-2xl font-yangjin mb-3 text-[#5A3A1B]">
                        {col.baseWord}{" "}
                        <span className="text-[#8B5A2B] decoration-wavy underline">
                          ???
                        </span>
                      </h3>
                      <div className="bg-white/80 p-3 kitsch-border-sm border-[#D4A373] mb-4">
                        <p className="font-bold text-sm text-[#8B5A2B]">
                          정답: {col.baseWord} {col.correctSauce}
                        </p>
                        <p className="text-base mt-2 text-[#5A3A1B]">{col.description}</p>
                      </div>
                      <button
                        onClick={() => {
                          const idx = collocations.findIndex(
                            (c) => c.id === id,
                          );
                          if (idx !== -1) {
                            setCurrentIndex(idx);
                            setActiveTab("kitchen");
                          }
                        }}
                        className="kitsch-button bg-[#f0f0f0] text-black px-6 py-2 kitsch-border-sm font-yangjin text-lg w-full"
                      >
                        다시 도전하기
                      </button>
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </main>
        )}

        {activeTab === "lounge" && (
          <main className="flex-1 p-6  w-full max-w-5xl mx-auto z-10 pb-32 min-h-0 bg-transparent flex flex-col">
            <h2 className="text-4xl font-yangjin mb-8 text-center bg-[#f0f0f0] inline-block px-6 py-2 kitsch-border  self-center shrink-0">
              나만의 만찬 식탁
            </h2>

            {/* My Lounge View */}
            <div className="w-full bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-[#5A3A22] border-8 border-[#3E2723] rounded-3xl md:rounded-[40px] mb-12 min-h-[450px] relative overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.6),0_15px_30px_rgba(0,0,0,0.3)]">
              {/* Wood Planks Lines (Subtle) */}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_33%,rgba(0,0,0,0.3)_33.2%,transparent_33.5%,transparent_66%,rgba(0,0,0,0.3)_66.2%,transparent_66.5%)] pointer-events-none opacity-40"></div>
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 flex items-center justify-center">
                 <span className="font-yangjin text-[#D7CCC8] opacity-80 text-xl md:text-3xl drop-shadow-sm px-4 text-center break-keep">음식을 상에 차려주세요냥</span>
              </div>
              {(userProfile?.purchasedItems?.length || 0) > 0 ? (
                <div className="absolute inset-0 w-full h-full">
                  {(userProfile?.purchasedItems || []).map((itemId) => {
                    const item = LOUNGE_SHOP_ITEMS.find((i) => i.id === itemId);
                    if (!item) return null;
                    const pos = userProfile?.furniturePositions?.[itemId] || {
                      x: 50,
                      y: 50,
                    };
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
                                x:
                                  (userProfile.furniturePositions?.[itemId]
                                    ?.x || 50) + info.offset.x,
                                y:
                                  (userProfile.furniturePositions?.[itemId]
                                    ?.y || 50) + info.offset.y,
                              },
                            };
                            await setDoc(
                              doc(db, "users", userProfile.uid),
                              {
                                furniturePositions: newPositions,
                                updatedAt: serverTimestamp(),
                              },
                              { merge: true },
                            );
                            setUserProfile({
                              ...userProfile,
                              furniturePositions: newPositions,
                            });
                          } catch (err) {
                            console.log(err);
                          }
                        }}
                        initial={pos}
                        animate={pos}
                        className="absolute cursor-grab active:cursor-grabbing hover:scale-110 transition-transform flex items-center justify-center z-10"
                        title={item.name}
                      >
                         <div className="relative w-24 h-24 rounded-full bg-slate-50 shadow-[0_5px_15px_rgba(0,0,0,0.15),inset_0_-2px_6px_rgba(0,0,0,0.05)] border border-gray-200 flex items-center justify-center">
                           {/* outer rim reflection */}
                           <div className="absolute inset-1 rounded-full border border-white/60"></div>
                           {/* inner bowl */}
                           <div className="absolute inset-[8px] rounded-full shadow-[inset_0_3px_8px_rgba(0,0,0,0.08)] bg-white flex items-center justify-center border border-gray-100/50">
                             <span className="text-[42px] z-10 drop-shadow-md pb-1">{item.icon}</span>
                           </div>
                         </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-20 text-center font-bold text-gray-500 relative z-10">
                  아직 아무것도 없다... 상점에서 아이템을 사볼까?
                </p>
              )}
            </div>

            {/* Shop */}
            <h3 className="text-2xl font-yangjin mb-4 text-black">가구 상점</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {LOUNGE_SHOP_ITEMS.map((item) => {
                const isBought = userProfile?.purchasedItems?.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "p-4 kitsch-border flex flex-col items-center text-center transition-opacity",
                      isBought ? "bg-gray-100 opacity-60" : "bg-white",
                    )}
                  >
                    <div className="relative w-20 h-20 mb-4 rounded-full bg-slate-50 shadow-[0_4px_10px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(0,0,0,0.05)] border border-gray-200 flex items-center justify-center shrink-0">
                       {/* outer rim reflection */}
                       <div className="absolute inset-1 rounded-full border border-white/60"></div>
                       {/* inner bowl */}
                       <div className="absolute inset-[6px] rounded-full shadow-[inset_0_2px_6px_rgba(0,0,0,0.08)] bg-white flex items-center justify-center border border-gray-100/50">
                         <span className="text-4xl z-10 drop-shadow-sm pb-1">{item.icon}</span>
                       </div>
                    </div>
                    <h4 className="font-yangjin text-lg break-keep">{item.name}</h4>
                    {isBought ? (
                      <div className="mt-4 bg-gray-400 text-black px-4 py-1 font-bold kitsch-border-sm">
                        보유중
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePurchase(item)}
                        className="kitsch-button-sm mt-4 bg-[#f0f0f0] px-4 py-1 font-yangjin kitsch-border-sm hover:bg-[#f0f0f0]"
                      >
                        🐟 {item.price}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </main>
        )}

        {activeTab === "profile" && (
          <main className="flex-1 p-6  w-full max-w-4xl mx-auto z-10 pb-32 flex flex-col items-center min-h-0 bg-transparent">
            {/* Capture Target */}
            <div
              ref={captureRef}
              className="w-full bg-[#fdfaf6] kitsch-border p-8 pb-10 mb-8 relative border-4 border-[#3E2412]"
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-24 h-8 bg-gray-300 rounded-full shadow-inner border-2 border-gray-400 flex items-center justify-center">
                <div className="w-12 h-2 bg-gray-500 rounded-full"></div>
              </div>
              <div className="flex justify-center w-full mb-6">
                 <div className="font-yangjin text-lg text-[#3E2412] bg-white px-4 py-1.5 kitsch-border border-b-4 mt-2">
                   🐾 냥식당 사원증
                 </div>
              </div>

              <div className="flex flex-col items-center w-full mt-4">
                <div className="relative mb-6">
                  <div className="w-32 h-32 bg-white kitsch-border border-4 border-[#3E2412] rounded-[1.5rem] flex items-center justify-center text-6xl shadow-md overflow-hidden relative">
                    {userProfile?.profileIcon || "👩‍🍳"}
                  </div>
                  <button 
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="absolute -bottom-2 -right-2 bg-white kitsch-border-sm p-1.5 rounded-full shadow-lg hover:bg-gray-100 z-10"
                    title="프로필 아이콘 변경"
                  >
                    <User size={20} className="text-[#3E2412]" />
                  </button>
                  
                  {showIconPicker && (
                    <div className="absolute top-[110%] left-1/2 -translate-x-1/2 bg-white kitsch-border p-3 z-50 w-64 shadow-xl flex flex-wrap gap-2 justify-center rounded-sm">
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-black rotate-45"></div>
                      {AVAILABLE_ICONS.map((icon, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleChangeIcon(icon)}
                          className="text-3xl hover:bg-gray-100 p-1 rounded transition-colors"
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <h2 className="text-3xl font-yangjin mb-2">
                  {userProfile?.nickname}
                </h2>
                <div className="bg-[#f0f0f0] px-4 py-1 kitsch-border-sm font-yangjin text-xl font-bold mb-6 flex items-center gap-2">
                  {userLevelIcon} {userLevelTitle}
                </div>

                <div className="w-full max-w-md bg-[#f0f0f0] kitsch-border p-4 mb-4">
                  <div className="flex justify-between font-bold mb-2">
                    <span>보유 연어</span>
                    <span>
                      🐟 {userProfile?.salmons} /{" "}
                      {getLevelInfo(userProfile?.salmons || 0).nextLevel
                        ?.threshold || "MAX"}
                    </span>
                  </div>
                  <div className="w-full h-6 border-2 border-black/30 bg-white rounded-none p-0.5">
                    <div
                      className="h-full bg-[#f0f0f0] transition-all"
                      style={{
                        width: `${Math.min(100, ((userProfile?.salmons || 0) / (getLevelInfo(userProfile?.salmons || 0).nextLevel?.threshold || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-center mt-2 font-bold text-gray-500">
                    {getLevelInfo(userProfile?.salmons || 0).nextLevel
                      ? `다음 직급까지 ${getLevelInfo(userProfile?.salmons || 0).nextLevel!.threshold - (userProfile?.salmons || 0)}연어 남음!`
                      : "최고의 셰프 등극!"}
                  </p>
                </div>

                <div className="flex gap-4 font-yangjin text-gray-700">
                  <p>수집한 레시피: {userProfile?.collectedRecipes.length}개</p>
                  <p>|</p>
                  <p>밀린 오답: {userProfile?.wrongRecipes.length}개</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 w-full">
              <button
                onClick={handleCapture}
                disabled={isCapturing}
                className={cn(
                  "flex-1 kitsch-button bg-[#f0f0f0] py-3 kitsch-border font-yangjin text-xl flex items-center justify-center gap-2",
                  isCapturing && "opacity-50 cursor-not-allowed"
                )}
              >
                {isCapturing ? <Loader2 className="animate-spin" size={24} /> : <Camera size={24} />} 
                {isCapturing ? "저장 중..." : "프로필 저장"}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 kitsch-button bg-[#f0f0f0] py-3 kitsch-border font-yangjin text-xl flex items-center justify-center gap-2"
              >
                <Share2 size={24} /> 자랑하기
              </button>
            </div>

            {/* Profile Edit */}
            <div className="w-full mt-12 bg-white kitsch-border p-6 flex flex-col items-start gap-4 ">
              <h3 className="font-yangjin text-xl">이름표 바꾸기</h3>
              <div className="flex w-full gap-2 font-bold">
                <input
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="flex-1 border-2 border-black/30 p-2 focus:bg-[#f0f0f0] outline-none"
                />
                <button
                  onClick={handleUpdateNickname}
                  className="bg-[#3f3f46] text-black px-6 kitsch-border hover:bg-[#f0f0f0] kitsch-button-sm"
                >
                  변경
                </button>
              </div>
            </div>
          </main>
        )}

        {/* Capture Modal */}
        {capturedImage && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col items-center justify-center p-4 transform-none">
            <div className="kitsch-border bg-white/70 p-6 kitsch-border flex flex-col items-center w-full max-w-sm">
              <div className="w-full bg-[#f0f0f0] text-black  border-black/30 font-yangjin px-4 py-2 mb-4 flex justify-center text-xl shadow-md">
                📸 이미지 발급 📸
              </div>
              <p className="font-bold text-sm mb-4 text-center bg-white px-4 py-2 kitsch-border-sm w-full">
                이미지를 길게 누르거나 다운로드 하세요!
              </p>
              <div className="relative mb-6 kitsch-border  overflow-hidden max-h-[50vh] flex items-center justify-center bg-white w-full">
                <img
                  src={capturedImage}
                  alt="Captured Profile"
                  className="object-contain max-h-[50vh] w-full"
                />
              </div>
              <div className="flex gap-4 w-full justify-center">
                <a
                  href={capturedImage}
                  download="냥식당_사원증.png"
                  className="flex-1 kitsch-button text-center bg-[#f0f0f0] text-black px-2 py-3 kitsch-border font-yangjin text-sm md:text-base whitespace-nowrap"
                >
                  다운로드
                </a>
                <button
                  onClick={() => setCapturedImage(null)}
                  className="flex-1 kitsch-button bg-[#f0f0f0] text-black px-2 py-3 kitsch-border font-yangjin text-sm md:text-base"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {shareText && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col items-center justify-center p-4 transform-none">
            <div className="kitsch-border bg-white/70 p-6 kitsch-border flex flex-col items-center w-full max-w-sm md:max-w-[400px]">
              <div className="w-full bg-[#f0f0f0] text-black  border-black/30 font-yangjin px-4 py-2 mb-4 flex justify-center text-xl shadow-md">
                ✨ 냥식당 자랑하기 ✨
              </div>
              <textarea
                readOnly
                value={shareText}
                className="w-full h-32 p-3 font-yangjin kitsch-border  mb-4 bg-white focus:outline-none resize-none"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <div className="flex gap-4 w-full">
                <button
                  onClick={executeCopy}
                  className="flex-1 kitsch-button bg-[#f0f0f0] text-black px-4 py-3 kitsch-border font-yangjin text-lg"
                >
                  텍스트 복사
                </button>
                <button
                  onClick={() => setShareText(null)}
                  className="flex-1 kitsch-button bg-[#f0f0f0] text-black px-4 py-3 kitsch-border font-yangjin text-lg"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Secret Recipe Success Modal */}
        <AnimatePresence>
          {showSecretModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#fbf4e6] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] kitsch-border p-6 max-w-[500px] w-full rounded-sm flex flex-col relative max-h-[85vh] overflow-y-auto shadow-2xl"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-white/60 shadow-sm rotate-2 kitsch-border-sm z-10"></div>
                <button 
                  onClick={() => { setShowSecretModal(false); initSecretRecipe(); }} 
                  className="absolute top-4 right-4 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-colors z-[60] flex items-center justify-center border-2 border-gray-200"
                >
                  <XCircle size={28} />
                </button>
                
                <h2 className="text-3xl font-yangjin text-center mb-2 mt-4 text-[#5C3A21]">✨ 비법 복원 성공! ✨</h2>
                <div className="text-center font-bold text-lg text-rose-500 mb-6 bg-white kitsch-border-sm py-1 mx-auto px-4 inline-block shadow-sm">
                  보상 연어 +50개 징수 완료!
                </div>
                
                <div className="flex flex-col gap-4 mb-4">
                  {secretProblems.map(p => (
                    <div key={p.id} className="bg-white/70 p-4 border-2 border-dashed border-[#D2A679] flex flex-col gap-1 items-start">
                      <div className="font-yangjin text-2xl text-[#3E2412]">
                        {p.baseWord} <span className="text-red-600 underline decoration-wavy underline-offset-4">{p.correctSauce}</span>
                      </div>
                      <p className="font-body text-gray-700 leading-relaxed text-[15px] break-keep">{p.description}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Chatbot (Small, corner placed) */}
        <AnimatePresence>
          {(activeTab === "kitchen" || activeTab === "secretRecipe") && (
            <motion.section
              initial={{ x: 150, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 150, opacity: 0 }}
              className="fixed bottom-28 right-4 md:right-8 flex flex-col items-end pointer-events-none z-40 max-w-[280px] md:max-w-[320px]"
            >
              <div className="bg-white kitsch-border p-3 md:p-4 relative pointer-events-auto shadow-xl mb-3 text-sm md:text-base font-bold ">
                <div className="absolute right-6 -bottom-3 w-0 h-0  border-l-transparent  border-t-black  border-r-transparent hidden md:block"></div>
                <div className="absolute right-7 -bottom-[10px] w-0 h-0  border-l-transparent  border-t-white  border-r-transparent hidden md:block"></div>

                <h3 className="text-xs bg-[#f0f0f0] px-1 py-0.5 inline-block border border-black/30 mb-1 font-yangjin">
                  스승냥
                </h3>
                <p
                  className="leading-relaxed text-black font-body break-words"
                  dangerouslySetInnerHTML={{
                    __html: chefReaction.replace(
                      /'([^']+)'/g,
                      "<span class='text-[#D44000] font-black decoration-wavy underline decoration-[#D44000] bg-[#FFF2CC] px-1 rounded-sm mx-0.5'>$1</span>",
                    ),
                  }}
                />
              </div>

              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#f0f0f0] rounded-full kitsch-border flex items-center justify-center text-3xl md:text-4xl shadow-xl pointer-events-auto mr-2 pb-1 transition-all duration-300">
                {catFaceStatus === "success" ? "😻" : catFaceStatus === "fail" ? "🙀" : "🐱"}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Bottom Menu Navigation */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-[600px] bg-white/80 backdrop-blur-md kitsch-border flex justify-around p-2 z-50 shadow-xl overflow-x-auto">
          {[
            { id: "kitchen", icon: <Utensils size={20} />, label: "주방" },
            { id: "secretRecipe", icon: <ScrollText size={20} />, label: "비법" },
            { id: "encyclopedia", icon: <BookOpen size={20} />, label: "신선고" },
            { id: "wrong", icon: <XCircle size={20} />, label: "오답" },
            { id: "lounge", icon: <Home size={20} />, label: "라운지" },
            { id: "profile", icon: <User size={20} />, label: "내 정보" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
              }}
              className={cn(
                "flex flex-1 items-center justify-center h-12 transition-all font-yangjin mx-1 gap-2 rounded-[12px] border-[2px] leading-none",
                activeTab === tab.id
                  ? "bg-[var(--color-kitsch-blue)] text-black border-black shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)] translate-y-0.5"
                  : "bg-white text-gray-500 hover:bg-gray-50 border-transparent hover:border-black/5"
              )}
            >
              <div
                className={
                  activeTab === tab.id
                    ? "scale-110"
                    : ""
                }
              >
                {tab.icon}
              </div>
              <span
                className={cn(
                  "text-[11px] sm:text-xs",
                  activeTab === tab.id
                    ? "font-bold"
                    : ""
                )}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
      </div>
    </>
  );
}
