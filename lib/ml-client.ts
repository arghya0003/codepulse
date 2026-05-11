/**
 * ML Service Client Wrapper
 *
 * High-level interface for communicating with the FastAPI ML service
 * Handles rating predictions, difficulty classification, and rating conversions
 */

interface PredictionResponse {
  success: boolean;
  data?: {
    predicted_rating: number;
    confidence: number;
    monthly_improvement: number;
    timeline: {
      "3_months": number;
      "6_months": number;
      "12_months": number;
    };
    model_version: string;
    timestamp: string;
  };
  error?: string;
  timestamp: string;
}

interface DifficultyResponse {
  success: boolean;
  data?: {
    difficulty: string;
    difficulty_level: number;
    confidence: number;
    probabilities: Record<string, number>;
    model_version: string;
    timestamp: string;
  };
  error?: string;
  timestamp: string;
}

interface RatingConversionResponse {
  success: boolean;
  data?: {
    original_rating: number;
    original_platform: string;
    converted_rating: number;
    converted_platform: string;
    confidence: number;
    timestamp: string;
  };
  error?: string;
  timestamp: string;
}

/**
 * Get ML service URL from environment
 */
function getMlServiceUrl(): string {
  const url = process.env.ML_SERVICE_URL;
  if (!url) {
    throw new Error(
      "ML_SERVICE_URL not configured. Set it in .env.local or environment variables."
    );
  }
  return url;
}

/**
 * Get API key for ML service. Returns null if not configured (key is optional).
 */
function getMlApiKey(): string | null {
  return process.env.ML_INTERNAL_TOKEN ?? null;
}

function mlHeaders(extra?: Record<string, string>): Record<string, string> {
  const key = getMlApiKey();
  return {
    "Content-Type": "application/json",
    ...(key ? { "X-API-Key": key } : {}),
    ...extra,
  };
}

/**
 * Predict rating progression
 *
 * @param problemsSolved - Number of problems solved
 * @param currentRating - Current rating (e.g., LeetCode rating)
 * @param monthsActive - Months active on platform
 * @param acceptanceRate - Acceptance rate (0-100)
 * @returns Prediction with confidence metrics
 */
export async function predictRating(
  problemsSolved: number,
  currentRating: number,
  monthsActive: number = 1,
  acceptanceRate: number = 50
): Promise<PredictionResponse> {
  try {
    const url = new URL("/api/predict/rating", getMlServiceUrl());

    const response = await fetch(url, {
      method: "POST",
      headers: mlHeaders(),
      body: JSON.stringify({
        problems_solved: problemsSolved,
        current_rating: currentRating,
        months_active: monthsActive,
        acceptance_rate: acceptanceRate,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `ML service error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("[ML] Rating prediction error:", error);
    throw error;
  }
}

/**
 * Classify problem difficulty
 *
 * @param acceptanceRate - Problem acceptance rate (0-100)
 * @param submissionCount - Total submissions
 * @param minRuntimeMs - Best runtime in milliseconds
 * @param timeLimitSec - Time limit in seconds
 * @returns Difficulty classification
 */
export async function classifyDifficulty(
  acceptanceRate: number = 50,
  submissionCount: number = 1000,
  minRuntimeMs: number = 100,
  timeLimitSec: number = 2
): Promise<DifficultyResponse> {
  try {
    const url = new URL("/api/predict/difficulty", getMlServiceUrl());

    const response = await fetch(url, {
      method: "POST",
      headers: mlHeaders(),
      body: JSON.stringify({
        acceptance_rate: acceptanceRate,
        submission_count: submissionCount,
        min_runtime_ms: minRuntimeMs,
        time_limit_sec: timeLimitSec,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `ML service error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("[ML] Difficulty classification error:", error);
    throw error;
  }
}

/**
 * Convert rating between platforms
 *
 * @param rating - Rating to convert
 * @param fromPlatform - Source platform (leetcode, codeforces, codechef)
 * @param toPlatform - Target platform
 * @returns Converted rating
 */
export async function convertRating(
  rating: number,
  fromPlatform: string,
  toPlatform: string
): Promise<RatingConversionResponse> {
  try {
    const url = new URL("/api/convert/rating", getMlServiceUrl());

    const response = await fetch(url, {
      method: "POST",
      headers: mlHeaders(),
      body: JSON.stringify({
        rating,
        from_platform: fromPlatform,
        to_platform: toPlatform,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `ML service error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("[ML] Rating conversion error:", error);
    throw error;
  }
}

// ── Peak Time Prediction ──────────────────────────────────────────────────────

export interface MlPeakTimeData {
  peak_days:        string[];
  peak_hours:       number[];
  confidence:       number;
  schedule:         string;
  behavior_cluster: string;
  dow_chart_data:   Array<{ day: string; prob: number; isPeak: boolean }>;
  hour_chart_data:  Array<{ hour: number; label: string; prob: number; isPeak: boolean }>;
  grid_data:        Array<{ d: number; h: number; p: number }>;
  recommendation: {
    best_next: { day: string; hour: number; hour_label: string; confidence: number } | null;
    top_3:     Array<{ day: string; hour: number; hour_label: string; confidence: number }>;
  };
  explanation: {
    factors: Array<{ label: string; delta: number; sub: string }>;
  };
  model_version: string;
}

/**
 * Run the XGBoost peak-time analysis for a user's submission history.
 * Returns null (silently) if the ML service is unavailable or the request fails,
 * so callers can fall back to heuristic analysis.
 */
export async function predictPeakTime(
  submissions: Array<{ date?: string; timestamp?: string; count: number }>
): Promise<MlPeakTimeData | null> {
  try {
    const url = new URL("/predict/peak_time", getMlServiceUrl());
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      method: "POST",
      headers: mlHeaders(),
      body: JSON.stringify({ submissions }),
      next: { revalidate: 0 },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      console.error(`[ML] predictPeakTime failed: HTTP ${response.status} ${response.statusText}`);
      return null;
    }
    const json = await response.json() as { success: boolean; data?: MlPeakTimeData };
    if (!json.success || !json.data) {
      console.error("[ML] predictPeakTime bad response:", JSON.stringify(json).slice(0, 200));
    }
    return json.success && json.data ? json.data : null;
  } catch (err) {
    console.error("[ML] predictPeakTime error:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Check ML service health
 */
export async function checkMlServiceHealth(): Promise<{
  status: string;
  timestamp: string;
}> {
  try {
    const url = new URL("/api/health", getMlServiceUrl());

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Health check failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("[ML] Health check error:", error);
    throw error;
  }
}

/**
 * Check if ML service is available
 */
export async function isMlServiceAvailable(): Promise<boolean> {
  try {
    const health = await checkMlServiceHealth();
    return health.status === "healthy";
  } catch {
    return false;
  }
}
