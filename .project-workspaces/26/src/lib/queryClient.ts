import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Helper function to make API requests to Supabase Edge Functions
 * @param methodOrPath - HTTP method (GET, POST, etc.) or function path for legacy support
 * @param pathOrBody - Function path or request body
 * @param body - Request body (for method, path, body signature)
 */
export async function apiRequest<T = any>(
  methodOrPath: string,
  pathOrBody?: string | Record<string, unknown>,
  body?: Record<string, unknown>
): Promise<T> {
  let method: string;
  let functionPath: string;
  let requestBody: Record<string, unknown> | undefined;

  if (typeof pathOrBody === 'string') {
    // (method, path, body) signature
    method = methodOrPath.toUpperCase();
    functionPath = pathOrBody;
    requestBody = body;
  } else {
    // (path, options) signature - legacy support
    method = 'POST';
    functionPath = methodOrPath;
    requestBody = pathOrBody;
  }

  // Remove leading slash if present
  const cleanPath = functionPath.startsWith('/') ? functionPath.slice(1) : functionPath;

  try {
    const { data, error } = await supabase.functions.invoke(cleanPath, {
      method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      body: requestBody,
    });

    if (error) {
      console.error(`[apiRequest] Error calling ${cleanPath}:`, error);
      throw error;
    }

    return data as T;
  } catch (error) {
    console.error(`[apiRequest] Failed to call ${cleanPath}:`, error);
    throw error;
  }
}

/**
 * Convenience wrapper for GET requests
 */
export async function apiGet<T = any>(path: string, params?: Record<string, string>): Promise<T> {
  const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiRequest<T>('GET', path + queryString);
}

/**
 * Convenience wrapper for POST requests
 */
export async function apiPost<T = any>(path: string, body?: Record<string, unknown>): Promise<T> {
  return apiRequest<T>('POST', path, body);
}

/**
 * Convenience wrapper for PUT requests
 */
export async function apiPut<T = any>(path: string, body?: Record<string, unknown>): Promise<T> {
  return apiRequest<T>('PUT', path, body);
}

/**
 * Convenience wrapper for DELETE requests
 */
export async function apiDelete<T = any>(path: string): Promise<T> {
  return apiRequest<T>('DELETE', path);
}
