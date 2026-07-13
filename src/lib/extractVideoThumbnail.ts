export function extractVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    function cleanup() {
      URL.revokeObjectURL(video.src);
      video.remove();
    }

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = Math.min(0.1, video.duration / 2);
    });

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { cleanup(); resolve(null); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => { cleanup(); resolve(blob); }, "image/jpeg", 0.8);
    });

    video.addEventListener("error", () => { cleanup(); resolve(null); });
  });
}
