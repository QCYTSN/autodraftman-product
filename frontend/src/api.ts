const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const apiConfigured = Boolean(configuredApiBaseUrl);

const apiBaseUrl = (configuredApiBaseUrl ?? "").replace(/\/+$/, "");

export type CurrentIdentity = {
  kind: "guest" | "user";
  id: string;
  expires_at: string | null;
  display_name: string | null;
  avatar_url: string | null;
  providers: string[];
  balance: {
    available: number;
    reserved: number;
  };
};

export type AuthProvider = {
  id: "google" | "github" | "wechat";
  name: string;
  enabled: boolean;
};

export type BoundIdentity = {
  provider: string;
  email: string | null;
  email_verified: boolean;
  created_at: string;
};

export type CreditTransaction = {
  id: string;
  kind: "grant" | "reserve" | "settle" | "release" | "refund" | "adjustment";
  delta_available: number;
  delta_reserved: number;
  available_after: number;
  reserved_after: number;
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
};

export type Asset = {
  id: string;
  original_filename: string | null;
  kind: "reference" | "result";
  status: "pending" | "ready" | "deleted";
  media_type: string;
  byte_size: number;
  width_px: number | null;
  height_px: number | null;
  visibility: "private" | "unlisted" | "public";
  created_at: string;
  expires_at: string | null;
  deleted_at: string | null;
};

export type PresignedRequest = {
  url: string;
  method: "PUT" | "GET";
  headers: Record<string, string>;
  expires_at: string;
};

export type AssetUploadIntent = {
  asset: Asset;
  upload: PresignedRequest;
};

export type WorkspaceDraft = {
  id: string;
  prompt: string;
  mode: "text" | "reference";
  aspect_ratio: "16:9" | "4:3" | "1:1";
  output_format: "PNG" | "JPG" | "WebP";
  visibility: "private" | "public";
  reference_asset_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

export type WorkspaceDraftInput = Pick<
  WorkspaceDraft,
  | "prompt"
  | "mode"
  | "aspect_ratio"
  | "output_format"
  | "visibility"
  | "reference_asset_id"
>;

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function requireApiBaseUrl() {
  if (!apiBaseUrl) {
    throw new ApiError("The public API has not been configured", 0);
  }
  return apiBaseUrl;
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${requireApiBaseUrl()}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...init.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const body = (await response.json()) as { detail?: string };
        if (body.detail) message = body.detail;
      } catch {
        // Keep the status-based message when the server did not return JSON.
      }
      throw new ApiError(message, response.status);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The API request timed out", 0);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function requestVoid(path: string, init: RequestInit): Promise<void> {
  const response = await fetch(`${requireApiBaseUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // Keep the status-based message when the server did not return JSON.
    }
    throw new ApiError(message, response.status);
  }
}

export function createOrRestoreGuest(): Promise<CurrentIdentity> {
  return requestJson<CurrentIdentity>("/api/v1/identity/guest", {
    method: "POST",
  });
}

export function getCurrentIdentity(): Promise<CurrentIdentity> {
  return requestJson<CurrentIdentity>("/api/v1/identity/me");
}

export async function getAuthProviders(): Promise<AuthProvider[]> {
  const response = await requestJson<{ providers: AuthProvider[] }>(
    "/api/v1/auth/providers",
  );
  return response.providers;
}

export function oauthStartUrl(
  provider: "google" | "github",
  mode: "login" | "link" = "login",
): string {
  const returnUrl = new URL(window.location.href);
  returnUrl.searchParams.delete("auth");
  returnUrl.searchParams.delete("auth_error");
  returnUrl.searchParams.delete("provider");
  const query = new URLSearchParams({
    mode,
    return_url: returnUrl.toString(),
  });
  return `${requireApiBaseUrl()}/api/v1/auth/oauth/${provider}/start?${query.toString()}`;
}

export async function getBoundIdentities(): Promise<BoundIdentity[]> {
  const response = await requestJson<{ identities: BoundIdentity[] }>(
    "/api/v1/auth/identities",
  );
  return response.identities;
}

export async function unlinkIdentity(provider: string): Promise<void> {
  await requestVoid(`/api/v1/auth/identities/${provider}`, {
    method: "DELETE",
  });
}

export async function logout(): Promise<void> {
  await requestVoid("/api/v1/auth/logout", {
    method: "POST",
  });
}

export async function getCreditTransactions(): Promise<CreditTransaction[]> {
  const response = await requestJson<{
    items: CreditTransaction[];
    limit: number;
    offset: number;
  }>("/api/v1/credits/transactions?limit=8&offset=0");
  return response.items;
}

export async function deleteAccount(): Promise<void> {
  await requestVoid("/api/v1/auth/account", {
    method: "DELETE",
  });
}

export function createAssetUploadIntent(
  file: File,
  mediaType = file.type,
): Promise<AssetUploadIntent> {
  return requestJson<AssetUploadIntent>("/api/v1/assets/upload-intents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      original_filename: file.name,
      media_type: mediaType,
      byte_size: file.size,
    }),
  });
}

export function uploadToPresignedUrl(
  request: PresignedRequest,
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abortUpload = () => xhr.abort();
    const cleanup = () => signal?.removeEventListener("abort", abortUpload);

    xhr.open(request.method, request.url);
    xhr.timeout = 120_000;
    for (const [name, value] of Object.entries(request.headers)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      }
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(new ApiError(`Upload failed with status ${xhr.status}`, xhr.status));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new ApiError("The object store could not be reached", 0));
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(new ApiError("The upload timed out", 0));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new ApiError("The upload was cancelled", 0));
    };

    if (signal?.aborted) {
      reject(new ApiError("The upload was cancelled", 0));
      return;
    }
    signal?.addEventListener("abort", abortUpload, { once: true });
    xhr.send(file);
  });
}

export function completeAssetUpload(assetId: string): Promise<Asset> {
  return requestJson<Asset>(`/api/v1/assets/${assetId}/complete`, {
    method: "POST",
  });
}

export async function deleteAsset(assetId: string): Promise<void> {
  await requestVoid(`/api/v1/assets/${assetId}`, {
    method: "DELETE",
  });
}

export function getAsset(assetId: string): Promise<Asset> {
  return requestJson<Asset>(`/api/v1/assets/${assetId}`);
}

export async function listDrafts(): Promise<WorkspaceDraft[]> {
  const response = await requestJson<{
    items: WorkspaceDraft[];
    limit: number;
    offset: number;
  }>("/api/v1/drafts?limit=30&offset=0");
  return response.items;
}

export function createDraft(payload: WorkspaceDraftInput): Promise<WorkspaceDraft> {
  return requestJson<WorkspaceDraft>("/api/v1/drafts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateDraft(
  draftId: string,
  payload: WorkspaceDraftInput,
): Promise<WorkspaceDraft> {
  return requestJson<WorkspaceDraft>(`/api/v1/drafts/${draftId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      reference_asset_set: true,
    }),
  });
}

export async function deleteDraft(draftId: string): Promise<void> {
  await requestVoid(`/api/v1/drafts/${draftId}`, {
    method: "DELETE",
  });
}

export function getAssetDownloadUrl(
  assetId: string,
): Promise<{ url: string; expires_at: string }> {
  return requestJson<{ url: string; expires_at: string }>(
    `/api/v1/assets/${assetId}/download`,
  );
}
