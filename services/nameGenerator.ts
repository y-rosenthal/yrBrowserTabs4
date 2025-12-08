// Words for name generation
// We have enough words here to generate unique names for 5 full A-Z cycles (130 windows)
// The logic will cycle back if we run out, ensuring infinite support.

const ADJECTIVES: { [key: string]: string[] } = {
  a: ["Able", "Active", "Angry", "Alert", "Azure"],
  b: ["Blue", "Brave", "Busy", "Bold", "Bright"],
  c: ["Calm", "Cool", "Clean", "Crazy", "Chief"],
  d: ["Dark", "Dear", "Deep", "Direct", "Dizzy"],
  e: ["Eager", "Early", "Easy", "Elite", "Empty"],
  f: ["Fair", "Fast", "Fine", "Firm", "Flat"],
  g: ["Glad", "Good", "Grand", "Great", "Green"],
  h: ["Happy", "Hard", "Heavy", "High", "Huge"],
  i: ["Icy", "Ideal", "Idle", "Ill", "Inner"],
  j: ["Jolly", "Just", "Juicy", "Joyful", "Jazzy"],
  k: ["Keen", "Kind", "Known", "Key", "King"],
  l: ["Late", "Lean", "Left", "Light", "Live"],
  m: ["Mad", "Main", "Major", "Mean", "Mild"],
  n: ["Near", "Neat", "New", "Nice", "Next"],
  o: ["Odd", "Old", "Open", "Orange", "Outer"],
  p: ["Pale", "Past", "Pink", "Plain", "Poor"],
  q: ["Quick", "Quiet", "Queen", "Quaint", "Quirky"],
  r: ["Rare", "Ready", "Real", "Red", "Rich"],
  s: ["Sad", "Safe", "Salt", "Same", "Soft"],
  t: ["Tall", "Tame", "Tart", "Thin", "Tidy"],
  u: ["Ugly", "Ultra", "Union", "Upper", "Urban"],
  v: ["Vain", "Vast", "Very", "Vivid", "Vital"],
  w: ["Warm", "Weak", "Wet", "Wide", "Wild"],
  x: ["Xenial", "Xeric", "Xray", "Xylo", "Xenon"], // X is hard, using mix
  y: ["Yellow", "Young", "Yummy", "Yearly", "Yoga"],
  z: ["Zany", "Zealous", "Zero", "Zesty", "Zinc"]
};

const NOUNS: { [key: string]: string[] } = {
  a: ["Ant", "Apple", "Arm", "Art", "Arch"],
  b: ["Bear", "Ball", "Bird", "Boat", "Box"],
  c: ["Cat", "Car", "Cake", "Cup", "Coat"],
  d: ["Dog", "Door", "Desk", "Duck", "Drum"],
  e: ["Egg", "Ear", "Eye", "Eel", "Elf"],
  f: ["Fan", "Fish", "Fork", "Fox", "Frog"],
  g: ["Goat", "Game", "Gate", "Gem", "Gift"],
  h: ["Hat", "Hen", "Hill", "Home", "Horse"],
  i: ["Ice", "Ink", "Iron", "Idea", "Image"],
  j: ["Jar", "Jam", "Jet", "Job", "Joke"],
  k: ["Key", "Kite", "King", "Kid", "Knee"],
  l: ["Lamp", "Leaf", "Leg", "Lion", "Lock"],
  m: ["Map", "Man", "Moon", "Mouse", "Mug"],
  n: ["Net", "Nail", "Name", "Neck", "Note"],
  o: ["Owl", "Oil", "Ox", "Oven", "Onion"],
  p: ["Pen", "Pan", "Pig", "Pin", "Pot"],
  q: ["Queen", "Quiz", "Quail", "Quilt", "Quart"],
  r: ["Rat", "Ring", "Road", "Rock", "Rose"],
  s: ["Sun", "Ship", "Shoe", "Shop", "Star"],
  t: ["Toy", "Tea", "Tent", "Tie", "Top"],
  u: ["Unit", "Urn", "User", "Uncle", "Usage"],
  v: ["Van", "Vase", "Vest", "Vine", "View"],
  w: ["Wolf", "Wall", "Way", "Web", "Wind"],
  x: ["Xray", "Xylophone", "Xenon", "Xerus", "Xylograph"],
  y: ["Yak", "Yam", "Yard", "Year", "Yoyo"],
  z: ["Zebra", "Zoo", "Zone", "Zero", "Zip"]
};

const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

/**
 * Generates a deterministic name based on the window index.
 * Index 0 -> A... A...
 * Index 1 -> B... B...
 * Index 26 -> A... A... (next word in list)
 */
export const generateWindowName = (index: number): string => {
  const charIndex = index % 26;
  const cycleIndex = Math.floor(index / 26);
  const char = ALPHABET[charIndex];

  const adjList = ADJECTIVES[char];
  const nounList = NOUNS[char];

  // Pick word based on cycle, wrapping around if we run out of words
  const adj = adjList[cycleIndex % adjList.length];
  const noun = nounList[cycleIndex % nounList.length];

  return `${adj} ${noun}`;
};

export const generateWindowNames = (windowIds: string[]): Record<string, string> => {
  const map: Record<string, string> = {};
  
  // Sort IDs to ensure stability if the API returns them in random order, 
  // though typically we want to respect the order provided by the OS.
  // We'll trust the input order represents the logical "1st, 2nd, 3rd" window.
  windowIds.forEach((id, index) => {
    map[id] = generateWindowName(index);
  });

  return map;
};