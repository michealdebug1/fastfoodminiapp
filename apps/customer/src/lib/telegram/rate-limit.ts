interface RateLimitBucket {
  count: number;
  expiresAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

export function isRateLimited(
  key: string,
  limit: number,
  windowMilliseconds: number,
  now = Date.now(),
): boolean {
  const current = buckets.get(key);
  if (!current || current.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMilliseconds });
    return false;
  }

  current.count += 1;
  if (buckets.size > 10_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.expiresAt <= now) buckets.delete(bucketKey);
    }
  }
  return current.count > limit;
}

export function getRateLimitKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return clientIp;
}
