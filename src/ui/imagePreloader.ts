const loadImage = (url: string): Promise<void> => new Promise((resolve) => {
  const image = new Image();
  image.decoding = "async";
  image.fetchPriority = "low";
  image.onload = () => {
    void image.decode().catch(() => undefined).finally(resolve);
  };
  image.onerror = () => resolve();
  image.src = url;
});

export async function preloadImages(urls: readonly string[], concurrency = 8): Promise<void> {
  const queue = [...new Set(urls)];
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < queue.length) {
      const url = queue[cursor];
      cursor += 1;
      if (url) await loadImage(url);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
}
