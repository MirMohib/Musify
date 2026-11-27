type PendingJob = {
  videoId: string;
  resolve: (url: string) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type Listener = (videoId: string | null) => void;

let activeJob: PendingJob | null = null;
const queue: PendingJob[] = [];
const listeners = new Set<Listener>();
const urlCache = new Map<string, { url: string; expiresAt: number }>();

function notify() {
  const currentId = activeJob?.videoId ?? null;
  listeners.forEach((fn) => fn(currentId));
}

function pumpQueue() {
  if (activeJob || queue.length === 0) {
    notify();
    return;
  }
  activeJob = queue.shift() ?? null;
  notify();
}

export function subscribeYouTubeBridge(listener: Listener): () => void {
  listeners.add(listener);
  listener(activeJob?.videoId ?? null);
  return () => {
    listeners.delete(listener);
  };
}

export function completeYouTubeBridgeJob(videoId: string, streamUrl: string) {
  const cleanId = videoId.replace(/^yt_/, '').trim();
  if (streamUrl) {
    urlCache.set(cleanId, {
      url: streamUrl,
      expiresAt: Date.now() + 45 * 60 * 1000,
    });
  }

  if (activeJob && activeJob.videoId === cleanId) {
    clearTimeout(activeJob.timer);
    const job = activeJob;
    activeJob = null;
    job.resolve(streamUrl);
    pumpQueue();
  }
}

export function failYouTubeBridgeJob(videoId: string, reason: string) {
  const cleanId = videoId.replace(/^yt_/, '').trim();
  if (activeJob && activeJob.videoId === cleanId) {
    clearTimeout(activeJob.timer);
    const job = activeJob;
    activeJob = null;
    job.reject(new Error(reason));
    pumpQueue();
  }
}

export function resolveYouTubeViaWebView(rawVideoId: string): Promise<string> {
  const videoId = rawVideoId.replace(/^yt_/, '').trim();
  if (!videoId) {
    return Promise.reject(new Error('Missing YouTube video ID'));
  }

  const cached = urlCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.url);
  }

  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      failYouTubeBridgeJob(videoId, `Timed out resolving audio for ${videoId}`);
    }, 45000);

    queue.push({ videoId, resolve, reject, timer });
    pumpQueue();
  });
}