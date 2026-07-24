"use client";

import dynamic from "next/dynamic";

import type { HomepageSlide } from "@/types/commerce";

// next/dynamic only creates a separate browser chunk when it is invoked from
// a Client Component. The default SSR behavior keeps the carousel's markup in
// the response; only its controls and autoplay code are deferred.
const HomepageLaunchSlider = dynamic(() =>
  import("@/components/homepage-launch-slider").then(
    (module) => module.HomepageLaunchSlider,
  ),
);

export function HomepageLaunchSliderLazy({
  slides,
}: {
  slides: HomepageSlide[];
}) {
  return <HomepageLaunchSlider slides={slides} />;
}
