"use client";
import { useEffect, useRef } from "react";

interface Props {
  ticker: string;
}

export default function TradingViewChart({ ticker }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: ticker,
      width: "100%",
      height: 220,
      locale: "en",
      dateRange: "1D",
      colorTheme: "dark",
      isTransparent: true,
      autosize: true,
      largeChartUrl: `https://www.tradingview.com/chart/?symbol=${ticker}`,
    });

    containerRef.current.appendChild(script);
  }, [ticker]);

  return (
    <div className="relative rounded-lg overflow-hidden">
      <div className="tradingview-widget-container" ref={containerRef} />
      {/* Block clicks so symbol link doesn't navigate to TradingView */}
      <div className="absolute inset-0" style={{ pointerEvents: "all" }} onClick={(e) => e.preventDefault()} />
    </div>
  );
}
