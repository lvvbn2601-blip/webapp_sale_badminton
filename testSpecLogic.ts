const getSpecValue = (
  specs: Record<string, string> | undefined,
  specKey: string
): string => {
  if (!specs) return "—";
  const key = Object.keys(specs).find(
    (k) => k.toLowerCase() === specKey.toLowerCase()
  );
  return key ? specs[key] || "—" : "—";
};

const p = {
  name: "Vợt cầu lông Yonex Astrox 77 Play Limited - Light Beige chính hãng",
  specs: {
    'Weight (U)': '3U',
    'Grip Circumference (G)': 'G5',
    'Balance Point': '300',
    'Maximum Tension': '11kg',
    'Stick Stiffness (Flex)': 'Stiff'
  }
};

const balanceStr = (getSpecValue(p.specs, "Điểm cân bằng") || getSpecValue(p.specs, "Balance") || getSpecValue(p.specs, "Balance Point") || "").toLowerCase();
const weightStr = (getSpecValue(p.specs, "Trọng lượng") || getSpecValue(p.specs, "Weight") || getSpecValue(p.specs, "Weight (U)") || getSpecValue(p.specs, "Weight(U)") || "").toLowerCase();
const stiffnessStr = (getSpecValue(p.specs, "Độ cứng") || getSpecValue(p.specs, "Stiffness") || getSpecValue(p.specs, "Stick Stiffness (Flex)") || "").toLowerCase();

console.log("Balance:", balanceStr);
console.log("Weight:", weightStr);
console.log("Stiffness:", stiffnessStr);
