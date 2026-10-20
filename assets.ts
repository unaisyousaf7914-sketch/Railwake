import run1 from "@/assets/sprites/run/run-1.png";
import run2 from "@/assets/sprites/run/run-2.png";
import run3 from "@/assets/sprites/run/run-3.png";
import run4 from "@/assets/sprites/run/run-4.png";
import jump1 from "@/assets/sprites/jump/jump-1.png";
import jump2 from "@/assets/sprites/jump/jump-2.png";
import jump3 from "@/assets/sprites/jump/jump-3.png";
import jump4 from "@/assets/sprites/jump/jump-4.png";
import slide1 from "@/assets/sprites/slide/slide-1.png";
import slide2 from "@/assets/sprites/slide/slide-2.png";
import slide3 from "@/assets/sprites/slide/slide-3.png";
import slide4 from "@/assets/sprites/slide/slide-4.png";
import hurt1 from "@/assets/sprites/hurt/hurt-1.png";
import hurt2 from "@/assets/sprites/hurt/hurt-2.png";
import hurt3 from "@/assets/sprites/hurt/hurt-3.png";
import hurt4 from "@/assets/sprites/hurt/hurt-4.png";
import hazard1 from "@/assets/sprites/hazards/hazard-1.png";
import hazard2 from "@/assets/sprites/hazards/hazard-2.png";
import hazard3 from "@/assets/sprites/hazards/hazard-3.png";
import hazard4 from "@/assets/sprites/hazards/hazard-4.png";
import coin1 from "@/assets/sprites/coin/coin-1.png";
import coin2 from "@/assets/sprites/coin/coin-2.png";
import coin3 from "@/assets/sprites/coin/coin-3.png";
import coin4 from "@/assets/sprites/coin/coin-4.png";
import beamUrl from "@/assets/sprites/beam/clean.png";

export type SpriteBank = {
  run: HTMLImageElement[];
  jump: HTMLImageElement[];
  slide: HTMLImageElement[];
  hurt: HTMLImageElement[];
  hazards: HTMLImageElement[];
  coin: HTMLImageElement[];
  beam: HTMLImageElement;
};

function load(src: string): HTMLImageElement {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  return img;
}

export function loadSprites(): SpriteBank {
  return {
    run: [run1, run2, run3, run4].map(load),
    jump: [jump1, jump2, jump3, jump4].map(load),
    slide: [slide1, slide2, slide3, slide4].map(load),
    hurt: [hurt1, hurt2, hurt3, hurt4].map(load),
    hazards: [hazard1, hazard2, hazard3, hazard4].map(load),
    coin: [coin1, coin2, coin3, coin4].map(load),
    beam: load(beamUrl),
  };
}

export function ready(img: HTMLImageElement | undefined): img is HTMLImageElement {
  return !!img && img.complete && img.naturalWidth > 0;
}
