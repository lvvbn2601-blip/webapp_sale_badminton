import { useState, useMemo, useEffect, useCallback } from "react";
import { Product } from "../types";
import {
  X,
  ChevronRight,
  ChevronLeft,
  RefreshCcw,
  CheckCircle2,
  ShoppingCart,
  Sparkles,
  Copy,
  Check,
  Zap,
  Shield,
  Target,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "../context/CartContext";

/* ═══════════════════════════════════════════════════════════
 *  Types
 * ═══════════════════════════════════════════════════════════ */
type Props = {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
};

type QuizOption = {
  id: string;
  label: string;
  description: string;
  icon: string; // emoji fallback
  image?: string;
  gradient: string;
};

type QuizQuestion = {
  id: string;
  step: number;
  title: string;
  subtitle: string;
  options: QuizOption[];
};

/* ═══════════════════════════════════════════════════════════
 *  Quiz Data — beginner-friendly, plain-language questions
 * ═══════════════════════════════════════════════════════════ */
const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "strength",
    step: 1,
    title: "How would you describe your arm strength?",
    subtitle:
      "No wrong answers here! This helps us pick the right weight and flexibility so the racket feels natural in your hand.",
    options: [
      {
        id: "strong",
        label: "I'm quite strong 💪",
        description:
          "I play other sports regularly or have good wrist power. I can swing hard without getting tired.",
        icon: "💪",
        image: "/images/quiz/strong-player.png",
        gradient: "from-red-500 to-orange-500",
      },
      {
        id: "average",
        label: "Average strength",
        description:
          "Just starting to play sports. I'm not weak but I'm not super strong either.",
        icon: "🏃",
        image: "/images/quiz/average-player.png",
        gradient: "from-amber-500 to-yellow-500",
      },
      {
        id: "light",
        label: "I prefer something light",
        description:
          "I'm female, have a smaller frame, or my wrist gets tired easily. I need a gentle racket.",
        icon: "🌸",
        image: "/images/quiz/light-player.png",
        gradient: "from-purple-500 to-pink-500",
      },
    ],
  },
  {
    id: "playstyle",
    step: 2,
    title: "On the court, what do you enjoy most?",
    subtitle:
      "Think about what makes your heart race during a game — this determines the racket's sweet spot.",
    options: [
      {
        id: "attack",
        label: "Powerful smashes! 🔥",
        description:
          "I love staying at the back and finishing rallies with crushing overhead shots.",
        icon: "🔥",
        image: "/images/quiz/smash-attack.png",
        gradient: "from-red-600 to-rose-500",
      },
      {
        id: "defense",
        label: "Quick control & defense 🛡️",
        description:
          "I enjoy fast exchanges at the net, precise drops, and outsmarting my opponent.",
        icon: "🛡️",
        image: "/images/quiz/defense-control.png",
        gradient: "from-blue-500 to-cyan-500",
      },
      {
        id: "allround",
        label: "A bit of everything ⚡",
        description:
          "I haven't defined my style yet. I want a racket that does well in all situations.",
        icon: "⚡",
        image: "/images/quiz/allround-style.png",
        gradient: "from-emerald-500 to-teal-500",
      },
    ],
  },
  {
    id: "budget",
    step: 3,
    title: "What's your budget for this racket?",
    subtitle:
      "Every price range has great options. Let's find the best value for your investment.",
    options: [
      {
        id: "budget",
        label: "Under $100",
        description:
          "I want something affordable and easy to start with. Priority: value for money.",
        icon: "💰",
        gradient: "from-green-500 to-emerald-500",
      },
      {
        id: "mid",
        label: "$100 – $200",
        description:
          "I want a quality racket that will last. Willing to invest in good gear.",
        icon: "💎",
        gradient: "from-blue-500 to-indigo-500",
      },
      {
        id: "premium",
        label: "Over $200",
        description:
          "I want the best technology available. Ready to invest in professional-grade equipment.",
        icon: "👑",
        gradient: "from-amber-500 to-orange-500",
      },
    ],
  },
];

const TOTAL_STEPS = QUIZ_QUESTIONS.length;

/* ═══════════════════════════════════════════════════════════
 *  Result messages keyed by answer combination
 * ═══════════════════════════════════════════════════════════ */
type AnswerProfile = {
  strength: string;
  playstyle: string;
  budget: string;
};

function getResultMessage(profile: AnswerProfile): {
  title: string;
  message: string;
  icon: typeof Zap;
} {
  const { strength, playstyle } = profile;

  if (strength === "light" || (strength === "average" && playstyle === "allround")) {
    return {
      title: "Easy & Comfortable Picks",
      message:
        "These rackets are the most popular and easy-to-tame, helping you get used to the pace on the court without worrying about wrist pain!",
      icon: Shield,
    };
  }
  if ((strength === "strong" || strength === "average") && playstyle === "attack") {
    return {
      title: "Power-Packed Warriors",
      message:
        "Power is your foundation! These 'swords' are designed to optimize the most powerful smashes and give you that extra edge.",
      icon: Zap,
    };
  }
  if (playstyle === "defense") {
    return {
      title: "Speed & Precision Masters",
      message:
        "Lightning reflexes deserve a lightning racket! These picks are built for speed, tight net play, and surgical shot placement.",
      icon: Target,
    };
  }

  return {
    title: "Your Perfect All-Rounders",
    message:
      "Versatility is king! These rackets excel at everything — from powerful smashes to delicate net play. Perfect for exploring your style.",
    icon: Sparkles,
  };
}

/* ═══════════════════════════════════════════════════════════
 *  Scoring engine — matches answers to product specs
 * ═══════════════════════════════════════════════════════════ */
function scoreProducts(products: Product[], profile: AnswerProfile): Product[] {
  const normalize = (s: any) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, "");

  const getSpec = (p: Product, key: string) => {
    const rawKey = normalize(key);
    const entry = Object.entries(p.specs || {}).find(
      ([k]) => normalize(k) === rawKey
    );
    return entry ? entry[1] : undefined;
  };

  // Filter only racket products — generous matching for various backend formats
  const rackets = products.filter((p) => {
    const cat = p.category;
    const catSlug = typeof cat === "string"
      ? cat
      : (cat as any)?.slug || (cat as any)?.name || "";
    const catNorm = catSlug.toLowerCase().replace(/s$/, ""); // "rackets" → "racket"

    const isRacketCat = !cat || catNorm.includes("racket") || catNorm === "";

    // Check for racket-type specs (not strings/accessories) using normalized keys
    const specKeys = Object.keys(p.specs || {}).map(normalize);
    const racketSpecKeys = ["Weight(U)", "Grip Circumference(G)", "Stick stiffness", "Balance Point"].map(normalize);
    const hasRacketSpecs = specKeys.some((k) => racketSpecKeys.includes(k));

    return isRacketCat || hasRacketSpecs;
  });

  const scored = rackets.map((p) => {
    let score = 0;
    const price = Number(p.price ?? (p as any).basePrice ?? 0);

    // --- Strength → Weight & Stiffness ---
    const weight = getSpec(p, "Weight(U)");
    const stiffness = getSpec(p, "Stick stiffness");

    if (profile.strength === "strong") {
      if (weight && normalize(weight) === normalize("3U")) score += 3;
      if (weight && normalize(weight) === normalize("4U")) score += 2;
      if (stiffness && ["Stiff", "Very Stiff"].map(normalize).includes(normalize(stiffness))) score += 3;
      if (stiffness && normalize(stiffness) === normalize("Medium")) score += 2;
    } else if (profile.strength === "average") {
      if (weight && normalize(weight) === normalize("4U")) score += 4;
      if (weight && normalize(weight) === normalize("3U")) score += 1;
      if (stiffness && normalize(stiffness) === normalize("Flexible")) score += 3;
      if (stiffness && normalize(stiffness) === normalize("Medium")) score += 2;
    } else if (profile.strength === "light") {
      if (weight && normalize(weight) === normalize("5U")) score += 5;
      if (weight && normalize(weight) === normalize("4U")) score += 3;
      if (stiffness && normalize(stiffness) === normalize("Flexible")) score += 4;
      if (stiffness && normalize(stiffness) === normalize("Medium")) score += 2;
    }

    // --- Play style → Balance / Play Style spec ---
    const playStyle = getSpec(p, "Balance Point");

    if (profile.playstyle === "attack") {
      if (playStyle && normalize(playStyle) === normalize("Head Heavy (Offensive) ")) score += 5;
      if (playStyle && normalize(playStyle) === normalize("All-around Offensive/Defensive")) score += 2;
    } else if (profile.playstyle === "defense") {
      if (playStyle && normalize(playStyle) === normalize("Head Light (Defensive)")) score += 5;
      if (playStyle && normalize(playStyle) === normalize("All-around Offensive/Defensive")) score += 2;
    } else if (profile.playstyle === "allround") {
      if (playStyle && normalize(playStyle) === normalize("All-around Offensive/Defensive")) score += 5;
      if (playStyle && normalize(playStyle) === normalize("Head Light (Defensive)")) score += 4;
      if (playStyle && normalize(playStyle) === normalize("Head Heavy (Offensive) ")) score += 1;
    }

    // --- Budget scoring (no penalty, only bonuses) ---
    if (profile.budget === "budget") {
      if (price <= 100) score += 4;
      else if (price <= 150) score += 2;
      else score += 0; // no penalty
    } else if (profile.budget === "mid") {
      if (price > 100 && price <= 200) score += 4;
      else if (price > 80 && price <= 100) score += 2;
      else if (price > 200 && price <= 250) score += 1;
    } else if (profile.budget === "premium") {
      if (price > 200) score += 4;
      else if (price > 150) score += 2;
      else if (price > 100) score += 1;
    }

    // Beginner bonus for light/average + allround
    if (
      (profile.strength === "light" || profile.strength === "average") &&
      profile.playstyle === "allround" &&
      playStyle &&
      normalize(playStyle) === "beginner"
    ) {
      score += 3;
    }

    return { product: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topResults = scored.slice(0, 3).map((s) => s.product);
  console.log(products.map((p) => p.category))
  console.log("topResults", topResults);
  console.log("rackets", rackets);
  console.log("scored", scored);

  // Fallback: if no scored results, return top-rated rackets from all products
  if (topResults.length === 0) {
    const fallbackRackets = products
      .filter((p) => {
        const cat = p.category;
        const slug = typeof cat === "string" ? cat : (cat as any)?.slug || "";
        return slug.includes("racket") || !cat;
      })
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);
    return fallbackRackets;
  }

  return topResults;
}

/* ═══════════════════════════════════════════════════════════
 *  Helper: Format price in VND-style or USD
 * ═══════════════════════════════════════════════════════════ */
function formatPrice(price: number): string {
  return `$${price.toFixed(0)}`;
}

/* ═══════════════════════════════════════════════════════════
 *  Component
 * ═══════════════════════════════════════════════════════════ */
export function RacketQuizModal({ isOpen, onClose, products }: Props) {
  const { add } = useCart();
  const [currentStep, setCurrentStep] = useState(0); // 0 = intro, 1-3 = questions, 4 = calculating, 5 = results
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [animDir, setAnimDir] = useState<"next" | "prev">("next");
  const [copiedCode, setCopiedCode] = useState(false);
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});
  const [slideKey, setSlideKey] = useState(0);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setAnswers({});
      setAddedToCart({});
      setCopiedCode(false);
      setSlideKey(0);
    }
  }, [isOpen]);

  const questionIndex = currentStep - 1; // 0-based question index
  const isIntro = currentStep === 0;
  const isQuestion = currentStep >= 1 && currentStep <= TOTAL_STEPS;
  const isCalculating = currentStep === TOTAL_STEPS + 1;
  const isResults = currentStep === TOTAL_STEPS + 2;

  const currentQuestion = isQuestion ? QUIZ_QUESTIONS[questionIndex] : null;
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  // Build answer profile for scoring
  const answerProfile: AnswerProfile = useMemo(
    () => ({
      strength: answers.strength || "average",
      playstyle: answers.playstyle || "allround",
      budget: answers.budget || "mid",
    }),
    [answers]
  );

  // Calculate recommended products
  const recommendedProducts = useMemo(() => {
    if (!isResults) return [];
    return scoreProducts(products, answerProfile);
  }, [isResults, products, answerProfile]);

  const resultInfo = useMemo(() => getResultMessage(answerProfile), [answerProfile]);

  /* ── Navigation handlers ──────────────────── */
  const goNext = useCallback(() => {
    setAnimDir("next");
    setSlideKey((k) => k + 1);

    if (currentStep === TOTAL_STEPS) {
      // Last question → Calculating
      setCurrentStep(TOTAL_STEPS + 1);
      setTimeout(() => {
        setCurrentStep(TOTAL_STEPS + 2);
        setSlideKey((k) => k + 1);
      }, 2200);
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const goBack = useCallback(() => {
    if (currentStep <= 0) return;
    setAnimDir("prev");
    setSlideKey((k) => k + 1);
    setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const handleSelect = useCallback(
    (optionId: string) => {
      if (!currentQuestion) return;
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionId }));
    },
    [currentQuestion]
  );

  const restartQuiz = useCallback(() => {
    setAnimDir("next");
    setCurrentStep(0);
    setAnswers({});
    setAddedToCart({});
    setCopiedCode(false);
  }, []);

  const handleAddToCart = useCallback(
    (product: Product) => {
      const pid = product.id || (product as any)._id;
      add(product, 1);
      setAddedToCart((prev) => ({ ...prev, [pid]: true }));
    },
    [add]
  );

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText("QUIZ10K");
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, []);

  const progressPercentage = Math.min(
    ((isResults ? TOTAL_STEPS : questionIndex) / TOTAL_STEPS) * 100,
    100
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        style={{
          animation: "quizModalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-white/80 backdrop-blur-sm transition-all hover:bg-black/20 hover:text-white hover:scale-110"
          aria-label="Close quiz"
        >
          <X size={18} />
        </button>

        {/* ─── Progress Bar (visible during questions) ─── */}
        {isQuestion && (
          <div className="absolute top-0 left-0 right-0 z-20 h-1 bg-black/10">
            <div
              className="h-full bg-gradient-to-r from-primary to-orange-400 transition-all duration-700 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════════
         *  INTRO SCREEN
         * ═══════════════════════════════════════════════ */}
        {isIntro && (
          <div className="flex flex-col overflow-hidden">
            {/* Hero */}
            <div className="relative bg-gradient-to-br from-primary via-red-500 to-orange-500 px-8 py-12 text-center text-white overflow-hidden">
              <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
              <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

              {/* Animated sparkle */}
              <div className="relative z-10 mx-auto mb-5 flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-white/20" style={{ animationDuration: "2s" }} />
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <Sparkles size={36} className="text-white drop-shadow-lg" />
                </div>
              </div>

              <h2 className="relative z-10 font-heading text-2xl font-extrabold leading-tight sm:text-3xl">
                Find Your Perfect Racket
                <br />
                <span className="text-yellow-200">in Just 1 Minute!</span>
              </h2>
              <p className="relative z-10 mt-3 text-sm text-white/80 max-w-md mx-auto leading-relaxed">
                Not sure which racket suits you? Answer 3 simple questions about
                yourself — no technical knowledge needed — and we&apos;ll recommend
                the ideal racket for your game.
              </p>
            </div>

            {/* Features */}
            <div className="px-8 py-8 bg-gray-50">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-primary">
                    <span className="text-lg">🎯</span>
                  </div>
                  <span className="text-xs font-semibold text-secondary/70">3 Simple Questions</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-500">
                    <span className="text-lg">🤖</span>
                  </div>
                  <span className="text-xs font-semibold text-secondary/70">Smart Matching</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-500">
                    <span className="text-lg">🎁</span>
                  </div>
                  <span className="text-xs font-semibold text-secondary/70">Exclusive Discount</span>
                </div>
              </div>

              <button
                onClick={goNext}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-orange-500 px-6 py-4 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              >
                Let&apos;s Find My Racket!
                <ArrowRight size={18} />
              </button>

              <p className="mt-3 text-center text-[11px] text-secondary/40">
                Takes less than 60 seconds · No account needed
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
         *  QUESTION SCREENS
         * ═══════════════════════════════════════════════ */}
        {isQuestion && currentQuestion && (
          <div key={`q-${slideKey}`} className="flex flex-col quiz-slide-in" style={{ animationDirection: animDir === "prev" ? "reverse" : "normal" }}>
            {/* Question header */}
            <div className="relative bg-gradient-to-br from-secondary via-gray-800 to-gray-900 px-8 pb-8 pt-10 text-white overflow-hidden">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />

              <div className="relative z-10 flex items-center gap-2 mb-3">
                {QUIZ_QUESTIONS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < questionIndex
                      ? "bg-green-400"
                      : i === questionIndex
                        ? "bg-primary"
                        : "bg-white/20"
                      }`}
                  />
                ))}
              </div>

              <span className="relative z-10 inline-block rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/70 backdrop-blur-sm">
                Question {currentQuestion.step} of {TOTAL_STEPS}
              </span>
              <h2 className="relative z-10 mt-3 font-heading text-xl font-bold leading-tight sm:text-2xl">
                {currentQuestion.title}
              </h2>
              <p className="relative z-10 mt-2 text-sm text-white/60 leading-relaxed">
                {currentQuestion.subtitle}
              </p>
            </div>

            {/* Options */}
            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 bg-gray-50/50">
              <div className="grid gap-3">
                {currentQuestion.options.map((opt) => {
                  const selected = selectedAnswer === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelect(opt.id)}
                      className={`group relative flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${selected
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/10 scale-[1.01]"
                        : "border-transparent bg-white hover:border-gray-200 hover:shadow-sm"
                        }`}
                    >
                      {/* Option image or icon */}
                      <div
                        className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${opt.gradient} text-2xl shadow-sm overflow-hidden transition-transform ${selected ? "scale-110" : "group-hover:scale-105"
                          }`}
                      >
                        {opt.image ? (
                          <Image
                            src={opt.image}
                            alt={opt.label}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <span className="drop-shadow-sm">{opt.icon}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-bold ${selected ? "text-primary" : "text-secondary"
                            }`}
                        >
                          {opt.label}
                        </div>
                        <div className="mt-0.5 text-xs text-secondary/50 leading-relaxed line-clamp-2">
                          {opt.description}
                        </div>
                      </div>

                      {/* Selection indicator */}
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${selected
                          ? "border-primary bg-primary text-white scale-110"
                          : "border-gray-200 group-hover:border-gray-300"
                          }`}
                      >
                        {selected && <Check size={14} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between border-t border-black/5 bg-white px-6 py-4 sm:px-8">
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 text-sm font-semibold text-secondary/50 transition hover:text-secondary"
              >
                <ChevronLeft size={16} />
                {currentStep === 1 ? "Intro" : "Back"}
              </button>

              <button
                onClick={goNext}
                disabled={!selectedAnswer}
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-200 ${selectedAnswer
                  ? "bg-gradient-to-r from-primary to-orange-500 hover:-translate-y-0.5 hover:shadow-md"
                  : "bg-gray-300 cursor-not-allowed"
                  }`}
              >
                {currentStep === TOTAL_STEPS ? (
                  <>
                    See My Results <Sparkles size={16} />
                  </>
                ) : (
                  <>
                    Next <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
         *  CALCULATING ANIMATION
         * ═══════════════════════════════════════════════ */}
        {isCalculating && (
          <div className="flex h-[480px] flex-col items-center justify-center bg-gradient-to-br from-secondary via-gray-800 to-gray-900 px-8 text-center text-white">
            {/* Orbiting dots animation */}
            <div className="relative mb-8">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-spin" style={{ animationDuration: "3s" }}>
                  <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-primary shadow-lg shadow-primary/50" />
                </div>
                <div className="absolute inset-2 rounded-full border-2 border-orange-400/30 animate-spin" style={{ animationDuration: "2s", animationDirection: "reverse" }}>
                  <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-orange-400 shadow-lg shadow-orange-400/50" />
                </div>
                <Sparkles size={32} className="text-primary animate-pulse" />
              </div>
            </div>

            <h3 className="font-heading text-2xl font-bold">
              Analyzing your style...
            </h3>
            <p className="mt-2 text-sm text-white/50 max-w-xs mx-auto">
              Matching your profile against {products.filter(p => {
                const cat = p.category;
                return !cat || (typeof cat === "string" ? cat === "rackets" || cat === "racket" : true);
              }).length}+ rackets to find the perfect fit.
            </p>

            {/* Loading bar */}
            <div className="mt-8 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400"
                style={{
                  animation: "quizLoadBar 2s ease-out forwards",
                }}
              />
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
         *  RESULTS SCREEN
         * ═══════════════════════════════════════════════ */}
        {isResults && (
          <div className="max-h-[100vh]">
            {/* Results header */}
            <div className="relative bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 px-8 py-10 text-center text-white overflow-hidden">
              <div className="relative z-10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                <CheckCircle2 size={32} className="text-white drop-shadow" />
              </div>
              <h2 className="relative z-10 font-heading text-2xl font-extrabold sm:text-3xl">
                {resultInfo.title}
              </h2>
              <p className="relative z-10 mt-3 text-sm text-emerald-100 max-w-md mx-auto leading-relaxed">
                {resultInfo.message}
              </p>
            </div>

            {/* Product Cards */}
            <div className="flex max-h-[60vh] flex-col overflow-y-auto bg-gray-50 px-6 py-8 sm:px-8">
              {recommendedProducts.length > 0 ? (
                <div className="grid gap-5">
                  {recommendedProducts.map((product, i) => {
                    const pid = product.id || (product as any)._id;
                    const price = Number(product.price ?? (product as any).basePrice ?? 0);
                    const inCart = addedToCart[pid];

                    return (
                      <div
                        key={pid}
                        className="group relative flex flex-col sm:flex-row overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-all hover:shadow-lg hover:-translate-y-0.5"
                        style={{
                          animation: `quizFadeUp 0.5s ${i * 0.15}s both cubic-bezier(0.16, 1, 0.3, 1)`,
                        }}
                      >
                        {/* Badge */}
                        <div className="absolute top-3 left-3 z-10">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm ${i === 0
                              ? "bg-gradient-to-r from-amber-500 to-orange-500"
                              : i === 1
                                ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                                : "bg-gradient-to-r from-emerald-500 to-teal-500"
                              }`}
                          >
                            {i === 0 ? "🏆 Best Match" : i === 1 ? "⭐ Great Pick" : "✨ Also Great"}
                          </span>
                        </div>

                        {/* Image */}
                        <div className="relative h-48 w-full sm:h-auto sm:w-44 bg-gray-100 shrink-0 overflow-hidden">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-4xl text-secondary/10">
                              🏸
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex flex-1 flex-col p-5">
                          <h3 className="font-heading text-base font-bold text-secondary pr-8 line-clamp-1">
                            {product.name}
                          </h3>
                          <p className="mt-1 text-xs text-secondary/50 line-clamp-2">
                            {product.description}
                          </p>

                          {/* Spec pills */}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {product.specs &&
                              Object.entries(product.specs)
                                .slice(0, 4)
                                .map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[10px] font-medium text-secondary/70"
                                  >
                                    <span className="font-bold text-secondary/40">{k}:</span>
                                    {v}
                                  </span>
                                ))}
                          </div>

                          {/* Price + Actions */}
                          <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                            <span className="text-xl font-extrabold text-secondary">
                              {formatPrice(price)}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAddToCart(product)}
                                disabled={inCart}
                                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${inCart
                                  ? "bg-green-100 text-green-600 cursor-default"
                                  : "bg-primary text-white hover:-translate-y-0.5 hover:shadow-md"
                                  }`}
                              >
                                {inCart ? (
                                  <>
                                    <Check size={14} />
                                    Added
                                  </>
                                ) : (
                                  <>
                                    <ShoppingCart size={14} />
                                    Add to Cart
                                  </>
                                )}
                              </button>
                              <Link
                                href={`/products/${product.slug}`}
                                className="flex items-center gap-1 rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold text-secondary transition hover:bg-gray-50"
                              >
                                Details
                                <ChevronRight size={12} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl bg-white py-12 text-center shadow-sm ring-1 ring-black/5">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
                    🏸
                  </div>
                  <p className="font-semibold text-secondary">
                    No exact matches found
                  </p>
                  <p className="mt-1 text-sm text-secondary/50">
                    Try adjusting your preferences or browse our full collection.
                  </p>
                  <Link
                    href="/products?category=rackets"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    Browse All Rackets <ChevronRight size={14} />
                  </Link>
                </div>
              )}

              {/* Discount Code Banner */}
              <div
                className="mt-6 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-5 ring-1 ring-amber-200/50"
                style={{
                  animation: "quizFadeUp 0.5s 0.6s both cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-xl shadow-sm">
                    🎁
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-secondary">
                      Quiz Exclusive — $10 OFF your order!
                    </p>
                    <p className="text-xs text-secondary/50 mt-0.5">
                      Use code at checkout. Valid for 24 hours on any racket.
                    </p>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${copiedCode
                      ? "bg-green-500 text-white"
                      : "bg-amber-500 text-white hover:bg-amber-600"
                      }`}
                  >
                    {copiedCode ? (
                      <>
                        <Check size={12} /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> QUIZ10K
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Retake */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={restartQuiz}
                  className="flex items-center gap-2 text-sm font-semibold text-secondary/40 transition hover:text-primary"
                >
                  <RefreshCcw size={14} />
                  Retake the Quiz
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inline CSS for animations */}
        <style jsx>{`
          @keyframes quizModalIn {
            from {
              opacity: 0;
              transform: scale(0.92) translateY(24px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          @keyframes quizLoadBar {
            0% {
              width: 0%;
            }
            40% {
              width: 55%;
            }
            80% {
              width: 85%;
            }
            100% {
              width: 100%;
            }
          }

          @keyframes quizFadeUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .quiz-slide-in {
            animation: quizSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes quizSlideIn {
            from {
              opacity: 0;
              transform: translateX(30px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
