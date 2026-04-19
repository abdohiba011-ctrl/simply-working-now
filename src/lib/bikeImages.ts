// Import all bike images
import sanyaMain from "@/assets/bikes/sanya-main.jpg";
import becane33Main from "@/assets/bikes/becane33-main.jpg";
import c90Main from "@/assets/bikes/c90-main.jpg";
import c50Main from "@/assets/bikes/c50-main.jpg";
import shMain from "@/assets/bikes/sh-main.jpg";
import c100Main from "@/assets/bikes/c100-main.jpg";

// Import hero images (WebP format for better performance)
import sanyaHero from "@/assets/hero-bikes/sanya.webp";
import becaneHero from "@/assets/hero-bikes/becane.webp";
import cappuccinoHero from "@/assets/hero-bikes/cappuccino.webp";
import orbitHero from "@/assets/hero-bikes/orbit.webp";
import shHero from "@/assets/hero-bikes/sh.webp";

// Detail images - Sanya
import sanya1 from "@/assets/bikes/details/sanya-1.jpg";
import sanya2 from "@/assets/bikes/details/sanya-2.jpg";
import sanya3 from "@/assets/bikes/details/sanya-3.jpg";
import sanya4 from "@/assets/bikes/details/sanya-4.jpg";
import sanya5 from "@/assets/bikes/details/sanya-5.jpg";

// Detail images - Becane 33
import becane331 from "@/assets/bikes/details/becane33-1.jpg";
import becane332 from "@/assets/bikes/details/becane33-2.jpg";
import becane333 from "@/assets/bikes/details/becane33-3.jpg";
import becane334 from "@/assets/bikes/details/becane33-4.jpg";
import becane335 from "@/assets/bikes/details/becane33-5.jpg";

// Detail images - C90
import c901 from "@/assets/bikes/details/c90-1.jpg";
import c902 from "@/assets/bikes/details/c90-2.jpg";
import c903 from "@/assets/bikes/details/c90-3.jpg";
import c904 from "@/assets/bikes/details/c90-4.jpg";
import c905 from "@/assets/bikes/details/c90-5.jpg";

// Detail images - C50
import c501 from "@/assets/bikes/details/c50-1.jpg";
import c502 from "@/assets/bikes/details/c50-2.jpg";
import c503 from "@/assets/bikes/details/c50-3.jpg";
import c504 from "@/assets/bikes/details/c50-4.jpg";
import c505 from "@/assets/bikes/details/c50-5.jpg";

// Detail images - SH
import sh1 from "@/assets/bikes/details/sh-1.jpg";
import sh2 from "@/assets/bikes/details/sh-2.jpg";
import sh3 from "@/assets/bikes/details/sh-3.jpg";
import sh4 from "@/assets/bikes/details/sh-4.jpg";
import sh5 from "@/assets/bikes/details/sh-5.jpg";

// Detail images - C100
import c1001 from "@/assets/bikes/details/c100-1.jpg";
import c1002 from "@/assets/bikes/details/c100-2.jpg";
import c1003 from "@/assets/bikes/details/c100-3.jpg";
import c1004 from "@/assets/bikes/details/c100-4.jpg";
import c1005 from "@/assets/bikes/details/c100-5.jpg";

// Cappuccino lifestyle images
import cappuccinoLifestyle from "@/assets/bikes/details/cappuccino-lifestyle.jpg";
import cappuccinoNature from "@/assets/bikes/details/cappuccino-nature.jpg";
import c100Lifestyle from "@/assets/bikes/details/c100-lifestyle.jpg";

// Map image keys to actual imported images
export const bikeImageMap: Record<string, string> = {
  // Main images
  "sanya-main": sanyaMain,
  "becane33-main": becane33Main,
  "c90-main": c90Main,
  "c50-main": c50Main,
  "sh-main": shMain,
  "c100-main": c100Main,
  
  // Hero images (WebP format, matching database)
  "sanya.webp": sanyaHero,
  "becane.webp": becaneHero,
  "cappuccino.webp": cappuccinoHero,
  "orbit.webp": orbitHero,
  "sh.webp": shHero,
  // Legacy keys for backward compatibility
  "sanya.jpg": sanyaHero,
  "becane.png": becaneHero,
  "cappuccino.jpg": cappuccinoHero,
  "orbit.jpg": orbitHero,
  "sh.jpg": shHero,
  
  // Sanya details
  "sanya-1": sanya1,
  "sanya-2": sanya2,
  "sanya-3": sanya3,
  "sanya-4": sanya4,
  "sanya-5": sanya5,
  
  // Becane 33 details
  "becane33-1": becane331,
  "becane33-2": becane332,
  "becane33-3": becane333,
  "becane33-4": becane334,
  "becane33-5": becane335,
  
  // C90 details
  "c90-1": c901,
  "c90-2": c902,
  "c90-3": c903,
  "c90-4": c904,
  "c90-5": c905,
  
  // C50 details
  "c50-1": c501,
  "c50-2": c502,
  "c50-3": c503,
  "c50-4": c504,
  "c50-5": c505,
  
  // SH details
  "sh-1": sh1,
  "sh-2": sh2,
  "sh-3": sh3,
  "sh-4": sh4,
  "sh-5": sh5,
  
  // C100 details
  "c100-1": c1001,
  "c100-2": c1002,
  "c100-3": c1003,
  "c100-4": c1004,
  "c100-5": c1005,
  
  // Cappuccino details
  "cappuccino-lifestyle": cappuccinoLifestyle,
  "cappuccino-nature": cappuccinoNature,
  "c100-lifestyle": c100Lifestyle,
};

// Helper function to get image URL from database key
export const getBikeImageUrl = (imageKey: string): string => {
  return bikeImageMap[imageKey] || sanyaMain; // fallback to sanya main image
};
